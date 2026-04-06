import argparse
import json
from pathlib import Path
from typing import Dict, Tuple

import numpy as np
import pandas as pd


RAW_COLUMNS = [
    "handle",
    "rating_at_submission",
    "problem_rating",
    "id_of_submission_task",
    "verdict",
    "time",
    "tags",
    "problem_rating_cf",
]

CATEGORICAL_COLUMNS = ["handle", "id_of_submission_task", "verdict", "tags"]
NUMERIC_COLUMNS = ["rating_at_submission", "problem_rating"]


def parse_time_column(time_series: pd.Series) -> pd.Series:
    """
    Parse time to UTC datetime.
    Supports epoch seconds (int/float) and string datetime.
    """
    if pd.api.types.is_integer_dtype(time_series) or pd.api.types.is_float_dtype(time_series):
        return pd.to_datetime(time_series, unit="s", errors="coerce", utc=True)
    return pd.to_datetime(time_series, errors="coerce", utc=True)


def choose_problem_rating(df: pd.DataFrame) -> pd.DataFrame:
    """
    Fix duplicate rating columns:
    - Keep one final `problem_rating` column
    - Prefer `problem_rating_cf` (from problem metadata), then fallback to `problem_rating`
    """
    rating_cf = pd.to_numeric(df["problem_rating_cf"], errors="coerce")
    rating_old = pd.to_numeric(df["problem_rating"], errors="coerce")
    df["problem_rating"] = rating_cf.combine_first(rating_old)
    return df.drop(columns=["problem_rating_cf"])


def encode_with_mapping(series: pd.Series) -> Tuple[pd.Series, Dict[str, int]]:
    """
    Encode a categorical column into integer ids.
    Returns encoded series and mapping dict {category_string: code}.
    """
    categories = pd.Index(series.astype(str).unique())
    mapping = {cat: idx for idx, cat in enumerate(categories)}
    encoded = series.astype(str).map(mapping).astype("int32")
    return encoded, mapping


def zscore_column(series: pd.Series) -> Tuple[pd.Series, float, float]:
    """Z-score normalize numeric column, return normalized values + mean/std."""
    mean_val = float(series.mean())
    std_val = float(series.std(ddof=0))
    if std_val == 0 or np.isnan(std_val):
        std_val = 1.0
    return ((series - mean_val) / std_val).astype("float32"), mean_val, std_val


