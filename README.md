# AI Trading Desk MH — Static MVP

A fully working browser-based MVP dashboard for manual trading analysis with:

- Local demo login
- TradingView Advanced Chart widget
- TradingView Economic Calendar widget
- Manual ChatGPT prompt generator
- Manual Claude second-opinion prompt generator
- 10-point trade scorecard
- Trade journal saved in browser localStorage
- CSV export
- PDF export through browser print/save as PDF
- Dark/light mode
- GitHub Pages compatible

## Demo login

Username: `admin`  
Password: `mhdesk`

Change these values in `app.js` before publishing publicly.

## How to run locally

Open `index.html` directly in your browser.

If the TradingView widgets do not load from a local file path, run a local server:

```bash
python -m http.server 8000
```

Then open:

```text
http://localhost:8000
```

## How to publish on GitHub Pages

1. Create a new GitHub repository, for example `ai-trading-desk-mh`.
2. Upload these files:
   - `index.html`
   - `styles.css`
   - `app.js`
   - `README.md`
   - `CODEX_TASK_PROMPTS.md`
3. Go to GitHub repository settings.
4. Open **Pages**.
5. Source: **Deploy from branch**.
6. Branch: `main`, folder: `/root`.
7. Save.
8. Open the GitHub Pages URL after deployment.

## Important limitation

This MVP works with ChatGPT Plus and Claude Pro manually. It does not directly call ChatGPT or Claude automatically because Plus/Pro web subscriptions are not API credentials. For automated AI analysis, you would need OpenAI API and Anthropic API keys, backend authentication, and secure server-side API calls.

## Security note

The login is demo-only and browser-side. Do not use it for private or client data. For production, build a backend with secure authentication.
