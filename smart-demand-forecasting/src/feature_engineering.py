"""
src/feature_engineering.py
---------------------------
Creates ML-ready features from cleaned time-series data.

Feature groups:
  - Date / calendar features
  - Lag features (demand from past periods)
  - Rolling statistics (smoothed demand signals)
  - Business features (revenue, price, frequency)
"""

from typing import List, Optional
import numpy as np
import pandas as pd

from src.utils import get_logger

logger = get_logger(__name__)


# ─── Date Features ────────────────────────────────────────────────────────────

def add_date_features(df: pd.DataFrame, date_col: str = "Date") -> pd.DataFrame:
    """
    Add calendar-based date features.

    New columns:
        year, month, week, day, day_of_week, day_of_year,
        quarter, is_weekend, is_month_start, is_month_end,
        days_in_month
    """
    df = df.copy()
    dt = pd.to_datetime(df[date_col])

    df["year"]          = dt.dt.year
    df["month"]         = dt.dt.month
    df["week"]          = dt.dt.isocalendar().week.astype(int)
    df["day"]           = dt.dt.day
    df["day_of_week"]   = dt.dt.dayofweek          # 0=Monday
    df["day_of_year"]   = dt.dt.dayofyear
    df["quarter"]       = dt.dt.quarter
    df["is_weekend"]    = (dt.dt.dayofweek >= 5).astype(int)
    df["is_month_start"] = dt.dt.is_month_start.astype(int)
    df["is_month_end"]   = dt.dt.is_month_end.astype(int)
    df["days_in_month"]  = dt.dt.days_in_month

    return df


# ─── Lag Features ─────────────────────────────────────────────────────────────

def add_lag_features(
    df: pd.DataFrame,
    target_col: str = "Quantity",
    lags: List[int] = [1, 7, 14, 28],
    sort_col: str = "Date",
) -> pd.DataFrame:
    """
    Add lag features for a time-series column.
    Must be called on a single product's series (already sorted by date).
    """
    df = df.copy().sort_values(sort_col)
    for lag in lags:
        df[f"lag_{lag}"] = df[target_col].shift(lag)
    return df


# ─── Rolling Statistics ───────────────────────────────────────────────────────

def add_rolling_features(
    df: pd.DataFrame,
    target_col: str = "Quantity",
    windows: List[int] = [7, 14, 28],
    sort_col: str = "Date",
) -> pd.DataFrame:
    """
    Add rolling mean and std features.
    min_periods=1 avoids NaN at the start of the series.
    """
    df = df.copy().sort_values(sort_col)
    for w in windows:
        df[f"rolling_mean_{w}"] = (
            df[target_col].shift(1).rolling(window=w, min_periods=1).mean()
        )
        df[f"rolling_std_{w}"]  = (
            df[target_col].shift(1).rolling(window=w, min_periods=1).std().fillna(0)
        )
    return df


# ─── Business Features ────────────────────────────────────────────────────────

def add_business_features(
    df: pd.DataFrame,
    daily_all: pd.DataFrame,
    product_code: str,
) -> pd.DataFrame:
    """
    Compute business-level features:
    - avg_unit_price  : mean price per unit
    - purchase_freq   : number of distinct transaction days
    - demand_freq     : proportion of days with non-zero demand
    """
    df = df.copy()
    if "StockCode" in daily_all.columns:
        prod = daily_all[daily_all["StockCode"] == product_code]
    else:
        prod = daily_all

    avg_price       = prod["AvgUnitPrice"].mean() if "AvgUnitPrice" in prod.columns else 0.0
    total_days      = len(prod)
    non_zero_days   = (prod["Quantity"] > 0).sum() if total_days > 0 and "Quantity" in prod.columns else 0

    df["avg_unit_price"] = avg_price
    df["demand_freq"]    = non_zero_days / max(total_days, 1)

    # Rolling revenue proxy
    if "Revenue" in df.columns:
        df["rolling_revenue_7"] = (
            df["Revenue"].shift(1).rolling(window=7, min_periods=1).mean()
        )

    return df


