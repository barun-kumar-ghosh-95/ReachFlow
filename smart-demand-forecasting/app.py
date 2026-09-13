"""
app.py
------
Smart Demand Forecasting — Streamlit Dashboard
AI-Powered Retail Demand & Inventory Intelligence

Sections:
    A. Executive Overview
    B. Demand Trends
    C. Product Forecast
    D. Festival Intelligence
    E. Inventory Risk
    F. Business Insights
    G. Model Performance
"""

import warnings
warnings.filterwarnings("ignore")

import sys
import os
from pathlib import Path

# Ensure src/ is importable
ROOT = Path(__file__).resolve().parent
sys.path.insert(0, str(ROOT))

import numpy as np
import pandas as pd
import plotly.express as px
import plotly.graph_objects as go
from plotly.subplots import make_subplots
import streamlit as st

# ─── Page Config (MUST be first Streamlit call) ───────────────────────────────
st.set_page_config(
    page_title="Smart Demand Forecasting",
    page_icon="📦",
    layout="wide",
    initial_sidebar_state="expanded",
    menu_items={
        "Get Help": None,
        "Report a bug": None,
        "About": "Smart Demand Forecasting — AI-Powered Retail Demand & Inventory Intelligence",
    },
)

from src.data_processing import run_pipeline
from src.feature_engineering import build_features, get_feature_columns
from src.festival_features import build_festival_calendar, compute_festival_lift, get_upcoming_festivals
from src.model_training import train_all_models
from src.forecasting import (
    forecast_total_demand, forecast_product, get_forecast_summary,
)
from src.inventory import (
    build_inventory_table, get_risk_color, get_risk_counts,
    get_product_inventory_summary,
)
from src.utils import format_number, get_logger

logger = get_logger(__name__)

# ─── Styling ──────────────────────────────────────────────────────────────────
st.markdown("""
<style>
/* ── Typography & Base ── */
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');

html, body, [class*="css"] {
    font-family: 'Inter', sans-serif;
}

/* ── Main background ── */
.stApp {
    background-color: #0f1117;
    color: #e2e8f0;
}

/* ── Sidebar ── */
[data-testid="stSidebar"] {
    background: linear-gradient(180deg, #1a1f2e 0%, #141824 100%);
    border-right: 1px solid #2d3748;
}
[data-testid="stSidebar"] .stMarkdown h1,
[data-testid="stSidebar"] .stMarkdown h2,
[data-testid="stSidebar"] .stMarkdown h3 {
    color: #e2e8f0;
}

/* ── KPI Cards ── */
.kpi-card {
    background: linear-gradient(135deg, #1e2535 0%, #252d42 100%);
    border: 1px solid #2d3748;
    border-radius: 12px;
    padding: 20px 24px;
    margin: 6px 0;
    transition: transform 0.2s ease, box-shadow 0.2s ease;
}
.kpi-card:hover {
    transform: translateY(-2px);
    box-shadow: 0 8px 24px rgba(0,0,0,0.3);
}
.kpi-label {
    font-size: 12px;
    font-weight: 600;
    color: #64748b;
    text-transform: uppercase;
    letter-spacing: 0.8px;
    margin-bottom: 8px;
}
.kpi-value {
    font-size: 32px;
    font-weight: 700;
    color: #e2e8f0;
    line-height: 1;
    margin-bottom: 4px;
}
.kpi-value.accent-blue   { color: #60a5fa; }
.kpi-value.accent-green  { color: #34d399; }
.kpi-value.accent-orange { color: #fb923c; }
.kpi-value.accent-purple { color: #a78bfa; }
.kpi-value.accent-red    { color: #f87171; }
.kpi-value.accent-yellow { color: #fbbf24; }
.kpi-delta {
    font-size: 12px;
    color: #64748b;
    margin-top: 4px;
}

/* ── Section Headers ── */
.section-header {
    font-size: 22px;
    font-weight: 700;
    color: #e2e8f0;
    margin-bottom: 4px;
    padding-top: 8px;
}
.section-subheader {
    font-size: 14px;
    color: #64748b;
    margin-bottom: 20px;
}

/* ── Risk Badges ── */
.risk-badge {
    display: inline-block;
    padding: 3px 10px;
    border-radius: 20px;
    font-size: 11px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.5px;
}
.risk-CRITICAL { background: #7f1d1d; color: #fca5a5; border: 1px solid #ef4444; }
.risk-HIGH     { background: #7c2d12; color: #fdba74; border: 1px solid #f97316; }
.risk-MEDIUM   { background: #713f12; color: #fde68a; border: 1px solid #eab308; }
.risk-LOW      { background: #064e3b; color: #6ee7b7; border: 1px solid #10b981; }

/* ── Simulated Badge ── */
.simulated-badge {
    display: inline-block;
    background: #1e3a5f;
    color: #93c5fd;
    border: 1px solid #3b82f6;
    padding: 2px 10px;
    border-radius: 20px;
    font-size: 11px;
    font-weight: 600;
    margin-left: 8px;
}

/* ── Divider ── */
.section-divider {
    height: 1px;
    background: linear-gradient(90deg, #3b82f6 0%, #2d3748 100%);
    margin: 8px 0 24px 0;
    border: none;
}

/* ── Info Box ── */
.info-box {
    background: #1e2535;
    border-left: 3px solid #3b82f6;
    border-radius: 0 8px 8px 0;
    padding: 12px 16px;
    margin: 12px 0;
    font-size: 13px;
    color: #94a3b8;
}
.info-box strong { color: #93c5fd; }

/* ── Insight Cards ── */
.insight-card {
    background: #1a2035;
    border: 1px solid #2d3748;
    border-radius: 10px;
    padding: 14px 18px;
    margin: 8px 0;
    font-size: 14px;
    color: #cbd5e1;
    line-height: 1.6;
}
.insight-icon { font-size: 18px; margin-right: 8px; }

/* ── Plotly chart wrapper ── */
.js-plotly-plot { border-radius: 12px; }

/* ── DataFrames ── */
[data-testid="stDataFrame"] {
    border-radius: 10px;
    overflow: hidden;
}

/* ── Streamlit elements ── */
.stSelectbox label, .stSlider label, .stRadio label {
    color: #94a3b8 !important;
    font-size: 13px !important;
    font-weight: 500 !important;
}
.stMetric label { color: #64748b !important; }
</style>
""", unsafe_allow_html=True)


