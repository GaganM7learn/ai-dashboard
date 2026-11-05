"""test_feed_processor.py - Comprehensive Unit & Post-Twist Processor Tests.

Verifies:
1. Actual operational excerpts (operating-records.json).
2. Synthetic edge cases (Section 4):
   - Multiple revisions in random order
   - Repeated deliveries of same revision
   - Conflicting revisions
   - Duplicate source rows
   - Different products sharing an invoice
   - Different source unit factors
   - Different clock offsets
   - Interior missing coverage intervals
   - Different customer source assignments
   - Empty customer history
   - Missing customer identifiers
   - Invalid invoices
   - Returns
   - Cancellations
"""

from __future__ import annotations

from datetime import datetime, timedelta
import json
import os
import unittest

import numpy as np

from features import (
    unpack_migrated_feed,
    extract_coverage_metadata,
    matrix,
    round_half_up,
)
import solution


class TestOperatingRecords(unittest.TestCase):
    """Tests the feed processor on actual unlabelled operational excerpts."""

    def setUp(self):
        self.op_records_path = "operating-records.json"
        if not os.path.exists(self.op_records_path):
            self.op_records_path = os.path.join("competition_twist", "operating-records.json")
        with open(self.op_records_path, "r", encoding="utf-8") as f:
            self.records = json.load(f)

    def test_operational_excerpts_unpacking(self):
        """Validates that operating-records.json is cleanly processed without error."""
        self.assertEqual(len(self.records), 2, "Expected 2 operational excerpt records")

        # Excerpt 1: Customer 12967 on store_ledger
        ex1 = self.records[0]["observation"]
        rows1 = unpack_migrated_feed(ex1)
        self.assertEqual(len(rows1), 5, "Excerpt 1 must resolve to 5 unique logical records")

        # Verify unit scaling: 325 pence -> £3.25
        umbrella_row = [r for r in rows1 if r[1] == "20682"][0]
        self.assertEqual(umbrella_row[5], 3.25, "store_ledger price must be divided by 100")
        self.assertEqual(umbrella_row[3], 24.0, "store_ledger quantity factor is 1")
        # Verify clock offset: 10:49:00 minus 60 min -> 09:49:00
        self.assertTrue("09:49:00" in umbrella_row[4], "store_ledger clock offset (+60 min) must be subtracted")

        # Excerpt 2: Customer 13370 on partner_ledger
        ex2 = self.records[1]["observation"]
        rows2 = unpack_migrated_feed(ex2)
        self.assertEqual(len(rows2), 5, "Excerpt 2 must resolve to 5 unique logical records")

        # Verify unit scaling: 12000 qty -> 12.0
        hand_warmer = [r for r in rows2 if r[1] == "22632"][0]
        self.assertEqual(hand_warmer[3], 12.0, "partner_ledger quantity must be divided by 1000")
        self.assertEqual(hand_warmer[5], 2.10, "partner_ledger price factor is 1")
        # Verify clock offset: 05:26:00 minus (-300 min) -> 10:26:00
        self.assertTrue("10:26:00" in hand_warmer[4], "partner_ledger clock offset (-300 min) must be subtracted")

    def test_operational_excerpts_decide(self):
        """Validates that solution.decide() runs cleanly on operational excerpts."""
        for rec in self.records:
            obs = rec["observation"]
            obs["budget"] = 1
            res = solution.decide(obs, {})
            act = res.get("action", res)
            self.assertIn("predictions", act)
            self.assertIn("selected", act)
            self.assertEqual(len(act["selected"]), 1)
            cid = obs["customers"][0]
            self.assertIn(cid, act["predictions"])
            p = act["predictions"][cid]
            self.assertTrue(0.0 <= p["probability"] <= 1.0)
            self.assertTrue(0.0 <= p["value"] <= 2000.0)


