"""
src/inventory.py
----------------
Inventory Intelligence Engine.

⚠️  SIMULATED INVENTORY LAYER:
    The Kaggle ecommerce dataset contains transaction data ONLY.
    It does NOT include stock levels, warehouse data, or reorder records.
    All inventory-related values (stock levels, lead times) are SIMULATED
    using statistical derivation from historical demand patterns.
    These are clearly labeled in the UI.

Calculations:
    Safety Stock    = Z × σ_demand × √(lead_time_days)
    Reorder Point   = (avg_daily_demand × lead_time_days) + safety_stock
    Stockout Risk   = days of coverage remaining vs lead time
    Order Qty       = (target_days_of_stock × avg_daily_demand) - current_stock
    Coverage Days   = estimated_stock / avg_daily_demand

Risk Levels:
    CRITICAL  : Stock <= 0 (already out)
    HIGH      : Coverage < lead_time (stockout within lead time)
    MEDIUM    : Coverage < 2× lead time
    LOW       : Adequate coverage
"""

from typing import Dict, List, Optional
import numpy as np
import pandas as pd

from src.utils import (
    RISK_COLORS,
    RISK_THRESHOLDS,
    SERVICE_LEVEL_Z,
    get_logger,
)

logger = get_logger(__name__)


# ─── Constants ────────────────────────────────────────────────────────────────

DEFAULT_LEAD_TIME     = 7     # days
DEFAULT_SERVICE_LEVEL = 0.95  # 95% service level
DEFAULT_TARGET_DAYS   = 30    # target days of stock to hold
STOCK_MULTIPLIER      = 1.5   # simulated stock = 1.5× last-period avg demand


# ─── Stock Simulation ─────────────────────────────────────────────────────────

def simulate_current_stock(
    avg_daily_demand: float,
    lookback_days: int = 30,
    multiplier: float = STOCK_MULTIPLIER,
    seed_offset: int = 0,
) -> float:
    """
    ⚠️  [SIMULATED] Estimate current stock from historical demand.

    Logic: Assume the retailer holds between 0.5× and 2.5× of
    recent average monthly demand, randomized per product.
    This mimics realistic variability in stock positions.
    """
    base_stock = avg_daily_demand * lookback_days * multiplier
    # Add product-specific variability (deterministic based on seed_offset)
    rng = np.random.default_rng(seed=abs(hash(seed_offset)) % (2**31))
    factor = rng.uniform(0.3, 2.0)
    return max(0.0, round(base_stock * factor, 0))


# ─── Safety Stock ─────────────────────────────────────────────────────────────

def calculate_safety_stock(
    demand_std_daily: float,
    lead_time_days: int = DEFAULT_LEAD_TIME,
    service_level: float = DEFAULT_SERVICE_LEVEL,
) -> float:
    """
    Safety Stock = Z × σ_demand × √(lead_time)

    Args:
        demand_std_daily: Standard deviation of daily demand
        lead_time_days  : Supplier lead time in days
        service_level   : Desired service level (0.90 / 0.95 / 0.99)

    Returns:
        Safety stock quantity (units)
    """
    z = SERVICE_LEVEL_Z.get(service_level, 1.645)
    safety_stock = z * demand_std_daily * np.sqrt(lead_time_days)
    return max(0.0, round(safety_stock, 1))


# ─── Reorder Point ────────────────────────────────────────────────────────────

def calculate_reorder_point(
    avg_daily_demand: float,
    lead_time_days: int = DEFAULT_LEAD_TIME,
    safety_stock: float = 0.0,
) -> float:
    """
    Reorder Point (ROP) = (avg_daily_demand × lead_time) + safety_stock

    The ROP triggers a reorder when stock falls to this level.
    """
    rop = (avg_daily_demand * lead_time_days) + safety_stock
    return round(rop, 1)


# ─── Risk Classification ──────────────────────────────────────────────────────

def classify_stockout_risk(
    current_stock: float,
    avg_daily_demand: float,
    lead_time_days: int = DEFAULT_LEAD_TIME,
) -> str:
    """
    Determine stockout risk level.

    Returns: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW"
    """
    if avg_daily_demand <= 0:
        return "LOW"

    coverage_days = current_stock / avg_daily_demand

    if coverage_days <= 0:
        return "CRITICAL"
    elif coverage_days < lead_time_days:
        return "HIGH"
    elif coverage_days < lead_time_days * 2:
        return "MEDIUM"
    else:
        return "LOW"


def classify_overstock_risk(
    current_stock: float,
    avg_daily_demand: float,
    target_days: int = DEFAULT_TARGET_DAYS,
) -> str:
    """Determine overstock risk level."""
    if avg_daily_demand <= 0:
        return "LOW"
    coverage_days = current_stock / avg_daily_demand
    if coverage_days > target_days * 2:
        return "HIGH"
    elif coverage_days > target_days * 1.5:
        return "MEDIUM"
    else:
        return "LOW"


# ─── Order Quantity ───────────────────────────────────────────────────────────

def calculate_order_quantity(
    forecast_demand: float,
    current_stock: float,
    safety_stock: float,
    target_days: int = DEFAULT_TARGET_DAYS,
    avg_daily_demand: float = 0.0,
) -> float:
    """
    Recommended order quantity to reach target stock level.

    Logic:
        target_stock  = (avg_daily_demand × target_days) + safety_stock
        order_qty     = max(0, target_stock - current_stock)
    """
    if avg_daily_demand > 0:
        target_stock = (avg_daily_demand * target_days) + safety_stock
    else:
        target_stock = forecast_demand + safety_stock

    order_qty = max(0.0, target_stock - current_stock)
    return round(order_qty, 0)