# ─── Plotly Theme ─────────────────────────────────────────────────────────────
PLOTLY_THEME = dict(
    template="plotly_dark",
    paper_bgcolor="rgba(0,0,0,0)",
    plot_bgcolor="rgba(0,0,0,0)",
    font=dict(family="Inter", color="#94a3b8", size=12),
    margin=dict(l=20, r=20, t=40, b=20),
    xaxis=dict(gridcolor="#1e2535", linecolor="#2d3748"),
    yaxis=dict(gridcolor="#1e2535", linecolor="#2d3748"),
)

COLOR_PALETTE = {
    "primary":    "#3b82f6",
    "secondary":  "#8b5cf6",
    "success":    "#10b981",
    "warning":    "#f59e0b",
    "danger":     "#ef4444",
    "forecast":   "#60a5fa",
    "ci":         "rgba(96,165,250,0.15)",
    "historical": "#34d399",
}


# ─── Data Loading (cached) ───────────────────────────────────────────────────

@st.cache_data(show_spinner=False)
def load_data() -> dict:
    """Load and process data — cached until file changes."""
    return run_pipeline()


@st.cache_data(show_spinner=False)
def get_festival_calendar_cached(date_range_key: str, years_key: str) -> pd.DataFrame:
    years = [int(y) for y in years_key.split(",")]
    dates = pd.date_range(start=date_range_key.split("|")[0],
                          end=date_range_key.split("|")[1], freq="D")
    return build_festival_calendar(dates, years)


@st.cache_resource(show_spinner=False)
def train_models_cached(data_hash: str, _total_features: pd.DataFrame) -> dict:
    """Train models — cached as resource (survives reruns)."""
    return train_all_models(
        _total_features,
        target_col="TotalQuantity",
        date_col="Date",
        test_size=0.2,
        save_models=True,
        model_prefix="total",
    )


@st.cache_data(show_spinner=False)
def build_total_features_cached(
    _total_daily: pd.DataFrame, _festival_calendar: pd.DataFrame
) -> pd.DataFrame:
    """Build features for total demand (cached)."""
    from src.feature_engineering import (
        add_date_features, add_lag_features,
        add_rolling_features, cap_outliers,
    )
    df = _total_daily.copy()
    df = cap_outliers(df, col="TotalQuantity", factor=4.0)
    df = add_date_features(df, date_col="Date")
    df = add_lag_features(df, target_col="TotalQuantity", sort_col="Date")
    df = add_rolling_features(df, target_col="TotalQuantity", sort_col="Date")

    if not _festival_calendar.empty:
        fest_cols = [c for c in _festival_calendar.columns if c != "Date"]
        df = df.merge(_festival_calendar[["Date"] + fest_cols], on="Date", how="left")
        for col in ["is_festival", "festival_window", "days_to_festival", "days_after_festival"]:
            if col in df.columns:
                df[col] = df[col].fillna(0)

    lag_cols = [c for c in df.columns if c.startswith("lag_")]
    df.dropna(subset=lag_cols, inplace=True)
    return df


# ─── UI Components ────────────────────────────────────────────────────────────

def kpi_card(label: str, value: str, accent: str = "", delta: str = "") -> str:
    accent_class = f"accent-{accent}" if accent else ""
    delta_html   = f'<div class="kpi-delta">{delta}</div>' if delta else ""
    return f"""
    <div class="kpi-card">
        <div class="kpi-label">{label}</div>
        <div class="kpi-value {accent_class}">{value}</div>
        {delta_html}
    </div>
    """


def section_header(title: str, subtitle: str = "") -> None:
    st.markdown(f'<div class="section-header">{title}</div>', unsafe_allow_html=True)
    if subtitle:
        st.markdown(f'<div class="section-subheader">{subtitle}</div>', unsafe_allow_html=True)
    st.markdown('<hr class="section-divider">', unsafe_allow_html=True)


def simulated_badge(text: str = "SIMULATED") -> str:
    return f'<span class="simulated-badge">⚠️ {text}</span>'


def risk_badge(risk: str) -> str:
    return f'<span class="risk-badge risk-{risk}">{risk}</span>'


def insight_card(icon: str, text: str) -> None:
    st.markdown(
        f'<div class="insight-card"><span class="insight-icon">{icon}</span>{text}</div>',
        unsafe_allow_html=True
    )


# ─── Chart Helpers ────────────────────────────────────────────────────────────

def plot_demand_trend(
    historical: pd.DataFrame,
    forecast: pd.DataFrame,
    title: str = "Demand Trend",
    h_col: str = "TotalQuantity",
    h_date: str = "Date",
) -> go.Figure:
    fig = go.Figure()

    # Historical
    fig.add_trace(go.Scatter(
        x=historical[h_date], y=historical[h_col],
        name="Historical Demand",
        line=dict(color=COLOR_PALETTE["historical"], width=2),
        mode="lines",
    ))

    if not forecast.empty:
        # Confidence interval
        fig.add_trace(go.Scatter(
            x=pd.concat([forecast["Date"], forecast["Date"][::-1]]),
            y=pd.concat([forecast["upper_bound"], forecast["lower_bound"][::-1]]),
            fill="toself",
            fillcolor=COLOR_PALETTE["ci"],
            line=dict(color="rgba(0,0,0,0)"),
            name="90% Confidence Interval",
            showlegend=True,
        ))
        # Forecast line
        fig.add_trace(go.Scatter(
            x=forecast["Date"], y=forecast["predicted_demand"],
            name="Forecast",
            line=dict(color=COLOR_PALETTE["forecast"], width=2.5, dash="dash"),
            mode="lines",
        ))

    fig.update_layout(
        title=dict(text=title, font=dict(size=16, color="#e2e8f0")),
        xaxis_title="Date",
        yaxis_title="Units",
        legend=dict(
            orientation="h", yanchor="bottom", y=1.02,
            xanchor="right", x=1, bgcolor="rgba(0,0,0,0)",
        ),
        **PLOTLY_THEME,
    )
    return fig


