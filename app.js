const DEMO_LOGIN_NOTE = 'Session: Local browser session | Authentication: Not enabled';
const BACKUP_SCHEMA = 'ai-trading-desk-mh-local-backup';
const BACKUP_VERSION = 2;
const MAX_BACKUP_FILE_BYTES = 1024 * 1024;
const MAX_IMPORTED_STORAGE_BYTES = 1024 * 1024;

const assets = [
  { label: 'XAUUSD / Gold', tv: 'OANDA:XAUUSD', short: 'XAUUSD', assetClass: 'metals' },
  { label: 'EUR/USD', tv: 'FX:EURUSD', short: 'EUR/USD', assetClass: 'forex' },
  { label: 'EUR/JPY', tv: 'FX:EURJPY', short: 'EUR/JPY', assetClass: 'forex' },
  { label: 'EUR/GBP', tv: 'FX:EURGBP', short: 'EUR/GBP', assetClass: 'forex' },
  { label: 'USD/JPY', tv: 'FX:USDJPY', short: 'USD/JPY', assetClass: 'forex' },
  { label: 'GBP/USD', tv: 'FX:GBPUSD', short: 'GBP/USD', assetClass: 'forex' },
  { label: 'GBP/JPY', tv: 'FX:GBPJPY', short: 'GBP/JPY', assetClass: 'forex' },
  { label: 'USD/CHF', tv: 'FX:USDCHF', short: 'USD/CHF', assetClass: 'forex' },
  { label: 'AUD/USD', tv: 'FX:AUDUSD', short: 'AUD/USD', assetClass: 'forex' },
  { label: 'USD/CAD', tv: 'FX:USDCAD', short: 'USD/CAD', assetClass: 'forex' },
  { label: 'NZD/USD', tv: 'FX:NZDUSD', short: 'NZD/USD', assetClass: 'forex' },
  { label: 'US Oil', tv: 'TVC:USOIL', short: 'US Oil', assetClass: 'oil' },
  { label: 'XAGUSD / Silver', tv: 'OANDA:XAGUSD', short: 'XAGUSD', assetClass: 'metals' },
  { label: 'BTC/USD', tv: 'BINANCE:BTCUSDT', short: 'BTC/USD', assetClass: 'crypto' }
];

const timeframeLabels = { '1M': 'Monthly', '1W': 'Weekly', D: 'Daily', 240: 'H4', 60: 'H1', 30: 'M30', 15: 'M15', 5: 'M5' };
const providerLabels = { openai: 'OpenAI', anthropic: 'Anthropic', xai: 'Grok', gemini: 'Gemini', microsoft: 'Microsoft' };
const providerPayloadAliases = {
  openai: 'openai',
  chatgpt: 'openai',
  'chatgpt / openai': 'openai',
  anthropic: 'anthropic',
  claude: 'anthropic',
  'claude / anthropic': 'anthropic',
  xai: 'xai',
  grok: 'xai',
  'grok / xai': 'xai',
  gemini: 'gemini',
  google: 'gemini',
  'google gemini': 'gemini',
  microsoft: 'microsoft',
  copilot: 'microsoft',
  'microsoft copilot': 'microsoft',
  'microsoft ai': 'microsoft',
  'microsoft / azure ai': 'microsoft',
  'microsoft copilot / microsoft ai': 'microsoft',
  none: 'none'
};
const assetPayloadAliases = {
  XAUUSD: 'XAUUSD',
  'XAUUSD / Gold': 'XAUUSD',
  Gold: 'XAUUSD',
  USOIL: 'USOIL',
  'US Oil': 'USOIL',
  BTCUSD: 'BTCUSD',
  'BTC/USD': 'BTCUSD',
  EURUSD: 'EURUSD',
  'EUR/USD': 'EURUSD',
  EURJPY: 'EURJPY',
  'EUR/JPY': 'EURJPY',
  EURGBP: 'EURGBP',
  'EUR/GBP': 'EURGBP',
  USDJPY: 'USDJPY',
  'USD/JPY': 'USDJPY',
  GBPUSD: 'GBPUSD',
  'GBP/USD': 'GBPUSD',
  GBPJPY: 'GBPJPY',
  'GBP/JPY': 'GBPJPY',
  USDCHF: 'USDCHF',
  'USD/CHF': 'USDCHF',
  AUDUSD: 'AUDUSD',
  'AUD/USD': 'AUDUSD',
  USDCAD: 'USDCAD',
  'USD/CAD': 'USDCAD',
  NZDUSD: 'NZDUSD',
  'NZD/USD': 'NZDUSD',
  XAGUSD: 'XAGUSD',
  'XAGUSD / Silver': 'XAGUSD',
  Silver: 'XAGUSD'
};
const timeframePayloadAliases = { '1M': 'Monthly', MN1: 'Monthly', Monthly: 'Monthly', '1W': 'Weekly', W1: 'Weekly', Weekly: 'Weekly', D: 'Daily', D1: 'Daily', Daily: 'Daily', 240: 'H4', H4: 'H4', 60: 'H1', H1: 'H1', 30: 'M30', M30: 'M30', 15: 'M15', M15: 'M15', 5: 'M5', M5: 'M5' };
const shouldDebugAnalysisFlow = () => ['localhost', '127.0.0.1', ''].includes(window.location.hostname) || window.location.search.includes('debugAnalysis=true');
function debugAnalysisFlow(message, value) {
  if (!shouldDebugAnalysisFlow()) return;
  if (value === undefined) console.info(message);
  else console.info(message, value);
}
const defaultProviderStatuses = {
  openai: { label: 'ChatGPT / OpenAI', configured: null, message: 'Not checked' },
  anthropic: { label: 'Claude / Anthropic', configured: null, message: 'Not checked' },
  xai: { label: 'Grok / xAI', configured: null, message: 'Not checked' },
  gemini: { label: 'Google Gemini', configured: null, message: 'Not checked' },
  microsoft: { label: 'Microsoft Copilot / Microsoft AI', configured: null, message: 'Not checked' }
};

const scoreCriteria = [
  ['higherTimeframeAlignment', 'Higher-timeframe alignment'],
  ['marketStructure', 'Market structure'],
  ['entryConfirmation', 'Entry confirmation'],
  ['newsFundamentalRisk', 'News/fundamental risk'],
  ['riskRewardQuality', 'Risk-reward quality']
];

let lastAnalysis = null;
let calendarLoadToken = 0;
let calendarScriptPromise = null;
let analysisCooldownUntil = 0;
let isAnalysisRunning = false;
const $ = (id) => document.getElementById(id);

function init() {
  hydrateSelects();
  hydrateSession();
  bindEvents();
  updateThemeButton();
  renderAutoScorecard();
  renderProviderStatuses(defaultProviderStatuses);
  setDefaultJournalDate();
  renderJournal();
  updateAssetInfoPanel();
}

