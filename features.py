"""features.py - Feature Engineering, Feed Processing & Data Normalization Pipeline.

Supports BOTH:
1. Original observations:
   - transactions.columns
   - transactions.rows
2. Migrated multi-source operations feeds (staged-operations-v1):
   - raw_feed.columns
   - raw_feed.events
   - raw_feed.sources
   - raw_feed.customer_sources
   - availability.sources (complete_intervals)
"""

from __future__ import annotations

from datetime import datetime, timedelta
from decimal import Decimal, ROUND_HALF_UP
import math
from typing import Any, Dict, List, Optional, Set, Tuple, Union
import warnings

warnings.filterwarnings("ignore")

import numpy as np
import pandas as pd


# -----------------------------------------------------------------------------
# Official Feature Registry & Hyperparameters
# -----------------------------------------------------------------------------
FEATURE_NAMES = (
    "recency",
    "invoice_frequency",
    "recent_value",
    "older_value",
    "basket_value",
    "return_ratio",
    "cadence",
    "tenure",
    "observed_gap",
)
RIDGE_PENALTY = 5.0

COLUMN_ALIASES = {
    "invoice": ["Invoice", "InvoiceNo", "invoice_no", "invoice", "InvoiceID", "OrderNumber"],
    "stock_code": ["StockCode", "stock_code", "product_id", "sku", "ItemCode", "ProductID"],
    "description": ["Description", "description", "item_description", "ProductName"],
    "quantity": ["Quantity", "quantity", "qty", "Qty", "ItemCount"],
    "invoice_date": ["InvoiceDate", "invoice_date", "timestamp", "date", "DateTime", "CreatedAt"],
    "price": ["Price", "UnitPrice", "unit_price", "price", "ItemPrice"],
    "customer_id": ["CustomerID", "Customer ID", "customer_id", "customer", "UserID"],
    "country": ["Country", "country", "Region"],
}


def round_half_up(value: float, decimals: int = 2) -> float:
    """Rounds a float to specified decimals using half-up rounding (bankers rounding avoided)."""
    if math.isnan(value) or math.isinf(value):
        return 0.0
    d = Decimal(str(value))
    target_format = Decimal("10") ** -decimals
    return float(d.quantize(target_format, rounding=ROUND_HALF_UP))