class TestSyntheticFeedProcessor(unittest.TestCase):
    """Unit tests for all 14 synthetic edge cases specified in Prompt 3 Section 4."""

    def test_revisions_in_random_order(self):
        """1. Event with highest revision replaces prior ones, regardless of order."""
        obs = {
            "customers": ["C1"],
            "snapshot": "2026-06-01T00:00:00",
            "raw_feed": {
                "columns": ["source", "record_id", "revision", "delivery_id", "payload"],
                "sources": {"ledger_a": {"quantity_units_per_item": 1, "price_units_per_gbp": 1, "clock_offset_minutes": 0}},
                "customer_sources": {"C1": "ledger_a"},
                "events": [
                    ["ledger_a", "rec_1", 3, 10, ["INV1", "SKU1", "Item", 10.0, "2026-05-01T12:00:00", 50.0, "C1", "UK", "1"]],
                    ["ledger_a", "rec_1", 1, 11, ["INV1", "SKU1", "Item", 1.0, "2026-05-01T12:00:00", 5.0, "C1", "UK", "1"]],
                    ["ledger_a", "rec_1", 2, 12, ["INV1", "SKU1", "Item", 5.0, "2026-05-01T12:00:00", 25.0, "C1", "UK", "1"]],
                ]
            }
        }
        rows = unpack_migrated_feed(obs)
        self.assertEqual(len(rows), 1)
        self.assertEqual(rows[0][3], 10.0, "Must choose revision 3 (qty 10.0)")
        self.assertEqual(rows[0][5], 50.0, "Must choose revision 3 (price 50.0)")

    def test_repeated_deliveries(self):
        """2. Retries sharing the highest revision must be deduplicated."""
        obs = {
            "customers": ["C1"],
            "snapshot": "2026-06-01T00:00:00",
            "raw_feed": {
                "columns": ["source", "record_id", "revision", "delivery_id", "payload"],
                "sources": {"ledger_a": {"quantity_units_per_item": 1, "price_units_per_gbp": 1, "clock_offset_minutes": 0}},
                "customer_sources": {"C1": "ledger_a"},
                "events": [
                    ["ledger_a", "rec_1", 2, 1, ["INV1", "SKU1", "Item", 2.0, "2026-05-01T12:00:00", 10.0, "C1", "UK", "1"]],
                    ["ledger_a", "rec_1", 2, 2, ["INV1", "SKU1", "Item", 2.0, "2026-05-01T12:00:00", 10.0, "C1", "UK", "1"]],
                    ["ledger_a", "rec_1", 2, 3, ["INV1", "SKU1", "Item", 2.0, "2026-05-01T12:00:00", 10.0, "C1", "UK", "1"]],
                ]
            }
        }
        rows = unpack_migrated_feed(obs)
        self.assertEqual(len(rows), 1, "Retries of the same revision must not duplicate rows")

    def test_conflicting_revisions(self):
        """3. Conflicting revisions across multiple record IDs resolve independently."""
        obs = {
            "customers": ["C1"],
            "snapshot": "2026-06-01T00:00:00",
            "raw_feed": {
                "columns": ["source", "record_id", "revision", "delivery_id", "payload"],
                "sources": {"ledger_a": {"quantity_units_per_item": 1, "price_units_per_gbp": 1, "clock_offset_minutes": 0}},
                "customer_sources": {"C1": "ledger_a"},
                "events": [
                    ["ledger_a", "rec_1", 1, 1, ["INV1", "SKU1", "Item A", 2.0, "2026-05-01T12:00:00", 10.0, "C1", "UK", "1"]],
                    ["ledger_a", "rec_1", 4, 2, ["INV1", "SKU1", "Item A", 5.0, "2026-05-01T12:00:00", 10.0, "C1", "UK", "1"]],
                    ["ledger_a", "rec_2", 2, 3, ["INV1", "SKU2", "Item B", 1.0, "2026-05-01T12:00:00", 20.0, "C1", "UK", "2"]],
                    ["ledger_a", "rec_2", 1, 4, ["INV1", "SKU2", "Item B", 9.0, "2026-05-01T12:00:00", 20.0, "C1", "UK", "2"]],
                ]
            }
        }
        rows = unpack_migrated_feed(obs)
        self.assertEqual(len(rows), 2)
        r1 = [r for r in rows if r[1] == "SKU1"][0]
        r2 = [r for r in rows if r[1] == "SKU2"][0]
        self.assertEqual(r1[3], 5.0, "rec_1 should take revision 4 (qty 5.0)")
        self.assertEqual(r2[3], 1.0, "rec_2 should take revision 2 (qty 1.0)")

    def test_duplicate_source_rows(self):
        """4. Different record_ids having identical 8 source fields must count once."""
        obs = {
            "customers": ["C1"],
            "snapshot": "2026-06-01T00:00:00",
            "raw_feed": {
                "columns": ["source", "record_id", "revision", "delivery_id", "payload"],
                "sources": {"ledger_a": {"quantity_units_per_item": 1, "price_units_per_gbp": 1, "clock_offset_minutes": 0}},
                "customer_sources": {"C1": "ledger_a"},
                "events": [
                    ["ledger_a", "rec_1", 1, 0, ["INV1", "SKU1", "Item", 2.0, "2026-05-01T12:00:00", 10.0, "C1", "UK", "100"]],
                    ["ledger_a", "rec_2", 1, 1, ["INV1", "SKU1", "Item", 2.0, "2026-05-01T12:00:00", 10.0, "C1", "UK", "200"]],
                ]
            }
        }
        rows = unpack_migrated_feed(obs)
        self.assertEqual(len(rows), 1, "Exact 8-field duplicate source rows must be counted once")

    def test_different_products_sharing_invoice(self):
        """5. Distinct products sharing an invoice number must remain distinct line items."""
        obs = {
            "customers": ["C1"],
            "snapshot": "2026-06-01T00:00:00",
            "raw_feed": {
                "columns": ["source", "record_id", "revision", "delivery_id", "payload"],
                "sources": {"ledger_a": {"quantity_units_per_item": 1, "price_units_per_gbp": 1, "clock_offset_minutes": 0}},
                "customer_sources": {"C1": "ledger_a"},
                "events": [
                    ["ledger_a", "rec_1", 1, 0, ["INV1", "SKU_A", "Product A", 1.0, "2026-05-01T12:00:00", 10.0, "C1", "UK", "1"]],
                    ["ledger_a", "rec_2", 1, 1, ["INV1", "SKU_B", "Product B", 3.0, "2026-05-01T12:00:00", 15.0, "C1", "UK", "2"]],
                ]
            }
        }
        rows = unpack_migrated_feed(obs)
        self.assertEqual(len(rows), 2, "Distinct items sharing an invoice must NOT be removed")

    def test_different_source_unit_factors(self):
        """6. Source unit factors scale transported quantities and prices correctly."""
        obs = {
            "customers": ["C1", "C2"],
            "snapshot": "2026-06-01T00:00:00",
            "raw_feed": {
                "columns": ["source", "record_id", "revision", "delivery_id", "payload"],
                "sources": {
                    "source_boxes": {"quantity_units_per_item": 12, "price_units_per_gbp": 1, "clock_offset_minutes": 0},
                    "source_pence": {"quantity_units_per_item": 1, "price_units_per_gbp": 100, "clock_offset_minutes": 0},
                },
                "customer_sources": {"C1": "source_boxes", "C2": "source_pence"},
                "events": [
                    ["source_boxes", "r1", 1, 0, ["INV1", "SKU1", "Item", 24.0, "2026-05-01T12:00:00", 10.0, "C1", "UK", "1"]],
                    ["source_pence", "r2", 1, 1, ["INV2", "SKU2", "Item", 5.0, "2026-05-01T12:00:00", 500.0, "C2", "UK", "2"]],
                ]
            }
        }
        rows = unpack_migrated_feed(obs)
        r_box = [r for r in rows if r[6] == "C1"][0]
        r_pen = [r for r in rows if r[6] == "C2"][0]
        self.assertEqual(r_box[3], 2.0, "24 raw quantity / 12 = 2.0 items")
        self.assertEqual(r_pen[5], 5.0, "500 raw pence / 100 = 5.0 GBP")

    def test_different_clock_offsets(self):
        """7. Clock offsets must be subtracted to restore retail business time."""
        obs = {
            "customers": ["C1", "C2"],
            "snapshot": "2026-06-01T00:00:00",
            "raw_feed": {
                "columns": ["source", "record_id", "revision", "delivery_id", "payload"],
                "sources": {
                    "early_clock": {"quantity_units_per_item": 1, "price_units_per_gbp": 1, "clock_offset_minutes": 120},
                    "late_clock": {"quantity_units_per_item": 1, "price_units_per_gbp": 1, "clock_offset_minutes": -60},
                },
                "customer_sources": {"C1": "early_clock", "C2": "late_clock"},
                "events": [
                    ["early_clock", "r1", 1, 0, ["INV1", "SKU1", "Item", 1.0, "2026-05-01T14:00:00", 10.0, "C1", "UK", "1"]],
                    ["late_clock", "r2", 1, 1, ["INV2", "SKU2", "Item", 1.0, "2026-05-01T09:00:00", 10.0, "C2", "UK", "2"]],
                ]
            }
        }
        rows = unpack_migrated_feed(obs)
        r1 = [r for r in rows if r[6] == "C1"][0]
        r2 = [r for r in rows if r[6] == "C2"][0]
        self.assertTrue("12:00:00" in r1[4], "14:00:00 - 120 min = 12:00:00")
        self.assertTrue("10:00:00" in r2[4], "09:00:00 - (-60 min) = 10:00:00")

    def test_interior_coverage_gaps(self):
        """8. Interior gaps between complete intervals are detected."""
        obs = {
            "customers": ["C1"],
            "snapshot": "2026-06-01T00:00:00",
            "history_start": "2026-01-01T00:00:00",
            "availability": {
                "sources": {
                    "ledger_gap": {
                        "complete_intervals": [
                            {"start": "2026-01-01T00:00:00", "end": "2026-02-01T00:00:00"},
                            {"start": "2026-04-01T00:00:00", "end": "2026-05-30T00:00:00"},
                        ]
                    }
                }
            },
            "raw_feed": {
                "columns": ["source", "record_id", "revision", "delivery_id", "payload"],
                "sources": {"ledger_gap": {"quantity_units_per_item": 1, "price_units_per_gbp": 1, "clock_offset_minutes": 0}},
                "customer_sources": {"C1": "ledger_gap"},
                "events": []
            }
        }
        cov_info = extract_coverage_metadata(obs)
        self.assertEqual(cov_info["C1"]["has_interior_gap"], 1.0, "Gap from Feb 1 to Apr 1 must be flagged")

    def test_different_customer_source_assignments(self):
        """9. Customer routing correctly maps customers to distinct source ledgers."""
        obs = {
            "customers": ["C_STORE", "C_PARTNER"],
            "snapshot": "2026-06-01T00:00:00",
            "history_start": "2026-01-01T00:00:00",
            "availability": {
                "sources": {
                    "store": {"complete_intervals": [{"start": "2026-01-01T00:00:00", "end": "2026-05-30T00:00:00"}]},
                    "partner": {"complete_intervals": [{"start": "2026-01-01T00:00:00", "end": "2026-03-01T00:00:00"}]},
                }
            },
            "raw_feed": {
                "columns": ["source", "record_id", "revision", "delivery_id", "payload"],
                "sources": {"store": {}, "partner": {}},
                "customer_sources": {"C_STORE": "store", "C_PARTNER": "partner"},
                "events": []
            }
        }
        cov_info = extract_coverage_metadata(obs)
        self.assertAlmostEqual(cov_info["C_STORE"]["gap_to_snapshot"], 2.0, delta=0.5)
        self.assertAlmostEqual(cov_info["C_PARTNER"]["gap_to_snapshot"], 92.0, delta=0.5)

    def test_empty_customer_history(self):
        """10. Eligible customers with no transaction history produce bounded predictions."""
        obs = {
            "customers": ["C_NEW_1", "C_NEW_2"],
            "snapshot": "2026-06-01T00:00:00",
            "budget": 1,
            "raw_feed": {
                "columns": ["source", "record_id", "revision", "delivery_id", "payload"],
                "sources": {},
                "customer_sources": {},
                "events": []
            }
        }
        res = solution.decide(obs, None)
        act = res.get("action", res)
        self.assertEqual(len(act["selected"]), 1)
        self.assertIn(act["selected"][0], ["C_NEW_1", "C_NEW_2"])
        for cid in ["C_NEW_1", "C_NEW_2"]:
            self.assertIn(cid, act["predictions"])
            self.assertTrue(0.0 <= act["predictions"][cid]["probability"] <= 1.0)
            self.assertTrue(0.0 <= act["predictions"][cid]["value"] <= 2000.0)

    def test_missing_customer_identifiers(self):
        """11. Lines with null CustomerID are excluded from customer attribution."""
        obs = {
            "customers": ["C1"],
            "snapshot": "2026-06-01T00:00:00",
            "raw_feed": {
                "columns": ["source", "record_id", "revision", "delivery_id", "payload"],
                "sources": {"ledger_a": {"quantity_units_per_item": 1, "price_units_per_gbp": 1, "clock_offset_minutes": 0}},
                "customer_sources": {"C1": "ledger_a"},
                "events": [
                    ["ledger_a", "r1", 1, 0, ["INV1", "SKU1", "Item", 10.0, "2026-05-01T12:00:00", 50.0, None, "UK", "1"]],
                ]
            }
        }
        feat = matrix(obs)
        self.assertEqual(feat[0, 1], 0.0, "Unattributed transactions must not count toward customer frequency")

    def test_invalid_invoices(self):
        """12. Null or invalid invoice lines do not count as qualifying purchases."""
        obs = {
            "customers": ["C1"],
            "snapshot": "2026-06-01T00:00:00",
            "raw_feed": {
                "columns": ["source", "record_id", "revision", "delivery_id", "payload"],
                "sources": {"ledger_a": {"quantity_units_per_item": 1, "price_units_per_gbp": 1, "clock_offset_minutes": 0}},
                "customer_sources": {"C1": "ledger_a"},
                "events": [
                    ["ledger_a", "r1", 1, 0, [None, "SKU1", "Item", 5.0, "2026-05-01T12:00:00", 10.0, "C1", "UK", "1"]],
                ]
            }
        }
        feat = matrix(obs)
        self.assertEqual(feat[0, 1], 0.0, "Lines with null invoices must not count as qualifying purchases")

    def test_returns(self):
        """13. Negative quantities are tagged as returns and excluded from positive spend."""
        obs = {
            "customers": ["C1"],
            "snapshot": "2026-06-01T00:00:00",
            "raw_feed": {
                "columns": ["source", "record_id", "revision", "delivery_id", "payload"],
                "sources": {"ledger_a": {"quantity_units_per_item": 1, "price_units_per_gbp": 1, "clock_offset_minutes": 0}},
                "customer_sources": {"C1": "ledger_a"},
                "events": [
                    ["ledger_a", "r1", 1, 0, ["536852", "20682", "Returned Item", -5.0, "2026-05-02T10:00:00", 10.0, "C1", "UK", "1"]],
                ]
            }
        }
        feat = matrix(obs)
        self.assertEqual(feat[0, 1], 0.0, "Negative quantity must not count as qualifying invoice")
        self.assertGreater(feat[0, 5], 0.0, "Return ratio must capture returned spend")

    def test_cancellations(self):
        """14. Invoices starting with 'C' are cancellations and excluded from positive spend."""
        obs = {
            "customers": ["C1"],
            "snapshot": "2026-06-01T00:00:00",
            "raw_feed": {
                "columns": ["source", "record_id", "revision", "delivery_id", "payload"],
                "sources": {"ledger_a": {"quantity_units_per_item": 1, "price_units_per_gbp": 1, "clock_offset_minutes": 0}},
                "customer_sources": {"C1": "ledger_a"},
                "events": [
                    ["ledger_a", "r1", 1, 0, ["C536851", "20682", "Canceled Item", 10.0, "2026-05-01T10:00:00", 10.0, "C1", "UK", "1"]],
                ]
            }
        }
        feat = matrix(obs)
        self.assertEqual(feat[0, 1], 0.0, "C-invoices must not count as qualifying invoice")
        self.assertGreater(feat[0, 5], 0.0, "Return ratio must capture cancellation spend")


if __name__ == "__main__":
    unittest.main()