# ─── Product Inventory Summary ────────────────────────────────────────────────

def get_product_inventory_summary(
    product_code: str,
    product_name: str,
    daily_product: pd.DataFrame,
    forecast_df: pd.DataFrame,
    lead_time_days: int = DEFAULT_LEAD_TIME,
    service_level: float = DEFAULT_SERVICE_LEVEL,
    forecast_horizon: int = 14,
) -> Dict:
    """
    Generate a complete inventory intelligence summary for one product.

    Returns a dict with all inventory metrics.
    """
    # Filter product history
    prod = daily_product[daily_product["StockCode"] == product_code]
    if prod.empty:
        return _empty_inventory_record(product_code, product_name)

    # Demand statistics from history
    recent = prod.tail(30)
    avg_daily     = recent["Quantity"].mean()
    std_daily     = recent["Quantity"].std() if len(recent) > 1 else avg_daily * 0.2
    std_daily     = max(std_daily, 0.1)

    # Forecast demand over horizon
    if not forecast_df.empty:
        forecast_demand = forecast_df["predicted_demand"].sum()
    else:
        forecast_demand = avg_daily * forecast_horizon

    # Simulated inventory
    current_stock = simulate_current_stock(
        avg_daily_demand=avg_daily,
        seed_offset=hash(product_code),
    )

    # Safety stock & ROP
    safety_stock = calculate_safety_stock(std_daily, lead_time_days, service_level)
    rop          = calculate_reorder_point(avg_daily, lead_time_days, safety_stock)

    # Risk
    stockout_risk  = classify_stockout_risk(current_stock, avg_daily, lead_time_days)
    overstock_risk = classify_overstock_risk(current_stock, avg_daily)

    # Coverage
    coverage_days = (current_stock / avg_daily) if avg_daily > 0 else 999

    # Order quantity
    order_qty = calculate_order_quantity(
        forecast_demand=forecast_demand,
        current_stock=current_stock,
        safety_stock=safety_stock,
        target_days=DEFAULT_TARGET_DAYS,
        avg_daily_demand=avg_daily,
    )

    return {
        "product_code":    product_code,
        "product_name":    product_name[:50],
        "avg_daily_demand": round(avg_daily, 1),
        "std_daily_demand": round(std_daily, 1),
        "forecast_demand":  round(forecast_demand, 0),
        "current_stock":   round(current_stock, 0),   # SIMULATED
        "safety_stock":    round(safety_stock, 1),
        "reorder_point":   round(rop, 1),
        "coverage_days":   round(min(coverage_days, 999), 1),
        "stockout_risk":   stockout_risk,
        "overstock_risk":  overstock_risk,
        "order_quantity":  round(order_qty, 0),
        "lead_time_days":  lead_time_days,
        "service_level":   service_level,
        "is_simulated":    True,
    }


def _empty_inventory_record(code: str, name: str) -> Dict:
    return {
        "product_code": code, "product_name": name,
        "avg_daily_demand": 0, "std_daily_demand": 0,
        "forecast_demand": 0, "current_stock": 0,
        "safety_stock": 0, "reorder_point": 0,
        "coverage_days": 0, "stockout_risk": "CRITICAL",
        "overstock_risk": "LOW", "order_quantity": 0,
        "lead_time_days": DEFAULT_LEAD_TIME, "service_level": DEFAULT_SERVICE_LEVEL,
        "is_simulated": True,
    }


# ─── Portfolio Inventory Table ────────────────────────────────────────────────

def build_inventory_table(
    top_products: pd.DataFrame,
    daily_product: pd.DataFrame,
    training_result: Dict,
    festival_calendar: Optional[pd.DataFrame] = None,
    forecast_horizon: int = 14,
    lead_time_days: int = DEFAULT_LEAD_TIME,
    max_products: int = 30,
) -> pd.DataFrame:
    """
    Build a full inventory risk table for top products.

    Returns DataFrame with one row per product.
    """
    from src.forecasting import forecast_product

    records = []
    codes   = top_products["StockCode"].tolist()[:max_products]

    for code in codes:
        desc_rows = top_products[top_products["StockCode"] == code]
        name = desc_rows["Description"].iloc[0] if not desc_rows.empty else code

        try:
            fc = forecast_product(
                product_code=code,
                daily_all=daily_product,
                training_result=training_result,
                horizon=forecast_horizon,
                festival_calendar=festival_calendar,
            )
        except Exception:
            fc = pd.DataFrame()

        summary = get_product_inventory_summary(
            product_code=code,
            product_name=str(name),
            daily_product=daily_product,
            forecast_df=fc,
            lead_time_days=lead_time_days,
            forecast_horizon=forecast_horizon,
        )
        records.append(summary)

    df = pd.DataFrame(records)
    if df.empty:
        return df

    # Sort by risk priority
    risk_order = {"CRITICAL": 0, "HIGH": 1, "MEDIUM": 2, "LOW": 3}
    df["_risk_order"] = df["stockout_risk"].map(risk_order).fillna(4)
    df = df.sort_values("_risk_order").drop(columns=["_risk_order"])

    return df


def get_risk_color(risk: str) -> str:
    """Return hex color for a risk level."""
    return RISK_COLORS.get(risk, "#AAAAAA")


def get_risk_counts(inventory_df: pd.DataFrame) -> Dict[str, int]:
    """Count products at each risk level."""
    if inventory_df.empty or "stockout_risk" not in inventory_df.columns:
        return {"CRITICAL": 0, "HIGH": 0, "MEDIUM": 0, "LOW": 0}
    counts = inventory_df["stockout_risk"].value_counts().to_dict()
    return {k: counts.get(k, 0) for k in ["CRITICAL", "HIGH", "MEDIUM", "LOW"]}