function bindEvents() {
  $('loginForm').addEventListener('submit', onLogin);
  $('logoutBtn').addEventListener('click', () => { localStorage.removeItem('mh_session'); showLogin(); });
  $('themeToggle').addEventListener('click', toggleTheme);
  $('reloadChart').addEventListener('click', loadTradingViewChart);
  $('reloadCalendar').addEventListener('click', loadCalendarWidget);
  $('assetSelect').addEventListener('change', () => syncSelectedAsset('chart'));
  $('analysisAssetSelect').addEventListener('change', () => syncSelectedAsset('analysis'));
  $('timeframeSelect').addEventListener('change', () => { loadTradingViewChart(); updateAssetInfoPanel(); });
  $('runAnalysis').addEventListener('click', runAiAnalysis);
  $('reviewAnalysis').addEventListener('click', reviewAnalysis);
  $('reviewProvider').addEventListener('change', updateReviewButtonState);
  $('saveAnalysisToJournal').addEventListener('click', saveAnalysisToJournal);
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
}

function hydrateSelects() {
  [$('assetSelect'), $('analysisAssetSelect'), $('jAsset')].forEach((select) => {
    select.innerHTML = assets.map((item) => `<option value="${item.tv}">${item.label}</option>`).join('');
  });
  $('filterSymbol').innerHTML = '<option value="">All symbols</option>' + assets.map((item) => `<option value="${item.short}">${item.label}</option>`).join('');
}

function hydrateSession() {
  document.documentElement.setAttribute('data-theme', localStorage.getItem('mh_theme') || 'dark');
  if (localStorage.getItem('mh_session') === 'active') showDashboard(); else showLogin();
}

function onLogin(event) {
  event.preventDefault();
  if ($('loginUser').value.trim() && $('loginPass').value.trim()) {
    localStorage.setItem('mh_session', 'active');
    localStorage.setItem('mh_session_note', DEMO_LOGIN_NOTE);
    $('loginError').textContent = '';
    showDashboard();
  } else {
    $('loginError').textContent = 'Enter any username and password to open the demo-only local dashboard.';
  }
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
  const next = currentTheme() === 'dark' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', next);
  localStorage.setItem('mh_theme', next);
  updateThemeButton();
  loadTradingViewChart();
  loadCalendarWidget();
}

function updateThemeButton() { $('themeToggle').textContent = currentTheme() === 'dark' ? 'Light Mode' : 'Dark Mode'; }
function currentTheme() { return document.documentElement.getAttribute('data-theme') || 'dark'; }
function selectedAsset() { return assets.find((item) => item.tv === $('assetSelect').value) || assets[0]; }
function selectedAnalysisAsset() { return assets.find((item) => item.tv === $('analysisAssetSelect').value) || selectedAsset(); }

function syncSelectedAsset(source) {
  if (source === 'chart') $('analysisAssetSelect').value = $('assetSelect').value;
  if (source === 'analysis') $('assetSelect').value = $('analysisAssetSelect').value;
  $('jAsset').value = $('assetSelect').value;
  loadTradingViewChart();
  updateAssetInfoPanel();
}

function updateAssetInfoPanel(status = '') {
  const asset = selectedAsset();
  $('assetInfoName').textContent = asset.label;
  $('assetInfoSymbol').textContent = asset.tv;
  $('assetInfoTimeframe').textContent = timeframeLabels[$('timeframeSelect').value] || $('timeframeSelect').value;
  if (status) $('assetInfoPriceStatus').textContent = status;
  $('assetInfoSession').textContent = localStorage.getItem('mh_session_note') || 'Local demo session only.';
}

function loadTradingViewChart() {
  const container = $('tradingViewContainer');
  const asset = selectedAsset();
  container.innerHTML = '<div class="tradingview-widget-container" style="height:100%;width:100%"><div class="tradingview-widget-container__widget" style="height:calc(100% - 32px);width:100%"></div><div class="tradingview-widget-copyright"><a href="https://www.tradingview.com/" rel="noopener nofollow" target="_blank">Chart by TradingView</a></div></div>';
  const script = document.createElement('script');
  script.type = 'text/javascript';
  script.src = 'https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js';
  script.async = true;
  script.innerHTML = JSON.stringify({ autosize: true, symbol: asset.tv, interval: $('timeframeSelect').value, timezone: 'Asia/Dubai', theme: currentTheme(), style: '1', locale: 'en', allow_symbol_change: true, calendar: false, details: true, hide_side_toolbar: false, hide_top_toolbar: false, hide_legend: false, hide_volume: false, save_image: true, backgroundColor: currentTheme() === 'dark' ? '#0b1022' : '#ffffff', gridColor: currentTheme() === 'dark' ? 'rgba(255,255,255,0.07)' : 'rgba(15,23,42,0.08)', support_host: 'https://www.tradingview.com' });
  script.onerror = () => { container.innerHTML = '<div class="widget-fallback" role="status">TradingView chart could not load. Check your connection, blocker, or reload the chart.</div>'; };
  container.querySelector('.tradingview-widget-container').appendChild(script);
}

function loadCalendarWidget() {
  const container = $('calendarWidget');
  const token = ++calendarLoadToken;
  container.innerHTML = '<div id="economicCalendarWidget" class="calendar-widget-host"></div>';

  const fallbackTimer = window.setTimeout(() => {
    if (token === calendarLoadToken && !container.querySelector('iframe')) {
      showCalendarFallback(container);
    }
  }, 8000);

  loadCalendarScript()
    .then(() => {
      if (token !== calendarLoadToken) return;
      try {
        if (typeof economicCalendar !== 'function') throw new Error('MetaTrader calendar constructor unavailable.');
        new economicCalendar({
          id: 'economicCalendarWidget',
          width: '100%',
          height: '100%',
          mode: 2
        });
      } catch (error) {
        window.clearTimeout(fallbackTimer);
        showCalendarFallback(container);
      }
    })
    .catch(() => {
      if (token !== calendarLoadToken) return;
      window.clearTimeout(fallbackTimer);
      showCalendarFallback(container);
    });
}

function loadCalendarScript() {
  if (typeof economicCalendar === 'function') return Promise.resolve();
  if (calendarScriptPromise) return calendarScriptPromise;

  calendarScriptPromise = new Promise((resolve, reject) => {
    const existingScript = document.querySelector('script[data-calendar-provider="mql5"]');
    if (existingScript) {
      existingScript.addEventListener('load', resolve, { once: true });
      existingScript.addEventListener('error', reject, { once: true });
      return;
    }

    const script = document.createElement('script');
    script.type = 'text/javascript';
    script.src = 'https://c.mql5.com/js/widgets/calendar/widget.v1.js';
    script.async = true;
    script.dataset.calendarProvider = 'mql5';
    script.onload = resolve;
    script.onerror = reject;
    document.head.appendChild(script);
  }).catch((error) => {
    calendarScriptPromise = null;
    throw error;
  });

  return calendarScriptPromise;
}

