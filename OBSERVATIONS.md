# Competition Observations & Data Nuances

## 1. Dataset Characteristics & Inherent Challenges
- **Multi-Line Transactions**: Individual orders contain multiple distinct line items sharing identical `Invoice` numbers. They must remain separate and never collapsed into a single row before computing item quantities and diversity.
- **Returns & Cancellations**:
  - Invoices starting with `'C'` or entries with negative `Quantity` or negative `Price` designate cancellations or refunds.
  - *Key Rule*: Historical returns provide behavioral signals (return rate, churn risk), but **must not count as future qualifying purchases** and **must not be subtracted from future purchase value**.
- **Missing Values**:
  - Guest checkouts with missing `CustomerID` cannot be attributed to specific cohorts. They are filtered out for customer-level training and prediction.
  - Missing product `Description` fields are imputed safely with `'Unknown'`.
- **Temporal Alignment**:
  - Strict temporal cutoffs prevent lookahead bias. All feature engineering operations take an explicit `as_of_date` parameter.

## 2. Model Performance Observations
- **Two-Stage Architecture**:
  - Combining a calibrated Propensity Classifier with a Conditional Spend Regressor significantly outperforms single-stage regression models on zero-inflated e-commerce spend.
  - Probability calibration via Platt scaling ensures well-calibrated probabilities, reducing Brier score on out-of-fold validation.
- **Selection Optimization**:
  - Expected Business Value ($\text{EBV} = P(\text{purchase}) \times \text{Predicted Value}$) provides an optimal ranking criterion for allocating marketing spend under a 20% budget constraint.

