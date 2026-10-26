import { NextRequest, NextResponse } from "next/server";
import { GoogleGenAI, Type } from "@google/genai";
import { GeMBidData } from "@/types/bid";
import { extractStructuredLinksFromPdf } from "@/utils/pdfLinks";

// Vercel Serverless Function settings
export const maxDuration = 60; // 60 seconds timeout

// Strict rate limiter to protect against exceeding Gemini 15 RPM quota
const ipRequestHistory = new Map<string, number[]>();
const RATE_LIMIT_WINDOW_MS = 60 * 1000;
const MAX_REQUESTS_PER_WINDOW = 10; // Cap at 10 requests/min per IP
const MAX_FILE_SIZE_BYTES = 20 * 1024 * 1024; // 20 MB max file size

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

// JSON Schema definition for Google GenAI structured output
const documentSchema = {
  type: Type.OBJECT,
  properties: {
    bidNumber: {
      type: Type.STRING,
      description: "Bid Number / Identifier / बिड संख्या (e.g. GEM/2025/B/6990980)",
    },
    bidEndDateTime: {
      type: Type.STRING,
      description: "Bid End Date/Time / बिड बंद होने की तारीख/समय (e.g. 05-01-2026 14:00:00)",
    },
    totalQuantity: {
      type: Type.STRING,
      description: "Total Quantity / कुल मात्रा (e.g. 2000)",
    },
    officeName: {
      type: Type.STRING,
      description: "Office Name / कार्यालय का नाम (e.g. Satish Dhawan Space Centre Shar)",
    },
    mseRelaxation: {
      type: Type.STRING,
      description: "MSE Relaxation for Years Of Experience and Turnover / एमएसई को छूट (e.g. Yes | Complete)",
    },
    startupRelaxation: {
      type: Type.STRING,
      description: "Startup Relaxation for Years Of Experience and Turnover / स्टार्टअप के लिए छूट (e.g. Yes | Complete)",
    },
    cableFireClassification: {
      type: Type.STRING,
      description: "Classification of cables for improved fire performance category / अग्निशमन प्रदर्शन श्रेणी (e.g. C2 - FR-LSH)",
    },
    nominalAreaOfConductor: {
      type: Type.STRING,
      description: "Nominal Area of Conductor (in Sq mm) / चालक का नाममात्र क्षेत्र (e.g. 2.5)",
    },
    numberOfCore: {
      type: Type.STRING,
      description: "Number of core (in Nos) / कोर की संख्या (e.g. 4)",
    },
    materialOfConductor: {
      type: Type.STRING,
      description: "Material of conductor / कंडक्टर की सामग्री (e.g. Plain Copper)",
    },
    typeOfCable: {
      type: Type.STRING,
      description: "Type of cable / केबल का प्रकार (e.g. Armoured cable)",
    },
    consigneeReportingOfficer: {
      type: Type.STRING,
      description: "Consignee Reporting/Officer / परेषिती/रिपोर्टिंग अधिकारी (e.g. Hema O)",
    },
    address: {
      type: Type.STRING,
      description: "Consignee address / डिलीवरी का पता (e.g. 524124,PSO, SPROB STORES, SDSC SHAR, SRIHARIKOTA)",
    },
    deliveryDays: {
      type: Type.STRING,
      description: "Delivery Days / डिलीवरी के दिन (e.g. 90)",
    },
    documentLinks: {
      type: Type.STRING,
      description: "Any URLs, web links, document download links (such as tender specs, OM circulars, guidelines, or email addresses) found across the document. Format as URLs/links separated by spaces or newlines. If none found, return 'None'.",
    },
  },
  required: [
    "bidNumber",
    "bidEndDateTime",
    "totalQuantity",
    "officeName",
    "mseRelaxation",
    "startupRelaxation",
    "cableFireClassification",
    "nominalAreaOfConductor",
    "numberOfCore",
    "materialOfConductor",
    "typeOfCable",
    "consigneeReportingOfficer",
    "address",
    "deliveryDays",
    "documentLinks",
  ],
};

const EXTRACTION_PROMPT = `
You are an expert Document and Tender Specification Analyzer.
Analyze the provided PDF document thoroughly across all pages and extract the following fields accurately:

1. Bid Number (बिड संख्या) - usually located on the top right of Page 1 (e.g. GEM/2025/B/6990980)
2. Bid End Date/Time (बिड बंद होने की तारीख/समय) - from the Bid Details table (e.g. 05-01-2026 14:00:00)
3. Total Quantity (कुल मात्रा) - total item quantity requested (e.g. 2000)
4. Office Name (कार्यालय का नाम) - name of the procuring office (e.g. Satish Dhawan Space Centre Shar)
5. MSE Relaxation for Years Of Experience and Turnover (वर्षों के अनुभव एवं टर्नओवर से एमएसई को छूट) - (e.g. Yes | Complete)
6. Startup Relaxation for Years Of Experience and Turnover (स्टार्टअप के लिए अनुभव के वर्षों और टर्नओवर से छूट) - (e.g. Yes | Complete)
7. Classification of cables for improved fire performace category - under Generic / Technical Specifications (e.g. C2 - FR-LSH)
8. Nominal Area of Conductor - conductor size in sq mm (e.g. 2.5)
9. Number of core - number of cores in cable (e.g. 4)
10. Material of conductor - conductor material under Construction (e.g. Plain Copper)
11. Type of cable - cable type under Armouring (e.g. Armoured cable)
12. Consignee Reporting/Officer - under Consignees/Reporting Officer table (e.g. Hema O)
13. Address - full delivery address in Consignees table (e.g. 524124,PSO, SPROB STORES, SDSC SHAR, SRIHARIKOTA)
14. Delivery Days - delivery days in Consignees table (e.g. 90)
15. Document Links & Downloads - Any URLs, hyperlinks, document download links (such as OM links, BOQ links, specification files), or email addresses mentioned in the document (e.g. OM_No.1_4_2021_PPD_dated_18.05.2023 or email IDs like smpcu1-purchase@shar.gov.in).

If any specific field is not found in the document, return "Not Specified" or "N/A" for that field.
Do not hallucinate. Extract exact text as appearing in the document.
`;

