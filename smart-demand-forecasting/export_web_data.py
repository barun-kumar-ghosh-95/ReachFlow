"""
export_web_data.py
------------------
Runs the complete Smart Demand Forecasting pipeline on the real Kaggle dataset (541k rows)
and exports rich JSON data files for the Next.js Web Application.
"""

import os
import json
import logging
from pathlib import Path
import pandas as pd
import numpy as np

from src.data_processing import run_pipeline, generate_sample_dataset
from src.feature_engineering import build_features, get_feature_columns
from src.festival_features import build_festival_calendar, compute_festival_lift
from src.model_training import train_all_models
from src.forecasting import _ml_forecast
from src.inventory import build_inventory_table

logging.basicConfig(level=logging.INFO, format="%(asctime)s | %(levelname)s | %(message)s")
logger = logging.getLogger(__name__)

WEB_DATA_DIR = Path(__file__).parent / "smart-demand-forecasting-web" / "public" / "data"
WEB_DATA_DIR.mkdir(parents=True, exist_ok=True)

def main():
    logger.info("Starting processing for real dataset web export...")
    
    pipeline_res = run_pipeline()
    df_clean = pipeline_res['clean']
    df_daily = pipeline_res['daily']
    
    total_sales = float(df_clean['Revenue'].sum())
    total_orders = int(df_clean['InvoiceNo'].nunique())
    total_skus = int(df_clean['StockCode'].nunique())
    total_customers = int(df_clean['CustomerID'].dropna().nunique()) if 'CustomerID' in df_clean.columns else 0
    total_items_sold = int(df_clean['Quantity'].sum())
    
    # Monthly sales trend
    df_clean['MonthYear'] = df_clean['InvoiceDate'].dt.to_period('M').astype(str)
    monthly_trend = df_clean.groupby('MonthYear').agg(
        Revenue=('Revenue', 'sum'),
        Quantity=('Quantity', 'sum'),
        Orders=('InvoiceNo', 'nunique')
    ).reset_index().to_dict(orient='records')
    
    # Top Products
    top_products = df_clean.groupby(['StockCode', 'Description']).agg(
        TotalRevenue=('Revenue', 'sum'),
        TotalQuantity=('Quantity', 'sum'),
        AvgPrice=('UnitPrice', 'mean')
    ).reset_index().sort_values(by='TotalRevenue', ascending=False).head(15)
    
    top_products_list = top_products.to_dict(orient='records')
    
    # Country breakdown
    country_sales = df_clean.groupby('Country').agg(
        Revenue=('Revenue', 'sum'),
        Orders=('InvoiceNo', 'nunique')
    ).reset_index().sort_values(by='Revenue', ascending=False).head(10).to_dict(orient='records')
    
    overview_data = {
        "metrics": {
            "totalRevenue": round(total_sales, 2),
            "totalOrders": total_orders,
            "totalSKUs": total_skus,
            "totalCustomers": total_customers,
            "totalItemsSold": total_items_sold,
            "dateRange": {
                "start": str(df_clean['InvoiceDate'].min().date()),
                "end": str(df_clean['InvoiceDate'].max().date())
            }
        },
        "monthlyTrend": monthly_trend,
        "topProducts": top_products_list,
        "countrySales": country_sales
    }
    
    with open(WEB_DATA_DIR / "overview.json", "w") as f:
        json.dump(overview_data, f, indent=2)
    logger.info("Saved overview.json")
    
    df_clean['DateOnly'] = df_clean['InvoiceDate'].dt.floor('D')
    date_range = pd.date_range(start=df_clean['DateOnly'].min(), end=df_clean['DateOnly'].max(), freq='D')
    festivals_df = build_festival_calendar(date_range)
    festivals_df['Date'] = pd.to_datetime(festivals_df['Date']).dt.floor('D')
    
    df_daily_total = df_daily.groupby('Date').agg(Quantity=('Quantity', 'sum')).reset_index()
    df_daily_total['Date'] = pd.to_datetime(df_daily_total['Date']).dt.floor('D')
    festival_lift = compute_festival_lift(df_daily_total, festivals_df, demand_col="Quantity")
    
    festival_data = {
        "festivals": festival_lift.to_dict(orient='records'),
        "calendar": festivals_df[festivals_df['is_festival'] == 1][['Date', 'festival_name', 'lift_factor']].astype(str).to_dict(orient='records')
    }
    with open(WEB_DATA_DIR / "festivals.json", "w") as f:
        json.dump(festival_data, f, indent=2)
    logger.info("Saved festivals.json")
    
    # 3. Model Training & Forecasting
    df_features = build_features(df_daily_total, df_daily_total, "TOTAL", festival_df=festivals_df)
    model_res = train_all_models(df_features, model_prefix="total")
    best_model = model_res["best_model"]
    best_name = model_res["best_model_name"]
    leaderboard_df = model_res["comparison"]
    feature_cols = model_res["feature_cols"]
    
    forecast_df = _ml_forecast(best_model, df_features, "Quantity", 30, feature_cols, festival_calendar=festivals_df)

    historical_tail = df_daily_total.tail(60).copy()
    historical_tail['Date'] = historical_tail['Date'].dt.strftime('%Y-%m-%d')
    historical_data = historical_tail.to_dict(orient='records')
    
    forecast_df['Date'] = forecast_df['Date'].dt.strftime('%Y-%m-%d')
    forecast_list = forecast_df.to_dict(orient='records')
    
    forecasting_data = {
        "bestModelName": str(best_name),
        "leaderboard": leaderboard_df.to_dict(orient='records'),
        "historical": historical_data,
        "forecast": forecast_list
    }
    with open(WEB_DATA_DIR / "forecasts.json", "w") as f:
        json.dump(forecasting_data, f, indent=2)
    logger.info("Saved forecasts.json")
    
    # 4. Inventory Stockout Intelligence
    top_prods_df = pd.DataFrame(top_products_list)
    inventory_df = build_inventory_table(top_prods_df, df_daily, model_res, max_products=20)
    inventory_records = inventory_df.to_dict(orient='records')
    
    risk_summary = inventory_df['stockout_risk'].value_counts().to_dict() if 'stockout_risk' in inventory_df.columns else {}
    
    inventory_data = {
        "summary": risk_summary,
        "items": inventory_records
    }
    with open(WEB_DATA_DIR / "inventory.json", "w") as f:
        json.dump(inventory_data, f, indent=2)
    logger.info("Saved inventory.json")
    
    logger.info("🎉 Web data export complete! All JSON assets saved to web directory.")

if __name__ == "__main__":
    main()