# -----------------------------------------------------------------------------
# 1. Migrated Feed Processor (staged-operations-v1)
# -----------------------------------------------------------------------------
def unpack_migrated_feed(obs: Dict[str, Any]) -> List[List[Any]]:
    """Processes raw multi-source event feeds adhering strictly to the contract:
    - Groups events by (source, record_id).
    - Selects the highest revision (complete replacement).
    - Ignores repeated delivery attempts of the same revision (retries).
    - Applies source-specific quantity units and price units.
    - Corrects transported clock offsets to restore retail business time.
    - Deduplicates exact original transaction rows using 8 fields (ignoring source_row).
    - Preserves distinct items sharing an invoice number.
    - Preserves null values without guessing.
    - Returns rows matching original schema:
      [InvoiceNo, StockCode, Description, Quantity, InvoiceDate, UnitPrice, CustomerID, Country, source_row]
    """
    raw_feed = obs.get("raw_feed")
    if not isinstance(raw_feed, dict) or "events" not in raw_feed:
        # Fall back to legacy rows if present
        tx = obs.get("transactions")
        if isinstance(tx, dict) and "rows" in tx:
            return tx["rows"]
        return []

    events = raw_feed.get("events", [])
    if not events:
        return []

    cols = raw_feed.get("columns", ["source", "record_id", "revision", "delivery_id", "payload"])
    sources_meta = raw_feed.get("sources", {})

    s_idx = cols.index("source") if "source" in cols else 0
    r_idx = cols.index("record_id") if "record_id" in cols else 1
    rev_idx = cols.index("revision") if "revision" in cols else 2
    p_idx = cols.index("payload") if "payload" in cols else 4

    # 1. Group by (source, record_id), keep highest revision.
    # Delivery order is NOT revision order. Ignore repeated delivery attempts of the same revision.
    groups: Dict[Tuple[str, str], Tuple[int, Any]] = {}
    for ev in events:
        src = ev[s_idx]
        rec_id = str(ev[r_idx])
        rev = ev[rev_idx]
        key = (src, rec_id)
        if key not in groups:
            groups[key] = (rev, ev)
        else:
            curr_rev, _ = groups[key]
            if rev > curr_rev:
                groups[key] = (rev, ev)

    # 2. Extract resolved payloads, convert units, apply clock corrections, and deduplicate
    seen_dedup: Set[Tuple[Any, ...]] = set()
    cleaned_rows: List[List[Any]] = []

    for (src, _), (_, ev) in groups.items():
        payload = ev[p_idx]
        if not payload or len(payload) < 8:
            continue

        inv = payload[0]
        stock = payload[1]
        desc = payload[2]
        raw_qty = payload[3]
        raw_date_str = payload[4]
        raw_price = payload[5]
        cust_id = payload[6]
        country = payload[7]
        src_row = payload[8] if len(payload) > 8 else "0"

        sm = sources_meta.get(src, {})
        qty_unit = sm.get("quantity_units_per_item", 1)
        price_unit = sm.get("price_units_per_gbp", 1)
        clock_offset = sm.get("clock_offset_minutes", 0)

        # Unit conversion (preserve nulls)
        qty = (float(raw_qty) / qty_unit) if raw_qty is not None else None
        price = (float(raw_price) / price_unit) if raw_price is not None else None

        # Clock offset correction: subtract offset to restore business clock
        if raw_date_str is not None:
            raw_dt = datetime.fromisoformat(str(raw_date_str))
            business_dt = raw_dt - timedelta(minutes=clock_offset)
            business_date_str = business_dt.isoformat()
        else:
            business_date_str = None

        # Exact duplicate handling on the first 8 original fields (ignoring source_row)
        dedup_key = (
            str(inv) if inv is not None else None,
            str(stock) if stock is not None else None,
            str(desc) if desc is not None else None,
            round(qty, 4) if qty is not None else None,
            business_date_str,
            round(price, 4) if price is not None else None,
            str(cust_id) if cust_id is not None else None,
            str(country) if country is not None else None,
        )
        if dedup_key in seen_dedup:
            continue
        seen_dedup.add(dedup_key)

        cleaned_rows.append([
            inv, stock, desc, qty, business_date_str, price,
            str(cust_id) if cust_id is not None else None,
            country, src_row
        ])

    return cleaned_rows


def extract_coverage_metadata(obs: Dict[str, Any]) -> Dict[str, Dict[str, float]]:
    """Extracts source-routing and coverage intervals metadata per customer.
    
    A missing historical period means UNKNOWN, not zero purchases.
    Returns mapping: {customer_id: {'gap_to_snapshot': float, 'coverage_ratio': float, 'has_interior_gap': float}}
    """
    raw_feed = obs.get("raw_feed", {})
    customer_sources = raw_feed.get("customer_sources", {})
    avail = obs.get("availability", {})
    sources_meta = avail.get("sources", {})

    snapshot_str = obs.get("snapshot")
    snapshot = datetime.fromisoformat(snapshot_str) if snapshot_str else datetime.utcnow()
    h_start_str = obs.get("history_start")
    history_start = datetime.fromisoformat(h_start_str) if h_start_str else snapshot - timedelta(days=180)
    total_window_sec = max(86400.0, (snapshot - history_start).total_seconds())

    # Precalculate coverage stats per source
    source_stats: Dict[str, Dict[str, float]] = {}
    for src, sm in sources_meta.items():
        intervals = sm.get("complete_intervals", [])
        if not intervals:
            source_stats[src] = {
                "gap_to_snapshot": 0.0,
                "coverage_ratio": 1.0,
                "has_interior_gap": 0.0,
            }
            continue

        covered_sec = 0.0
        latest_end: Optional[datetime] = None
        has_gap = 0.0

        # Sort intervals by start time
        parsed_intervals = []
        for it in intervals:
            st = max(history_start, datetime.fromisoformat(it["start"]))
            en = min(snapshot, datetime.fromisoformat(it["end"]))
            if en > st:
                parsed_intervals.append((st, en))

        parsed_intervals.sort(key=lambda x: x[0])

        for idx, (st, en) in enumerate(parsed_intervals):
            covered_sec += (en - st).total_seconds()
            if latest_end is None or en > latest_end:
                latest_end = en
            if idx > 0:
                prev_en = parsed_intervals[idx - 1][1]
                if (st - prev_en).total_seconds() > 3600.0:
                    has_gap = 1.0

        gap_to_snapshot = (snapshot - latest_end).total_seconds() / 86400.0 if latest_end else 0.0
        cov_ratio = min(1.0, covered_sec / total_window_sec)

        source_stats[src] = {
            "gap_to_snapshot": max(0.0, gap_to_snapshot),
            "coverage_ratio": cov_ratio,
            "has_interior_gap": has_gap,
        }

    # Map per customer
    cust_coverage: Dict[str, Dict[str, float]] = {}
    default_stats = {"gap_to_snapshot": 0.0, "coverage_ratio": 1.0, "has_interior_gap": 0.0}

    for cid in obs.get("customers", []):
        src = customer_sources.get(cid)
        if src and src in source_stats:
            cust_coverage[cid] = source_stats[src]
        elif source_stats:
            cust_coverage[cid] = next(iter(source_stats.values()))
        else:
            cust_coverage[cid] = default_stats

    return cust_coverage


