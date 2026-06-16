const DEMO_LOGIN_NOTE = "Demo-only local session; not real authentication.";

const assets = [
  { label: "XAUUSD / Gold", tv: "OANDA:XAUUSD", short: "XAUUSD", priceSymbol: "GC=F" },
  { label: "EUR/USD", tv: "FX:EURUSD", short: "EUR/USD", priceSymbol: "EURUSD=X" },
  { label: "EUR/JPY", tv: "FX:EURJPY", short: "EUR/JPY", priceSymbol: "EURJPY=X" },
  { label: "USD/JPY", tv: "FX:USDJPY", short: "USD/JPY", priceSymbol: "JPY=X" },
  { label: "GBP/USD", tv: "FX:GBPUSD", short: "GBP/USD", priceSymbol: "GBPUSD=X" },
  { label: "GBP/JPY", tv: "FX:GBPJPY", short: "GBP/JPY", priceSymbol: "GBPJPY=X" },
  { label: "USD/CHF", tv: "FX:USDCHF", short: "USD/CHF", priceSymbol: "CHF=X" },
  { label: "AUD/USD", tv: "FX:AUDUSD", short: "AUD/USD", priceSymbol: "AUDUSD=X" },
  { label: "USD/CAD", tv: "FX:USDCAD", short: "USD/CAD", priceSymbol: "CAD=X" },
  { label: "NZD/USD", tv: "FX:NZDUSD", short: "NZD/USD", priceSymbol: "NZDUSD=X" },
  { label: "US Oil", tv: "TVC:USOIL", short: "US Oil", priceSymbol: "CL=F" },
  { label: "XAGUSD / Silver", tv: "OANDA:XAGUSD", short: "XAGUSD", priceSymbol: "SI=F" },
  { label: "BTC/USD", tv: "BINANCE:BTCUSDT", short: "BTC/USD", priceSymbol: "BTC-USD" }
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
let activePriceRequestId = 0;

const BACKUP_SCHEMA = "ai-trading-desk-mh-local-backup";
const BACKUP_VERSION = 1;

const manualTimeframes = [
  { key: "monthly", label: "Monthly" },
  { key: "weekly", label: "Weekly" },
  { key: "daily", label: "Daily" },
  { key: "h4", label: "H4" },
  { key: "h1", label: "H1" },
  { key: "m30", label: "M30" },
  { key: "m15", label: "M15" },
  { key: "m5", label: "M5" }
];

const analysisFieldIds = [
  "currentPrice",
  "chartNotes",
  "dxyNotes",
  "bondYieldNotes",
  "calendarNotes",
  "newsNotes"
];

const $ = (id) => document.getElementById(id);

function init() {
  hydrateAssetSelects();
  renderTimeframeUploads();
  hydrateSavedAnalysisInputs();
  hydrateSession();
  bindEvents();
  updateThemeButton();
  setDefaultJournalDate();
  renderJournal();
  calculateScore();
}

function hydrateAssetSelects() {
  const selects = [$('assetSelect'), $('jAsset'), $('filterSymbol')];
  selects.forEach((select) => {
    if (select.id === 'filterSymbol') {
      select.innerHTML = '<option value="">All symbols</option>' + assets.map((item) => `<option value="${item.short}">${item.label}</option>`).join('');
      return;
    }
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
    updateCurrentPriceFromSelectedAsset();
    updateAssetInfoPanel();
  });
  $('timeframeSelect').addEventListener('change', () => {
    loadTradingViewChart();
    updateAssetInfoPanel();
  });
  $('reloadCalendar').addEventListener('click', loadCalendarWidget);
  bindLocalAnalysisStorage();
  $('generatePrompt').addEventListener('click', generatePrompt);
  $('copyPrompt').addEventListener('click', copyPrompt);
  $('chatgptTab').addEventListener('click', () => setPromptType('chatgpt'));
  $('claudeTab').addEventListener('click', () => setPromptType('claude'));
  document.querySelectorAll('.score-input').forEach((input) => input.addEventListener('input', calculateScore));
  document.querySelectorAll('.score-choice').forEach((button) => button.addEventListener('click', onScoreChoice));
  $('currentPrice').addEventListener('input', () => updatePriceStatus('Manual fallback — user-entered price/area', 'manual'));
  $('journalForm').addEventListener('submit', addJournalEntry);
  ['filterSymbol', 'filterType', 'filterScoreMin', 'filterScoreMax', 'filterResult', 'filterDateFrom', 'filterDateTo', 'filterNotes'].forEach((id) => {
    $(id).addEventListener('input', renderJournal);
    $(id).addEventListener('change', renderJournal);
  });
  $('clearJournalFilters').addEventListener('click', clearJournalFilters);
  $('exportCsv').addEventListener('click', exportCsv);
  $('exportPdf').addEventListener('click', exportPdf);
  $('exportBackup').addEventListener('click', exportLocalBackup);
  $('importBackupTrigger').addEventListener('click', () => $('importBackupFile').click());
  $('importBackupFile').addEventListener('change', importLocalBackup);
  $('clearLocalData').addEventListener('click', clearAllLocalData);
  updateAssetInfoPanel();
  updateScreenshotStatusSummary();
}

function renderTimeframeUploads() {
  const grid = $('timeframeUploadGrid');
  if (!grid) return;
  grid.innerHTML = manualTimeframes.map(({ key, label }) => `
    <article class="timeframe-card">
      <div class="timeframe-card-head">
        <div>
          <h3>${label}</h3>
          <span id="${key}Status" class="upload-status missing">Missing</span>
        </div>
        <button class="ghost-btn small-btn" type="button" data-clear-timeframe="${key}">Clear</button>
      </div>
      <label class="upload-drop-area" for="${key}Screenshot">
        <span class="upload-drop-title">Upload ${label} screenshot</span>
        <span id="${key}FileName" class="upload-file-name">No file selected</span>
        <span class="upload-drop-hint">Click to choose a local image. Nothing is uploaded.</span>
        <input id="${key}Screenshot" class="visually-hidden" type="file" accept="image/*" data-timeframe-upload="${key}" />
      </label>
      <div id="${key}Preview" class="screenshot-preview" role="status" aria-label="${label} screenshot preview">No screenshot selected.</div>
      <label>
        ${label} notes
        <textarea id="${key}Notes" rows="4" data-timeframe-notes="${key}" placeholder="${label} notes:"></textarea>
      </label>
    </article>
  `).join('');
  hydrateTimeframeUploads();
}

function bindLocalAnalysisStorage() {
  analysisFieldIds.forEach((id) => {
    const field = $(id);
    if (!field) return;
    field.addEventListener('input', () => {
      localStorage.setItem(`mh_analysis_${id}`, sanitizePlainText(field.value, 12000));
      showAutosave();
    });
  });

  document.querySelectorAll('[data-timeframe-notes]').forEach((field) => {
    field.addEventListener('input', () => {
      localStorage.setItem(`mh_timeframe_notes_${field.dataset.timeframeNotes}`, sanitizePlainText(field.value, 12000));
      showAutosave();
      syncChartNotesSummary();
    });
  });

  document.querySelectorAll('[data-timeframe-upload]').forEach((input) => {
    input.addEventListener('change', handleScreenshotUpload);
  });
}

function hydrateSavedAnalysisInputs() {
  analysisFieldIds.forEach((id) => {
    const field = $(id);
    if (!field) return;
    field.value = localStorage.getItem(`mh_analysis_${id}`) || '';
  });
}

function hydrateTimeframeUploads() {
  manualTimeframes.forEach(({ key }) => {
    const notes = $(`${key}Notes`);
    if (notes) notes.value = localStorage.getItem(`mh_timeframe_notes_${key}`) || '';
    renderScreenshotPreview(key);
  });
  syncChartNotesSummary();
  updateScreenshotStatusSummary();
}


function handleScreenshotUpload(event) {
  const input = event.target;
  const key = input.dataset.timeframeUpload;
  const file = input.files && input.files[0];
  if (!file || !key) return;
  if (!file.type.startsWith('image/')) {
    window.alert('Please choose an image file for the chart screenshot.');
    input.value = '';
    return;
  }
  const reader = new FileReader();
  reader.onload = () => {
    try {
      localStorage.setItem(`mh_timeframe_screenshot_${key}`, String(reader.result));
      localStorage.setItem(`mh_timeframe_screenshot_name_${key}`, file.name);
      renderScreenshotPreview(key);
      syncChartNotesSummary();
      showToast('Screenshot saved locally.', 'success');
      updateAssetInfoPanel();
      showAutosave();
    } catch (error) {
      window.alert('This screenshot could not be saved locally. Browser storage may be full; try a smaller image.');
    }
  };
  reader.readAsDataURL(file);
}

function renderScreenshotPreview(key) {
  const preview = $(`${key}Preview`);
  if (!preview) return;
  const image = localStorage.getItem(`mh_timeframe_screenshot_${key}`);
  const name = localStorage.getItem(`mh_timeframe_screenshot_name_${key}`) || 'Saved screenshot';
  const status = $(`${key}Status`);
  const fileName = $(`${key}FileName`);
  preview.innerHTML = image
    ? `<img src="${image}" alt="${escapeHtml(name)} preview" /><span>${escapeHtml(name)}</span>`
    : 'No screenshot selected.';
  if (status) {
    status.textContent = image ? 'Uploaded' : 'Missing';
    status.classList.toggle('uploaded', Boolean(image));
    status.classList.toggle('missing', !image);
  }
  if (fileName) fileName.textContent = image ? name : 'No file selected';
  updateScreenshotStatusSummary();
}

function clearTimeframeEvidence(key) {
  localStorage.removeItem(`mh_timeframe_screenshot_${key}`);
  localStorage.removeItem(`mh_timeframe_screenshot_name_${key}`);
  localStorage.removeItem(`mh_timeframe_notes_${key}`);
  const notes = $(`${key}Notes`);
  const upload = $(`${key}Screenshot`);
  if (notes) notes.value = '';
  if (upload) upload.value = '';
  renderScreenshotPreview(key);
  showToast('Timeframe evidence cleared.', 'success');
  showAutosave();
  syncChartNotesSummary();
}

function timeframeEvidenceSummary() {
  return manualTimeframes.map(({ key, label }) => {
    const filename = localStorage.getItem(`mh_timeframe_screenshot_name_${key}`);
    const hasScreenshot = filename ? `Uploaded locally (${filename})` : 'Missing — user must manually upload this screenshot to the AI chat before exact level analysis.';
    const notes = sanitizePlainText($(`${key}Notes`)?.value || '', 12000) || 'No notes provided.';
    return `${label} screenshot: ${hasScreenshot}\n${label} notes: ${notes}`;
  }).join('\n\n');
}

function timeframePromptEvidence() {
  return manualTimeframes.map(({ key, label }) => {
    const filename = localStorage.getItem(`mh_timeframe_screenshot_name_${key}`);
    const screenshotReference = filename
      ? `${filename} — uploaded locally in this browser; user must attach this ${label} screenshot manually to the AI chat.`
      : `Missing ${label} screenshot — do not invent exact levels from this timeframe.`;
    const notes = sanitizePlainText($(`${key}Notes`)?.value || '', 12000) || 'No notes provided for this timeframe.';
    return `${label}:\n- Notes: ${notes}\n- Screenshot reference: ${screenshotReference}`;
  }).join('\n\n');
}

function syncChartNotesSummary() {
  const chartNotes = $('chartNotes');
  if (!chartNotes) return;
  const existing = chartNotes.value.trim();
  const summary = timeframeEvidenceSummary();
  if (!existing || existing.includes('screenshot:') || existing.includes('notes:')) {
    chartNotes.value = summary;
    localStorage.setItem('mh_analysis_chartNotes', sanitizePlainText(summary, 12000));
  }
}

function onLogin(event) {
  event.preventDefault();
  const user = sanitizePlainText($('loginUser').value, 80);
  const pass = $('loginPass').value.trim();
  if (user && pass) {
    localStorage.setItem('mh_session', 'active');
    localStorage.setItem('mh_session_note', DEMO_LOGIN_NOTE);
    $('loginError').textContent = '';
    showDashboard();
    return;
  }
  $('loginError').textContent = 'Enter any username and password to open the demo-only local dashboard.';
}

function showDashboard() {
  $('loginView').classList.add('hidden');
  $('dashboardView').classList.remove('hidden');
  loadTradingViewChart();
  loadCalendarWidget();
  updateCurrentPriceFromSelectedAsset({ onlyIfEmpty: true });
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
  updateCurrentPriceFromSelectedAsset({ onlyIfEmpty: true });
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
  const colors = theme === 'dark'
    ? { background: '080b18', text: 'f6f8ff', border: '24304f' }
    : { background: 'ffffff', text: '111827', border: 'd6deef' };
  const params = new URLSearchParams({
    columns: 'exc_flags,exc_currency,exc_importance,exc_actual,exc_forecast,exc_previous',
    features: 'datepicker,timezone',
    countries: '25,32,6,37,72,22,17,39,14,10,35,43,56,36,110,11,26,12,4,5',
    calType: 'week',
    timeZone: '8',
    lang: '1',
    bgColor: colors.background,
    textColor: colors.text,
    borderColor: colors.border
  });
  container.innerHTML = `<iframe title="Investing.com Economic Calendar" src="https://sslecal2.investing.com?${params.toString()}" width="100%" height="100%" frameborder="0" allowtransparency="true" marginwidth="0" marginheight="0" loading="lazy"></iframe>`;
}

function updatePriceStatus(message, state = '') {
  const status = $('priceStatus');
  if (!status) return;
  status.textContent = message;
  status.classList.remove('success', 'warning', 'delayed', 'manual', 'error');
  if (state) status.classList.add(state);
  const panelStatus = $('assetInfoPriceStatus');
  if (panelStatus) panelStatus.textContent = message;
}

function updateAssetInfoPanel() {
  const asset = selectedAsset();
  const interval = timeframeLabels[$('timeframeSelect')?.value] || $('timeframeSelect')?.value || '—';
  if ($('assetInfoName')) $('assetInfoName').textContent = asset.label;
  if ($('assetInfoSymbol')) $('assetInfoSymbol').textContent = asset.tv;
  if ($('assetInfoTimeframe')) $('assetInfoTimeframe').textContent = interval;
  if ($('assetInfoPriceStatus') && $('priceStatus')) $('assetInfoPriceStatus').textContent = $('priceStatus').textContent;
  if ($('assetInfoSession')) $('assetInfoSession').textContent = localStorage.getItem('mh_session_note') || 'Local demo session only.';
}

function updateScreenshotStatusSummary() {
  const summary = $('screenshotStatusSummary');
  if (!summary) return;
  summary.innerHTML = manualTimeframes.map(({ key, label }) => {
    const uploaded = Boolean(localStorage.getItem(`mh_timeframe_screenshot_${key}`));
    return `<span class="screenshot-status-pill ${uploaded ? 'uploaded' : 'missing'}"><strong>${label}:</strong> ${uploaded ? 'Uploaded' : 'Missing'}</span>`;
  }).join('');
}


function formatPrice(value) {
  if (!Number.isFinite(value)) return '';
  if (value >= 1000) return value.toLocaleString(undefined, { maximumFractionDigits: 2 });
  if (value >= 10) return value.toLocaleString(undefined, { maximumFractionDigits: 4 });
  return value.toLocaleString(undefined, { maximumFractionDigits: 5 });
}

async function updateCurrentPriceFromSelectedAsset(options = {}) {
  const { onlyIfEmpty = false } = options;
  const field = $('currentPrice');
  const asset = selectedAsset();
  if (!field || !asset.priceSymbol) return;
  if (onlyIfEmpty && field.value.trim()) return;

  const requestId = ++activePriceRequestId;
  updatePriceStatus('Checking delayed price...', '');

  try {
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(asset.priceSymbol)}?range=1d&interval=1m`;
    const response = await fetch(url, { cache: 'no-store', mode: 'cors' });
    if (!response.ok) throw new Error('Price response unavailable');
    const data = await response.json();
    const result = data?.chart?.result?.[0];
    const price = result?.meta?.regularMarketPrice ?? result?.meta?.previousClose;
    if (requestId !== activePriceRequestId) return;
    if (!Number.isFinite(Number(price))) throw new Error('Price value unavailable');
    field.value = formatPrice(Number(price));
    localStorage.setItem('mh_analysis_currentPrice', sanitizePlainText(field.value, 600));
    updatePriceStatus('Delayed price updated — verify before trading', 'delayed');
    updateAssetInfoPanel();
    showAutosave();
  } catch (error) {
    if (requestId !== activePriceRequestId) return;
    updatePriceStatus('Live price unavailable — enter manually', 'error');
    updateAssetInfoPanel();
  }
}

function setPromptType(type) {
  activePromptType = type;
  $('chatgptTab').classList.toggle('active', type === 'chatgpt');
  $('claudeTab').classList.toggle('active', type === 'claude');
  $('chatgptTab').setAttribute('aria-selected', String(type === 'chatgpt'));
  $('claudeTab').setAttribute('aria-selected', String(type === 'claude'));
  if ($('promptOutput').value.trim()) generatePrompt();
}


function generatePrompt() {
  const asset = selectedAsset();
  const interval = timeframeLabels[$('timeframeSelect').value] || $('timeframeSelect').value;
  const currentPrice = sanitizePlainText($('currentPrice').value, 600) || 'Not provided — do not invent exact levels.';
  const timeframeEvidence = timeframePromptEvidence();
  const dxyNotes = sanitizePlainText($('dxyNotes').value, 4000) || 'No DXY notes provided — state that DXY context is missing and do not infer dollar strength.';
  const bondYieldNotes = sanitizePlainText($('bondYieldNotes').value, 4000) || 'No US bond yield notes provided — state that yield context is missing and do not infer yield pressure.';
  const calendarNotes = sanitizePlainText($('calendarNotes').value, 4000) || 'Latest economic calendar data not pasted here. Say: Latest news/calendar data could not be verified.';
  const newsNotes = sanitizePlainText($('newsNotes').value, 4000) || 'No verified geopolitical/sentiment notes pasted — state that geopolitical context is missing.';
  const risk = $('riskProfile').value;
  const scoreText = $('scoreBadge')?.textContent || '0 / 10';
  const decisionText = $('tradeDecision')?.textContent || 'No Trade Setup — wait for better price action confirmation.';

  const sharedPromptBody = `SEMI-AUTOMATIC PRO INPUTS
Selected symbol: ${asset.short}
TradingView symbol: ${asset.tv}
Current active dashboard timeframe: ${interval}
Current price / area (live if available, manual fallback if edited): ${currentPrice}
Risk profile: ${risk}
Current scorecard result: ${scoreText} — ${decisionText}

ALL TIMEFRAME NOTES + SCREENSHOT REFERENCES
${timeframeEvidence}

DXY NOTES
${dxyNotes}

US BOND YIELD NOTES
${bondYieldNotes}

ECONOMIC CALENDAR NOTES
${calendarNotes}

NEWS / GEOPOLITICAL NOTES
${newsNotes}

STRICT TRADING RULEBOOK
- Do not invent exact levels, entry zones, stop losses, or take-profit levels if price data, timeframe notes, or screenshot evidence is missing.
- Never say guaranteed profit.
- Never say 100% sure.
- Do not give random BUY/SELL signals and do not force a trade.
- No BUY or SELL unless the trade score is 8/10 or higher.
- If the market is unclear, say exactly: No Trade Setup — wait for better price action confirmation.
- Risk only 1% to 2% per trade.
- Avoid new entries before high-impact news; wait until the event passes and price action confirms direction after volatility.
- If latest news/calendar data cannot be verified, say: Latest news/calendar data could not be verified.
- Always include confirmation, invalidation, risk management, and news risk.
- Price action is the highest priority. Indicators are confirmation only.

TOOLS / INDICATORS TO CHECK
EMA 50, EMA 200, Bollinger Bands 20/2, Volume, Daily Pivot Points, Fibonacci Retracement, Fibonacci Extension, support/resistance, HH/HL/LH/LL, BOS, CHoCH, liquidity sweep, rejection candle, engulfing candle, pin bar, fake breakout.

ENTRY RULES
BUY only if HTF is bullish or a reversal is confirmed, M15/M5 sweeps liquidity below support, closes back above support, prints bullish CHoCH/BOS, retests broken level, confirms with bullish candle and volume, no high-impact-news conflict exists, risk is 1% to 2%, and R:R is at least 1:2.
SELL only if HTF is bearish or a reversal is confirmed, M15/M5 sweeps liquidity above resistance, closes back below resistance, prints bearish CHoCH/BOS, retests broken level, confirms with bearish candle and volume, no high-impact-news conflict exists, risk is 1% to 2%, and R:R is at least 1:2.

SCORECARD
Higher-timeframe alignment: /2
Fundamental/news support: /2
Market structure confirmation: /2
M15/M5 entry confirmation: /2
Risk-reward quality: /2
Total: /10
Decision rule: 0–5 No Trade, 6–7 Watch only, 8 Valid setup, 9 Strong setup, 10 Rare A+ setup. Only give BUY or SELL at 8/10 or higher.

FINAL ANSWER FORMAT — USE THIS TRADING RULEBOOK TEMPLATE
${asset.short} Multi-Timeframe Analysis
Current Bias:
Current Price Data Status:
DXY Impact:
US Bond Yield Impact:
Economic Calendar / News Risk:
Geopolitical Sentiment:
Monthly:
Weekly:
Daily:
H4:
H1:
M30:
M15:
M5:
Screenshot Evidence Check:
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
Risk Per Trade: 1% to 2% maximum
Invalidation:
Confirmation Required:
Confidence:
Reason:
Final Warning:`;

  const chatgptPrompt = `CHATGPT PROFESSIONAL ANALYSIS PROMPT

You are an expert ${asset.short} trading analyst, professional price action trader, multi-timeframe technical analyst, macroeconomic analyst, and risk-management specialist.

TASK
Build a professional Semi-Automatic Pro analysis focused on full multi-timeframe analysis, price action, market structure, indicator confirmation, macro/news risk, and scalping decision discipline for ${asset.short} using Monthly, Weekly, Daily, H4, H1, M30, M15, and M5. Find the best high-probability short-term opportunity on M15 or M5 only if the setup is clean and all trading-rulebook conditions are satisfied.

${sharedPromptBody}`;

  const claudePrompt = `CLAUDE SECOND-OPINION PROMPT

Act as my second-opinion risk filter for ${asset.short}. Be stricter than the first analysis. Challenge weak assumptions, identify missing evidence, reject any invented levels, and only approve a setup if the scoring rules support 8/10 or higher.

TASK
Review the same Semi-Automatic Pro inputs as a second opinion, risk review, contradiction check, bias detection check, aggressiveness review, and no-trade validation using Monthly, Weekly, Daily, H4, H1, M30, M15, and M5. Your job is to confirm whether the trade idea should be approved, downgraded to watchlist, or rejected as no trade.

${sharedPromptBody}`;

  $('promptOutput').value = activePromptType === 'claude' ? claudePrompt : chatgptPrompt;
}

async function copyPrompt() {
  const prompt = $('promptOutput').value || '';
  if (!prompt.trim()) generatePrompt();
  try {
    await navigator.clipboard.writeText($('promptOutput').value);
    $('copyPrompt').textContent = 'Copied!';
    showToast('Prompt copied to clipboard.', 'success');
    setTimeout(() => ($('copyPrompt').textContent = 'Copy Prompt'), 1200);
  } catch (error) {
    $('promptOutput').select();
    document.execCommand('copy');
  }
}

function onScoreChoice(event) {
  const button = event.currentTarget;
  const key = button.dataset.scoreKey;
  const value = button.dataset.scoreValue;
  const input = document.querySelector(`.score-input[data-key="${key}"]`);
  if (!input) return;
  input.value = value;
  document.querySelectorAll(`.score-choice[data-score-key="${key}"]`).forEach((choice) => {
    const active = choice === button;
    choice.classList.toggle('active', active);
    choice.setAttribute('aria-pressed', String(active));
  });
  calculateScore();
}

function syncScoreChoices() {
  document.querySelectorAll('.score-input').forEach((input) => {
    const value = String(Math.round(Math.max(0, Math.min(2, parseFloat(input.value || '0')))));
    input.value = value;
    document.querySelectorAll(`.score-choice[data-score-key="${input.dataset.key}"]`).forEach((choice) => {
      const active = choice.dataset.scoreValue === value;
      choice.classList.toggle('active', active);
      choice.setAttribute('aria-pressed', String(active));
    });
  });
}

function calculateScore() {
  let total = 0;
  document.querySelectorAll('.score-input').forEach((input) => {
    const value = Math.round(Math.max(0, Math.min(2, parseFloat(input.value || '0'))));
    input.value = value;
    total += value;
  });
  syncScoreChoices();
  $('scoreBadge').textContent = `${total} / 10`;
  const box = $('tradeDecision');
  const badge = $('scoreBadge');
  badge.classList.remove('score-no-trade', 'score-watch', 'score-valid', 'score-strong', 'score-aplus');
  box.classList.remove('no-trade', 'watch', 'valid', 'strong');
  if (total <= 5) {
    box.classList.add('no-trade');
    badge.classList.add('score-no-trade');
    box.textContent = 'No Trade Setup — score below 8/10.';
  } else if (total <= 7) {
    box.classList.add('watch');
    badge.classList.add('score-watch');
    box.textContent = 'Watch only — setup is not confirmed enough.';
  } else if (total === 8) {
    box.classList.add('valid');
    badge.classList.add('score-valid');
    box.textContent = 'Valid Setup — still verify news risk and final entry confirmation.';
  } else if (total === 9) {
    box.classList.add('strong');
    badge.classList.add('score-strong');
    box.textContent = 'Strong Setup — follow risk management and wait for clean trigger.';
  } else {
    box.classList.add('strong');
    badge.classList.add('score-aplus');
    box.textContent = 'Rare A+ Setup — confirm spread/news/liquidity before entry.';
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

function normalizeTradeType(type = '') {
  const upper = String(type).trim().toUpperCase();
  if (upper === 'BUY') return 'BUY';
  if (upper === 'SELL') return 'SELL';
  if (upper === 'NO TRADE') return 'NO TRADE';
  return 'WATCH';
}

function normalizeResult(result = '') {
  const value = String(result).trim().toLowerCase().replace(/\s+/g, ' ');
  if (value === 'win') return 'Win';
  if (value === 'loss') return 'Loss';
  if (value === 'break even' || value === 'breakeven') return 'Breakeven';
  return 'Pending';
}

function normalizeJournalEntry(row = {}) {
  return {
    id: row.id || createId(),
    date: sanitizePlainText(row.date || '', 40),
    asset: sanitizePlainText(row.asset || row.symbol || '', 40),
    type: normalizeTradeType(row.type),
    bias: sanitizePlainText(row.bias || '', 160),
    score: sanitizePlainText(row.score || '', 160),
    entry: sanitizePlainText(row.entry || '', 160),
    sl: sanitizePlainText(row.sl || row.stopLoss || '', 160),
    tp1: sanitizePlainText(row.tp1 || row.tp || '', 160),
    tp2: sanitizePlainText(row.tp2 || '', 160),
    tp3: sanitizePlainText(row.tp3 || '', 160),
    rr: sanitizePlainText(row.rr || row.riskReward || '', 160),
    result: normalizeResult(row.result),
    profitNotes: sanitizePlainText(row.profitNotes || '', 4000),
    screenshots: sanitizePlainText(row.screenshots || '', 4000),
    timeframeNotes: sanitizePlainText(row.timeframeNotes || '', 4000),
    aiDecision: sanitizePlainText(row.aiDecision || '', 4000),
    notes: sanitizePlainText(row.notes || row.manualNotes || '', 4000)
  };
}

function addJournalEntry(event) {
  event.preventDefault();
  const asset = assets.find(item => item.tv === $('jAsset').value) || assets[0];
  const entry = normalizeJournalEntry({
    id: createId(),
    date: $('jDate').value,
    asset: asset.short,
    type: $('jType').value,
    bias: $('jBias').value.trim(),
    score: $('jScore').value.trim(),
    entry: $('jEntry').value.trim(),
    sl: $('jSl').value.trim(),
    tp1: $('jTp1').value.trim(),
    tp2: $('jTp2').value.trim(),
    tp3: $('jTp3').value.trim(),
    rr: $('jRr').value.trim(),
    result: $('jResult').value,
    profitNotes: $('jProfitNotes').value.trim(),
    screenshots: $('jScreenshots').value.trim(),
    timeframeNotes: $('jTimeframeNotes').value.trim(),
    aiDecision: $('jAiDecision').value.trim(),
    notes: $('jNotes').value.trim()
  });
  const journal = [entry, ...getJournal().map(normalizeJournalEntry)];
  setJournal(journal);
  $('journalForm').reset();
  setDefaultJournalDate();
  $('jAsset').value = $('assetSelect').value;
  showToast('Journal entry saved locally.', 'success');
  showAutosave();
  renderJournal();
}

function getFilteredJournal() {
  const symbol = $('filterSymbol').value;
  const type = $('filterType').value;
  const minScore = parseFloat($('filterScoreMin').value);
  const maxScore = parseFloat($('filterScoreMax').value);
  const result = $('filterResult').value;
  const from = $('filterDateFrom').value;
  const to = $('filterDateTo').value;
  const notes = sanitizePlainText($('filterNotes').value, 400).toLowerCase();

  return getJournal().map(normalizeJournalEntry).filter((row) => {
    const score = parseFloat(row.score);
    const entryDate = (row.date || '').slice(0, 10);
    const searchableNotes = [row.profitNotes, row.screenshots, row.timeframeNotes, row.aiDecision, row.notes].join(' ').toLowerCase();
    return (!symbol || row.asset === symbol)
      && (!type || row.type === type)
      && (Number.isNaN(minScore) || (!Number.isNaN(score) && score >= minScore))
      && (Number.isNaN(maxScore) || (!Number.isNaN(score) && score <= maxScore))
      && (!result || row.result === result)
      && (!from || entryDate >= from)
      && (!to || entryDate <= to)
      && (!notes || searchableNotes.includes(notes));
  });
}

function renderJournal() {
  const body = $('journalBody');
  const journal = getFilteredJournal();
  if (!journal.length) {
    body.innerHTML = '<tr><td colspan="15" class="empty-state"><strong>No journal entries yet.</strong><span>Add a WATCH, BUY, SELL, or NO TRADE note to build your local trading review history.</span></td></tr>';
    return;
  }
  body.innerHTML = journal.map((row) => `
    <tr>
      <td data-label="Date">${escapeHtml(row.date)}</td>
      <td data-label="Symbol">${escapeHtml(row.asset)}</td>
      <td data-label="Type">${statusBadge(row.type)}</td>
      <td data-label="Bias">${escapeHtml(row.bias)}</td>
      <td data-label="Score"><span class="score-chip ${scoreClass(row.score)}">${escapeHtml(row.score || '—')}</span></td>
      <td data-label="Entry">${escapeHtml(row.entry)}</td>
      <td data-label="SL">${escapeHtml(row.sl)}</td>
      <td data-label="TP1">${escapeHtml(row.tp1)}</td>
      <td data-label="TP2">${escapeHtml(row.tp2)}</td>
      <td data-label="TP3">${escapeHtml(row.tp3)}</td>
      <td data-label="R:R">${escapeHtml(row.rr)}</td>
      <td data-label="Result">${escapeHtml(row.result)}</td>
      <td data-label="AI Decision">${escapeHtml(row.aiDecision)}</td>
      <td data-label="Manual Notes">${escapeHtml(row.notes)}</td>
      <td data-label="Action"><button class="delete-row" type="button" data-delete-id="${escapeHtml(row.id)}">Delete</button></td>
    </tr>
  `).join('');
}

function clearJournalFilters() {
  ['filterSymbol', 'filterType', 'filterScoreMin', 'filterScoreMax', 'filterResult', 'filterDateFrom', 'filterDateTo', 'filterNotes'].forEach((id) => ($(id).value = ''));
  renderJournal();
}

document.addEventListener('click', (event) => {
  const button = event.target.closest('[data-delete-id]');
  const clearButton = event.target.closest('[data-clear-timeframe]');
  if (clearButton) {
    clearTimeframeEvidence(clearButton.dataset.clearTimeframe);
    return;
  }
  if (!button) return;
  deleteJournalEntry(button.dataset.deleteId);
});

function deleteJournalEntry(id) {
  setJournal(getJournal().filter((row) => row.id !== id));
  showToast('Journal entry deleted.', 'success');
  showAutosave();
  renderJournal();
}
window.deleteJournalEntry = deleteJournalEntry;

function journalExportRows() {
  return getJournal().map(normalizeJournalEntry);
}

function exportCsv() {
  const journal = journalExportRows();
  const headers = ['Date','Symbol','Trade Type','Bias','Score /10','Entry Zone','Stop Loss','TP1','TP2','TP3','Risk-Reward','Result','Profit/Loss Notes','Screenshot Names','Timeframe Notes','AI Decision','Manual Notes'];
  const rows = journal.map((row) => [row.date,row.asset,row.type,row.bias,row.score,row.entry,row.sl,row.tp1,row.tp2,row.tp3,row.rr,row.result,row.profitNotes,row.screenshots,row.timeframeNotes,row.aiDecision,row.notes]);
  const csv = [headers, ...rows].map((row) => row.map(csvEscape).join(',')).join('\n');
  downloadFile(`ai-trading-journal-${todayStamp()}.csv`, csv, 'text/csv;charset=utf-8');
  showToast('CSV export started.', 'success');
}

function exportPdf() {
  const journal = journalExportRows();
  const htmlRows = journal.map((row) => `
    <tr><td>${escapeHtml(row.date)}</td><td>${escapeHtml(row.asset)}</td><td>${escapeHtml(row.type)}</td><td>${escapeHtml(row.bias)}</td><td>${escapeHtml(row.score)}</td><td>${escapeHtml(row.entry)}</td><td>${escapeHtml(row.sl)}</td><td>${escapeHtml(row.tp1)}</td><td>${escapeHtml(row.tp2)}</td><td>${escapeHtml(row.tp3)}</td><td>${escapeHtml(row.rr)}</td><td>${escapeHtml(row.result)}</td><td>${escapeHtml(row.aiDecision)}</td><td>${escapeHtml(row.notes)}</td></tr>
  `).join('');
  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    window.alert('PDF export was blocked by the browser. Please allow pop-ups for this site and try Export PDF again.');
    showToast('PDF export blocked by browser.', 'error');
    return;
  }
  showToast('PDF/print export opened.', 'success');
  printWindow.document.write(`<!doctype html><html><head><title>MH AI Trading Workflow Journal</title><style>body{font-family:Arial,sans-serif;padding:24px;color:#111}h1{margin:0 0 12px}table{width:100%;border-collapse:collapse;font-size:11px}th,td{border:1px solid #ddd;padding:7px;text-align:left;vertical-align:top}th{background:#f3f4f6}.muted{color:#666}</style></head><body><h1>MH AI Trading Workflow Journal</h1><p class="muted">Generated ${new Date().toLocaleString()}</p><table><thead><tr><th>Date</th><th>Symbol</th><th>Type</th><th>Bias</th><th>Score</th><th>Entry</th><th>SL</th><th>TP1</th><th>TP2</th><th>TP3</th><th>R:R</th><th>Result</th><th>AI Decision</th><th>Manual Notes</th></tr></thead><tbody>${htmlRows || '<tr><td colspan="14">No entries.</td></tr>'}</tbody></table><script>window.onload=()=>setTimeout(()=>window.print(),300)<\/script></body></html>`);
  printWindow.document.close();
}

function getAppLocalStorageData() {
  const data = {};
  for (let index = 0; index < localStorage.length; index += 1) {
    const key = localStorage.key(index);
    if (key && key.startsWith('mh_')) {
      data[key] = localStorage.getItem(key);
    }
  }
  return data;
}

function exportLocalBackup() {
  try {
    const backup = {
      schema: BACKUP_SCHEMA,
      version: BACKUP_VERSION,
      exportedAt: new Date().toISOString(),
      origin: window.location.origin,
      data: getAppLocalStorageData()
    };
    downloadFile(`ai-trading-desk-backup-${todayStamp()}.json`, JSON.stringify(backup, null, 2), 'application/json;charset=utf-8');
    showBackupStatus('JSON backup exported successfully.', 'success');
    showToast('JSON backup exported.', 'success');
  } catch (error) {
    showBackupStatus('Backup export failed. Please try again or check browser storage access.', 'error');
  }
}

function validateBackupPayload(payload) {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    throw new Error('Backup file must contain a JSON object.');
  }
  if (payload.schema !== BACKUP_SCHEMA) {
    throw new Error('Backup schema is not recognized for this dashboard.');
  }
  if (payload.version !== BACKUP_VERSION) {
    throw new Error('Backup version is not supported.');
  }
  if (!payload.data || typeof payload.data !== 'object' || Array.isArray(payload.data)) {
    throw new Error('Backup data is missing or invalid.');
  }
  Object.entries(payload.data).forEach(([key, value]) => {
    if (!key.startsWith('mh_')) {
      throw new Error(`Backup contains unsupported key: ${key}`);
    }
    if (String(key).length > 120 || /(?:token|secret|api[_-]?key|password|passwd|private[_-]?key)/i.test(key)) {
      throw new Error(`Backup contains a sensitive or unsupported key name: ${key}`);
    }
    if (typeof value !== 'string' && value !== null) {
      throw new Error(`Backup value for ${key} must be a string or null.`);
    }
  });
  if (payload.data.mh_journal) {
    const journal = JSON.parse(payload.data.mh_journal);
    if (!Array.isArray(journal)) {
      throw new Error('Journal data must be an array.');
    }
  }
}

function restoreUiFromLocalStorage() {
  hydrateSavedAnalysisInputs();
  hydrateTimeframeUploads();
  hydrateSession();
  updateThemeButton();
  setDefaultJournalDate();
  $('jAsset').value = $('assetSelect').value;
  renderJournal();
  calculateScore();
}

function importLocalBackup(event) {
  const input = event.target;
  const file = input.files && input.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = () => {
    try {
      const payload = JSON.parse(String(reader.result || ''));
      validateBackupPayload(payload);
      const keyCount = Object.keys(payload.data).length;
      const confirmed = window.confirm(`Import this JSON backup and overwrite existing AI Trading Desk local data?\n\nThis will replace ${keyCount} saved localStorage item(s) and cannot be undone unless you export a current backup first.`);
      if (!confirmed) {
        showBackupStatus('Import cancelled. Existing local data was not changed.', '');
        return;
      }
      Object.keys(getAppLocalStorageData()).forEach((key) => localStorage.removeItem(key));
      Object.entries(payload.data).forEach(([key, value]) => {
        if (value === null) localStorage.removeItem(key);
        else localStorage.setItem(key, value);
      });
      restoreUiFromLocalStorage();
      showBackupStatus('JSON backup imported successfully. Local app data was restored.', 'success');
      showToast('JSON backup imported.', 'success');
      updateAssetInfoPanel();
      showAutosave();
    } catch (error) {
      showBackupStatus(`Import failed: ${error.message}`, 'error');
    } finally {
      input.value = '';
    }
  };
  reader.onerror = () => {
    showBackupStatus('Import failed: the selected file could not be read.', 'error');
    input.value = '';
  };
  reader.readAsText(file);
}

function clearAllLocalData() {
  const confirmed = window.confirm('Are you sure? This will permanently remove all local journal data from this browser. It also removes local notes, screenshots, theme, and demo session data. Export a JSON backup first if you want to keep a copy.');
  if (!confirmed) {
    showBackupStatus('Clear all local data cancelled.', '');
    return;
  }
  Object.keys(getAppLocalStorageData()).forEach((key) => localStorage.removeItem(key));
  restoreUiFromLocalStorage();
  showBackupStatus('All AI Trading Desk local data has been cleared from this browser.', 'success');
}

function showBackupStatus(message, type = '') {
  const status = $('backupStatus');
  if (!status) return;
  status.textContent = sanitizePlainText(message, 240);
  status.classList.remove('success', 'error');
  if (type) status.classList.add(type);
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

function statusBadge(type = '') {
  const normalized = normalizeTradeType(type);
  const className = normalized.toLowerCase().replace(/\s+/g, '-');
  return `<span class="status-badge ${className}">${escapeHtml(normalized)}</span>`;
}

function scoreClass(score) {
  const value = parseFloat(score);
  if (Number.isNaN(value) || value <= 5) return 'score-no-trade';
  if (value < 8) return 'score-watch';
  if (value < 9) return 'score-valid';
  if (value < 10) return 'score-strong';
  return 'score-aplus';
}

function sanitizePlainText(value = '', maxLength = 4000) {
  return String(value)
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '')
    .replace(/<\/?script[^>]*>/gi, '')
    .slice(0, maxLength)
    .trim();
}

function showAutosave() {
  const indicator = $('autosaveIndicator');
  if (!indicator) return;
  indicator.textContent = `Saved locally • Last saved ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} • Local browser only`;
  indicator.classList.add('saved');
  window.clearTimeout(showAutosave.timer);
  showAutosave.timer = window.setTimeout(() => indicator.classList.remove('saved'), 1600);
}

function showToast(message, type = 'success') {
  const region = $('toastRegion');
  if (!region) return;
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.textContent = sanitizePlainText(message, 180);
  region.appendChild(toast);
  window.setTimeout(() => toast.classList.add('show'), 20);
  window.setTimeout(() => {
    toast.classList.remove('show');
    window.setTimeout(() => toast.remove(), 220);
  }, 3200);
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