function showCalendarFallback(container) {
  container.innerHTML = '<div class="widget-fallback" role="status">MetaTrader Economic Calendar could not be loaded. <a href="https://www.mql5.com/en/economic-calendar" target="_blank" rel="noopener noreferrer">Open the MQL5 Economic Calendar directly.</a></div>';
}


function normalizeProviderPayloadValue(value, fallback = '') {
  const raw = String(value || '').trim();
  const normalized = providerPayloadAliases[raw] || providerPayloadAliases[raw.toLowerCase()];
  return normalized || fallback || raw.toLowerCase();
}

function normalizeAssetPayloadValue(value) {
  const raw = String(value || '').trim();
  return assetPayloadAliases[raw] || raw.replace('/', '').replace(/\s+/g, '').toUpperCase();
}

function normalizeTimeframePayloadValue(value) {
  const raw = String(value || '').trim();
  return timeframePayloadAliases[raw] || timeframeLabels[raw] || raw;
}

async function runAiAnalysis() {
  console.log('Run AI Analysis clicked');
  debugAnalysisFlow('Run AI Analysis clicked');
  if (isAnalysisRunning) return;
  if (Date.now() < analysisCooldownUntil) {
    const seconds = Math.ceil((analysisCooldownUntil - Date.now()) / 1000);
    const cooldownMessage = `Too many analysis requests. Please wait ${seconds}s before trying again.`;
    $('analysisError').textContent = cooldownMessage;
    showToast(cooldownMessage, 'error');
    setApiStatus('neutral', 'API status: cooldown');
    return;
  }
  isAnalysisRunning = true;
  setApiStatus('loading', 'API status: loading');
  $('runAnalysis').disabled = true;
  $('runAnalysis').setAttribute('aria-busy', 'true');
  $('analysisError').textContent = '';
  $('saveAnalysisToJournal').disabled = true;
  updateReviewButtonState();
  renderLoadingResult();
  try {
    const asset = selectedAnalysisAsset();
    const selectedPrimaryProvider = normalizeProviderPayloadValue($('primaryProvider').value);
    const selectedReviewProvider = normalizeProviderPayloadValue($('reviewProvider').value, 'none');
    const selectedAssetValue = normalizeAssetPayloadValue(asset.short || asset.label);
    const selectedTimeframe = normalizeTimeframePayloadValue($('timeframeSelect').value);
    const selectedStrategyMode = $('strategyMode').value;
    const selectedRiskProfile = $('riskProfile').value;
    const selectedAnalysisDepth = $('analysisDepth').value;
    const analysisPayload = {
      provider: selectedPrimaryProvider,
      reviewer: selectedReviewProvider,
      asset: selectedAssetValue,
      timeframe: selectedTimeframe,
      strategyMode: selectedStrategyMode,
      riskProfile: selectedRiskProfile,
      analysisDepth: selectedAnalysisDepth
    };
    console.log('Analyze payload', analysisPayload);
    debugAnalysisFlow('Payload sent to /api/analyze', analysisPayload);
    const response = await postJson('/api/analyze', analysisPayload);
    console.log('Analyze response success', response?.success === true);
    debugAnalysisFlow('/api/analyze response success', response?.success === true);
    if (!response || response.success !== true || !response.analysis) {
      const error = new Error(response?.message || 'Analysis temporarily unavailable.');
      error.status = response?.status;
      error.errorCode = response?.errorCode;
      throw error;
    }
    const contextPayload = {
      asset: analysisPayload.asset,
      assetLabel: asset.label,
      tradingViewSymbol: asset.tv,
      assetClass: asset.assetClass,
      timeframe: analysisPayload.timeframe,
      strategyMode: analysisPayload.strategyMode,
      riskProfile: analysisPayload.riskProfile,
      analysisDepth: analysisPayload.analysisDepth,
      primaryProvider: analysisPayload.provider,
      reviewProvider: analysisPayload.reviewer,
      marketData: response.marketData || { configured: false, message: 'Market data unavailable. Configure market data provider before relying on automatic analysis.' },
      marketContext: response.marketContext || null,
      economicEvents: response.economicEvents || { configured: false, message: 'Economic calendar is visual only. Backend economic risk API is not configured.' },
      review: response.review || response.analysis.review || null
    };
    updateAssetInfoPanel([contextPayload.marketData.message, ...(contextPayload.marketContext?.riskFilters?.warnings || [])].filter(Boolean).join(' '));
    lastAnalysis = normalizeAnalysis(response.analysis, contextPayload);
    renderAnalysis(lastAnalysis);
    renderAutoScorecard(lastAnalysis.scorecard, lastAnalysis.score);
    $('saveAnalysisToJournal').disabled = !lastAnalysis;
    updateReviewButtonState();
    $('lastAnalysisTime').textContent = `Last analysis: ${new Date(response.timestamp || lastAnalysis.generatedAt).toLocaleString()}`;
    analysisCooldownUntil = 0;
    setApiStatus('success', 'API status: analysis complete');
    showToast('AI analysis complete.', 'success');
  } catch (error) {
    if (error.status === 429) analysisCooldownUntil = Date.now() + 10000;
    const message = formatAnalysisError(error);
    $('analysisError').textContent = message;
    renderErrorResult(message);
    setApiStatus('error', 'API status: action needed');
    $('saveAnalysisToJournal').disabled = !lastAnalysis;
    updateReviewButtonState();
    showToast(message, 'error');
  } finally {
    isAnalysisRunning = false;
    $('runAnalysis').disabled = false;
    $('runAnalysis').removeAttribute('aria-busy');
    updateReviewButtonState();
  }
}

async function reviewAnalysis() {
  if (!lastAnalysis || $('reviewProvider').value === 'none') return;
  await runAiAnalysis();
}

async function postJson(url, payload) {
  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort(), 30000);
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: controller.signal
    });
    console.log('Analyze response status', response.status);
    debugAnalysisFlow('/api/analyze response status', response.status);
    const data = await response.json().catch(() => ({}));
    console.log('Analyze response success', data?.success === true);
    if (!response.ok) {
      const error = new Error(data.message || 'Analysis temporarily unavailable.');
      error.status = response.status;
      error.errorCode = data.errorCode;
      throw error;
    }
    if (!data || typeof data !== 'object') throw new Error('Analysis temporarily unavailable.');
    return data;
  } finally {
    window.clearTimeout(timeoutId);
  }
}

