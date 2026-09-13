"""
src/forecasting.py
------------------
Forecasting engine — generates future demand predictions.

Public API:
    forecast_product(product_id, horizon, ...)
    forecast_category(category, horizon, ...)
    forecast_total_demand(horizon, ...)

All functions return a DataFrame with columns:
    Date, predicted_demand, lower_bound, upper_bound

Prediction intervals are computed via bootstrap residuals.
"""

import warnings
warnings.filterwarnings("ignore")

from typing import Any, Dict, List, Optional, Tuple
import numpy as np
import pandas as pd

from src.data_processing import resample_product_timeseries
from src.feature_engineering import build_features, get_feature_columns, add_date_features
from src.festival_features import build_festival_calendar
from src.utils import get_logger

logger = get_logger(__name__)

# Forecast horizons (in days)
VALID_HORIZONS = [7, 14, 30, 60]


# ─── Prediction Interval Helper ───────────────────────────────────────────────

def _bootstrap_intervals(
    predictions: np.ndarray,
    residuals: np.ndarray,
    confidence: float = 0.90,
    n_bootstrap: int = 500,
    seed: int = 42,
) -> Tuple[np.ndarray, np.ndarray]:
    """
    Bootstrap-based prediction intervals.
    Samples from historical residuals to estimate forecast uncertainty.
    """
    rng = np.random.default_rng(seed)
    residuals = np.array(residuals)
    n = len(predictions)
    bootstrap_preds = np.zeros((n_bootstrap, n))

    for i in range(n_bootstrap):
        sampled_residuals = rng.choice(residuals, size=n, replace=True)
        bootstrap_preds[i] = predictions + sampled_residuals

    alpha = (1 - confidence) / 2
    lower = np.percentile(bootstrap_preds, alpha * 100, axis=0)
    upper = np.percentile(bootstrap_preds, (1 - alpha) * 100, axis=0)
    lower = np.clip(lower, 0, None)
    return lower, upper


def _growing_intervals(
    predictions: np.ndarray,
    base_std: float,
    scale_factor: float = 0.05,
) -> Tuple[np.ndarray, np.ndarray]:
    """
    Fallback: linearly growing intervals (uncertainty grows with horizon).
    """
    n = len(predictions)
    growing_std = base_std * (1 + scale_factor * np.arange(n))
    lower = np.clip(predictions - 1.645 * growing_std, 0, None)
    upper = predictions + 1.645 * growing_std
    return lower, upper


# ─── Future Feature Builder ───────────────────────────────────────────────────

def _build_future_features(
    last_date: pd.Timestamp,
    horizon: int,
    last_known: pd.Series,
    feature_cols: List[str],
    festival_calendar: Optional[pd.DataFrame] = None,
) -> pd.DataFrame:
    """
    Build feature rows for future dates.
    Uses last known values for lag/rolling features (iterative forecast).
    """
    future_dates = pd.date_range(
        start=last_date + pd.Timedelta(days=1),
        periods=horizon,
        freq="D",
    )

    future_df = pd.DataFrame({"Date": future_dates})
    future_df = add_date_features(future_df, date_col="Date")

    # Fill lag/rolling features with last known values or recent mean
    for col in feature_cols:
        if col not in future_df.columns:
            future_df[col] = last_known.get(col, 0)

    # Merge festival features if available
    if festival_calendar is not None and not festival_calendar.empty:
        fest_cols = [c for c in festival_calendar.columns
                     if c not in ("Date",) and c not in future_df.columns]
        future_df = future_df.merge(
            festival_calendar[["Date"] + fest_cols],
            on="Date",
            how="left",
        )
        for col in ["is_festival", "festival_window", "days_to_festival", "days_after_festival"]:
            if col in future_df.columns:
                future_df[col] = future_df[col].fillna(0)

    # Ensure all required features are present
    for col in feature_cols:
        if col not in future_df.columns:
            future_df[col] = 0

    future_df = future_df[["Date"] + feature_cols].fillna(0)
    return future_df


# ─── Core Forecast Function ───────────────────────────────────────────────────

