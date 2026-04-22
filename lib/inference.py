"""
SkillPulse Phase 1 inference + validation pipeline.

Pipeline:
Codeforces API -> transform -> sequence -> scale -> model -> ARS -> report
"""

# 1. Imports
import argparse
import contextlib
import io
import os
import json
import sys
from typing import Any, Dict, List, Tuple

import joblib
import numpy as np
import pandas as pd
import requests
from tensorflow import keras
from tensorflow.keras import backend as K

# 2. Constants
CF_API_BASE = "https://codeforces.com/api"
MODELS_DIR = os.path.join(os.path.dirname(__file__), "../models")

SKILL_MAPPING_PATH = os.path.join(MODELS_DIR, "skill_mapping.json")
SCALER_PATH = os.path.join(MODELS_DIR, "feature_scalers.pkl")
MODEL_PATH_KERAS = os.path.join(MODELS_DIR, "lstm_model.keras")
MODEL_PATH_H5 = os.path.join(MODELS_DIR, "lstm_model.h5")
MODEL_VERSION = "phase1-lstm-v1"

SEQ_WEEKS = 24
FEATURE_ORDER = ["solve_count", "success_rate", "difficulty_norm", "raw_attempts"]

VERDICT_MAP = {
    "OK": 1.0,
    "WRONG_ANSWER": 0.3,
    "TIME_LIMIT_EXCEEDED": 0.2,
    "RUNTIME_ERROR": 0.1,
    "MEMORY_LIMIT_EXCEEDED": 0.1,
    "COMPILATION_ERROR": 0.0,
    "PRESENTATION_ERROR": 0.0,
}

# Canonical model skill vocabulary (20 classes).
CANONICAL_SKILLS = [
    "greedy",
    "math",
    "implementation",
    "constructive algorithms",
    "brute force",
    "dp",
    "data structures",
    "binary search",
    "sortings",
    "number theory",
    "dfs and similar",
    "graphs",
    "strings",
    "two pointers",
    "bitmasks",
    "trees",
    "combinatorics",
    "unk",
    "dsu",
    "interactive",
]
CANONICAL_SKILLS_SET = set(CANONICAL_SKILLS)

# Raw Codeforces tag -> canonical model skill.
TAG_TO_SKILL = {
    "greedy": "greedy",
    "math": "math",
    "implementation": "implementation",
    "constructive algorithms": "greedy",
    "brute force": "brute force",
    "dp": "dp",
    "data structures": "data structures",
    "binary search": "binary search",
    "sortings": "sortings",
    "number theory": "number theory",
    "dfs and similar": "dfs and similar",
    "graphs": "graphs",
    "strings": "strings",
    "string suffix structures": "strings",
    "expression parsing": "strings",
    "two pointers": "two pointers",
    "bitmasks": "bitmasks",
    "trees": "trees",
    "combinatorics": "combinatorics",
    "probabilities": "math",
    "geometry": "math",
    "matrices": "implementation",
    "hashing": "strings",
    "divide and conquer": "brute force",
    "meet-in-the-middle": "brute force",
    "fft": "math",
    "shortest paths": "graphs",
    "graph matchings": "graphs",
    "flows": "graphs",
    "schedules": "greedy",
    "games": "dp",
    "ternary search": "binary search",
    "chinese remainder theorem": "number theory",
    "dsu": "dsu",
    "interactive": "interactive",
    "2-sat": "graphs",
    "sat": "graphs",
    "special": "unk",
    "*special": "unk",
    "broken": "unk",
    "*broken": "unk",
}

_UNKNOWN_TAG_LOGGED: set[str] = set()

# DAG where each key skill depends on the listed parent skills.
SKILL_GRAPH = {
    "greedy": ["brute force"],
    "dp": ["greedy"],
    "graphs": ["dp"],
    "trees": ["graphs"],
    "number theory": ["math"],
    "combinatorics": ["math"],
    "binary search": ["greedy"],
    "two pointers": ["greedy"],
    "bitmasks": ["dp"],
    "dfs and similar": ["graphs"],
    "dsu": ["data structures"],
    "data structures": ["implementation"],
}
CASCADE_WEIGHT = 0.5


