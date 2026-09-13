"""
tests/test_forecasting.py
Tests for the forecasting engine.
"""
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

import numpy as np
import pandas as pd
import pytest

from src.data_processing import (
    generate_sample_dataset, clean_data,
    aggregate_daily_product, aggregate_total_daily,
)
from src.feature_engineering import (
    add_date_features, add_lag_features, add_rolling_features,
)
from src.forecasting import (
    forecast_total_demand, forecast_product,
    get_forecast_summary, _naive_fallback_forecast, _zero_forecast,
)
from src.evaluation import time_series_split, evaluate_model


@pytest.fixture(scope="module")
def pipeline_data():
    raw   = generate_sample_dataset(n_rows=2000, seed=42)
    clean = clean_data(raw)
    daily = aggregate_daily_product(clean)
    total = aggregate_total_daily(clean)
    return {"clean": clean, "daily": daily, "total": total}


@pytest.fixture(scope="module")
def minimal_training_result(pipeline_data):
    """Train a minimal model for testing."""
    from src.model_training import train_all_models
    total = pipeline_data["total"].copy()
    total = add_date_features(total, "Date")
    total = add_lag_features(total, "TotalQuantity", sort_col="Date")
    total = add_rolling_features(total, "TotalQuantity", sort_col="Date")
    lag_cols = [c for c in total.columns if c.startswith("lag_")]
    total.dropna(subset=lag_cols, inplace=True)

    result = train_all_models(
        total,
        target_col="TotalQuantity",
        date_col="Date",
        test_size=0.2,
        save_models=False,
    )
    return result


# ── Time Series Split ─────────────────────────────────────────────────────────

def test_time_series_split_preserves_order(pipeline_data):
    total = pipeline_data["total"]
    train, test = time_series_split(total, test_size=0.2)
    assert train["Date"].max() < test["Date"].min()


def test_time_series_split_sizes(pipeline_data):
    total = pipeline_data["total"]
    train, test = time_series_split(total, test_size=0.2)
    assert len(train) + len(test) == len(total)


# ── Evaluation Metrics ────────────────────────────────────────────────────────

def test_mae_is_nonnegative():
    actual = np.array([10.0, 20.0, 30.0])
    pred   = np.array([12.0, 18.0, 28.0])
    m      = evaluate_model(actual, pred, "Test")
    assert m["MAE"] >= 0


def test_rmse_geq_mae():
    actual = np.array([10.0, 20.0, 30.0, 40.0])
    pred   = np.array([15.0, 18.0, 25.0, 50.0])
    m      = evaluate_model(actual, pred, "Test")
    assert m["RMSE"] >= m["MAE"]


def test_perfect_prediction_zero_error():
    actual = np.array([10.0, 20.0, 30.0])
    m      = evaluate_model(actual, actual, "Perfect")
    assert m["MAE"]  == pytest.approx(0.0, abs=1e-6)
    assert m["RMSE"] == pytest.approx(0.0, abs=1e-6)


# ── Forecast Output Shape ─────────────────────────────────────────────────────

def test_total_forecast_returns_correct_horizon(pipeline_data, minimal_training_result):
    total = pipeline_data["total"]
    total_with_feats = add_date_features(total.copy(), "Date")
    total_with_feats = add_lag_features(total_with_feats, "TotalQuantity", sort_col="Date")
    total_with_feats = add_rolling_features(total_with_feats, "TotalQuantity", sort_col="Date")
    lag_cols = [c for c in total_with_feats.columns if c.startswith("lag_")]
    total_with_feats.dropna(subset=lag_cols, inplace=True)

    for horizon in [7, 14, 30]:
        fc = forecast_total_demand(
            total_with_feats, minimal_training_result, horizon=horizon
        )
        assert len(fc) == horizon, f"Expected {horizon} rows, got {len(fc)}"


def test_forecast_has_required_columns(pipeline_data, minimal_training_result):
    total = pipeline_data["total"]
    total_with_feats = add_date_features(total.copy(), "Date")
    total_with_feats = add_lag_features(total_with_feats, "TotalQuantity", sort_col="Date")
    total_with_feats = add_rolling_features(total_with_feats, "TotalQuantity", sort_col="Date")
    lag_cols = [c for c in total_with_feats.columns if c.startswith("lag_")]
    total_with_feats.dropna(subset=lag_cols, inplace=True)

    fc = forecast_total_demand(total_with_feats, minimal_training_result, horizon=7)
    for col in ["Date", "predicted_demand", "lower_bound", "upper_bound"]:
        assert col in fc.columns


def test_forecast_nonnegative(pipeline_data, minimal_training_result):
    total = pipeline_data["total"]
    total_with_feats = add_date_features(total.copy(), "Date")
    total_with_feats = add_lag_features(total_with_feats, "TotalQuantity", sort_col="Date")
    total_with_feats = add_rolling_features(total_with_feats, "TotalQuantity", sort_col="Date")
    lag_cols = [c for c in total_with_feats.columns if c.startswith("lag_")]
    total_with_feats.dropna(subset=lag_cols, inplace=True)

    fc = forecast_total_demand(total_with_feats, minimal_training_result, horizon=7)
    assert (fc["predicted_demand"] >= 0).all()
    assert (fc["lower_bound"] >= 0).all()


# ── Fallback Functions ────────────────────────────────────────────────────────

def test_zero_forecast_shape():
    fc = _zero_forecast(14)
    assert len(fc) == 14
    assert (fc["predicted_demand"] == 0).all()


def test_naive_fallback(pipeline_data):
    total = pipeline_data["total"]
    fc = _naive_fallback_forecast(total, horizon=7,
                                  target_col="TotalQuantity", date_col="Date")
    assert len(fc) == 7
    assert "predicted_demand" in fc.columns


# ── Forecast Summary ─────────────────────────────────────────────────────────

def test_forecast_summary_keys():
    fc = pd.DataFrame({
        "Date": pd.date_range("2025-01-01", periods=7),
        "predicted_demand": [10, 20, 30, 15, 25, 35, 40],
        "lower_bound": [5]*7,
        "upper_bound": [50]*7,
    })
    summary = get_forecast_summary(fc)
    assert "total" in summary
    assert "daily_avg" in summary
    assert summary["total"] == pytest.approx(175.0)
