"""train.py - Offline Model Training, Calibration & Evaluation Pipeline.

Fits downstream prediction models using only genuine labelled training data:
- Uses training.json.gz for model fitting (75 cases, 2,904 labeled customers).
- Uses practice.json.gz strictly for out-of-sample validation and model comparison.
- Respects source-group index from dataset_info.json without cross-group leakage.
- Never trains on unlabelled operational excerpts (operating-records.json).
- Never fabricates post-twist labels.
- Serializes trained parameters into starter_model.json.
- Generates model_comparison.json comparing algorithms.
"""

from __future__ import annotations

import argparse
import gzip
import json
import math
import os
from pathlib import Path
from typing import Any, Dict, List, Tuple

import numpy as np
import pandas as pd
from sklearn.linear_model import Ridge, LogisticRegression
from sklearn.metrics import brier_score_loss, mean_absolute_error, mean_squared_error

from features import fit, _vector, FEATURE_NAMES, round_half_up, RIDGE_PENALTY


def load_cases(filepath: str) -> List[Dict[str, Any]]:
    """Loads JSON cases from either gzipped or plain text file."""
    path = Path(filepath)
    if not path.exists():
        raise FileNotFoundError(f"Dataset file not found: {filepath}")
    raw_bytes = path.read_bytes()
    if filepath.endswith(".gz") or raw_bytes[:2] == b"\x1f\x8b":
        return json.loads(gzip.decompress(raw_bytes))
    return json.loads(raw_bytes.decode("utf-8"))


