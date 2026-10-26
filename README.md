# GeM Bid AI OCR & Field Extractor

An AI-powered document processing tool built with **Next.js App Router**, **Google Gemini 3.8 Flash**, and **Tailwind CSS**, designed for instant deployment on **Vercel**.

Upload any Government e-Marketplace (GeM) Bid / Tender PDF document and extract exact technical parameters, relaxations, quantities, and consignee delivery details directly into structured tables, **Microsoft Excel (.xlsx)**, **CSV**, and **JSON**.

---

## ⚡ Extracted Fields (14 Key Bid Parameters)

1. **Bid Number** (बिड संख्या)
2. **Bid End Date/Time** (बिड बंद होने की तारीख/समय)
3. **Total Quantity** (कुल मात्रा)
4. **Office Name** (कार्यालय का नाम)
5. **MSE Relaxation for Years Of Experience and Turnover**
6. **Startup Relaxation for Years Of Experience and Turnover**
7. **Classification of cables for improved fire performace category**
8. **Nominal Area of Conductor**
9. **Number of core**
10. **Material of conductor**
11. **Type of cable**
12. **Consignee Reporting/Officer**
13. **Delivery Address**
14. **Delivery Days**

---

## 🚀 Quick Start (Local Setup)

### 1. Prerequisites
- Node.js >= 18
- Google Gemini API Key (get from [Google AI Studio](https://aistudio.google.com/))

### 2. Install Dependencies
```bash
git clone https://github.com/developerupadhyay/gem-bid-extractor.git
cd gem-bid-extractor
npm install
```

### 3. Setup Environment Variables
Create a `.env.local` file in the root directory:
```env
GEMINI_API_KEY=your_actual_gemini_api_key_here
GEMINI_MODEL=gemini-3.8-flash
```

### 4. Run Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## ☁️ Deployment on Vercel

1. Push your code to GitHub (already linked to `developerupadhyay/gem-bid-extractor`).
2. Go to [Vercel](https://vercel.com/new) and import the repository.
3. In **Environment Variables**, add:
   - `GEMINI_API_KEY` = `your_gemini_api_key`
4. Click **Deploy**. Vercel will automatically build and deploy the Next.js serverless app.

---

## 🛠️ Tech Stack
- **Framework:** Next.js 16 (App Router)
- **AI Model:** Google Gemini 3.8 Flash (with automatic fallback to Gemini 3.5 Flash-Lite)
- **SDK:** `@google/genai` v2.31.0
- **Exporting:** SheetJS (`xlsx`)
- **Styling:** Tailwind CSS
- **Icons:** Lucide React
