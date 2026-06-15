const DEMO_USER = "admin";
const DEMO_PASS = "mhdesk";

const assets = [
  { label: "XAUUSD / Gold", tv: "OANDA:XAUUSD", short: "XAUUSD" },
  { label: "EUR/USD", tv: "FX:EURUSD", short: "EUR/USD" },
  { label: "EUR/JPY", tv: "FX:EURJPY", short: "EUR/JPY" },
  { label: "USD/JPY", tv: "FX:USDJPY", short: "USD/JPY" },
  { label: "GBP/USD", tv: "FX:GBPUSD", short: "GBP/USD" },
  { label: "GBP/JPY", tv: "FX:GBPJPY", short: "GBP/JPY" },
  { label: "USD/CHF", tv: "FX:USDCHF", short: "USD/CHF" },
  { label: "AUD/USD", tv: "FX:AUDUSD", short: "AUD/USD" },
  { label: "USD/CAD", tv: "FX:USDCAD", short: "USD/CAD" },
  { label: "NZD/USD", tv: "FX:NZDUSD", short: "NZD/USD" },
  { label: "US Oil", tv: "TVC:USOIL", short: "US Oil" },
  { label: "XAGUSD / Silver", tv: "OANDA:XAGUSD", short: "XAGUSD" },
  { label: "BTC/USD", tv: "BITSTAMP:BTCUSD", short: "BTC/USD" }
];

const timeframeLabels = {
  "1M": "Monthly",
  "1W": "Weekly",
  "D": "Daily",
  "240": "H4",
  "60": "H1",
  "30": "M30",
  "15": "M15",
  "5": "M5"
};

let activePromptType = "chatgpt";

const $ = (id) => document.getElementById(id);

function init() {
  hydrateAssetSelects();
  hydrateSession();
  bindEvents();
  updateThemeButton();
  setDefaultJournalDate();
  renderJournal();
  calculateScore();
}

function hydrateAssetSelects() {
  const selects = [$('assetSelect'), $('jAsset')];
  selects.forEach((select) => {
    select.innerHTML = assets.map((item) => `<option value="${item.tv}">${item.label}</option>`).join('');
  });
}

function hydrateSession() {
  const theme = localStorage.getItem('mh_theme') || 'dark';
  document.documentElement.setAttribute('data-theme', theme);

  if (localStorage.getItem('mh_session') === 'active') {
    showDashboard();
  } else {
    showLogin();
  }
}

function bindEvents() {
  $('loginForm').addEventListener('submit', onLogin);
  $('logoutBtn').addEventListener('click', () => {
    localStorage.removeItem('mh_session');
    showLogin();
  });
  $('themeToggle').addEventListener('click', toggleTheme);
  $('reloadChart').addEventListener('click', loadTradingViewChart);
  $('assetSelect').addEventListener('change', () => {
    $('jAsset').value = $('assetSelect').value;
    loadTradingViewChart();
  });
  $('timeframeSelect').addEventListener('change', loadTradingViewChart);
  $('reloadCalendar').addEventListener('click', loadCalendarWidget);
  $('generatePrompt').addEventListener('click', generatePrompt);
  $('copyPrompt').addEventListener('click', copyPrompt);
  $('chatgptTab').addEventListener('click', () => setPromptType('chatgpt'));
  $('claudeTab').addEventListener('click', () => setPromptType('claude'));
  document.querySelectorAll('.score-input').forEach((input) => input.addEventListener('input', calculateScore));
  $('journalForm').addEventListener('submit', addJournalEntry);
  $('exportCsv').addEventListener('click', exportCsv);
  $('exportPdf').addEventListener('click', exportPdf);
}

function onLogin(event) {
  event.preventDefault();
  const user = $('loginUser').value.trim();
  const pass = $('loginPass').value.trim();
  if (user === DEMO_USER && pass === DEMO_PASS) {
    localStorage.setItem('mh_session', 'active');
    $('loginError').textContent = '';
    showDashboard();
    return;
  }
  $('loginError').textContent = 'Invalid username or password.';
}

function showDashboard() {
  $('loginView').classList.add('hidden');
  $('dashboardView').classList.remove('hidden');
  loadTradingViewChart();
  loadCalendarWidget();
}

function showLogin() {
  $('dashboardView').classList.add('hidden');
  $('loginView').classList.remove('hidden');
}

function toggleTheme() {
  const next = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', next);
  localStorage.setItem('mh_theme', next);
  updateThemeButton();
  loadTradingViewChart();
  loadCalendarWidget();
}

function updateThemeButton() {
  const current = document.documentElement.getAttribute('data-theme');
  $('themeToggle').textContent = current === 'dark' ? 'Light Mode' : 'Dark Mode';
}

function currentTheme() {
  return document.documentElement.getAttribute('data-theme') || 'dark';
}

