"""local_check.py - Official Competition Evaluator, Scoring & Compliance Suite.

Usage:
    python local_check.py --solution solution.py --data smoke.json.gz
    python local_check.py --solution solution.py --data training.json.gz
    python local_check.py --solution solution.py --data practice.json.gz
    python local_check.py --solution solution.py --robustness
"""

from __future__ import annotations

import argparse
import gzip
import importlib.util
import json
import math
import os
from pathlib import Path
import sys
import time
from typing import Any, Callable, Dict, List

SCALE_MSE = 129614.14440376188


def load_solution_module(solution_path: str):
    """Dynamically loads the solution module from given path."""
    if not os.path.exists(solution_path):
        raise FileNotFoundError(f"Solution file not found: {solution_path}")
    spec = importlib.util.spec_from_file_location("student_solution", solution_path)
    if spec is None or spec.loader is None:
        raise ImportError(f"Could not load specification for {solution_path}")
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    if not hasattr(module, "decide"):
        raise AttributeError(f"Module {solution_path} does not export a decide() function")
    return module


def load_dataset(data_path: str) -> List[Dict[str, Any]]:
    """Loads cases from a gzip or json file."""
    path = Path(data_path)
    if not path.exists():
        # Check in competition_twist/
        alt_path = Path("competition_twist") / data_path
        if alt_path.exists():
            path = alt_path
        else:
            raise FileNotFoundError(f"Dataset not found: {data_path}")

    raw_bytes = path.read_bytes()
    if str(path).endswith(".gz") or raw_bytes[:2] == b"\x1f\x8b":
        return json.loads(gzip.decompress(raw_bytes))
    return json.loads(raw_bytes.decode("utf-8"))


def evaluate(cases: List[Dict[str, Any]], solution_module: Any, scales: Any = None) -> Dict[str, float]:
    """Evaluates cases against solution module, enforcing strict competition invariants."""
    results = []

    for case in cases:
        obs = case["observation"]
        response = solution_module.decide(obs, None)
        action = response.get("action", response)

        predictions = action["predictions"]
        ids = obs["customers"]
        selected = action["selected"]

        # Invariant 1: Predict every eligible customer exactly once
        if set(predictions.keys()) != set(ids):
            raise ValueError("Predictions dictionary must contain every eligible customer exactly once")

        # Invariant 2: Selection length must equal budget, unique, subset of eligible
        budget = int(obs["budget"])
        if len(selected) != budget:
            raise ValueError(f"Selection length ({len(selected)}) does not equal budget ({budget})")
        if len(set(selected)) != len(selected):
            raise ValueError("Selection contains duplicate customer IDs")
        if not set(selected) <= set(ids):
            raise ValueError("Selection contains customers outside eligible roster")

        # Invariant 3: Predictions fields and bounds
        for cid, pred in predictions.items():
            if set(pred.keys()) != {"probability", "value"}:
                raise ValueError(f"Invalid prediction keys for customer {cid}: {list(pred.keys())}")
            for field, maximum in [("probability", 1.0), ("value", 2000.0)]:
                x = pred[field]
                if isinstance(x, bool) or not isinstance(x, (int, float)) or not (0.0 <= x <= maximum) or not math.isfinite(x):
                    raise ValueError(f"Customer {cid} has invalid {field}: {x}")

        n = len(ids)
        targets = case["targets"]

        brier = sum((predictions[k]["probability"] - targets[k][0]) ** 2 for k in ids) / n
        mse = sum((predictions[k]["value"] - targets[k][1]) ** 2 for k in ids) / n
        mae = sum(abs(predictions[k]["value"] - targets[k][1]) for k in ids) / n

        oracle = sum(sorted((t[1] for t in targets.values()), reverse=True)[:budget])
        actual = sum(targets[k][1] for k in selected)
        capture = actual / oracle if oracle > 0 else 1.0

        # Initial Scoring
        score_init = 40.0 * (1.0 - brier) + 30.0 * (1.0 - mse / 4000000.0) + 30.0 * capture

        # Post-Twist Scoring
        score_post = 40.0 * (1.0 - brier) + 30.0 * math.exp(-mse / SCALE_MSE) + 30.0 * min(1.0, capture)

        results.append({
            "n": n,
            "score": score_init,
            "post_twist_score": score_post,
            "brier": brier,
            "value_mse": mse,
            "value_mae": mae,
            "capture": capture,
        })

    total_n = sum(r["n"] for r in results)
    summary = {
        "score": float(sum(r["score"] * r["n"] for r in results) / total_n),
        "post_twist_score": float(sum(r["post_twist_score"] * r["n"] for r in results) / total_n),
        "brier": float(sum(r["brier"] * r["n"] for r in results) / total_n),
        "value_mse": float(sum(r["value_mse"] * r["n"] for r in results) / total_n),
        "value_rmse": float(math.sqrt(sum(r["value_mse"] * r["n"] for r in results) / total_n)),
        "value_mae": float(sum(r["value_mae"] * r["n"] for r in results) / total_n),
        "capture": float(sum(r["capture"] * r["n"] for r in results) / total_n),
    }
    return summary