def plot_model_comparison(comparison_df: pd.DataFrame) -> go.Figure:
    fig = make_subplots(
        rows=1, cols=2,
        subplot_titles=("MAE by Model", "RMSE by Model"),
    )
    colors = [
        COLOR_PALETTE["primary"] if i == 0 else "#374151"
        for i in range(len(comparison_df))
    ]

    fig.add_trace(
        go.Bar(
            x=comparison_df["Model"], y=comparison_df["MAE"],
            marker_color=colors, name="MAE",
            text=comparison_df["MAE"].round(1), textposition="outside",
        ), row=1, col=1
    )
    fig.add_trace(
        go.Bar(
            x=comparison_df["Model"], y=comparison_df["RMSE"],
            marker_color=colors, name="RMSE",
            text=comparison_df["RMSE"].round(1), textposition="outside",
        ), row=1, col=2
    )

    fig.update_layout(
        title=dict(text="Model Performance Comparison", font=dict(size=16, color="#e2e8f0")),
        showlegend=False,
        height=380,
        **PLOTLY_THEME,
    )
    return fig


def plot_festival_impact(festival_lift_df: pd.DataFrame) -> go.Figure:
    df = festival_lift_df.sort_values("lift_pct", ascending=True)
    colors = [
        "#3b82f6" if x >= 20 else
        "#8b5cf6" if x >= 10 else
        "#10b981"
        for x in df["lift_pct"]
    ]
    fig = go.Figure(go.Bar(
        x=df["lift_pct"],
        y=df["festival_name"],
        orientation="h",
        marker_color=colors,
        text=[f"+{v:.1f}%" for v in df["lift_pct"]],
        textposition="outside",
    ))
    fig.update_layout(
        title=dict(text="Festival Demand Uplift % vs Normal", font=dict(size=16, color="#e2e8f0")),
        xaxis_title="Demand Lift (%)",
        xaxis=dict(ticksuffix="%"),
        height=420,
        **PLOTLY_THEME,
    )
    return fig


def plot_actual_vs_predicted(
    test_df: pd.DataFrame,
    model: object,
    feature_cols: list,
    target_col: str = "TotalQuantity",
    date_col: str = "Date",
) -> go.Figure:
    X_test = test_df[feature_cols].fillna(0)
    try:
        preds = np.clip(model.predict(X_test), 0, None)
    except Exception:
        preds = np.zeros(len(test_df))

    fig = go.Figure()
    fig.add_trace(go.Scatter(
        x=test_df[date_col], y=test_df[target_col],
        name="Actual", line=dict(color="#34d399", width=2),
    ))
    fig.add_trace(go.Scatter(
        x=test_df[date_col], y=preds,
        name="Predicted", line=dict(color="#60a5fa", width=2, dash="dash"),
    ))
    fig.update_layout(
        title=dict(text="Actual vs Predicted (Validation Set)", font=dict(size=16, color="#e2e8f0")),
        xaxis_title="Date", yaxis_title="Units",
        legend=dict(orientation="h", yanchor="bottom", y=1.02, xanchor="right", x=1,
                    bgcolor="rgba(0,0,0,0)"),
        **PLOTLY_THEME,
    )
    return fig


# ─── Business Insights Generator ─────────────────────────────────────────────

def generate_insights(
    data: dict,
    total_forecast: pd.DataFrame,
    inventory_df: pd.DataFrame,
    festival_lift_df: pd.DataFrame,
    training_result: dict,
) -> list:
    """Generate automated business insights from actual data."""
    insights = []
    total_daily  = data["total_daily"]
    clean        = data["clean"]

    # Demand trend insight
    if not total_forecast.empty and len(total_daily) >= 30:
        recent_avg  = total_daily["TotalQuantity"].tail(30).mean()
        forecast_avg = total_forecast["predicted_demand"].mean()
        pct_change   = ((forecast_avg - recent_avg) / max(recent_avg, 1)) * 100
        direction    = "increase" if pct_change > 0 else "decrease"
        insights.append((
            "📈" if pct_change > 0 else "📉",
            f"Demand is expected to <strong>{direction} by {abs(pct_change):.1f}%</strong> "
            f"over the next {len(total_forecast)} days compared to the past 30-day average."
        ))

    # Stockout risk insight
    if not inventory_df.empty:
        risk_counts = get_risk_counts(inventory_df)
        high_risk   = risk_counts.get("CRITICAL", 0) + risk_counts.get("HIGH", 0)
        if high_risk > 0:
            insights.append((
                "🚨",
                f"<strong>{high_risk} product(s)</strong> are at HIGH or CRITICAL stockout risk "
                f"and require immediate reorder action."
            ))
        else:
            insights.append((
                "✅",
                "All monitored products currently show LOW or MEDIUM stockout risk — "
                "inventory positions appear healthy."
            ))

    # Festival insight
    if not festival_lift_df.empty:
        top_festival = festival_lift_df.iloc[0]
        insights.append((
            "🎉",
            f"<strong>{top_festival['festival_name']}</strong> has the highest estimated demand lift "
            f"at <strong>+{top_festival['lift_pct']:.1f}%</strong> above normal. "
            f"<span class='simulated-badge'>SIMULATED</span>"
        ))

    # Top product insight
    top_products = data.get("top_products")
    if top_products is not None and not top_products.empty:
        top = top_products.iloc[0]
        insights.append((
            "🏆",
            f"<strong>{top['Description']}</strong> ({top['StockCode']}) is the highest-demand "
            f"product with <strong>{format_number(top['Quantity'])}</strong> units sold historically."
        ))

    # Revenue insight
    if "Revenue" in clean.columns:
        total_rev = clean["Revenue"].sum()
        insights.append((
            "💰",
            f"Total historical revenue across the dataset is "
            f"<strong>£{format_number(total_rev)}</strong>."
        ))

    # Model insight
    best_name = training_result.get("best_model_name", "N/A")
    comparison = training_result.get("comparison", pd.DataFrame())
    if not comparison.empty and best_name in comparison["Model"].values:
        best_row = comparison[comparison["Model"] == best_name].iloc[0]
        insights.append((
            "🤖",
            f"Best forecasting model: <strong>{best_name}</strong> "
            f"(RMSE: {best_row['RMSE']:.1f}, MAPE: {best_row['MAPE']:.1f}%)."
        ))

    # Reorder insight (first product needing reorder)
    if not inventory_df.empty:
        critical = inventory_df[inventory_df["stockout_risk"].isin(["CRITICAL", "HIGH"])]
        if not critical.empty:
            top_reorder = critical.iloc[0]
            insights.append((
                "🔔",
                f"<strong>{top_reorder['product_name'][:40]}</strong> needs reorder of "
                f"<strong>{format_number(top_reorder['order_quantity'])}</strong> units. "
                f"Coverage: {top_reorder['coverage_days']:.0f} days remaining. "
                f"<span class='simulated-badge'>SIMULATED STOCK</span>"
            ))

    return insights


