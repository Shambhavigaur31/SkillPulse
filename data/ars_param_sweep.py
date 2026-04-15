import math
import os

import numpy as np
import pandas as pd


OUTPUT_DIR = "models"
SEQ_WEEKS = 24


def compute_labels(cleaned_df, meta_df, reference_date, horizon_days, tau, s):
    ref_monday = (reference_date - pd.Timedelta(days=reference_date.dayofweek)).normalize()
    start_monday = ref_monday - pd.Timedelta(weeks=SEQ_WEEKS - 1)
    window_start = start_monday
    window_end = ref_monday + pd.Timedelta(days=6)
    prediction_date = reference_date + pd.Timedelta(days=horizon_days)

    filtered_events = cleaned_df[
        (cleaned_df["verdict_weight"] > 0)
        & (cleaned_df["submitted_at"] >= window_start)
        & (cleaned_df["submitted_at"] <= window_end)
    ][["handle", "tags", "submitted_at"]]
    grouped_events = filtered_events.groupby(["handle", "tags"], sort=False)["submitted_at"].apply(list).to_dict()

    y_list = []
    d_decay = 0.5
    for row in meta_df.itertuples(index=False):
        events = grouped_events.get((row.handle, row.skill), [])
        if len(events) == 0:
            y_list.append(100.0)
            continue
        t_days = np.array([(prediction_date - t).days for t in events], dtype=np.float64)
        t_days = np.where(t_days <= 0.0, 0.1, t_days)
        activation = math.log(np.sum(t_days ** (-d_decay)))
        p_retrieval = 1.0 / (1.0 + math.exp((tau - activation) / s))
        ars_label = round((1.0 - p_retrieval) * 100.0, 2)
        y_list.append(float(np.clip(ars_label, 0.0, 100.0)))

    y = np.array(y_list, dtype=np.float32)
    bins = [0, 20, 40, 60, 80, 100]
    labels = ["[0-20]", "[20-40]", "[40-60]", "[60-80]", "[80-100]"]
    bucketed = pd.cut(y, bins=bins, labels=labels, include_lowest=True, right=True)
    counts = pd.Series(bucketed).value_counts(sort=False)
    dist = {lab: int(counts.get(lab, 0)) for lab in labels}
    return y, dist


def main():
    cleaned_df = pd.read_parquet(os.path.join(OUTPUT_DIR, "cleaned_df.parquet"))
    meta_df = pd.read_csv(os.path.join(OUTPUT_DIR, "sequence_metadata.csv"))
    with open(os.path.join(OUTPUT_DIR, "reference_date.txt"), "r", encoding="utf-8") as f:
        reference_date = pd.Timestamp(f.read().strip())

    cleaned_df["submitted_at"] = pd.to_datetime(cleaned_df["submitted_at"], errors="coerce")

    horizons = [30, 45, 60]
    taus = [-0.5, -0.4, -0.3, -0.2]
    ss = [0.2, 0.25, 0.3]
    total = len(meta_df)

    results = []
    print("ARS parameter sweep (full grid):")
    for horizon_days in horizons:
        for tau in taus:
            for s in ss:
                cfg = {"horizon_days": horizon_days, "tau": tau, "s": s}
                y, dist = compute_labels(cleaned_df, meta_df, reference_date, **cfg)
                std = float(np.std(y))
                mean = float(np.mean(y))
                p0_20 = dist["[0-20]"] / total * 100.0
                p80_100 = dist["[80-100]"] / total * 100.0
                # Smoothness proxy: lower largest-bin share is better.
                max_bin_pct = max(v / total * 100.0 for v in dist.values())
                primary = std >= 17.0
                secondary = (p0_20 <= 70.0) and (p80_100 >= 2.0)
                score = (
                    int(primary) * 1000
                    + int(secondary) * 200
                    + (std * 5.0)
                    + ((100.0 - p0_20) * 0.5)
                    + (p80_100 * 1.0)
                    - (max_bin_pct * 0.5)
                )

                row = {
                    **cfg,
                    "mean": mean,
                    "std": std,
                    "pct_0_20": p0_20,
                    "pct_80_100": p80_100,
                    "max_bin_pct": max_bin_pct,
                    "primary_ok": primary,
                    "secondary_ok": secondary,
                    "score": score,
                    "count_0_20": dist["[0-20]"],
                    "count_20_40": dist["[20-40]"],
                    "count_40_60": dist["[40-60]"],
                    "count_60_80": dist["[60-80]"],
                    "count_80_100": dist["[80-100]"],
                }
                results.append(row)

                print(
                    f"cfg={cfg} -> mean={mean:.4f}, std={std:.4f}, "
                    f"[0-20]={dist['[0-20]']} ({p0_20:.2f}%), "
                    f"[80-100]={dist['[80-100]']} ({p80_100:.2f}%), "
                    f"primary={'PASS' if primary else 'FAIL'}, secondary={'PASS' if secondary else 'FAIL'}"
                )

    res_df = pd.DataFrame(results).sort_values(
        by=["primary_ok", "secondary_ok", "score", "std", "pct_80_100"],
        ascending=[False, False, False, False, False],
    )
    best = res_df.iloc[0]
    print("\nTop 5 configs:")
    print(
        res_df[
            [
                "horizon_days",
                "tau",
                "s",
                "mean",
                "std",
                "pct_0_20",
                "pct_80_100",
                "primary_ok",
                "secondary_ok",
                "score",
            ]
        ]
        .head(5)
        .to_string(index=False)
    )
    print("\nBest config:")
    print(
        f"horizon_days={int(best['horizon_days'])}, tau={best['tau']}, s={best['s']}, "
        f"mean={best['mean']:.4f}, std={best['std']:.4f}, "
        f"0-20={best['pct_0_20']:.2f}%, 80-100={best['pct_80_100']:.2f}%"
    )

    res_path = os.path.join(OUTPUT_DIR, "ars_sweep_results.csv")
    best_path = os.path.join(OUTPUT_DIR, "ars_best_config.csv")
    res_df.to_csv(res_path, index=False)
    pd.DataFrame([best]).to_csv(best_path, index=False)
    print(f"Saved: {res_path}")
    print(f"Saved: {best_path}")


if __name__ == "__main__":
    main()
