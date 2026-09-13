# Smart Demand Forecasting

<div align="center">
  <h3>AI-Powered Retail Demand & Inventory Intelligence System</h3>
  <p>Predict future product demand · Detect seasonality · Model festival impact · Prevent stockouts</p>
</div>

---

## 📌 Problem Statement

Retail and e-commerce companies lose significant revenue due to demand uncertainty — either stocking out of popular products or tying up capital in excess inventory. Manual forecasting based on gut feeling is error-prone and doesn't scale.

**Smart Demand Forecasting** solves this with an end-to-end ML pipeline that:
- Predicts future demand using multiple ML models
- Detects seasonality and weekly/monthly patterns
- Models festival/holiday demand impact (India calendar layer)
- Translates forecasts into actionable inventory recommendations

---

## 💼 Business Impact

| Metric | Impact |
|--------|--------|
| **Stockout Reduction** | Reorder alerts triggered before stock runs below lead time |
| **Inventory Optimization** | Safety stock calculated using demand variability |
| **Festival Planning** | Pre-planned buffer stock for high-uplift festivals |
| **Demand Visibility** | 7–60 day forward visibility for procurement teams |

---

## ✨ Features

- **📊 Executive Dashboard** — KPI cards, total revenue, forecast demand, risk alerts
- **📈 Demand Trends** — Historical + forecast with 90% confidence intervals
- **🔍 Product Forecast** — Per-SKU demand forecasting with moving average decomposition
- **🎉 Festival Intelligence** — India festival calendar with demand lift analysis `[SIMULATED]`
- **📦 Inventory Risk** — Safety stock, ROP, stockout risk table `[SIMULATED STOCK LEVELS]`
- **💡 Business Insights** — Auto-generated data-driven insights
- **⚙️ Model Performance** — Multi-model comparison with actual vs predicted charts

---

## 🏗️ Architecture

```
User Request
    │
    ▼
Streamlit Dashboard (app.py)
    │
    ├── Data Pipeline (src/data_processing.py)
    │       ├── Load CSV (latin-1 encoding)
    │       ├── Clean (cancel removal, validation)
    │       └── Aggregate (daily product + total)
    │
    ├── Feature Engineering (src/feature_engineering.py)
    │       ├── Date features (year, month, week, DOW...)
    │       ├── Lag features (lag_1, lag_7, lag_14, lag_28)
    │       └── Rolling stats (mean/std over 7/14/28 days)
    │
    ├── Festival Calendar (src/festival_features.py) [SIMULATED]
    │       ├── India festival dates
    │       ├── Window features
    │       └── Demand lift analysis
    │
    ├── Model Training (src/model_training.py)
    │       ├── Naive / Moving Average (baselines)
    │       ├── Exponential Smoothing (statistical)
    │       ├── Random Forest / XGBoost / LightGBM (ML)
    │       └── Time-series CV (chronological split)
    │
    ├── Forecasting Engine (src/forecasting.py)
    │       ├── forecast_total_demand()
    │       ├── forecast_product()
    │       └── Bootstrap prediction intervals
    │
    └── Inventory Intelligence (src/inventory.py) [SIMULATED STOCK]
            ├── Safety Stock = Z × σ × √(lead_time)
            ├── ROP = lead_time_demand + safety_stock
            └── Risk classification: LOW / MEDIUM / HIGH / CRITICAL
```

---

## 📦 Dataset

