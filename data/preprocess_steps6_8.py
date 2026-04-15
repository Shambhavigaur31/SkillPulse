"""
SkillPulse Preprocessing Pipeline — Steps 6 through 8
=======================================================
Loads cleaned_df.parquet, converts timestamps, builds weekly
aggregations per (handle, tag, week), then constructs 24-week
fixed-length sequences for LSTM training.
"""

import pandas as pd
import numpy as np
import os
from sklearn.preprocessing import MinMaxScaler

# ── CONFIG ──────────────────────────────────────────────────────────────────
OUTPUT_DIR = os.path.join(os.path.dirname(__file__), '..', 'models')
SEQ_WEEKS  = 24

CLEANED_PATH  = os.path.join(OUTPUT_DIR, 'cleaned_df.parquet')
WEEKLY_PATH   = os.path.join(OUTPUT_DIR, 'weekly_agg.parquet')
X_RAW_PATH    = os.path.join(OUTPUT_DIR, 'X_raw.npy')
META_PATH     = os.path.join(OUTPUT_DIR, 'sequence_metadata.csv')
REF_DATE_PATH = os.path.join(OUTPUT_DIR, 'reference_date.txt')

os.makedirs(OUTPUT_DIR, exist_ok=True)

# ════════════════════════════════════════════════════════════════════════════
# LOAD
# ════════════════════════════════════════════════════════════════════════════
print("=" * 70)
print("LOAD: cleaned_df.parquet")
print("=" * 70)

df = pd.read_parquet(CLEANED_PATH)
print(f"Shape after loading: {df.shape}")

# ════════════════════════════════════════════════════════════════════════════
# STEP 6 — CONVERT TIMESTAMPS
# ════════════════════════════════════════════════════════════════════════════
print("\n" + "=" * 70)
print("STEP 6: CONVERT TIMESTAMPS")
print("=" * 70)

def floor_to_monday(dt_series):
    dt = pd.to_datetime(dt_series, unit='s', utc=True).dt.tz_localize(None)
    return (dt - pd.to_timedelta(dt.dt.dayofweek, unit='D')).dt.normalize()

df['submitted_at'] = pd.to_datetime(df['time_unix'], unit='s', utc=True).dt.tz_localize(None)
df['week_start']   = floor_to_monday(df['time_unix'])

reference_date = df['submitted_at'].max()
print(f"reference_date (max submitted_at): {reference_date}")

assert (df['week_start'].dt.dayofweek == 0).all(), \
    f"week_start has non-Monday dates: {df['week_start'].unique()[:5]}"
print("PASS: All week_start values are Mondays")

# ════════════════════════════════════════════════════════════════════════════
# STEP 7 — WEEKLY AGGREGATION
# ════════════════════════════════════════════════════════════════════════════
print("\n" + "=" * 70)
print("STEP 7: WEEKLY AGGREGATION")
print("=" * 70)

weekly = (
    df.groupby(['handle', 'tags', 'week_start'], sort=False)
    .agg(
        solve_count     = ('verdict_weight',      'sum'),
        raw_attempts    = ('verdict_weight',      'count'),
        success_rate    = ('is_accepted',         'mean'),
        avg_difficulty  = ('problem_rating',      'mean'),
        avg_user_rating = ('rating_at_submission','mean'),
        median_hour     = ('hour',                'median'),
    )
    .reset_index()
)

print(f"Weekly agg shape (before normalisation): {weekly.shape}")

# Normalise avg_difficulty to [0,1]
scaler = MinMaxScaler()
weekly['difficulty_norm'] = scaler.fit_transform(weekly[['avg_difficulty']])

print(f"Weekly agg shape (after  normalisation): {weekly.shape}")
print(f"\nWeekly df dtypes:\n{weekly.dtypes}")
print(f"\nSample rows:\n{weekly.head(3).to_string()}")

# Save
weekly.to_parquet(WEEKLY_PATH, index=False)
print(f"\nSaved weekly_agg.parquet -> {WEEKLY_PATH}  ({os.path.getsize(WEEKLY_PATH)/1e6:.1f} MB)")

# ════════════════════════════════════════════════════════════════════════════
# STEP 8 — BUILD 24-WEEK SEQUENCES
# ════════════════════════════════════════════════════════════════════════════
print("\n" + "=" * 70)
print(f"STEP 8: BUILD {SEQ_WEEKS}-WEEK SEQUENCES")
print("=" * 70)

