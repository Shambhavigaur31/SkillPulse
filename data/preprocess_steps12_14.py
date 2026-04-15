import json
import os

import joblib
import numpy as np
import pandas as pd


OUTPUT_DIR = "models"
RANDOM_STATE = 42


def fail(msg: str) -> None:
    print(f"FAIL: {msg}")
    raise SystemExit(1)


def pass_check(name: str, reason: str = "") -> None:
    if reason:
        print(f"PASS: {name} ({reason})")
    else:
        print(f"PASS: {name}")


def print_file_info_or_fail(path: str) -> None:
    abs_path = os.path.abspath(path)
    if not os.path.exists(path):
        fail(f"Missing file: {abs_path}")
    size_bytes = os.path.getsize(path)
    size_kb = size_bytes / 1024.0
    print(f"File: {abs_path} | Size: {size_kb:.2f} KB")
    if size_bytes == 0:
        fail(f"File size is 0 bytes: {abs_path}")


def reconstruct_split_indices(n: int):
    # Reconstruct train/temp split equivalent to train_test_split(..., test_size=0.30, random_state=42, shuffle=True)
    n_test_temp = int(np.ceil(0.30 * n))
    rng1 = np.random.RandomState(RANDOM_STATE)
    perm1 = rng1.permutation(n)
    idx_temp = perm1[:n_test_temp]
    idx_train = perm1[n_test_temp:]

    # Reconstruct val/test split equivalent to train_test_split(idx_temp, test_size=0.50, random_state=42, shuffle=True)
    n_test = int(np.ceil(0.50 * len(idx_temp)))
    rng2 = np.random.RandomState(RANDOM_STATE)
    perm2 = rng2.permutation(len(idx_temp))
    idx_test = idx_temp[perm2[:n_test]]
    idx_val = idx_temp[perm2[n_test:]]
    return idx_train, idx_val, idx_test


