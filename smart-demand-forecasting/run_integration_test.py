"""Integration test script."""
import sys
sys.path.insert(0, '.')

from src.data_processing import run_pipeline
from src.feature_engineering import add_date_features, add_lag_features, add_rolling_features
from src.festival_features import build_festival_calendar, compute_festival_lift
from src.model_training import train_all_models
from src.forecasting import forecast_total_demand, get_forecast_summary
from src.inventory import build_inventory_table, get_risk_counts
from src.evaluation import evaluate_model
import pandas as pd
import numpy as np

print("--- Running full integration test ---")
data = run_pipeline()
clean = data["clean"]
daily = data["daily"]
total_daily = data["total_daily"]
top_products = data["top_products"]

print(f"[OK] Pipeline: {len(clean):,} clean rows, {len(daily):,} daily rows")

# Festival calendar
dates = pd.date_range("2010-12-01", "2011-12-31", freq="D")
fest = build_festival_calendar(dates, years=[2010, 2011])
print(f"[OK] Festival calendar: {len(fest)} days, {int(fest['is_festival'].sum())} festival days")

lift_df = compute_festival_lift(total_daily, fest)
print(f"[OK] Festival lift: {len(lift_df)} festivals analyzed")
print(lift_df[["festival_name","lift_pct"]].head(3).to_string(index=False))

# Feature engineering + model training
total = total_daily.copy()
total = add_date_features(total, "Date")
total = add_lag_features(total, "TotalQuantity", sort_col="Date")
total = add_rolling_features(total, "TotalQuantity", sort_col="Date")
lag_cols = [c for c in total.columns if c.startswith("lag_")]
total.dropna(subset=lag_cols, inplace=True)
print(f"[OK] Features built: {total.shape}")

result = train_all_models(total, target_col="TotalQuantity", date_col="Date", save_models=True)
print(f"[OK] Training complete. Best model: {result['best_model_name']}")
print(result["comparison"][["Model","RMSE","MAPE"]].to_string(index=False))

# Forecast
fc = forecast_total_demand(total, result, horizon=14)
summary = get_forecast_summary(fc)
total_fc = summary["total"]
print(f"[OK] Forecast: total={total_fc:.0f} units over 14 days")
assert len(fc) == 14, "Forecast should have 14 rows"
assert (fc["predicted_demand"] >= 0).all(), "Predictions should be non-negative"

# Inventory
inv = build_inventory_table(
    top_products.head(10), daily, result,
    forecast_horizon=14, max_products=10
)
risk = get_risk_counts(inv)
print(f"[OK] Inventory table: {len(inv)} products | Risks: {risk}")
assert "stockout_risk" in inv.columns, "Inventory should have stockout_risk"

# Evaluation metrics
y_true = np.array([10.0, 20.0, 30.0])
y_pred = np.array([12.0, 18.0, 28.0])
metrics = evaluate_model(y_true, y_pred, "Test")
assert metrics["MAE"] > 0
assert metrics["RMSE"] >= metrics["MAE"]
print(f"[OK] Evaluation metrics: MAE={metrics['MAE']:.2f}, RMSE={metrics['RMSE']:.2f}")

print("")
print("=== ALL INTEGRATION TESTS PASSED ===")