def main() -> None:
    parser = argparse.ArgumentParser(description="Preprocess lstm_sample.csv for LSTM training")
    parser.add_argument("--input", default="data/lstm_sample.csv", help="Path to input sampled CSV")
    parser.add_argument("--output", default="data/lstm_train_preprocessed.csv", help="Path to output preprocessed CSV")
    parser.add_argument(
        "--mapping-dir",
        default="data/lstm_mappings",
        help="Directory where encoding/scaling metadata is saved",
    )
    args = parser.parse_args()

    input_path = Path(args.input)
    output_path = Path(args.output)
    mapping_dir = Path(args.mapping_dir)
    mapping_dir.mkdir(parents=True, exist_ok=True)

    print(f"Loading dataset: {input_path}")
    df = pd.read_csv(input_path, usecols=RAW_COLUMNS)
    print(f"Loaded rows: {len(df):,}")

    # 1) Fix duplicate problem-rating columns.
    print("Resolving duplicate problem rating columns...")
    df = choose_problem_rating(df)

    # 2) Parse and validate time, then sort by user-time for sequence models.
    print("Parsing time column and sorting chronologically per user...")
    df["time"] = parse_time_column(df["time"])
    invalid_time_count = int(df["time"].isna().sum())
    if invalid_time_count > 0:
        print(f"Warning: invalid time rows detected: {invalid_time_count:,}")

    # Drop rows where key sequence fields are missing.
    before_drop = len(df)
    df = df.dropna(subset=["handle", "time"]).copy()
    dropped = before_drop - len(df)
    if dropped > 0:
        print(f"Dropped {dropped:,} rows due to missing handle/time.")

    df = df.sort_values(["handle", "time"], kind="mergesort").reset_index(drop=True)

    # 3) Missing value handling.
    print("Handling missing values...")
    for col in ["verdict", "tags", "id_of_submission_task"]:
        df[col] = df[col].astype("string").fillna("UNK").replace("", "UNK")

    df["rating_at_submission"] = pd.to_numeric(df["rating_at_submission"], errors="coerce")
    df["problem_rating"] = pd.to_numeric(df["problem_rating"], errors="coerce")

    # Drop rows with missing user rating as requested.
    before_drop_rating = len(df)
    df = df.dropna(subset=["rating_at_submission"]).copy()
    dropped_rating = before_drop_rating - len(df)
    if dropped_rating > 0:
        print(f"Dropped {dropped_rating:,} rows due to missing rating_at_submission.")

    # Drop rows with missing problem rating as requested.
    before_drop_problem_rating = len(df)
    df = df.dropna(subset=["problem_rating"]).copy()
    dropped_problem_rating = before_drop_problem_rating - len(df)
    if dropped_problem_rating > 0:
        print(f"Dropped {dropped_problem_rating:,} rows due to missing problem_rating.")

    # 4) Feature engineering for time-aware LSTM training.
    print("Creating sequence/time features...")
    df["time_unix"] = (df["time"].astype("int64") // 10**9).astype("int64")
    df["hour"] = df["time"].dt.hour.astype("int16")
    df["day_of_week"] = df["time"].dt.dayofweek.astype("int16")
    df["month"] = df["time"].dt.month.astype("int16")

    # Time gap from previous submission by same user.
    time_gap = df.groupby("handle", sort=False)["time_unix"].diff().fillna(0)
    df["delta_prev_sec"] = time_gap.clip(lower=0).astype("int64")

    # Sequence index per user.
    df["timestep"] = df.groupby("handle", sort=False).cumcount().astype("int32")

    # 5) Label/target columns.
    print("Building target labels...")
    df["is_accepted"] = (df["verdict"].astype(str) == "OK").astype("int8")

    # 6) Encode categorical columns.
    print("Encoding categorical columns...")
    mappings: Dict[str, Dict[str, int]] = {}
    for col in CATEGORICAL_COLUMNS:
        encoded_col, mapping = encode_with_mapping(df[col])
        df[f"{col}_enc"] = encoded_col
        mappings[col] = mapping

    # 7) Normalize key numeric columns (z-score).
    print("Normalizing numeric columns...")
    scaling_stats: Dict[str, Dict[str, float]] = {}
    for col in NUMERIC_COLUMNS + ["delta_prev_sec"]:
        norm_col, mean_val, std_val = zscore_column(pd.to_numeric(df[col], errors="coerce"))
        df[f"{col}_norm"] = norm_col
        scaling_stats[col] = {"mean": mean_val, "std": std_val}

    # 8) Save cleaned/model-ready dataset.
    # Keep both raw + encoded features for flexibility in training experiments.
    print(f"Saving preprocessed dataset to: {output_path}")
    df.to_csv(output_path, index=False)

    # Save per-column mappings as CSV for easy inspection.
    for col, mapping in mappings.items():
        map_df = pd.DataFrame(
            {"value": list(mapping.keys()), f"{col}_enc": list(mapping.values())}
        ).sort_values(by=f"{col}_enc")
        map_df.to_csv(mapping_dir / f"{col}_mapping.csv", index=False)

    # Save scaling/imputation metadata.
    metadata = {
        "imputation": {},
        "dropped_rows": {
            "missing_handle_or_time": int(dropped),
            "missing_rating_at_submission": int(dropped_rating),
            "missing_problem_rating": int(dropped_problem_rating),
        },
        "scaling": scaling_stats,
        "rows_after_preprocessing": int(len(df)),
        "columns": list(df.columns),
    }
    with open(mapping_dir / "preprocessing_metadata.json", "w", encoding="utf-8") as f:
        json.dump(metadata, f, indent=2)

    # Save sequence lengths per user (useful for batching/padding later).
    seq_len = (
        df.groupby("handle_enc", sort=False).size().reset_index(name="sequence_length").astype(
            {"handle_enc": "int32", "sequence_length": "int32"}
        )
    )
    seq_len.to_csv(mapping_dir / "sequence_lengths.csv", index=False)

    print("Preprocessing complete.")
    print(f"Rows: {len(df):,}")
    print(f"Users: {df['handle_enc'].nunique():,}")
    print(f"Output file: {output_path}")
    print(f"Metadata/mappings dir: {mapping_dir}")


if __name__ == "__main__":
    main()