function selectedAsset() {
  const tv = $('assetSelect').value;
  return assets.find((item) => item.tv === tv) || assets[0];
}

function loadTradingViewChart() {
  const container = $('tradingViewContainer');
  const asset = selectedAsset();
  const interval = $('timeframeSelect').value;
  const theme = currentTheme();
  container.innerHTML = '<div class="tradingview-widget-container" style="height:100%;width:100%"><div class="tradingview-widget-container__widget" style="height:calc(100% - 32px);width:100%"></div><div class="tradingview-widget-copyright"><a href="https://www.tradingview.com/" rel="noopener nofollow" target="_blank">Chart by TradingView</a></div></div>';
  const script = document.createElement('script');
  script.type = 'text/javascript';
  script.src = 'https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js';
  script.async = true;
  script.innerHTML = JSON.stringify({
    autosize: true,
    symbol: asset.tv,
    interval,
    timezone: "Asia/Dubai",
    theme,
    style: "1",
    locale: "en",
    allow_symbol_change: true,
    calendar: false,
    details: true,
    hide_side_toolbar: false,
    hide_top_toolbar: false,
    hide_legend: false,
    hide_volume: false,
    hotlist: false,
    save_image: true,
    withdateranges: window.matchMedia('(min-width: 430px)').matches,
    backgroundColor: theme === 'dark' ? '#0b1022' : '#ffffff',
    gridColor: theme === 'dark' ? 'rgba(255,255,255,0.07)' : 'rgba(15,23,42,0.08)',
    studies: [],
    support_host: "https://www.tradingview.com"
  });
  script.onerror = () => {
    container.innerHTML = '<div class="widget-fallback" role="status">TradingView chart could not load. Check your internet connection, ad blocker, or reload the chart.</div>';
  };
  container.querySelector('.tradingview-widget-container').appendChild(script);
}

function loadCalendarWidget() {
  const container = $('calendarWidget');
  const theme = currentTheme();
  container.innerHTML = '<div class="tradingview-widget-container" style="height:100%;width:100%"><div class="tradingview-widget-container__widget"></div><div class="tradingview-widget-copyright"><a href="https://www.tradingview.com/economic-calendar/" rel="noopener nofollow" target="_blank">Economic Calendar by TradingView</a></div></div>';
  const script = document.createElement('script');
  script.type = 'text/javascript';
  script.src = 'https://s3.tradingview.com/external-embedding/embed-widget-events.js';
  script.async = true;
  script.innerHTML = JSON.stringify({
    colorTheme: theme,
    isTransparent: false,
    locale: "en",
    countryFilter: "us,eu,gb,jp,ca,au,nz,ch,cn",
    importanceFilter: "0,1",
    width: "100%",
    height: "100%"
  });
  script.onerror = () => {
    container.innerHTML = '<div class="widget-fallback" role="status">Economic calendar could not load. Latest news/calendar data could not be verified here; check TradingView or your broker calendar before trading.</div>';
  };
  container.querySelector('.tradingview-widget-container').appendChild(script);
}

function setPromptType(type) {
  activePromptType = type;
  $('chatgptTab').classList.toggle('active', type === 'chatgpt');
  $('claudeTab').classList.toggle('active', type === 'claude');
  generatePrompt();
}