def main() -> None:
    # STEP: LOAD INTERMEDIATES
    required_inputs = [
        os.path.join(OUTPUT_DIR, "X_train_norm.npy"),
        os.path.join(OUTPUT_DIR, "X_val_norm.npy"),
        os.path.join(OUTPUT_DIR, "X_test_norm.npy"),
        os.path.join(OUTPUT_DIR, "y_train_norm.npy"),
        os.path.join(OUTPUT_DIR, "y_val_norm.npy"),
        os.path.join(OUTPUT_DIR, "y_test_norm.npy"),
        os.path.join(OUTPUT_DIR, "sequence_metadata.csv"),
    ]
    for p in required_inputs:
        if not os.path.exists(p):
            fail(f"Missing required input file: {os.path.abspath(p)}")

    X_train = np.load(os.path.join(OUTPUT_DIR, "X_train_norm.npy"))
    X_val = np.load(os.path.join(OUTPUT_DIR, "X_val_norm.npy"))
    X_test = np.load(os.path.join(OUTPUT_DIR, "X_test_norm.npy"))
    y_train = np.load(os.path.join(OUTPUT_DIR, "y_train_norm.npy"))
    y_val = np.load(os.path.join(OUTPUT_DIR, "y_val_norm.npy"))
    y_test = np.load(os.path.join(OUTPUT_DIR, "y_test_norm.npy"))
    meta_df = pd.read_csv(os.path.join(OUTPUT_DIR, "sequence_metadata.csv"))

    print("Loaded arrays:")
    print(f"X_train shape: {X_train.shape}")
    print(f"X_val shape  : {X_val.shape}")
    print(f"X_test shape : {X_test.shape}")
    print(f"y_train shape: {y_train.shape}")
    print(f"y_val shape  : {y_val.shape}")
    print(f"y_test shape : {y_test.shape}")
    print(f"X_train min/max: {float(np.min(X_train)):.6f} / {float(np.max(X_train)):.6f}")
    print(f"y_train min/max: {float(np.min(y_train)):.6f} / {float(np.max(y_train)):.6f}")

    # STEP 12 — SAVE FINAL FILES
    np.save(os.path.join(OUTPUT_DIR, "X_train.npy"), X_train)
    np.save(os.path.join(OUTPUT_DIR, "X_val.npy"), X_val)
    np.save(os.path.join(OUTPUT_DIR, "X_test.npy"), X_test)
    np.save(os.path.join(OUTPUT_DIR, "y_train.npy"), y_train)
    np.save(os.path.join(OUTPUT_DIR, "y_val.npy"), y_val)
    np.save(os.path.join(OUTPUT_DIR, "y_test.npy"), y_test)

    files_to_verify = [
        os.path.join(OUTPUT_DIR, "X_train.npy"),
        os.path.join(OUTPUT_DIR, "X_val.npy"),
        os.path.join(OUTPUT_DIR, "X_test.npy"),
        os.path.join(OUTPUT_DIR, "y_train.npy"),
        os.path.join(OUTPUT_DIR, "y_val.npy"),
        os.path.join(OUTPUT_DIR, "y_test.npy"),
        os.path.join(OUTPUT_DIR, "skill_mapping.json"),
        os.path.join(OUTPUT_DIR, "feature_scalers.pkl"),
        os.path.join(OUTPUT_DIR, "sequence_metadata.csv"),
    ]
    print("\nSTEP 12 file verification:")
    for p in files_to_verify:
        print_file_info_or_fail(p)

    # STEP 13 — VALIDATION CHECKS (STRICT)
    passed = 0
    total_checks = 10

    # CHECK 1
    if np.isnan(X_train).any():
        fail("CHECK 1: NaN values found in X_train")
    pass_check("CHECK 1", "No NaN values in X_train")
    passed += 1

    # CHECK 2
    if np.isinf(X_train).any():
        fail("CHECK 2: Inf values found in X_train")
    pass_check("CHECK 2", "No Inf values in X_train")
    passed += 1

    # CHECK 3
    x_min = float(np.min(X_train))
    x_max = float(np.max(X_train))
    if x_min < 0.0 or x_max > 1.0:
        fail(f"CHECK 3: X_train out of [0,1], min={x_min:.6f}, max={x_max:.6f}")
    pass_check("CHECK 3", f"X_train in [0,1], min={x_min:.6f}, max={x_max:.6f}")
    passed += 1

    # CHECK 4
    y_min = float(np.min(y_train))
    y_max = float(np.max(y_train))
    if y_min < 0.0 or y_max > 1.0:
        fail(f"CHECK 4: y_train out of [0,1], min={y_min:.6f}, max={y_max:.6f}")
    pass_check("CHECK 4", f"y_train in [0,1], min={y_min:.6f}, max={y_max:.6f}")
    passed += 1

    # CHECK 5
    y_std_100 = float(np.std(y_train * 100.0))
    print(f"CHECK 5 std(y_train*100): {y_std_100:.6f}")
    if y_std_100 <= 15.0:
        fail(f"CHECK 5: Label variance too low, std={y_std_100:.6f} (must be > 15)")
    pass_check("CHECK 5", f"Label std={y_std_100:.6f} > 15")
    passed += 1

    # CHECK 6
    if X_train.shape[-1] != 4:
        fail(f"CHECK 6: Feature dimension is {X_train.shape[-1]}, expected 4")
    pass_check("CHECK 6", "Feature dimension == 4")
    passed += 1

    # CHECK 7
    if X_train.shape[-2] != 24:
        fail(f"CHECK 7: Sequence length is {X_train.shape[-2]}, expected 24")
    pass_check("CHECK 7", "Sequence length == 24")
    passed += 1

    # CHECK 8
    if len(X_train) != len(y_train):
        fail(f"CHECK 8: len(X_train)={len(X_train)} != len(y_train)={len(y_train)}")
    pass_check("CHECK 8", "len(X_train) == len(y_train)")
    passed += 1

    # CHECK 9
    skill_map_path = os.path.join(OUTPUT_DIR, "skill_mapping.json")
    if not os.path.exists(skill_map_path):
        fail("CHECK 9: skill_mapping.json missing")
    with open(skill_map_path, "r", encoding="utf-8") as f:
        skill_map = json.load(f)
    if not isinstance(skill_map, dict):
        fail("CHECK 9: skill_mapping.json is not a JSON object")
    unique_entries = len(set(skill_map.values()))
    if unique_entries != 20 or len(skill_map) != 20:
        fail(
            f"CHECK 9: skill_mapping must contain exactly 20 unique entries, "
            f"found len={len(skill_map)}, unique_values={unique_entries}"
        )
    pass_check("CHECK 9", "skill_mapping.json has exactly 20 unique entries")
    passed += 1

    # CHECK 10
    total_sequences = len(meta_df)
    if total_sequences != (len(X_train) + len(X_val) + len(X_test)):
        fail(
            f"CHECK 10: meta_df length mismatch; meta={total_sequences}, "
            f"splits={len(X_train) + len(X_val) + len(X_test)}"
        )
    if "handle" not in meta_df.columns:
        fail("CHECK 10: meta_df does not contain 'handle' column")

    idx_train, idx_val, idx_test = reconstruct_split_indices(total_sequences)
    train_users = set(meta_df.iloc[idx_train]["handle"].astype(str))
    test_users = set(meta_df.iloc[idx_test]["handle"].astype(str))
    overlap_count = len(train_users.intersection(test_users))
    print(f"CHECK 10 overlap count (train vs test users): {overlap_count}")
    if overlap_count != 0:
        fail(f"CHECK 10: User leakage detected, overlap_count={overlap_count}")
    pass_check("CHECK 10", "No user leakage between train and test")
    passed += 1

    # STEP 14 — SUMMARY REPORT
    y_all = np.concatenate([y_train, y_val, y_test]) * 100.0
    ars_mean = float(np.mean(y_all))
    ars_std = float(np.std(y_all))
    ars_min = float(np.min(y_all))
    ars_max = float(np.max(y_all))

    safe_pct = float(np.mean((y_all >= 0.0) & (y_all <= 40.0)) * 100.0)
    at_risk_pct = float(np.mean((y_all > 40.0) & (y_all <= 70.0)) * 100.0)
    critical_pct = float(np.mean((y_all > 70.0) & (y_all <= 100.0)) * 100.0)

    print("ARS min/max: {:.1f} / {:.1f}".format(ars_min, ars_max))
    print("┌─────────────────────────────────────────────┐")
    print("│  PREPROCESSING COMPLETE — SUMMARY           │")
    print("├─────────────────────────────────────────────┤")
    print(f"│  Total sequences built    : {len(y_all)}{' ' * (16 - len(str(len(y_all))))}│")
    print(
        f"│  Train / Val / Test       : {len(X_train)} / {len(X_val)} / {len(X_test)}"
        f"{' ' * max(1, 7 - len(str(len(X_train))) - len(str(len(X_val))) - len(str(len(X_test))))}│"
    )
    print("│  Sequence shape           : (24, 4)         │")
    print("│  Skills in vocabulary     : 20              │")
    print(f"│  ARS label mean           : {ars_mean:.1f}{' ' * 16}│")
    print(f"│  ARS label std            : {ars_std:.1f}{' ' * 16}│")
    print(f"│  % Safe   (ARS 0-40)      : {safe_pct:.1f}%{' ' * 12}│")
    print(f"│  % At Risk (ARS 40-70)    : {at_risk_pct:.1f}%{' ' * 12}│")
    print(f"│  % Critical (ARS 70-100)  : {critical_pct:.1f}%{' ' * 12}│")
    print(f"│  Validation checks passed : {passed} / {total_checks}{' ' * 11}│")
    print("└─────────────────────────────────────────────┘")


if __name__ == "__main__":
    main()
