# Development Guide & Platform Specifications

## 1. Competition Overview
The objective is to forecast 30-day forward purchasing behavior for eligible customer cohorts:
1. **Model 1**: Customer Purchase Probability ($P \in [0.0, 1.0]$).
2. **Model 2**: Customer Qualifying Purchase Spend ($V \ge 0$, capped at £2,000, rounded half-up to pennies).
3. **Selection**: Top 20% of eligible customers (minimum 1, maximum 20) ranked by Expected Business Value ($P \times V$).

---

## 2. Core Project Architecture

### Machine Learning Engine (Competition Pipeline)
- `features.py`: Transaction cleaning (returns, cancellations, missing values) and customer feature engineering pipeline.
- `train.py`: Two-stage model training, evaluation, calibration, and serialization.
- `solution.py`: Production decision engine implementing customer prediction and budget selection.
- `starter.py`: Official competition runner interface exposing `decide()`.
- `local_check.py`: Offline evaluation harness simulating official scoring, rules, and 9 adversarial stress tests.
- `scoring.json`: Official competition evaluation parameters and metric weights.
- `starter_model.json` & `model_artifacts.joblib`: Trained model weights and metadata.

### Enterprise Dashboard Application (Frontend & Backend)
- `dashboard_api.py`: FastAPI server serving live endpoints for all 9 dashboard modules.
- `frontend/`: React 19 + TypeScript + Tailwind CSS + Recharts + Lucide Icons enterprise client.
- `start_dashboard.bat`: One-click startup script for unified UI and API server.

---

## 3. Execution Commands

### A. Machine Learning Pipeline & Verification
```bash
# 1. Run model training and calibration
.venv\Scripts\python train.py

# 2. Run local check to verify complete competition compliance and robustness
.venv\Scripts\python local_check.py --solution solution.py

# 3. Test official starter entrypoint
.venv\Scripts\python starter.py
```

### B. Launching the Enterprise Dashboard
```bash
# Unified Server (Serves Frontend UI + Backend API on http://127.0.0.1:8000)
.venv\Scripts\python dashboard_api.py

# Or double-click: start_dashboard.bat
```

### C. Frontend Development Mode (Hot Reload)
```bash
cd frontend
npm.cmd run dev
# Frontend Dev Server: http://localhost:3000 (proxies /api to http://127.0.0.1:8000)
```