function normalizeAnalysis(raw, context) {
  const scorecard = normalizeScorecard(raw.scorecard);
  const score = clampNumber(raw.score ?? Object.values(scorecard).reduce((sum, value) => sum + value, 0), 0, 10);
  const safeDecision = enforceDecision(readableString(raw.decision, 'No Trade'), score);
  const review = context.review || raw.review || null;
  const safeResult = {
    ...raw,
    ...context,
    decision: safeDecision,
    bias: allowedValue(readableString(raw.bias, 'Neutral'), ['Bullish', 'Bearish', 'Neutral'], 'Neutral'),
    confidence: clampNumber(raw.confidence, 0, 100),
    score,
    entryZone: readableString(raw.entryZone, 'Not provided'),
    stopLoss: readableString(raw.stopLoss, 'Not provided'),
    takeProfits: normalizeTakeProfits(raw.takeProfits),
    riskReward: readableString(raw.riskReward, 'Not provided'),
    timeframeSummary: readableString(raw.timeframeSummary, 'Not provided'),
    marketStructure: readableString(raw.marketStructure, 'Not provided'),
    dataQualityWarning: readableString(raw.dataQualityWarning, ''),
    reasons: normalizeTextList(raw.reasons),
    invalidations: normalizeTextList(raw.invalidations),
    economicRisk: normalizeEconomicRisk(raw, context),
    riskWarning: readableString(raw.riskWarning, 'This dashboard provides AI-assisted analysis for education and decision support only. It does not guarantee profit and does not execute trades.'),
    scorecard,
    model: readableString(raw.model || raw.modelUsed, 'unknown'),
    providerUsed: readableString(raw.providerUsed, providerLabels[context.primaryProvider] || 'Unknown'),
    modelUsed: readableString(raw.modelUsed || raw.model, 'unknown'),
    review,
    reviewerNotes: formatReviewNotes(review),
    generatedAt: raw.generatedAt || new Date().toISOString()
  };
  return applyNoTradeFieldDisplay(safeResult);
}

function readableString(value, fallback = 'Not provided') {
  if (value === undefined || value === null || value === '') return fallback;
  if (Array.isArray(value)) return value.map((item) => readableString(item, '')).filter(Boolean).join('; ') || fallback;
  if (typeof value === 'object') {
    const text = Object.entries(value).filter(([, item]) => item !== undefined && item !== null && item !== '').map(([key, item]) => `${key.replace(/([A-Z])/g, ' $1').replace(/[_-]+/g, ' ').trim()}: ${readableString(item, '')}`).join('; ');
    return text || fallback;
  }
  return String(value).trim() || fallback;
}

function normalizeTextList(value) {
  if (Array.isArray(value)) return value.map((item) => readableString(item, '')).filter(Boolean);
  const text = readableString(value, '');
  return text ? [text] : [];
}

function normalizeTakeProfits(value) {
  const targets = Array.isArray(value) ? value : value && typeof value === 'object' ? [
    value.tp1 ?? value.tp_1 ?? value.target1 ?? value.target_1 ?? value.first ?? value[0],
    value.tp2 ?? value.tp_2 ?? value.target2 ?? value.target_2 ?? value.second ?? value[1],
    value.tp3 ?? value.tp_3 ?? value.target3 ?? value.target_3 ?? value.third ?? value[2]
  ] : [value];
  return targets.slice(0, 3).map((item) => readableString(item, '')).filter(Boolean);
}

function takeProfitAt(result, index) { return Array.isArray(result.takeProfits) ? (result.takeProfits[index] || '') : (result.takeProfits?.[`tp${index + 1}`] || ''); }
function isNoTradeOrWatch(result) { return ['No Trade', 'Watch', 'Invalid Setup'].includes(result.decision) || Number(result.score) < 8; }
function hasCurrentMarketPrice(context) { return context?.marketContext?.dataCompleteness?.hasCurrentPrice === true || context?.marketContext?.riskFilters?.hasCurrentPrice === true || context?.marketContext?.currentPrice !== undefined && context?.marketContext?.currentPrice !== null || context?.marketData?.lastPrice !== undefined && context?.marketData?.lastPrice !== null; }
function marketDataIsUnavailable(context) { return context?.marketContext?.ok === false || context?.marketData?.ok === false || context?.marketData?.marketDataAvailable === false || !hasCurrentMarketPrice(context); }
function applyNoTradeFieldDisplay(result) {
  if (!isNoTradeOrWatch(result)) return result;
  return {
    ...result,
    entryZone: 'Not applicable — No Trade setup.',
    stopLoss: 'Not applicable — No Trade setup.',
    takeProfits: ['Not applicable — No valid trade setup.', 'Not applicable — No valid trade setup.', 'Not applicable — No valid trade setup.'],
    riskReward: 'Not applicable — no confirmed setup.'
  };
}

function normalizeEconomicRisk(raw, context) {
  const risk = context.marketContext?.economicRisk;
  if (risk?.verified === true || context.economicEvents?.ok === true) return readableString(raw.economicRisk || risk.summary || context.economicEvents?.riskSummary, 'Backend economic risk verified.');
  if (context.economicEvents?.configured === false || risk?.configured === false || context.economicEvents?.ok === false || risk?.verified === false) return 'Visual calendar is available, but backend economic risk API could not verify events for this analysis.';
  return readableString(raw.economicRisk || context.economicEvents?.riskSummary || context.economicEvents?.message, 'Visual calendar is available, but backend economic risk API could not verify events for this analysis.');
}

function enforceDecision(decision, score) {
  const normalized = allowedValue(decision, ['No Trade', 'Watch', 'Invalid Setup', 'Buy Setup', 'Sell Setup'], 'No Trade');
  if ((normalized === 'Buy Setup' || normalized === 'Sell Setup') && score < 8) return 'Watch';
  return normalized;
}

function normalizeScorecard(scorecard = {}) {
  return Object.fromEntries(scoreCriteria.map(([key]) => [key, clampNumber(scorecard[key], 0, 2)]));
}

function clampNumber(value, min, max) { const number = Number(value); return Number.isFinite(number) ? Math.min(max, Math.max(min, number)) : min; }
function allowedValue(value, allowed, fallback) { return allowed.includes(value) ? value : fallback; }

function formatReviewNotes(review) {
  if (!review || reviewProviderIsEmpty(review)) return '';
  if (review.message) return review.message;
  const notes = Array.isArray(review.notes) ? review.notes : [review.notes].filter(Boolean);
  const risks = Array.isArray(review.riskWarnings) ? review.riskWarnings : [];
  const contradictions = Array.isArray(review.contradictions) ? review.contradictions : [];
  return [...notes, ...risks, ...contradictions].filter(Boolean).join('\n- ');
}

function reviewProviderIsEmpty(review) { return !review || review === 'none'; }

function renderProviderStatuses(statuses = defaultProviderStatuses) {
  const container = $('providerStatusBadges');
  if (!container) return;
  container.innerHTML = Object.entries(defaultProviderStatuses).map(([key]) => {
    const rawStatus = statuses[key] ?? defaultProviderStatuses[key];
    const status = typeof rawStatus === 'boolean' ? { configured: rawStatus, message: rawStatus ? 'Configured' : (key === 'microsoft' ? 'Not configured' : 'Missing key') } : rawStatus;
    const configured = status.configured === true;
    const missing = status.configured === false;
    return `<span class="provider-badge ${configured ? 'configured' : missing ? 'missing' : 'neutral'}"><strong>${escapeHtml(providerLabels[key])}:</strong> ${escapeHtml(status.message || (configured ? 'Configured' : 'Missing key'))}</span>`;
  }).join('');
}


