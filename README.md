# AI Trading Desk MH — Semi-Automatic Pro MVP

A fully static, GitHub Pages-compatible dashboard for manual and semi-automatic trading analysis support. The app runs entirely in the browser and does **not** use backend code, OpenAI API keys, Claude API keys, broker API keys, or private credentials.

## What is included

- Demo-only local login gate for opening the dashboard.
- TradingView Advanced Chart widget.
- Investing.com Economic Calendar widget.
- Asset selector for XAUUSD, major FX pairs, oil, silver, and BTC/USD.
- Timeframe selector for Monthly, Weekly, Daily, H4, H1, M30, M15, and M5.
- Screenshot upload fields for every supported timeframe, stored only in browser localStorage.
- Manual chart notes for every supported timeframe.
- Current price / area notes.
- DXY notes, US bond yield notes, economic-calendar notes, and geopolitical/news notes.
- ChatGPT Professional Analysis Prompt generator.
- Claude Second-Opinion Prompt generator.
- Strict 10-point trade scorecard with colored no-trade, watch, valid, and strong setup states.
- Trade journal with filters by symbol, trade type, score range, result, date range, and notes search.
- Status badges, score chips, toast notifications, autosave indicator, and empty states.
- CSV journal export.
- PDF / print journal export.
- Full JSON local backup export and import.
- Dark/light mode.
- Mobile-first responsive layout from 320px to desktop.

## Strict trading rules preserved

The prompt workflow and scorecard are designed to reinforce these rules:

- No random signals.
- No forced trades.
- No guaranteed profit language.
- No exact levels if current price, screenshots, or notes are missing.
- No BUY or SELL unless the score is 8/10 or higher.
- If the market is unclear, use: “No Trade Setup — wait for better price action confirmation.”
- Always include confirmation, invalidation, risk management, and news risk.
- If latest news/calendar data cannot be verified, clearly state that latest news/calendar data could not be verified.

## Security, privacy, and risk notes

- Login is demo-only and browser-side; it is not real authentication.
- No secrets, API keys, broker credentials, OpenAI keys, or Claude keys are required or stored.
- Journal data, notes, screenshots, theme, and demo session state are stored in this browser's localStorage.
- Anyone with access to the browser/device may be able to view localStorage data.
- Export a JSON backup before clearing browser data or switching devices.
- This dashboard is educational software for journaling and manual analysis support only. It is not financial advice.
- Trading forex, commodities, crypto, and CFDs involves significant risk of loss.

## Demo login

Enter any non-empty username and password to open the demo dashboard. This only stores a local browser session flag.

## How to run locally

Open `index.html` directly in your browser.

If the TradingView widgets do not load from a local file path, run a local static server:

```bash
python -m http.server 8000
```

Then open:

```text
http://localhost:8000
```

## How to publish on GitHub Pages

1. Upload these files to a GitHub repository:
   - `index.html`
   - `styles.css`
   - `app.js`
   - `README.md`
   - `CODEX_TASK_PROMPTS.md`
   - `CNAME` if using the existing custom domain.
2. Go to repository **Settings → Pages**.
3. Use **Deploy from branch**.
4. Select the publishing branch and root folder.
5. Save and open the Pages URL after deployment.

## Important limitation

This MVP works with ChatGPT Plus and Claude Pro manually. It does not call ChatGPT, Claude, brokers, or market-data APIs automatically. Fully automated AI analysis would require secure server-side API calls and proper authentication, which are intentionally outside this static GitHub Pages MVP.
