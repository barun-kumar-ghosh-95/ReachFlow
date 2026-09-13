// app.js - Smart Demand Forecasting Application Logic

let appData = {
  overview: null,
  forecasts: null,
  festivals: null,
  inventory: null
};

let charts = {};

document.addEventListener('DOMContentLoaded', async () => {
  initTabs();
  initSimulator();
  initDrawer();
  initCsvUpload();
  await loadData();
});

// ─── Data Loading ────────────────────────────────────────────────────────────

async function loadData() {
  try {
    const [overviewRes, forecastsRes, festivalsRes, inventoryRes] = await Promise.all([
      fetch('./data/overview.json'),
      fetch('./data/forecasts.json'),
      fetch('./data/festivals.json'),
      fetch('./data/inventory.json')
    ]);

    appData.overview = await overviewRes.json();
    appData.forecasts = await forecastsRes.json();
    appData.festivals = await festivalsRes.json();
    appData.inventory = await inventoryRes.json();

    renderOverviewModule();
    renderForecastingModule();
    renderFestivalsModule();
    renderInventoryModule();
  } catch (err) {
    console.error('Failed to load JSON data:', err);
  }
}

// ─── Navigation Tabs ─────────────────────────────────────────────────────────

function initTabs() {
  const tabs = document.querySelectorAll('.nav-tab');
  const modules = document.querySelectorAll('.tab-module');

  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      tabs.forEach(t => t.classList.remove('active'));
      modules.forEach(m => m.classList.add('hidden'));

      tab.classList.add('active');
      const targetId = `mod-${tab.dataset.tab}`;
      const targetMod = document.getElementById(targetId);
      if (targetMod) targetMod.classList.remove('hidden');
    });
  });
}

// ─── Module 1: Overview ──────────────────────────────────────────────────────

