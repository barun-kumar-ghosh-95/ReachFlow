# 🚀 Smart Demand Forecasting & Inventory Intelligence System
### Major Project Standard · End-to-End ML & Production Web Application

Powered by the **Real Kaggle 541,909-Row E-Commerce Dataset** (`$8.91M` Total Revenue, `3,805` Active SKUs, `522,710` Transactions).

---

## 🌟 Key Features & Architecture

1. **Real Data ETL & ML Pipeline (`export_web_data.py`, `src/`)**:
   - Ingests & cleans 541,909 raw transaction records.
   - Evaluates Chronological Time-Series Models: **Naive Baseline**, **Moving Average**, **Exponential Smoothing**, **Random Forest**, **LightGBM**, and **XGBoost Regressor** (Best Model).
   - Generates compact, ultra-fast JSON analytics data stores for zero cold-start Vercel deployment.

2. **Major Project Production Web Application (`smart-demand-forecasting-web/`)**:
   - **Executive Dashboard**: Key KPIs (Total Sales $8.91M, 522k Transactions, 3,805 SKUs), Monthly Revenue Trend Chart, Geographic Sales Donut, Top 15 Products table.
   - **AI Forecasting Studio**: Interactive horizon picker (14, 30, 60 days), Model Selector, Upper/Lower Confidence Intervals, Evaluation Leaderboard table (RMSE, MAE, MAPE, sMAPE).
   - **Festival & Seasonality Lift**: Demand multiplier analysis for major shopping festivals (Navratri +106%, Diwali +81%, Christmas +79%).
   - **Inventory Stockout Matrix**: Safety Stock calculation ($Z \times \sigma \times \sqrt{L}$), Reorder Point (ROP) alerts, Risk Badges (CRITICAL, HIGH, MEDIUM, LOW), and Purchase Order Generator Drawer.
   - **What-If Scenario Simulator**: Sliders for Demand Surge %, Lead Time Delays, and Service Level Target (80%-99%).
   - **Client-Side CSV Uploader**: Support for custom e-commerce CSV datasets.

---

## 🌐 Running Locally

### Option 1: Live Web Application
Open your browser and navigate to:
👉 **`http://localhost:8080`**

### Option 2: Streamlit Python App
```powershell
cd C:\Users\ASUS\Desktop\bk\smart-demand-forecasting
python -m streamlit run app.py
```
👉 **`http://localhost:8501`**

---

## 🐙 Push to GitHub Instructions

If Git is installed on your computer, run the following commands in your PowerShell / Terminal:

```bash
# 1. Initialize Git repository
git init

# 2. Add all project files
git add .

# 3. Commit
git commit -m "feat: Initial commit for Smart Demand Forecasting Major Project"

# 4. Create repository on GitHub, then link remote origin:
git remote add origin https://github.com/YOUR_USERNAME/smart-demand-forecasting.git

# 5. Push to GitHub main branch
git branch -M main
git push -u origin main
```

---

## ⚡ Vercel Deployment Instructions

1. **Option A (GitHub Integration - Recommended)**:
   - Go to [Vercel Dashboard](https://vercel.com/new).
   - Click **Import Repository** and select your `smart-demand-forecasting` GitHub repository.
   - Set **Root Directory** to `smart-demand-forecasting-web`.
   - Click **Deploy**!

2. **Option B (Vercel CLI)**:
   ```bash
   npm i -g vercel
   cd smart-demand-forecasting-web
   vercel --prod
   ```

---

## 📊 Evaluation & Model Summary

| Model Name | RMSE | MAE | MAPE (%) | Status |
|---|---|---|---|---|
| **XGBoost Regressor** | **7,894.06** | **5,860.56** | **29.12%** | 🏆 **BEST MODEL** |
| Random Forest | 8,511.57 | 6,500.43 | 25.24% | Evaluated |
| Moving Average | 9,584.23 | 7,427.68 | 37.03% | Baseline |
| Exponential Smoothing | 10,060.28 | 7,838.53 | 38.08% | Baseline |
| LightGBM | 10,200.57 | 8,119.21 | 29.52% | Evaluated |
| Naive Forecast | 21,062.41 | 19,128.52 | 102.49% | Baseline |
