# NoToday — Render Proof Build (Single-Service)

This build is designed for **one platform, one reality** (Render Web Service).

## What you get
- `GET /intel` — returns intel version + counts
- `POST /check` — scans raw text/link/email/screenshot OCR text and returns `{band, score, reasons}`
- Static UI served from `/` (very minimal, uses your `styles.css`)

## Run locally
```bash
cd backend
npm install
npm start
```

## Deploy on Render
- Build command: `npm install --prefix backend`
- Start command: `npm start --prefix backend`
- Environment: Node
