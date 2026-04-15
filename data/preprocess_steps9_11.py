import math
import os

import joblib
import numpy as np
import pandas as pd
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import MinMaxScaler


OUTPUT_DIR = "models"
HORIZON_DAYS = 60
RANDOM_STATE = 42
SEQ_WEEKS = 24
TAU = -0.2
S = 0.2


def floor_to_monday_from_unix(unix_series: pd.Series) -> pd.Series:
    dt = pd.to_datetime(unix_series, unit="s", utc=True).dt.tz_localize(None)
    return (dt - pd.to_timedelta(dt.dt.dayofweek, unit="D")).dt.normalize()


def main() -> None:
    cleaned_path = os.path.join(OUTPUT_DIR, "cleaned_df.parquet")
    x_raw_path = os.path.join(OUTPUT_DIR, "X_raw.npy")
    meta_path = os.path.join(OUTPUT_DIR, "sequence_metadata.csv")
    ref_path = os.path.join(OUTPUT_DIR, "reference_date.txt")

    print("=" * 70)
    print("LOAD INTERMEDIATES")
    print("=" * 70)
    cleaned_df = pd.read_parquet(cleaned_path)
    X_list = np.load(x_raw_path)
    meta_df = pd.read_csv(meta_path)
    with open(ref_path, "r", encoding="utf-8") as f:
        reference_date = pd.Timestamp(f.read().strip())

    print(f"cleaned_df shape: {cleaned_df.shape}")
    print(f"X_list shape    : {X_list.shape}")
    print(f"meta_df shape   : {meta_df.shape}")
    print(f"reference_date  : {reference_date}")

    # CRITICAL ASSERTIONS
    checks = [
        ("X_list.shape[0] == len(meta_df)", X_list.shape[0] == len(meta_df)),
        ("X_list.shape[1] == 24", X_list.ndim == 3 and X_list.shape[1] == 24),
        ("X_list.shape[2] == 4", X_list.ndim == 3 and X_list.shape[2] == 4),
        ("'verdict_weight' in cleaned_df.columns", "verdict_weight" in cleaned_df.columns),
        ("'submitted_at' in cleaned_df.columns", "submitted_at" in cleaned_df.columns),
    ]
    for name, ok in checks:
        if ok:
            print(f"PASS: {name}")
        else:
            print(f"FAIL: {name}")
            raise AssertionError(f"Failed precondition: {name}")

    print("\n" + "=" * 70)
    print("STEP 9: COMPUTE ARS LABELS")
    print("=" * 70)

    ref_monday = (reference_date - pd.Timedelta(days=reference_date.dayofweek)).normalize()
    start_monday = ref_monday - pd.Timedelta(weeks=SEQ_WEEKS - 1)
    window_start = start_monday
    window_end = ref_monday + pd.Timedelta(days=6)
    prediction_date = reference_date + pd.Timedelta(days=HORIZON_DAYS)

    # Use submitted_at directly for event windowing.
    cleaned_df["submitted_at"] = pd.to_datetime(cleaned_df["submitted_at"], errors="coerce")
    filtered_events = cleaned_df[
        (cleaned_df["verdict_weight"] > 0)
        & (cleaned_df["submitted_at"] >= window_start)
        & (cleaned_df["submitted_at"] <= window_end)
    ][["handle", "tags", "submitted_at"]]
    grouped_events = filtered_events.groupby(["handle", "tags"], sort=False)["submitted_at"].apply(list).to_dict()

    y_list = []
    d_decay = 0.5
    tau = TAU
    s = S

    for row in meta_df.itertuples(index=False):
        handle = row.handle
        skill = row.skill
        events = grouped_events.get((handle, skill), [])

        if len(events) == 0:
            y_list.append(100.0)
            continue

        t_days = np.array([(prediction_date - t).days for t in events], dtype=np.float64)
        t_days = np.where(t_days <= 0.0, 0.1, t_days)

        activation = math.log(np.sum(t_days ** (-d_decay)))
        p_retrieval = 1.0 / (1.0 + math.exp((tau - activation) / s))
        ars_label = round((1.0 - p_retrieval) * 100.0, 2)
        ars_label = float(np.clip(ars_label, 0.0, 100.0))
        y_list.append(ars_label)

    y_array = np.array(y_list, dtype=np.float32)

    bins = [0, 20, 40, 60, 80, 100]
    labels = ["[0-20]", "[20-40]", "[40-60]", "[60-80]", "[80-100]"]
    bucketed = pd.cut(y_array, bins=bins, labels=labels, include_lowest=True, right=True)
    counts = pd.Series(bucketed).value_counts(sort=False)
    total = len(y_array)
    print("ARS distribution (count | percent):")
    for label in labels:
        cnt = int(counts.get(label, 0))
        pct = (cnt / total * 100.0) if total else 0.0
        print(f"  {label:8s}: {cnt:7d} | {pct:6.2f}%")
    pct_0_20 = (int(counts.get("[0-20]", 0)) / total * 100.0) if total else 0.0
    pct_80_100 = (int(counts.get("[80-100]", 0)) / total * 100.0) if total else 0.0

    exact_extremes_pct = float(np.mean((y_array == 0.0) | (y_array == 100.0)) * 100.0) if total else 0.0
    if exact_extremes_pct > 70.0:
        print("WARNING: Labels may be binary — check input data")

    print(
        "y stats -> "
        f"mean: {float(np.mean(y_array)):.4f}, std: {float(np.std(y_array)):.4f}, "
        f"min: {float(np.min(y_array)):.4f}, max: {float(np.max(y_array)):.4f}"
    )
    if pct_0_20 > 70.0:
        y_log = np.log1p(y_array)
        q = np.quantile(y_array, [0.2, 0.4, 0.6, 0.8])
        print("ROBUSTNESS: Label imbalance still present.")
        print(
            "  Diagnostics -> "
            f"log1p(y) mean={float(np.mean(y_log)):.4f}, std={float(np.std(y_log)):.4f}; "
            f"quantiles(20/40/60/80)={q.round(2).tolist()}"
        )
        print("  Suggestion: use weighted loss (sample_weight by label bin) during LSTM training.")

    print("\n" + "=" * 70)
    print("STEP 10/11: SPLIT + NORMALIZE")
    print("=" * 70)

    X_array = np.array(X_list, dtype=np.float32)
    y_array = np.array(y_list, dtype=np.float32)

    idx = np.arange(len(X_array))
    idx_train, idx_temp = train_test_split(
        idx,
        test_size=0.30,
        random_state=42,
        shuffle=True,
    )
    idx_val, idx_test = train_test_split(
        idx_temp,
        test_size=0.50,
        random_state=42,
        shuffle=True,
    )

    X_train_raw, X_val_raw, X_test_raw = X_array[idx_train], X_array[idx_val], X_array[idx_test]
    y_train_raw, y_val_raw, y_test_raw = y_array[idx_train], y_array[idx_val], y_array[idx_test]

    feature_names = ["solve_count", "success_rate", "difficulty_norm", "raw_attempts"]
    scalers = {}
    X_train_norm = np.zeros_like(X_train_raw)
    X_val_norm = np.zeros_like(X_val_raw)
    X_test_norm = np.zeros_like(X_test_raw)

    n_train = X_train_raw.shape[0]
    n_val = X_val_raw.shape[0]
    n_test = X_test_raw.shape[0]

    for feat_idx, feat_name in enumerate(feature_names):
        scaler = MinMaxScaler()
        train_col = X_train_raw[:, :, feat_idx].reshape(-1, 1)
        val_col = X_val_raw[:, :, feat_idx].reshape(-1, 1)
        test_col = X_test_raw[:, :, feat_idx].reshape(-1, 1)

        scaler.fit(train_col)
        X_train_norm[:, :, feat_idx] = scaler.transform(train_col).reshape(n_train, 24)
        X_val_norm[:, :, feat_idx] = scaler.transform(val_col).reshape(n_val, 24)
        X_test_norm[:, :, feat_idx] = scaler.transform(test_col).reshape(n_test, 24)
        scalers[feat_name] = scaler

    scaler_path = os.path.join(OUTPUT_DIR, "feature_scalers.pkl")
    joblib.dump(scalers, scaler_path)
    print("Saved: models/feature_scalers.pkl")

    y_train_norm = y_train_raw / 100.0
    y_val_norm = y_val_raw / 100.0
    y_test_norm = y_test_raw / 100.0

    np.save(os.path.join(OUTPUT_DIR, "X_train_norm.npy"), X_train_norm.astype(np.float32))
    np.save(os.path.join(OUTPUT_DIR, "X_val_norm.npy"), X_val_norm.astype(np.float32))
    np.save(os.path.join(OUTPUT_DIR, "X_test_norm.npy"), X_test_norm.astype(np.float32))
    np.save(os.path.join(OUTPUT_DIR, "y_train_norm.npy"), y_train_norm.astype(np.float32))
    np.save(os.path.join(OUTPUT_DIR, "y_val_norm.npy"), y_val_norm.astype(np.float32))
    np.save(os.path.join(OUTPUT_DIR, "y_test_norm.npy"), y_test_norm.astype(np.float32))

    print("X_train_norm : {}    y_train_norm : {}".format(X_train_norm.shape, y_train_norm.shape))
    print("X_val_norm   : {}    y_val_norm   : {}".format(X_val_norm.shape, y_val_norm.shape))
    print("X_test_norm  : {}    y_test_norm  : {}".format(X_test_norm.shape, y_test_norm.shape))

    final_checks = [
        ("CHECK 1", np.isnan(X_train_norm).sum() == 0, "X_train_norm has NaN values"),
        ("CHECK 2", np.isinf(X_train_norm).sum() == 0, "X_train_norm has Inf values"),
        ("CHECK 3", np.min(X_train_norm) >= 0.0 and np.max(X_train_norm) <= 1.0, "X_train_norm not in [0,1]"),
        ("CHECK 4", np.min(y_train_norm) >= 0.0 and np.max(y_train_norm) <= 1.0, "y_train_norm not in [0,1]"),
        ("CHECK 5", np.std(y_train_norm * 100.0) > 15.0, "y_train_norm is too binary/low variance"),
        ("CHECK 6", X_train_norm.shape[-1] == 4, "X_train_norm last dim is not 4"),
        ("CHECK 7", X_train_norm.shape[-2] == 24, "X_train_norm time dim is not 24"),
        ("CHECK 8", len(X_train_norm) == len(y_train_norm), "train X/y length mismatch"),
    ]
    for check_name, ok, reason in final_checks:
        if ok:
            print(f"PASS: {check_name}")
        else:
            print(f"FAIL: {check_name} -> {reason} (Step 11)")
            raise AssertionError(f"{check_name} failed: {reason}")


if __name__ == "__main__":
    main()
