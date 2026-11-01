import * as cheerio from "cheerio";
import { DocumentLinkItem, UrlExtractResult } from "@/types/bid";
import { GoogleGenAI } from "@google/genai";

const DOWNLOADABLE_EXTENSIONS_REGEX =
  /\.(pdf|docx?|xlsx?|csv|zip|rar|tar|gz|7z|pptx?|txt)(\?.*)?$/i;
const DOWNLOADABLE_KEYWORDS_REGEX =
  /(download|attachment|document|file|boq|spec|circular|notice|tender|viewfile)/i;

/**
 * Validates whether a candidate string is a valid HTTP/HTTPS URL
 */
export function isValidUrl(candidate: string): boolean {
  try {
    const parsed = new URL(candidate);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

/**
 * Fetches HTML from target URL and parses all hyperlinks, documents, and surrounding context.
 */
export async function parseLinksFromUrl(
  targetUrl: string,
  options?: { page?: number; maxPages?: number }
): Promise<UrlExtractResult> {
  if (!isValidUrl(targetUrl)) {
    throw new Error("Invalid URL format. Please enter a valid URL starting with http:// or https://");
  }

  // Specialized Live GeM Bid Handler:
  // GeM all-bids renders bids dynamically via client-side AJAX (.bid_no_hover).
  // We seamlessly connect to the live GeM bids API to extract actual bid documents with pagination.
  if (targetUrl.includes("bidplus.gem.gov.in")) {
    return await parseGeMBidsLive(targetUrl, options);
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 20000); // 20s timeout

  let html = "";
  try {
    const res = await fetch(targetUrl, {
      signal: controller.signal,
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36",
        Accept:
          "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
        "Cache-Control": "no-cache",
      },
      redirect: "follow",
    });

    clearTimeout(timeoutId);

    if (!res.ok) {
      throw new Error(`Failed to fetch URL: HTTP ${res.status} ${res.statusText}`);
    }

    html = await res.text();
  } catch (err: unknown) {
    clearTimeout(timeoutId);
    const error = err as Error;
    if (error.name === "AbortError") {
      throw new Error("Target webpage took too long to respond (20s timeout).");
    }
    throw new Error(`Error fetching page: ${error.message}`);
  }

  const $ = cheerio.load(html);
  const pageTitle = $("title").text().trim() || $("h1").first().text().trim() || "Webpage Document";

  const links: DocumentLinkItem[] = [];
  const seenUrls = new Set<string>();

  $("a[href]").each((_, el) => {
    const rawHref = $(el).attr("href")?.trim();
    if (!rawHref) return;

    // Filter out javascript, fragments, tel, etc.
    if (
      rawHref.startsWith("javascript:") ||
      rawHref.startsWith("#") ||
      rawHref.startsWith("tel:")
    ) {
      return;
    }

    let absoluteUrl = "";
    try {
      absoluteUrl = new URL(rawHref, targetUrl).href;
    } catch {
      return; // invalid URL
    }

    if (seenUrls.has(absoluteUrl)) return;
    seenUrls.add(absoluteUrl);

    // Extract link text or aria-label or title or img alt
    const anchorText =
      $(el).text().replace(/\s+/g, " ").trim() ||
      $(el).attr("title")?.trim() ||
      $(el).attr("aria-label")?.trim() ||
      $(el).find("img").attr("alt")?.trim() ||
      "";

    // Extract nearby context (closest heading, table row, parent text)
    const closestHeading =
      $(el).closest("table").prev("h1, h2, h3, h4, h5, h6").text().trim() ||
      $(el).parents("section, div, article").find("h1, h2, h3, h4, h5, h6").first().text().trim() ||
      $(el).closest("tr").find("th, td").first().text().replace(/\s+/g, " ").trim() ||
      "";

    // Extract file extension if any
    const urlObj = new URL(absoluteUrl);
    const pathParts = urlObj.pathname.split(".");
    const ext = pathParts.length > 1 ? pathParts.pop()?.toLowerCase() : undefined;

    const isDownloadable =
      DOWNLOADABLE_EXTENSIONS_REGEX.test(absoluteUrl) ||
      DOWNLOADABLE_KEYWORDS_REGEX.test(absoluteUrl) ||
      DOWNLOADABLE_KEYWORDS_REGEX.test(anchorText);

    let docType = "Web Link";
    if (ext) {
      docType = `${ext.toUpperCase()} File`;
    } else if (isDownloadable) {
      docType = "Document Download";
    }

    const title =
      anchorText ||
      (closestHeading ? `${closestHeading}` : "") ||
      urlObj.pathname.split("/").filter(Boolean).pop() ||
      "Link";

    links.push({
      page: 1,
      type: docType,
      title: title.slice(0, 150),
      url: absoluteUrl,
      isDownloadable,
      extension: ext,
    });
  });

  const downloadableCount = links.filter((l) => l.isDownloadable).length;

  return {
    url: targetUrl,
    pageTitle,
    totalLinks: links.length,
    downloadableLinksCount: downloadableCount,
    links,
  };
}

/**
 * Specialized handler for GeM (Government e-Marketplace) All Bids page.
 * Bids on GeM are injected dynamically via AJAX (.bid_no_hover class).
 * This connects directly to GeM live API using the active session token to extract all current bids.
 */
async function parseGeMBidsLive(
  targetUrl: string,
  options?: { page?: number; maxPages?: number }
): Promise<UrlExtractResult> {
  const getRes = await fetch("https://bidplus.gem.gov.in/all-bids", {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36",
      Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      "Accept-Language": "en-US,en;q=0.9",
    },
  });

  const cookies = getRes.headers.getSetCookie
    ? getRes.headers.getSetCookie().map((c) => c.split(";")[0]).join("; ")
    : (getRes.headers.get("set-cookie") || "");

  const html = await getRes.text();
  const tokenMatch = html.match(/csrf_bd_gem_nk\x27\s*:\s*\x27([a-f0-9]+)\x27/i);
  const token = tokenMatch ? tokenMatch[1] : "";

  if (!token) {
    throw new Error("Could not extract GeM CSRF security token from all-bids page.");
  }

  let startPage = options?.page || 1;
  try {
    const urlObj = new URL(targetUrl);
    const p = urlObj.searchParams.get("page");
    if (p) startPage = Math.max(1, parseInt(p, 10));
  } catch {}

  const maxPages = Math.min(10, Math.max(1, options?.maxPages || 1));
  const links: DocumentLinkItem[] = [];
  let totalRecords = 0;

  for (let p = startPage; p < startPage + maxPages; p++) {
    const body = new URLSearchParams({
      payload: JSON.stringify({ page: p }),
      csrf_bd_gem_nk: token,
    });

    const postRes = await fetch("https://bidplus.gem.gov.in/all-bids-data", {
      method: "POST",
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36",
        "X-Requested-With": "XMLHttpRequest",
        Referer: "https://bidplus.gem.gov.in/all-bids",
        "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
        Cookie: cookies,
      },
      body: body.toString(),
    });

    if (!postRes.ok) break;

    const json = await postRes.json();
    const respObj = json?.response?.response;
    if (respObj?.numFound) totalRecords = respObj.numFound;
    const docs = respObj?.docs || [];

    for (const doc of docs) {
      const rawId = Array.isArray(doc.b_id) ? doc.b_id[0] : doc.b_id;
      const rawBidNo = Array.isArray(doc.b_bid_number) ? doc.b_bid_number[0] : doc.b_bid_number;
      const rawCat = Array.isArray(doc.b_category_name)
        ? doc.b_category_name[0]
        : (doc.b_category_name || "GeM Tender Item");
      const quantity = Array.isArray(doc.b_total_quantity) ? doc.b_total_quantity[0] : doc.b_total_quantity;

      if (rawId && rawBidNo) {
        links.push({
          page: p,
          type: "GeM Bid Document (PDF)",
          title: `${rawBidNo} — ${rawCat}${quantity ? ` (Qty: ${quantity})` : ""}`,
          url: `https://bidplus.gem.gov.in/showbidDocument/${rawId}`,
          isDownloadable: true,
          extension: "pdf",
        });
      }

      const parentId = Array.isArray(doc.b_id_parent) ? doc.b_id_parent[0] : doc.b_id_parent;
      const parentBidNo = Array.isArray(doc.b_bid_number_parent) ? doc.b_bid_number_parent[0] : doc.b_bid_number_parent;
      if (parentId && parentBidNo) {
        links.push({
          page: p,
          type: "Parent Bid Document (PDF)",
          title: `Parent Bid No: ${parentBidNo}`,
          url: `https://bidplus.gem.gov.in/showbidDocument/${parentId}`,
          isDownloadable: true,
          extension: "pdf",
        });
      }
    }
  }

  const totalPages = totalRecords > 0 ? Math.ceil(totalRecords / 10) : 1;

  return {
    url: targetUrl,
    pageTitle: `Government e-Marketplace (GeM) - Active Bids ${
      maxPages > 1 ? `(Pages ${startPage}–${startPage + maxPages - 1})` : `(Page ${startPage})`
    }`,
    totalLinks: links.length,
    downloadableLinksCount: links.length,
    links,
    currentPage: startPage,
    totalPages,
    totalRecords,
    isPaginated: true,
  };
}

