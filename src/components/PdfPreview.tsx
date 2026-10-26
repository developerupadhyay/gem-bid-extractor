"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import { ZoomIn, ZoomOut, ChevronLeft, ChevronRight, Maximize2, RotateCw } from "lucide-react";

interface PdfPreviewProps {
  file: File | null;
}

interface ClickableOverlayLink {
  left: number;
  top: number;
  width: number;
  height: number;
  url: string;
}

export default function PdfPreview({ file }: PdfPreviewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const renderTaskRef = useRef<any>(null); // eslint-disable-line @typescript-eslint/no-explicit-any

  const [numPages, setNumPages] = useState<number>(0);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [zoomMultiplier, setZoomMultiplier] = useState<number>(1.0);
  const [rotation, setRotation] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [pdfDoc, setPdfDoc] = useState<any>(null); // eslint-disable-line @typescript-eslint/no-explicit-any
  const [pageLinks, setPageLinks] = useState<ClickableOverlayLink[]>([]);

  // Load PDF document using PDF.js
  useEffect(() => {
    let isCancelled = false;

    async function loadPdf() {
      if (!file) {
        setPdfDoc(null);
        setNumPages(0);
        setCurrentPage(1);
        setRotation(0);
        setPageLinks([]);
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
          setRotation(0);
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
      if (renderTaskRef.current) {
        try {
          renderTaskRef.current.cancel();
        } catch {}
      }
    };
  }, [file]);

  // Responsive render: Auto-fit width + Interactive Clickable Link Overlays
  const renderPage = useCallback(
    async (pageNumber: number) => {
      if (!pdfDoc || !canvasRef.current || !containerRef.current) return;

      if (renderTaskRef.current) {
        try {
          renderTaskRef.current.cancel();
          await renderTaskRef.current.promise.catch(() => {});
        } catch {}
        renderTaskRef.current = null;
      }

      try {
        const page = await pdfDoc.getPage(pageNumber);
        const canvas = canvasRef.current;
        const ctx = canvas.getContext("2d", { willReadFrequently: false });
        if (!ctx) return;

        ctx.resetTransform();

        const availableWidth = Math.max(300, containerRef.current.clientWidth - 28);
        const effectiveRotation = ((page.rotate || 0) + rotation) % 360;
        const unscaledViewport = page.getViewport({ scale: 1.0, rotation: effectiveRotation });

        const autoFitScale = (availableWidth / unscaledViewport.width) * zoomMultiplier;
        const viewport = page.getViewport({ scale: autoFitScale, rotation: effectiveRotation });

        const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
        canvas.width = Math.floor(viewport.width * pixelRatio);
        canvas.height = Math.floor(viewport.height * pixelRatio);

        canvas.style.width = `${Math.floor(viewport.width)}px`;
        canvas.style.height = `${Math.floor(viewport.height)}px`;

        ctx.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
        ctx.clearRect(0, 0, viewport.width, viewport.height);

        const renderContext = {
          canvasContext: ctx,
          viewport: viewport,
        };

        const currentTask = page.render(renderContext);
        renderTaskRef.current = currentTask;

        await currentTask.promise;

        // Extract and position clickable link annotations directly over the canvas
        const annotations = await page.getAnnotations();
        const activeLinks: ClickableOverlayLink[] = [];

        for (const annot of annotations) {
          const targetUrl = annot.url || annot.unsafeUrl;
          if (annot.subtype === "Link" && targetUrl && annot.rect) {
            try {
              const [x1, y1, x2, y2] = viewport.convertToViewportRectangle(annot.rect);
              const left = Math.min(x1, x2);
              const top = Math.min(y1, y2);
              const width = Math.abs(x2 - x1);
              const height = Math.abs(y2 - y1);

              activeLinks.push({
                left,
                top,
                width,
                height,
                url: targetUrl,
              });
            } catch {}
          }
        }

        setPageLinks(activeLinks);
      } catch (err: any) { // eslint-disable-line @typescript-eslint/no-explicit-any
        if (err?.name !== "RenderingCancelledException") {
          console.error("Error rendering page:", err);
        }
      }
    },
    [pdfDoc, zoomMultiplier, rotation]
  );

  useEffect(() => {
    if (pdfDoc && currentPage > 0) {
      renderPage(currentPage);
    }
  }, [pdfDoc, currentPage, zoomMultiplier, rotation, renderPage]);

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

  const handleRotate = () => {
    setRotation((r) => (r + 90) % 360);
  };

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

        {/* Zoom, Rotate & Auto-Fit Controls */}
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={handleRotate}
            className="flex items-center gap-1 p-1 px-1.5 rounded hover:bg-zinc-200 text-zinc-700 transition-colors cursor-pointer"
            title="Rotate Page 90°"
          >
            <RotateCw className="h-3.5 w-3.5" />
            {rotation > 0 && <span className="text-[10px] font-mono">{rotation}°</span>}
          </button>

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

      {/* Responsive Canvas Container with Interactive Clickable Links */}
      <div
        ref={containerRef}
        className="w-full overflow-auto bg-zinc-100/70 p-2 sm:p-3 flex justify-center items-start min-h-[500px] max-h-[85vh]"
      >
        {isLoading ? (
          <div className="flex flex-col items-center justify-center h-64 gap-2 text-zinc-400">
            <div className="h-6 w-6 border-2 border-zinc-300 border-t-zinc-700 rounded-full animate-spin" />
            <span className="text-xs">Rendering page...</span>
          </div>
        ) : (
          <div className="relative shadow-md rounded bg-white overflow-hidden border border-zinc-300 w-fit h-fit select-none">
            <canvas ref={canvasRef} className="block pointer-events-none" />

            {/* Clickable Link Overlays directly on PDF page buttons like "View File" */}
            {pageLinks.map((link, idx) => (
              <a
                key={idx}
                href={link.url}
                target="_blank"
                rel="noopener noreferrer"
                className="absolute z-20 cursor-pointer bg-blue-500/15 hover:bg-blue-600/30 border border-blue-500/40 hover:border-blue-600 rounded-xs transition-colors"
                style={{
                  left: `${link.left}px`,
                  top: `${link.top}px`,
                  width: `${link.width}px`,
                  height: `${link.height}px`,
                }}
                title={`Click to open/download: ${link.url}`}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
