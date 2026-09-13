"""
src/festival_features.py
------------------------
India Festival Calendar Layer — SIMULATED BUSINESS FEATURE

⚠️  IMPORTANT DISCLAIMER:
    The base dataset (Kaggle Ecommerce Data) is from a UK-based retailer
    (Dec 2010 – Dec 2011). It does NOT contain Indian market data.

    This festival intelligence layer is a SIMULATED upgrade feature
    demonstrating how a retail system would model festival demand in
    an Indian e-commerce context. The demand lift values are derived
    from historical patterns applied to the available dataset's
    overall demand signal.

    All festival-related metrics are clearly labeled [SIMULATED] in the UI.

Festival Coverage:
    - Diwali, Holi, Eid, Christmas, Dussehra, Raksha Bandhan,
      Independence Day, Republic Day, New Year

Features Created:
    - is_festival        : 1 if date is within festival window
    - festival_name      : Name of festival (or "None")
    - festival_category  : "Major" / "Religious" / "National" / "None"
    - days_to_festival   : Days until nearest upcoming festival
    - days_after_festival: Days since last festival ended
    - festival_window    : 1 if within window, 0 otherwise
    - festival_lift      : Estimated demand multiplier
"""

from typing import Dict, List, Optional, Tuple
import numpy as np
import pandas as pd

from src.utils import get_logger

logger = get_logger(__name__)


# ─── Festival Definitions ─────────────────────────────────────────────────────

# Format: (month, day, window_before, window_after, lift_factor, category)
# lift_factor: estimated demand multiplier vs normal baseline
# window: days before/after festival to include in "festival period"

FESTIVAL_TEMPLATES: Dict[str, Tuple] = {
    "Diwali":           (10, 24, 14, 7, 1.38, "Major"),    # Late Oct
    "Holi":             (3,  7,  7,  3, 1.22, "Major"),    # Early March
    "Eid al-Fitr":      (5,  2,  10, 5, 1.18, "Religious"), # Varies; use May approx
    "Christmas":        (12, 25, 14, 3, 1.45, "Major"),    # Dec 25
    "Dussehra":         (10, 5,  7,  3, 1.20, "Major"),    # Early Oct
    "Raksha Bandhan":   (8,  13, 5,  2, 1.15, "Religious"),# Mid Aug
    "Independence Day": (8,  15, 3,  1, 1.08, "National"), # Aug 15
    "Republic Day":     (1,  26, 2,  1, 1.05, "National"), # Jan 26
    "New Year":         (1,  1,  3,  2, 1.25, "Major"),    # Jan 1
    "Navratri":         (10, 14, 7,  3, 1.18, "Religious"),# Oct
    "Durga Puja":       (10, 11, 5,  3, 1.16, "Religious"),# Oct
}


def get_festival_dates(years: List[int]) -> pd.DataFrame:
    """
    Generate a DataFrame of all festival dates for given years.

    Returns columns:
        festival_name, festival_category, festival_date,
        window_before, window_after, lift_factor
    """
    records = []
    for year in years:
        for name, (month, day, w_before, w_after, lift, category) in FESTIVAL_TEMPLATES.items():
            try:
                festival_date = pd.Timestamp(year=year, month=month, day=day)
                records.append({
                    "festival_name":     name,
                    "festival_category": category,
                    "festival_date":     festival_date,
                    "window_before":     w_before,
                    "window_after":      w_after,
                    "lift_factor":       lift,
                })
            except ValueError:
                pass  # Invalid date (e.g. Feb 30)

    return pd.DataFrame(records).sort_values("festival_date").reset_index(drop=True)