# 3. Model + scaler loading
def focal_mse(y_true, y_pred):
    gamma = 2.0
    mse = K.square(y_true - y_pred)
    return K.mean(mse * K.pow(K.abs(y_true - y_pred), gamma))


def load_skill_mapping() -> Dict[str, int]:
    with open(SKILL_MAPPING_PATH, "r", encoding="utf-8") as f:
        return json.load(f)


def load_scaler():
    return joblib.load(SCALER_PATH)


def load_model():
    if os.path.exists(MODEL_PATH_KERAS):
        return keras.models.load_model(
            MODEL_PATH_KERAS,
            custom_objects={"focal_mse": focal_mse},
        )
    if os.path.exists(MODEL_PATH_H5):
        return keras.models.load_model(
            MODEL_PATH_H5,
            custom_objects={"focal_mse": focal_mse},
        )
    raise FileNotFoundError("No model found at .keras or .h5 path")


def scaler_training_ranges(scaler) -> Dict[str, Tuple[float, float]]:
    out: Dict[str, Tuple[float, float]] = {}
    if isinstance(scaler, dict):
        for i in range(4):
            key = f"feature_{i}"
            if key in scaler and hasattr(scaler[key], "data_min_") and hasattr(scaler[key], "data_max_"):
                out[FEATURE_ORDER[i]] = (float(scaler[key].data_min_[0]), float(scaler[key].data_max_[0]))
    return out


def print_model_output_layer_info(model) -> None:
    last_layer = model.layers[-1]
    activation_name = last_layer.get_config().get("activation", "unknown")
    print(f"[debug] model output layer activation: {activation_name}")


def debug_synthetic_probes(model) -> None:
    x_zero = np.zeros((1, SEQ_WEEKS, 4), dtype=np.float32)
    x_medium = np.full((1, SEQ_WEEKS, 4), 0.5, dtype=np.float32)
    x_high = np.full((1, SEQ_WEEKS, 4), 0.95, dtype=np.float32)

    p_zero = float(model.predict(x_zero, verbose=0)[0, 0])
    p_medium = float(model.predict(x_medium, verbose=0)[0, 0])
    p_high = float(model.predict(x_high, verbose=0)[0, 0])

    print("[debug] synthetic probes (sigmoid outputs):")
    print(f"[debug]   all zeros      -> {p_zero:.6f}")
    print(f"[debug]   medium activity-> {p_medium:.6f}")
    print(f"[debug]   high activity  -> {p_high:.6f}")


def map_tag(tag: str) -> str:
    # Step 1: normalize raw input for stable matching.
    normalized = str(tag).strip().lower()

    # Step 2: exact dictionary match (backward compatible behavior).
    exact = TAG_TO_SKILL.get(normalized)
    if exact in CANONICAL_SKILLS_SET:
        return exact

    # Step 3: keyword-based fallback mapping for unseen/variant tags.
    keyword_fallback_rules = [
        ("tree", "trees"),
        ("graph", "graphs"),
        ("string", "strings"),
        ("math", "math"),
        ("sort", "sortings"),
        ("search", "binary search"),
        ("pointer", "two pointers"),
        ("bit", "bitmasks"),
        ("comb", "combinatorics"),
        ("number", "number theory"),
        ("dsu", "dsu"),
        ("2-sat", "graphs"),
        ("sat", "graphs"),
        ("greedy", "greedy"),
        ("dp", "dp"),
    ]
    for needle, mapped_skill in keyword_fallback_rules:
        if needle in normalized:
            if normalized not in _UNKNOWN_TAG_LOGGED:
                print(f"[debug] Mapped unknown tag '{normalized}' -> '{mapped_skill}'")
                _UNKNOWN_TAG_LOGGED.add(normalized)
            return mapped_skill

    # Step 4: smart fallback for related algorithmic terms.
    smart_fallback_rules = [
        ("sliding window", "two pointers"),
        ("prefix", "data structures"),
        ("suffix", "data structures"),
        ("hashing", "data structures"),
    ]
    for needle, mapped_skill in smart_fallback_rules:
        if needle in normalized:
            if normalized not in _UNKNOWN_TAG_LOGGED:
                print(f"[debug] Mapped unknown tag '{normalized}' -> '{mapped_skill}'")
                _UNKNOWN_TAG_LOGGED.add(normalized)
            return mapped_skill

    # Step 5: final fallback.
    return "unk"