# ─── Sidebar ─────────────────────────────────────────────────────────────────

def render_sidebar() -> dict:
    with st.sidebar:
        st.markdown("""
        <div style="padding: 16px 0 8px 0;">
            <div style="font-size:24px; font-weight:700; color:#e2e8f0;">📦 SDF</div>
            <div style="font-size:11px; color:#64748b; letter-spacing:1px;
                        text-transform:uppercase; margin-top:2px;">
                Smart Demand Forecasting
            </div>
        </div>
        """, unsafe_allow_html=True)

        st.markdown("---")

        page = st.radio(
            "Navigation",
            options=[
                "🏠  Executive Overview",
                "📈  Demand Trends",
                "🔍  Product Forecast",
                "🎉  Festival Intelligence",
                "📦  Inventory Risk",
                "💡  Business Insights",
                "⚙️  Model Performance",
            ],
            label_visibility="collapsed",
        )

        st.markdown("---")
        st.markdown("**Forecast Settings**")
        horizon = st.select_slider(
            "Forecast Horizon",
            options=[7, 14, 30, 60],
            value=30,
            format_func=lambda x: f"{x} days",
        )
        lead_time = st.slider("Lead Time (days)", min_value=1, max_value=21, value=7)
        service_level = st.select_slider(
            "Service Level",
            options=[0.90, 0.95, 0.99],
            value=0.95,
            format_func=lambda x: f"{int(x*100)}%",
        )

        st.markdown("---")
        st.markdown("""
        <div style="font-size:11px; color:#4b5563; line-height:1.6;">
            <strong style="color:#64748b;">Data Source</strong><br>
            Kaggle E-Commerce Dataset<br>
            (UK Retail, 2010–2011)<br><br>
            <strong style="color:#64748b;">⚠️ Simulated Layers</strong><br>
            · Festival Intelligence<br>
            · Inventory Stock Levels
        </div>
        """, unsafe_allow_html=True)

    return {
        "page":          page,
        "horizon":       horizon,
        "lead_time":     lead_time,
        "service_level": service_level,
    }


# ─── Page A: Executive Overview ──────────────────────────────────────────────

def page_overview(data: dict, training_result: dict, total_forecast: pd.DataFrame,
                  festival_lift_df: pd.DataFrame, inventory_df: pd.DataFrame) -> None:
    section_header(
        "Executive Overview",
        "Real-time KPIs and demand intelligence at a glance"
    )

    clean        = data["clean"]
    total_daily  = data["total_daily"]
    top_products = data["top_products"]
    is_real      = data["is_real_data"]

    # Data source badge
    if not is_real:
        st.warning(
            "⚠️ **SIMULATED DATA** — Kaggle CSV not found in `data/raw/`. "
            "Using synthetically generated sample data for demonstration. "
            "Place `data.csv` from Kaggle in `data/raw/` for real analysis.",
            icon="⚠️",
        )

    # ── KPI Row 1 ─────────────────────────────────────────────────────────────
    c1, c2, c3, c4 = st.columns(4)

    with c1:
        n_products = clean["StockCode"].nunique()
        st.markdown(kpi_card("Total Products", format_number(n_products), "blue",
                             "Unique SKUs in dataset"), unsafe_allow_html=True)
    with c2:
        total_rev = clean["Revenue"].sum()
        st.markdown(kpi_card("Total Revenue", f"£{format_number(total_rev)}", "green",
                             "All transactions combined"), unsafe_allow_html=True)
    with c3:
        avg_daily = total_daily["TotalQuantity"].mean()
        st.markdown(kpi_card("Avg Daily Demand", format_number(avg_daily, 0), "purple",
                             "Units per day"), unsafe_allow_html=True)
    with c4:
        if not total_forecast.empty:
            fc_total = total_forecast["predicted_demand"].sum()
            st.markdown(kpi_card("Forecasted Demand",
                                 format_number(fc_total), "orange",
                                 f"Next {len(total_forecast)} days"), unsafe_allow_html=True)
        else:
            st.markdown(kpi_card("Forecasted Demand", "—", "orange", "Train models first"),
                        unsafe_allow_html=True)

    # ── KPI Row 2 ─────────────────────────────────────────────────────────────
    c5, c6, c7, c8 = st.columns(4)

    with c5:
        risk_counts = get_risk_counts(inventory_df)
        high_risk   = risk_counts.get("CRITICAL", 0) + risk_counts.get("HIGH", 0)
        st.markdown(kpi_card("High-Risk Products", str(high_risk), "red",
                             "Need immediate reorder ⚠️ Simulated Stock"), unsafe_allow_html=True)
    with c6:
        n_countries = clean["Country"].nunique()
        st.markdown(kpi_card("Countries Served", str(n_countries), "blue",
                             "Unique markets"), unsafe_allow_html=True)
    with c7:
        n_invoices = clean["InvoiceNo"].nunique()
        st.markdown(kpi_card("Total Transactions", format_number(n_invoices), "purple",
                             "Valid invoices processed"), unsafe_allow_html=True)
    with c8:
        if not festival_lift_df.empty:
            max_lift = festival_lift_df["lift_pct"].max()
            st.markdown(kpi_card("Peak Festival Lift", f"+{max_lift:.0f}%", "yellow",
                                 "Max demand uplift ⚠️ Simulated"), unsafe_allow_html=True)
        else:
            st.markdown(kpi_card("Festival Lift", "—", "yellow", ""),
                        unsafe_allow_html=True)

    st.markdown("<br>", unsafe_allow_html=True)

    # ── Overview Charts ───────────────────────────────────────────────────────
    col_l, col_r = st.columns([2, 1])

    with col_l:
        # Monthly demand trend
        monthly = (
            total_daily.copy()
            .assign(Month=lambda d: pd.to_datetime(d["Date"]).dt.to_period("M").dt.to_timestamp())
            .groupby("Month")["TotalQuantity"].sum()
            .reset_index()
        )
        fig = px.bar(
            monthly, x="Month", y="TotalQuantity",
            title="Monthly Total Demand",
            color_discrete_sequence=[COLOR_PALETTE["primary"]],
            template="plotly_dark",
        )
        fig.update_layout(**PLOTLY_THEME)
        st.plotly_chart(fig, use_container_width=True)

    with col_r:
        # Top 10 products
        top10 = top_products.head(10)
        fig2 = px.bar(
            top10, x="Quantity", y="Description",
            orientation="h", title="Top 10 Products by Demand",
            color_discrete_sequence=[COLOR_PALETTE["secondary"]],
            template="plotly_dark",
        )
        fig2.update_yaxes(tickfont=dict(size=10))
        fig2.update_layout(**PLOTLY_THEME, height=350)
        st.plotly_chart(fig2, use_container_width=True)