def _ml_forecast(
    model: Any,
    feature_df: pd.DataFrame,
    target_col: str,
    horizon: int,
    feature_cols: List[str],
    train_residuals: Optional[np.ndarray] = None,
    festival_calendar: Optional[pd.DataFrame] = None,
) -> pd.DataFrame:
    """
    Generate ML-based forecast with prediction intervals.
    """
    last_date    = feature_df["Date"].max()
    last_row     = feature_df.iloc[-1]
    last_known   = last_row[feature_cols] if all(c in last_row for c in feature_cols) else pd.Series()

    future_df    = _build_future_features(
        last_date, horizon, last_known, feature_cols, festival_calendar
    )
    X_future     = future_df[feature_cols].fillna(0)

    try:
        raw_preds = np.clip(model.predict(X_future), 0, None)
    except Exception as e:
        logger.warning(f"ML predict failed: {e}. Using mean baseline.")
        raw_preds = np.full(horizon, feature_df[target_col].mean())

    # Prediction intervals
    if train_residuals is not None and len(train_residuals) >= 10:
        lower, upper = _bootstrap_intervals(raw_preds, train_residuals)
    else:
        base_std = feature_df[target_col].std()
        lower, upper = _growing_intervals(raw_preds, base_std if base_std > 0 else 1.0)

    result = pd.DataFrame({
        "Date":             future_df["Date"],
        "predicted_demand": raw_preds.round(1),
        "lower_bound":      lower.round(1),
        "upper_bound":      upper.round(1),
    })
    return result


def _statistical_forecast(
    model: Any,
    horizon: int,
    train_series: np.ndarray,
    model_name: str,
) -> pd.DataFrame:
    """
    Generate statistical model forecast (Naive / MovingAvg / ExpSmoothing).
    """
    raise NotImplementedError


# ─── Public API ───────────────────────────────────────────────────────────────

def forecast_total_demand(
    total_daily: pd.DataFrame,
    training_result: Dict,
    horizon: int = 30,
    festival_calendar: Optional[pd.DataFrame] = None,
    date_col: str = "Date",
    target_col: str = "TotalQuantity",
) -> pd.DataFrame:
    """
    Forecast total store-wide demand for `horizon` days.

    Args:
        total_daily      : Daily aggregated total demand DataFrame
        training_result  : Output of model_training.train_all_models()
        horizon          : Days to forecast (7, 14, 30, or 60)
        festival_calendar: Optional festival features DataFrame

    Returns:
        DataFrame with columns: Date, predicted_demand, lower_bound, upper_bound
    """
    horizon = int(np.clip(horizon, 7, 60))
    best_model    = training_result.get("best_model")
    feature_cols  = training_result.get("feature_cols", [])
    feature_df    = training_result.get("train_df", pd.DataFrame())

    if feature_df.empty or best_model is None:
        logger.warning("No trained model available for total forecast. Using naive.")
        return _naive_fallback_forecast(total_daily, horizon, target_col, date_col)

    # Compute residuals from validation
    X_test = training_result.get("X_test")
    y_test = training_result.get("y_test")
    train_residuals = None
    if X_test is not None and y_test is not None and len(X_test) > 0:
        try:
            val_preds = np.clip(best_model.predict(X_test[feature_cols].fillna(0)), 0, None)
            train_residuals = y_test.values - val_preds
        except Exception:
            pass

    # Need feature_df with target for last-known values
    full_feature_df = training_result.get("train_df", feature_df)

    result = _ml_forecast(
        model=best_model,
        feature_df=full_feature_df,
        target_col=target_col,
        horizon=horizon,
        feature_cols=feature_cols,
        train_residuals=train_residuals,
        festival_calendar=festival_calendar,
    )
    return result


def forecast_product(
    product_code: str,
    daily_all: pd.DataFrame,
    training_result: Dict,
    horizon: int = 14,
    festival_calendar: Optional[pd.DataFrame] = None,
    date_col: str = "Date",
    target_col: str = "Quantity",
) -> pd.DataFrame:
    """
    Forecast demand for a specific product.

    Args:
        product_code   : StockCode identifier
        daily_all      : Full daily product aggregation
        training_result: Output of model_training.train_all_models()
        horizon        : Days to forecast

    Returns:
        DataFrame: Date, predicted_demand, lower_bound, upper_bound
    """
    horizon = int(np.clip(horizon, 7, 60))
    product_ts = resample_product_timeseries(daily_all, product_code)

    if product_ts.empty:
        logger.warning(f"No data for product {product_code}. Using zero forecast.")
        return _zero_forecast(horizon)

    best_model   = training_result.get("best_model")
    feature_cols = training_result.get("feature_cols", [])

    if best_model is None or not feature_cols:
        return _naive_fallback_forecast(product_ts, horizon, target_col, date_col)

    # Build features for this product
    try:
        from src.feature_engineering import build_features
        feature_df = build_features(
            product_ts, daily_all, product_code,
            target_col=target_col,
            festival_df=festival_calendar,
        )
    except Exception as e:
        logger.warning(f"Feature building failed for {product_code}: {e}")
        return _naive_fallback_forecast(product_ts, horizon, target_col, date_col)

    if feature_df.empty or len(feature_df) < 5:
        return _naive_fallback_forecast(product_ts, horizon, target_col, date_col)

    train_residuals = None
    try:
        X_all, y_all, _ = _prepare_product_xy(feature_df, target_col, feature_cols)
        if len(X_all) > 5:
            preds = np.clip(best_model.predict(X_all), 0, None)
            train_residuals = y_all.values - preds
    except Exception:
        pass

    result = _ml_forecast(
        model=best_model,
        feature_df=feature_df,
        target_col=target_col,
        horizon=horizon,
        feature_cols=feature_cols,
        train_residuals=train_residuals,
        festival_calendar=festival_calendar,
    )
    return result