def map_tags_to_canonical(df: pd.DataFrame) -> pd.DataFrame:
    if df.empty:
        return df.copy()
    out = df.copy()
    out["raw_tag"] = out["tag"].astype(str)
    out["tag"] = out["raw_tag"].map(map_tag)
    return out


def mapping_diagnostics(df: pd.DataFrame) -> Dict[str, Any]:
    if df.empty:
        return {
            "rawTags": [],
            "canonicalSkills": [],
            "unmappedTags": [],
            "mappingCoveragePct": 0.0,
        }

    raw_tags = sorted(df["raw_tag"].astype(str).unique().tolist()) if "raw_tag" in df.columns else []
    canonical_skills = sorted(df["tag"].astype(str).unique().tolist())

    unknown_df = df[df["tag"] == "unk"]
    unmapped_tags = sorted(unknown_df["raw_tag"].astype(str).unique().tolist()) if not unknown_df.empty else []

    coverage = 100.0 if not raw_tags else 100.0 * (1.0 - (len(unmapped_tags) / len(raw_tags)))

    return {
        "rawTags": raw_tags,
        "canonicalSkills": canonical_skills,
        "unmappedTags": unmapped_tags,
        "mappingCoveragePct": round(float(max(0.0, min(100.0, coverage))), 2),
    }


def _assert_graph_acyclic(graph: Dict[str, List[str]]) -> None:
    state: Dict[str, int] = {}

    def dfs(node: str) -> None:
        mark = state.get(node, 0)
        if mark == 1:
            raise ValueError(f"Cycle detected in SKILL_GRAPH at '{node}'")
        if mark == 2:
            return
        state[node] = 1
        for parent in graph.get(node, []):
            dfs(parent)
        state[node] = 2

    for node in graph:
        dfs(node)


def compute_cascade_risk(ars_dict: Dict[str, float]) -> Dict[str, float]:
    # Missing skills default to 0 risk.
    base: Dict[str, float] = {
        skill: float(np.clip(ars_dict.get(skill, 0.0), 0.0, 100.0))
        for skill in CANONICAL_SKILLS
    }
    memo: Dict[str, float] = {}

    def cascaded(skill: str) -> float:
        if skill in memo:
            return memo[skill]
        parents = SKILL_GRAPH.get(skill, [])
        if not parents:
            value = base.get(skill, 0.0)
        else:
            parent_mean = float(np.mean([cascaded(parent) for parent in parents]))
            value = base.get(skill, 0.0) + CASCADE_WEIGHT * parent_mean
        value = float(np.clip(value, 0.0, 100.0))
        memo[skill] = value
        return value

    for skill in CANONICAL_SKILLS:
        cascaded(skill)
    return memo


# 4. All helper functions (defined before use)
def fetch_cf_user_status(handle: str) -> List[Dict[str, Any]]:
    url = f"{CF_API_BASE}/user.status?handle={handle}&count=10000"
    response = requests.get(url, headers={"User-Agent": "SkillPulse/1.0"}, timeout=30)
    data = response.json()

    if data.get("status") != "OK":
        comment = data.get("comment", "unknown error")
        raise RuntimeError(f"Codeforces user.status failed for '{handle}': {comment}")

    result = data.get("result", [])
    if not isinstance(result, list):
        raise RuntimeError("Codeforces user.status returned non-list result")

    return result