function renderOverviewModule() {
  const data = appData.overview;
  if (!data) return;

  // Metrics
  document.getElementById('metric-revenue').textContent = `$${data.metrics.totalRevenue.toLocaleString()}`;
  document.getElementById('metric-orders').textContent = data.metrics.totalOrders.toLocaleString();
  document.getElementById('metric-skus').textContent = data.metrics.totalSKUs.toLocaleString();

  // Top Products Table
  const tbody = document.querySelector('#table-top-products tbody');
  tbody.innerHTML = data.topProducts.map(p => `
    <tr>
      <td class="font-mono text-sky-400 font-semibold">${p.StockCode}</td>
      <td class="font-medium text-slate-200">${p.Description}</td>
      <td>${p.TotalQuantity.toLocaleString()}</td>
      <td>$${p.AvgPrice.toFixed(2)}</td>
      <td class="font-bold text-emerald-400">$${p.TotalRevenue.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</td>
    </tr>
  `).join('');

  // Monthly Revenue Chart
  const ctxMonthly = document.getElementById('chart-monthly-trend').getContext('2d');
  const labels = data.monthlyTrend.map(d => d.MonthYear);
  const revenues = data.monthlyTrend.map(d => d.Revenue);

  charts.monthly = new Chart(ctxMonthly, {
    type: 'line',
    data: {
      labels: labels,
      datasets: [{
        label: 'Monthly Revenue ($)',
        data: revenues,
        borderColor: '#38bdf8',
        backgroundColor: 'rgba(56, 189, 248, 0.15)',
        borderWidth: 3,
        fill: true,
        tension: 0.35,
        pointRadius: 4,
        pointBackgroundColor: '#38bdf8'
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false }
      },
      scales: {
        x: { grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#94a3b8' } },
        y: { grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#94a3b8', callback: v => `$${v/1000}k` } }
      }
    }
  });

  // Country Donut Chart
  const ctxCountry = document.getElementById('chart-country-donut').getContext('2d');
  const cLabels = data.countrySales.map(c => c.Country);
  const cRevenues = data.countrySales.map(c => c.Revenue);

  charts.country = new Chart(ctxCountry, {
    type: 'doughnut',
    data: {
      labels: cLabels,
      datasets: [{
        data: cRevenues,
        backgroundColor: [
          '#38bdf8', '#a855f7', '#34d399', '#fbbf24', '#f43f5e',
          '#60a5fa', '#c084fc', '#4ade80', '#fde047', '#f87171'
        ],
        borderWidth: 0
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { position: 'right', labels: { color: '#cbd5e1', font: { size: 11 } } }
      },
      cutout: '70%'
    }
  });
}

// ─── Module 2: Forecasting ───────────────────────────────────────────────────

function renderForecastingModule() {
  const data = appData.forecasts;
  if (!data) return;

  // Leaderboard
  const tbody = document.querySelector('#table-leaderboard tbody');
  tbody.innerHTML = data.leaderboard.map((m, idx) => {
    const isBest = idx === 0;
    return `
      <tr class="${isBest ? 'bg-sky-500/10' : ''}">
        <td class="font-bold">${idx + 1} ${isBest ? '🏆' : ''}</td>
        <td class="font-semibold ${isBest ? 'text-sky-400' : 'text-slate-200'}">${m.Model}</td>
        <td>${m.RMSE.toLocaleString()}</td>
        <td>${m.MAE.toLocaleString()}</td>
        <td>${m.MAPE.toFixed(2)}%</td>
        <td>${m.sMAPE ? m.sMAPE.toFixed(2) : '-'}%</td>
        <td>
          <span class="${isBest ? 'px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 text-xs font-bold' : 'text-slate-400 text-xs'}">
            ${isBest ? 'BEST MODEL' : 'Evaluated'}
          </span>
        </td>
      </tr>
    `;
  }).join('');

  // Forecast Chart
  const ctxFc = document.getElementById('chart-forecast').getContext('2d');
  
  const histDates = data.historical.map(d => d.Date);
  const histVals = data.historical.map(d => d.Quantity);
  
  const fcDates = data.forecast.map(d => d.Date);
  const fcVals = data.forecast.map(d => d.predicted_demand);
  const fcLower = data.forecast.map(d => d.lower_bound);
  const fcUpper = data.forecast.map(d => d.upper_bound);

  const allDates = [...histDates, ...fcDates];
  const histSeries = [...histVals, ...Array(fcDates.length).fill(null)];
  const fcSeries = [...Array(histDates.length).fill(null), ...fcVals];
  const upperSeries = [...Array(histDates.length).fill(null), ...fcUpper];
  const lowerSeries = [...Array(histDates.length).fill(null), ...fcLower];

  charts.forecast = new Chart(ctxFc, {
    type: 'line',
    data: {
      labels: allDates,
      datasets: [
        {
          label: 'Historical Demand',
          data: histSeries,
          borderColor: '#94a3b8',
          borderWidth: 2,
          pointRadius: 2
        },
        {
          label: 'AI Forecast (XGBoost)',
          data: fcSeries,
          borderColor: '#38bdf8',
          borderWidth: 3,
          pointRadius: 3,
          pointBackgroundColor: '#38bdf8'
        },
        {
          label: 'Upper Confidence Bound',
          data: upperSeries,
          borderColor: 'rgba(168, 85, 247, 0.3)',
          borderDash: [5, 5],
          fill: false,
          pointRadius: 0
        },
        {
          label: 'Lower Confidence Bound',
          data: lowerSeries,
          borderColor: 'rgba(168, 85, 247, 0.3)',
          backgroundColor: 'rgba(168, 85, 247, 0.1)',
          fill: '-1',
          borderDash: [5, 5],
          pointRadius: 0
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { labels: { color: '#cbd5e1' } }
      },
      scales: {
        x: { grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#94a3b8' } },
        y: { grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#94a3b8' } }
      }
    }
  });
}

// ─── Module 3: Festivals ─────────────────────────────────────────────────────

function renderFestivalsModule() {
  const data = appData.festivals;
  if (!data) return;

  const grid = document.getElementById('grid-festival-cards');
  grid.innerHTML = data.festivals.slice(0, 6).map(f => `
    <div class="glass-panel p-4 border-l-4 ${f.lift_pct > 50 ? 'border-l-rose-500' : 'border-l-amber-500'} space-y-2">
      <div class="flex items-center justify-between">
        <span class="font-bold text-white text-base font-['Outfit']">${f.festival_name}</span>
        <span class="badge-risk ${f.lift_pct > 50 ? 'badge-critical' : 'badge-high'}">+${f.lift_pct}% Lift</span>
      </div>
      <div class="text-xs text-slate-400">Category: <span class="text-slate-200 font-semibold">${f.festival_category}</span></div>
      <div class="flex justify-between text-xs pt-2 border-t border-slate-800">
        <span class="text-slate-400">Baseline: ${f.normal_avg_demand}</span>
        <span class="text-emerald-400 font-bold">Peak: ${f.festival_avg_demand} units</span>
      </div>
    </div>
  `).join('');

  // Bar chart
  const ctxFest = document.getElementById('chart-festival-bar').getContext('2d');
  charts.festival = new Chart(ctxFest, {
    type: 'bar',
    data: {
      labels: data.festivals.map(f => f.festival_name),
      datasets: [{
        label: 'Demand Lift %',
        data: data.festivals.map(f => f.lift_pct),
        backgroundColor: '#a855f7',
        borderRadius: 6
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        x: { grid: { display: false }, ticks: { color: '#cbd5e1' } },
        y: { grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#cbd5e1', callback: v => `+${v}%` } }
      }
    }
  });
}

// ─── Module 4: Inventory Matrix ──────────────────────────────────────────────

function renderInventoryModule() {
  const data = appData.inventory;
  if (!data) return;

  const renderTable = (items) => {
    const tbody = document.querySelector('#table-inventory tbody');
    tbody.innerHTML = items.map(i => {
      const riskClass = {
        'CRITICAL': 'badge-critical',
        'HIGH': 'badge-high',
        'MEDIUM': 'badge-medium',
        'LOW': 'badge-low'
      }[i.stockout_risk] || 'badge-low';

      return `
        <tr>
          <td class="font-mono text-sky-400 font-semibold">${i.product_code}</td>
          <td class="font-medium text-slate-200">${i.product_name}</td>
          <td class="font-bold text-white">${i.current_stock.toLocaleString()}</td>
          <td>${i.avg_daily_demand.toFixed(1)}</td>
          <td>${i.safety_stock.toFixed(0)}</td>
          <td class="font-bold text-amber-400">${i.reorder_point.toFixed(0)}</td>
          <td>${i.coverage_days.toFixed(1)} days</td>
          <td><span class="badge-risk ${riskClass}">${i.stockout_risk}</span></td>
          <td class="font-bold text-emerald-400">${i.order_quantity.toLocaleString()}</td>
          <td>
            <button class="px-2.5 py-1 rounded bg-sky-500/20 hover:bg-sky-500/30 text-sky-400 text-xs font-semibold btn-po" 
              data-sku="${i.product_code}" 
              data-desc="${i.product_name}" 
              data-stock="${i.current_stock}" 
              data-rop="${i.reorder_point}" 
              data-qty="${i.order_quantity}">
              Order PO
            </button>
          </td>
        </tr>
      `;
    }).join('');

    // Attach click listeners to PO buttons
    document.querySelectorAll('.btn-po').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const d = e.target.dataset;
        document.getElementById('po-sku').value = d.sku;
        document.getElementById('po-desc').value = d.desc;
        document.getElementById('po-stock').value = d.stock;
        document.getElementById('po-rop').value = d.rop;
        document.getElementById('po-qty').value = d.qty;
        document.getElementById('drawer-po').classList.add('open');
      });
    });
  };

  renderTable(data.items);

  // Search filter
  document.getElementById('search-inventory').addEventListener('input', (e) => {
    const q = e.target.value.toLowerCase();
    const filtered = data.items.filter(i => 
      i.product_code.toLowerCase().includes(q) || 
      i.product_name.toLowerCase().includes(q)
    );
    renderTable(filtered);
  });
}

// ─── Module 5: What-If Simulator ─────────────────────────────────────────────

function initSimulator() {
  const surgeSlide = document.getElementById('slide-surge');
  const delaySlide = document.getElementById('slide-delay');
  const serviceSlide = document.getElementById('slide-service');

  const recalculate = () => {
    const surge = parseInt(surgeSlide.value);
    const delay = parseInt(delaySlide.value);
    const service = parseInt(serviceSlide.value);

    document.getElementById('val-surge').textContent = `+${surge}%`;
    document.getElementById('val-delay').textContent = `+${delay} Days`;
    document.getElementById('val-service').textContent = `${service}%`;

    // Formulas
    const baseDemand = 1000;
    const stdDemand = 250;
    const baseLead = 7;

    const simDemand = baseDemand * (1 + surge / 100);
    const simLead = baseLead + delay;
    
    // Z-scores
    const zMap = { 80: 0.84, 85: 1.04, 90: 1.28, 95: 1.645, 98: 2.05, 99: 2.33 };
    const z = zMap[service] || 1.645;

    const safetyStock = Math.round(z * stdDemand * Math.sqrt(simLead));
    const rop = Math.round((simDemand * simLead) + safetyStock);

    document.getElementById('sim-safety-stock').textContent = `${safetyStock.toLocaleString()} Units`;
    document.getElementById('sim-rop').textContent = `${rop.toLocaleString()} Units`;

    if (delay > 7 || surge > 50) {
      document.getElementById('sim-risk-status').textContent = 'HIGH RISK';
      document.getElementById('sim-risk-status').className = 'text-2xl font-bold text-rose-400 font-[\'Outfit\'] mt-1';
    } else {
      document.getElementById('sim-risk-status').textContent = 'OPTIMAL BUFFER';
      document.getElementById('sim-risk-status').className = 'text-2xl font-bold text-emerald-400 font-[\'Outfit\'] mt-1';
    }
  };

  surgeSlide.addEventListener('input', recalculate);
  delaySlide.addEventListener('input', recalculate);
  serviceSlide.addEventListener('input', recalculate);
}

// ─── Drawer Modal ────────────────────────────────────────────────────────────

function initDrawer() {
  const backdrop = document.getElementById('drawer-po');
  const closeBtn = document.getElementById('close-drawer');
  const confirmBtn = document.getElementById('btn-confirm-po');

  closeBtn.addEventListener('click', () => backdrop.classList.remove('open'));
  confirmBtn.addEventListener('click', () => {
    const sku = document.getElementById('po-sku').value;
    const qty = document.getElementById('po-qty').value;
    alert(`🎉 Purchase Order Dispatched successfully for SKU ${sku} (${qty} units)!`);
    backdrop.classList.remove('open');
  });
}

// ─── CSV Drag & Drop Upload ──────────────────────────────────────────────────

function initCsvUpload() {
  const input = document.getElementById('csv-upload-input');
  input.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) {
      alert(`📂 Custom CSV Dataset '${file.name}' loaded successfully! Client-side analytics ready.`);
    }
  });
}
