import { NextRequest, NextResponse } from "next/server";
import { GoogleGenAI, Type } from "@google/genai";
import { GeMBidData } from "@/types/bid";

// Vercel Serverless Function settings
export const maxDuration = 60; // 60 seconds timeout

// JSON Schema definition for Google GenAI structured output
const gemBidSchema = {
  type: Type.OBJECT,
  properties: {
    bidNumber: {
      type: Type.STRING,
      description: "Bid Number / बिड संख्या (e.g. GEM/2025/B/6990980)",
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
  ],
};

const EXTRACTION_PROMPT = `
You are an expert Government e-Marketplace (GeM) Bid Document Analyzer.
Analyze the provided GeM Bid PDF document thoroughly across all pages and extract the following 14 specific fields accurately:

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

If any specific field is not found in the document, return "Not Specified" or "N/A" for that field.
Do not hallucinate. Extract exact text as appearing in the document.
`;

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const userApiKey = (formData.get("apiKey") as string | null)?.trim();

    const apiKey = userApiKey || process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        {
          error:
            "Gemini API Key missing. Please provide it in the header/form or set GEMINI_API_KEY in .env.local",
        },
        { status: 400 }
      );
    }

    if (!file) {
      return NextResponse.json(
        { error: "No PDF document uploaded. Please upload a GeM Bid PDF file." },
        { status: 400 }
      );
    }

    // Convert PDF file to base64
    const arrayBuffer = await file.arrayBuffer();
    const base64Data = Buffer.from(arrayBuffer).toString("base64");
    const mimeType = file.type || "application/pdf";

    const ai = new GoogleGenAI({ apiKey });

    // Fallback models chain: user-preference -> gemini-3.8-flash -> gemini-3.5-flash-lite
    const preferredModel = process.env.GEMINI_MODEL || "gemini-3.8-flash";
    const modelsToTry = Array.from(
      new Set([preferredModel, "gemini-3.8-flash", "gemini-3.5-flash-lite", "gemini-4-argon"])
    );

    let lastError: Error | null = null;
    let extractedData: GeMBidData | null = null;
    let usedModel = "";

    for (const model of modelsToTry) {
      try {
        console.log(`[Gemini OCR] Attempting extraction with model: ${model}`);
        const response = await ai.models.generateContent({
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
            responseJsonSchema: gemBidSchema,
            temperature: 0.1, // Low temperature for high precision OCR extraction
          },
        });

        if (response.text) {
          extractedData = JSON.parse(response.text) as GeMBidData;
          usedModel = model;
          break;
        }
      } catch (err: unknown) {
        const error = err as Error & { status?: number };
        console.warn(`[Gemini OCR] Model ${model} encountered error:`, error.message);
        lastError = error;

        // If it's a 503 (high demand) or 404, we continue to the next fallback model
        if (error.status === 503 || error.status === 404 || error.message?.includes("demand")) {
          continue;
        }
        // If it's an authentication error (401/403), no need to try other models
        if (error.status === 401 || error.status === 403 || error.message?.includes("API_KEY_INVALID")) {
          return NextResponse.json(
            { error: "Invalid Gemini API Key. Please verify your API Key." },
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
            "Failed to extract fields from the PDF. All fallback models failed.",
        },
        { status: 500 }
      );
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
    console.error("[Gemini OCR API Error]", err);
    return NextResponse.json(
      { error: err.message || "An unexpected error occurred during document processing." },
      { status: 500 }
    );
  }
}