function updateReviewButtonState() {
  const button = $('reviewAnalysis');
  if (!button) return;
  button.disabled = !lastAnalysis || $('reviewProvider').value === 'none' || isAnalysisRunning;
}

function formatAnalysisError(error) {
  if (error.name === 'AbortError') return 'Analysis request timed out. Please try again.';
  const statusMessages = {
    400: 'Invalid analysis request. Check selected asset/provider/settings.',
    403: 'API origin blocked. Check ALLOWED_ORIGIN in Vercel.',
    429: 'Too many analysis requests. Please wait before trying again.',
    500: 'Backend analysis error. Check Vercel logs.',
    502: 'Backend analysis error. Check Vercel logs.',
    503: 'AI provider, market data, or calendar service is temporarily unavailable.'
  };
  const base = statusMessages[error.status] || error.message || 'Analysis temporarily unavailable.';
  return error.errorCode ? `${base} (${sanitizePlainText(error.errorCode, 80)})` : base;
}

function renderLoadingResult() { $('analysisResult').innerHTML = '<div class="empty-state result-empty"><strong>Running analysis...</strong><span>Fetching configured market data, checking economic risk, and calling backend AI analysis.</span></div>'; }
function renderErrorResult(message) { $('analysisResult').innerHTML = `<div class="empty-state result-empty error-result"><strong>Analysis unavailable.</strong><span>${escapeHtml(message)}</span></div>`; }

function renderAnalysis(result) {
  const decisionClass = result.decision.toLowerCase().replaceAll(' ', '-');
  $('analysisResult').innerHTML = `
    <article class="result-card hero-result"><span class="decision-badge ${decisionClass}">${escapeHtml(result.decision)}</span><h3>${escapeHtml(result.bias)} bias · ${escapeHtml(String(result.confidence))}% confidence</h3><p>${escapeHtml(result.riskWarning)}</p></article>
    <article class="result-card"><span>Primary provider</span><strong>${escapeHtml(result.providerUsed)}</strong><small>${escapeHtml(result.modelUsed)}</small></article>
    <article class="result-card"><span>Trade score</span><strong>${escapeHtml(String(result.score))} / 10</strong><small>${escapeHtml(scoreVerdict(result.score))}</small></article>
    <article class="result-card"><span>Entry zone</span><strong>${escapeHtml(result.entryZone)}</strong></article>
    <article class="result-card"><span>Stop loss idea</span><strong>${escapeHtml(result.stopLoss)}</strong></article>
    <article class="result-card"><span>TP1 / TP2 / TP3</span><strong>${escapeHtml((Array.isArray(result.takeProfits) ? result.takeProfits : [result.takeProfits?.tp1, result.takeProfits?.tp2, result.takeProfits?.tp3]).filter(Boolean).join(' / ') || 'Not provided')}</strong></article>
    <article class="result-card"><span>Risk-reward estimate</span><strong>${escapeHtml(result.riskReward)}</strong></article>
    <article class="result-card wide"><span>Main reasons</span><ul>${renderList(result.reasons)}</ul></article>
    <article class="result-card wide"><span>Invalid setup reasons</span><ul>${renderList(result.invalidations)}</ul></article>
    <article class="result-card wide"><span>Economic/news risk warning</span><p>${escapeHtml(result.economicRisk)}</p></article>
    ${renderMarketContextWarnings(result)}
    <article class="result-card wide timeframe-summary-card"><span>Timeframe / structure summary</span>${renderTimeframeSummary(result)}</article>
    ${result.review ? `<article class="result-card wide reviewer-card"><span>Reviewer notes${result.review.providerUsed ? ` · ${escapeHtml(String(result.review.providerUsed))}` : ''}</span><p>${escapeHtml(result.reviewerNotes || 'No reviewer notes returned.')}</p></article>` : ''}
  `;
}


function renderMarketContextWarnings(result) {
  const warnings = result.marketContext?.riskFilters?.warnings || result.marketContext?.dataCompleteness?.warnings || [];
  const status = marketContextStatusMessage(result);
  return `<article class="result-card wide"><span>Market context status</span><p>${escapeHtml(status)}</p>${warnings.length ? `<ul>${renderList(warnings)}</ul>` : ''}</article>`;
}

function marketContextStatusMessage(result) {
  if (result.marketContext?.ok === true && hasCurrentMarketPrice(result)) {
    const partial = result.marketContext?.dataCompleteness?.availableTimeframes?.length && result.marketContext?.dataCompleteness?.requestedTimeframes?.length && result.marketContext.dataCompleteness.availableTimeframes.length < result.marketContext.dataCompleteness.requestedTimeframes.length;
    return partial ? 'Partial market context loaded. Some indicators/timeframes may be unavailable.' : 'Market context loaded.';
  }
  if (result.marketContext?.ok === false || result.marketData?.ok === false) return 'Market data unavailable. Configure market data provider before relying on automatic analysis.';
  return 'Partial market context loaded. Some indicators/timeframes may be unavailable.';
}


function renderTimeframeSummary(result) {
  const summary = result.marketContext?.selectedTimeframeSummary || result.marketContext?.timeframes?.[result.marketContext?.selectedTimeframe] || {};
  const selectedTimeframe = summary.timeframe || result.marketContext?.selectedTimeframe || result.timeframe || 'Not available';
  const bollinger = summary.bollinger || {};
  const rsiValue = cleanDisplay(summary.rsi);
  const rows = [
    ['Selected timeframe', selectedTimeframe],
    ['Current price', result.marketContext?.currentPrice ?? summary.lastClose ?? result.marketData?.lastPrice],
    ['Trend', titleCase(summary.trend)],
    ['EMA alignment', titleCase(summary.emaAlignment)],
    ['EMA 50', summary.ema50],
    ['EMA 100', summary.ema100],
    ['EMA 200', summary.ema200],
    ['RSI 14', `${rsiValue}${rsiValue !== 'Not available' ? ` — ${rsiLabel(summary.rsi)}` : ''}`],
    ['ATR 14', summary.atr],
    ['Bollinger', `Upper ${cleanDisplay(bollinger.upper)} / Middle ${cleanDisplay(bollinger.middle)} / Lower ${cleanDisplay(bollinger.lower)}`],
    ['Nearest support', summary.support],
    ['Nearest resistance', summary.resistance],
    ['Higher timeframe status', higherTimeframeStatus(result.marketContext)],
    ['Structure summary', readableString(result.marketStructure || result.timeframeSummary, isNoTradeOrWatch(result) ? `${selectedTimeframe} ${cleanDisplay(summary.trend).toLowerCase()} near available levels, so No Trade / Watch only.` : 'Not available')]
  ];
  return `<dl class="timeframe-summary-list">${rows.map(([label, value]) => `<div><dt>${escapeHtml(label)}</dt><dd>${escapeHtml(cleanDisplay(value))}</dd></div>`).join('')}</dl>`;
}

