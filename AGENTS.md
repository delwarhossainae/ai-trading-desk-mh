# AI Trading Desk MH — Codex Instructions

This repository is a static GitHub Pages MVP dashboard for manual trading analysis support.

## Project Type

- Static HTML/CSS/JavaScript website.
- Hosted with GitHub Pages.
- Main files:
  - index.html
  - styles.css
  - app.js
  - README.md
  - CODEX_TASK_PROMPTS.md
  - CNAME

## Important Rules

- Keep the website static unless the user clearly asks for a backend.
- Do not add API keys, secrets, tokens, passwords, or private credentials in frontend files.
- Do not remove or overwrite the CNAME file unless the user specifically asks.
- Do not change the custom domain setup without permission.
- Do not remove existing features.
- Do not redesign the whole website unless requested.
- Keep the current premium trading dashboard look.
- Keep mobile-first responsive design.
- Keep dark/light mode working.
- Keep the project compatible with GitHub Pages.

## Existing Features To Preserve

Codex must preserve these features:

- Login page
- Dashboard page
- TradingView Advanced Chart widget
- TradingView Economic Calendar widget
- Asset selector
- Timeframe selector
- Manual ChatGPT prompt generator
- Manual Claude prompt generator
- Trade scorecard
- Trade journal
- CSV export
- PDF export / print export
- Dark/light mode
- Local browser storage

## Trading Workflow Rules

The dashboard supports manual trading analysis for:

- XAUUSD / Gold
- EUR/USD
- EUR/JPY
- USD/JPY
- GBP/USD
- GBP/JPY
- USD/CHF
- AUD/USD
- USD/CAD
- NZD/USD
- US Oil
- XAGUSD
- BTC/USD

Supported timeframes:

- Monthly
- Weekly
- Daily
- H4
- H1
- M30
- M15
- M5

Trading logic must follow these rules:

- Do not generate random buy/sell signals.
- Do not force a trade.
- If the market is unclear, use: “No Trade Setup — wait for better price action confirmation.”
- No BUY or SELL unless score is 8/10 or higher.
- Never say guaranteed profit.
- Never say 100% sure.
- Always include confirmation, invalidation, risk management, and news risk.
- If live price, screenshots, or current market data are missing, clearly say that data is missing.
- If latest news/calendar data cannot be verified, clearly say that latest news/calendar data could not be verified.

## UI/UX Rules

- Keep professional trading desk layout.
- Keep responsive layout for desktop, tablet, and mobile.
- Avoid oversized text and icons.
- Avoid layout overflow on small screens.
- Keep buttons readable and easy to click.
- Keep TradingView panels responsive.
- Keep forms clean and easy to use.
- Keep good contrast in both dark mode and light mode.

## JavaScript Rules

- Keep code clean and readable.
- Avoid breaking existing localStorage data.
- Add error handling where needed.
- Do not use external libraries unless necessary.
- Do not add heavy frameworks unless requested.
- Keep the app fast for GitHub Pages.

## Testing Checklist

Before final answer, Codex should test or reason through:

- Login opens dashboard.
- Logout works.
- TradingView chart loads.
- Economic calendar loads.
- Asset selector updates correctly.
- Timeframe selector updates correctly.
- ChatGPT prompt generator works.
- Claude prompt generator works.
- Scorecard total updates correctly.
- Trade decision follows score rules.
- Journal saves entries.
- Journal entries remain after refresh.
- CSV export works.
- PDF/print export works.
- Dark/light mode works.
- Mobile layout works.
- No console errors from project code.
- GitHub Pages compatibility is preserved.

## Local Testing

For local testing, run:

```bash
python -m http.server 8000
