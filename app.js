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
  });
  $('timeframeSelect').addEventListener('change', loadTradingViewChart);
  $('reloadCalendar').addEventListener('click', loadCalendarWidget);
  bindLocalAnalysisStorage();
  $('generatePrompt').addEventListener('click', generatePrompt);
  $('copyPrompt').addEventListener('click', copyPrompt);
  $('chatgptTab').addEventListener('click', () => setPromptType('chatgpt'));
  $('claudeTab').addEventListener('click', () => setPromptType('claude'));
  document.querySelectorAll('.score-input').forEach((input) => input.addEventListener('input', calculateScore));
  $('journalForm').addEventListener('submit', addJournalEntry);
  ['filterSymbol', 'filterType', 'filterScoreMin', 'filterScoreMax', 'filterResult', 'filterDateFrom', 'filterDateTo', 'filterNotes'].forEach((id) => {
    $(id).addEventListener('input', renderJournal);
    $(id).addEventListener('change', renderJournal);
  });
  $('clearJournalFilters').addEventListener('click', clearJournalFilters);
  $('exportCsv').addEventListener('click', exportCsv);
  $('exportPdf').addEventListener('click', exportPdf);
}

function renderTimeframeUploads() {
  const grid = $('timeframeUploadGrid');
  if (!grid) return;
  grid.innerHTML = manualTimeframes.map(({ key, label }) => `
    <article class="timeframe-card">
      <div class="timeframe-card-head">
        <h3>${label}</h3>
        <button class="ghost-btn small-btn" type="button" data-clear-timeframe="${key}">Clear</button>
      </div>
      <label>
        ${label} screenshot
        <input id="${key}Screenshot" type="file" accept="image/*" data-timeframe-upload="${key}" />
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
    field.addEventListener('input', () => localStorage.setItem(`mh_analysis_${id}`, field.value));
  });

  document.querySelectorAll('[data-timeframe-notes]').forEach((field) => {
    field.addEventListener('input', () => {
      localStorage.setItem(`mh_timeframe_notes_${field.dataset.timeframeNotes}`, field.value);
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
  preview.innerHTML = image
    ? `<img src="${image}" alt="${escapeHtml(name)} preview" /><span>${escapeHtml(name)}</span>`
    : 'No screenshot selected.';
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
  syncChartNotesSummary();
}

function timeframeEvidenceSummary() {
  return manualTimeframes.map(({ key, label }) => {
    const filename = localStorage.getItem(`mh_timeframe_screenshot_name_${key}`);
    const hasScreenshot = filename ? `Uploaded locally (${filename})` : 'Missing — user must manually upload this screenshot to the AI chat before exact level analysis.';
    const notes = ($(`${key}Notes`)?.value || '').trim() || 'No notes provided.';
    return `${label} screenshot: ${hasScreenshot}\n${label} notes: ${notes}`;
  }).join('\n\n');
}

function timeframePromptEvidence() {
  return manualTimeframes.map(({ key, label }) => {
    const filename = localStorage.getItem(`mh_timeframe_screenshot_name_${key}`);
    const screenshotReference = filename
      ? `${filename} — uploaded locally in this browser; user must attach this ${label} screenshot manually to the AI chat.`
      : `Missing ${label} screenshot — do not invent exact levels from this timeframe.`;
    const notes = ($(`${key}Notes`)?.value || '').trim() || 'No notes provided for this timeframe.';
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
    localStorage.setItem('mh_analysis_chartNotes', summary);
  }
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
  const timeframeEvidence = timeframePromptEvidence();
  const dxyNotes = $('dxyNotes').value.trim() || 'No DXY notes provided — state that DXY context is missing and do not infer dollar strength.';
  const bondYieldNotes = $('bondYieldNotes').value.trim() || 'No US bond yield notes provided — state that yield context is missing and do not infer yield pressure.';
  const calendarNotes = $('calendarNotes').value.trim() || 'Latest economic calendar data not pasted here. Say: Latest news/calendar data could not be verified.';
  const newsNotes = $('newsNotes').value.trim() || 'No verified geopolitical/sentiment notes pasted — state that geopolitical context is missing.';
  const risk = $('riskProfile').value;

  const sharedPromptBody = `SEMI-AUTOMATIC PRO INPUTS
Selected symbol: ${asset.short}
TradingView symbol: ${asset.tv}
Current active dashboard timeframe: ${interval}
Current price: ${currentPrice}
Risk profile: ${risk}

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
Build a professional Semi-Automatic Pro analysis for ${asset.short} using Monthly, Weekly, Daily, H4, H1, M30, M15, and M5. Find the best high-probability short-term opportunity on M15 or M5 only if the setup is clean and all trading-rulebook conditions are satisfied.

${sharedPromptBody}`;

  const claudePrompt = `CLAUDE SECOND-OPINION PROMPT

Act as my second-opinion risk filter for ${asset.short}. Be stricter than the first analysis. Challenge weak assumptions, identify missing evidence, reject any invented levels, and only approve a setup if the scoring rules support 8/10 or higher.

TASK
Review the same Semi-Automatic Pro inputs using Monthly, Weekly, Daily, H4, H1, M30, M15, and M5. Your job is to confirm whether the trade idea should be approved, downgraded to watchlist, or rejected as no trade.

${sharedPromptBody}`;

  $('promptOutput').value = activePromptType === 'claude' ? claudePrompt : chatgptPrompt;
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
    date: row.date || '',
    asset: row.asset || row.symbol || '',
    type: normalizeTradeType(row.type),
    bias: row.bias || '',
    score: row.score || '',
    entry: row.entry || '',
    sl: row.sl || row.stopLoss || '',
    tp1: row.tp1 || row.tp || '',
    tp2: row.tp2 || '',
    tp3: row.tp3 || '',
    rr: row.rr || row.riskReward || '',
    result: normalizeResult(row.result),
    profitNotes: row.profitNotes || '',
    screenshots: row.screenshots || '',
    timeframeNotes: row.timeframeNotes || '',
    aiDecision: row.aiDecision || '',
    notes: row.notes || row.manualNotes || ''
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
  const notes = $('filterNotes').value.trim().toLowerCase();

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
    body.innerHTML = '<tr><td colspan="15" class="muted">No journal entries match the current filters. Add your first watchlist or trade decision.</td></tr>';
    return;
  }
  body.innerHTML = journal.map((row) => `
    <tr>
      <td data-label="Date">${escapeHtml(row.date)}</td>
      <td data-label="Symbol">${escapeHtml(row.asset)}</td>
      <td data-label="Type">${escapeHtml(row.type)}</td>
      <td data-label="Bias">${escapeHtml(row.bias)}</td>
      <td data-label="Score">${escapeHtml(row.score)}</td>
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
}

function exportPdf() {
  const journal = journalExportRows();
  const htmlRows = journal.map((row) => `
    <tr><td>${escapeHtml(row.date)}</td><td>${escapeHtml(row.asset)}</td><td>${escapeHtml(row.type)}</td><td>${escapeHtml(row.bias)}</td><td>${escapeHtml(row.score)}</td><td>${escapeHtml(row.entry)}</td><td>${escapeHtml(row.sl)}</td><td>${escapeHtml(row.tp1)}</td><td>${escapeHtml(row.tp2)}</td><td>${escapeHtml(row.tp3)}</td><td>${escapeHtml(row.rr)}</td><td>${escapeHtml(row.result)}</td><td>${escapeHtml(row.aiDecision)}</td><td>${escapeHtml(row.notes)}</td></tr>
  `).join('');
  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    window.alert('PDF export was blocked by the browser. Please allow pop-ups for this site and try Export PDF again.');
    return;
  }
  printWindow.document.write(`<!doctype html><html><head><title>AI Trading Journal</title><style>body{font-family:Arial,sans-serif;padding:24px;color:#111}h1{margin:0 0 12px}table{width:100%;border-collapse:collapse;font-size:11px}th,td{border:1px solid #ddd;padding:7px;text-align:left;vertical-align:top}th{background:#f3f4f6}.muted{color:#666}</style></head><body><h1>AI Trading Journal</h1><p class="muted">Generated ${new Date().toLocaleString()}</p><table><thead><tr><th>Date</th><th>Symbol</th><th>Type</th><th>Bias</th><th>Score</th><th>Entry</th><th>SL</th><th>TP1</th><th>TP2</th><th>TP3</th><th>R:R</th><th>Result</th><th>AI Decision</th><th>Manual Notes</th></tr></thead><tbody>${htmlRows || '<tr><td colspan="14">No entries.</td></tr>'}</tbody></table><script>window.onload=()=>setTimeout(()=>window.print(),300)<\/script></body></html>`);
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
