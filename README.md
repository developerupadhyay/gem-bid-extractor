# Document Field & Link Extractor (AI Powered)

A secure, high-performance document extraction tool built with **Next.js App Router**, **Google Gemini Vision AI**, and **Tailwind CSS**, designed for one-click deployment on **Vercel**.

---

## 🔒 Security & Protection Features

1. **Password Protected Access (Auth Gateway):**
   - Built-in authentication system with HMAC-SHA256 signed session cookies.
   - All page views and API routes (`/api/extract`) are strictly locked behind authentication.
   - Unauthenticated API attempts receive `401 Unauthorized`.

2. **API Quota & Rate Limit Protection:**
   - IP-based rate limiting caps requests to maximum 10 per minute to prevent exhausting Gemini's 15 RPM quota.
   - File size validation caps uploads at 20MB.
   - PDF magic bytes verification (`%PDF-`) prevents execution of non-PDF or malicious files.

3. **Enterprise Security Headers:**
   - `X-Frame-Options: SAMEORIGIN` (Clickjacking prevention).
   - `X-Content-Type-Options: nosniff` (MIME sniffing prevention).
   - `Referrer-Policy: strict-origin-when-cross-origin`.
   - `Permissions-Policy: camera=(), microphone=(), geolocation=()`.

4. **Zero Client-Side Secret Leaks:**
   - The Gemini API key is purely server-side (`process.env.GEMINI_API_KEY`) and never sent to or visible in the browser.

---

## ⚡ Extracted Fields

- 14 Key Technical & Commercial Bid Parameters
- Document Links, Circular References & Downloadable URLs (with interactive download buttons)

---

## ☁️ Vercel Deployment Guide

### Step 1: Import Project to Vercel
1. Go to [vercel.com/new](https://vercel.com/new)
2. Import repository: `developerupadhyay/gem-bid-extractor`

### Step 2: Configure Environment Variables in Vercel
Add the following 5 variables in your Vercel Project Settings:

| Variable Name | Description | Example / Recommended Value |
|---|---|---|
| `GEMINI_API_KEY` | Your Google Gemini API Key | `AQ.Ab8RN6L8...` |
| `GEMINI_MODEL` | Preferred Gemini Model | `gemini-3.5-flash-lite` |
| `ADMIN_USERNAME` | Login Username | `admin` |
| `ADMIN_PASSWORD` | Strong Login Password | `YourStrongPassword123!` |
| `AUTH_SECRET` | 32-character random string for cookie signing | `f9a8b7c6d5e4f3a2b1c0d9e8f7a6b5c4` |

### Step 3: Deploy
Click **Deploy**. Your protected document extractor will be live immediately!

---

## 💻 Local Development Setup

Default local credentials in `.env.local`:
- **Username:** `admin`
- **Password:** `admin@dev123`

```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) and sign in.
