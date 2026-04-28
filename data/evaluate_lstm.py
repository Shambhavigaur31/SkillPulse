"""Lightweight LSTM evaluation script (no retraining).

Loads test artifacts, computes regression + risk metrics, and writes reports.
"""

from __future__ import annotations

import json
import math
from pathlib import Path
from typing import Any

import numpy as np
from tensorflow import keras
from tensorflow.keras import backend as K


def focal_mse(y_true, y_pred):
    """Custom loss used during training, kept for compatibility on model load."""
    gamma = 2.0
    mse = K.square(y_true - y_pred)
    return K.mean(mse * K.pow(K.abs(y_true - y_pred), gamma))


def project_root() -> Path:
    return Path(__file__).resolve().parents[1]


def models_dir() -> Path:
    return project_root() / "models"


def load_model_artifact(models_path: Path):
    keras_path = models_path / "lstm_model.keras"
    h5_path = models_path / "lstm_model.h5"

    model_path = keras_path if keras_path.exists() else h5_path
    if not model_path.exists():
        raise FileNotFoundError("Missing model artifact: lstm_model.keras or lstm_model.h5")

    # compile=False avoids requiring optimizer state for inference-only evaluation.
    return keras.models.load_model(
        model_path,
        custom_objects={"focal_mse": focal_mse},
        compile=False,
    ), model_path.name


def load_array(path: Path) -> np.ndarray:
    if not path.exists():
        raise FileNotFoundError(f"Missing artifact: {path}")
    return np.load(path)


def flatten_1d(arr: np.ndarray, name: str) -> np.ndarray:
    flat = np.asarray(arr).reshape(-1)
    if flat.size == 0:
        raise ValueError(f"{name} is empty")
    return flat.astype(np.float64)


def safe_pearson(y_true: np.ndarray, y_pred: np.ndarray) -> float:
    if y_true.size < 2:
        return float("nan")
    if np.isclose(np.std(y_true), 0.0) or np.isclose(np.std(y_pred), 0.0):
        return float("nan")
    return float(np.corrcoef(y_true, y_pred)[0, 1])


def binary_precision_recall_f1(y_true_bin: np.ndarray, y_pred_bin: np.ndarray) -> dict[str, float]:
    tp = int(np.sum((y_true_bin == 1) & (y_pred_bin == 1)))
    fp = int(np.sum((y_true_bin == 0) & (y_pred_bin == 1)))
    fn = int(np.sum((y_true_bin == 1) & (y_pred_bin == 0)))

    precision = tp / (tp + fp) if (tp + fp) > 0 else 0.0
    recall = tp / (tp + fn) if (tp + fn) > 0 else 0.0
    f1 = (2 * precision * recall / (precision + recall)) if (precision + recall) > 0 else 0.0

    return {
        "precision": float(precision),
        "recall": float(recall),
        "f1": float(f1),
        "tp": tp,
        "fp": fp,
        "fn": fn,
    }


def top_k_capture(y_true: np.ndarray, y_pred: np.ndarray, true_threshold: float, top_fraction: float) -> dict[str, float | int]:
    n = y_pred.size
    k = max(1, int(math.ceil(n * top_fraction)))
    top_idx = np.argsort(y_pred)[-k:]

    true_high_mask = y_true >= true_threshold
    total_true_high = int(np.sum(true_high_mask))
    captured = int(np.sum(true_high_mask[top_idx]))
    capture_rate = captured / total_true_high if total_true_high > 0 else 0.0

    return {
        "top_fraction": float(top_fraction),
        "k": k,
        "captured_true_high": captured,
        "total_true_high": total_true_high,
        "capture_rate": float(capture_rate),
    }


def bucket_mae(y_true: np.ndarray, y_pred: np.ndarray) -> dict[str, dict[str, float | int]]:
    abs_err = np.abs(y_true - y_pred)

    buckets = {
        "safe_0.0_0.4": (y_true >= 0.0) & (y_true < 0.4),
        "at_risk_0.4_0.7": (y_true >= 0.4) & (y_true < 0.7),
        "critical_0.7_1.0": y_true >= 0.7,
    }

    out: dict[str, dict[str, float | int]] = {}
    for name, mask in buckets.items():
        count = int(np.sum(mask))
        mae = float(np.mean(abs_err[mask])) if count > 0 else float("nan")
        out[name] = {"count": count, "mae": mae}
    return out


def to_jsonable(value: Any) -> Any:
    if isinstance(value, float):
        if math.isnan(value):
            return None
        if math.isinf(value):
            return None
        return value
    if isinstance(value, dict):
        return {k: to_jsonable(v) for k, v in value.items()}
    if isinstance(value, list):
        return [to_jsonable(v) for v in value]
    return value


