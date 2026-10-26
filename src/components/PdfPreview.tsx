"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import { ZoomIn, ZoomOut, ChevronLeft, ChevronRight, Maximize2 } from "lucide-react";

interface PdfPreviewProps {
  file: File | null;
}

export default function PdfPreview({ file }: PdfPreviewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [numPages, setNumPages] = useState<number>(0);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [zoomMultiplier, setZoomMultiplier] = useState<number>(1.0);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [pdfDoc, setPdfDoc] = useState<any>(null); // eslint-disable-line @typescript-eslint/no-explicit-any

  // Load PDF document using PDF.js
  useEffect(() => {
    let isCancelled = false;

    async function loadPdf() {
      if (!file) {
        setPdfDoc(null);
        setNumPages(0);
        setCurrentPage(1);
        return;
      }

      setIsLoading(true);
      try {
        const pdfjs = await import("pdfjs-dist/build/pdf.mjs");
        if (typeof window !== "undefined") {
          pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";
        }

        const arrayBuffer = await file.arrayBuffer();
        const loadingTask = pdfjs.getDocument({
          data: arrayBuffer,
          cMapUrl: "https://unpkg.com/pdfjs-dist@4.10.38/cmaps/",
          cMapPacked: true,
        });

        const doc = await loadingTask.promise;
        if (!isCancelled) {
          setPdfDoc(doc);
          setNumPages(doc.numPages);
          setCurrentPage(1);
        }
      } catch (err) {
        console.error("Failed to load PDF:", err);
      } finally {
        if (!isCancelled) {
          setIsLoading(false);
        }
      }
    }

    loadPdf();

    return () => {
      isCancelled = true;
    };
  }, [file]);

  // Responsive render: Auto-fit width to container without cropping
  const renderPage = useCallback(
    async (pageNumber: number) => {
      if (!pdfDoc || !canvasRef.current || !containerRef.current) return;

      try {
        const page = await pdfDoc.getPage(pageNumber);
        const canvas = canvasRef.current;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        // Calculate available width of the container
        const availableWidth = Math.max(300, containerRef.current.clientWidth - 24);
        const unscaledViewport = page.getViewport({ scale: 1.0 });

        // Auto-fit scale factor to fit full page width
        const autoFitScale = (availableWidth / unscaledViewport.width) * zoomMultiplier;
        const viewport = page.getViewport({ scale: autoFitScale });

        // High DPI support for razor-sharp rendering on Retina / Mobile screens
        const outputScale = window.devicePixelRatio || 1;
        canvas.width = Math.floor(viewport.width * outputScale);
        canvas.height = Math.floor(viewport.height * outputScale);
        canvas.style.width = `${Math.floor(viewport.width)}px`;
        canvas.style.height = `${Math.floor(viewport.height)}px`;

        ctx.setTransform(outputScale, 0, 0, outputScale, 0, 0);

        const renderContext = {
          canvasContext: ctx,
          viewport: viewport,
        };

        await page.render(renderContext).promise;
      } catch (err) {
        console.error("Error rendering page:", err);
      }
    },
    [pdfDoc, zoomMultiplier]
  );

  // Re-render when page or zoom changes
  useEffect(() => {
    if (pdfDoc && currentPage > 0) {
      renderPage(currentPage);
    }
  }, [pdfDoc, currentPage, zoomMultiplier, renderPage]);

  // Auto-resize on window / panel resize
  useEffect(() => {
    if (!containerRef.current) return;

    const resizeObserver = new ResizeObserver(() => {
      if (pdfDoc && currentPage > 0) {
        renderPage(currentPage);
      }
    });

    resizeObserver.observe(containerRef.current);
    return () => resizeObserver.disconnect();
  }, [pdfDoc, currentPage, renderPage]);

  if (!file) {
    return (
      <div className="h-full min-h-[480px] bg-zinc-50 border border-zinc-200 rounded-xl flex flex-col items-center justify-center p-8 text-center text-zinc-400">
        <p className="text-sm">Upload a PDF to view preview</p>
      </div>
    );
  }

  return (
    <div className="w-full bg-white border border-zinc-200 rounded-xl shadow-xs flex flex-col overflow-hidden select-none">
      {/* Top Controls Toolbar */}
      <div className="flex items-center justify-between px-3 sm:px-4 py-2 bg-zinc-50 border-b border-zinc-200 text-xs text-zinc-700">
        {/* Pagination */}
        <div className="flex items-center gap-1 sm:gap-1.5">
          <button
            type="button"
            disabled={currentPage <= 1 || isLoading}
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            className="p-1 rounded hover:bg-zinc-200 disabled:opacity-40 disabled:hover:bg-transparent transition-colors cursor-pointer"
            title="Previous Page"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>

          <span className="font-medium tabular-nums text-xs px-1">
            Page {currentPage} of {numPages || 1}
          </span>

          <button
            type="button"
            disabled={currentPage >= numPages || isLoading}
            onClick={() => setCurrentPage((p) => Math.min(numPages, p + 1))}
            className="p-1 rounded hover:bg-zinc-200 disabled:opacity-40 disabled:hover:bg-transparent transition-colors cursor-pointer"
            title="Next Page"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>

        {/* Zoom & Auto-Fit Controls */}
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setZoomMultiplier((z) => Math.max(0.6, z - 0.15))}
            className="p-1 rounded hover:bg-zinc-200 transition-colors cursor-pointer"
            title="Zoom Out"
          >
            <ZoomOut className="h-3.5 w-3.5 text-zinc-600" />
          </button>

          <span className="text-[11px] font-medium text-zinc-600 tabular-nums px-1">
            {Math.round(zoomMultiplier * 100)}%
          </span>

          <button
            type="button"
            onClick={() => setZoomMultiplier((z) => Math.min(2.5, z + 0.15))}
            className="p-1 rounded hover:bg-zinc-200 transition-colors cursor-pointer"
            title="Zoom In"
          >
            <ZoomIn className="h-3.5 w-3.5 text-zinc-600" />
          </button>

          <button
            type="button"
            onClick={() => setZoomMultiplier(1.0)}
            className="flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-zinc-200/70 hover:bg-zinc-200 text-zinc-700 transition-colors ml-1 cursor-pointer"
            title="Fit to Full Width"
          >
            <Maximize2 className="h-3 w-3" />
            <span className="hidden sm:inline">Fit Width</span>
          </button>
        </div>
      </div>

      {/* Responsive Canvas Container with Auto-Fit */}
      <div
        ref={containerRef}
        className="w-full overflow-auto bg-zinc-100/70 p-2 sm:p-3 flex justify-center items-start min-h-[500px] max-h-[85vh]"
        onContextMenu={(e) => e.preventDefault()}
      >
        {isLoading ? (
          <div className="flex flex-col items-center justify-center h-64 gap-2 text-zinc-400">
            <div className="h-6 w-6 border-2 border-zinc-300 border-t-zinc-700 rounded-full animate-spin" />
            <span className="text-xs">Rendering full page...</span>
          </div>
        ) : (
          <div className="shadow-md rounded bg-white overflow-hidden border border-zinc-300 flex justify-center max-w-full">
            <canvas ref={canvasRef} className="block pointer-events-none" />
          </div>
        )}
      </div>
    </div>
  );
}
