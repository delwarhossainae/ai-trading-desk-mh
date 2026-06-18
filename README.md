# AI Trading Desk MH — Automatic AI Analysis MVP

A premium, responsive trading-analysis dashboard that keeps TradingView as a visual chart preview while moving automatic AI analysis to secure backend/serverless API routes.

## What is included

- Demo-only local login gate for opening the dashboard.
- TradingView Advanced Chart widget for visual preview only.
- Economic calendar display for visual review.
- Automatic AI Analysis panel with asset, strategy mode, risk profile, analysis depth, API status, and last-analysis time.
- Serverless API route structure for `/api/market-data`, `/api/economic-events`, and `/api/analyze`.
- Standalone `/api/review` is disabled; use `/api/analyze` with a reviewer provider.
- Provider abstraction for forex/metals, crypto, oil, and stocks market-data adapters.
- Auto 10-point scorecard, trade journal, CSV export, PDF / print export, and JSON local backup export/import.
- Dark/light mode and mobile-first responsive layout.

## Safety and trading rules

- No auto-trading or broker execution.
- No random buy/sell signals and no forced trades.
- No guaranteed profit language and no “100% sure” language.
- Always allow “No Trade Setup — wait for better price action confirmation.”
- No BUY or SELL setup unless score is 8/10 or higher.
- Always include confirmation, invalidation, risk management, and news risk.
- If current market data is missing, clearly say current market data is missing.
- If latest news/calendar data cannot be verified, clearly say latest news/calendar data could not be verified.

## Serverless environment variables

Configure these only in Vercel Environment Variables or another secure backend/serverless host. Never commit real secrets.

```bash
OPENAI_API_KEY=your_openai_api_key_here
OPENAI_MODEL=gpt-5-mini

ANTHROPIC_API_KEY=your_anthropic_api_key_here
ANTHROPIC_MODEL=claude-sonnet-4-5

XAI_API_KEY=your_xai_api_key_here
XAI_MODEL=grok-4

GEMINI_API_KEY=your_gemini_api_key_here
GEMINI_MODEL=gemini-2.5-pro

MICROSOFT_AI_API_KEY=your_microsoft_ai_api_key_here
AZURE_OPENAI_API_KEY=your_azure_openai_api_key_here
MICROSOFT_AI_ENDPOINT=your_microsoft_ai_endpoint_here
AZURE_OPENAI_ENDPOINT=your_azure_openai_endpoint_here
MICROSOFT_AI_MODEL=your_microsoft_model_here
AZURE_OPENAI_DEPLOYMENT=your_azure_openai_deployment_here

MARKET_DATA_PROVIDER=twelvedata
MARKET_DATA_API_KEY=your_market_data_api_key_here
MARKET_DATA_OUTPUT_SIZE=250
MARKET_DATA_TIMEZONE=UTC

ECONOMIC_CALENDAR_PROVIDER=fmp
# Uses FMP /stable/economic-calendar first, with /api/v3/economic_calendar as a safe fallback.
ECONOMIC_CALENDAR_API_KEY=your_economic_calendar_api_key_here
# Optional alias if ECONOMIC_CALENDAR_API_KEY is not set.
FMP_API_KEY=your_fmp_api_key_here

ALLOWED_ORIGIN=https://yourdomain.com

# Optional durable server-side rate limiting. If omitted, serverless routes use
# an in-memory fallback that is not enough for broad public production traffic.
UPSTASH_REDIS_REST_URL=your_upstash_url_here
UPSTASH_REDIS_REST_TOKEN=your_upstash_token_here
```

`ALLOWED_ORIGIN` is required in production. Production API requests fail closed when it is missing, because sensitive routes must not use wildcard CORS.

`.env` and `.env.local` must never be committed. API keys must be set only in Vercel Environment Variables or equivalent backend-only secret storage.

GitHub Pages alone is not suitable for secure automatic AI API usage because it cannot protect API keys or run secured `/api/*` routes. GitHub Pages can host a static-only preview; automatic analysis requires a serverless backend deployment such as Vercel.


## Economic calendar backend verification

The embedded MQL5 calendar remains visual-only. Backend economic-risk verification is performed separately through `/api/economic-events` when `ECONOMIC_CALENDAR_PROVIDER=fmp` and a backend-only `ECONOMIC_CALENDAR_API_KEY` or `FMP_API_KEY` is configured. The serverless provider tries Financial Modeling Prep `/stable/economic-calendar` first and then safely falls back to `/api/v3/economic_calendar` if the stable endpoint is unavailable. API keys are never returned to the browser, raw provider URLs are not exposed, and provider errors are reduced to safe client messages.

`/api/economic-events` distinguishes not configured, request failed, rate limited, timeout, verified with no relevant events, and verified with relevant events. XAUUSD filters focus on USD / United States high-impact macro events such as CPI, PPI, Core PCE, NFP, unemployment, Initial Jobless Claims, FOMC/Fed/Powell, interest-rate decisions, GDP, PMI/ISM, Retail Sales, Consumer Confidence, and JOLTS. Forex pairs filter by both pair currencies, for example EURUSD uses EUR and USD while GBPJPY uses GBP and JPY.

## Market data limitation

The dashboard must not fake live data. If no provider key is configured, the backend returns a safe “not configured” message and automatic analysis must stay No Trade or Watch only when verified market context is incomplete.

## Security controls

- Production origin protection fails closed when `ALLOWED_ORIGIN` is missing.
- POST JSON routes require `Content-Type: application/json`.
- `/api/analyze`, market data, and economic calendar routes have route-specific rate limits.
- Deep analysis and reviewer-enabled analysis have lower quotas.
- Optional Upstash Redis REST variables provide durable rate limiting; otherwise the fallback is in-memory only and not sufficient for broad public production.
- Provider and upstream market/economic errors are returned to clients as generic safe messages.
- Local backup import validates file size, total storage size, key allowlist, string values, and journal schema.

## How to run locally

Static-only preview:

```bash
python -m http.server 8000
```

Serverless API preview with Vercel CLI:

```bash
vercel dev
```

## Checks

```bash
npm run check:syntax
npm run test:security
npm run test:api
npm run test:smoke
npm audit --omit=dev
```
