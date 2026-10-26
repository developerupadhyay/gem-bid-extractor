import { DocumentLinkItem } from "@/types/bid";

interface TextItemLoc {
  text: string;
  x: number;
  y: number;
}

/**
 * Dynamically extracts all hyperlinks, "View File" targets, and document download
 * links with their Page Number, Document Type, and Context/Title directly from the PDF.
 * ZERO hardcoded URLs or labels.
 */
export async function extractStructuredLinksFromPdf(
  buffer: Buffer
): Promise<DocumentLinkItem[]> {
  const structuredLinks: DocumentLinkItem[] = [];
  const seenUrls = new Set<string>();

  try {
    const pdfjs = await import("pdfjs-dist/build/pdf.mjs");
    const doc = await pdfjs.getDocument({
      data: new Uint8Array(buffer),
      isEvalSupported: false,
      useSystemFonts: true,
    }).promise;

    for (let pageNum = 1; pageNum <= doc.numPages; pageNum++) {
      try {
        const page = await doc.getPage(pageNum);
        const [annots, textContent] = await Promise.all([
          page.getAnnotations(),
          page.getTextContent(),
        ]);

        const textItems: TextItemLoc[] = textContent.items
          .filter((item: any) => typeof item.str === "string" && item.str.trim().length > 0) // eslint-disable-line @typescript-eslint/no-explicit-any
          .map((item: any) => ({ // eslint-disable-line @typescript-eslint/no-explicit-any
            text: item.str.trim(),
            x: item.transform[4] as number,
            y: item.transform[5] as number,
          }));

        // Find primary page title / item name (highest text block near top)
        const sortedByYDesc = [...textItems].sort((a, b) => b.y - a.y);
        const topHeader =
          sortedByYDesc.find(
            (t) =>
              t.y > 600 &&
              !t.text.includes("Bid Details") &&
              !t.text.includes("Technical Specifications") &&
              !t.text.includes("Consignees")
          )?.text || `Page ${pageNum}`;

        for (const annot of annots) {
          if (annot.subtype === "Link" && annot.url && isValidHttpUrl(annot.url)) {
            const url = annot.url.trim();

            const [, y1, , y2] = annot.rect || [0, 0, 0, 0];
            const annotY = (y1 + y2) / 2;

            // 1. Find text on the same horizontal row as the link (e.g. "Specification Document" or "BOQ Detail Document")
            const rowItems = textItems
              .filter(
                (t: TextItemLoc) =>
                  Math.abs(t.y - annotY) < 22 &&
                  !t.text.toLowerCase().includes("view file") &&
                  !t.text.toLowerCase().includes("click here")
              )
              .sort((a: TextItemLoc, b: TextItemLoc) => a.x - b.x);

            const rowType = rowItems.map((t: TextItemLoc) => t.text).join(" ").trim();

            // 2. Find context heading above this link
            const itemsAbove = textItems
              .filter(
                (t: TextItemLoc) =>
                  t.y > annotY + 20 &&
                  !t.text.includes("Technical Specifications") &&
                  !t.text.includes("View File")
              )
              .sort((a: TextItemLoc, b: TextItemLoc) => a.y - b.y);

            const contextTitle =
              itemsAbove.length > 0 ? itemsAbove[0].text : topHeader;

            const isDownloadable =
              /\.(pdf|docx?|xlsx?|csv|zip|rar)(\?.*)?$/i.test(url) ||
              /download|showbid|document|file|boq|spec/i.test(url);

            const linkKey = `${pageNum}:${url}`;
            if (!seenUrls.has(linkKey)) {
              seenUrls.add(linkKey);
              structuredLinks.push({
                page: pageNum,
                type: rowType || "Document Link",
                title: contextTitle || "Tender Document",
                url,
                isDownloadable,
              });
            }
          }
        }
      } catch (pageErr) {
        console.warn(`[PDF Link Extractor] Could not parse page ${pageNum}:`, pageErr);
      }
    }
  } catch (err) {
    console.warn("[PDF Link Extractor] PDF.js structured extraction failed, falling back to binary scan:", err);
  }

  // Fallback: If no structured links were discovered via PDF.js, scan raw binary buffer
  if (structuredLinks.length === 0) {
    const rawUrls = extractFallbackUrlsFromBuffer(buffer);
    for (const url of rawUrls) {
      if (!seenUrls.has(url)) {
        seenUrls.add(url);
        const isDownloadable =
          /\.(pdf|docx?|xlsx?|csv|zip|rar)(\?.*)?$/i.test(url) ||
          /download|showbid|document|file|boq/i.test(url);

        structuredLinks.push({
          page: 1,
          type: "Document Link",
          title: "Attached Reference",
          url,
          isDownloadable,
        });
      }
    }
  }

  return structuredLinks;
}

function extractFallbackUrlsFromBuffer(buffer: Buffer): string[] {
  const binaryString = buffer.toString("latin1");
  const extractedUrls = new Set<string>();

  const uriActionRegex = /\/URI\s*\(((?:\\\(|\\\)|[^)])+)\)/gi;
  let match: RegExpExecArray | null;

  while ((match = uriActionRegex.exec(binaryString)) !== null) {
    const rawUrl = match[1].replace(/\\\(/g, "(").replace(/\\\)/g, ")").trim();
    if (isValidHttpUrl(rawUrl)) {
      extractedUrls.add(rawUrl);
    }
  }

  return Array.from(extractedUrls);
}

function isValidHttpUrl(candidate: string): boolean {
  if (!candidate || candidate.length < 8) return false;
  try {
    const parsed = new URL(candidate);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}
