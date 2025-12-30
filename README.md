# NoToday — Public Test Build

NoToday is a calm, explainable scam-risk checking tool.

This repository contains the **public test UI + API service** used at  
👉 https://notoday.co.za

The system is intentionally simple:
- One input
- One explanation
- No accounts
- No tracking
- No stored user data

---

## What this build does

### API
- **GET /intel**  
  Returns the current intel version and indicator counts.

- **POST /check**  
  Accepts raw text (email, link, message, or OCR text) and returns:
  - risk band (`SAFE`, `SUSPICIOUS`, `CRITICAL`)
  - score (0–100)
  - reasons
  - what not to do
  - intel version

### UI
- Static HTML/CSS/JS
- Served independently from the API
- Always calls the API origin (never the UI origin)
- Designed for high-stress, low-friction use

---

## Architecture (intentionally boring)

