import { NextRequest, NextResponse } from "next/server";
import { parseLinksFromUrl, analyzeHtmlWithGemini } from "@/utils/htmlParser";

export const maxDuration = 45; // 45 seconds timeout

// IP Rate limiter
const ipRequestHistory = new Map<string, number[]>();
const RATE_LIMIT_WINDOW_MS = 60 * 1000;
const MAX_REQUESTS_PER_WINDOW = 15;

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const timestamps = (ipRequestHistory.get(ip) || []).filter(
    (t) => now - t < RATE_LIMIT_WINDOW_MS
  );

  if (timestamps.length >= MAX_REQUESTS_PER_WINDOW) {
    return true; // Exceeded
  }

  timestamps.push(now);
  ipRequestHistory.set(ip, timestamps);
  return false;
}

export async function POST(req: NextRequest) {
  try {
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "127.0.0.1";
    if (checkRateLimit(ip)) {
      return NextResponse.json(
        { error: "Rate limit reached. Maximum 15 requests per minute allowed." },
        { status: 429 }
      );
    }

    const body = await req.json();
    const targetUrl = (body.url || "").trim();
    const useGemini = body.useGemini !== false; // default true
    const page = body.page ? parseInt(body.page, 10) : undefined;
    const maxPages = body.maxPages ? parseInt(body.maxPages, 10) : 1;

    if (!targetUrl) {
      return NextResponse.json(
        { error: "URL is required. Please provide a valid webpage URL." },
        { status: 400 }
      );
    }

    console.log(`[URL Parser] 🌐 Fetching and parsing HTML from: ${targetUrl} (page: ${page || 1}, maxPages: ${maxPages})`);
    const result = await parseLinksFromUrl(targetUrl, { page, maxPages });

    // Method B: Enrich with Gemini AI classification/summary
    if (useGemini && process.env.GEMINI_API_KEY) {
      try {
        console.log(`[URL Parser] 🤖 Running Gemini AI analysis on extracted links...`);
        const aiSummary = await analyzeHtmlWithGemini(
          result.pageTitle,
          result.url,
          result.links
        );
        result.geminiAnalysis = aiSummary;
      } catch (geminiErr) {
        console.warn("[URL Parser] Gemini AI analysis failed:", geminiErr);
      }
    }

    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (error: unknown) {
    const err = error as Error;
    console.error("[URL Parser Error]", err);
    return NextResponse.json(
      { error: err.message || "Failed to parse HTML from URL." },
      { status: 500 }
    );
  }
}
