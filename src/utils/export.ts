import * as XLSX from "xlsx";
import { GeMBidData, BID_FIELD_DEFINITIONS } from "@/types/bid";

/**
 * Downloads data as a standard .xlsx Excel file with Field and Value columns
 */
export function exportToExcel(data: GeMBidData, fileName = "Extracted_Data.xlsx") {
  const rows = BID_FIELD_DEFINITIONS.map((field) => ({
    "Field": field.label,
    "Value": data[field.key] || "N/A",
  }));

  const worksheet = XLSX.utils.json_to_sheet(rows);

  worksheet["!cols"] = [
    { wch: 45 },
    { wch: 55 },
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
  
  const csvRows = [
    headers.join(","),
    ...BID_FIELD_DEFINITIONS.map((field) => {
      const escapedLabel = `"${field.label.replace(/"/g, '""')}"`;
      const escapedValue = `"${(data[field.key] || "").replace(/"/g, '""')}"`;
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
