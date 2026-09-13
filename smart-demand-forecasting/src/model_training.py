"""
src/model_training.py
---------------------
Multi-model training pipeline with time-series aware validation.

Models trained:
    1. Naive Forecast       (baseline)
    2. Moving Average       (baseline)
    3. Exponential Smoothing (statistical)
    4. Random Forest        (ML)
    5. XGBoost              (ML)
    6. LightGBM             (ML)

Model selection:
    Best model chosen by lowest RMSE on validation set.
    Models are saved to models/ directory using joblib.

⚠️  NEVER uses random train/test split — always chronological split.
"""

import warnings
warnings.filterwarnings("ignore")

import os
import pickle
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

import joblib
import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestRegressor
from sklearn.preprocessing import StandardScaler
from statsmodels.tsa.holtwinters import ExponentialSmoothing

try:
    import xgboost as xgb
    HAS_XGB = True
except ImportError:
    HAS_XGB = False

try:
    import lightgbm as lgb
    HAS_LGB = True
except ImportError:
    HAS_LGB = False

from src.evaluation import evaluate_model, compare_models, select_best_model, time_series_split
from src.feature_engineering import get_feature_columns
from src.utils import MODELS_DIR, get_logger

logger = get_logger(__name__)


# ─── Baseline Models ──────────────────────────────────────────────────────────

class NaiveForecast:
    """Naive forecast: predict last observed value."""
    def __init__(self):
        self.last_value = None
        self.name = "Naive"

    def fit(self, y: np.ndarray) -> "NaiveForecast":
        self.last_value = y[-1]
        return self

    def predict(self, n: int) -> np.ndarray:
        return np.full(n, self.last_value)


class MovingAverageForecast:
    """Moving average forecast."""
    def __init__(self, window: int = 7):
        self.window = window
        self.ma_value = None
        self.name = f"MovingAvg({window})"

    def fit(self, y: np.ndarray) -> "MovingAverageForecast":
        self.ma_value = np.mean(y[-self.window:])
        return self

    def predict(self, n: int) -> np.ndarray:
        return np.full(n, self.ma_value)


# ─── Training Functions ───────────────────────────────────────────────────────

def _prepare_xy(
    df: pd.DataFrame,
    target_col: str = "Quantity",
) -> Tuple[pd.DataFrame, pd.Series, List[str]]:
    """Extract features and target from a feature DataFrame."""
    feature_cols = get_feature_columns(df, target_col=target_col)
    feature_cols = [c for c in feature_cols if c in df.columns]
    X = df[feature_cols].fillna(0)
    y = df[target_col].fillna(0)
    return X, y, feature_cols


def train_naive(train_series: np.ndarray) -> NaiveForecast:
    model = NaiveForecast()
    model.fit(train_series)
    return model


def train_moving_average(train_series: np.ndarray, window: int = 7) -> MovingAverageForecast:
    model = MovingAverageForecast(window=window)
    model.fit(train_series)
    return model


def train_exponential_smoothing(train_series: np.ndarray) -> Any:
    """Holt-Winters Exponential Smoothing."""
    try:
        model = ExponentialSmoothing(
            train_series,
            trend="add",
            seasonal="add",
            seasonal_periods=7,
            initialization_method="estimated",
        ).fit(optimized=True, use_brute=True)
        model.name = "ExpSmoothing"
        return model
    except Exception as e:
        logger.warning(f"ExponentialSmoothing failed: {e}. Falling back to simple.")
        try:
            model = ExponentialSmoothing(
                train_series,
                trend="add",
                initialization_method="estimated",
            ).fit(optimized=True)
            model.name = "ExpSmoothing"
            return model
        except Exception as e2:
            logger.warning(f"Simple ExpSmoothing also failed: {e2}. Using naive.")
            return None


def train_random_forest(X_train: pd.DataFrame, y_train: pd.Series) -> RandomForestRegressor:
    model = RandomForestRegressor(
        n_estimators=200,
        max_depth=12,
        min_samples_leaf=5,
        n_jobs=-1,
        random_state=42,
    )
    model.fit(X_train, y_train)
    model.name = "RandomForest"
    return model


def train_xgboost(X_train: pd.DataFrame, y_train: pd.Series) -> Any:
    if not HAS_XGB:
        logger.warning("XGBoost not installed. Skipping.")
        return None
    model = xgb.XGBRegressor(
        n_estimators=300,
        max_depth=6,
        learning_rate=0.05,
        subsample=0.8,
        colsample_bytree=0.8,
        reg_alpha=0.1,
        reg_lambda=1.0,
        random_state=42,
        verbosity=0,
        n_jobs=-1,
    )
    model.fit(
        X_train, y_train,
        eval_set=[(X_train, y_train)],
        verbose=False,
    )
    model.name = "XGBoost"
    return model


def train_lightgbm(X_train: pd.DataFrame, y_train: pd.Series) -> Any:
    if not HAS_LGB:
        logger.warning("LightGBM not installed. Skipping.")
        return None
    model = lgb.LGBMRegressor(
        n_estimators=300,
        max_depth=8,
        learning_rate=0.05,
        subsample=0.8,
        colsample_bytree=0.8,
        reg_alpha=0.1,
        reg_lambda=1.0,
        random_state=42,
        verbose=-1,
        n_jobs=-1,
    )
    model.fit(X_train, y_train)
    model.name = "LightGBM"
    return model


# ─── Master Trainer ───────────────────────────────────────────────────────────