def expand_submissions_to_rows(submissions: List[Dict[str, Any]], handle: str) -> pd.DataFrame:
    rows: List[Dict[str, Any]] = []
    for sub in submissions:
        problem = sub.get("problem", {})
        tags = problem.get("tags", []) or []
        if not tags:
            continue

        for tag in tags:
            rows.append(
                {
                    "handle": handle,
                    "tag": str(tag),
                    "time_unix": sub.get("creationTimeSeconds"),
                    "verdict": sub.get("verdict"),
                    "problem_rating": problem.get("rating"),
                }
            )

    df = pd.DataFrame(rows)
    if df.empty:
        return pd.DataFrame(columns=["handle", "tag", "time_unix", "verdict", "problem_rating"])

    df["time_unix"] = pd.to_numeric(df["time_unix"], errors="coerce")
    df["problem_rating"] = pd.to_numeric(df["problem_rating"], errors="coerce")
    df = df.dropna(subset=["tag", "time_unix", "problem_rating"]).copy()
    return df


def filter_skills(df: pd.DataFrame, skill_mapping: Dict[str, int]) -> pd.DataFrame:
    if df.empty:
        return df.copy()

    mapping_keys = set(skill_mapping.keys())
    raw_tags = sorted(df["raw_tag"].astype(str).unique().tolist()) if "raw_tag" in df.columns else sorted(df["tag"].astype(str).unique().tolist())
    canonical_tags = sorted(df["tag"].astype(str).unique().tolist())
    intersection = sorted(mapping_keys.intersection(canonical_tags))

    print(f"[debug] raw unique tags ({len(raw_tags)}): {raw_tags[:30]}{' ...' if len(raw_tags) > 30 else ''}")
    print(
        f"[debug] canonical mapped tags ({len(canonical_tags)}): "
        f"{canonical_tags[:30]}{' ...' if len(canonical_tags) > 30 else ''}"
    )
    print(f"[debug] skill mapping keys ({len(mapping_keys)}): {sorted(list(mapping_keys))[:30]}{' ...' if len(mapping_keys) > 30 else ''}")
    print(f"[debug] tag intersection count: {len(intersection)}")

    filtered = df[df["tag"].isin(mapping_keys)].copy()
    filtered["is_accepted"] = (filtered["verdict"] == "OK").astype(int)
    filtered["verdict_weight"] = filtered["verdict"].map(VERDICT_MAP).fillna(0.0)
    filtered["raw_attempts"] = 1

    print(f"[debug] filtered row count: {len(filtered)}")
    print(f"[debug] unique filtered skill count: {filtered['tag'].nunique() if not filtered.empty else 0}")

    if not filtered.empty and len(intersection) <= max(1, int(0.05 * len(raw_tags))):
        print("[debug] filtering removed most rows due to tag taxonomy mismatch between live Codeforces tags and skill_mapping keys.")

    return filtered


def build_weekly_agg(df: pd.DataFrame) -> pd.DataFrame:
    if df.empty:
        return pd.DataFrame(
            columns=[
                "handle",
                "tag",
                "week_start",
                "solve_count",
                "raw_attempts",
                "success_rate",
                "avg_difficulty",
            ]
        )

    out = df.copy()
    out["week_start"] = pd.to_datetime(out["time_unix"], unit="s", utc=True).dt.tz_localize(None)
    out["week_start"] = (out["week_start"] - pd.to_timedelta(out["week_start"].dt.dayofweek, unit="D")).dt.normalize()

    agg = (
        out.groupby(["handle", "tag", "week_start"], as_index=False)
        .agg(
            solve_count=("verdict_weight", "sum"),
            raw_attempts=("raw_attempts", "sum"),
            success_rate=("is_accepted", "mean"),
            avg_difficulty=("problem_rating", "mean"),
        )
        .sort_values(["tag", "week_start"])
    )
    return agg


