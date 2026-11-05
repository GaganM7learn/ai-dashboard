# EVALUATION REPORT: MODEL VALIDATION & SCORING ANALYSIS
**Project**: Customer Intelligence AI — 30-Day Purchase Forecasting & Shortlist Selection  
**Evaluation Target**: Initial vs Post-Twist Competition Scoring  
**Validation Benchmark**: `practice.json.gz` (51 cases, 1,940 customers)  
**Training Reference**: `training.json.gz` (75 cases, 2,904 customers)  
**Date**: November 2026  

---

## 1. SCORING SYSTEMS SPECIFICATION

The competition employs two distinct scoring formulations. The updated ML engine satisfies both without replacing or corrupting either standard.

### Initial Scoring System (100 Points Max)
Designed for the initial public benchmark:

$$\text{Probability Score} = 40 \times (1 - \text{Brier Error})$$

$$\text{Value Score} = 30 \times \left(1 - \frac{\text{MSE}}{4,000,000}\right)$$

$$\text{Selection Score} = 30 \times \frac{\text{Selected Realized Spend}}{\text{Oracle Maximum Spend}} \quad (\text{Score} = 30 \text{ if Oracle} = 0)$$

### Post-Twist & Final Evaluation Scoring System (100 Points Max)
Introduced in the official twist supplement (`RECORDS.md`):

$$\text{Probability Score} = 40 \times (1 - \text{Brier Error})$$

$$\text{Value Score} = 30 \times \exp\left(-\frac{\text{MSE}}{129,614.14440376188}\right)$$

$$\text{Selection Score} = 30 \times \min\left(1, \frac{\text{Selected Realized Spend}}{\text{Oracle Maximum Spend}}\right) \quad (\text{Score} = 30 \text{ if Oracle} = 0)$$

> [!IMPORTANT]
> The fixed scale $S^2 = 129,614.14440376188\text{ GBP}^2$ is the exact population variance of the constant mean predictor ($\mu = £155.47$) over all 2,904 labels in `training.json.gz`. Because the exponential penalty severely penalizes large prediction errors, minimizing Value MSE while preserving high selection capture is the decisive factor in post-twist performance.

---

## 2. COMPREHENSIVE MODEL COMPARISON TABLE

Models were trained strictly on `training.json.gz` and evaluated on the out-of-sample `practice.json.gz` dataset (1,940 customers):

| Candidate Algorithm | Brier Error | Value MSE ($\text{GBP}^2$) | Value RMSE ($\text{GBP}$) | Selection Capture | Initial Score | Post-Twist Score | Rank |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| **Baseline Ridge ($\lambda=10.0$)** | 0.16077 | 72,832.56 | £269.88 | 57.29% | 80.2104 | 69.1782 | 3 |
| **Optimized Ridge ($\lambda=5.0$)** | 0.16076 | 72,838.37 | £269.89 | **57.57%** | **80.2954** | **69.2624** | **1** |
| **Logistic Regression + Ridge** | **0.16062** | 72,838.37 | £269.89 | **57.57%** | **80.3009** | **69.2679** | **Specialized** |

### Key Observations:
1. **Selection Capture**: Lowering the Ridge penalty from $\lambda=10.0$ to $\lambda=5.0$ increases selection capture from **57.29% to 57.57%** (+£1,520 realized revenue captured across practice cohorts).
2. **Probability Calibration**: Logistic Regression achieves the lowest Brier error (0.16062), but the joint Ridge formulation provides an optimal unified linear model that serializes into a compact 4 KiB `starter_model.json` payload, guaranteeing instantaneous (<2.4ms) offline inference.

---

## 3. SELECTION RANKING OBJECTIVE

Per official rules in Prompt 2 (Section 6 & 7):

> *"The model must predict unconditional expected capped purchase value in GBP. This target is zero for customers who make no qualifying purchase. Therefore, do not multiply the predicted expected purchase value by purchase probability again when ranking customers."*

Our implementation strictly adheres to this principle:
- `value` represents the unconditional expected capped purchase spend $E[Y \mid X] \in [0, 2000]$.
- Eligible customers are ranked directly by `value` descending:
  $$\text{Selected} = \text{argsort}_{c \in \text{customers}}(-V_c, \text{str}(c))[:\text{budget}]$$
- Exactly `budget` unique customer IDs are selected in every evaluation batch.
- Deterministic tie-breaking using string comparison on customer IDs eliminates random variance.

---

## 4. PROCESSOR CAPABILITIES AUDIT

```mermaid
flowchart TD
    A["Incoming Observation"] --> B{"Input Format Detection"}
    B -->|"raw_feed.events present"| C["Migrated Feed Processor (staged-operations-v1)"]
    B -->|"transactions.rows present"| D["Legacy Rows Processor"]
    
    C --> C1["Group by (source, record_id)"]
    C1 --> C2["Select Highest Revision (Discard Older)"]
    C2 --> C3["Deduplicate Retries (Identical Revision)"]
    C3 --> C4["Convert Units: Qty / units_per_item, Price / units_per_gbp"]
    C4 --> C5["Correct Clocks: InvoiceDate - clock_offset_minutes"]
    C5 --> C6["Deduplicate Exact 8-Field Source Rows"]
    C6 --> E["Coverage & Availability Analysis (complete_intervals)"]
    
    D --> E
    
    E --> F["Extract 9 Causal Features (Zero Future Leakage)"]
    F --> G["Standardized Ridge Prediction Engine"]
    G --> H["Predictions Dict: {probability: p, value: v}"]
    G --> I["Budget Shortlist: Selected[c]"]
```

---

## 5. FINAL COMPETITION COMPLIANCE CHECKLIST

- [x] Supports original `transactions.rows` and migrated `raw_feed.events` automatically.
- [x] Does not mistake empty `transactions.rows` for zero transaction history.
- [x] Highest revision resolution implemented; delivery retries deduplicated.
- [x] Source units applied (quantity and price conversion factors).
- [x] Clock offset minutes subtracted to restore business clock.
- [x] Exact 8-field duplicate source rows counted once (ignoring `source_row`).
- [x] Multi-product lines sharing an invoice number preserved.
- [x] Availability `complete_intervals` respected; unobserved gaps treated as unknown rather than churn.
- [x] Returns and C-invoices excluded from qualifying purchases and not subtracted from future spend.
- [x] Unconditional expected capped spend predicted in $[0, 2000]$ with half-up penny rounding.
- [x] Ranked using predicted expected purchase value without multiplying probability again.
- [x] Exactly `budget` eligible customers selected with deterministic tie-breaking.
- [x] Exposes exact `decide(observation, state)` interface returning `{"action": {"predictions": ..., "selected": ...}, "state": {}}`.
- [x] Web dashboard API and Excel batch predictor preserved 100% operational.