# -----------------------------------------------------------------------------
# 2. Core Feature Matrix & Vector Computation
# -----------------------------------------------------------------------------
def matrix(obs: Dict[str, Any]) -> np.ndarray:
    """Computes leak-free, coverage-aware causal features for all eligible customers.
    
    Returns array of shape (len(customers), 9) matching the competition feature specification.
    """
    ids = [str(c) for c in obs["customers"]]
    if "prepared_features" in obs:
        features = obs["prepared_features"]
        if not isinstance(features, dict) or set(features) != set(ids):
            raise ValueError("Feature customer identity mismatch")
        result = np.asarray([features[c] for c in ids], dtype=float)
        if result.shape != (len(ids), 9) or not np.isfinite(result).all():
            raise ValueError("Expected nine finite causal features per customer")
        return result

    # 1. Ingest transactions from either migrated feed or original rows
    if "raw_feed" in obs and obs["raw_feed"].get("events"):
        rows = unpack_migrated_feed(obs)
    else:
        tx = obs.get("transactions", {})
        rows = tx.get("rows", []) if isinstance(tx, dict) else []

    snapshot = datetime.fromisoformat(obs["snapshot"])
    h_start = obs.get("history_start", "")
    obs_until = obs.get("observed_until", obs["snapshot"])

    # 2. Coverage metadata
    cust_cov = extract_coverage_metadata(obs)

    # 3. Group rows by customer ID
    grouped: Dict[str, List[List[Any]]] = {cid: [] for cid in ids}
    for r in rows:
        cid = str(r[6]) if r[6] is not None else ""
        if cid in grouped and h_start <= str(r[4]) < obs_until:
            grouped[cid].append(r)

    result = []
    for cid in ids:
        orders: Dict[str, float] = {}
        ages: Dict[str, float] = {}
        recent = 0.0
        older = 0.0
        returns = 0.0

        cov_info = cust_cov.get(cid, {"gap_to_snapshot": 0.0, "coverage_ratio": 1.0})
        gap_to_snap = cov_info["gap_to_snapshot"]

        for r in grouped[cid]:
            inv, _, _, quantity, date_str, price = r[:6]
            if quantity is None or price is None or date_str is None:
                continue

            amount = float(quantity) * float(price)

            # Historical returns / cancellations
            if float(quantity) < 0 or str(inv).upper().startswith("C"):
                returns += abs(amount)
                continue

            # Qualifying purchase rules: quantity > 0, price > 0, not return
            if float(quantity) <= 0 or float(price) <= 0 or inv is None:
                continue

            item_dt = datetime.fromisoformat(str(date_str))
            age = (snapshot - item_dt).total_seconds() / 86400.0

            # Coverage normalization: adjust age by gap_to_snapshot so unobserved gap is not penalized as churn
            adj_age = max(0.0, age - gap_to_snap)

            orders[str(inv)] = orders.get(str(inv), 0.0) + amount
            ages[str(inv)] = min(adj_age, ages.get(str(inv), 9999.0))

            if adj_age <= 30.0:
                recent += amount
            else:
                older += amount

        age_list = sorted(ages.values())
        gaps = [b - a for a, b in zip(age_list, age_list[1:])]
        obs_gap = (snapshot - datetime.fromisoformat(obs_until)).total_seconds() / 86400.0

        recency = min(age_list) if age_list else 180.0
        inv_freq = len(orders)
        basket_val = sum(orders.values()) / max(1, inv_freq)
        ret_ratio = returns / max(1.0, sum(orders.values()))
        cadence = sum(gaps) / len(gaps) if gaps else 90.0
        tenure = max(age_list) if age_list else 180.0

        values = [
            recency,
            float(inv_freq),
            recent,
            older,
            basket_val,
            ret_ratio,
            cadence,
            tenure,
            obs_gap,
        ]
        result.append(values)

    array = np.asarray(result, dtype=float)
    if array.shape != (len(ids), 9) or not np.isfinite(array).all():
        raise ValueError("Invalid causal features extracted")
    return array