# ─── Page B: Demand Trends ────────────────────────────────────────────────────

def page_demand_trends(data: dict, total_forecast: pd.DataFrame, horizon: int) -> None:
    section_header(
        "Demand Trends",
        "Historical demand patterns with AI-generated forecast"
    )

    total_daily = data["total_daily"]

    # Show last 180 days of history + forecast
    cutoff      = pd.to_datetime(total_daily["Date"]).max() - pd.Timedelta(days=180)
    historical  = total_daily[pd.to_datetime(total_daily["Date"]) >= cutoff]

    fig = plot_demand_trend(historical, total_forecast,
                            title=f"Demand Trend — Last 180 Days + {horizon}-Day Forecast")
    st.plotly_chart(fig, use_container_width=True)

    # Day-of-week pattern
    col1, col2 = st.columns(2)

    with col1:
        dow = (
            total_daily.copy()
            .assign(DayOfWeek=lambda d: pd.to_datetime(d["Date"]).dt.day_name())
            .groupby("DayOfWeek")["TotalQuantity"].mean()
            .reindex(["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday","Sunday"])
            .reset_index()
        )
        fig2 = px.bar(
            dow, x="DayOfWeek", y="TotalQuantity",
            title="Avg Demand by Day of Week",
            color_discrete_sequence=[COLOR_PALETTE["success"]],
        )
        fig2.update_layout(**PLOTLY_THEME)
        st.plotly_chart(fig2, use_container_width=True)

    with col2:
        monthly = (
            total_daily.copy()
            .assign(Month=lambda d: pd.to_datetime(d["Date"]).dt.month_name())
            .groupby("Month")["TotalQuantity"].mean()
            .reset_index()
        )
        month_order = ["January","February","March","April","May","June",
                       "July","August","September","October","November","December"]
        monthly["Month"] = pd.Categorical(monthly["Month"], categories=month_order, ordered=True)
        monthly = monthly.sort_values("Month")
        fig3 = px.line(
            monthly, x="Month", y="TotalQuantity",
            title="Avg Demand by Month",
            markers=True,
            color_discrete_sequence=[COLOR_PALETTE["warning"]],
        )
        fig3.update_layout(**PLOTLY_THEME)
        st.plotly_chart(fig3, use_container_width=True)

    # Forecast table
    if not total_forecast.empty:
        st.markdown("#### 📋 Forecast Table")
        display_fc = total_forecast.copy()
        display_fc["Date"] = pd.to_datetime(display_fc["Date"]).dt.strftime("%a, %d %b %Y")
        display_fc.columns = ["Date", "Predicted Demand", "Lower Bound (90%)", "Upper Bound (90%)"]
        st.dataframe(display_fc, use_container_width=True, hide_index=True)


# ─── Page C: Product Forecast ─────────────────────────────────────────────────

def page_product_forecast(
    data: dict, training_result: dict, horizon: int,
    festival_calendar: pd.DataFrame
) -> None:
    section_header(
        "Product Forecast",
        "Individual product demand forecasting with trend analysis"
    )

    top_products = data["top_products"]
    daily        = data["daily"]

    if top_products.empty:
        st.info("No product data available.")
        return

    # Product selector
    product_options = {
        f"{row['StockCode']} — {str(row['Description'])[:50]}": row['StockCode']
        for _, row in top_products.iterrows()
    }
    selected_label   = st.selectbox("Select Product", list(product_options.keys()))
    selected_code    = product_options[selected_label]
    selected_name    = selected_label.split("—")[-1].strip() if "—" in selected_label else selected_code

    # Get product historical data
    prod_daily = daily[daily["StockCode"] == selected_code].copy()
    prod_daily = prod_daily.sort_values("Date")

    with st.spinner(f"Generating forecast for {selected_code}..."):
        prod_forecast = forecast_product(
            product_code=selected_code,
            daily_all=daily,
            training_result=training_result,
            horizon=horizon,
            festival_calendar=festival_calendar,
        )

    # Summary metrics
    summary = get_forecast_summary(prod_forecast)
    c1, c2, c3, c4 = st.columns(4)
    with c1:
        st.metric("Forecast Period", f"{horizon} days")
    with c2:
        st.metric(f"Total Forecast ({horizon}d)", format_number(summary["total"]))
    with c3:
        st.metric("Daily Avg Forecast", format_number(summary["daily_avg"], 1))
    with c4:
        hist_avg = prod_daily["Quantity"].tail(30).mean()
        change   = ((summary["daily_avg"] - hist_avg) / max(hist_avg, 1)) * 100
        st.metric("vs Recent Avg", f"{change:+.1f}%", delta_color="normal")

    # Demand chart
    fig = plot_demand_trend(
        prod_daily, prod_forecast,
        title=f"Demand Forecast — {selected_name[:40]}",
        h_col="Quantity", h_date="Date",
    )
    st.plotly_chart(fig, use_container_width=True)

    # Rolling demand analysis
    col1, col2 = st.columns(2)
    with col1:
        prod_daily_plot = prod_daily.copy()
        prod_daily_plot["rolling_7d"]  = prod_daily_plot["Quantity"].rolling(7, min_periods=1).mean()
        prod_daily_plot["rolling_28d"] = prod_daily_plot["Quantity"].rolling(28, min_periods=1).mean()
        fig2 = go.Figure()
        fig2.add_trace(go.Scatter(
            x=prod_daily_plot["Date"], y=prod_daily_plot["Quantity"],
            name="Daily", line=dict(color="#374151", width=1), opacity=0.5,
        ))
        fig2.add_trace(go.Scatter(
            x=prod_daily_plot["Date"], y=prod_daily_plot["rolling_7d"],
            name="7-Day MA", line=dict(color="#60a5fa", width=2),
        ))
        fig2.add_trace(go.Scatter(
            x=prod_daily_plot["Date"], y=prod_daily_plot["rolling_28d"],
            name="28-Day MA", line=dict(color="#f59e0b", width=2),
        ))
        fig2.update_layout(title="Moving Average Decomposition", **PLOTLY_THEME)
        st.plotly_chart(fig2, use_container_width=True)

    with col2:
        if not prod_forecast.empty:
            st.markdown("#### Forecast Detail")
            fc_disp = prod_forecast.copy()
            fc_disp["Date"] = pd.to_datetime(fc_disp["Date"]).dt.strftime("%d %b")
            fc_disp.columns = ["Date", "Forecast", "Lower", "Upper"]
            st.dataframe(fc_disp, use_container_width=True, hide_index=True, height=300)


