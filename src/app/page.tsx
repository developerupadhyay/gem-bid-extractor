"use client";

import React, { useState, useRef } from "react";
import {
  FileText,
  UploadCloud,
  CheckCircle2,
  AlertCircle,
  Copy,
  Check,
  FileSpreadsheet,
  Download,
  RotateCcw,
  Sparkles,
  ExternalLink,
  Layers,
  Code2,
  Table as TableIcon,
  KeyRound,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { GeMBidData, BID_FIELD_DEFINITIONS } from "@/types/bid";
import { SAMPLE_BID_DATA } from "@/data/sampleBid";
import { exportToExcel, exportToCSV } from "@/utils/export";

export default function Home() {
  const [file, setFile] = useState<File | null>(null);
  const [apiKey, setApiKey] = useState<string>("");
  const [showKeyInput, setShowKeyInput] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [statusMessage, setStatusMessage] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<GeMBidData | null>(null);
  const [activeTab, setActiveTab] = useState<"table" | "cards" | "json">("table");
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [isCopiedAll, setIsCopiedAll] = useState<boolean>(false);
  const [searchTerm, setSearchTerm] = useState<string>("");

  const fileInputRef = useRef<HTMLInputElement>(null);

  // File drop handler
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

  // API Call to extract fields
  const handleExtract = async () => {
    if (!file) {
      setError("Please select or drop a PDF file first.");
      return;
    }

    setIsLoading(true);
    setError(null);
    setStatusMessage("Uploading document & parsing with Gemini Vision AI...");

    try {
      const formData = new FormData();
      formData.append("file", file);
      if (apiKey.trim()) {
        formData.append("apiKey", apiKey.trim());
      }

      const res = await fetch("/api/extract", {
        method: "POST",
        body: formData,
      });

      const result = await res.json();

      if (!res.ok || !result.success) {
        throw new Error(result.error || "Failed to extract bid details from PDF.");
      }

      setData(result.data);
      setStatusMessage(`Extracted successfully using ${result.modelUsed || "Gemini"}!`);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Something went wrong.";
      setError(message);
    } finally {
      setIsLoading(false);
    }
  };

  // Load sample demo data
  const handleLoadSample = () => {
    setData(SAMPLE_BID_DATA);
    setError(null);
    setStatusMessage("Loaded pre-extracted sample data from Satish Dhawan Space Centre Shar GeM Bid.");
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

  const handleCopyText = (text: string, keyId: string) => {
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

  const filteredFields = BID_FIELD_DEFINITIONS.filter(
    (f) =>
      f.label.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (f.hindiLabel && f.hindiLabel.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (data && data[f.key]?.toLowerCase().includes(searchTerm.toLowerCase())) ||
      f.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 antialiased flex flex-col font-sans">
      {/* Top Header */}
      <header className="border-b border-zinc-800 bg-zinc-900/80 backdrop-blur sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-blue-600/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
              <FileSpreadsheet className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-semibold text-base text-zinc-100 tracking-tight">
                  GeM Bid OCR Extractor
                </span>
                <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  AI-Powered
                </span>
              </div>
              <p className="text-xs text-zinc-400 leading-4">
                Google Gemini Vision 3.8 Flash • Structured PDF OCR
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowKeyInput(!showKeyInput)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-zinc-300 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700/60 transition-colors"
            >
              <KeyRound className="h-3.5 w-3.5 text-zinc-400" />
              <span>API Key Settings</span>
              {showKeyInput ? (
                <ChevronUp className="h-3 w-3 text-zinc-400" />
              ) : (
                <ChevronDown className="h-3 w-3 text-zinc-400" />
              )}
            </button>
            <a
              href="https://github.com/developerupadhyay/gem-bid-extractor"
              target="_blank"
              rel="noopener noreferrer"
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-zinc-300 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700/60 transition-colors"
            >
              <span>GitHub</span>
              <ExternalLink className="h-3 w-3 text-zinc-400" />
            </a>
          </div>
        </div>

        {/* Optional Custom Key Accordion */}
        {showKeyInput && (
          <div className="border-t border-zinc-800 bg-zinc-900 px-4 py-3 sm:px-6">
            <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div className="flex-1 max-w-xl w-full">
                <label className="block text-xs font-medium text-zinc-300 mb-1">
                  Custom Gemini API Key (Optional — default is loaded from .env.local):
                </label>
                <input
                  type="password"
                  placeholder="AIzaSy... (leave blank to use server environment key)"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs bg-zinc-950 border border-zinc-700 rounded-lg text-zinc-200 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono"
                />
              </div>
              <p className="text-xs text-zinc-400 max-w-sm">
                Get a free API key at{" "}
                <a
                  href="https://aistudio.google.com/"
                  target="_blank"
                  rel="noreferrer"
                  className="text-blue-400 underline hover:text-blue-300"
                >
                  aistudio.google.com
                </a>
                .
              </p>
            </div>
          </div>
        )}
      </header>

      {/* Main Content Area */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex-1 w-full space-y-8">
        {/* Hero Section */}
        <div className="text-center max-w-3xl mx-auto space-y-2">
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-zinc-50 [text-wrap:balance]">
            Extract Government e-Marketplace (GeM) Bid Data into Structured Tables
          </h1>
          <p className="text-sm text-zinc-400 [text-wrap:pretty]">
            Upload any GeM Tender/Bid PDF document. The AI analyzes all pages, extracts exact bid
            specifications, technical cable parameters, relaxations, and delivery information into an
            exportable spreadsheet.
          </p>
        </div>

        {/* Upload Zone Card */}
        <section className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 sm:p-8 shadow-xl">
          <div
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-xl p-8 sm:p-12 text-center cursor-pointer transition-all ${
              file
                ? "border-blue-500/50 bg-blue-500/[0.03]"
                : "border-zinc-700/80 hover:border-zinc-500 bg-zinc-950/40 hover:bg-zinc-950/70"
            }`}
          >
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept="application/pdf"
              className="hidden"
            />
            <div className="flex flex-col items-center gap-3">
              <div className="h-14 w-14 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center text-zinc-300 shadow-inner">
                {file ? (
                  <FileText className="h-7 w-7 text-blue-400 animate-pulse" />
                ) : (
                  <UploadCloud className="h-7 w-7 text-zinc-400" />
                )}
              </div>

              {file ? (
                <div>
                  <p className="text-base font-semibold text-zinc-100">{file.name}</p>
                  <p className="text-xs text-zinc-400 mt-1 tabular-nums">
                    {(file.size / (1024 * 1024)).toFixed(2)} MB • PDF Document ready for extraction
                  </p>
                  <p className="text-xs text-blue-400 mt-2 font-medium">
                    Click or drop another file to change
                  </p>
                </div>
              ) : (
                <div>
                  <p className="text-sm sm:text-base font-medium text-zinc-200">
                    Drag and drop your GeM Bid PDF here, or{" "}
                    <span className="text-blue-400 underline underline-offset-4">browse</span>
                  </p>
                  <p className="text-xs text-zinc-400 mt-1">
                    Supports single & multi-page GeM tender documents up to 25MB
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="mt-6 flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={handleExtract}
                disabled={isLoading || !file}
                className="flex items-center gap-2 px-6 py-2.5 rounded-xl font-medium text-sm text-white bg-blue-600 hover:bg-blue-500 active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-900 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-md shadow-blue-600/20"
              >
                {isLoading ? (
                  <>
                    <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Processing Document...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4 text-blue-200" />
                    <span>Extract 14 Fields with AI</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={handleLoadSample}
                disabled={isLoading}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium text-sm text-zinc-300 bg-zinc-800 hover:bg-zinc-700 active:scale-[0.98] border border-zinc-700/80 transition-colors"
              >
                <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                <span>Try Sample GeM Data</span>
              </button>
            </div>

            {(file || data) && (
              <button
                type="button"
                onClick={handleReset}
                disabled={isLoading}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-medium text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition-colors"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                <span>Reset</span>
              </button>
            )}
          </div>

          {/* Status / Error feedback */}
          {statusMessage && !error && (
            <div className="mt-4 p-3.5 rounded-xl bg-blue-950/40 border border-blue-800/40 text-blue-300 text-xs flex items-center gap-2.5">
              <CheckCircle2 className="h-4 w-4 flex-shrink-0 text-blue-400" />
              <span>{statusMessage}</span>
            </div>
          )}

          {error && (
            <div className="mt-4 p-3.5 rounded-xl bg-red-950/40 border border-red-800/40 text-red-300 text-xs flex items-start gap-2.5">
              <AlertCircle className="h-4 w-4 flex-shrink-0 text-red-400 mt-0.5" />
              <div>
                <span className="font-semibold">Extraction Error:</span> {error}
              </div>
            </div>
          )}
        </section>

        {/* Results Section */}
        {data && (
          <section className="space-y-6">
            {/* Top Quick Metric Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
                <span className="text-xs font-medium text-zinc-400 uppercase tracking-wider">
                  Bid Number
                </span>
                <div className="mt-1 flex items-center justify-between">
                  <span className="text-base font-semibold text-zinc-100 font-mono">
                    {data.bidNumber}
                  </span>
                  <button
                    onClick={() => handleCopyText(data.bidNumber, "card_bid")}
                    className="p-1 text-zinc-400 hover:text-zinc-100 rounded"
                    title="Copy Bid Number"
                  >
                    {copiedKey === "card_bid" ? (
                      <Check className="h-4 w-4 text-emerald-400" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>

              <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
                <span className="text-xs font-medium text-zinc-400 uppercase tracking-wider">
                  Bid End Date & Time
                </span>
                <div className="mt-1 text-base font-semibold text-zinc-100 tabular-nums">
                  {data.bidEndDateTime}
                </div>
              </div>

              <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
                <span className="text-xs font-medium text-zinc-400 uppercase tracking-wider">
                  Total Quantity
                </span>
                <div className="mt-1 text-base font-semibold text-zinc-100 tabular-nums">
                  {data.totalQuantity} units
                </div>
              </div>

              <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
                <span className="text-xs font-medium text-zinc-400 uppercase tracking-wider">
                  Procuring Office
                </span>
                <div className="mt-1 text-sm font-semibold text-zinc-100 truncate" title={data.officeName}>
                  {data.officeName}
                </div>
              </div>
            </div>

            {/* View Tabs & Export Toolbar */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-zinc-800 pb-4">
              {/* Tabs */}
              <div className="flex items-center gap-1 bg-zinc-900 p-1 rounded-xl border border-zinc-800">
                <button
                  type="button"
                  onClick={() => setActiveTab("table")}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                    activeTab === "table"
                      ? "bg-zinc-800 text-zinc-100 shadow"
                      : "text-zinc-400 hover:text-zinc-200"
                  }`}
                >
                  <TableIcon className="h-3.5 w-3.5" />
                  <span>Table View (14 Fields)</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab("cards")}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                    activeTab === "cards"
                      ? "bg-zinc-800 text-zinc-100 shadow"
                      : "text-zinc-400 hover:text-zinc-200"
                  }`}
                >
                  <Layers className="h-3.5 w-3.5" />
                  <span>Categorized Cards</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab("json")}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                    activeTab === "json"
                      ? "bg-zinc-800 text-zinc-100 shadow"
                      : "text-zinc-400 hover:text-zinc-200"
                  }`}
                >
                  <Code2 className="h-3.5 w-3.5" />
                  <span>Raw JSON</span>
                </button>
              </div>

              {/* Export Buttons */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => exportToExcel(data, `GeM_Bid_${data.bidNumber || "Data"}.xlsx`)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-emerald-600 hover:bg-emerald-500 text-white active:scale-[0.98] transition-colors shadow-sm"
                  title="Export to Microsoft Excel Spreadsheet"
                >
                  <Download className="h-3.5 w-3.5" />
                  <span>Export Excel (.xlsx)</span>
                </button>

                <button
                  type="button"
                  onClick={() => exportToCSV(data, `GeM_Bid_${data.bidNumber || "Data"}.csv`)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700 active:scale-[0.98] transition-colors"
                  title="Export as CSV table"
                >
                  <Download className="h-3.5 w-3.5" />
                  <span>Export CSV</span>
                </button>

                <button
                  type="button"
                  onClick={handleCopyJson}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700 active:scale-[0.98] transition-colors"
                >
                  {isCopiedAll ? (
                    <>
                      <Check className="h-3.5 w-3.5 text-emerald-400" />
                      <span>Copied JSON!</span>
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

            {/* TAB 1: Tabular View */}
            {activeTab === "table" && (
              <div className="space-y-4">
                {/* Search bar inside table view */}
                <div className="flex items-center justify-between">
                  <input
                    type="text"
                    placeholder="Search in extracted fields..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="max-w-xs w-full px-3 py-1.5 text-xs bg-zinc-900 border border-zinc-800 rounded-lg text-zinc-200 placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                  <span className="text-xs text-zinc-400">
                    Showing {filteredFields.length} of 14 fields
                  </span>
                </div>

                <div className="overflow-x-auto rounded-xl border border-zinc-800 bg-zinc-900/60 shadow-lg">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className="bg-zinc-900 text-zinc-400 font-semibold border-b border-zinc-800 uppercase tracking-wider">
                      <tr>
                        <th className="py-3 px-4 w-12 text-center">#</th>
                        <th className="py-3 px-4 w-1/4">Field Name</th>
                        <th className="py-3 px-4 w-1/5">Hindi Label</th>
                        <th className="py-3 px-4 w-28">Category</th>
                        <th className="py-3 px-4">Extracted Value</th>
                        <th className="py-3 px-3 w-16 text-center">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-800/80">
                      {filteredFields.map((field, idx) => {
                        const val = data[field.key] || "N/A";
                        return (
                          <tr
                            key={field.key}
                            className="hover:bg-zinc-800/40 transition-colors group"
                          >
                            <td className="py-3 px-4 text-center text-zinc-500 tabular-nums">
                              {idx + 1}
                            </td>
                            <td className="py-3 px-4 font-medium text-zinc-200">{field.label}</td>
                            <td className="py-3 px-4 text-zinc-400">{field.hindiLabel || "—"}</td>
                            <td className="py-3 px-4">
                              <span className="inline-block px-2 py-0.5 rounded text-[11px] font-medium bg-zinc-800 text-zinc-300 border border-zinc-700/50">
                                {field.category}
                              </span>
                            </td>
                            <td className="py-3 px-4 text-zinc-100 font-semibold">
                              <span className="bg-zinc-950/60 px-2 py-1 rounded border border-zinc-800/80 inline-block max-w-lg break-words">
                                {val}
                              </span>
                            </td>
                            <td className="py-3 px-3 text-center">
                              <button
                                type="button"
                                onClick={() => handleCopyText(val, field.key)}
                                className="p-1 rounded text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 transition-colors"
                                title="Copy value"
                              >
                                {copiedKey === field.key ? (
                                  <Check className="h-3.5 w-3.5 text-emerald-400" />
                                ) : (
                                  <Copy className="h-3.5 w-3.5" />
                                )}
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* TAB 2: Categorized Cards View */}
            {activeTab === "cards" && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {(
                  [
                    "Overview",
                    "Relaxations",
                    "Technical Specifications",
                    "Consignee & Delivery",
                  ] as const
                ).map((category) => {
                  const fieldsInCat = BID_FIELD_DEFINITIONS.filter(
                    (f) => f.category === category
                  );
                  return (
                    <div
                      key={category}
                      className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 space-y-4"
                    >
                      <div className="flex items-center justify-between border-b border-zinc-800 pb-2.5">
                        <h2 className="text-sm font-semibold text-zinc-200 tracking-wide uppercase">
                          {category}
                        </h2>
                        <span className="text-xs text-zinc-400 font-mono">
                          {fieldsInCat.length} fields
                        </span>
                      </div>

                      <div className="space-y-3">
                        {fieldsInCat.map((field) => (
                          <div
                            key={field.key}
                            className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 p-2.5 rounded-lg bg-zinc-950/50 border border-zinc-800/60"
                          >
                            <div>
                              <p className="text-xs font-medium text-zinc-400">
                                {field.label}
                                {field.hindiLabel && (
                                  <span className="text-zinc-400 text-[11px] ml-1.5">
                                    ({field.hindiLabel})
                                  </span>
                                )}
                              </p>
                              <p className="text-xs font-semibold text-zinc-100 mt-0.5 break-words">
                                {data[field.key] || "N/A"}
                              </p>
                            </div>
                            <button
                              type="button"
                              onClick={() => handleCopyText(data[field.key], field.key)}
                              className="self-end sm:self-center p-1 text-zinc-400 hover:text-zinc-200"
                              title="Copy"
                            >
                              {copiedKey === field.key ? (
                                <Check className="h-3.5 w-3.5 text-emerald-400" />
                              ) : (
                                <Copy className="h-3.5 w-3.5" />
                              )}
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* TAB 3: JSON Output View */}
            {activeTab === "json" && (
              <div className="relative rounded-xl border border-zinc-800 bg-zinc-950 p-4 font-mono text-xs overflow-x-auto">
                <button
                  type="button"
                  onClick={handleCopyJson}
                  className="absolute top-3 right-3 px-3 py-1 rounded bg-zinc-800 text-zinc-300 hover:bg-zinc-700 text-xs flex items-center gap-1.5 transition-colors"
                >
                  {isCopiedAll ? (
                    <>
                      <Check className="h-3 w-3 text-emerald-400" />
                      <span>Copied</span>
                    </>
                  ) : (
                    <>
                      <Copy className="h-3 w-3" />
                      <span>Copy JSON</span>
                    </>
                  )}
                </button>
                <pre className="text-emerald-400">
                  {JSON.stringify(data, null, 2)}
                </pre>
              </div>
            )}
          </section>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-zinc-800 bg-zinc-900/60 py-6 mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-zinc-500">
          <p>© 2026 GeM Bid OCR Extractor • Built with Next.js, Google Gemini & Vercel</p>
          <div className="flex items-center gap-4">
            <span>Model: Gemini 3.8 Flash</span>
            <span>•</span>
            <a
              href="https://github.com/developerupadhyay/gem-bid-extractor"
              target="_blank"
              rel="noreferrer"
              className="text-zinc-400 hover:text-zinc-300 underline"
            >
              developerupadhyay/gem-bid-extractor
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