def build_sequence(tag_df: pd.DataFrame, end_monday: pd.Timestamp) -> np.ndarray:
    # Always return (24, 4): [solve_count, success_rate, difficulty_norm, raw_attempts]
    if tag_df is None or tag_df.empty:
        return np.zeros((SEQ_WEEKS, 4), dtype=np.float32)

    ordered = tag_df.sort_values("week_start").copy()
    ordered["week_start"] = pd.to_datetime(ordered["week_start"]).dt.normalize()

    # Training-style temporal framing: fixed 24-week calendar window ending on end_monday.
    week_axis = pd.date_range(end=end_monday, periods=SEQ_WEEKS, freq="7D")
    week_axis = pd.DatetimeIndex([w.normalize() for w in week_axis])
    grid = pd.DataFrame({"week_start": week_axis})
    merged = grid.merge(
        ordered[["week_start", "solve_count", "success_rate", "avg_difficulty", "raw_attempts"]],
        on="week_start",
        how="left",
    ).fillna(0.0)

    seq = np.zeros((SEQ_WEEKS, 4), dtype=np.float32)
    seq[:, 0] = merged["solve_count"].to_numpy(dtype=np.float32)
    seq[:, 1] = merged["success_rate"].to_numpy(dtype=np.float32)
    seq[:, 2] = merged["avg_difficulty"].to_numpy(dtype=np.float32)
    seq[:, 3] = merged["raw_attempts"].to_numpy(dtype=np.float32)

    # difficulty_norm must match training assumption (feature scaler expects [0,1]-like values).
    seq[:, 2] = seq[:, 2] / 3500.0

    return seq


def scale_sequence(seq: np.ndarray, scaler) -> np.ndarray:
    seq_3d = seq.reshape(1, SEQ_WEEKS, 4)

    # Saved artifact can be either:
    # 1) a single scaler with .transform on 3D input, or
    # 2) a dict of per-feature scalers (feature_0..feature_3).
    if hasattr(scaler, "transform"):
        return scaler.transform(seq_3d)

    if isinstance(scaler, dict):
        expected_keys = [f"feature_{i}" for i in range(4)]
        if not all(k in scaler for k in expected_keys):
            raise ValueError(f"Scaler dict missing expected keys: {expected_keys}")

        out = seq_3d.copy()
        for i, key in enumerate(expected_keys):
            feature_vals = out[0, :, i].reshape(-1, 1)
            out[0, :, i] = scaler[key].transform(feature_vals).reshape(-1)
        return out

    raise TypeError(f"Unsupported scaler type: {type(scaler)}")


def risk_label(ars: float) -> str:
    if ars < 40:
        return "SAFE"
    if ars < 55:
        return "GENTLE"
    if ars < 70:
        return "AT_RISK"
    if ars < 85:
        return "CRITICAL"
    return "SEVERE"