# ─── Page D: Festival Intelligence ───────────────────────────────────────────

def page_festival_intelligence(
    total_daily: pd.DataFrame, festival_lift_df: pd.DataFrame,
    festival_calendar: pd.DataFrame
) -> None:
    section_header(
        "Festival Intelligence",
        "Seasonal demand uplift analysis across major Indian festivals"
    )

    st.markdown(
        '<div class="info-box">'
        '⚠️ <strong>[SIMULATED FEATURE]</strong> — The base dataset is from a UK retailer. '
        'This festival calendar is a <strong>value-add upgrade</strong> demonstrating how an '
        'Indian e-commerce system would model festival demand impact. '
        'Lift values are derived from dataset seasonality patterns mapped to Indian festival dates.'
        '</div>',
        unsafe_allow_html=True
    )

    if festival_lift_df.empty:
        st.info("Festival analysis not available.")
        return

    # Festival bar chart
    fig = plot_festival_impact(festival_lift_df)
    st.plotly_chart(fig, use_container_width=True)

    # Festival table
    col1, col2 = st.columns([2, 1])
    with col1:
        st.markdown("#### Festival Demand Uplift Summary")
        disp = festival_lift_df[[
            "festival_name", "festival_category",
            "normal_avg_demand", "festival_avg_demand", "lift_pct"
        ]].copy()
        disp.columns = ["Festival", "Category", "Normal Avg Demand",
                        "Festival Avg Demand", "Lift %"]
        disp["Lift %"] = disp["Lift %"].apply(lambda x: f"+{x:.1f}%")
        st.dataframe(disp, use_container_width=True, hide_index=True)

    with col2:
        st.markdown("#### Upcoming Festivals")
        ref_date  = pd.to_datetime(total_daily["Date"]).max()
        upcoming  = get_upcoming_festivals(ref_date, n=6)
        if not upcoming.empty:
            for _, row in upcoming.iterrows():
                lift_pct = (row["lift_factor"] - 1) * 100
                st.markdown(
                    f"**{row['festival_name']}**  \n"
                    f"📅 {row['festival_date'].strftime('%d %b %Y')}  \n"
                    f"🔮 {row['days_away']} days away  \n"
                    f"📈 Estimated lift: +{lift_pct:.0f}%"
                )
                st.markdown("---")

    # Festival calendar heatmap (monthly demand overlay)
    st.markdown("#### Demand Calendar Heatmap")
    cal_data = total_daily.copy()
    cal_data["Date"]  = pd.to_datetime(cal_data["Date"])
    cal_data["Month"] = cal_data["Date"].dt.month
    cal_data["DOW"]   = cal_data["Date"].dt.dayofweek

    pivot = cal_data.groupby(["Month", "DOW"])["TotalQuantity"].mean().reset_index()
    pivot_table = pivot.pivot(index="DOW", columns="Month", values="TotalQuantity")
    pivot_table.index = ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"]

    fig2 = px.imshow(
        pivot_table,
        color_continuous_scale="Blues",
        title="Average Demand Heatmap (Day of Week × Month)",
        labels=dict(x="Month", y="Day of Week", color="Avg Units"),
    )
    fig2.update_layout(**PLOTLY_THEME, height=300)
    st.plotly_chart(fig2, use_container_width=True)


# ─── Page E: Inventory Risk ───────────────────────────────────────────────────

