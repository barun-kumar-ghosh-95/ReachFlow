"""
tests/test_data_processing.py
Tests for the ETL pipeline.
"""
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

import numpy as np
import pandas as pd
import pytest

from src.data_processing import (
    clean_data,
    aggregate_daily_product,
    aggregate_total_daily,
    generate_sample_dataset,
    get_top_products,
)


@pytest.fixture
def raw_sample():
    """Generate a small synthetic dataset for testing."""
    return generate_sample_dataset(n_rows=1000, seed=0)


@pytest.fixture
def clean_sample(raw_sample):
    return clean_data(raw_sample)


# ── Dataset Generation ────────────────────────────────────────────────────────

def test_generate_sample_has_expected_columns(raw_sample):
    expected = {"InvoiceNo","StockCode","Description","Quantity",
                "InvoiceDate","UnitPrice","CustomerID","Country"}
    assert expected.issubset(set(raw_sample.columns))


def test_generate_sample_positive_row_count(raw_sample):
    assert len(raw_sample) > 0


# ── Cleaning ─────────────────────────────────────────────────────────────────

def test_clean_removes_cancelled(clean_sample):
    """No InvoiceNo starting with 'C' should remain."""
    assert not clean_sample["InvoiceNo"].str.startswith("C").any()


def test_clean_removes_non_positive_quantity(clean_sample):
    assert (clean_sample["Quantity"] > 0).all()


def test_clean_removes_non_positive_price(clean_sample):
    assert (clean_sample["UnitPrice"] > 0).all()


def test_clean_revenue_column_exists(clean_sample):
    assert "Revenue" in clean_sample.columns


def test_clean_revenue_non_negative(clean_sample):
    assert (clean_sample["Revenue"] >= 0).all()


def test_clean_invoice_date_parsed(clean_sample):
    assert pd.api.types.is_datetime64_any_dtype(clean_sample["InvoiceDate"])


def test_clean_no_duplicate_rows(clean_sample):
    assert clean_sample.duplicated().sum() == 0


# ── Aggregation ───────────────────────────────────────────────────────────────

def test_daily_aggregation_returns_dataframe(clean_sample):
    daily = aggregate_daily_product(clean_sample)
    assert isinstance(daily, pd.DataFrame)
    assert len(daily) > 0


def test_daily_aggregation_has_required_cols(clean_sample):
    daily = aggregate_daily_product(clean_sample)
    for col in ["StockCode","Date","Quantity","Revenue"]:
        assert col in daily.columns, f"Missing column: {col}"


def test_total_daily_quantity_nonnegative(clean_sample):
    total = aggregate_total_daily(clean_sample)
    assert (total["TotalQuantity"] >= 0).all()


def test_top_products_returns_n_rows(clean_sample):
    daily = aggregate_daily_product(clean_sample)
    top = get_top_products(daily, n=5)
    assert len(top) <= 5


def test_top_products_sorted_descending(clean_sample):
    daily = aggregate_daily_product(clean_sample)
    top = get_top_products(daily, n=10)
    assert top["Quantity"].is_monotonic_decreasing


# ── Edge Cases ────────────────────────────────────────────────────────────────

def test_clean_handles_all_cancelled():
    """If all rows are cancelled, output should be empty."""
    df = generate_sample_dataset(n_rows=100, seed=1)
    df["InvoiceNo"] = "C" + df["InvoiceNo"].astype(str)
    cleaned = clean_data(df)
    assert len(cleaned) == 0