function cleanDisplay(value) {
  if (value === undefined || value === null || value === '') return 'Not available';
  if (typeof value === 'number') return Number.isFinite(value) ? String(value) : 'Not available';
  const text = readableString(value, 'Not available').replace(/\b(undefined|NaN|Infinity|-Infinity|\[object Object\])\b/g, '').trim();
  return text || 'Not available';
}

function titleCase(value) {
  const text = cleanDisplay(value);
  if (text === 'Not available') return text;
  return text.replace(/\b\w/g, (char) => char.toUpperCase());
}

function rsiLabel(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return 'Not available';
  if (number <= 30) return 'Oversold';
  if (number >= 70) return 'Overbought';
  return 'Neutral';
}

function higherTimeframeStatus(marketContext) {
  const timeframes = marketContext?.timeframes || {};
  const trends = Object.values(timeframes).map((item) => item?.trend).filter(Boolean);
  if (!trends.length) return 'Not available';
  return new Set(trends).size === 1 ? titleCase(trends[0]) : 'Mixed';
}

function renderList(items) { return (items.length ? items : ['Not provided.']).map((item) => `<li>${escapeHtml(readableString(item, 'Not provided.'))}</li>`).join(''); }

function renderAutoScorecard(scorecard = normalizeScorecard(), total = 0) {
  $('autoScoreGrid').innerHTML = scoreCriteria.map(([key, label]) => {
    const value = clampNumber(scorecard[key], 0, 2);
    return `<div class="score-row"><div><span class="score-label">${label}</span><span class="score-helper">Automatic score from AI analysis: ${value} / 2</span></div><div class="score-meter" aria-label="${label} score ${value} of 2"><span style="width:${value * 50}%"></span></div></div>`;
  }).join('');
  updateDecision(total);
}

function updateDecision(total) {
  const score = clampNumber(total, 0, 10);
  const badge = $('scoreBadge');
  badge.textContent = `${score} / 10`;
  badge.className = `score-badge ${scoreClass(score)}`;
  const decision = $('tradeDecision');
  decision.className = `decision-box ${score < 6 ? 'no-trade' : score < 8 ? 'watch' : 'valid'}`;
  decision.textContent = `${scoreVerdict(score)} — ${score < 8 ? 'No BUY/SELL setup unless more confirmation appears.' : 'Valid setup label allowed only with risk confirmation and news checks.'}`;
}

function scoreVerdict(score) { if (score <= 5) return 'No Trade'; if (score <= 7) return 'Watch only'; if (score < 9) return 'Valid setup'; if (score < 10) return 'Strong setup'; return 'Rare A+ setup'; }
function scoreClass(score) { if (score <= 5) return 'score-no-trade'; if (score <= 7) return 'score-watch'; if (score === 8) return 'score-valid'; return 'score-strong'; }

function fillJournalFromAnalysis() {
  if (!lastAnalysis) return;
  $('jDate').value = toLocalDateTime(lastAnalysis.generatedAt);
  $('jAsset').value = assets.find((item) => item.short === lastAnalysis.asset)?.tv || $('assetSelect').value;
  $('jStrategy').value = lastAnalysis.strategyMode;
  $('jType').value = resultToTradeType(lastAnalysis.decision);
  $('jBias').value = lastAnalysis.bias;
  $('jConfidence').value = lastAnalysis.confidence;
  $('jScore').value = lastAnalysis.score;
  $('jModel').value = analysisProviderSummary(lastAnalysis);
  $('jEntry').value = lastAnalysis.entryZone;
  $('jSl').value = lastAnalysis.stopLoss;
  $('jTp1').value = takeProfitAt(lastAnalysis, 0);
  $('jTp2').value = takeProfitAt(lastAnalysis, 1);
  $('jTp3').value = takeProfitAt(lastAnalysis, 2);
  $('jRr').value = lastAnalysis.riskReward;
  $('jReasons').value = lastAnalysis.reasons.join('\n');
  $('jAiDecision').value = analysisDecisionSummary(lastAnalysis);
  showToast('AI result copied into journal form. Review before saving.', 'success');
}


function buildJournalEntryFromAnalysis() {
  if (!lastAnalysis) return null;
  return normalizeJournalEntry({
    id: `analysis-${lastAnalysis.generatedAt}-${lastAnalysis.asset}-${lastAnalysis.timeframe}`,
    date: toLocalDateTime(lastAnalysis.generatedAt),
    asset: lastAnalysis.asset || selectedShortFromTv($('jAsset').value),
    strategy: lastAnalysis.strategyMode,
    type: resultToTradeType(lastAnalysis.decision),
    bias: lastAnalysis.bias,
    confidence: lastAnalysis.confidence,
    score: lastAnalysis.score,
    model: analysisProviderSummary(lastAnalysis),
    entry: lastAnalysis.entryZone,
    sl: lastAnalysis.stopLoss,
    tp1: takeProfitAt(lastAnalysis, 0),
    tp2: takeProfitAt(lastAnalysis, 1),
    tp3: takeProfitAt(lastAnalysis, 2),
    rr: lastAnalysis.riskReward,
    result: 'Pending',
    reasons: lastAnalysis.reasons.join('\n'),
    aiDecision: analysisDecisionSummary(lastAnalysis),
    notes: ''
  });
}

function analysisProviderSummary(analysis) {
  const primary = [analysis.providerUsed, analysis.modelUsed || analysis.model].filter(Boolean).join(' — ');
  const reviewer = analysis.review?.providerUsed ? `Reviewer: ${analysis.review.providerUsed}${analysis.review.modelUsed ? ` — ${analysis.review.modelUsed}` : ''}` : 'Reviewer: None';
  return [primary || analysis.model || 'Unknown provider', reviewer].join(' | ');
}

function analysisDecisionSummary(analysis) {
  return [
    `${analysis.decision}. ${analysis.riskWarning}`,
    `Primary provider: ${analysis.providerUsed || 'Unknown'}${analysis.modelUsed ? ` (${analysis.modelUsed})` : ''}`,
    analysis.review?.providerUsed ? `Review provider: ${analysis.review.providerUsed}${analysis.review.modelUsed ? ` (${analysis.review.modelUsed})` : ''}` : 'Review provider: None',
    analysis.reviewerNotes ? `Review notes: ${analysis.reviewerNotes}` : '',
    `Economic risk: ${analysis.economicRisk}`,
    `Invalidations: ${analysis.invalidations.join('; ')}`
  ].filter(Boolean).join('\n');
}

function saveAnalysisToJournal() {
  const entry = buildJournalEntryFromAnalysis();
  if (!entry) return;
  setJournal([entry, ...getJournal()]);
  renderJournal();
  showAutosave();
  showToast('AI analysis saved to the local journal.', 'success');
}

