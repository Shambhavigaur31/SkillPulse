import os

import numpy as np
from sklearn.model_selection import train_test_split


OUTPUT_DIR = "models"
RANDOM_STATE = 42


def main() -> None:
    x_all_path = os.path.join(OUTPUT_DIR, "X_all.npy")
    y_all_path = os.path.join(OUTPUT_DIR, "y_all.npy")

    if os.path.exists(x_all_path) and os.path.exists(y_all_path):
        print("X_all.npy and y_all.npy already exist. Nothing to do.")
        return

    x_raw_path = os.path.join(OUTPUT_DIR, "X_raw.npy")
    x_train_path = os.path.join(OUTPUT_DIR, "X_train_norm.npy")
    x_val_path = os.path.join(OUTPUT_DIR, "X_val_norm.npy")
    x_test_path = os.path.join(OUTPUT_DIR, "X_test_norm.npy")
    y_train_path = os.path.join(OUTPUT_DIR, "y_train_norm.npy")
    y_val_path = os.path.join(OUTPUT_DIR, "y_val_norm.npy")
    y_test_path = os.path.join(OUTPUT_DIR, "y_test_norm.npy")

    X_raw = np.load(x_raw_path)
    y_train = np.load(y_train_path)
    y_val = np.load(y_val_path)
    y_test = np.load(y_test_path)
    X_train = np.load(x_train_path)
    X_val = np.load(x_val_path)
    X_test = np.load(x_test_path)

    n = X_raw.shape[0]
    idx = np.arange(n)
    idx_train, idx_temp = train_test_split(idx, test_size=0.30, random_state=RANDOM_STATE, shuffle=True)
    idx_val, idx_test = train_test_split(idx_temp, test_size=0.50, random_state=RANDOM_STATE, shuffle=True)

    if len(idx_train) != len(y_train) or len(idx_val) != len(y_val) or len(idx_test) != len(y_test):
        raise ValueError("Split index sizes do not match y split file sizes.")
    if len(idx_train) != len(X_train) or len(idx_val) != len(X_val) or len(idx_test) != len(X_test):
        raise ValueError("Split index sizes do not match X split file sizes.")

    y_all = np.empty(n, dtype=np.float32)
    y_all[idx_train] = y_train.astype(np.float32)
    y_all[idx_val] = y_val.astype(np.float32)
    y_all[idx_test] = y_test.astype(np.float32)

    np.save(x_all_path, X_raw.astype(np.float32))
    np.save(y_all_path, y_all)
    print(f"Saved {x_all_path} with shape {X_raw.shape}")
    print(f"Saved {y_all_path} with shape {y_all.shape}")


if __name__ == "__main__":
    main()