def run_robustness_tests(solution_module: Any) -> None:
    """Executes 9 adversarial robustness tests against edge cases."""
    print("\n" + "=" * 65)
    print("TASK 4: ADVERSARIAL ROBUSTNESS & EDGE-CASE STRESS SUITE")
    print("=" * 65)

    base_time = "2026-03-01T10:00:00"
    tests_passed = 0

    # 1. Empty transaction histories
    print("  [Test 1/9] Empty transaction history (rows=[]) ...", end=" ")
    res = solution_module.decide({"customers": ["CUST-NONE-1", "CUST-NONE-2"], "budget": 1, "snapshot": base_time, "transactions": {"rows": []}}, None)
    act = res.get("action", res)
    assert len(act["selected"]) == 1
    assert "CUST-NONE-1" in act["predictions"]
    print("PASSED")
    tests_passed += 1

    # 2. Null and NaN fields
    print("  [Test 2/9] Missing / null customer lines ...", end=" ")
    res = solution_module.decide({
        "customers": ["C1"], "budget": 1, "snapshot": base_time,
        "transactions": {"rows": [["1001", "A", "Item", None, base_time, None, None, "UK", "1"]]}
    }, None)
    act = res.get("action", res)
    assert "C1" in act["predictions"]
    print("PASSED")
    tests_passed += 1

    # 3. Pure returns (negative quantities)
    print("  [Test 3/9] Pure returns and cancellations (C-invoices) ...", end=" ")
    res = solution_module.decide({
        "customers": ["C1"], "budget": 1, "snapshot": base_time,
        "transactions": {"rows": [["C536", "A", "Return", -5, base_time, 10.0, "C1", "UK", "1"]]}
    }, None)
    act = res.get("action", res)
    assert act["predictions"]["C1"]["value"] >= 0.0
    print("PASSED")
    tests_passed += 1

    # 4. Multi-item distinct lines sharing invoice
    print("  [Test 4/9] Multi-product single invoice ...", end=" ")
    res = solution_module.decide({
        "customers": ["C1"], "budget": 1, "snapshot": base_time,
        "transactions": {"rows": [
            ["1001", "PROD-A", "Item A", 2, base_time, 10.0, "C1", "UK", "1"],
            ["1001", "PROD-B", "Item B", 1, base_time, 25.0, "C1", "UK", "2"],
        ]}
    }, None)
    act = res.get("action", res)
    assert "C1" in act["predictions"]
    print("PASSED")
    tests_passed += 1

    # 5. Extreme spend (£100,000 ceiling test)
    print("  [Test 5/9] Extreme outlier spend (£100k cap audit) ...", end=" ")
    res = solution_module.decide({
        "customers": ["C_WHALE"], "budget": 1, "snapshot": base_time,
        "transactions": {"rows": [["1001", "A", "Bulk", 1000, base_time, 150.0, "C_WHALE", "UK", "1"]]}
    }, None)
    act = res.get("action", res)
    assert act["predictions"]["C_WHALE"]["value"] <= 2000.0, "Value must not exceed £2,000 cap"
    print("PASSED")
    tests_passed += 1

    # 6. Budget constraint enforcement
    print("  [Test 6/9] Strict budget constraint (budget=2 of 10) ...", end=" ")
    c10 = [f"CUST-{i}" for i in range(10)]
    res = solution_module.decide({"customers": c10, "budget": 2, "snapshot": base_time, "transactions": {"rows": []}}, None)
    act = res.get("action", res)
    assert len(act["selected"]) == 2
    assert len(set(act["selected"])) == 2
    print("PASSED")
    tests_passed += 1

    # 7. Non-negative projection
    print("  [Test 7/9] Non-negative projection guarantee ...", end=" ")
    for p in act["predictions"].values():
        assert p["value"] >= 0.0
        assert 0.0 <= p["probability"] <= 1.0
    print("PASSED")
    tests_passed += 1

    # 8. Deterministic tie-breaking
    print("  [Test 8/9] Deterministic selection order ...", end=" ")
    res1 = solution_module.decide({"customers": c10, "budget": 3, "snapshot": base_time, "transactions": {"rows": []}}, None)
    res2 = solution_module.decide({"customers": c10, "budget": 3, "snapshot": base_time, "transactions": {"rows": []}}, None)
    assert res1.get("action", res1)["selected"] == res2.get("action", res2)["selected"]
    print("PASSED")
    tests_passed += 1

    # 9. Migrated feed handling (staged-operations-v1)
    print("  [Test 9/9] Migrated raw_feed.events resolution ...", end=" ")
    migrated_obs = {
        "customers": ["12967"], "budget": 1, "snapshot": "2011-06-01T00:00:00",
        "transactions": {"columns": [], "rows": []},
        "raw_feed": {
            "columns": ["source", "record_id", "revision", "delivery_id", "payload"],
            "sources": {"store_ledger": {"quantity_units_per_item": 1, "price_units_per_gbp": 100, "clock_offset_minutes": 60}},
            "customer_sources": {"12967": "store_ledger"},
            "events": [
                ["store_ledger", "r0", 1, 0, ["536851", "20682", "UMBRELLA", 24.0, "2010-12-03T10:49:00", 650.0, "12967", "UK", "1"]],
                ["store_ledger", "r0", 2, 1, ["536851", "20682", "UMBRELLA", 24.0, "2010-12-03T10:49:00", 325.0, "12967", "UK", "1"]],
                ["store_ledger", "r0", 2, 2, ["536851", "20682", "UMBRELLA", 24.0, "2010-12-03T10:49:00", 325.0, "12967", "UK", "1"]],
            ]
        }
    }
    res_mig = solution_module.decide(migrated_obs, None)
    act_mig = res_mig.get("action", res_mig)
    assert "12967" in act_mig["predictions"]
    print("PASSED")
    tests_passed += 1

    print("-" * 65)
    print(f"[+] All {tests_passed}/9 adversarial robustness tests PASSED successfully!")
    print("=" * 65)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--solution", default="solution.py", help="Path to solution file")
    parser.add_argument("--data", default="practice.json.gz", help="Path to evaluation gzip/json")
    parser.add_argument("--scoring", default="scoring.json", help="Path to scoring config")
    parser.add_argument("--robustness", action="store_true", help="Run adversarial tests")
    args = parser.parse_args()

    module = load_solution_module(args.solution)

    if args.robustness or not args.data:
        run_robustness_tests(module)
        return

    cases = load_dataset(args.data)
    results = evaluate(cases, module)

    # Print the clean JSON expected by the official competition test harness
    print(json.dumps(results, indent=2))


if __name__ == "__main__":
    main()
