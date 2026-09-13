"""
src/data_processing.py
-----------------------
End-to-end ETL pipeline for the Kaggle E-Commerce dataset.

Dataset: https://www.kaggle.com/datasets/carrie1/ecommerce-data
File   : data/raw/data.csv
Encoding: latin-1 (required for special characters in product descriptions)

Steps:
  1. Load CSV
  2. Validate columns
  3. Handle missing values
  4. Remove cancelled / invalid transactions
  5. Parse dates & validate numeric fields
  6. Calculate revenue
  7. Product-level daily aggregation
  8. Time-series resampling (fill missing dates)
  9. Export processed data
"""

import logging
from pathlib import Path
from typing import Optional, Tuple

import numpy as np
import pandas as pd

from src.utils import (
    DATA_PROCESSED_DIR,
    EXPECTED_COLUMNS,
    find_raw_csv,
    get_logger,
    validate_dataframe,
)

logger = get_logger(__name__)


# ─── Sample Data Generator ────────────────────────────────────────────────────

def generate_sample_dataset(n_rows: int = 50_000, seed: int = 42) -> pd.DataFrame:
    """
    Generate a realistic synthetic dataset that mirrors the Kaggle ecommerce
    CSV structure. Used ONLY as a fallback when the real CSV is unavailable.

    ⚠️  SIMULATED DATA — All transactions are synthetically generated.
    """
    logger.warning("Real dataset not found. Generating SIMULATED sample data.")
    rng = np.random.default_rng(seed)

    products = {
        "85123A": ("WHITE HANGING HEART T-LIGHT HOLDER", 2.55),
        "71053":  ("WHITE METAL LANTERN", 3.39),
        "84406B": ("CREAM CUPID HEARTS COAT HANGER", 2.75),
        "84029G": ("KNITTED UNION FLAG HOT WATER BOTTLE", 3.39),
        "84029E": ("RED WOOLLY HOTTIE WHITE HEART", 3.39),
        "22752":  ("SET 7 BABUSHKA NESTING BOXES", 7.65),
        "21730":  ("GLASS STAR FROSTED T-LIGHT HOLDER", 4.25),
        "22633":  ("HAND WARMER UNION JACK", 1.85),
        "22632":  ("HAND WARMER RED POLKA DOT", 1.85),
        "47566":  ("PARTY BUNTING", 4.95),
        "85099B": ("JUMBO BAG RED RETROSPOT", 1.65),
        "20725":  ("LUNCH BAG RED RETROSPOT", 1.65),
        "23203":  ("WOOD 2 DRAWER CABINET WHITE FINISH", 9.95),
        "20727":  ("LUNCH BAG BLACK SKULL", 1.65),
        "23209":  ("ADVENT CALENDAR GINGHAM SACK", 8.50),
        "22111":  ("SCOTTIE DOG HOT WATER BOTTLE", 4.95),
        "22110":  ("BIRD CHERRY OLIO CANDLE", 2.10),
        "84879":  ("ASSORTED COLOUR BIRD ORNAMENT", 1.69),
        "22469":  ("HEART OF WICKER SMALL", 1.65),
        "22470":  ("HEART OF WICKER LARGE", 2.95),
    }
    stock_codes = list(products.keys())
    descriptions = [products[s][0] for s in stock_codes]
    base_prices = [products[s][1] for s in stock_codes]

    # Date range: Dec 2010 – Dec 2011
    start_date = pd.Timestamp("2010-12-01")
    end_date   = pd.Timestamp("2011-12-09")
    date_range = pd.date_range(start_date, end_date, freq="h")

    # Simulate seasonal demand with weekly + monthly patterns
    n = n_rows
    inv_dates = rng.choice(date_range, size=n)
    inv_dates_series = pd.Series(inv_dates).sort_values().reset_index(drop=True)

    prod_idx = rng.choice(len(stock_codes), size=n, p=None)

    # Seasonal quantity: higher in Oct–Dec
    months = pd.DatetimeIndex(inv_dates_series).month
    season_factor = np.where(months >= 10, 2.5, np.where(months >= 7, 1.5, 1.0))
    quantities = (rng.exponential(scale=6, size=n) * season_factor).clip(1, 80).astype(int)

    # ~2% cancellations
    cancelled_mask = rng.random(n) < 0.02
    invoice_nos = [
        f"{'C' if cancelled_mask[i] else ''}{500000 + i // 10}"
        for i in range(n)
    ]

    prices = [base_prices[i] * rng.uniform(0.9, 1.1) for i in prod_idx]
    customer_ids = rng.choice(range(12000, 18500), size=n)
    # ~20% missing customer IDs
    customer_mask = rng.random(n) < 0.20
    customer_ids_str = [
        "" if customer_mask[i] else str(customer_ids[i]) for i in range(n)
    ]

    df = pd.DataFrame({
        "InvoiceNo":   invoice_nos,
        "StockCode":   [stock_codes[i] for i in prod_idx],
        "Description": [descriptions[i] for i in prod_idx],
        "Quantity":    quantities,
        "InvoiceDate": inv_dates_series.values,
        "UnitPrice":   [round(p, 2) for p in prices],
        "CustomerID":  customer_ids_str,
        "Country":     rng.choice(
            ["United Kingdom", "Germany", "France", "EIRE", "Spain"],
            size=n,
            p=[0.85, 0.05, 0.05, 0.03, 0.02],
        ),
    })
    logger.info(f"Generated {len(df):,} synthetic transactions.")
    return df


