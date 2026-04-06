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


def build_user_counts(input_path: str, chunksize: int) -> Dict[str, int]:
    counts: Dict[str, int] = defaultdict(int)
    total_rows = 0
    reader = pd.read_csv(input_path, usecols=["handle"], chunksize=chunksize)
    for chunk in reader:
        total_rows += len(chunk)
        vc = chunk["handle"].dropna().value_counts()
        for handle, c in vc.items():
            counts[str(handle)] += int(c)
    print(f"Total input rows: {total_rows:,}")
    print(f"Unique users in input: {len(counts):,}")
    return counts


def select_users_for_target(
    user_counts: Dict[str, int],
    min_rows_per_user: int,
    max_rows_per_user: int,
    target_rows: int,
    max_users: int,
) -> List[str]:
    series = pd.Series(user_counts).sort_values(ascending=False)
    eligible = series[series >= min_rows_per_user]
    print(f"Eligible users (>= {min_rows_per_user} rows): {len(eligible):,}")

    selected: List[str] = []
    estimated_rows = 0

    for handle, count in eligible.items():
        if len(selected) >= max_users:
            break
        contribution = min(int(count), max_rows_per_user)
        if estimated_rows + contribution > target_rows and len(selected) > 0:
            break
        selected.append(str(handle))
        estimated_rows += contribution

    # Fallback: always keep at least one user if eligible exists.
    if not selected and len(eligible) > 0:
        selected = [str(eligible.index[0])]
        estimated_rows = min(int(eligible.iloc[0]), max_rows_per_user)

    print(f"Selected users: {len(selected):,}")
    print(f"Estimated output rows (after cap): ~{estimated_rows:,}")
    return selected


def load_selected_rows(input_path: str, selected_users: List[str], chunksize: int) -> pd.DataFrame:
    selected_set = set(selected_users)
    chunks: List[pd.DataFrame] = []

    reader = pd.read_csv(input_path, usecols=COLUMNS, chunksize=chunksize)
    for chunk in reader:
        filtered = chunk.loc[chunk["handle"].isin(selected_set)].copy()
        if not filtered.empty:
            chunks.append(filtered)

    if not chunks:
        return pd.DataFrame(columns=COLUMNS)
    return pd.concat(chunks, ignore_index=True)


def main() -> None:
    parser = argparse.ArgumentParser(description="Build smaller CPU-friendly LSTM dataset.")
    parser.add_argument("--input", default="data/lstm_sample.csv", help="Input CSV path")
    parser.add_argument("--output", default="data/lstm_sample_cpu.csv", help="Output CSV path")
    parser.add_argument(
        "--target-rows",
        type=int,
        default=1_200_000,
        help="Approximate target output size in rows",
    )
    parser.add_argument(
        "--min-rows-per-user",
        type=int,
        default=200,
        help="Minimum rows required for a user to be kept",
    )
    parser.add_argument(
        "--max-rows-per-user",
        type=int,
        default=400,
        help="Cap per-user rows to keep sequences compact",
    )
    parser.add_argument(
        "--max-users",
        type=int,
        default=3000,
        help="Maximum users to keep",
    )
    parser.add_argument("--chunksize", type=int, default=300_000, help="Chunk size for reading CSV")
    args = parser.parse_args()

    if args.min_rows_per_user > args.max_rows_per_user:
        raise ValueError("--min-rows-per-user cannot be greater than --max-rows-per-user")

    print("Pass 1: counting rows per user...")
    user_counts = build_user_counts(args.input, args.chunksize)

    print("Selecting users for CPU-friendly dataset...")
    selected_users = select_users_for_target(
        user_counts=user_counts,
        min_rows_per_user=args.min_rows_per_user,
        max_rows_per_user=args.max_rows_per_user,
        target_rows=args.target_rows,
        max_users=args.max_users,
    )

    print("Pass 2: loading selected users...")
    df = load_selected_rows(args.input, selected_users, args.chunksize)
    if df.empty:
        print("No rows selected. Check thresholds and try again.")
        return

    print(f"Rows before per-user cap: {len(df):,}")
    df = df.sort_values(["handle", "time"], kind="mergesort").reset_index(drop=True)

    # Keep the most recent N rows per user for compact but still meaningful sequences.
    df = (
        df.groupby("handle", sort=False, group_keys=False)
        .tail(args.max_rows_per_user)
        .reset_index(drop=True)
    )

    # Re-sort after tail to guarantee strict handle/time ordering in output.
    df = df.sort_values(["handle", "time"], kind="mergesort").reset_index(drop=True)

    per_user = df.groupby("handle", sort=False).size()
    print(f"Final output rows: {len(df):,}")
    print(f"Final unique users: {df['handle'].nunique(dropna=True):,}")
    print(
        "Rows per user stats: "
        f"mean={per_user.mean():.2f}, min={per_user.min()}, max={per_user.max()}, std={per_user.std():.2f}"
    )

    print(f"Writing output: {args.output}")
    df.to_csv(args.output, index=False)
    print("Done.")


if __name__ == "__main__":
    main()