# 5. Main inference function
def predict_cf_user(handle: str) -> Tuple[List[Dict[str, Any]], Dict[str, Any]]:
    print(f"\n[debug] === predict_cf_user(handle={handle}) ===")
    skill_mapping = load_skill_mapping()
    _assert_graph_acyclic(SKILL_GRAPH)
    scaler = load_scaler()
    model = load_model()
    print_model_output_layer_info(model)
    debug_synthetic_probes(model)

    train_ranges = scaler_training_ranges(scaler)
    if train_ranges:
        print("[debug] training feature ranges (from scaler):")
        for feat in FEATURE_ORDER:
            mn, mx = train_ranges[feat]
            print(f"[debug]   {feat}: min={mn:.6f}, max={mx:.6f}")

    submissions = fetch_cf_user_status(handle)
    df_expanded = expand_submissions_to_rows(submissions, handle)
    df_expanded = map_tags_to_canonical(df_expanded)
    df_filtered = filter_skills(df_expanded, skill_mapping)
    mapping_info = mapping_diagnostics(df_expanded)
    agg = build_weekly_agg(df_filtered)

    if df_filtered.empty:
        print("[debug] no filtered rows; returning empty predictions")
        return [], {
            "submissions": len(submissions),
            "expanded_rows": len(df_expanded),
            "filtered_rows": 0,
            "unique_filtered_skills": 0,
            "mapping": mapping_info,
            "modelVersion": MODEL_VERSION,
        }

    end_monday = (
        pd.to_datetime(df_filtered["time_unix"], unit="s", utc=True)
        .dt.tz_localize(None)
        .max()
    )
    end_monday = (end_monday - pd.Timedelta(days=end_monday.dayofweek)).normalize()
    print(f"[debug] sequence end_monday: {end_monday.date()}")

    base_ars_by_skill: Dict[str, float] = {}
    raw_sigmoid_outputs: List[float] = []

    per_feature_before: Dict[str, List[float]] = {f: [] for f in FEATURE_ORDER}
    per_feature_after: Dict[str, List[float]] = {f: [] for f in FEATURE_ORDER}

    for skill in skill_mapping.keys():
        tag_df = agg[agg["tag"] == skill].copy()
        row_count = len(tag_df)
        print(f"[debug] skill={skill} rows={row_count}")

        seq = build_sequence(tag_df, end_monday=end_monday)
        valid_shape = isinstance(seq, np.ndarray) and seq.shape == (SEQ_WEEKS, 4)
        print(f"[debug] skill={skill} sequence_valid={valid_shape} sequence_shape={getattr(seq, 'shape', None)}")

        if not valid_shape:
            print(f"[debug] skill={skill} skipped reason=invalid_sequence_shape")
            continue

        for i, feat in enumerate(FEATURE_ORDER):
            fmin, fmax = float(np.min(seq[:, i])), float(np.max(seq[:, i]))
            per_feature_before[feat].extend([fmin, fmax])
            print(f"[debug] skill={skill} {feat}_before_minmax=({fmin:.6f}, {fmax:.6f})")

        if np.all(seq == 0):
            print(f"[debug] skill={skill} skipped reason=all_zero_sequence")
            continue

        try:
            seq_scaled = scale_sequence(seq, scaler)
        except Exception as exc:
            print(f"[debug] skill={skill} skipped reason=scaling_failed error={exc}")
            continue

        for i, feat in enumerate(FEATURE_ORDER):
            fmin_s, fmax_s = float(np.min(seq_scaled[0, :, i])), float(np.max(seq_scaled[0, :, i]))
            per_feature_after[feat].extend([fmin_s, fmax_s])
            print(f"[debug] skill={skill} {feat}_after_minmax=({fmin_s:.6f}, {fmax_s:.6f})")

        try:
            pred = model.predict(seq_scaled, verbose=0)
            pred_sigmoid = float(np.clip(pred[0, 0], 0.0, 1.0))
            raw_sigmoid_outputs.append(pred_sigmoid)
            # Model is trained on y in [0,1], convert back to ARS [0,100].
            ars = float(pred_sigmoid * 100.0)
            base_ars_by_skill[skill] = ars
            print(f"[debug] skill={skill} prediction_succeeded sigmoid={pred_sigmoid:.6f} ars={ars:.4f}")
        except Exception as exc:
            print(f"[debug] skill={skill} skipped reason=prediction_failed error={exc}")

    adjusted_ars_by_skill = compute_cascade_risk(base_ars_by_skill)
    results: List[Dict[str, Any]] = []
    delta_by_skill: Dict[str, float] = {}
    for skill, ars in base_ars_by_skill.items():
        adjusted_ars = adjusted_ars_by_skill.get(skill, 0.0)
        delta = adjusted_ars - ars
        delta_by_skill[skill] = delta
        results.append(
            {
                "skill": skill,
                "ars": adjusted_ars,
                "baseArs": ars,
                "cascadedArs": adjusted_ars,
                "cascadeDelta": delta,
                "risk": risk_label(adjusted_ars),
            }
        )

    print(f"[debug] total predictions generated: {len(results)}")

    print("[debug] feature range summary before scaling:")
    for feat in FEATURE_ORDER:
        if per_feature_before[feat]:
            print(
                f"[debug]   {feat}: min={min(per_feature_before[feat]):.6f}, "
                f"max={max(per_feature_before[feat]):.6f}"
            )

    print("[debug] feature range summary after scaling:")
    for feat in FEATURE_ORDER:
        if per_feature_after[feat]:
            print(
                f"[debug]   {feat}: min={min(per_feature_after[feat]):.6f}, "
                f"max={max(per_feature_after[feat]):.6f}"
            )

    if raw_sigmoid_outputs:
        sat_low = np.mean(np.array(raw_sigmoid_outputs) < 1e-3) * 100.0
        sat_high = np.mean(np.array(raw_sigmoid_outputs) > 1 - 1e-3) * 100.0
        print(f"[debug] sigmoid saturation: low<{1e-3} => {sat_low:.1f}%, high>{1-1e-3} => {sat_high:.1f}%")

    filtered_rows = len(df_filtered)
    if filtered_rows > 0:
        assert len(results) > 0, (
            f"No predictions generated despite filtered rows > 0 for handle={handle}. "
            "Check debug logs above for the blocker."
        )

    meta = {
        "submissions": len(submissions),
        "expanded_rows": len(df_expanded),
        "filtered_rows": filtered_rows,
        "unique_filtered_skills": int(df_filtered["tag"].nunique()) if filtered_rows > 0 else 0,
        "mapping": mapping_info,
        "modelVersion": MODEL_VERSION,
        "baseVsCascaded": [
            {
                "skill": skill,
                "baseArs": round(float(base_ars_by_skill[skill]), 4),
                "cascadedArs": round(float(adjusted_ars_by_skill.get(skill, 0.0)), 4),
                "delta": round(float(delta_by_skill.get(skill, 0.0)), 4),
            }
            for skill in sorted(base_ars_by_skill.keys())
        ],
    }
    return results, meta


