"""
src/utils.py
------------
Shared utilities: logging setup, path helpers, and common constants.
"""

import logging
import os
import sys
from pathlib import Path
from typing import Optional
import numpy as np
import pandas as pd


# ─── Project Paths ────────────────────────────────────────────────────────────

ROOT_DIR = Path(__file__).resolve().parent.parent
DATA_RAW_DIR = ROOT_DIR / "data" / "raw"
DATA_PROCESSED_DIR = ROOT_DIR / "data" / "processed"
MODELS_DIR = ROOT_DIR / "models"
LOGS_DIR = ROOT_DIR / "logs"

# Ensure directories exist
for _dir in [DATA_RAW_DIR, DATA_PROCESSED_DIR, MODELS_DIR, LOGS_DIR]:
    _dir.mkdir(parents=True, exist_ok=True)


# ─── Logging ──────────────────────────────────────────────────────────────────

def get_logger(name: str, level: str = "INFO") -> logging.Logger:
    """Configure and return a named logger."""
    logger = logging.getLogger(name)
    if logger.handlers:
        return logger  # Already configured

    logger.setLevel(getattr(logging, level.upper(), logging.INFO))

    formatter = logging.Formatter(
        fmt="%(asctime)s | %(levelname)-8s | %(name)s | %(message)s",
        datefmt="%Y-%m-%d %H:%M:%S",
    )

    # Console handler
    ch = logging.StreamHandler(sys.stdout)
    ch.setFormatter(formatter)
    logger.addHandler(ch)

    # File handler
    log_file = LOGS_DIR / "app.log"
    try:
        fh = logging.FileHandler(log_file, encoding="utf-8")
        fh.setFormatter(formatter)
        logger.addHandler(fh)
    except Exception:
        pass  # Non-fatal if log file can't be created

    return logger


# ─── Constants ────────────────────────────────────────────────────────────────

KAGGLE_CSV_NAME = "data.csv"
EXPECTED_COLUMNS = {
    "InvoiceNo", "StockCode", "Description",
    "Quantity", "InvoiceDate", "UnitPrice",
    "CustomerID", "Country",
}

# Risk thresholds (stock coverage in days)
RISK_THRESHOLDS = {
    "CRITICAL": 0,    # Already stocked out
    "HIGH": 7,        # Less than 7 days of stock
    "MEDIUM": 14,     # Less than 14 days of stock
    "LOW": float("inf"),
}

RISK_COLORS = {
    "CRITICAL": "#FF3B3B",
    "HIGH":     "#FF8C00",
    "MEDIUM":   "#FFD700",
    "LOW":      "#32CD32",
}

# Service level Z-scores for safety stock
SERVICE_LEVEL_Z = {
    0.90: 1.28,
    0.95: 1.645,
    0.99: 2.326,
}


# ─── Helpers ──────────────────────────────────────────────────────────────────

def find_raw_csv() -> Optional[Path]:
    """
    Look for the Kaggle ecommerce CSV in common locations.
    Returns Path if found, else None.
    """
    candidates = [
        DATA_RAW_DIR / "data.csv",
        DATA_RAW_DIR / "ecommerce-data.csv",
        ROOT_DIR / "data.csv",
    ]
    for p in candidates:
        if p.exists():
            return p
    return None


def validate_dataframe(df: pd.DataFrame, required_cols: set) -> tuple[bool, list]:
    """
    Check that a DataFrame has all required columns.
    Returns (is_valid, missing_columns).
    """
    missing = list(required_cols - set(df.columns))
    return len(missing) == 0, missing


def safe_mape(actual: np.ndarray, predicted: np.ndarray) -> float:
    """MAPE, ignoring zeros in actual to avoid division-by-zero."""
    mask = actual != 0
    if mask.sum() == 0:
        return np.nan
    return float(np.mean(np.abs((actual[mask] - predicted[mask]) / actual[mask])) * 100)


def smape(actual: np.ndarray, predicted: np.ndarray) -> float:
    """Symmetric Mean Absolute Percentage Error."""
    denom = (np.abs(actual) + np.abs(predicted)) / 2
    mask = denom != 0
    if mask.sum() == 0:
        return np.nan
    return float(np.mean(np.abs(actual[mask] - predicted[mask]) / denom[mask]) * 100)


def format_number(n: float, decimals: int = 0) -> str:
    """Format a number with thousands separators."""
    if np.isnan(n):
        return "N/A"
    if n >= 1_000_000:
        return f"{n/1_000_000:.1f}M"
    if n >= 1_000:
        return f"{n/1_000:.1f}K"
    return f"{n:,.{decimals}f}"


def get_date_range_str(df: pd.DataFrame, date_col: str = "InvoiceDate") -> str:
    """Return a human-readable date range string."""
    if date_col not in df.columns:
        return "Unknown"
    min_d = df[date_col].min()
    max_d = df[date_col].max()
    return f"{min_d.strftime('%d %b %Y')} → {max_d.strftime('%d %b %Y')}"