/**
 * Method B: Enhances extracted HTML data using Gemini AI
 * Extracts page overview and intelligently categorizes links (Important tender docs, specifications, notices)
 */
export async function analyzeHtmlWithGemini(
  pageTitle: string,
  url: string,
  links: DocumentLinkItem[]
): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || links.length === 0) return "";

  try {
    const ai = new GoogleGenAI({ apiKey });
    const configuredModel = process.env.GEMINI_MODEL || "gemini-2.5-flash-lite";

    // Feed the top links list to Gemini to get a concise summary
    const sampleLinks = links.slice(0, 60).map((l, i) => `${i + 1}. [${l.type}] ${l.title} -> ${l.url}`).join("\n");

    const prompt = `
You are an expert Document & Web Link Intelligence Analyzer.
Analyze the following webpage details and list of extracted hyperlinks:

Page Title: ${pageTitle}
Page URL: ${url}
Total Links Extracted: ${links.length}

Links Sample:
${sampleLinks}

Task:
Provide a concise, 2-3 bullet point summary highlighting:
1. What kind of page this is (e.g. Tender Notice, Official Portal, Document Repository).
2. Key downloadable resources, specifications, or documents found (if any).
Keep it strictly under 60 words, factual, and direct.
`;

    const response = await ai.models.generateContent({
      model: configuredModel,
      contents: [prompt],
      config: {
        temperature: 0.2,
      },
    });

    return response.text || "";
  } catch (err) {
    console.warn("[Gemini HTML Analyzer] Could not generate AI summary:", err);
    return "";
  }
}