function withTimeout<T>(promise: Promise<T>, ms: number, errorMsg: string): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(`${errorMsg} (timeout of ${ms}ms reached)`)), ms)
    ),
  ]);
}

export async function POST(req: NextRequest) {
  try {
    // 1. IP Rate Limiting Security Check
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "127.0.0.1";
    if (checkRateLimit(ip)) {
      return NextResponse.json(
        {
          error:
            "Rate limit reached. To prevent exceeding API quotas, maximum 10 document requests per minute are allowed. Please wait 60 seconds.",
        },
        { status: 429 }
      );
    }

    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        { error: "GEMINI_API_KEY is not configured in server environment." },
        { status: 500 }
      );
    }

    if (!file) {
      return NextResponse.json(
        { error: "No document uploaded. Please upload a PDF file." },
        { status: 400 }
      );
    }

    // 2. File size validation (Max 20MB)
    if (file.size > MAX_FILE_SIZE_BYTES) {
      return NextResponse.json(
        { error: "File size exceeds the 20MB limit. Please upload a smaller document." },
        { status: 400 }
      );
    }

    // Convert PDF file to base64
    const arrayBuffer = await file.arrayBuffer();

    // 3. Magic bytes validation (Check %PDF-)
    const fileHeader = Buffer.from(arrayBuffer.slice(0, 5)).toString("ascii");
    if (fileHeader !== "%PDF-") {
      return NextResponse.json(
        { error: "Invalid file format. Only authentic PDF files are allowed." },
        { status: 400 }
      );
    }

    const base64Data = Buffer.from(arrayBuffer).toString("base64");
    const mimeType = "application/pdf";

    const ai = new GoogleGenAI({ apiKey });

    // Preferred model chain with fallback
    const preferredModel = process.env.GEMINI_MODEL || "gemini-3.5-flash-lite";
    const modelsToTry = Array.from(
      new Set([preferredModel, "gemini-3.5-flash-lite", "gemini-3.8-flash", "gemini-4-argon"])
    );

    let lastError: Error | null = null;
    let extractedData: GeMBidData | null = null;
    let usedModel = "";

    for (const model of modelsToTry) {
      try {
        console.log(`[Document Processor] ⏳ Processing with model: ${model}`);
        const startTime = Date.now();

        const generatePromise = ai.models.generateContent({
          model,
          contents: [
            {
              inlineData: {
                data: base64Data,
                mimeType,
              },
            },
            EXTRACTION_PROMPT,
          ],
          config: {
            responseMimeType: "application/json",
            responseJsonSchema: documentSchema,
            temperature: 0.1,
          },
        });

        const response = await withTimeout(
          generatePromise,
          25000,
          `Model ${model} took too long to respond`
        );

        if (response.text) {
          extractedData = JSON.parse(response.text) as GeMBidData;
          usedModel = model;
          console.log(`[Document Processor] ✅ Success with ${model} in ${Date.now() - startTime}ms`);
          break;
        }
      } catch (err: unknown) {
        const error = err as Error & { status?: number };
        console.warn(`[Document Processor] ⚠️ Model ${model} failed/timed out:`, error.message);
        lastError = error;

        if (error.status === 401 || error.status === 403 || error.message?.includes("API_KEY_INVALID")) {
          return NextResponse.json(
            { error: "Invalid API Key configured on server." },
            { status: 401 }
          );
        }
      }
    }

    if (!extractedData) {
      return NextResponse.json(
        {
          error:
            lastError?.message ||
            "Failed to extract fields from the document. Please try again.",
        },
        { status: 500 }
      );
    }

    // Dynamically extract all structured links (Page, Type, Title, URL) from the authentic PDF binary
    try {
      const binaryBuffer = Buffer.from(arrayBuffer);
      const structuredLinks = await extractStructuredLinksFromPdf(binaryBuffer);

      extractedData.extractedLinksList = structuredLinks;
      if (structuredLinks.length > 0) {
        extractedData.documentLinks = structuredLinks
          .map((l) => `[Page ${l.page}] ${l.type}: ${l.title} -> ${l.url}`)
          .join("\n");
      }
    } catch (linkErr) {
      console.warn("[PDF Link Extractor] Error extracting structured links:", linkErr);
    }

    return NextResponse.json({
      success: true,
      data: extractedData,
      modelUsed: usedModel,
      fileName: file.name,
      fileSize: file.size,
    });
  } catch (error: unknown) {
    const err = error as Error;
    console.error("[Document Processor API Error]", err);
    return NextResponse.json(
      { error: err.message || "An unexpected error occurred during document processing." },
      { status: 500 }
    );
  }
}
