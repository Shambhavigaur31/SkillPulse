import json
import os

import joblib
import numpy as np
import pandas as pd
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import MinMaxScaler


OUTPUT_DIR = "models"
RANDOM_STATE = 42


def fail(reason: str) -> None:
    print(f"FAIL: {reason}")
    raise SystemExit(1)


def print_file(path: str) -> None:
    if not os.path.exists(path):
        fail(f"Missing file: {os.path.abspath(path)}")
    size = os.path.getsize(path)
    if size == 0:
        fail(f"Zero-size file: {os.path.abspath(path)}")
    print(f"{os.path.abspath(path)} | {size / 1024.0:.2f} KB")


def main() -> None:
    # LOAD
    x_path = os.path.join(OUTPUT_DIR, "X_all.npy")
    y_path = os.path.join(OUTPUT_DIR, "y_all.npy")
    meta_path = os.path.join(OUTPUT_DIR, "sequence_metadata.csv")

    for p in [x_path, y_path, meta_path]:
        if not os.path.exists(p):
            fail(f"Required input missing: {os.path.abspath(p)}")

    X = np.load(x_path)
    y = np.load(y_path)
    meta_df = pd.read_csv(meta_path)

    print(f"X shape: {X.shape}")
    print(f"y shape: {y.shape}")
    print(f"meta shape: {meta_df.shape}")
    print(f"X_train min/max precursor: {float(np.min(X)):.6f} / {float(np.max(X)):.6f}")
    print(f"y_train min/max precursor: {float(np.min(y)):.6f} / {float(np.max(y)):.6f}")

    # STEP 10 — USER-LEVEL SPLIT
    if not (len(X) == len(y) == len(meta_df)):
        fail(f"Alignment mismatch: len(X)={len(X)}, len(y)={len(y)}, len(meta_df)={len(meta_df)}")
    if "handle" not in meta_df.columns:
        fail("meta_df missing required column: 'handle'")

    users = meta_df["handle"].unique()
    print(f"total sequences: {len(X)}")
    print(f"total unique users: {len(users)}")

    train_users, temp_users = train_test_split(users, test_size=0.3, random_state=RANDOM_STATE)
    val_users, test_users = train_test_split(temp_users, test_size=0.5, random_state=RANDOM_STATE)

    train_idx = meta_df["handle"].isin(train_users).to_numpy()
    val_idx = meta_df["handle"].isin(val_users).to_numpy()
    test_idx = meta_df["handle"].isin(test_users).to_numpy()

    X_train, X_val, X_test = X[train_idx], X[val_idx], X[test_idx]
    y_train, y_val, y_test = y[train_idx], y[val_idx], y[test_idx]

    train_set = set(train_users)
    val_set = set(val_users)
    test_set = set(test_users)
    ov_train_val = len(train_set.intersection(val_set))
    ov_train_test = len(train_set.intersection(test_set))
    ov_val_test = len(val_set.intersection(test_set))
    print(f"overlap train/val: {ov_train_val}")
    print(f"overlap train/test: {ov_train_test}")
    print(f"overlap val/test: {ov_val_test}")
    if ov_train_val > 0 or ov_train_test > 0 or ov_val_test > 0:
        fail(
            f"User leakage detected in user split: "
            f"train/val={ov_train_val}, train/test={ov_train_test}, val/test={ov_val_test}"
        )

    # STEP 11 — TRAIN-ONLY NORMALIZATION
    feature_scalers = {}
    X_train_norm = np.zeros_like(X_train, dtype=np.float32)
    X_val_norm = np.zeros_like(X_val, dtype=np.float32)
    X_test_norm = np.zeros_like(X_test, dtype=np.float32)

    n_train, seq_len, n_feat = X_train.shape
    n_val = X_val.shape[0]
    n_test = X_test.shape[0]

    for f in range(n_feat):
        scaler = MinMaxScaler()
        train_col = X_train[:, :, f].reshape(-1, 1)
        val_col = X_val[:, :, f].reshape(-1, 1)
        test_col = X_test[:, :, f].reshape(-1, 1)
        scaler.fit(train_col)
        X_train_norm[:, :, f] = scaler.transform(train_col).reshape(n_train, seq_len)
        X_val_norm[:, :, f] = scaler.transform(val_col).reshape(n_val, seq_len)
        X_test_norm[:, :, f] = scaler.transform(test_col).reshape(n_test, seq_len)
        feature_scalers[f"feature_{f}"] = scaler

    # keep y in [0,1] without fitting val/test
    y_train_norm = y_train.astype(np.float32)
    y_val_norm = y_val.astype(np.float32)
    y_test_norm = y_test.astype(np.float32)

    if np.min(X_train_norm) < 0.0 or np.max(X_train_norm) > 1.0:
        fail("X_train_norm out of [0,1] after MinMaxScaler.")
    if np.min(y_train_norm) < 0.0 or np.max(y_train_norm) > 1.0:
        fail("y_train_norm out of [0,1].")

    joblib.dump(feature_scalers, os.path.join(OUTPUT_DIR, "feature_scalers.pkl"))

    # STEP 12 — SAVE FILES
    np.save(os.path.join(OUTPUT_DIR, "X_train_norm.npy"), X_train_norm)
    np.save(os.path.join(OUTPUT_DIR, "X_val_norm.npy"), X_val_norm)
    np.save(os.path.join(OUTPUT_DIR, "X_test_norm.npy"), X_test_norm)
    np.save(os.path.join(OUTPUT_DIR, "y_train_norm.npy"), y_train_norm)
    np.save(os.path.join(OUTPUT_DIR, "y_val_norm.npy"), y_val_norm)
    np.save(os.path.join(OUTPUT_DIR, "y_test_norm.npy"), y_test_norm)

    verify_paths = [
        os.path.join(OUTPUT_DIR, "X_train_norm.npy"),
        os.path.join(OUTPUT_DIR, "X_val_norm.npy"),
        os.path.join(OUTPUT_DIR, "X_test_norm.npy"),
        os.path.join(OUTPUT_DIR, "y_train_norm.npy"),
        os.path.join(OUTPUT_DIR, "y_val_norm.npy"),
        os.path.join(OUTPUT_DIR, "y_test_norm.npy"),
        os.path.join(OUTPUT_DIR, "skill_mapping.json"),
        os.path.join(OUTPUT_DIR, "sequence_metadata.csv"),
    ]
    for p in verify_paths:
        print_file(p)

    # STEP 13 — VALIDATION CHECKS
    checks_passed = 0

    if np.isnan(X_train_norm).any():
        fail("CHECK 1 failed: NaN found in X_train")
    print("PASS CHECK 1")
    checks_passed += 1

    if np.isinf(X_train_norm).any():
        fail("CHECK 2 failed: Inf found in X_train")
    print("PASS CHECK 2")
    checks_passed += 1

    if np.min(X_train_norm) < 0.0 or np.max(X_train_norm) > 1.0:
        fail("CHECK 3 failed: X_train outside [0,1]")
    print("PASS CHECK 3")
    checks_passed += 1

    if np.min(y_train_norm) < 0.0 or np.max(y_train_norm) > 1.0:
        fail("CHECK 4 failed: y_train outside [0,1]")
    print("PASS CHECK 4")
    checks_passed += 1

    std_val = float(np.std(y_train_norm * 100.0))
    print(f"CHECK 5 std(y_train*100): {std_val:.6f}")
    if std_val <= 15.0:
        fail(f"CHECK 5 failed: std(y_train*100)={std_val:.6f} <= 15")
    print("PASS CHECK 5")
    checks_passed += 1

    if X_train_norm.shape[-1] != 4:
        fail(f"CHECK 6 failed: feature dim is {X_train_norm.shape[-1]}, expected 4")
    print("PASS CHECK 6")
    checks_passed += 1

    if X_train_norm.shape[-2] != 24:
        fail(f"CHECK 7 failed: sequence length is {X_train_norm.shape[-2]}, expected 24")
    print("PASS CHECK 7")
    checks_passed += 1

    if len(X_train_norm) != len(y_train_norm):
        fail(f"CHECK 8 failed: len(X_train)={len(X_train_norm)} != len(y_train)={len(y_train_norm)}")
    print("PASS CHECK 8")
    checks_passed += 1

    with open(os.path.join(OUTPUT_DIR, "skill_mapping.json"), "r", encoding="utf-8") as f:
        skill_map = json.load(f)
    if not isinstance(skill_map, dict) or len(skill_map) != 20:
        fail(f"CHECK 9 failed: skill_mapping.json must have 20 entries, found {len(skill_map)}")
    print("PASS CHECK 9")
    checks_passed += 1

    overlap_train_test = len(train_set.intersection(test_set))
    if overlap_train_test != 0:
        fail(f"CHECK 10 failed: overlap(train,test)={overlap_train_test}")
    print("PASS CHECK 10")
    checks_passed += 1

    # STEP 14 — SUMMARY
    y_all_ars = np.concatenate([y_train_norm, y_val_norm, y_test_norm]) * 100.0
    mean_ars = float(np.mean(y_all_ars))
    std_ars = float(np.std(y_all_ars))
    safe = float(np.mean((y_all_ars >= 0.0) & (y_all_ars <= 40.0)) * 100.0)
    at_risk = float(np.mean((y_all_ars > 40.0) & (y_all_ars <= 70.0)) * 100.0)
    critical = float(np.mean((y_all_ars > 70.0) & (y_all_ars <= 100.0)) * 100.0)

    print("┌─────────────────────────────────────────────┐")
    print("│  PREPROCESSING COMPLETE — SUMMARY           │")
    print("├─────────────────────────────────────────────┤")
    print(f"│  Total sequences built    : {len(y_all_ars)}               │")
    print(f"│  Train / Val / Test       : {len(X_train_norm)} / {len(X_val_norm)} / {len(X_test_norm)}       │")
    print("│  Sequence shape           : (24, 4)         │")
    print("│  Skills in vocabulary     : 20              │")
    print(f"│  ARS label mean           : {mean_ars:.1f}             │")
    print(f"│  ARS label std            : {std_ars:.1f}             │")
    print(f"│  % Safe   (ARS 0-40)      : {safe:.1f}%            │")
    print(f"│  % At Risk (ARS 40-70)    : {at_risk:.1f}%            │")
    print(f"│  % Critical (ARS 70-100)  : {critical:.1f}%            │")
    print(f"│  Validation checks passed : {checks_passed} / 10          │")
    print("└─────────────────────────────────────────────┘")


if __name__ == "__main__":
    main()
