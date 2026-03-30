import argparse
from collections import defaultdict
from typing import Dict, List

import pandas as pd


COLUMNS = [
    "handle",
    "rating_at_submission",
    "problem_rating",
    "id_of_submission_task",
    "verdict",
    "time",
    "tags",
    "problem_rating_cf",
]

CRITICAL_COLS = ["handle", "time", "verdict", "tags"]


def coerce_time_to_datetime(time_series: pd.Series) -> pd.Series:
    """
    Convert the `time` column to datetime for validation.
    Your current dataset stores `time` as Unix epoch seconds (int64).
    """
    if pd.api.types.is_integer_dtype(time_series) or pd.api.types.is_float_dtype(time_series):
        return pd.to_datetime(time_series, unit="s", errors="coerce", utc=True)
    return pd.to_datetime(time_series, errors="coerce", utc=True)


def build_user_counts(input_path: str, chunksize: int) -> Dict[str, int]:
    """
    First pass: count number of rows per user (`handle`).
    Note: because your merged dataset is exploded by tags, "row count" == "timesteps".
    """
    counts: Dict[str, int] = defaultdict(int)
    total_rows = 0

    reader = pd.read_csv(input_path, usecols=["handle"], chunksize=chunksize)
    for chunk in reader:
        total_rows += len(chunk)

        # Avoid NaN keys while counting active users.
        vc = chunk["handle"].dropna().value_counts()
        for handle, c in vc.items():
            counts[str(handle)] += int(c)

    print(f"Total rows scanned (first pass): {total_rows:,}")
    return counts


def load_filtered_sample(
    input_path: str, selected_users: List[str], chunksize: int
) -> pd.DataFrame:
    """Second pass: load only rows belonging to selected users."""
    chunks: List[pd.DataFrame] = []
    selected_set = set(selected_users)

    reader = pd.read_csv(input_path, usecols=COLUMNS, chunksize=chunksize)
    loaded_chunks = 0
    for chunk in reader:
        # Use .loc + .copy() to avoid any SettingWithCopyWarning surprises.
        filtered = chunk.loc[chunk["handle"].isin(selected_set)].copy()
        if not filtered.empty:
            chunks.append(filtered)
            loaded_chunks += 1

    if not chunks:
        return pd.DataFrame(columns=COLUMNS)

    print(f"Loaded {len(chunks):,} chunk(s) for selected users (second pass).")
    return pd.concat(chunks, ignore_index=True)


def main() -> None:
    parser = argparse.ArgumentParser(description="Create an LSTM-ready sample from merged_skill_data.csv")
    parser.add_argument("--input", default="data/merged_skill_data.csv", help="Path to merged CSV")
    parser.add_argument("--output", default="data/lstm_sample.csv", help="Path to save the sampled CSV")
    parser.add_argument("--top-users", type=int, default=5000, help="Top active users by row count")
    parser.add_argument("--min-submissions", type=int, default=50, help="Minimum row count per selected user")
    parser.add_argument("--chunksize", type=int, default=300_000, help="Chunk size for chunked reading")
    args = parser.parse_args()

    input_path = args.input
    output_path = args.output
    top_k = int(args.top_users)
    min_subs = int(args.min_submissions)
    chunksize = int(args.chunksize)

    print("Building per-user counts (first pass)...")
    user_counts = build_user_counts(input_path, chunksize=chunksize)
    total_rows_before = sum(user_counts.values())

    counts_series = pd.Series(user_counts).sort_values(ascending=False)
    eligible_users = counts_series[counts_series >= min_subs]
    selected_users = eligible_users.head(top_k).index.tolist()

    print(f"Unique users with >=1 rows: {len(counts_series):,}")
    print(f"Selected users after min-submission filter: {len(selected_users):,}")
    if len(selected_users) < top_k:
        print(
            f"Warning: only {len(selected_users):,} users among the top {top_k:,} "
            f"have >= {min_subs} rows."
        )

    print("Loading filtered sample (second pass)...")
    df = load_filtered_sample(input_path, selected_users=selected_users, chunksize=chunksize)

    total_rows_after = len(df)
    unique_users_after = df["handle"].nunique(dropna=True) if not df.empty else 0
    print(f"Total rows before filtering (row count): {total_rows_before:,}")
    print(f"Total rows after filtering: {total_rows_after:,}")
    print(f"Unique users after filtering: {unique_users_after:,}")

    if df.empty:
        print("No data matched the selection. Exiting without writing output.")
        return

    # CRITICAL: preserve chronological order within each user sequence.
    df = df.sort_values(["handle", "time"], kind="mergesort").reset_index(drop=True)

    # ===== Statistics =====
    per_user = df.groupby("handle", sort=False).size()
    print("\nSubmissions/timesteps per user distribution (rows per handle):")
    print(
        f"  mean={per_user.mean():.2f}, min={per_user.min():,}, "
        f"max={per_user.max():,}, std={per_user.std():.2f}"
    )

    print("\nVerdict distribution (top 10):")
    verdict_vc = df["verdict"].value_counts(dropna=False)
    print(verdict_vc.head(10).to_string())

    print("\nTop 15 tags/skills:")
    tag_vc = df["tags"].value_counts(dropna=False).head(15)
    print(tag_vc.to_string())

    # ===== Optional data quality checks =====
    print("\nData quality checks:")
    if df.empty:
        print("  Dataset empty; skipping quality checks.")
    else:
        null_counts = df[CRITICAL_COLS].isna().sum()
        print("  Null counts in critical columns:")
        for col in CRITICAL_COLS:
            print(f"    {col}: {int(null_counts[col]):,}")

        # Extra: treat empty strings as missing for text columns.
        for col in ["handle", "verdict", "tags"]:
            empty_count = int(df[col].astype("string").eq("").sum())
            print(f"  Empty-string count in `{col}`: {empty_count:,}")

        time_dt = coerce_time_to_datetime(df["time"])
        invalid_time = int(time_dt.isna().sum())
        total_time = len(df)
        invalid_pct = 100.0 * invalid_time / max(total_time, 1)
        print(f"  Invalid `time` values after datetime coercion: {invalid_time:,} ({invalid_pct:.3f}%)")

        # Warn if any selected users have fewer than `min_subs` rows (sanity check).
        short_users = per_user[per_user < min_subs]
        if not short_users.empty:
            print(f"Warning: {len(short_users):,} user(s) have fewer than {min_subs} rows:")
            print(short_users.sort_values().head(20).to_string())

    print(f"\nSaving sampled dataset to: {output_path}")
    df.to_csv(output_path, index=False)
    print("Saved successfully.")


if __name__ == "__main__":
    main()

