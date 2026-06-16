# AI Trading Desk MH — Automatic AI Analysis MVP

A premium, responsive trading-analysis dashboard that keeps TradingView as a visual chart preview while moving automatic AI analysis to secure backend/serverless API routes.

## What is included

- Demo-only local login gate for opening the dashboard.
- TradingView Advanced Chart widget for visual preview only.
- Economic calendar display for visual review.
- Automatic AI Analysis panel with asset, strategy mode, risk profile, analysis depth, API status, and last-analysis time.
- Serverless API route structure for `/api/market-data`, `/api/economic-events`, `/api/analyze`, and optional `/api/review`.
- Provider abstraction for future forex/metals, crypto, oil, and stocks market-data adapters.
- Auto 10-point scorecard.
- AI result panel with decision, bias, confidence, score, entry zone, stop loss idea, TP levels, risk-reward, reasons, invalidations, news risk, and risk note.
- Trade journal that can save automatic AI results and manual final results later.
- CSV journal export.
- PDF / print journal export.
- Full JSON local backup export and import.
- Dark/light mode.
- Mobile-first responsive layout.

## Safety and trading rules

- No auto-trading or broker execution.
- No random buy/sell signals.
- No forced trades.
- No guaranteed profit language.
- No “100% sure” language.
- Always allow “No Trade Setup — wait for better price action confirmation.”
- No BUY or SELL setup unless score is 8/10 or higher.
- Always include confirmation, invalidation, risk management, and news risk.
- If current market data is missing, clearly say current market data is missing.
- If latest news/calendar data cannot be verified, clearly say latest news/calendar data could not be verified.

## Serverless environment variables

Configure these only in the backend/serverless host. Never commit real secrets.

```bash
OPENAI_API_KEY=
ANTHROPIC_API_KEY=
MARKET_DATA_API_KEY=
ECONOMIC_CALENDAR_API_KEY=
```

`ANTHROPIC_API_KEY` and `ECONOMIC_CALENDAR_API_KEY` are optional. Claude review is disabled when Anthropic is not configured.

## Market data limitation

The provider abstraction is in place, but no concrete paid/live data provider is hardcoded. If no provider key is configured, the app returns:

> Market data API is not configured. Add provider key in backend environment variables.

The dashboard must not fake live data.

## How to run locally

Static-only preview:

```bash
python -m http.server 8000
```

Serverless API preview with Vercel CLI:

```bash
vercel dev
```

## GitHub Pages compatibility

The frontend remains static-compatible, but GitHub Pages cannot securely run `/api/*` routes or protect API keys. Use Vercel or Netlify for the automatic AI workflow. GitHub Pages can still host a static-only preview, but automatic analysis requires serverless backend deployment.