# ─── Loader ───────────────────────────────────────────────────────────────────

def load_raw_data(csv_path: Optional[Path] = None) -> Tuple[pd.DataFrame, bool]:
    """
    Load the raw ecommerce CSV.

    Returns:
        (DataFrame, is_real_data)
        is_real_data=False means SIMULATED data was used.
    """
    if csv_path is None:
        csv_path = find_raw_csv()

    if csv_path is not None and Path(csv_path).exists():
        logger.info(f"Loading real dataset from: {csv_path}")
        try:
            df = pd.read_csv(csv_path, encoding="latin-1", low_memory=False)
            logger.info(f"Loaded {len(df):,} rows × {df.shape[1]} columns.")
            return df, True
        except Exception as e:
            logger.error(f"Failed to read CSV: {e}. Falling back to sample data.")

    return generate_sample_dataset(), False


# ─── Cleaning ─────────────────────────────────────────────────────────────────

def clean_data(df: pd.DataFrame) -> pd.DataFrame:
    """
    Full cleaning pipeline:
    - Validate columns
    - Parse dates
    - Remove cancelled orders
    - Filter invalid quantities/prices
    - Handle missing values
    - Calculate Revenue
    """
    logger.info("Starting data cleaning pipeline...")

    # --- Column Validation ---
    is_valid, missing = validate_dataframe(df, EXPECTED_COLUMNS)
    if not is_valid:
        raise ValueError(f"Dataset missing columns: {missing}")

    df = df.copy()

    # --- Parse Dates ---
    df["InvoiceDate"] = pd.to_datetime(df["InvoiceDate"], errors="coerce")
    before = len(df)
    df.dropna(subset=["InvoiceDate"], inplace=True)
    logger.info(f"Dropped {before - len(df):,} rows with unparseable dates.")

    # --- Remove Cancelled Orders (InvoiceNo starts with 'C') ---
    df["InvoiceNo"] = df["InvoiceNo"].astype(str)
    cancelled_mask = df["InvoiceNo"].str.startswith("C")
    logger.info(f"Removing {cancelled_mask.sum():,} cancelled transactions.")
    df = df[~cancelled_mask]

    # --- Remove Duplicates ---
    before = len(df)
    df.drop_duplicates(inplace=True)
    logger.info(f"Removed {before - len(df):,} duplicate rows.")

    # --- Quantity Validation ---
    df["Quantity"] = pd.to_numeric(df["Quantity"], errors="coerce")
    before = len(df)
    df = df[df["Quantity"] > 0]
    logger.info(f"Removed {before - len(df):,} rows with Quantity <= 0.")

    # --- Price Validation ---
    df["UnitPrice"] = pd.to_numeric(df["UnitPrice"], errors="coerce")
    before = len(df)
    df = df[df["UnitPrice"] > 0]
    logger.info(f"Removed {before - len(df):,} rows with UnitPrice <= 0.")

    # --- StockCode Cleaning ---
    df["StockCode"] = df["StockCode"].astype(str).str.strip().str.upper()
    # Remove non-product codes (e.g. POST, DOT, BANK CHARGES, etc.)
    non_product = {"POST", "DOT", "M", "BANK CHARGES", "PADS", "AMAZONFEE",
                   "CRUK", "S", "D", "ADJUST", "ADJUST2", "TEST001", "TEST002"}
    df = df[~df["StockCode"].isin(non_product)]

    # --- Description Cleaning ---
    df["Description"] = df["Description"].astype(str).str.strip()
    df["Description"] = df["Description"].replace("nan", np.nan)
    # Forward-fill descriptions by StockCode
    desc_map = (
        df.dropna(subset=["Description"])
        .groupby("StockCode")["Description"]
        .agg(lambda x: x.mode().iloc[0] if len(x) > 0 else np.nan)
    )
    df["Description"] = df["StockCode"].map(desc_map)

    # --- Missing CustomerID ---
    # Flag but keep — CustomerID is not required for demand forecasting
    df["CustomerID"] = df["CustomerID"].astype(str).replace("nan", np.nan)
    df["has_customer_id"] = df["CustomerID"].notna()

    # --- Revenue ---
    df["Revenue"] = df["Quantity"] * df["UnitPrice"]

    logger.info(f"Cleaned dataset: {len(df):,} rows remaining.")
    return df


