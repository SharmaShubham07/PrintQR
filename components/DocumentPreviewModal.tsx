"use client";

import React, { useState, useEffect } from "react";
import { Order, OrderFileItem } from "@/lib/types";
import { getFileDownloadUrl } from "@/lib/browser-printer";
import { 
  X, 
  Printer, 
  Download, 
  ZoomIn, 
  ZoomOut, 
  RotateCw, 
  FileText, 
  ExternalLink,
  Eye,
  Loader2,
  AlertCircle
} from "lucide-react";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  file: OrderFileItem | null;
  order: Order | null;
  onPrint?: (file: OrderFileItem, order: Order) => void;
}

export default function DocumentPreviewModal({
  isOpen,
  onClose,
  file,
  order,
  onPrint,
}: Props) {
  const [resolvedUrl, setResolvedUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [zoom, setZoom] = useState<number>(100);
  const [rotation, setRotation] = useState<number>(0);
  const [loadError, setLoadError] = useState<boolean>(false);

  useEffect(() => {
    if (!isOpen || !file) {
      setResolvedUrl(null);
      setLoading(false);
      setZoom(100);
      setRotation(0);
      setLoadError(false);
      return;
    }

    setLoading(true);
    setLoadError(false);
    setZoom(100);
    setRotation(0);

    let isMounted = true;
    (async () => {
      try {
        const url = await getFileDownloadUrl(file, order?.id);
        if (isMounted) {
          if (url) {
            setResolvedUrl(url);
          } else {
            setLoadError(true);
          }
          setLoading(false);
        }
      } catch (err) {
        if (isMounted) {
          console.error("Preview URL resolution error:", err);
          setLoadError(true);
          setLoading(false);
        }
      }
    })();

    return () => {
      isMounted = false;
    };
  }, [isOpen, file, order?.id]);

  if (!isOpen || !file) return null;

  const fileName = file.file_name;
  const ext = fileName.split(".").pop()?.toLowerCase() || "";
  const isPdf = ext === "pdf" || file.file_type === "application/pdf";
  const isImage = ["jpg", "jpeg", "png", "webp", "gif", "svg", "bmp"].includes(ext) || file.file_type.startsWith("image/");

  const handleZoomIn = () => setZoom((prev) => Math.min(prev + 25, 250));
  const handleZoomOut = () => setZoom((prev) => Math.max(prev - 25, 50));
  const handleRotate = () => setRotation((prev) => (prev + 90) % 360);

  const formatBytes = (bytes: number) => {
    if (!bytes) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl w-full max-w-5xl h-[90vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden">
        {/* Modal Header */}
        <div className="px-3.5 sm:px-6 py-2.5 sm:py-4 border-b border-slate-200 flex items-center justify-between gap-3 bg-slate-50/70">
          <div className="flex items-center gap-3 min-w-0">
            <div className={`w-9 h-9 sm:w-10 sm:h-10 rounded-xl sm:rounded-2xl flex items-center justify-center shrink-0 ${
              isPdf ? "bg-rose-100 text-rose-600" : isImage ? "bg-cyan-100 text-cyan-600" : "bg-indigo-100 text-indigo-600"
            }`}>
              <FileText className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div className="min-w-0">
              <h3 className="font-bold text-slate-900 text-xs sm:text-base truncate max-w-[180px] sm:max-w-md">
                {fileName}
              </h3>
              <div className="flex items-center gap-1.5 sm:gap-2 text-[10px] sm:text-xs text-slate-500 font-medium flex-wrap">
                <span>{formatBytes(file.file_size)}</span>
                <span>•</span>
                <span className="capitalize">{file.page_count} {file.page_count === 1 ? "page" : "pages"}</span>
                <span>•</span>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                  file.color_mode === "color" 
                    ? "bg-amber-100 text-amber-800 border border-amber-200" 
                    : "bg-slate-200 text-slate-800"
                }`}>
                  {file.color_mode.toUpperCase()}
                </span>
                <span>•</span>
                <span>{file.copies} {file.copies === 1 ? "copy" : "copies"}</span>
                {order && (
                  <>
                    <span>•</span>
                    <span className="font-bold text-slate-900 bg-slate-200/80 px-2 py-0.5 rounded-md">
                      👤 {order.customer_name} (Token #{order.token_number || 1})
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {/* Image zoom & rotate controls */}
            {isImage && (
              <div className="hidden sm:flex items-center gap-1 bg-white border border-slate-200 rounded-xl p-1">
                <button
                  type="button"
                  onClick={handleZoomOut}
                  className="p-1.5 text-slate-500 hover:text-slate-900 rounded-lg hover:bg-slate-100"
                  title="Zoom Out"
                >
                  <ZoomOut className="w-4 h-4" />
                </button>
                <span className="text-[11px] font-semibold text-slate-600 px-1.5">{zoom}%</span>
                <button
                  type="button"
                  onClick={handleZoomIn}
                  className="p-1.5 text-slate-500 hover:text-slate-900 rounded-lg hover:bg-slate-100"
                  title="Zoom In"
                >
                  <ZoomIn className="w-4 h-4" />
                </button>
                <div className="h-4 w-px bg-slate-200 mx-1"></div>
                <button
                  type="button"
                  onClick={handleRotate}
                  className="p-1.5 text-slate-500 hover:text-slate-900 rounded-lg hover:bg-slate-100"
                  title="Rotate 90°"
                >
                  <RotateCw className="w-4 h-4" />
                </button>
              </div>
            )}

            {/* Print Document Button */}
            {onPrint && order && (
              <button
                type="button"
                onClick={() => onPrint(file, order)}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-slate-900 hover:bg-indigo-600 text-white rounded-xl text-xs font-bold transition shadow-xs"
                title={`Print file for ${order.customer_name}`}
              >
                <Printer className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Print for {order.customer_name}</span>
                <span className="sm:hidden">Print</span>
              </button>
            )}

            {/* Download Button */}
            {resolvedUrl && (
              <a
                href={resolvedUrl}
                download={fileName}
                target="_blank"
                rel="noreferrer"
                className="p-2 border border-slate-200 hover:bg-slate-100 text-slate-700 rounded-xl transition"
                title="Download file"
              >
                <Download className="w-4 h-4" />
              </a>
            )}

            {/* Close Button */}
            <button
              type="button"
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Body / Viewer */}
        <div className="flex-1 bg-slate-100/70 p-4 overflow-auto flex items-center justify-center relative">
          {loading && (
            <div className="flex flex-col items-center gap-3 text-slate-500">
              <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
              <p className="text-xs font-bold">Loading document preview...</p>
            </div>
          )}

          {!loading && loadError && (
            <div className="text-center p-8 bg-white border border-slate-200 rounded-2xl max-w-sm space-y-3">
              <div className="w-12 h-12 bg-rose-50 text-rose-500 rounded-2xl flex items-center justify-center mx-auto">
                <AlertCircle className="w-6 h-6" />
              </div>
              <h4 className="font-bold text-slate-800 text-sm">Preview Unavailable</h4>
              <p className="text-xs text-slate-500">
                This document is either stored locally or requires direct download. You can still print or download it directly.
              </p>
              {resolvedUrl && (
                <a
                  href={resolvedUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-600 text-white text-xs font-bold rounded-xl"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Open in New Tab</span>
                </a>
              )}
            </div>
          )}

          {!loading && !loadError && resolvedUrl && (
            <>
              {isPdf ? (
                <iframe
                  src={`${resolvedUrl}#toolbar=1&navpanes=0`}
                  title={fileName}
                  className="w-full h-full rounded-2xl border border-slate-200 bg-white shadow-xs"
                />
              ) : isImage ? (
                <div className="w-full h-full flex items-center justify-center overflow-auto p-4">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={resolvedUrl}
                    alt={fileName}
                    style={{
                      transform: `scale(${zoom / 100}) rotate(${rotation}deg)`,
                      transition: "transform 0.2s ease",
                      maxHeight: "100%",
                      maxWidth: "100%",
                      objectFit: "contain",
                    }}
                    className="rounded-xl shadow-lg border border-slate-200 bg-white"
                  />
                </div>
              ) : (
                <div className="text-center p-8 bg-white border border-slate-200 rounded-2xl max-w-sm space-y-3">
                  <FileText className="w-12 h-12 text-indigo-600 mx-auto" />
                  <h4 className="font-bold text-slate-800 text-sm">Office Document ({ext.toUpperCase()})</h4>
                  <p className="text-xs text-slate-500">
                    Direct in-browser preview is available for PDF and image formats. Click below to download or print.
                  </p>
                  <a
                    href={resolvedUrl}
                    download={fileName}
                    className="inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-600 text-white text-xs font-bold rounded-xl"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Download {fileName}</span>
                  </a>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