**Source**: [Kaggle — E-Commerce Data](https://www.kaggle.com/datasets/carrie1/ecommerce-data)

| Property | Value |
|----------|-------|
| Records | ~541,000 transactions |
| Period | Dec 2010 – Dec 2011 |
| Geography | UK-based online retailer |
| Encoding | latin-1 |
| Fields | InvoiceNo, StockCode, Description, Quantity, InvoiceDate, UnitPrice, CustomerID, Country |

**Download Instructions:**
1. Visit: https://www.kaggle.com/datasets/carrie1/ecommerce-data
2. Download `data.csv`
3. Place in `data/raw/data.csv`

> If the CSV is not found, the app automatically uses **SIMULATED sample data** for demonstration.

---

## 🤖 ML Approach

### Model Selection
Models are trained on total daily demand and evaluated on a **chronological 20% holdout** (never random split).

| # | Model | Type |
|---|-------|------|
| 1 | Naive Forecast | Baseline |
| 2 | Moving Average (7d) | Baseline |
| 3 | Exponential Smoothing | Statistical |
| 4 | Random Forest | ML Ensemble |
| 5 | XGBoost | ML Gradient Boosting |
| 6 | LightGBM | ML Gradient Boosting |

Best model is selected by **lowest RMSE** on the validation set.

### Evaluation Metrics
- **MAE** — Mean Absolute Error
- **RMSE** — Root Mean Squared Error (primary selection metric)
- **MAPE** — Mean Absolute Percentage Error
- **sMAPE** — Symmetric MAPE (handles zero actuals)

---

## 🔧 Feature Engineering

### Date Features
`year · month · week · day · day_of_week · day_of_year · quarter · is_weekend`

### Demand Lag Features
`lag_1 · lag_7 · lag_14 · lag_28`

### Rolling Statistics
`rolling_mean_7 · rolling_mean_14 · rolling_mean_28`  
`rolling_std_7 · rolling_std_28`

### Business Features
`avg_unit_price · demand_freq · rolling_revenue_7`

---

## 🎉 Festival Intelligence

> ⚠️ **[SIMULATED LAYER]** — The source dataset is UK-based. This is a portfolio upgrade demonstrating Indian e-commerce demand modeling.

### Festivals Covered
Diwali · Holi · Eid al-Fitr · Christmas · Dussehra · Raksha Bandhan ·  
Independence Day · Republic Day · New Year · Navratri · Durga Puja

### Features Generated
- `is_festival` — 1 if date is in festival window
- `days_to_festival` — Days until next festival
- `days_after_festival` — Days since last festival
- `festival_window` — In pre/post window
- `lift_factor` — Estimated demand multiplier

### Sample Festival Lifts
| Festival | Estimated Lift |
|----------|---------------|
| Christmas | +45% |
| Diwali | +38% |
| New Year | +25% |

---

## 📦 Inventory Intelligence

> ⚠️ **[SIMULATED STOCK LEVELS]** — Dataset has no warehouse data. Stock levels are derived from historical demand.

### Formulas
```
Safety Stock   = Z × σ_demand × √(lead_time_days)
Reorder Point  = (avg_daily_demand × lead_time) + safety_stock
Order Quantity = target_stock - current_stock
Coverage Days  = current_stock / avg_daily_demand
```

### Risk Levels
| Level | Condition |
|-------|-----------|
| 🟢 LOW | Coverage ≥ 2× lead time |
| 🟡 MEDIUM | Coverage < 2× lead time |
| 🟠 HIGH | Coverage < lead time |
| 🔴 CRITICAL | Coverage ≤ 0 |

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| **Dashboard** | Streamlit 1.28+ |
| **Data** | Pandas, NumPy |
| **ML** | Scikit-learn, XGBoost, LightGBM |
| **Statistics** | Statsmodels |
| **Visualization** | Plotly |
| **Model Persistence** | Joblib |
| **Testing** | Pytest |
| **Containerization** | Docker |

---

## 📁 Project Structure

```
smart-demand-forecasting/
│
├── app.py                     ← Streamlit dashboard
├── requirements.txt
├── README.md
├── .gitignore
├── Dockerfile
├── .env.example
│
├── data/
│   ├── raw/                   ← Place data.csv here
│   └── processed/             ← Auto-generated outputs
│
├── models/                    ← Saved model artifacts
│
├── notebooks/
│   └── exploratory_analysis.ipynb
│
├── src/
│   ├── __init__.py
│   ├── data_processing.py     ← ETL pipeline
│   ├── feature_engineering.py ← ML feature creation
│   ├── festival_features.py   ← India festival calendar [SIMULATED]
│   ├── forecasting.py         ← Forecast engine
│   ├── model_training.py      ← Multi-model training
│   ├── evaluation.py          ← Metrics
│   ├── inventory.py           ← Inventory intelligence [SIMULATED STOCK]
│   └── utils.py               ← Shared utilities
│
├── tests/
│   ├── test_data_processing.py
│   ├── test_forecasting.py
│   └── test_inventory.py
│
└── assets/
    └── screenshots/
```

---

## 🚀 Installation

### Prerequisites
- Python 3.9 or higher
- pip

### Clone & Setup

```bash
git clone <YOUR_GITHUB_REPO>
cd smart-demand-forecasting

python -m venv venv

# Windows
venv\Scripts\activate

# Linux / Mac
source venv/bin/activate

pip install -r requirements.txt
```

### Add Dataset

```bash
# Place your downloaded Kaggle CSV here:
data/raw/data.csv
```

---

## ▶️ Running Locally

```bash
streamlit run app.py
```

Open: http://localhost:8501

> **First run:** Model training takes 1–3 minutes. Results are cached — subsequent runs are instant.

---

## 🐳 Docker

```bash
# Build
docker build -t smart-demand-forecasting .

# Run
docker run -p 8501:8501 -v $(pwd)/data:/app/data smart-demand-forecasting
```

Open: http://localhost:8501

---

## 🧪 Running Tests

```bash
pytest tests/ -v --tb=short
```

---

## 🔬 GitHub Commands

```bash
git init
git add .
git commit -m "Initial commit: Smart Demand Forecasting"
git remote add origin <YOUR_GITHUB_URL>
git push -u origin main
```

---

## ⚠️ Known Assumptions

1. **Festival Intelligence** — Applied to a UK dataset as a portfolio demonstration. Results are labeled `[SIMULATED]`.
2. **Inventory Stock Levels** — Derived statistically from historical demand; no real warehouse data. Labeled `[SIMULATED]`.
3. **Lead Time** — Configurable via UI sidebar (default: 7 days).
4. **Service Level** — 95% default for safety stock calculation.
5. **Forecast Horizon** — 7, 14, 30, or 60 days.

---

## 🔮 Future Improvements

- [ ] Integrate real inventory/WMS API
- [ ] Add Prophet model for better seasonality decomposition
- [ ] Multi-variate forecasting (price elasticity, promotions)
- [ ] Real Indian e-commerce dataset (Flipkart/Meesho)
- [ ] Email/Slack alerts for CRITICAL stockout risk
- [ ] SKU-level model fine-tuning
- [ ] Streamlit authentication (multi-user)
- [ ] CI/CD pipeline with GitHub Actions
- [ ] Model drift detection

---

## 👤 Author

Built as a portfolio project for ML Engineer / Data Scientist interview demonstration.

**Skills demonstrated:**
- End-to-end ML pipeline design
- Time-series forecasting
- Feature engineering
- Multi-model comparison
- Production Streamlit dashboard
- Inventory business logic
- Clean, modular Python code
- Docker containerization
- Unit testing