def _vector(obs: Dict[str, Any]) -> np.ndarray:
    """Transforms raw features into model-ready log-normalized vectors."""
    array = matrix(obs).copy()
    for i in (1, 2, 3, 4):
        array[:, i] = np.log1p(np.maximum(0.0, array[:, i]))
    return np.clip(array, -1e6, 1e6)


def fit(cases: List[Dict[str, Any]], processor: Any = None) -> Dict[str, Any]:
    """Fits Ridge regression models on labeled training cases."""
    xs, ys = [], []
    for case in cases:
        obs = case["observation"]
        if processor is not None:
            obs = processor("aiml", obs)
        if obs["customers"] != case["observation"]["customers"]:
            raise ValueError("Processor changed eligible customers")
        xs.append(_vector(obs))
        ys.extend([[case["targets"][c][0], case["targets"][c][1] / 2000.0] for c in obs["customers"]])

    x = np.concatenate(xs)
    y = np.asarray(ys, dtype=float)

    mean = x.mean(axis=0)
    scale = x.std(axis=0)
    scale[scale < 1e-8] = 1.0

    x_std = np.column_stack([np.ones(len(x)), (x - mean) / scale])
    penalty = np.eye(10) * RIDGE_PENALTY
    penalty[0, 0] = 0.0

    coefficients = np.linalg.solve(x_std.T @ x_std + penalty, x_std.T @ y)

    return {
        "mean": mean.tolist(),
        "scale": scale.tolist(),
        "coefficients": coefficients.tolist(),
    }


