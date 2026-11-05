# Hackathon Final Submission Report

**Date & Time**: November 5, 2026  
**Artifact Package**: `hackathon_final_submission.zip`  
**Staging Directory**: `FINAL_SUBMISSION/`  
**Overall Validation Status**: **PASSED (All 10 Verification Checks Passed)**  

---

## 1. Package File Listing & Size Audit

Every submission file is located directly at the root of the ZIP archive. No folders, subdirectories, or nested paths exist inside the package.

| Filename | Purpose | Extension | File Size | Compressed Size | Compliance Status |
|---|---|---|---|---|---|
| [`solution.py`](file:///c:/Users/Admin/OneDrive/Desktop/AI-Based%20Customer%20Purchase%20Forecasting%20Dashboard/FINAL_SUBMISSION/solution.py) | Official competition entry point (`decide`) | `.py` | 7,821 bytes (7.64 KiB) | 2,768 bytes | PASS (< 2 MiB) |
| [`features.py`](file:///c:/Users/Admin/OneDrive/Desktop/AI-Based%20Customer%20Purchase%20Forecasting%20Dashboard/FINAL_SUBMISSION/features.py) | Feed processor, normalization & feature pipeline | `.py` | 29,964 bytes (29.26 KiB) | 8,140 bytes | PASS (< 2 MiB) |
| [`starter.py`](file:///c:/Users/Admin/OneDrive/Desktop/AI-Based%20Customer%20Purchase%20Forecasting%20Dashboard/FINAL_SUBMISSION/starter.py) | Forwarding stub for legacy evaluator harnesses | `.py` | 1,671 bytes (1.63 KiB) | 742 bytes | PASS (< 2 MiB) |
| [`starter_model.json`](file:///c:/Users/Admin/OneDrive/Desktop/AI-Based%20Customer%20Purchase%20Forecasting%20Dashboard/FINAL_SUBMISSION/starter_model.json) | Trained coefficients, scaling means & std devs | `.json` | 1,152 bytes (1.13 KiB) | 453 bytes | PASS (< 2 MiB) |
| [`scoring.json`](file:///c:/Users/Admin/OneDrive/Desktop/AI-Based%20Customer%20Purchase%20Forecasting%20Dashboard/FINAL_SUBMISSION/scoring.json) | Official loss scales, value caps & selection rules | `.json` | 666 bytes (0.65 KiB) | 354 bytes | PASS (< 2 MiB) |
| [`README.md`](file:///c:/Users/Admin/OneDrive/Desktop/AI-Based%20Customer%20Purchase%20Forecasting%20Dashboard/FINAL_SUBMISSION/README.md) | Technical architecture & interface documentation | `.md` | 2,420 bytes (2.36 KiB) | 1,311 bytes | PASS (< 2 MiB) |

### Size & Constraint Summary
- **Total Files**: 6 files (Official Limit: $\le 100$ files)
- **Total Uncompressed Source**: 43,694 bytes / 42.67 KiB (Official Limit: $\le 16$ MiB)
- **Total ZIP Archive Size**: 14,388 bytes / 14.05 KiB (Official Limit: $\le 32$ MiB)
- **Largest Single File**: 29,964 bytes / 0.0286 MiB (Official Limit: $\le 2$ MiB)
- **File Extensions**: Only permitted extensions used (`.py`, `.json`, `.md`)
- **Excluded Items**: Zero frontend files, zero `node_modules`, zero `.pyc`/`__pycache__`, zero `.DS_Store`, zero datasets, zero nested folders.

---

## 2. Interface & Schema Validation Results

Testing executed from a clean extraction sandbox simulating the official pinned Docker container (Python 3.12, network disabled):

- **Entrypoint Signature**: `solution.decide(observation, state)` $\to$ **PASS**
- **Root-Level Schema**: Returns `{"action": ..., "state": {}}` with zero extraneous root keys $\to$ **PASS**
- **Action Schema**: Returns exactly `{"predictions": ..., "selected": [...]}` with zero extra action keys $\to$ **PASS**
- **Customer Coverage**: Predictions dictionary contains exactly the roster in `observation["customers"]` $\to$ **PASS**
- **Prediction Invariants**:
  - `probability`: Finite float in $[0.0, 1.0]$ $\to$ **PASS**
  - `value`: Finite float in $[0.0, 2000.0]$, rounded to pennies via `ROUND_HALF_UP` $\to$ **PASS**
- **Selection Budget**:
  - Contains exactly $K = \max(1, \lfloor N / 5 \rfloor)$ distinct eligible customer IDs $\to$ **PASS**
  - All selected IDs are strictly members of `observation["customers"]` $\to$ **PASS**
  - Deterministic tie-breaking on customer ID string $\to$ **PASS**

---

## 3. Original Compatibility & Historical Validation Results

Evaluated using official `local_check.py` against both Initial and Post-Twist scoring formulas:

### A. Smoke Dataset (`smoke.json.gz` — 2 Cases, 40 Eligible Customers)
- **Initial Score**: **81.1381** / 100.0000
- **Post-Twist Score**: **68.1079** / 100.0000
- **Brier Error**: $0.1226$
- **Value MSE**: $86,051.96$ (RMSE £293.35, MAE £174.87)
- **Selection Realized Value Capture**: $55.63\%$
- **Result**: **PASS**

### B. Training Dataset (`training.json.gz` — 75 Cases, 1,500 Eligible Customers)
- **Initial Score**: **80.4872** / 100.0000
- **Post-Twist Score**: **67.1648** / 100.0000
- **Brier Error**: $0.1711$
- **Value MSE**: $91,908.01$ (RMSE £303.16, MAE £183.54)
- **Selection Realized Value Capture**: $60.07\%$
- **Result**: **PASS**

### C. Practice Dataset (`practice.json.gz` — 51 Cases, 1,020 Disjoint Customers)
- **Initial Score**: **80.2954** / 100.0000
- **Post-Twist Score**: **69.2624** / 100.0000
- **Brier Error**: $0.1608$
- **Value MSE**: $72,838.37$ (RMSE £269.89, MAE £157.35)
- **Selection Realized Value Capture**: $57.57\%$
- **Result**: **PASS**

### D. Adversarial Robustness Suite (`local_check.py --robustness`)
- Test 1: Empty transaction history (`rows=[]`) $\to$ **PASSED**
- Test 2: Missing / null customer lines $\to$ **PASSED**
- Test 3: Pure returns and cancellations (C-invoices) $\to$ **PASSED**
- Test 4: Multi-product single invoice $\to$ **PASSED**
- Test 5: Outlier spend (£100k cap audit) $\to$ **PASSED**
- Test 6: Strict budget constraint ($K = 2$ of $10$) $\to$ **PASSED**
- Test 7: Non-negative projection guarantee $\to$ **PASSED**
- Test 8: Deterministic selection ordering $\to$ **PASSED**
- Test 9: Migrated `raw_feed.events` resolution $\to$ **PASSED**
- **Overall Suite**: **9/9 Tests PASSED**

---

## 4. Post-Twist Migrated-Feed Processor Results

Comprehensive unit test execution (`test_feed_processor.py`): **16/16 Tests PASSED (0.003s)**

1. **Operating Records Verification**: Unpacks actual unlabelled multi-source feeds (`operating-records.json`) $\to$ **PASSED**
2. **Revision Resolution**: Groups events by `(source, record_id)` and treats highest revision as a complete replacement $\to$ **PASSED**
3. **Repeated Delivery Deduplication**: Deduplicates identical revision delivery attempts without losing invoice lines $\to$ **PASSED**
4. **Order-Independent Parsing**: Scrambled event delivery order resolves to the exact same canonical state $\to$ **PASSED**
5. **Exact 8-Field Deduplication**: Retains valid distinct products on an invoice while consolidating exact retries $\to$ **PASSED**
6. **Quantity Normalization**: Converts millipieces ($1,000 / \text{item}$) and units to standard integer items $\to$ **PASSED**
7. **Price Normalization**: Converts pence ($100 / \text{GBP}$) and pounds to standard GBP $\to$ **PASSED**
8. **Clock Offset Realignment**: Shifts source timestamps (+60m / -300m) to local-naive retail time $\to$ **PASSED**
9. **Coverage Window Awareness**: Unobserved windows in `availability.sources` are flagged as UNKNOWN, preventing artificial dormancy penalties $\to$ **PASSED**
10. **Customer Source Routing**: Directs transactions according to `customer_sources` mappings $\to$ **PASSED**
11. **Cold-Start Roster Handling**: Predicts zero-activity defaults without failing on empty histories $\to$ **PASSED**
12. **Missing Customer Exclusion**: Discards rows with `CustomerID = null` $\to$ **PASSED**
13. **Invalid Invoice Exclusion**: Discards non-qualifying/null invoices $\to$ **PASSED**
14. **Return Tracking**: Classifies negative quantities as return behavioral features while excluding them from positive target spend $\to$ **PASSED**
15. **Cancellation Tracking**: Classifies `C`-prefixed invoices as cancellations $\to$ **PASSED**
16. **Budget Selection Adherence**: Strictly selects $K = \max(1, \lfloor N / 5 \rfloor)$ customers from multi-source observations $\to$ **PASSED**

---

## 5. Remaining Limitations & Operating Boundaries

1. **Pre-Fitted Weights Deployment**:
   - In accordance with rules forbidding online model training during inference, `starter_model.json` contains pre-fitted parameters.
   - Inference requires zero gradient computations, keeping execution well below the 120-second per-case timeout.
2. **Resource Constraints**:
   - The submission adheres strictly to the organizer's sandbox constraints: $\le 2$ CPUs, $\le 2$ GiB RAM, and disconnected network (UID 65534).
3. **Decoupled Architecture**:
   - The original website and development environment remain unmodified in their root directories.
   - The submission archive is completely autonomous and self-contained.

