import * as XLSX from "xlsx";
import { GeMBidData, BID_FIELD_DEFINITIONS } from "@/types/bid";

/**
 * Downloads data as a standard .xlsx Excel file
 */
export function exportToExcel(data: GeMBidData, fileName = "GeM_Bid_Extracted_Data.xlsx") {
  const rows = BID_FIELD_DEFINITIONS.map((field, index) => ({
    "S.No.": index + 1,
    "Field Name": field.label,
    "Hindi Translation": field.hindiLabel || "",
    "Category": field.category,
    "Extracted Value": data[field.key] || "N/A",
  }));

  const worksheet = XLSX.utils.json_to_sheet(rows);

  // Set column widths for readability
  worksheet["!cols"] = [
    { wch: 8 },  // S.No.
    { wch: 38 }, // Field Name
    { wch: 30 }, // Hindi
    { wch: 25 }, // Category
    { wch: 45 }, // Extracted Value
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Bid Details");

  XLSX.writeFile(workbook, fileName);
}

/**
 * Downloads data as a comma-separated values (.csv) file
 */
export function exportToCSV(data: GeMBidData, fileName = "GeM_Bid_Extracted_Data.csv") {
  const headers = ["S.No.", "Field Name", "Hindi Translation", "Category", "Extracted Value"];
  
  const csvRows = [
    headers.join(","),
    ...BID_FIELD_DEFINITIONS.map((field, index) => {
      const escapedValue = `"${(data[field.key] || "").replace(/"/g, '""')}"`;
      const escapedLabel = `"${field.label.replace(/"/g, '""')}"`;
      const escapedHindi = `"${(field.hindiLabel || "").replace(/"/g, '""')}"`;
      const escapedCat = `"${field.category.replace(/"/g, '""')}"`;
      return `${index + 1},${escapedLabel},${escapedHindi},${escapedCat},${escapedValue}`;
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
