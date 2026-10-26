"use client";

import React, { useState, useRef } from "react";
import {
  FileText,
  UploadCloud,
  CheckCircle2,
  AlertCircle,
  Copy,
  Check,
  Download,
  RotateCcw,
  Sparkles,
  ExternalLink,
  Mail,
  FileDown,
  LogOut,
} from "lucide-react";
import { GeMBidData, BID_FIELD_DEFINITIONS } from "@/types/bid";
import { exportToExcel, exportToCSV } from "@/utils/export";

export default function Home() {
  const [file, setFile] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [statusMessage, setStatusMessage] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<GeMBidData | null>(null);
  const [isCopiedAll, setIsCopiedAll] = useState<boolean>(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState<string>("");

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const droppedFile = e.dataTransfer.files[0];
      if (droppedFile.type === "application/pdf" || droppedFile.name.endsWith(".pdf")) {
        setFile(droppedFile);
        setError(null);
      } else {
        setError("Please upload a valid PDF document.");
      }
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setError(null);
    }
  };

  const handleExtract = async () => {
    if (!file) {
      setError("Please select or drop a PDF file first.");
      return;
    }

    setIsLoading(true);
    setError(null);
    setStatusMessage("Processing document & extracting fields...");

    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/extract", {
        method: "POST",
        body: formData,
      });

      const result = await res.json();

      if (!res.ok || !result.success) {
        throw new Error(result.error || "Failed to process document.");
      }

      setData(result.data);
      setStatusMessage("Document processed successfully.");
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Something went wrong.";
      setError(message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleReset = () => {
    setFile(null);
    setData(null);
    setError(null);
    setStatusMessage("");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.href = "/login";
  };

  const handleCopyValue = (text: string, keyId: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(keyId);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleCopyJson = () => {
    if (!data) return;
    navigator.clipboard.writeText(JSON.stringify(data, null, 2));
    setIsCopiedAll(true);
    setTimeout(() => setIsCopiedAll(false), 2000);
  };

  const renderValueContent = (val: string) => {
    if (!val || val === "N/A" || val === "None" || val === "Not Specified") {
      return <span className="text-zinc-400 italic">{val || "N/A"}</span>;
    }

    const tokenRegex = /(https?:\/\/[^\s,;]+|mailto:[^\s,;]+|[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/gi;
    const tokens = val.split(tokenRegex);

    if (tokens.length === 1 && !val.match(tokenRegex)) {
      return <span>{val}</span>;
    }

    return (
      <div className="flex flex-wrap items-center gap-2">
        {tokens.map((part, index) => {
          if (!part) return null;

          if (part.match(/^https?:\/\//i)) {
            const isDownloadable =
              /\.(pdf|docx?|xlsx?|csv|zip|rar|tar)(\?.*)?$/i.test(part) ||
              /download|export|attachment/i.test(part);

            return (
              <a
                key={index}
                href={part}
                target="_blank"
                rel="noopener noreferrer"
                download={isDownloadable ? true : undefined}
                onClick={(e) => e.stopPropagation()}
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-medium transition-colors ${
                  isDownloadable
                    ? "bg-blue-600 hover:bg-blue-700 text-white shadow-xs"
                    : "bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200"
                }`}
                title={isDownloadable ? "Download Document" : "Open URL"}
              >
                {isDownloadable ? (
                  <>
                    <FileDown className="h-3.5 w-3.5 text-white" />
                    <span>Download Document</span>
                  </>
                ) : (
                  <>
                    <ExternalLink className="h-3.5 w-3.5" />
                    <span className="truncate max-w-xs">{part}</span>
                  </>
                )}
              </a>
            );
          }

          if (part.match(/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/i) || part.startsWith("mailto:")) {
            const email = part.replace(/^mailto:/i, "");
            return (
              <a
                key={index}
                href={`mailto:${email}`}
                onClick={(e) => e.stopPropagation()}
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs bg-zinc-100 hover:bg-zinc-200 text-zinc-800 border border-zinc-200 transition-colors"
                title="Send Email"
              >
                <Mail className="h-3 w-3 text-zinc-600" />
                <span>{email}</span>
              </a>
            );
          }

          return <span key={index}>{part}</span>;
        })}
      </div>
    );
  };

  const filteredFields = BID_FIELD_DEFINITIONS.filter(
    (f) =>
      f.label.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (data && data[f.key]?.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <main className="min-h-screen bg-zinc-50 text-zinc-900 flex flex-col items-center justify-start py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl w-full space-y-5">
        {/* Top utility row with Sign Out */}
        <div className="flex justify-end">
          <button
            type="button"
            onClick={handleLogout}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-zinc-500 hover:text-zinc-800 hover:bg-zinc-200/60 transition-colors"
          >
            <LogOut className="h-3.5 w-3.5" />
            <span>Sign Out</span>
          </button>
        </div>

        {/* Upload Card */}
        <section className="bg-white border border-zinc-200 rounded-xl p-6 shadow-sm space-y-5">
          <div
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-lg p-8 sm:p-10 text-center cursor-pointer transition-colors ${
              file
                ? "border-blue-500 bg-blue-50/40"
                : "border-zinc-300 hover:border-zinc-400 bg-zinc-50/60"
            }`}
          >
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept="application/pdf"
              className="hidden"
            />
            <div className="flex flex-col items-center gap-2.5">
              <div className="h-12 w-12 rounded-full bg-zinc-100 flex items-center justify-center text-zinc-500">
                {file ? (
                  <FileText className="h-6 w-6 text-blue-600" />
                ) : (
                  <UploadCloud className="h-6 w-6 text-zinc-500" />
                )}
              </div>

              {file ? (
                <div>
                  <p className="text-sm font-semibold text-zinc-800">{file.name}</p>
                  <p className="text-xs text-zinc-500 mt-0.5 tabular-nums">
                    {(file.size / (1024 * 1024)).toFixed(2)} MB • PDF selected
                  </p>
                </div>
              ) : (
                <div>
                  <p className="text-sm font-medium text-zinc-700">
                    Drop PDF file here, or <span className="text-blue-600 underline">browse</span>
                  </p>
                  <p className="text-xs text-zinc-500 mt-1">Supports PDF files up to 20MB</p>
                </div>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-between gap-4">
            <button
              type="button"
              onClick={handleExtract}
              disabled={isLoading || !file}
              className="flex items-center justify-center gap-2 px-6 py-2.5 rounded-lg text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm"
            >
              {isLoading ? (
                <>
                  <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Processing...</span>
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4" />
                  <span>Process File</span>
                </>
              )}
            </button>

            {(file || data) && (
              <button
                type="button"
                onClick={handleReset}
                disabled={isLoading}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100 transition-colors"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                <span>Reset</span>
              </button>
            )}
          </div>

          {/* Status / Error messages */}
          {statusMessage && !error && (
            <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 flex-shrink-0 text-emerald-600" />
              <span>{statusMessage}</span>
            </div>
          )}

          {error && (
            <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-800 text-xs flex items-start gap-2">
              <AlertCircle className="h-4 w-4 flex-shrink-0 text-red-600 mt-0.5" />
              <span>{error}</span>
            </div>
          )}
        </section>

        {/* Results Section */}
        {data && (
          <section className="bg-white border border-zinc-200 rounded-xl p-6 shadow-sm space-y-4">
            {/* Toolbar */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 border-b border-zinc-200">
              <input
                type="text"
                placeholder="Filter fields..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="max-w-xs w-full px-3 py-1.5 text-xs bg-zinc-50 border border-zinc-300 rounded-lg text-zinc-800 placeholder-zinc-400 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => exportToExcel(data, "Extracted_Data.xlsx")}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-emerald-600 hover:bg-emerald-700 text-white transition-colors shadow-sm"
                >
                  <Download className="h-3.5 w-3.5" />
                  <span>Export Excel</span>
                </button>

                <button
                  type="button"
                  onClick={() => exportToCSV(data, "Extracted_Data.csv")}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-white border border-zinc-300 text-zinc-700 hover:bg-zinc-50 transition-colors"
                >
                  <Download className="h-3.5 w-3.5" />
                  <span>Export CSV</span>
                </button>

                <button
                  type="button"
                  onClick={handleCopyJson}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-white border border-zinc-300 text-zinc-700 hover:bg-zinc-50 transition-colors"
                >
                  {isCopiedAll ? (
                    <>
                      <Check className="h-3.5 w-3.5 text-emerald-600" />
                      <span>Copied</span>
                    </>
                  ) : (
                    <>
                      <Copy className="h-3.5 w-3.5" />
                      <span>Copy All</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Clean 2-Column Table: Field & Value */}
            <div className="overflow-x-auto rounded-lg border border-zinc-200">
              <table className="w-full text-left text-xs sm:text-sm border-collapse">
                <thead className="bg-zinc-50 text-zinc-600 font-semibold border-b border-zinc-200 uppercase tracking-wider text-xs">
                  <tr>
                    <th className="py-3 px-4 w-2/5">Field</th>
                    <th className="py-3 px-4">Value</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-200">
                  {filteredFields.map((field) => {
                    const val = data[field.key] || "N/A";
                    return (
                      <tr
                        key={field.key}
                        onClick={() => handleCopyValue(val, field.key)}
                        className="hover:bg-zinc-50 transition-colors cursor-pointer group"
                        title="Click row to copy value"
                      >
                        <td className="py-3.5 px-4 font-medium text-zinc-700 align-top">
                          {field.label}
                        </td>
                        <td className="py-3.5 px-4 font-medium text-zinc-900 break-words align-top">
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex-1">
                              {renderValueContent(val)}
                            </div>
                            <span className="opacity-0 group-hover:opacity-100 transition-opacity text-zinc-400 mt-0.5">
                              {copiedKey === field.key ? (
                                <Check className="h-3.5 w-3.5 text-emerald-600" />
                              ) : (
                                <Copy className="h-3.5 w-3.5" />
                              )}
                            </span>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>
        )}
      </div>
    </main>
  );
}
