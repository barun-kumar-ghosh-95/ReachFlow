"""
src/evaluation.py
-----------------
Model evaluation metrics for time-series forecasting.

Metrics:
    MAE   - Mean Absolute Error
    RMSE  - Root Mean Squared Error
    MAPE  - Mean Absolute Percentage Error
    sMAPE - Symmetric Mean Absolute Percentage Error
"""

from typing import Dict, Optional
import numpy as np
import pandas as pd

from src.utils import get_logger, safe_mape, smape

logger = get_logger(__name__)


def mean_absolute_error(actual: np.ndarray, predicted: np.ndarray) -> float:
    """MAE: Average absolute difference."""
    return float(np.mean(np.abs(actual - predicted)))


def root_mean_squared_error(actual: np.ndarray, predicted: np.ndarray) -> float:
    """RMSE: Square root of average squared difference."""
    return float(np.sqrt(np.mean((actual - predicted) ** 2)))


def mean_absolute_percentage_error(actual: np.ndarray, predicted: np.ndarray) -> float:
    """MAPE: Percentage error, skipping zero actuals."""
    return safe_mape(actual, predicted)


def symmetric_mape(actual: np.ndarray, predicted: np.ndarray) -> float:
    """sMAPE: Symmetric percentage error."""
    return smape(actual, predicted)


def evaluate_model(
    actual: np.ndarray,
    predicted: np.ndarray,
    model_name: str = "Model",
) -> Dict[str, float]:
    """
    Compute all metrics for a single model.

    Returns:
        {"model": str, "MAE": float, "RMSE": float, "MAPE": float, "sMAPE": float}
    """
    actual    = np.array(actual, dtype=float)
    predicted = np.array(predicted, dtype=float)

    metrics = {
        "Model": model_name,
        "MAE":   round(mean_absolute_error(actual, predicted), 2),
        "RMSE":  round(root_mean_squared_error(actual, predicted), 2),
        "MAPE":  round(mean_absolute_percentage_error(actual, predicted), 2),
        "sMAPE": round(symmetric_mape(actual, predicted), 2),
    }
    logger.info(
        f"{model_name}: MAE={metrics['MAE']:.2f}, "
        f"RMSE={metrics['RMSE']:.2f}, "
        f"MAPE={metrics['MAPE']:.2f}%, "
        f"sMAPE={metrics['sMAPE']:.2f}%"
    )
    return metrics


def compare_models(results: list) -> pd.DataFrame:
    """
    Build a comparison table from a list of metric dicts.
    Ranks models by RMSE (lower is better).
    Adds a Rank column and marks the Best Model.
    """
    df = pd.DataFrame(results)
    if df.empty:
        return df

    df = df.sort_values("RMSE").reset_index(drop=True)
    df["Rank"] = df.index + 1
    df["Best"] = df["Rank"] == 1

    return df


def select_best_model(comparison_df: pd.DataFrame) -> str:
    """Return the name of the best-performing model."""
    if comparison_df.empty:
        return "XGBoost"
    best_row = comparison_df.sort_values("RMSE").iloc[0]
    return best_row["Model"]


def time_series_split(
    df: pd.DataFrame,
    test_size: float = 0.2,
    date_col: str = "Date",
) -> tuple:
    """
    Split a time-series DataFrame into train/test using chronological order.
    NEVER uses random split — preserves temporal ordering.

    Returns:
        (train_df, test_df)
    """
    df_sorted = df.sort_values(date_col).reset_index(drop=True)
    split_idx = int(len(df_sorted) * (1 - test_size))
    train = df_sorted.iloc[:split_idx]
    test  = df_sorted.iloc[split_idx:]
    logger.info(
        f"Train: {len(train)} rows ({train[date_col].min().date()} -> "
        f"{train[date_col].max().date()}), "
        f"Test: {len(test)} rows ({test[date_col].min().date()} -> "
        f"{test[date_col].max().date()})"
    )
    return train, test