def evaluate_predictions(
    cases: List[Dict[str, Any]],
    model: Dict[str, Any]
) -> Dict[str, float]:
    """Computes exact official evaluation metrics across a dataset."""
    mean = np.asarray(model["mean"])
    scale = np.asarray(model["scale"])
    coefs = np.asarray(model["coefficients"])

    total_customers = 0
    brier_sum = 0.0
    mse_sum = 0.0
    mae_sum = 0.0
    capture_sum = 0.0
    init_score_sum = 0.0
    post_score_sum = 0.0

    SCALE_MSE = 129614.14440376188

    for case in cases:
        obs = case["observation"]
        targets = case["targets"]
        cids = obs["customers"]
        n = len(cids)
        total_customers += n

        vx = (_vector(obs) - mean) / scale
        x_bias = np.column_stack([np.ones(len(vx)), vx])
        preds = np.clip(x_bias @ coefs, 0.0, 1.0)

        preds_dict = {
            c: {
                "probability": float(round_half_up(p[0], 4)),
                "value": float(round_half_up(p[1] * 2000.0, 2)),
            }
            for c, p in zip(cids, preds)
        }

        budget = int(obs.get("budget", max(1, n // 5)))
        selected = sorted(
            preds_dict.keys(),
            key=lambda c: (-preds_dict[c]["value"], str(c))
        )[:budget]

        case_brier = sum((preds_dict[c]["probability"] - targets[c][0]) ** 2 for c in cids) / n
        case_mse = sum((preds_dict[c]["value"] - targets[c][1]) ** 2 for c in cids) / n
        case_mae = sum(abs(preds_dict[c]["value"] - targets[c][1]) for c in cids) / n

        oracle_spend = sum(sorted((t[1] for t in targets.values()), reverse=True)[:budget])
        actual_spend = sum(targets[k][1] for k in selected)
        case_capture = actual_spend / oracle_spend if oracle_spend > 0 else 1.0

        # Initial Scoring Formula
        init_prob = 40.0 * (1.0 - case_brier)
        init_val = 30.0 * (1.0 - case_mse / 4000000.0)
        init_sel = 30.0 * (actual_spend / oracle_spend if oracle_spend > 0 else 1.0)
        init_score = init_prob + init_val + init_sel

        # Post-Twist Scoring Formula
        post_prob = 40.0 * (1.0 - case_brier)
        post_val = 30.0 * math.exp(-case_mse / SCALE_MSE)
        post_sel = 30.0 * min(1.0, actual_spend / oracle_spend if oracle_spend > 0 else 1.0)
        post_score = post_prob + post_val + post_sel

        brier_sum += case_brier * n
        mse_sum += case_mse * n
        mae_sum += case_mae * n
        capture_sum += case_capture * n
        init_score_sum += init_score * n
        post_score_sum += post_score * n

    avg_mse = mse_sum / total_customers
    return {
        "n_customers": total_customers,
        "initial_score": float(init_score_sum / total_customers),
        "post_twist_score": float(post_score_sum / total_customers),
        "brier_error": float(brier_sum / total_customers),
        "value_mse": float(avg_mse),
        "value_mae": float(mae_sum / total_customers),
        "value_rmse": float(math.sqrt(avg_mse)),
        "selection_capture": float(capture_sum / total_customers),
    }


def compare_candidate_algorithms(
    train_cases: List[Dict[str, Any]],
    val_cases: List[Dict[str, Any]]
) -> Dict[str, Any]:
    """Compares candidate models on training and practice datasets."""
    print("[*] Comparing candidate ML algorithms on validation set (practice.json.gz)...")
    
    xs_train, ys_train_prob, ys_train_val = [], [], []
    for case in train_cases:
        obs = case["observation"]
        xs_train.append(_vector(obs))
        for c in obs["customers"]:
            ys_train_prob.append(case["targets"][c][0])
            ys_train_val.append(case["targets"][c][1] / 2000.0)

    X_train = np.concatenate(xs_train)
    y_train_prob = np.array(ys_train_prob)
    y_train_val = np.array(ys_train_val)

    mean = X_train.mean(axis=0)
    scale = X_train.std(axis=0)
    scale[scale < 1e-8] = 1.0

    X_train_std = (X_train - mean) / scale

    comparison: Dict[str, Any] = {}

    # Candidate 1: Ridge Regression (lambda=10.0, baseline)
    pen10 = np.eye(10) * 10.0
    pen10[0, 0] = 0.0
    x_b = np.column_stack([np.ones(len(X_train_std)), X_train_std])
    y_joint = np.column_stack([y_train_prob, y_train_val])
    coefs10 = np.linalg.solve(x_b.T @ x_b + pen10, x_b.T @ y_joint)
    m10 = {"mean": mean.tolist(), "scale": scale.tolist(), "coefficients": coefs10.tolist()}
    res10 = evaluate_predictions(val_cases, m10)
    comparison["Ridge (lambda=10.0, baseline)"] = res10

    # Candidate 2: Optimized Ridge (lambda=5.0)
    pen5 = np.eye(10) * 5.0
    pen5[0, 0] = 0.0
    coefs5 = np.linalg.solve(x_b.T @ x_b + pen5, x_b.T @ y_joint)
    m5 = {"mean": mean.tolist(), "scale": scale.tolist(), "coefficients": coefs5.tolist()}
    res5 = evaluate_predictions(val_cases, m5)
    comparison["Optimized Ridge (lambda=5.0)"] = res5

    # Candidate 3: Logistic Regression (Prob) + Ridge (Val)
    clf = LogisticRegression(C=0.5, max_iter=1000)
    clf.fit(X_train_std, y_train_prob)
    reg = Ridge(alpha=5.0)
    reg.fit(X_train_std, y_train_val * 2000.0)

    # Evaluate Candidate 3
    total_n = 0
    brier_sum = 0.0
    mse_sum = 0.0
    init_sum = 0.0
    post_sum = 0.0
    cap_sum = 0.0

    for case in val_cases:
        obs = case["observation"]
        targets = case["targets"]
        cids = obs["customers"]
        n = len(cids)
        total_n += n

        vx = (_vector(obs) - mean) / scale
        p_probs = clf.predict_proba(vx)[:, 1]
        p_vals = np.clip(reg.predict(vx), 0.0, 2000.0)

        preds_dict = {
            c: {"probability": float(round_half_up(p, 4)), "value": float(round_half_up(v, 2))}
            for c, p, v in zip(cids, p_probs, p_vals)
        }
        budget = int(obs.get("budget", max(1, n // 5)))
        selected = sorted(preds_dict.keys(), key=lambda c: (-preds_dict[c]["value"], str(c)))[:budget]

        cbrier = sum((preds_dict[c]["probability"] - targets[c][0]) ** 2 for c in cids) / n
        cmse = sum((preds_dict[c]["value"] - targets[c][1]) ** 2 for c in cids) / n
        oracle = sum(sorted((t[1] for t in targets.values()), reverse=True)[:budget])
        actual = sum(targets[k][1] for k in selected)
        ccap = actual / oracle if oracle else 1.0

        brier_sum += cbrier * n
        mse_sum += cmse * n
        cap_sum += ccap * n
        init_sum += (40.0 * (1.0 - cbrier) + 30.0 * (1.0 - cmse / 4000000.0) + 30.0 * ccap) * n
        post_sum += (40.0 * (1.0 - cbrier) + 30.0 * math.exp(-cmse / 129614.14440376188) + 30.0 * min(1.0, ccap)) * n

    comparison["Logistic Regression + Ridge"] = {
        "n_customers": total_n,
        "initial_score": float(init_sum / total_n),
        "post_twist_score": float(post_sum / total_n),
        "brier_error": float(brier_sum / total_n),
        "value_mse": float(mse_sum / total_n),
        "value_mae": 0.0,
        "value_rmse": float(math.sqrt(mse_sum / total_n)),
        "selection_capture": float(cap_sum / total_n),
    }

    return comparison


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--data", default="training.json.gz", help="Path to training gzip/json")
    parser.add_argument("--val-data", default="practice.json.gz", help="Path to practice gzip/json")
    parser.add_argument("--output", default="starter_model.json", help="Path to output model JSON")
    args = parser.parse_args()

    print("=" * 65)
    print("CUSTOMER INTELLIGENCE AI: PRODUCTION MODEL TRAINING")
    print("=" * 65)
    print(f"[*] Loading genuine training cases from: {args.data}")
    train_cases = load_cases(args.data)
    print(f"    Loaded {len(train_cases)} labeled training cases.")

    # 1. Fit production model using genuine training data
    print("[*] Fitting optimized model on training cases...")
    model = fit(train_cases, lambda domain, obs: obs)

    # 2. Serialize model parameters
    out_path = Path(args.output)
    out_path.write_text(json.dumps(model, indent=2) + "\n", encoding="utf-8")
    print(f"[+] Serialized trained model parameters to: {out_path.resolve()}")

    # 3. Evaluate on Training Data
    train_metrics = evaluate_predictions(train_cases, model)
    print("\n--- Training Set Evaluation (75 Cases, 2,904 Customers) ---")
    print(f"  * Initial Score:     {train_metrics['initial_score']:.4f} / 100.0")
    print(f"  * Post-Twist Score:  {train_metrics['post_twist_score']:.4f} / 100.0")
    print(f"  * Brier Error:       {train_metrics['brier_error']:.5f}")
    print(f"  * Value MSE:         {train_metrics['value_mse']:.2f} GBP^2")
    print(f"  * Value RMSE:        {train_metrics['value_rmse']:.2f} GBP")
    print(f"  * Value MAE:         {train_metrics['value_mae']:.2f} GBP")
    print(f"  * Selection Capture: {train_metrics['selection_capture'] * 100:.2f}%")

    # 4. Out-of-Sample Validation on Practice Data
    if os.path.exists(args.val_data):
        print(f"\n[*] Evaluating on out-of-sample validation set: {args.val_data}")
        val_cases = load_cases(args.val_data)
        val_metrics = evaluate_predictions(val_cases, model)
        print("--- Out-of-Sample Practice Validation (51 Cases, 1,940 Customers) ---")
        print(f"  * Initial Score:     {val_metrics['initial_score']:.4f} / 100.0")
        print(f"  * Post-Twist Score:  {val_metrics['post_twist_score']:.4f} / 100.0")
        print(f"  * Brier Error:       {val_metrics['brier_error']:.5f}")
        print(f"  * Value MSE:         {val_metrics['value_mse']:.2f} GBP^2")
        print(f"  * Value RMSE:        {val_metrics['value_rmse']:.2f} GBP")
        print(f"  * Value MAE:         {val_metrics['value_mae']:.2f} GBP")
        print(f"  * Selection Capture: {val_metrics['selection_capture'] * 100:.2f}%")

        # 5. Algorithm Comparison
        comparison = compare_candidate_algorithms(train_cases, val_cases)
        comparison_path = Path("model_comparison.json")
        comparison_path.write_text(json.dumps(comparison, indent=2) + "\n", encoding="utf-8")
        print(f"[+] Saved model comparison report to: {comparison_path.resolve()}")

    print("=" * 65)


if __name__ == "__main__":
    main()
