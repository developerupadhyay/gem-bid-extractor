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
   - Server-side only API communication (`process.env`), never visible to browser clients.

---

## ⚡ Extracted Fields

- 14 Key Technical & Commercial Bid Parameters
- Document Links, Circular References & Downloadable URLs (with interactive download buttons & clickable PDF preview)

---

## ☁️ Vercel Deployment

1. Import project into Vercel from GitHub repository: `developerupadhyay/gem-bid-extractor`
2. Add your project configuration in Vercel settings.
3. Click **Deploy**.

---

## 💻 Local Development Setup

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).