# 6. Validation function
def validate_phase1(handles: List[str]) -> None:
    print("\nPHASE 1 VALIDATION REPORT\n" + "=" * 40)

    for handle in handles:
        print(f"\nHandle: {handle}")
        try:
            results, meta = predict_cf_user(handle)

            ars_vals = [r["ars"] for r in results]
            sorted_results = sorted(results, key=lambda x: x["ars"])

            print(f"submissions: {meta['submissions']}")
            print(f"expanded rows: {meta['expanded_rows']}")
            print(f"filtered rows: {meta['filtered_rows']}")
            print(f"unique filtered skills: {meta['unique_filtered_skills']}")
            print(f"total predicted skills: {len(results)}")
            mapping = meta.get("mapping", {})
            print(f"mapping coverage: {mapping.get('mappingCoveragePct', 0.0)}%")
            print(f"raw tags seen: {mapping.get('rawTags', [])}")
            print(f"mapped canonical skills: {mapping.get('canonicalSkills', [])}")
            print(f"unmapped tags: {mapping.get('unmappedTags', [])}")

            if ars_vals:
                print(f"ARS min/max: {min(ars_vals):.2f} / {max(ars_vals):.2f}")
                print(
                    "ARS mean/std: "
                    f"{float(np.mean(ars_vals)):.2f} / {float(np.std(ars_vals)):.2f}"
                )
                hist_counts, hist_edges = np.histogram(np.array(ars_vals), bins=[0, 20, 40, 60, 80, 100])
                hist_labels = ["[0-20)", "[20-40)", "[40-60)", "[60-80)", "[80-100]"]
                print("ARS histogram:")
                for lbl, cnt in zip(hist_labels, hist_counts.tolist()):
                    print(f"  {lbl}: {cnt}")
                print("lowest-risk 3 skills:", [(r["skill"], round(r["ars"], 2)) for r in sorted_results[:3]])
                print("highest-risk 3 skills:", [(r["skill"], round(r["ars"], 2)) for r in sorted_results[-3:]])
            else:
                print("ARS min/max: n/a")
                print("lowest-risk 3 skills: []")
                print("highest-risk 3 skills: []")

            # Checks
            shape_ok = all(isinstance(r.get("ars"), float) for r in results)
            range_ok = all(0.0 <= r["ars"] <= 100.0 for r in results)
            diversity_ok = len(set(round(a, 2) for a in ars_vals)) > 1 if ars_vals else False

            print(f"check sequence shape: {'PASS' if shape_ok else 'FAIL'}")
            print(f"check ARS range: {'PASS' if range_ok else 'FAIL'}")
            print(f"check diversity: {'PASS' if diversity_ok else 'FAIL'}")
            in_range_cascaded = all(
                0.0 <= float(item.get("cascadedArs", 0.0)) <= 100.0
                for item in meta.get("baseVsCascaded", [])
            )
            print(f"check cascaded ARS range: {'PASS' if in_range_cascaded else 'FAIL'}")
            print("overall: PASS" if (shape_ok and range_ok and len(results) > 0) else "overall: FAIL")

        except AssertionError as exc:
            print(f"overall: FAIL ({exc})")
        except Exception as exc:
            print(f"overall: FAIL (exception: {exc})")