function generatePrompt() {
  const asset = selectedAsset();
  const interval = timeframeLabels[$('timeframeSelect').value] || $('timeframeSelect').value;
  const currentPrice = $('currentPrice').value.trim() || 'Not provided — do not invent exact levels.';
  const chartNotes = $('chartNotes').value.trim() || 'No screenshot notes provided yet. Ask me to upload Monthly, Weekly, Daily, H4, H1, M30, M15, and M5 screenshots before giving exact levels.';
  const calendarNotes = $('calendarNotes').value.trim() || 'Latest economic calendar/news data not pasted here. Say: Latest news/calendar data could not be verified.';
  const newsNotes = $('newsNotes').value.trim() || 'No verified geopolitical/sentiment notes pasted.';
  const risk = $('riskProfile').value;

  const basePrompt = `You are an expert ${asset.short} trading analyst, professional price action trader, multi-timeframe technical analyst, macroeconomic analyst, and risk-management specialist.

TASK
Analyze ${asset.short} using Monthly, Weekly, Daily, H4, H1, M30, M15, and M5. Find the best high-probability short-term scalping opportunity on M15 or M5 only if the setup is clean. Do not force a trade.

CURRENT INPUTS
Asset: ${asset.short}
TradingView symbol: ${asset.tv}
Current active dashboard timeframe: ${interval}
Current price / area: ${currentPrice}
Risk profile: ${risk}

CHART / SCREENSHOT NOTES
${chartNotes}

ECONOMIC CALENDAR / MACRO NOTES
${calendarNotes}

GEOPOLITICAL / SENTIMENT NOTES
${newsNotes}

VERY IMPORTANT RULES
- Do not give random buy/sell signals.
- If the market is unclear, say exactly: No Trade Setup — wait for better price action confirmation.
- Price action is the highest priority. Indicators are confirmation only.
- Never say guaranteed profit or 100% sure.
- If live price, chart screenshots, or current market data are not provided, do not invent exact levels.
- If latest news/calendar data cannot be verified, say: Latest news/calendar data could not be verified.
- Avoid trading before high-impact news. Wait for confirmation after volatility.

TOOLS / INDICATORS TO CHECK
EMA 50, EMA 200, Bollinger Bands 20/2, Volume, Daily Pivot Points, Fibonacci Retracement, Fibonacci Extension, support/resistance, HH/HL/LH/LL, BOS, CHoCH, liquidity sweep, rejection candle, engulfing candle, pin bar, fake breakout.

ENTRY RULES
BUY only if HTF is bullish or reversal is confirmed, M15/M5 sweeps liquidity below support, closes back above support, prints bullish CHoCH/BOS, retests broken level, confirms with bullish candle and volume, and R:R is at least 1:2.
SELL only if HTF is bearish or reversal is confirmed, M15/M5 sweeps liquidity above resistance, closes back below resistance, prints bearish CHoCH/BOS, retests broken level, confirms with bearish candle and volume, and R:R is at least 1:2.

SCORECARD
Higher-timeframe alignment: /2
Fundamental/news support: /2
Market structure confirmation: /2
M15/M5 entry confirmation: /2
Risk-reward quality: /2
Total: /10
Decision rule: 0–5 No Trade, 6–7 Watch only, 8 Valid setup, 9 Strong setup, 10 Rare A+ setup. Only give BUY or SELL at 8/10 or higher.

FINAL FORMAT
${asset.short} Multi-Timeframe Analysis
Current Bias:
News Risk:
Geopolitical Sentiment:
Monthly:
Weekly:
Daily:
H4:
H1:
M30:
M15:
M5:
Trade Score: /10
Best Trade Setup:
Trade Decision:
Trade Type:
Best Entry Timeframe:
Entry Zone:
Entry Trigger:
Stop Loss:
TP1:
TP2:
TP3:
Risk-Reward:
Invalidation:
Confidence:
Reason:
Final Warning:`;

  const claudePrefix = `Act as my second-opinion risk filter. Be stricter than the first analysis. Challenge weak assumptions, identify missing evidence, and only approve a setup if the scoring rules support 8/10 or higher.\n\n`;
  $('promptOutput').value = activePromptType === 'claude' ? claudePrefix + basePrompt : basePrompt;
}

async function copyPrompt() {
  const prompt = $('promptOutput').value || '';
  if (!prompt.trim()) generatePrompt();
  try {
    await navigator.clipboard.writeText($('promptOutput').value);
    $('copyPrompt').textContent = 'Copied!';
    setTimeout(() => ($('copyPrompt').textContent = 'Copy Prompt'), 1200);
  } catch (error) {
    $('promptOutput').select();
    document.execCommand('copy');
  }
}

function calculateScore() {
  let total = 0;
  document.querySelectorAll('.score-input').forEach((input) => {
    const value = Math.max(0, Math.min(2, parseFloat(input.value || '0')));
    input.value = Number.isInteger(value) ? value : value.toFixed(1);
    total += value;
  });
  $('scoreBadge').textContent = `${total.toFixed(total % 1 === 0 ? 0 : 1)} / 10`;
  const box = $('tradeDecision');
  box.classList.remove('no-trade', 'watch', 'valid');
  if (total < 6) {
    box.classList.add('no-trade');
    box.textContent = 'No Trade Setup — wait for better price action confirmation.';
  } else if (total < 8) {
    box.classList.add('watch');
    box.textContent = 'Watch Only — setup is not strong enough for BUY/SELL. Wait for M15/M5 confirmation.';
  } else if (total === 8) {
    box.classList.add('valid');
    box.textContent = 'Valid Setup — entry allowed only after trigger candle, retest, news-risk check, and 1:2+ R:R.';
  } else if (total === 9) {
    box.classList.add('valid');
    box.textContent = 'Strong Setup — still wait for exact entry trigger and invalidation confirmation.';
  } else {
    box.classList.add('valid');
    box.textContent = 'Rare A+ Setup — execute only with fixed risk and no news conflict.';
  }
}

function setDefaultJournalDate() {
  const now = new Date();
  now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
  $('jDate').value = now.toISOString().slice(0, 16);
}

function getJournal() {
  try { return JSON.parse(localStorage.getItem('mh_journal') || '[]'); }
  catch { return []; }
}

function setJournal(items) {
  localStorage.setItem('mh_journal', JSON.stringify(items));
}