def build_festival_calendar(
    date_range: pd.DatetimeIndex,
    years: Optional[List[int]] = None,
) -> pd.DataFrame:
    """
    Build a daily festival calendar for the given date range.

    Args:
        date_range: pd.DatetimeIndex of all dates to annotate
        years     : List of years to include (defaults to years in date_range)

    Returns:
        DataFrame with Date as index + festival feature columns
    """
    if years is None:
        years = list(set(date_range.year.tolist()))

    festivals = get_festival_dates(years)
    calendar_df = pd.DataFrame({"Date": date_range})

    # Initialize columns
    calendar_df["is_festival"]          = 0
    calendar_df["festival_name"]        = "None"
    calendar_df["festival_category"]    = "None"
    calendar_df["festival_window"]      = 0
    calendar_df["lift_factor"]          = 1.0
    calendar_df["days_to_festival"]     = 999
    calendar_df["days_after_festival"]  = 999

    for _, row in festivals.iterrows():
        f_date   = row["festival_date"]
        w_before = row["window_before"]
        w_after  = row["window_after"]
        name     = row["festival_name"]
        category = row["festival_category"]
        lift     = row["lift_factor"]

        window_start = f_date - pd.Timedelta(days=w_before)
        window_end   = f_date + pd.Timedelta(days=w_after)

        in_window = (calendar_df["Date"] >= window_start) & \
                    (calendar_df["Date"] <= window_end)

        # Festival window flag (higher lift takes precedence)
        current_lift = calendar_df.loc[in_window, "lift_factor"]
        better_mask = in_window & (lift > calendar_df["lift_factor"])
        calendar_df.loc[better_mask, "is_festival"]       = 1
        calendar_df.loc[better_mask, "festival_name"]     = name
        calendar_df.loc[better_mask, "festival_category"] = category
        calendar_df.loc[better_mask, "festival_window"]   = 1
        calendar_df.loc[better_mask, "lift_factor"]       = lift

        # Days to festival
        for idx, date in calendar_df["Date"].items():
            days_to = (f_date - date).days
            if 0 < days_to < calendar_df.at[idx, "days_to_festival"]:
                calendar_df.at[idx, "days_to_festival"] = days_to

            days_after = (date - f_date).days
            if 0 < days_after <= w_after:
                if days_after < calendar_df.at[idx, "days_after_festival"]:
                    calendar_df.at[idx, "days_after_festival"] = days_after

    # Cap "999" values to reasonable numbers for ML
    calendar_df["days_to_festival"]    = calendar_df["days_to_festival"].clip(upper=90)
    calendar_df["days_after_festival"] = calendar_df["days_after_festival"].clip(upper=30)

    logger.info(
        f"Festival calendar built: {len(calendar_df)} days, "
        f"{calendar_df['is_festival'].sum()} festival days."
    )
    return calendar_df


# ─── Festival Impact Analysis ─────────────────────────────────────────────────

def compute_festival_lift(
    total_daily: pd.DataFrame,
    festival_calendar: pd.DataFrame,
    demand_col: str = "TotalQuantity",
    date_col: str = "Date",
) -> pd.DataFrame:
    """
    Calculate actual vs festival-period demand for each festival.
    Returns a summary DataFrame.

    ⚠️  [SIMULATED] — Festival labels are applied to a UK dataset.
    Lift values reflect the dataset's seasonal patterns mapped to
    Indian festival dates for demonstration purposes.

    Columns returned:
        festival_name, festival_category,
        festival_date, normal_avg_demand,
        festival_avg_demand, lift_pct
    """
    merged = total_daily.merge(
        festival_calendar[["Date", "festival_name", "festival_category",
                           "is_festival", "lift_factor"]],
        left_on=date_col,
        right_on="Date",
        how="left",
    )

    normal_demand = merged.loc[
        merged["is_festival"] == 0, demand_col
    ].mean()

    results = []
    for name in merged["festival_name"].unique():
        if name == "None":
            continue
        fest_data = merged[merged["festival_name"] == name]
        if fest_data.empty:
            continue
        category     = fest_data["festival_category"].iloc[0]
        fest_avg     = fest_data[demand_col].mean()
        lift_factor  = fest_data["lift_factor"].iloc[0]

        # Use actual data if available; supplement with estimated lift
        if fest_avg > 0 and normal_demand > 0:
            actual_lift = fest_avg / normal_demand
        else:
            actual_lift = lift_factor

        lift_pct = (actual_lift - 1) * 100

        results.append({
            "festival_name":       name,
            "festival_category":   category,
            "normal_avg_demand":   round(normal_demand, 1),
            "festival_avg_demand": round(fest_avg if fest_avg > 0 else normal_demand * lift_factor, 1),
            "lift_factor":         round(actual_lift, 3),
            "lift_pct":            round(lift_pct, 1),
        })

    result_df = pd.DataFrame(results).sort_values("lift_pct", ascending=False)
    return result_df


def get_upcoming_festivals(
    reference_date: pd.Timestamp,
    n: int = 5,
    years: Optional[List[int]] = None,
) -> pd.DataFrame:
    """Return the next N festivals after reference_date."""
    if years is None:
        years = [reference_date.year, reference_date.year + 1]
    festivals = get_festival_dates(years)
    upcoming = festivals[festivals["festival_date"] > reference_date].head(n)
    upcoming = upcoming.copy()
    upcoming["days_away"] = (upcoming["festival_date"] - reference_date).dt.days
    return upcoming[["festival_name", "festival_category",
                     "festival_date", "days_away", "lift_factor"]]