def run_single_handle(handle: str, json_mode: bool, include_meta: bool) -> int:
    try:
        if json_mode:
            # Ensure only JSON is written to stdout in machine mode.
            with contextlib.redirect_stdout(io.StringIO()):
                results, meta = predict_cf_user(handle)
            payload = {
                "handle": handle,
                "modelVersion": meta.get("modelVersion", MODEL_VERSION),
                "skills": [
                    {
                        "skill": str(r["skill"]),
                        "ars": round(float(r["ars"]), 4),
                        "baseArs": round(float(r.get("baseArs", r["ars"])), 4),
                        "cascadedArs": round(float(r.get("cascadedArs", r["ars"])), 4),
                        "cascadeDelta": round(float(r.get("cascadeDelta", 0.0)), 4),
                    }
                    for r in results
                ],
            }
            if include_meta:
                payload["meta"] = meta
            print(json.dumps(payload, separators=(",", ":")))
            return 0

        results, meta = predict_cf_user(handle)
        print(f"handle: {handle}")
        print(f"submissions: {meta['submissions']}")
        print(f"filtered rows: {meta['filtered_rows']}")
        print(f"predicted skills: {len(results)}")
        print(json.dumps(results, indent=2))
        return 0
    except Exception as exc:
        if json_mode:
            sys.stderr.write(str(exc) + "\n")
        else:
            print(f"ERROR: {exc}")
        return 1


# 7. Script entry point
if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="SkillPulse inference runner")
    parser.add_argument("--handle", type=str, help="Codeforces handle to run inference for")
    parser.add_argument("--json", action="store_true", help="Output JSON only (stdout)")
    parser.add_argument(
        "--include-meta",
        action="store_true",
        help="Include diagnostics metadata in JSON output",
    )
    parser.add_argument(
        "--validate-handles",
        nargs="+",
        help="Run validation report for one or more handles",
    )
    args = parser.parse_args()

    if args.handle:
        raise SystemExit(run_single_handle(args.handle.strip(), args.json, args.include_meta))

    if args.validate_handles:
        validate_phase1([h.strip() for h in args.validate_handles if h.strip()])
        raise SystemExit(0)

    validate_phase1([
        "shambhavi31",
        "tourist",
        "Benq",
    ])
