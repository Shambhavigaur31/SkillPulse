import os

import numpy as np
import tensorflow as tf
from tensorflow.keras import Model
from tensorflow.keras.callbacks import EarlyStopping
from tensorflow.keras.layers import LSTM, Dense, Dropout, Input
from tensorflow.keras.optimizers import Adam


OUTPUT_DIR = "models"
RANDOM_STATE = 42
EPOCHS = 25
BATCH_SIZE = 64
LEARNING_RATE = 0.001


def fail(msg: str) -> None:
    print(f"FAIL: {msg}")
    raise SystemExit(1)


def check_range(name: str, arr: np.ndarray) -> None:
    amin = float(np.min(arr))
    amax = float(np.max(arr))
    print(f"{name} min/max: {amin:.6f} / {amax:.6f}")
    if amin < 0.0 or amax > 1.0:
        fail(f"{name} has values outside [0,1]: min={amin:.6f}, max={amax:.6f}")


def mae(y_true: np.ndarray, y_pred: np.ndarray) -> float:
    return float(np.mean(np.abs(y_true - y_pred)))


def rmse(y_true: np.ndarray, y_pred: np.ndarray) -> float:
    return float(np.sqrt(np.mean((y_true - y_pred) ** 2)))


def bucket_mask(y: np.ndarray, lo: float, hi: float, include_hi: bool = False) -> np.ndarray:
    if include_hi:
        return (y >= lo) & (y <= hi)
    return (y >= lo) & (y < hi)


def safe_div(num: float, den: float) -> float:
    return float(num / den) if den != 0 else 0.0


