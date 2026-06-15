# ChatGPT Codex App Task Prompts

Use these prompts inside the Codex app after opening this project folder.

## Task 1 — Project audit

Review this static AI Trading Desk MVP. Check index.html, styles.css, and app.js for bugs, accessibility issues, mobile layout problems, broken widget reload behavior, localStorage issues, and export issues. Keep the current design style. Make safe improvements only and explain what changed.

## Task 2 — Improve prompt generator

Upgrade the ChatGPT and Claude prompt generator so it supports separate notes for Monthly, Weekly, Daily, H4, H1, M30, M15, and M5. Keep the final prompt aligned with strict rules: no forced trades, no exact levels unless provided, scorecard threshold 8/10, no trading before high-impact news, and price action priority.

## Task 3 — Add screenshot upload notes

Add screenshot upload inputs for Monthly, Weekly, Daily, H4, H1, M30, M15, and M5. Since this is static MVP, do not send images anywhere. Show selected filenames and add them to the generated prompt as a checklist reminding the user to upload those screenshots to ChatGPT or Claude manually.

## Task 4 — Production authentication plan

Convert the demo login into a proper production-ready authentication plan. Do not expose secrets in frontend code. Recommend a simple stack suitable for GitHub Pages limitations or suggest moving to Netlify/Vercel/Supabase for real authentication.

## Task 5 — GitHub Pages polish

Prepare this project for GitHub Pages deployment. Add favicon placeholder, Open Graph tags, mobile viewport checks, a privacy note, and clean README steps. Do not add a complex build system.