# ─── Aggregation ──────────────────────────────────────────────────────────────

def aggregate_daily_product(df: pd.DataFrame) -> pd.DataFrame:
    """
    Aggregate to daily product-level demand.
    Returns DataFrame indexed by (StockCode, Date).
    """
    logger.info("Aggregating to daily product-level demand...")
    df["Date"] = df["InvoiceDate"].dt.normalize()

    daily = (
        df.groupby(["StockCode", "Description", "Date"])
        .agg(
            Quantity=("Quantity", "sum"),
            Revenue=("Revenue", "sum"),
            Transactions=("InvoiceNo", "nunique"),
            UnitPrice=("UnitPrice", "mean"),
        )
        .reset_index()
    )
    daily.rename(columns={"UnitPrice": "AvgUnitPrice"}, inplace=True)
    logger.info(f"Daily aggregation: {len(daily):,} rows, "
                f"{daily['StockCode'].nunique():,} products.")
    return daily


def resample_product_timeseries(
    daily: pd.DataFrame,
    product_code: str,
    freq: str = "D",
) -> pd.DataFrame:
    """
    Resample a single product's daily series to fill missing dates with 0.
    """
    prod_df = daily[daily["StockCode"] == product_code].copy()
    if prod_df.empty:
        return prod_df

    prod_df = prod_df.set_index("Date").sort_index()
    # pandas 3.x: use 'ME' instead of 'M', 'h' instead of 'H'
    _freq = {"M": "ME", "H": "h"}.get(freq, freq)
    prod_df = prod_df.resample(_freq).agg({
        "Quantity":    "sum",
        "Revenue":     "sum",
        "Transactions": "sum",
        "AvgUnitPrice": "mean",
    })
    prod_df["Quantity"].fillna(0, inplace=True)
    prod_df["Revenue"].fillna(0, inplace=True)
    prod_df["Transactions"].fillna(0, inplace=True)
    prod_df["AvgUnitPrice"].ffill(inplace=True)
    prod_df["StockCode"] = product_code
    prod_df = prod_df.reset_index()
    return prod_df


def aggregate_total_daily(df: pd.DataFrame) -> pd.DataFrame:
    """
    Aggregate ALL products into a single daily total demand series.
    """
    df["Date"] = df["InvoiceDate"].dt.normalize()
    total = (
        df.groupby("Date")
        .agg(
            TotalQuantity=("Quantity", "sum"),
            TotalRevenue=("Revenue", "sum"),
            TotalTransactions=("InvoiceNo", "nunique"),
            UniqueProducts=("StockCode", "nunique"),
        )
        .reset_index()
        .sort_values("Date")
    )
    # Fill missing dates
    full_range = pd.date_range(total["Date"].min(), total["Date"].max(), freq="D")
    total = (
        total.set_index("Date")
        .reindex(full_range)
        .fillna(0)
        .reset_index()
        .rename(columns={"index": "Date"})
    )
    return total


def get_top_products(
    daily: pd.DataFrame,
    n: int = 50,
    by: str = "Quantity",
) -> pd.DataFrame:
    """Return the top N products by total quantity or revenue."""
    top = (
        daily.groupby(["StockCode", "Description"])[by]
        .sum()
        .reset_index()
        .sort_values(by, ascending=False)
        .head(n)
    )
    return top


# ─── Master Pipeline ──────────────────────────────────────────────────────────

def run_pipeline(csv_path: Optional[Path] = None) -> dict:
    """
    Full data pipeline. Returns a dict with all processed DataFrames.

    Returns:
        {
          "raw":         pd.DataFrame  — original loaded data
          "clean":       pd.DataFrame  — cleaned transaction data
          "daily":       pd.DataFrame  — daily product aggregation
          "total_daily": pd.DataFrame  — total daily demand
          "top_products": pd.DataFrame — top 50 products by quantity
          "is_real_data": bool
        }
    """
    raw, is_real = load_raw_data(csv_path)
    clean = clean_data(raw)
    daily = aggregate_daily_product(clean)
    total_daily = aggregate_total_daily(clean)
    top_products = get_top_products(daily, n=50)

    # Save processed data
    try:
        clean.to_parquet(DATA_PROCESSED_DIR / "clean_transactions.parquet", index=False)
        daily.to_parquet(DATA_PROCESSED_DIR / "daily_product.parquet", index=False)
        total_daily.to_parquet(DATA_PROCESSED_DIR / "total_daily.parquet", index=False)
        logger.info("Processed data saved to data/processed/")
    except Exception as e:
        logger.warning(f"Could not save processed data: {e}")

    return {
        "raw":          raw,
        "clean":        clean,
        "daily":        daily,
        "total_daily":  total_daily,
        "top_products": top_products,
        "is_real_data": is_real,
    }