function resultToTradeType(decision) { if (decision === 'Buy Setup') return 'BUY'; if (decision === 'Sell Setup') return 'SELL'; if (decision === 'No Trade' || decision === 'Invalid Setup') return 'NO TRADE'; return 'WATCH'; }

function addJournalEntry(event) {
  event.preventDefault();
  const error = validateJournalForm();
  if (error) { window.alert(error); return; }
  const entry = normalizeJournalEntry({ id: safeId(), date: $('jDate').value, asset: selectedShortFromTv($('jAsset').value), strategy: sanitizePlainText($('jStrategy').value), type: $('jType').value, bias: sanitizePlainText($('jBias').value), confidence: sanitizePlainText($('jConfidence').value), score: sanitizePlainText($('jScore').value), model: sanitizePlainText($('jModel').value), entry: sanitizePlainText($('jEntry').value), sl: sanitizePlainText($('jSl').value), tp1: sanitizePlainText($('jTp1').value), tp2: sanitizePlainText($('jTp2').value), tp3: sanitizePlainText($('jTp3').value), rr: sanitizePlainText($('jRr').value), result: $('jResult').value, profitNotes: sanitizePlainText($('jProfitNotes').value, 4000), reasons: sanitizePlainText($('jReasons').value, 8000), aiDecision: sanitizePlainText($('jAiDecision').value, 8000), notes: sanitizePlainText($('jNotes').value, 8000) });
  setJournal([entry, ...getJournal().map(normalizeJournalEntry)]);
  $('journalForm').reset();
  setDefaultJournalDate();
  $('jAsset').value = $('assetSelect').value;
  renderJournal();
  showAutosave();
  showToast('Journal entry saved locally.', 'success');
}

function validateJournalForm() {
  if (!$('jDate').value || !$('jAsset').value || !$('jType').value) return 'Date, symbol, and trade type are required.';
  const score = Number($('jScore').value);
  if (!Number.isFinite(score) || score < 0 || score > 10) return 'Score must be a valid number from 0 to 10.';
  if (($('jType').value === 'BUY' || $('jType').value === 'SELL') && score < 8) return 'BUY/SELL journal entries are blocked until the score is 8/10 or higher.';
  return '';
}

function getJournal() { try { return JSON.parse(localStorage.getItem('mh_journal') || '[]'); } catch { return []; } }
function setJournal(rows) {
  const seen = new Set();
  const normalized = rows.map(normalizeJournalEntry).filter((row) => {
    if (!row.id || seen.has(row.id)) return false;
    seen.add(row.id);
    return true;
  });
  localStorage.setItem('mh_journal', JSON.stringify(normalized));
}
function safeId() { return (window.crypto && typeof window.crypto.randomUUID === 'function') ? window.crypto.randomUUID() : `${Date.now()}-${Math.random().toString(16).slice(2)}`; }
function normalizeJournalEntry(row = {}) { return { id: row.id || String(Date.now()), date: row.date || '', asset: row.asset || '', strategy: row.strategy || '', type: row.type || 'WATCH', bias: row.bias || '', confidence: row.confidence || '', score: row.score || '', model: row.model || '', entry: row.entry || '', sl: row.sl || '', tp1: row.tp1 || '', tp2: row.tp2 || '', tp3: row.tp3 || '', rr: row.rr || '', result: row.result || 'Pending', profitNotes: row.profitNotes || '', reasons: row.reasons || row.timeframeNotes || '', aiDecision: row.aiDecision || '', notes: row.notes || '' }; }
function selectedShortFromTv(tv) { return assets.find((item) => item.tv === tv)?.short || tv; }

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
    const searchable = [row.strategy, row.bias, row.model, row.reasons, row.aiDecision, row.notes].join(' ').toLowerCase();
    return (!symbol || row.asset === symbol) && (!type || row.type === type) && (Number.isNaN(minScore) || (!Number.isNaN(score) && score >= minScore)) && (Number.isNaN(maxScore) || (!Number.isNaN(score) && score <= maxScore)) && (!result || row.result === result) && (!from || entryDate >= from) && (!to || entryDate <= to) && (!notes || searchable.includes(notes));
  });
}

function renderJournal() {
  const rows = getFilteredJournal();
  $('journalBody').innerHTML = rows.length ? rows.map((row) => `<tr><td data-label="Date">${escapeHtml(row.date)}</td><td data-label="Symbol">${escapeHtml(row.asset)}</td><td data-label="Strategy">${escapeHtml(row.strategy)}</td><td data-label="Type">${statusBadge(row.type)}</td><td data-label="Bias">${escapeHtml(row.bias)}</td><td data-label="Confidence">${escapeHtml(row.confidence)}</td><td data-label="Score"><span class="score-chip ${scoreClass(Number(row.score))}">${escapeHtml(row.score || '—')}</span></td><td data-label="Entry">${escapeHtml(row.entry)}</td><td data-label="SL">${escapeHtml(row.sl)}</td><td data-label="TP1">${escapeHtml(row.tp1)}</td><td data-label="TP2">${escapeHtml(row.tp2)}</td><td data-label="TP3">${escapeHtml(row.tp3)}</td><td data-label="R:R">${escapeHtml(row.rr)}</td><td data-label="Result">${escapeHtml(row.result)}</td><td data-label="AI Decision">${escapeHtml(row.aiDecision)}</td><td data-label="Manual Notes">${escapeHtml(row.notes)}</td><td data-label="Action"><button class="delete-row" type="button" data-delete-id="${escapeHtml(row.id)}">Delete</button></td></tr>`).join('') : '<tr><td colspan="17" class="empty-state"><strong>No journal entries yet.</strong><span>Run AI analysis or add a manual journal note to build your local review history.</span></td></tr>';
}

function statusBadge(type) { return `<span class="status-badge ${String(type).toLowerCase().replace(' ', '-')}">${escapeHtml(type)}</span>`; }
function clearJournalFilters() { ['filterSymbol', 'filterType', 'filterScoreMin', 'filterScoreMax', 'filterResult', 'filterDateFrom', 'filterDateTo', 'filterNotes'].forEach((id) => { $(id).value = ''; }); renderJournal(); }

document.addEventListener('click', (event) => { const button = event.target.closest('[data-delete-id]'); if (!button) return; setJournal(getJournal().filter((row) => row.id !== button.dataset.deleteId)); renderJournal(); showAutosave(); });

function exportCsv() {
  const headers = ['Date', 'Symbol', 'Strategy', 'Trade Type', 'Bias', 'Confidence', 'Score /10', 'AI Model', 'Entry Zone', 'Stop Loss', 'TP1', 'TP2', 'TP3', 'Risk-Reward', 'Result', 'Profit/Loss Notes', 'AI Reasons', 'AI Decision', 'Manual Notes'];
  const rows = getJournal().map(normalizeJournalEntry).map((row) => [row.date, row.asset, row.strategy, row.type, row.bias, row.confidence, row.score, row.model, row.entry, row.sl, row.tp1, row.tp2, row.tp3, row.rr, row.result, row.profitNotes, row.reasons, row.aiDecision, row.notes]);
  downloadFile(`ai-trading-journal-${todayStamp()}.csv`, [headers, ...rows].map((row) => row.map(csvEscape).join(',')).join('\n'), 'text/csv;charset=utf-8');
  showToast('CSV export started.', 'success');
}