def page_inventory_risk(
    inventory_df: pd.DataFrame,
    horizon: int,
    lead_time: int,
    service_level: float,
) -> None:
    section_header(
        "Inventory Risk Dashboard",
        f"Stock coverage analysis — {horizon}-day forecast horizon"
    )

    st.markdown(
        '<div class="info-box">'
        '⚠️ <strong>[SIMULATED INVENTORY]</strong> — Current stock levels are estimated from '
        'historical demand patterns. The Kaggle dataset contains transaction data only; '
        'no actual warehouse/stock records are available. All inventory metrics are clearly '
        'labeled as simulated.'
        '</div>',
        unsafe_allow_html=True
    )

    if inventory_df.empty:
        st.info("No inventory data available. Please ensure training is complete.")
        return

    # Risk summary KPIs
    risk_counts = get_risk_counts(inventory_df)
    c1, c2, c3, c4 = st.columns(4)
    with c1:
        st.markdown(kpi_card("CRITICAL", str(risk_counts["CRITICAL"]), "red",
                             "Immediate action required"), unsafe_allow_html=True)
    with c2:
        st.markdown(kpi_card("HIGH Risk", str(risk_counts["HIGH"]), "orange",
                             "Reorder within lead time"), unsafe_allow_html=True)
    with c3:
        st.markdown(kpi_card("MEDIUM Risk", str(risk_counts["MEDIUM"]), "yellow",
                             "Monitor closely"), unsafe_allow_html=True)
    with c4:
        st.markdown(kpi_card("LOW Risk", str(risk_counts["LOW"]), "green",
                             "Adequate stock"), unsafe_allow_html=True)

    st.markdown("<br>", unsafe_allow_html=True)

    # Risk pie
    col1, col2 = st.columns([1, 2])
    with col1:
        pie_df = pd.DataFrame([
            {"Risk": k, "Count": v}
            for k, v in risk_counts.items() if v > 0
        ])
        if not pie_df.empty:
            fig = px.pie(
                pie_df, values="Count", names="Risk",
                color="Risk",
                color_discrete_map={
                    "CRITICAL": "#ef4444", "HIGH": "#f97316",
                    "MEDIUM":   "#eab308", "LOW":  "#10b981",
                },
                hole=0.55,
                title="Risk Distribution",
            )
            fig.update_layout(**PLOTLY_THEME, showlegend=True, height=300)
            st.plotly_chart(fig, use_container_width=True)

    with col2:
        # Coverage bar chart
        cov_df = inventory_df[["product_name", "coverage_days", "stockout_risk"]].head(20)
        cov_df = cov_df.sort_values("coverage_days")
        bar_colors = [get_risk_color(r) for r in cov_df["stockout_risk"]]
        fig2 = go.Figure(go.Bar(
            x=cov_df["coverage_days"],
            y=cov_df["product_name"].str[:30],
            orientation="h",
            marker_color=bar_colors,
            text=cov_df["coverage_days"].apply(lambda x: f"{x:.0f}d"),
            textposition="outside",
        ))
        fig2.add_vline(x=lead_time, line_dash="dash",
                       line_color="#ef4444", annotation_text="Lead Time")
        fig2.update_layout(
            title="Stock Coverage (Days) by Product",
            xaxis_title="Days of Coverage",
            height=420,
            **PLOTLY_THEME,
        )
        st.plotly_chart(fig2, use_container_width=True)

    # Full inventory table
    st.markdown("#### 📋 Inventory Risk Table")
    st.caption(
        f"⚠️ Stock levels are SIMULATED | Lead Time: {lead_time} days | "
        f"Service Level: {int(service_level*100)}%"
    )

    display_df = inventory_df[[
        "product_code", "product_name", "avg_daily_demand",
        "forecast_demand", "current_stock", "coverage_days",
        "stockout_risk", "order_quantity",
    ]].copy()

    display_df.columns = [
        "Code", "Product", "Avg Daily", "Forecast Demand",
        "Est. Stock*", "Coverage (days)", "Stockout Risk", "Rec. Order",
    ]

    def color_risk(val):
        colors = {
            "CRITICAL": "background-color: #7f1d1d; color: #fca5a5;",
            "HIGH":     "background-color: #7c2d12; color: #fdba74;",
            "MEDIUM":   "background-color: #713f12; color: #fde68a;",
            "LOW":      "background-color: #064e3b; color: #6ee7b7;",
        }
        return colors.get(val, "")

    styled = display_df.style.applymap(color_risk, subset=["Stockout Risk"])
    st.dataframe(styled, use_container_width=True, hide_index=True, height=400)
    st.caption("* Est. Stock is SIMULATED from historical demand patterns")


# ─── Page F: Business Insights ────────────────────────────────────────────────

def page_business_insights(
    data: dict, total_forecast: pd.DataFrame,
    inventory_df: pd.DataFrame, festival_lift_df: pd.DataFrame,
    training_result: dict,
) -> None:
    section_header(
        "Business Insights",
        "AI-generated actionable insights derived from your data"
    )

    insights = generate_insights(
        data, total_forecast, inventory_df, festival_lift_df, training_result
    )

    if not insights:
        st.info("No insights available yet. Please complete model training.")
        return

    for icon, text in insights:
        insight_card(icon, text)

    st.markdown("<br>", unsafe_allow_html=True)

    # Country breakdown
    clean = data["clean"]
    st.markdown("#### 🌍 Demand by Country")
    country_df = (
        clean.groupby("Country")
        .agg(Units=("Quantity","sum"), Revenue=("Revenue","sum"))
        .reset_index()
        .sort_values("Units", ascending=False)
        .head(15)
    )
    fig = px.bar(
        country_df, x="Country", y="Units",
        color="Revenue",
        color_continuous_scale="Blues",
        title="Total Units Sold by Country",
    )
    fig.update_layout(**PLOTLY_THEME)
    st.plotly_chart(fig, use_container_width=True)

    # Weekly revenue trend
    st.markdown("#### 💰 Weekly Revenue Trend")
    weekly_rev = (
        clean.copy()
        .assign(Week=lambda d: pd.to_datetime(d["InvoiceDate"]).dt.to_period("W").dt.to_timestamp())
        .groupby("Week")["Revenue"].sum()
        .reset_index()
    )
    fig2 = px.area(
        weekly_rev, x="Week", y="Revenue",
        title="Weekly Revenue",
        color_discrete_sequence=[COLOR_PALETTE["success"]],
    )
    fig2.update_layout(**PLOTLY_THEME)
    st.plotly_chart(fig2, use_container_width=True)


# ─── Page G: Model Performance ────────────────────────────────────────────────

