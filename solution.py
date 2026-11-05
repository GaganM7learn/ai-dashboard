"""solution.py - Production Customer Purchase Forecasting & Selection Engine.

Implements the official decision interface:
- Supports original observations (transactions.columns, transactions.rows).
- Supports migrated multi-source event feeds (raw_feed.events, raw_feed.sources, availability).
- Automatic input-format detection (does not assume transactions means original format).
- Predicts purchase probability and unconditional expected capped purchase value in GBP.
- Enforces official value rules: non-negative, £2,000 cap, penny half-up rounding.
- Ranks eligible customers by predicted expected purchase value (official selection objective).
- Selects exactly observation['budget'] customers with deterministic tie-breaking.
- Self-contained, offline execution with zero external network or frontend dependencies.
"""

from __future__ import annotations

import json
import math
import os
from pathlib import Path
from typing import Any, Dict, List, Optional, Union

import numpy as np

from features import predict, round_half_up

_MODEL: Optional[Dict[str, Any]] = None


class DeciderResponse(dict):
    """Dictionary response adhering strictly to the official JSON schema:
    {'action': {'predictions': {...}, 'selected': [...]}, 'state': {...}}
    
    Also provides backward-compatible root-level access for legacy dashboard endpoints.
    """
    def __getitem__(self, key: str) -> Any:
        if key in ("predictions", "selected") and "action" in self and key in self["action"]:
            return self["action"][key]
        return super().__getitem__(key)

    def get(self, key: str, default: Any = None) -> Any:
        if key in ("predictions", "selected") and "action" in self and key in self["action"]:
            return self["action"][key]
        return super().get(key, default)


def get_model(model_path: Optional[str] = None) -> Dict[str, Any]:
    """Loads and caches the production model weights."""
    global _MODEL
    if _MODEL is not None:
        return _MODEL

    search_paths = [
        model_path,
        "starter_model.json",
        os.path.join(os.path.dirname(__file__), "starter_model.json"),
        os.path.join(os.path.dirname(__file__), "competition_twist", "starter_model.json"),
    ]

    for p in search_paths:
        if p and os.path.exists(p):
            try:
                content = json.loads(Path(p).read_text(encoding="utf-8"))
                if "coefficients" in content and "mean" in content and "scale" in content:
                    _MODEL = content
                    return _MODEL
            except Exception:
                continue

    # Fallback default initialized weights if file not present
    default_model = {
        "coefficients": [
            [0.283, 0.077],
            [-0.040, 0.057],
            [0.154, 0.147],
            [0.010, 0.020],
            [-0.001, 0.013],
            [0.027, 0.030],
            [0.012, 0.002],
            [0.016, 0.043],
            [0.003, -0.062],
            [0.0, 0.0],
        ],
        "mean": [68.68, 1.08, 1.73, 5.52, 5.63, 0.042, 65.82, 109.15, 7.0],
        "scale": [50.38, 0.53, 2.72, 2.18, 0.79, 0.42, 33.71, 52.99, 1.0],
    }
    _MODEL = default_model
    return _MODEL


def decide(observation: Any, state: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
    """Official competition decision interface.
    
    Accepts:
    - observation: Dictionary containing customers, budget, snapshot, and either:
                   * raw_feed (migrated feed format)
                   * transactions (legacy rows format)
    - state: Optional evaluator state.
    
    Returns:
    {
        "action": {
            "predictions": {
                "CUSTOMER_ID": {
                    "probability": float,
                    "value": float
                }
            },
            "selected": [CUSTOMER_IDs]
        },
        "state": state
    }
    """
    model = get_model()
    state = state or {}

    # Handle flexible input structures from dashboard API or competition runners
    obs_dict: Dict[str, Any] = {}
    if isinstance(observation, dict):
        obs_dict = observation
    elif hasattr(observation, "__dict__"):
        obs_dict = observation.__dict__

    # Normalize customer list
    customers = obs_dict.get("customers") or obs_dict.get("eligible_customers") or obs_dict.get("eligible") or []
    obs_dict["customers"] = [str(c) for c in customers]

    # Normalize budget
    if "budget" not in obs_dict:
        n_cust = len(obs_dict["customers"])
        obs_dict["budget"] = max(1, n_cust // 5) if n_cust > 0 else 0

    # Ensure snapshot date exists
    if "snapshot" not in obs_dict:
        cutoff = obs_dict.get("cutoff_date") or obs_dict.get("as_of_date")
        if cutoff:
            obs_dict["snapshot"] = str(cutoff)[:19]
        else:
            obs_dict["snapshot"] = "2026-06-01T00:00:00"

    # Adapt legacy dictionary structure if passed from dashboard
    if "transactions" in obs_dict and isinstance(obs_dict["transactions"], list):
        # Convert list of dicts to 9-column rows if necessary
        first = obs_dict["transactions"][0] if obs_dict["transactions"] else None
        if isinstance(first, dict):
            converted_rows = []
            for t in obs_dict["transactions"]:
                converted_rows.append([
                    t.get("invoice") or t.get("Invoice") or t.get("InvoiceNo"),
                    t.get("stock_code") or t.get("StockCode"),
                    t.get("description") or t.get("Description"),
                    t.get("quantity") or t.get("Quantity", 1),
                    t.get("invoice_date") or t.get("InvoiceDate"),
                    t.get("price") or t.get("Price") or t.get("UnitPrice", 0.0),
                    t.get("customer_id") or t.get("CustomerID"),
                    t.get("country") or t.get("Country", "United Kingdom"),
                    str(t.get("source_row", "0")),
                ])
            obs_dict["transactions"] = {
                "columns": ["InvoiceNo", "StockCode", "Description", "Quantity", "InvoiceDate", "UnitPrice", "CustomerID", "Country", "source_row"],
                "rows": converted_rows,
            }

    # Generate predictions via feature extraction and linear/calibrated scoring
    action = predict(obs_dict, model)

    return DeciderResponse({
        "action": action,
        "state": state,
    })


if __name__ == "__main__":
    print("=" * 65)
    print("CUSTOMER INTELLIGENCE AI: ML SOLUTION ENGINE")
    print("=" * 65)
    sample_obs = {
        "customers": ["12967", "13370", "14000"],
        "budget": 1,
        "snapshot": "2011-06-01T00:00:00",
        "observed_until": "2011-05-30T00:00:00",
        "transactions": {"columns": [], "rows": []},
        "raw_feed": {
            "columns": ["source", "record_id", "revision", "delivery_id", "payload"],
            "sources": {
                "store_ledger": {"quantity_units_per_item": 1, "price_units_per_gbp": 100, "clock_offset_minutes": 60}
            },
            "customer_sources": {"12967": "store_ledger"},
            "events": [
                ["store_ledger", "r0", 1, 0, ["536851", "20682", "RED RETROSPOT UMBRELLA", 24.0, "2010-12-03T10:49:00", 325.0, "12967", "UK", "1"]],
                ["store_ledger", "r0", 2, 1, ["536851", "20682", "RED RETROSPOT UMBRELLA", 24.0, "2010-12-03T10:49:00", 325.0, "12967", "UK", "1"]],
            ]
        }
    }
    res = decide(sample_obs)
    print("Self-test action keys:", list(res["action"].keys()))
    print("Predictions count:", len(res["action"]["predictions"]))
    print("Selected count:", len(res["action"]["selected"]))
    print("Selected:", res["action"]["selected"])
    print("Sample prediction 12967:", res["action"]["predictions"]["12967"])
    print("=" * 65)