function addJournalEntry(event) {
  event.preventDefault();
  const asset = assets.find(item => item.tv === $('jAsset').value) || assets[0];
  const entry = {
    id: createId(),
    date: $('jDate').value,
    asset: asset.short,
    type: $('jType').value,
    entry: $('jEntry').value.trim(),
    sl: $('jSl').value.trim(),
    tp: $('jTp').value.trim(),
    score: $('jScore').value.trim(),
    result: $('jResult').value,
    notes: $('jNotes').value.trim()
  };
  const journal = [entry, ...getJournal()];
  setJournal(journal);
  $('journalForm').reset();
  setDefaultJournalDate();
  $('jAsset').value = $('assetSelect').value;
  renderJournal();
}

function renderJournal() {
  const body = $('journalBody');
  const journal = getJournal();
  if (!journal.length) {
    body.innerHTML = '<tr><td colspan="10" class="muted">No journal entries yet. Add your first watchlist or trade decision.</td></tr>';
    return;
  }
  body.innerHTML = journal.map((row) => `
    <tr>
      <td data-label="Date">${escapeHtml(row.date || '')}</td>
      <td data-label="Asset">${escapeHtml(row.asset || '')}</td>
      <td data-label="Type">${escapeHtml(row.type || '')}</td>
      <td data-label="Entry">${escapeHtml(row.entry || '')}</td>
      <td data-label="SL">${escapeHtml(row.sl || '')}</td>
      <td data-label="TP">${escapeHtml(row.tp || '')}</td>
      <td data-label="Score">${escapeHtml(row.score || '')}</td>
      <td data-label="Result">${escapeHtml(row.result || '')}</td>
      <td data-label="Notes">${escapeHtml(row.notes || '')}</td>
      <td data-label="Action"><button class="delete-row" type="button" data-delete-id="${escapeHtml(row.id)}">Delete</button></td>
    </tr>
  `).join('');
}

document.addEventListener('click', (event) => {
  const button = event.target.closest('[data-delete-id]');
  if (!button) return;
  deleteJournalEntry(button.dataset.deleteId);
});

function deleteJournalEntry(id) {
  setJournal(getJournal().filter((row) => row.id !== id));
  renderJournal();
}
window.deleteJournalEntry = deleteJournalEntry;

function exportCsv() {
  const journal = getJournal();
  const headers = ['Date','Asset','Type','Entry','Stop Loss','Take Profit','Score','Result','Notes'];
  const rows = journal.map((row) => [row.date,row.asset,row.type,row.entry,row.sl,row.tp,row.score,row.result,row.notes]);
  const csv = [headers, ...rows].map((row) => row.map(csvEscape).join(',')).join('\n');
  downloadFile(`ai-trading-journal-${todayStamp()}.csv`, csv, 'text/csv;charset=utf-8');
}

function exportPdf() {
  const journal = getJournal();
  const htmlRows = journal.map((row) => `
    <tr><td>${escapeHtml(row.date)}</td><td>${escapeHtml(row.asset)}</td><td>${escapeHtml(row.type)}</td><td>${escapeHtml(row.entry)}</td><td>${escapeHtml(row.sl)}</td><td>${escapeHtml(row.tp)}</td><td>${escapeHtml(row.score)}</td><td>${escapeHtml(row.result)}</td><td>${escapeHtml(row.notes)}</td></tr>
  `).join('');
  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    window.alert('PDF export was blocked by the browser. Please allow pop-ups for this site and try Export PDF again.');
    return;
  }
  printWindow.document.write(`<!doctype html><html><head><title>AI Trading Journal</title><style>body{font-family:Arial,sans-serif;padding:24px;color:#111}h1{margin:0 0 12px}table{width:100%;border-collapse:collapse;font-size:12px}th,td{border:1px solid #ddd;padding:8px;text-align:left;vertical-align:top}th{background:#f3f4f6}.muted{color:#666}</style></head><body><h1>AI Trading Journal</h1><p class="muted">Generated ${new Date().toLocaleString()}</p><table><thead><tr><th>Date</th><th>Asset</th><th>Type</th><th>Entry</th><th>SL</th><th>TP</th><th>Score</th><th>Result</th><th>Notes</th></tr></thead><tbody>${htmlRows || '<tr><td colspan="9">No entries.</td></tr>'}</tbody></table><script>window.onload=()=>setTimeout(()=>window.print(),300)<\/script></body></html>`);
  printWindow.document.close();
}

function csvEscape(value = '') {
  const string = String(value).replace(/"/g, '""');
  return `"${string}"`;
}

function downloadFile(filename, content, type) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function createId() {
  if (globalThis.crypto && typeof globalThis.crypto.randomUUID === 'function') {
    return globalThis.crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function todayStamp() {
  return new Date().toISOString().slice(0, 10);
}

function escapeHtml(value = '') {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

init();