def page_model_performance(training_result: dict) -> None:
    section_header(
        "Model Performance",
        "Time-series forecasting model comparison and evaluation"
    )

    comparison   = training_result.get("comparison", pd.DataFrame())
    best_name    = training_result.get("best_model_name", "N/A")
    best_model   = training_result.get("best_model")
    test_df      = training_result.get("test_df", pd.DataFrame())
    feature_cols = training_result.get("feature_cols", [])

    if comparison.empty:
        st.warning("No model evaluation data available. Please retrain models.")
        return

    # Best model callout
    st.markdown(
        f'<div class="info-box">'
        f'🏆 <strong>Best Model: {best_name}</strong> — Selected based on lowest RMSE on '
        f'the chronological validation set (last 20% of data). '
        f'Random train-test split was NOT used to preserve temporal ordering.'
        f'</div>',
        unsafe_allow_html=True
    )

    # Comparison chart
    fig = plot_model_comparison(comparison)
    st.plotly_chart(fig, use_container_width=True)

    # Comparison table
    st.markdown("#### 📊 Full Model Comparison Table")
    disp = comparison[["Model","MAE","RMSE","MAPE","sMAPE","Rank"]].copy()
    disp["Best"] = comparison["Best"].apply(lambda x: "✅ Best" if x else "")

    def highlight_best(row):
        if row["Best"] == "✅ Best":
            return ["background-color: #1e3a5f"] * len(row)
        return [""] * len(row)

    styled_table = disp.style.apply(highlight_best, axis=1)
    st.dataframe(styled_table, use_container_width=True, hide_index=True)

    st.markdown("""
    | Metric | Definition |
    |--------|-----------|
    | **MAE** | Mean Absolute Error — average absolute prediction error in units |
    | **RMSE** | Root Mean Squared Error — penalizes large errors more than MAE |
    | **MAPE** | Mean Absolute Percentage Error — relative error (skips zero actuals) |
    | **sMAPE** | Symmetric MAPE — handles near-zero actuals more robustly |
    """)

    # Actual vs Predicted chart
    if best_model is not None and not test_df.empty and feature_cols:
        st.markdown("#### 📈 Actual vs Predicted (Validation Set)")
        available_cols = [c for c in feature_cols if c in test_df.columns]
        if available_cols:
            fig2 = plot_actual_vs_predicted(test_df, best_model, available_cols)
            st.plotly_chart(fig2, use_container_width=True)

    # Train/test split info
    train_df = training_result.get("train_df", pd.DataFrame())
    if not train_df.empty and not test_df.empty:
        st.markdown("#### ⏱️ Time-Series Split Details")
        c1, c2, c3 = st.columns(3)
        with c1:
            st.metric("Training Samples", len(train_df))
        with c2:
            st.metric("Validation Samples", len(test_df))
        with c3:
            split_pct = len(test_df) / (len(train_df) + len(test_df)) * 100
            st.metric("Validation Split", f"{split_pct:.0f}%")


# ─── Main App ─────────────────────────────────────────────────────────────────

def main():
    # Header
    st.markdown("""
    <div style="padding: 8px 0 16px 0;">
        <h1 style="font-size:28px; font-weight:700; color:#e2e8f0; margin:0;">
            📦 Smart Demand Forecasting
        </h1>
        <p style="font-size:14px; color:#64748b; margin:4px 0 0 0;">
            AI-Powered Retail Demand &amp; Inventory Intelligence
        </p>
    </div>
    """, unsafe_allow_html=True)

    # Sidebar
    sidebar_cfg = render_sidebar()
    page        = sidebar_cfg["page"]
    horizon     = sidebar_cfg["horizon"]
    lead_time   = sidebar_cfg["lead_time"]
    svc_level   = sidebar_cfg["service_level"]

    # Load data
    with st.spinner("⚙️ Loading and processing dataset..."):
        try:
            data = load_data()
        except Exception as e:
            st.error(f"❌ Data pipeline failed: {e}")
            st.stop()

    total_daily = data["total_daily"]
    daily       = data["daily"]

    # Build festival calendar
    date_min = str(pd.to_datetime(total_daily["Date"]).min().date())
    date_max = str(pd.to_datetime(total_daily["Date"]).max().date())
    years    = sorted(set(
        pd.to_datetime(total_daily["Date"]).dt.year.unique().tolist()
    ))
    date_range_key = f"{date_min}|{date_max}"
    years_key      = ",".join(map(str, years))

    with st.spinner("🎉 Building festival calendar..."):
        festival_calendar = get_festival_calendar_cached(date_range_key, years_key)

    # Festival lift analysis
    with st.spinner("📊 Computing festival impact..."):
        festival_lift_df = compute_festival_lift(total_daily, festival_calendar)

    # Build total features & train models
    with st.spinner("🔧 Engineering features..."):
        total_features = build_total_features_cached(total_daily, festival_calendar)

    data_hash = f"{len(total_daily)}_{total_daily['TotalQuantity'].sum():.0f}"
    with st.spinner("🤖 Training forecasting models (first run only — cached thereafter)..."):
        training_result = train_models_cached(data_hash, total_features)

    # Generate total forecast
    with st.spinner(f"🔮 Generating {horizon}-day forecast..."):
        total_forecast = forecast_total_demand(
            total_daily=total_features,
            training_result=training_result,
            horizon=horizon,
            festival_calendar=festival_calendar,
            target_col="TotalQuantity",
        )

    # Build inventory table
    with st.spinner("📦 Building inventory risk table..."):
        inventory_df = build_inventory_table(
            top_products=data["top_products"],
            daily_product=daily,
            training_result=training_result,
            festival_calendar=festival_calendar,
            forecast_horizon=horizon,
            lead_time_days=lead_time,
            max_products=25,
        )

    # Route to page
    if "Executive Overview" in page:
        page_overview(data, training_result, total_forecast, festival_lift_df, inventory_df)
    elif "Demand Trends" in page:
        page_demand_trends(data, total_forecast, horizon)
    elif "Product Forecast" in page:
        page_product_forecast(data, training_result, horizon, festival_calendar)
    elif "Festival Intelligence" in page:
        page_festival_intelligence(total_daily, festival_lift_df, festival_calendar)
    elif "Inventory Risk" in page:
        page_inventory_risk(inventory_df, horizon, lead_time, svc_level)
    elif "Business Insights" in page:
        page_business_insights(data, total_forecast, inventory_df, festival_lift_df, training_result)
    elif "Model Performance" in page:
        page_model_performance(training_result)

    # Footer
    st.markdown("---")
    st.markdown("""
    <div style="text-align:center; font-size:11px; color:#374151; padding: 8px 0;">
        Smart Demand Forecasting v1.0 &nbsp;|&nbsp;
        Data: Kaggle E-Commerce Dataset &nbsp;|&nbsp;
        ⚠️ Festival Intelligence & Inventory Levels are SIMULATED layers &nbsp;|&nbsp;
        Built for ML Portfolio Demonstration
    </div>
    """, unsafe_allow_html=True)


if __name__ == "__main__":
    main()