def main() -> None:
    models_path = models_dir()

    model, model_file = load_model_artifact(models_path)

    x_test = load_array(models_path / "X_test_norm.npy")
    y_true = flatten_1d(load_array(models_path / "y_test_norm.npy"), "y_test_norm.npy")

    pred_path = models_path / "y_pred_test.npy"
    if pred_path.exists():
        y_pred = flatten_1d(load_array(pred_path), "y_pred_test.npy")
        prediction_source = "loaded"
    else:
        raw_pred = model.predict(x_test, verbose=0)
        y_pred = flatten_1d(raw_pred, "model.predict(X_test_norm)")
        prediction_source = "model"

    if y_pred.shape[0] != y_true.shape[0]:
        raise ValueError(
            f"Prediction/target length mismatch: y_pred={y_pred.shape[0]} y_true={y_true.shape[0]}"
        )

    mae = float(np.mean(np.abs(y_true - y_pred)))
    rmse = float(np.sqrt(np.mean((y_true - y_pred) ** 2)))
    pearson = safe_pearson(y_true, y_pred)

    high_risk_threshold = 0.7
    y_true_bin = (y_true >= high_risk_threshold).astype(np.int32)
    y_pred_bin = (y_pred >= high_risk_threshold).astype(np.int32)

    high_risk_metrics = binary_precision_recall_f1(y_true_bin, y_pred_bin)
    top10_capture = top_k_capture(
        y_true=y_true,
        y_pred=y_pred,
        true_threshold=high_risk_threshold,
        top_fraction=0.10,
    )
    bucket_metrics = bucket_mae(y_true, y_pred)

    metrics = {
        "artifacts": {
            "model_file": model_file,
            "x_test_file": "X_test_norm.npy",
            "y_test_file": "y_test_norm.npy",
            "y_pred_source": prediction_source,
            "y_pred_file": "y_pred_test.npy" if pred_path.exists() else None,
        },
        "sample_count": int(y_true.shape[0]),
        "test_mae": mae,
        "test_rmse": rmse,
        "pearson_correlation": pearson,
        "high_risk_threshold": high_risk_threshold,
        "high_risk_precision_recall_f1": high_risk_metrics,
        "top_10_percent_predicted_risk_capture": top10_capture,
        "bucket_wise_mae": bucket_metrics,
    }

    print("=== LSTM Test Evaluation (No Retraining) ===")
    print(f"Model: {model_file}")
    print(f"Prediction source: {prediction_source}")
    print(f"Samples: {metrics['sample_count']}")
    print(f"Test MAE: {mae:.6f}")
    print(f"Test RMSE: {rmse:.6f}")
    print(f"Pearson correlation: {pearson:.6f}" if not math.isnan(pearson) else "Pearson correlation: NaN")
    print(
        "High-risk (y_true>=0.7) -> "
        f"Precision: {high_risk_metrics['precision']:.6f}, "
        f"Recall: {high_risk_metrics['recall']:.6f}, "
        f"F1: {high_risk_metrics['f1']:.6f}"
    )
    print(
        "Top 10% predicted-risk capture -> "
        f"{top10_capture['captured_true_high']}/{top10_capture['total_true_high']} "
        f"({top10_capture['capture_rate']:.6f})"
    )

    print("Bucket-wise MAE:")
    for bucket_name, bucket in bucket_metrics.items():
        mae_value = bucket["mae"]
        mae_str = f"{mae_value:.6f}" if isinstance(mae_value, float) and not math.isnan(mae_value) else "NaN"
        print(f"  - {bucket_name}: count={bucket['count']}, mae={mae_str}")

    report_lines = [
        "LSTM Test Evaluation (No Retraining)",
        f"Model: {model_file}",
        f"Prediction source: {prediction_source}",
        f"Samples: {metrics['sample_count']}",
        f"Test MAE: {mae:.6f}",
        f"Test RMSE: {rmse:.6f}",
        f"Pearson correlation: {pearson:.6f}" if not math.isnan(pearson) else "Pearson correlation: NaN",
        (
            "High-risk (y_true>=0.7): "
            f"precision={high_risk_metrics['precision']:.6f}, "
            f"recall={high_risk_metrics['recall']:.6f}, "
            f"f1={high_risk_metrics['f1']:.6f}, "
            f"tp={high_risk_metrics['tp']}, fp={high_risk_metrics['fp']}, fn={high_risk_metrics['fn']}"
        ),
        (
            "Top 10% predicted-risk capture: "
            f"captured={top10_capture['captured_true_high']}, "
            f"total_true_high={top10_capture['total_true_high']}, "
            f"capture_rate={top10_capture['capture_rate']:.6f}"
        ),
        "Bucket-wise MAE:",
    ]

    for bucket_name, bucket in bucket_metrics.items():
        mae_value = bucket["mae"]
        mae_str = f"{mae_value:.6f}" if isinstance(mae_value, float) and not math.isnan(mae_value) else "NaN"
        report_lines.append(f"  {bucket_name}: count={bucket['count']}, mae={mae_str}")

    report_path = models_path / "evaluation_report.txt"
    metrics_path = models_path / "evaluation_metrics.json"

    report_path.write_text("\n".join(report_lines) + "\n", encoding="utf-8")
    metrics_path.write_text(
        json.dumps(to_jsonable(metrics), indent=2, ensure_ascii=True) + "\n",
        encoding="utf-8",
    )

    print(f"Saved report: {report_path}")
    print(f"Saved metrics JSON: {metrics_path}")


if __name__ == "__main__":
    main()