def train_all_models(
    feature_df: pd.DataFrame,
    target_col: str = "Quantity",
    date_col: str = "Date",
    test_size: float = 0.2,
    save_models: bool = True,
    model_prefix: str = "total",
) -> Dict[str, Any]:
    """
    Train all models on a feature DataFrame and return:
    - trained models dict
    - comparison DataFrame
    - best model name
    - best model object
    - feature columns used

    Args:
        feature_df   : DataFrame with features + target
        target_col   : Target column name
        date_col     : Date column
        test_size    : Fraction of data for validation (chronological)
        save_models  : Whether to persist models to disk
        model_prefix : Prefix for saved model files

    Returns dict with keys:
        models, comparison, best_model_name, best_model, feature_cols,
        train_df, test_df, X_train, X_test, y_train, y_test
    """
    logger.info(f"Starting model training for prefix='{model_prefix}'...")

    train_df, test_df = time_series_split(feature_df, test_size=test_size, date_col=date_col)

    X_train, y_train, feature_cols = _prepare_xy(train_df, target_col)
    X_test,  y_test,  _            = _prepare_xy(test_df, target_col)

    train_series = y_train.values
    test_series  = y_test.values

    all_metrics = []
    trained_models = {}

    # ── 1. Naive ──────────────────────────────────────────────────────────────
    naive = train_naive(train_series)
    naive_pred = naive.predict(len(test_series))
    metrics = evaluate_model(test_series, naive_pred, "Naive")
    all_metrics.append(metrics)
    trained_models["Naive"] = naive

    # ── 2. Moving Average ─────────────────────────────────────────────────────
    ma = train_moving_average(train_series, window=7)
    ma_pred = ma.predict(len(test_series))
    metrics = evaluate_model(test_series, ma_pred, "MovingAvg")
    all_metrics.append(metrics)
    trained_models["MovingAvg"] = ma

    # ── 3. Exponential Smoothing ──────────────────────────────────────────────
    es = train_exponential_smoothing(train_series)
    if es is not None:
        try:
            es_pred = es.forecast(len(test_series))
            es_pred = np.clip(es_pred, 0, None)
            metrics = evaluate_model(test_series, es_pred, "ExpSmoothing")
            all_metrics.append(metrics)
            trained_models["ExpSmoothing"] = es
        except Exception as e:
            logger.warning(f"ExpSmoothing prediction failed: {e}")

    # ── 4. Random Forest ──────────────────────────────────────────────────────
    if len(X_train) > 10:
        rf = train_random_forest(X_train, y_train)
        rf_pred = np.clip(rf.predict(X_test), 0, None)
        metrics = evaluate_model(test_series, rf_pred, "RandomForest")
        all_metrics.append(metrics)
        trained_models["RandomForest"] = rf
    else:
        logger.warning("Insufficient data for RandomForest.")

    # ── 5. XGBoost ────────────────────────────────────────────────────────────
    if HAS_XGB and len(X_train) > 10:
        xgb_model = train_xgboost(X_train, y_train)
        if xgb_model:
            xgb_pred = np.clip(xgb_model.predict(X_test), 0, None)
            metrics = evaluate_model(test_series, xgb_pred, "XGBoost")
            all_metrics.append(metrics)
            trained_models["XGBoost"] = xgb_model

    # ── 6. LightGBM ───────────────────────────────────────────────────────────
    if HAS_LGB and len(X_train) > 10:
        lgb_model = train_lightgbm(X_train, y_train)
        if lgb_model:
            lgb_pred = np.clip(lgb_model.predict(X_test), 0, None)
            metrics = evaluate_model(test_series, lgb_pred, "LightGBM")
            all_metrics.append(metrics)
            trained_models["LightGBM"] = lgb_model

    # ── Comparison ────────────────────────────────────────────────────────────
    comparison_df = compare_models(all_metrics)
    best_name     = select_best_model(comparison_df)
    best_model    = trained_models.get(best_name)
    logger.info(f"[BEST] Best model: {best_name}")

    # ── Save ──────────────────────────────────────────────────────────────────
    if save_models and best_model is not None:
        _save_model(best_model, best_name, model_prefix, feature_cols)

    return {
        "models":          trained_models,
        "comparison":      comparison_df,
        "best_model_name": best_name,
        "best_model":      best_model,
        "feature_cols":    feature_cols,
        "train_df":        train_df,
        "test_df":         test_df,
        "X_train":         X_train,
        "X_test":          X_test,
        "y_train":         y_train,
        "y_test":          y_test,
    }


def _save_model(model: Any, name: str, prefix: str, feature_cols: List[str]) -> None:
    """Save model and feature columns to models/ directory."""
    safe_name = name.replace(" ", "_").lower()
    model_path = MODELS_DIR / f"{prefix}_{safe_name}.joblib"
    meta_path  = MODELS_DIR / f"{prefix}_feature_cols.pkl"

    try:
        joblib.dump(model, model_path)
        with open(meta_path, "wb") as f:
            pickle.dump(feature_cols, f)
        logger.info(f"Model saved: {model_path}")
    except Exception as e:
        logger.warning(f"Could not save model: {e}")


def load_model(prefix: str, name: str) -> Tuple[Optional[Any], Optional[List[str]]]:
    """Load a saved model and its feature columns."""
    safe_name  = name.replace(" ", "_").lower()
    model_path = MODELS_DIR / f"{prefix}_{safe_name}.joblib"
    meta_path  = MODELS_DIR / f"{prefix}_feature_cols.pkl"

    model = None
    feature_cols = None

    if model_path.exists():
        try:
            model = joblib.load(model_path)
        except Exception as e:
            logger.warning(f"Could not load model {model_path}: {e}")

    if meta_path.exists():
        try:
            with open(meta_path, "rb") as f:
                feature_cols = pickle.load(f)
        except Exception as e:
            logger.warning(f"Could not load feature cols: {e}")

    return model, feature_cols
