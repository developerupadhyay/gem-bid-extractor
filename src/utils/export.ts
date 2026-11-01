import * as XLSX from "xlsx";
import { GeMBidData, BID_FIELD_DEFINITIONS } from "@/types/bid";

/**
 * Downloads data as a standard .xlsx Excel file with Field and Value columns
 */
export function exportToExcel(data: GeMBidData, fileName = "Extracted_Data.xlsx") {
  const rows: Array<{ Field: string; Value: string }> = [];

  // 1. Standard Fields (except documentLinks which we format with details)
  for (const field of BID_FIELD_DEFINITIONS) {
    if (field.key === "documentLinks") continue;
    const raw = data[field.key];
    rows.push({
      Field: field.label,
      Value: typeof raw === "string" ? raw : "N/A",
    });
  }

  // 2. Structured Document Links with Page, Type, and Title
  if (data.extractedLinksList && data.extractedLinksList.length > 0) {
    data.extractedLinksList.forEach((link, idx) => {
      rows.push({
        Field: `Link #${idx + 1} (Page ${link.page} - ${link.type}): ${link.title}`,
        Value: link.url,
      });
    });
  } else if (typeof data.documentLinks === "string") {
    rows.push({
      Field: "Document Links & Downloads",
      Value: data.documentLinks,
    });
  }

  const worksheet = XLSX.utils.json_to_sheet(rows);

  worksheet["!cols"] = [
    { wch: 55 },
    { wch: 65 },
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Data");

  XLSX.writeFile(workbook, fileName);
}

/**
 * Downloads data as a comma-separated values (.csv) file with Field and Value columns
 */
export function exportToCSV(data: GeMBidData, fileName = "Extracted_Data.csv") {
  const headers = ["Field", "Value"];
  const rows: Array<{ Field: string; Value: string }> = [];

  for (const field of BID_FIELD_DEFINITIONS) {
    if (field.key === "documentLinks") continue;
    const raw = data[field.key];
    rows.push({
      Field: field.label,
      Value: typeof raw === "string" ? raw : "N/A",
    });
  }

  if (data.extractedLinksList && data.extractedLinksList.length > 0) {
    data.extractedLinksList.forEach((link, idx) => {
      rows.push({
        Field: `Link #${idx + 1} (Page ${link.page} - ${link.type}): ${link.title}`,
        Value: link.url,
      });
    });
  } else if (typeof data.documentLinks === "string") {
    rows.push({
      Field: "Document Links & Downloads",
      Value: data.documentLinks,
    });
  }

  const csvRows = [
    headers.join(","),
    ...rows.map((row) => {
      const escapedLabel = `"${row.Field.replace(/"/g, '""')}"`;
      const escapedValue = `"${row.Value.replace(/"/g, '""')}"`;
      return `${escapedLabel},${escapedValue}`;
    }),
  ];

  const blob = new Blob([csvRows.join("\n")], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.setAttribute("href", url);
  link.setAttribute("download", fileName);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Downloads extracted URL links as an Excel (.xlsx) spreadsheet
 */
export function exportUrlLinksToExcel(
  links: Array<{ title: string; type: string; url: string; isDownloadable: boolean }>,
  fileName = "Webpage_Extracted_Links.xlsx"
) {
  const rows = links.map((item, idx) => ({
    Index: idx + 1,
    Title: item.title || "Link",
    Type: item.type,
    Downloadable: item.isDownloadable ? "Yes" : "No",
    URL: item.url,
  }));

  const worksheet = XLSX.utils.json_to_sheet(rows);
  worksheet["!cols"] = [
    { wch: 8 },
    { wch: 45 },
    { wch: 20 },
    { wch: 15 },
    { wch: 75 },
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Extracted Links");
  XLSX.writeFile(workbook, fileName);
}

/**
 * Downloads extracted URL links as a CSV file
 */
export function exportUrlLinksToCSV(
  links: Array<{ title: string; type: string; url: string; isDownloadable: boolean }>,
  fileName = "Webpage_Extracted_Links.csv"
) {
  const headers = ["Index", "Title", "Type", "Downloadable", "URL"];
  const csvRows = [
    headers.join(","),
    ...links.map((item, idx) => {
      const escapedTitle = `"${(item.title || "Link").replace(/"/g, '""')}"`;
      const escapedType = `"${item.type.replace(/"/g, '""')}"`;
      const downloadable = item.isDownloadable ? "Yes" : "No";
      const escapedUrl = `"${item.url.replace(/"/g, '""')}"`;
      return `${idx + 1},${escapedTitle},${escapedType},${downloadable},${escapedUrl}`;
    }),
  ];

  const blob = new Blob([csvRows.join("\n")], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.setAttribute("href", url);
  link.setAttribute("download", fileName);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
