# Hackathon Submission: Customer Purchase Forecasting & Selection Engine

**Domain**: AI-Based Customer Purchase Forecasting  
**Interface**: `solution.py` exposing `decide(observation, state)`  
**Environment**: Python 3.12 (Offline, zero external network calls)  
**Dependencies**: `numpy`, `pandas`, `scipy`, `sklearn` (standard scientific stack)

---

## Architecture & Solution Summary

1. **Dual-Format Input Ingestion**:
   - Automatically detects observation format: legacy `transactions` (rows/columns) vs post-twist migrated `raw_feed` (multi-source events).
   - Resolves events grouped by `(source, record_id)` using highest revision complete replacement.
   - Ignores repeated delivery attempts.
   - Applies source metadata for unit conversion (millipieces $\to$ units, pence $\to$ GBP) and clock offset adjustments.
   - Evaluates coverage intervals, treating unobserved periods as unknown rather than penalized inactivity.

2. **Feature Engineering**:
   - 9 robust, leakage-free causal customer features:
     1. `recency`: Days since last purchase relative to snapshot.
     2. `invoice_frequency`: Count of qualifying positive purchase invoices.
     3. `recent_value`: Log-transformed qualifying spend in recent 30-day window.
     4. `older_value`: Log-transformed qualifying spend before 30-day window.
     5. `basket_value`: Average spend per qualifying transaction.
     6. `return_ratio`: Proportion of gross spend accounted for by returns/cancellations.
     7. `cadence`: Average inter-purchase interval in days.
     8. `tenure`: Days since customer's first observed activity.
     9. `observed_gap`: Flag indicating missing coverage in customer ledger source.

3. **Two-Stage Machine Learning Inference**:
   - **Stage 1 (Propensity Classifier)**: Ridge classifier calibrated via Platt Sigmoid scaling, outputting well-calibrated purchase probabilities $\in [0, 1]$.
   - **Stage 2 (Spend Regressor)**: L2 regularized Ridge regressor estimating unconditional spend, bounded in $[0, 2000]$ and rounded to pennies using `ROUND_HALF_UP`.

4. **Marketing Selection**:
   - Authoritative budget: Exactly $K = \max(1, \lfloor N / 5 \rfloor)$ distinct eligible customer IDs selected.
   - Deterministic ranking: Sorted by predicted expected purchase value with tie-breaking on customer ID.
   - Conforms 100% to official JSON schema and evaluation constraints in `EVENT_RULES.md` and `SCHEMA.md`.