function exportPdf() {
  const rows = getJournal().map(normalizeJournalEntry).map((row) => `<tr><td>${escapeHtml(row.date)}</td><td>${escapeHtml(row.asset)}</td><td>${escapeHtml(row.strategy)}</td><td>${escapeHtml(row.type)}</td><td>${escapeHtml(row.bias)}</td><td>${escapeHtml(row.confidence)}</td><td>${escapeHtml(row.score)}</td><td>${escapeHtml(row.entry)}</td><td>${escapeHtml(row.sl)}</td><td>${escapeHtml(row.tp1)}</td><td>${escapeHtml(row.rr)}</td><td>${escapeHtml(row.result)}</td><td>${escapeHtml(row.aiDecision)}</td><td>${escapeHtml(row.notes)}</td></tr>`).join('');
  const printWindow = window.open('', '_blank');
  if (!printWindow) { window.alert('PDF export was blocked by the browser.'); return; }
  printWindow.document.write(`<!doctype html><html><head><title>MH AI Trading Workflow Journal</title><style>body{font-family:Arial,sans-serif;padding:24px;color:#111}table{width:100%;border-collapse:collapse;font-size:11px}th,td{border:1px solid #ddd;padding:7px;text-align:left;vertical-align:top}th{background:#f3f4f6}</style></head><body><h1>MH AI Trading Workflow Journal</h1><p>Generated ${new Date().toLocaleString()}</p><table><thead><tr><th>Date</th><th>Symbol</th><th>Strategy</th><th>Type</th><th>Bias</th><th>Conf.</th><th>Score</th><th>Entry</th><th>SL</th><th>TP1</th><th>R:R</th><th>Result</th><th>AI Decision</th><th>Manual Notes</th></tr></thead><tbody>${rows || '<tr><td colspan="14">No entries.</td></tr>'}</tbody></table><script>window.onload=()=>setTimeout(()=>window.print(),300)<\/script></body></html>`);
  printWindow.document.close();
}

function exportLocalBackup() { downloadFile(`ai-trading-desk-backup-${todayStamp()}.json`, JSON.stringify({ schema: BACKUP_SCHEMA, version: BACKUP_VERSION, exportedAt: new Date().toISOString(), origin: window.location.origin, data: getAppLocalStorageData() }, null, 2), 'application/json;charset=utf-8'); showBackupStatus('JSON backup exported successfully.', 'success'); }
function getAppLocalStorageData() { const data = {}; for (let i = 0; i < localStorage.length; i += 1) { const key = localStorage.key(i); if (key && key.startsWith('mh_')) data[key] = localStorage.getItem(key); } return data; }
function importLocalBackup(event) { const file = event.target.files?.[0]; if (!file) return; if (file.size > MAX_BACKUP_FILE_BYTES) { showBackupStatus('Backup file is invalid or too large.', 'error'); event.target.value = ''; return; } const reader = new FileReader(); reader.onload = () => { try { const payload = JSON.parse(reader.result); validateBackupPayload(payload); Object.entries(payload.data).forEach(([key, value]) => { localStorage.setItem(key, value); }); setJournal(getJournal()); hydrateSession(); renderJournal(); showBackupStatus('JSON backup imported successfully.', 'success'); } catch (error) { showBackupStatus(error.message || 'Backup file is invalid or too large.', 'error'); } finally { event.target.value = ''; } }; reader.readAsText(file); }
function validateBackupPayload(payload) { if (!payload || payload.schema !== BACKUP_SCHEMA || !payload.data || typeof payload.data !== 'object' || Array.isArray(payload.data)) throw new Error('Backup file is invalid or too large.'); const entries = Object.entries(payload.data); const totalSize = entries.reduce((sum, [key, value]) => sum + key.length + (typeof value === 'string' ? value.length : MAX_IMPORTED_STORAGE_BYTES), 0); if (totalSize > MAX_IMPORTED_STORAGE_BYTES) throw new Error('Backup file is invalid or too large.'); entries.forEach(([key, value]) => { if (!key.startsWith('mh_') || /(?:token|secret|api[_-]?key|password|passwd|private[_-]?key)/i.test(key) || typeof value !== 'string') throw new Error('Backup file is invalid or too large.'); }); if (payload.data.mh_journal !== undefined) { const journal = JSON.parse(payload.data.mh_journal); if (!Array.isArray(journal)) throw new Error('Backup file is invalid or too large.'); } }
function clearAllLocalData() { if (!window.confirm('Clear all local dashboard data in this browser?')) return; Object.keys(getAppLocalStorageData()).forEach((key) => localStorage.removeItem(key)); lastAnalysis = null; hydrateSession(); setDefaultJournalDate(); renderJournal(); renderAutoScorecard(); showToast('Local data cleared.', 'success'); }

function showAutosave() { const indicator = $('autosaveIndicator'); indicator.textContent = 'Autosaved locally'; indicator.classList.add('saved'); setTimeout(() => indicator.classList.remove('saved'), 1200); }
function showBackupStatus(message, type) { $('backupStatus').textContent = message; $('backupStatus').className = `backup-status ${type || ''}`; }
function setApiStatus(type, message) { $('apiStatus').textContent = message; $('apiStatus').className = `status-pill ${type}`; }
function setDefaultJournalDate() { $('jDate').value = toLocalDateTime(new Date().toISOString()); $('jAsset').value = $('assetSelect').value; }
function toLocalDateTime(dateString) { const date = new Date(dateString); const offset = date.getTimezoneOffset(); return new Date(date.getTime() - offset * 60000).toISOString().slice(0, 16); }
function todayStamp() { return new Date().toISOString().slice(0, 10); }
function downloadFile(filename, content, type) { const blob = new Blob([content], { type }); const url = URL.createObjectURL(blob); const link = document.createElement('a'); link.href = url; link.download = filename; document.body.appendChild(link); link.click(); link.remove(); URL.revokeObjectURL(url); }
function csvEscape(value) { const text = String(value ?? ''); return /[",\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text; }
function sanitizePlainText(value, max = 2000) { return String(value || '').replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '').slice(0, max).trim(); }
function escapeHtml(value) { return String(value ?? '').replace(/[&<>'"]/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[char])); }
function showToast(message, type = 'success') { const toast = document.createElement('div'); toast.className = `toast ${type}`; toast.textContent = message; $('toastRegion').appendChild(toast); requestAnimationFrame(() => toast.classList.add('show')); setTimeout(() => { toast.classList.remove('show'); setTimeout(() => toast.remove(), 220); }, 3200); }

document.addEventListener('DOMContentLoaded', init);
