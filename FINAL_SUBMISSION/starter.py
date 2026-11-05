"""starter.py - Official Entry Point and Runner Interface.

Exposes the decide(observation, state) function expected by the competition evaluator.
"""

from __future__ import annotations

from typing import Any, Dict, Optional
import solution


def decide(observation: Any, state: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
    """Official evaluator entry point:
    Accepts observation and returns:
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
    return solution.decide(observation, state)


if __name__ == "__main__":
    print("starter.py self-check:")
    test_obs = {
        "customers": ["CUST-1", "CUST-2"],
        "budget": 1,
        "snapshot": "2026-06-01T00:00:00",
        "transactions": {
            "columns": ["InvoiceNo", "StockCode", "Description", "Quantity", "InvoiceDate", "UnitPrice", "CustomerID", "Country", "source_row"],
            "rows": [
                ["536365", "85123A", "WHITE HEART", 6, "2026-01-01T08:26:00", 2.55, "CUST-1", "United Kingdom", "1"],
                ["536366", "22633", "HAND WARMER", 2, "2026-01-02T10:15:00", 1.85, "CUST-2", "United Kingdom", "2"],
            ]
        }
    }
    result = decide(test_obs)
    print("Returned Keys:", list(result.keys()))
    print("Action Keys:", list(result["action"].keys()))
    print("Selected Customers:", result["action"]["selected"])
    print("Predictions Sample:", list(result["action"]["predictions"].items())[:2])