def predict(obs: Dict[str, Any], model: Dict[str, Any]) -> Dict[str, Any]:
    """Generates predictions and ranks customers by expected capped purchase value."""
    mean = np.asarray(model["mean"])
    scale = np.asarray(model["scale"])
    coefs = np.asarray(model["coefficients"])

    x = (_vector(obs) - mean) / scale
    x_bias = np.column_stack([np.ones(len(x)), x])
    estimates = np.clip(x_bias @ coefs, 0.0, 1.0)

    # Value is unconditional expected capped purchase value in GBP [0, 2000]
    predictions: Dict[str, Dict[str, float]] = {}
    for c, p in zip(obs["customers"], estimates):
        prob = float(round_half_up(p[0], 4))
        val = float(round_half_up(p[1] * 2000.0, 2))
        predictions[str(c)] = {"probability": prob, "value": val}

    # Rank using predicted expected capped purchase value (do NOT multiply by probability again!)
    budget = int(obs.get("budget", max(1, len(obs["customers"]) // 5)))
    selected = sorted(
        predictions.keys(),
        key=lambda c: (-predictions[c]["value"], str(c))
    )[:budget]

    return {"predictions": predictions, "selected": selected}


# -----------------------------------------------------------------------------
# 3. Compatibility Utilities for Website & Batch Worksheets
# -----------------------------------------------------------------------------
def normalize_columns(df: pd.DataFrame) -> pd.DataFrame:
    """Standardizes heterogeneous transaction column names into canonical names."""
    col_map = {}
    lower_to_orig = {col.lower().replace(" ", "").replace("_", ""): col for col in df.columns}

    for canonical, aliases in COLUMN_ALIASES.items():
        found = None
        for alias in aliases:
            norm_alias = alias.lower().replace(" ", "").replace("_", "")
            if norm_alias in lower_to_orig:
                found = lower_to_orig[norm_alias]
                break
        if found:
            col_map[found] = canonical

    return df.rename(columns=col_map)


def clean_transactions(
    records: Union[pd.DataFrame, List[Dict[str, Any]]],
) -> pd.DataFrame:
    """Cleans raw transaction records without deleting legitimate separate line items."""
    if isinstance(records, list):
        df = pd.DataFrame(records)
    elif isinstance(records, pd.DataFrame):
        df = records.copy()
    else:
        df = pd.DataFrame(records)

    if df.empty:
        return pd.DataFrame(columns=[
            "invoice", "stock_code", "description", "quantity",
            "invoice_date", "price", "customer_id", "line_total",
            "is_return", "is_cancellation", "is_qualifying",
        ])

    df = normalize_columns(df)

    if "quantity" not in df.columns:
        df["quantity"] = 1
    if "price" not in df.columns:
        df["price"] = 0.0
    if "invoice" not in df.columns:
        df["invoice"] = df.index.astype(str)
    if "stock_code" not in df.columns:
        df["stock_code"] = "UNKNOWN"
    if "description" not in df.columns:
        df["description"] = "Unknown"
    if "customer_id" not in df.columns:
        df["customer_id"] = np.nan

    df["description"] = df["description"].fillna("Unknown").astype(str)
    df["stock_code"] = df["stock_code"].fillna("UNKNOWN").astype(str)
    df["quantity"] = pd.to_numeric(df["quantity"], errors="coerce").fillna(0).astype(int)
    df["price"] = pd.to_numeric(df["price"], errors="coerce").fillna(0.0).astype(float)
    df["invoice"] = df["invoice"].astype(str)

    if "invoice_date" in df.columns:
        df["invoice_date"] = pd.to_datetime(df["invoice_date"], errors="coerce")
    else:
        df["invoice_date"] = pd.Timestamp.utcnow().tz_localize(None)

    df["customer_id"] = df["customer_id"].apply(
        lambda x: str(int(x)) if pd.notnull(x) and isinstance(x, (int, float)) and not np.isnan(x)
        else (str(x).strip() if pd.notnull(x) and str(x).strip() != "" and str(x) != "nan" else np.nan)
    )

    df["line_total"] = df["quantity"] * df["price"]

    inv_str = df["invoice"].astype(str).str.upper()
    is_c_invoice = inv_str.str.startswith("C")
    is_neg_qty = df["quantity"] < 0
    is_neg_price = df["price"] < 0

    df["is_cancellation"] = is_c_invoice
    df["is_return"] = is_neg_qty | is_neg_price | is_c_invoice
    df["is_qualifying"] = (~df["is_return"]) & (df["quantity"] > 0) & (df["price"] > 0)

    # Drop pure identical duplicate rows (all columns identical)
    df = df.drop_duplicates(keep="first")

    return df


def extract_customer_features(
    df: pd.DataFrame,
    as_of_date: Optional[Union[pd.Timestamp, datetime, str]] = None,
    eligible_customers: Optional[List[str]] = None,
) -> Tuple[pd.DataFrame, List[str]]:
    """Extracts customer-level features for dashboard analytics and tabular views."""
    if df.empty:
        return pd.DataFrame(), []

    clean_df = clean_transactions(df)
    valid_cust = clean_df.dropna(subset=["customer_id"]).copy()
    if valid_cust.empty:
        return pd.DataFrame(), []

    if as_of_date is None:
        as_of = valid_cust["invoice_date"].max()
    else:
        as_of = pd.to_datetime(as_of_date)

    obs_df = valid_cust[valid_cust["invoice_date"] <= as_of].copy()
    if obs_df.empty:
        return pd.DataFrame(), []

    if eligible_customers is not None:
        eligible_set = set(str(c) for c in eligible_customers)
        obs_df = obs_df[obs_df["customer_id"].isin(eligible_set)]

    if obs_df.empty:
        return pd.DataFrame(), []

    qual_df = obs_df[obs_df["is_qualifying"]].copy()
    ret_df = obs_df[obs_df["is_return"]].copy()

    all_cids = obs_df["customer_id"].unique()
    features = []

    if not qual_df.empty:
        distinct_orders_all = qual_df.groupby(["customer_id", "invoice"]).agg(
            order_date=("invoice_date", "min"),
            order_spend=("line_total", "sum"),
            order_items=("quantity", "sum"),
        ).reset_index()

        d14 = as_of - pd.Timedelta(days=14)
        d30 = as_of - pd.Timedelta(days=30)
        d60 = as_of - pd.Timedelta(days=60)
        d90 = as_of - pd.Timedelta(days=90)

        distinct_orders_all["is_weekend"] = (distinct_orders_all["order_date"].dt.dayofweek >= 5).astype(int)
        distinct_orders_all["is_morning"] = (distinct_orders_all["order_date"].dt.hour < 12).astype(int)
        distinct_orders_all["is_d14"] = (distinct_orders_all["order_date"] >= d14).astype(int)
        distinct_orders_all["is_d30"] = (distinct_orders_all["order_date"] >= d30).astype(int)
        distinct_orders_all["is_d60"] = (distinct_orders_all["order_date"] >= d60).astype(int)
        distinct_orders_all["is_d90"] = (distinct_orders_all["order_date"] >= d90).astype(int)
        distinct_orders_all["is_prev_30"] = (
            (distinct_orders_all["order_date"] >= d60) & (distinct_orders_all["order_date"] < d30)
        ).astype(int)

        order_groups = distinct_orders_all.groupby("customer_id")
        unique_prods_map = qual_df.groupby("customer_id")["stock_code"].nunique().to_dict()
        qual_lines_map = qual_df.groupby("customer_id")["quantity"].count().to_dict()
    else:
        order_groups = None
        unique_prods_map = {}
        qual_lines_map = {}

    ret_summary = (
        ret_df.groupby("customer_id").agg(
            num_returns=("quantity", "count"),
            ret_spend=("line_total", lambda s: abs(s.sum())),
        ).to_dict("index")
        if not ret_df.empty
        else {}
    )

    all_summary = obs_df.groupby("customer_id").agg(
        total_lines=("quantity", "count"),
        num_cancels=("is_cancellation", "sum"),
    ).to_dict("index")

    for cid in all_cids:
        c_all = all_summary.get(cid, {})
        num_total_lines = c_all.get("total_lines", 0)
        num_cancellations = c_all.get("num_cancels", 0)

        c_ret = ret_summary.get(cid, {})
        num_return_lines = c_ret.get("num_returns", 0)
        total_returned_val = float(c_ret.get("ret_spend", 0.0))

        distinct_orders = order_groups.get_group(cid) if order_groups and cid in order_groups.groups else None

        if distinct_orders is not None and not distinct_orders.empty:
            frequency = len(distinct_orders)
            total_spend = distinct_orders["order_spend"].sum()
            avg_order_value = total_spend / frequency if frequency > 0 else 0.0
            max_purchase_value = distinct_orders["order_spend"].max()
            min_purchase_value = distinct_orders["order_spend"].min()

            last_purchase_date = distinct_orders["order_date"].max()
            first_purchase_date = distinct_orders["order_date"].min()

            recency_days = max(0.0, (as_of - last_purchase_date).total_seconds() / 86400.0)
            customer_activity_span = max(0.0, (last_purchase_date - first_purchase_date).total_seconds() / 86400.0)

            num_unique_products = unique_prods_map.get(cid, 1)
            num_qual_lines = qual_lines_map.get(cid, 1)
            product_diversity = num_unique_products / max(1, num_qual_lines)

            if frequency > 1:
                sorted_dates = distinct_orders["order_date"].sort_values()
                intervals = sorted_dates.diff().dropna().dt.total_seconds() / 86400.0
                avg_days_between_purchases = intervals.mean()
                purchase_consistency = intervals.std(ddof=1) if len(intervals) > 1 else 0.0
                if np.isnan(purchase_consistency):
                    purchase_consistency = 0.0
            else:
                avg_days_between_purchases = customer_activity_span
                purchase_consistency = 0.0

            d14_mask = distinct_orders["is_d14"] == 1
            spend_last_14d = float(distinct_orders.loc[d14_mask, "order_spend"].sum())

            d30_mask = distinct_orders["is_d30"] == 1
            orders_last_30d = int(d30_mask.sum())
            spend_last_30d = float(distinct_orders.loc[d30_mask, "order_spend"].sum())

            prev_30_mask = distinct_orders["is_prev_30"] == 1
            orders_prev_30d = int(prev_30_mask.sum())
            spend_prev_30d = float(distinct_orders.loc[prev_30_mask, "order_spend"].sum())

            purchase_frequency_trend = orders_last_30d / max(1.0, float(orders_prev_30d))
            recent_spending_trend = spend_last_30d / max(1.0, float(spend_prev_30d))

            orders_last_60d = int((distinct_orders["is_d60"] == 1).sum())
            orders_last_90d = int((distinct_orders["is_d90"] == 1).sum())

            is_active_30d = 1.0 if orders_last_30d > 0 else 0.0
            is_active_60d = 1.0 if orders_last_60d > 0 else 0.0
            avg_items_per_order = distinct_orders["order_items"].mean()

            recency_log = math.log1p(recency_days)
            spend_log = math.log1p(total_spend)
            orders_per_month = frequency / (customer_activity_span / 30.0 + 1.0)
            spend_per_day_active = total_spend / max(1.0, customer_activity_span)
            value_per_unique_item = total_spend / max(1.0, num_unique_products)
            return_to_spend_ratio = total_returned_val / max(1.0, total_spend)

            weekend_orders = int((distinct_orders["is_weekend"] == 1).sum())
            weekend_purchase_ratio = weekend_orders / frequency

            morning_orders = int((distinct_orders["is_morning"] == 1).sum())
            morning_purchase_ratio = morning_orders / frequency

        else:
            frequency = 0
            total_spend = 0.0
            avg_order_value = 0.0
            max_purchase_value = 0.0
            min_purchase_value = 0.0
            recency_days = 365.0
            customer_activity_span = 0.0
            num_unique_products = 0
            product_diversity = 0.0
            avg_days_between_purchases = 365.0
            purchase_consistency = 0.0
            spend_last_14d = 0.0
            orders_last_30d = 0
            spend_last_30d = 0.0
            purchase_frequency_trend = 0.0
            recent_spending_trend = 0.0
            orders_last_60d = 0
            orders_last_90d = 0
            is_active_30d = 0.0
            is_active_60d = 0.0
            avg_items_per_order = 0.0
            recency_log = math.log1p(365.0)
            spend_log = 0.0
            orders_per_month = 0.0
            spend_per_day_active = 0.0
            value_per_unique_item = 0.0
            return_to_spend_ratio = 1.0 if total_returned_val > 0 else 0.0
            weekend_purchase_ratio = 0.0
            morning_purchase_ratio = 0.0

        return_rate = num_return_lines / max(1, num_total_lines)

        features.append({
            "customer_id": cid,
            "recency_days": float(recency_days),
            "recency_log": float(recency_log),
            "frequency": float(frequency),
            "total_spend": float(total_spend),
            "spend_log": float(spend_log),
            "avg_order_value": float(avg_order_value),
            "max_purchase_value": float(max_purchase_value),
            "min_purchase_value": float(min_purchase_value),
            "num_transactions": float(num_total_lines),
            "num_unique_products": float(num_unique_products),
            "product_diversity": float(product_diversity),
            "purchase_frequency_trend": float(purchase_frequency_trend),
            "avg_days_between_purchases": float(avg_days_between_purchases),
            "recent_spending_trend": float(recent_spending_trend),
            "return_frequency": float(num_return_lines),
            "return_rate": float(return_rate),
            "return_to_spend_ratio": float(return_to_spend_ratio),
            "cancellation_frequency": float(num_cancellations),
            "customer_activity_span_days": float(customer_activity_span),
            "purchase_consistency": float(purchase_consistency),
            "orders_per_month": float(orders_per_month),
            "spend_per_day_active": float(spend_per_day_active),
            "value_per_unique_item": float(value_per_unique_item),
            "spend_last_14d": float(spend_last_14d),
            "spend_last_30d": float(spend_last_30d),
            "orders_last_30d": float(orders_last_30d),
            "orders_last_60d": float(orders_last_60d),
            "orders_last_90d": float(orders_last_90d),
            "is_active_30d": float(is_active_30d),
            "is_active_60d": float(is_active_60d),
            "avg_items_per_order": float(avg_items_per_order),
            "weekend_purchase_ratio": float(weekend_purchase_ratio),
            "morning_purchase_ratio": float(morning_purchase_ratio),
            "returned_value_total": float(total_returned_val),
        })

    feat_df = pd.DataFrame(features)
    feature_cols = [c for c in feat_df.columns if c != "customer_id"]
    feat_df[feature_cols] = feat_df[feature_cols].fillna(0.0)

    return feat_df, feature_cols