# Generate the reference window
ref_monday   = (reference_date - pd.Timedelta(days=reference_date.dayofweek)).normalize()
start_monday = ref_monday - pd.Timedelta(weeks=SEQ_WEEKS - 1)
weeks        = pd.date_range(start=start_monday, periods=SEQ_WEEKS, freq='7D')
end_week     = ref_monday
assert (weeks.dayofweek == 0).all(), \
    f"Sequence weeks contain non-Mondays: {weeks[:5]}"
print("PASS: All sequence weeks are Mondays")
window_dates = weeks
start_week = window_dates.min()
window_set   = set(window_dates)

print(f"Sequence window: {start_week.date()}  ->  {end_week.date()}  ({SEQ_WEEKS} weeks)")

# Index weekly df for fast lookup: (handle, tag, week_start) -> row values
# Keep only columns needed for the sequence matrix
FEATURE_COLS = ['solve_count', 'success_rate', 'difficulty_norm', 'raw_attempts']

# Pivot into a dict keyed by (handle, tag) -> {week_start: [f0,f1,f2,f3]}
weekly['week_start'] = pd.to_datetime(weekly['week_start'])  # ensure Timestamp

# Filter to only rows inside the 24-week window first (big speed-up)
weekly_win = weekly[weekly['week_start'].isin(window_set)].copy()
print(f"Weekly rows inside window: {len(weekly_win):,}  (out of {len(weekly):,})")

# Build lookup dict from rows in the window
lookup = {}
for row in weekly_win[['handle', 'tags', 'week_start'] + FEATURE_COLS].itertuples(index=False):
    key = (row.handle, row.tags)
    if key not in lookup:
        lookup[key] = {}
    lookup[key][row.week_start] = [
        row.solve_count,
        row.success_rate,
        row.difficulty_norm,
        row.raw_attempts,
    ]

# Iterate across every unique (handle, skill) pair in weekly,
# then allow skip logic to handle zero-active-window pairs.
all_pairs = weekly[['handle', 'tags']].drop_duplicates()
print(f"Unique (handle, skill) pairs overall: {len(all_pairs):,}")

# Build sequences
X_list   = []
meta_list = []

skipped_zero   = 0
skipped_sparse = 0

for row in all_pairs.itertuples(index=False):
    handle, skill = row.handle, row.tags
    week_dict = lookup.get((handle, skill), {})
    active_weeks = len(week_dict)

    # Skip if 0 active weeks
    if active_weeks == 0:
        skipped_zero += 1
        continue

    # Skip if fewer than 3 active weeks
    if active_weeks < 3:
        skipped_sparse += 1
        continue

    # Build (24, 4) matrix
    mat = np.zeros((SEQ_WEEKS, 4), dtype=np.float32)
    for t, wdate in enumerate(window_dates):
        if wdate in week_dict:
            mat[t] = week_dict[wdate]

    X_list.append(mat)
    meta_list.append({'handle': handle, 'skill': skill})

print(f"\nSkipped (0 active weeks)  : {skipped_zero:,}")
print(f"Skipped (<3 active weeks) : {skipped_sparse:,}")
print(f"Total sequences kept      : {len(X_list):,}")

# ════════════════════════════════════════════════════════════════════════════
# FINAL OUTPUT
# ════════════════════════════════════════════════════════════════════════════
print("\n" + "=" * 70)
print("SAVING OUTPUTS")
print("=" * 70)

if X_list:
    X_arr = np.array(X_list, dtype=np.float32)
else:
    # Preserve the expected tensor rank even when no sequences survive filtering.
    X_arr = np.empty((0, SEQ_WEEKS, 4), dtype=np.float32)
np.save(X_RAW_PATH, X_arr)
print(f"X_raw.npy shape : {X_arr.shape}")
print(f"Saved X_raw.npy -> {X_RAW_PATH}  ({os.path.getsize(X_RAW_PATH)/1e6:.1f} MB)")

meta_df = pd.DataFrame(meta_list)
meta_df.to_csv(META_PATH, index=False)
print(f"Saved sequence_metadata.csv -> {META_PATH}  ({len(meta_df):,} rows)")

ref_str = str(reference_date)
with open(REF_DATE_PATH, 'w') as f:
    f.write(ref_str)
print(f"Saved reference_date.txt -> {REF_DATE_PATH}  (value: {ref_str})")

print(f"\n[DONE] Steps 6-8 complete.")
print(f"  X_raw shape           : {X_arr.shape}   (N sequences x {SEQ_WEEKS} weeks x 4 features)")
print(f"  sequence_metadata rows: {len(meta_df):,}")
