"""
SkillPulse Preprocessing Pipeline — Steps 1 through 5
======================================================
Loads the raw CSV, deduplicates, adds verdict weights,
builds a top-20 skill vocabulary, filters users, and
saves a cleaned parquet for downstream LSTM training.
"""

import pandas as pd
import numpy as np
import json
import os
import time as _time

# ── CONFIG ──────────────────────────────────────────────────────────────────
CSV_PATH     = os.path.join(os.path.dirname(__file__), '..', 'data', 'lstm_train_preprocessed.csv')
OUTPUT_DIR   = os.path.join(os.path.dirname(__file__), '..', 'models')
MIN_ACCEPTED = 15
TOP_N_SKILLS = 20

os.makedirs(OUTPUT_DIR, exist_ok=True)

# ════════════════════════════════════════════════════════════════════════════
# STEP 1 — LOAD AND INSPECT
# ════════════════════════════════════════════════════════════════════════════
print("=" * 70)
print("STEP 1: LOAD AND INSPECT")
print("=" * 70)

t0 = _time.time()
df = pd.read_csv(CSV_PATH)
print(f"Loaded in {_time.time() - t0:.1f}s")

print(f"\nShape : {df.shape}")
print(f"\nDtypes:\n{df.dtypes}")
print(f"\nNull counts:\n{df.isnull().sum()}")
print(f"\nVerdict value_counts:\n{df['verdict'].value_counts()}")
print(f"\nUnique handles : {df['handle'].nunique()}")
print(f"Unique tags    : {df['tags'].nunique()}")

dt_min = pd.to_datetime(df['time_unix'], unit='s').min()
dt_max = pd.to_datetime(df['time_unix'], unit='s').max()
print(f"\nDate range: {dt_min}  ->  {dt_max}")

# ════════════════════════════════════════════════════════════════════════════
# STEP 2 — DEDUPLICATE CORRECTLY
# ════════════════════════════════════════════════════════════════════════════
print("\n" + "=" * 70)
print("STEP 2: DEDUPLICATE (exact-row only)")
print("=" * 70)

shape_before = df.shape
df = df.drop_duplicates()
shape_after = df.shape

print(f"Before : {shape_before}")
print(f"After  : {shape_after}")
print(f"Dropped: {shape_before[0] - shape_after[0]} exact-duplicate rows")

# Verification: same (handle, time_unix) can still have multiple rows
multi = df.groupby(['handle', 'time_unix']).size()
multi_count = (multi > 1).sum()
print(f"\n(handle, time_unix) combos with >1 row: {multi_count}  (ok)  (multi-tag rows preserved)")

# ════════════════════════════════════════════════════════════════════════════
# STEP 3 — VERDICT WEIGHTING
# ════════════════════════════════════════════════════════════════════════════
print("\n" + "=" * 70)
print("STEP 3: VERDICT WEIGHTING")
print("=" * 70)

VERDICT_MAP = {
    'OK':                    1.0,
    'WRONG_ANSWER':          0.3,
    'TIME_LIMIT_EXCEEDED':   0.2,
    'RUNTIME_ERROR':         0.1,
    'MEMORY_LIMIT_EXCEEDED': 0.1,
    'COMPILATION_ERROR':     0.0,
    'PRESENTATION_ERROR':    0.0,
}

df['verdict_weight'] = df['verdict'].map(VERDICT_MAP).fillna(0.0)

print("verdict_weight distribution:")
print(df['verdict_weight'].value_counts().sort_index())

# ════════════════════════════════════════════════════════════════════════════
# STEP 4 — TAG CLEANING AND VOCABULARY
# ════════════════════════════════════════════════════════════════════════════
print("\n" + "=" * 70)
print("STEP 4: TAG CLEANING & VOCABULARY (top 20)")
print("=" * 70)

df['tags'] = df['tags'].astype(str).str.strip().str.lower()

tag_freq = df['tags'].value_counts()
top_tags = tag_freq.head(TOP_N_SKILLS)

print(f"\nTop {TOP_N_SKILLS} skills and their frequencies:")
for i, (tag, freq) in enumerate(top_tags.items()):
    print(f"  {i:>2}. {tag:<35s} {freq:>10,}")

# Build skill_mapping: {tag: index} sorted by frequency desc
skill_mapping = {tag: idx for idx, tag in enumerate(top_tags.index)}

mapping_path = os.path.join(OUTPUT_DIR, 'skill_mapping.json')
with open(mapping_path, 'w') as f:
    json.dump(skill_mapping, f, indent=2)
print(f"\nSaved skill_mapping.json -> {mapping_path}  ({len(skill_mapping)} skills)")

# Filter to only rows whose tag is in top-20
before_filter = len(df)
df = df[df['tags'].isin(skill_mapping.keys())].copy()
after_filter = len(df)
print(f"Rows before tag filter: {before_filter:,}")
print(f"Rows after  tag filter: {after_filter:,}  (dropped {before_filter - after_filter:,})")

# ════════════════════════════════════════════════════════════════════════════
# STEP 5 — USER FILTERING
# ════════════════════════════════════════════════════════════════════════════
print("\n" + "=" * 70)
print("STEP 5: USER FILTERING (min {0} accepted submissions)".format(MIN_ACCEPTED))
print("=" * 70)

accepted_per_user = (
    df[df['verdict_weight'] > 0]
    .groupby('handle')
    .size()
    .rename('accepted_count')
)

# Users who meet threshold
valid_users = accepted_per_user[accepted_per_user >= MIN_ACCEPTED].index
all_users   = df['handle'].nunique()
kept_users  = len(valid_users)
removed     = all_users - kept_users

print(f"Total users before filter : {all_users:,}")
print(f"Users removed (<{MIN_ACCEPTED} accepted): {removed:,}")
print(f"Users remaining           : {kept_users:,}")

df = df[df['handle'].isin(valid_users)].copy()

# ════════════════════════════════════════════════════════════════════════════
# FINAL OUTPUT — save cleaned dataframe
# ════════════════════════════════════════════════════════════════════════════
print("\n" + "=" * 70)
print("SAVING CLEANED DATAFRAME")
print("=" * 70)

out_path = os.path.join(OUTPUT_DIR, 'cleaned_df.parquet')
df.to_parquet(out_path, index=False)

print(f"Shape : {df.shape}")
print(f"Saved -> {out_path}")
print(f"Size  : {os.path.getsize(out_path) / 1e6:.1f} MB")
print("\n[DONE] Steps 1-5 complete. Ready for LSTM sequence building.")