def forecast_category(
    category: str,
    daily_all: pd.DataFrame,
    product_descriptions: Dict[str, str],
    training_result: Dict,
    horizon: int = 14,
    festival_calendar: Optional[pd.DataFrame] = None,
) -> pd.DataFrame:
    """
    Forecast demand for all products in a category (keyword match).
    Aggregates individual product forecasts.
    """
    horizon = int(np.clip(horizon, 7, 60))
    keyword = category.lower().strip()

    matching_codes = [
        code for code, desc in product_descriptions.items()
        if keyword in str(desc).lower()
    ]

    if not matching_codes:
        logger.warning(f"No products found for category '{category}'.")
        return _zero_forecast(horizon)

    all_forecasts = []
    for code in matching_codes[:20]:  # Cap at 20 products
        try:
            fc = forecast_product(
                code, daily_all, training_result, horizon, festival_calendar
            )
            all_forecasts.append(fc)
        except Exception:
            continue

    if not all_forecasts:
        return _zero_forecast(horizon)

    combined = all_forecasts[0].copy()
    for fc in all_forecasts[1:]:
        combined["predicted_demand"] += fc["predicted_demand"]
        combined["lower_bound"]      += fc["lower_bound"]
        combined["upper_bound"]      += fc["upper_bound"]

    return combined


# ─── Utility Helpers ──────────────────────────────────────────────────────────

def _prepare_product_xy(
    feature_df: pd.DataFrame,
    target_col: str,
    feature_cols: List[str],
) -> Tuple[pd.DataFrame, pd.Series, List[str]]:
    available = [c for c in feature_cols if c in feature_df.columns]
    X = feature_df[available].fillna(0)
    y = feature_df[target_col].fillna(0)
    return X, y, available


def _naive_fallback_forecast(
    ts_df: pd.DataFrame,
    horizon: int,
    target_col: str,
    date_col: str,
) -> pd.DataFrame:
    """Simple moving average fallback when model is unavailable."""
    if target_col not in ts_df.columns or ts_df.empty:
        return _zero_forecast(horizon)

    last_date = pd.to_datetime(ts_df[date_col]).max()
    recent    = ts_df[target_col].tail(14)
    mean_val  = recent.mean()
    std_val   = recent.std() if len(recent) > 1 else mean_val * 0.2

    future_dates = pd.date_range(last_date + pd.Timedelta(days=1), periods=horizon)
    preds        = np.full(horizon, mean_val)
    lower        = np.clip(preds - 1.645 * std_val, 0, None)
    upper        = preds + 1.645 * std_val

    return pd.DataFrame({
        "Date":             future_dates,
        "predicted_demand": preds.round(1),
        "lower_bound":      lower.round(1),
        "upper_bound":      upper.round(1),
    })


def _zero_forecast(horizon: int) -> pd.DataFrame:
    """Return a zero forecast DataFrame."""
    future_dates = pd.date_range(
        start=pd.Timestamp.now().normalize() + pd.Timedelta(days=1),
        periods=horizon,
    )
    return pd.DataFrame({
        "Date":             future_dates,
        "predicted_demand": np.zeros(horizon),
        "lower_bound":      np.zeros(horizon),
        "upper_bound":      np.zeros(horizon),
    })


def get_forecast_summary(forecast_df: pd.DataFrame) -> Dict:
    """Compute summary statistics from a forecast DataFrame."""
    if forecast_df.empty:
        return {"total": 0, "daily_avg": 0, "peak_day": None, "peak_demand": 0}

    total       = forecast_df["predicted_demand"].sum()
    daily_avg   = forecast_df["predicted_demand"].mean()
    peak_idx    = forecast_df["predicted_demand"].idxmax()
    peak_day    = forecast_df.loc[peak_idx, "Date"]
    peak_demand = forecast_df.loc[peak_idx, "predicted_demand"]

    return {
        "total":        round(total, 0),
        "daily_avg":    round(daily_avg, 1),
        "peak_day":     peak_day,
        "peak_demand":  round(peak_demand, 1),
    }