# ─── Outlier Detection ────────────────────────────────────────────────────────

def detect_outliers_iqr(
    df: pd.DataFrame,
    col: str = "Quantity",
    factor: float = 3.0,
) -> pd.Series:
    """
    Flag outliers using IQR method.
    Returns boolean Series: True = outlier.
    """
    Q1 = df[col].quantile(0.25)
    Q3 = df[col].quantile(0.75)
    IQR = Q3 - Q1
    lower = Q1 - factor * IQR
    upper = Q3 + factor * IQR
    return (df[col] < lower) | (df[col] > upper)


def cap_outliers(
    df: pd.DataFrame,
    col: str = "Quantity",
    factor: float = 3.0,
) -> pd.DataFrame:
    """Winsorize outliers at IQR bounds."""
    df = df.copy()
    Q1 = df[col].quantile(0.25)
    Q3 = df[col].quantile(0.75)
    IQR = Q3 - Q1
    lower = Q1 - factor * IQR
    upper = Q3 + factor * IQR
    n_capped = ((df[col] < lower) | (df[col] > upper)).sum()
    df[col] = df[col].clip(lower, upper)
    logger.info(f"Capped {n_capped} outliers in '{col}'.")
    return df


# ─── Master Feature Builder ───────────────────────────────────────────────────

def build_features(
    product_ts: pd.DataFrame,
    daily_all: pd.DataFrame,
    product_code: str,
    target_col: str = "Quantity",
    date_col: str = "Date",
    festival_df: Optional[pd.DataFrame] = None,
) -> pd.DataFrame:
    """
    Full feature pipeline for a single product's time-series.

    Args:
        product_ts   : Resampled daily series for this product
        daily_all    : Full daily aggregation (all products)
        product_code : StockCode
        target_col   : Column to build features from
        date_col     : Date column name
        festival_df  : Optional festival features DataFrame (from festival_features.py)

    Returns:
        Feature-rich DataFrame ready for ML training.
    """
    df = product_ts.copy()

    # 1. Outlier capping
    df = cap_outliers(df, col=target_col)

    # 2. Date features
    df = add_date_features(df, date_col=date_col)

    # 3. Lag features
    df = add_lag_features(df, target_col=target_col)

    # 4. Rolling features
    df = add_rolling_features(df, target_col=target_col)

    # 5. Business features
    df = add_business_features(df, daily_all, product_code)

    # 6. Festival features (merge if provided)
    if festival_df is not None and not festival_df.empty:
        fest_cols = [c for c in festival_df.columns if c != date_col]
        df = df.merge(
            festival_df[[date_col] + fest_cols],
            on=date_col,
            how="left",
        )
        # Fill missing festival features
        for col in ["is_festival", "festival_window", "days_to_festival", "days_after_festival"]:
            if col in df.columns:
                df[col] = df[col].fillna(0)
        for col in ["festival_name", "festival_category"]:
            if col in df.columns:
                df[col] = df[col].fillna("None")

    # 7. Drop rows where lags are NaN (start of series)
    lag_cols = [c for c in df.columns if c.startswith("lag_")]
    df.dropna(subset=lag_cols, inplace=True)

    logger.debug(f"Built features for {product_code}: {df.shape}")
    return df


def get_feature_columns(df: pd.DataFrame, target_col: str = "Quantity") -> List[str]:
    """
    Return ML feature columns (excludes target, dates, IDs, text).
    """
    exclude = {
        target_col, "Date", "InvoiceDate", "StockCode",
        "Description", "Country", "festival_name", "festival_category",
        "has_customer_id", "Revenue", "Transactions",
    }
    feature_cols = [
        c for c in df.columns
        if c not in exclude and df[c].dtype in [np.float64, np.int64, np.float32, np.int32]
    ]
    return feature_cols