def main() -> None:
    tf.keras.utils.set_random_seed(RANDOM_STATE)
    np.random.seed(RANDOM_STATE)

    x_train_path = os.path.join(OUTPUT_DIR, "X_train_norm.npy")
    x_val_path = os.path.join(OUTPUT_DIR, "X_val_norm.npy")
    x_test_path = os.path.join(OUTPUT_DIR, "X_test_norm.npy")
    y_train_path = os.path.join(OUTPUT_DIR, "y_train_norm.npy")
    y_val_path = os.path.join(OUTPUT_DIR, "y_val_norm.npy")
    y_test_path = os.path.join(OUTPUT_DIR, "y_test_norm.npy")

    for p in [x_train_path, x_val_path, x_test_path, y_train_path, y_val_path, y_test_path]:
        if not os.path.exists(p):
            fail(f"Missing required file: {os.path.abspath(p)}")

    X_train = np.load(x_train_path).astype(np.float32)
    X_val = np.load(x_val_path).astype(np.float32)
    X_test = np.load(x_test_path).astype(np.float32)
    y_train = np.load(y_train_path).astype(np.float32).reshape(-1, 1)
    y_val = np.load(y_val_path).astype(np.float32).reshape(-1, 1)
    y_test = np.load(y_test_path).astype(np.float32).reshape(-1, 1)

    print(f"X_train shape: {X_train.shape}")
    print(f"X_val shape  : {X_val.shape}")
    print(f"X_test shape : {X_test.shape}")
    print(f"y_train shape: {y_train.shape}")
    print(f"y_val shape  : {y_val.shape}")
    print(f"y_test shape : {y_test.shape}")

    if X_train.shape[0] != y_train.shape[0]:
        fail("X_train/y_train shape mismatch")
    if X_val.shape[0] != y_val.shape[0]:
        fail("X_val/y_val shape mismatch")
    if X_test.shape[0] != y_test.shape[0]:
        fail("X_test/y_test shape mismatch")
    if X_train.shape[1:] != X_val.shape[1:] or X_train.shape[1:] != X_test.shape[1:]:
        fail("Inconsistent sequence shape across splits")
    if X_train.shape[1] != 24 or X_train.shape[2] != 4:
        fail(f"Unexpected input shape {X_train.shape[1:]}, expected (24, 4)")

    check_range("X_train", X_train)
    check_range("X_val", X_val)
    check_range("X_test", X_test)
    check_range("y_train", y_train)
    check_range("y_val", y_val)
    check_range("y_test", y_test)

    # Step 15A model
    inputs = Input(shape=(24, 4))
    x = LSTM(64, return_sequences=True)(inputs)
    x = Dropout(0.2)(x)
    x = LSTM(32)(x)
    x = Dropout(0.2)(x)
    x = Dense(16, activation="relu")(x)
    outputs = Dense(1, activation="sigmoid")(x)
    model = Model(inputs=inputs, outputs=outputs)

    # Step 15B focal loss (mandatory)
    def focal_mse(y_true, y_pred):
        error = tf.abs(y_true - y_pred)
        weight = tf.pow(error, 2)
        return tf.reduce_mean(weight * tf.square(y_true - y_pred))

    model.compile(
        optimizer=Adam(learning_rate=LEARNING_RATE),
        loss=focal_mse,
        metrics=["mae"],
    )

    # Step 15C training
    early_stopping = EarlyStopping(
        monitor="val_loss",
        patience=5,
        restore_best_weights=True,
    )

    try:
        model.fit(
            X_train,
            y_train,
            validation_data=(X_val, y_val),
            epochs=EPOCHS,
            batch_size=BATCH_SIZE,
            verbose=1,
            callbacks=[early_stopping],
        )
    except Exception as exc:
        fail(f"Training failed: {exc}")

    # Step 15D evaluation
    y_pred_train = model.predict(X_train, verbose=0).reshape(-1)
    y_pred_val = model.predict(X_val, verbose=0).reshape(-1)
    y_pred_test = model.predict(X_test, verbose=0).reshape(-1)

    y_train_1d = y_train.reshape(-1)
    y_val_1d = y_val.reshape(-1)
    y_test_1d = y_test.reshape(-1)

    train_mae = mae(y_train_1d, y_pred_train)
    val_mae = mae(y_val_1d, y_pred_val)
    test_mae = mae(y_test_1d, y_pred_test)
    train_rmse = rmse(y_train_1d, y_pred_train)
    val_rmse = rmse(y_val_1d, y_pred_val)
    test_rmse = rmse(y_test_1d, y_pred_test)

    print(f"Train MAE: {train_mae:.6f}, RMSE: {train_rmse:.6f}")
    print(f"Val   MAE: {val_mae:.6f}, RMSE: {val_rmse:.6f}")
    print(f"Test  MAE: {test_mae:.6f}, RMSE: {test_rmse:.6f}")

    # Bucket-wise evaluation on test
    buckets = [
        ("Safe", 0.0, 0.4, False),
        ("At Risk", 0.4, 0.7, False),
        ("Critical", 0.7, 1.0, True),
    ]
    print("Bucket-wise test evaluation:")
    for name, lo, hi, include_hi in buckets:
        m = bucket_mask(y_test_1d, lo, hi, include_hi=include_hi)
        count = int(np.sum(m))
        bucket_mae = mae(y_test_1d[m], y_pred_test[m]) if count > 0 else 0.0
        print(f"  {name:8s} count={count:5d}, mae={bucket_mae:.6f}")

    # High-risk detection
    high_true = y_test_1d >= 0.7
    high_pred = y_pred_test >= 0.7
    tp = int(np.sum(high_true & high_pred))
    fp = int(np.sum(~high_true & high_pred))
    fn = int(np.sum(high_true & ~high_pred))

    precision = safe_div(tp, tp + fp)
    recall = safe_div(tp, tp + fn)
    f1 = safe_div(2 * precision * recall, precision + recall)

    # Top-K evaluation (top 10% by predicted risk)
    n_test = len(y_test_1d)
    k = max(1, int(np.ceil(0.10 * n_test)))
    top_idx = np.argsort(y_pred_test)[-k:]
    true_high_total = int(np.sum(high_true))
    true_high_in_top = int(np.sum(high_true[top_idx]))
    top10_capture = safe_div(true_high_in_top, true_high_total) * 100.0

    # Pearson correlation
    if np.std(y_test_1d) == 0.0 or np.std(y_pred_test) == 0.0:
        corr = 0.0
    else:
        corr = float(np.corrcoef(y_test_1d, y_pred_test)[0, 1])

    # Step 15E save outputs
    model_path = os.path.join(OUTPUT_DIR, "lstm_model.h5")
    pred_path = os.path.join(OUTPUT_DIR, "y_pred_test.npy")
    model.save(model_path)
    np.save(pred_path, y_pred_test.astype(np.float32))

    # Step 15F final report
    print("┌─────────────────────────────────────────────┐")
    print("│ MODEL TRAINING — SUMMARY                    │")
    print("├─────────────────────────────────────────────┤")
    print(f"│ Train MAE              : {train_mae:.4f}             │")
    print(f"│ Val MAE                : {val_mae:.4f}             │")
    print(f"│ Test MAE               : {test_mae:.4f}             │")
    print(f"│ Test RMSE              : {test_rmse:.4f}             │")
    print(f"│ Correlation (test)     : {corr:.4f}             │")
    print("│                                             │")
    print(f"│ High Risk Precision    : {precision:.2f}               │")
    print(f"│ High Risk Recall       : {recall:.2f}               │")
    print(f"│ High Risk F1-score     : {f1:.2f}               │")
    print("│                                             │")
    print(f"│ Top 10% Risk Capture   : {top10_capture:.1f}%               │")
    print("│                                             │")
    print("│ Model Saved            : YES                │")
    print("└─────────────────────────────────────────────┘")


if __name__ == "__main__":
    main()
