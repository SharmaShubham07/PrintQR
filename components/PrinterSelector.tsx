"use client";

import React from "react";
import { ColorMode, Printer } from "@/lib/types";
import { Printer as PrinterIcon, Check, Sparkles, RefreshCw } from "lucide-react";

interface Props {
  selectedPrinterId?: string;
  colorMode: ColorMode;
  onSelectPrinter: (printerId: string, targetColorMode?: ColorMode) => void;
  printers?: Printer[];
  onRefresh?: () => void;
  isRefreshing?: boolean;
}

export const CANON_PRINTER: Printer = {
  id: "11111111-1111-1111-1111-111111111111",
  display_name: "Canon imageCLASS MF3010",
  system_name: "Canon_MF3010",
  type: "bw",
  is_active: true,
  status: "online",
};

export const BROTHER_PRINTER: Printer = {
  id: "22222222-2222-2222-2222-222222222222",
  display_name: "Brother DCP-T220",
  system_name: "Brother_DCP_T220",
  type: "both",
  is_active: true,
  status: "online",
};

export const DEFAULT_PRINTERS: Printer[] = [CANON_PRINTER, BROTHER_PRINTER];

export default function PrinterSelector({
  selectedPrinterId,
  colorMode,
  onSelectPrinter,
  printers = DEFAULT_PRINTERS,
  onRefresh,
  isRefreshing = false,
}: Props) {
  // Find Canon and Brother from available list, or fall back to defaults
  const detectedCanon = printers.find((p) => {
    const name = ((p.display_name || "") + " " + (p.system_name || "")).toLowerCase();
    return name.includes("canon") || name.includes("cannon") || name.includes("mf3010");
  }) || CANON_PRINTER;

  const detectedBrother = printers.find((p) => {
    const name = ((p.display_name || "") + " " + (p.system_name || "")).toLowerCase();
    return name.includes("brother") || name.includes("t220");
  }) || BROTHER_PRINTER;

  // STRICT RULE: Only show two printers: Canon (Black & White) and Brother (Color)
  const onlyTwoPrinters = [
    {
      ...detectedCanon,
      display_name: "Canon imageCLASS MF3010",
      type: "bw" as const,
      status: "online" as const,
      mode: "bw" as ColorMode,
      modeLabel: "Black & White (B&W)",
      description: "Fast & crisp monochrome laser print",
      tagText: "⚫ Black & White",
    },
    {
      ...detectedBrother,
      display_name: "Brother DCP-T220",
      type: "both" as const,
      status: "online" as const,
      mode: "color" as ColorMode,
      modeLabel: "Full Color",
      description: "High resolution vibrant color print",
      tagText: "🌈 Vibrant Color",
    },
  ];

  return (
    <div className="space-y-3">
      {/* Live Connection Banner */}
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-2">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
          </span>
          <span className="text-xs font-semibold text-slate-700">
            Assigned Printers:{" "}
            <span className="text-emerald-700 font-bold">
              2 Online (Canon &amp; Brother)
            </span>
          </span>
        </div>

        {onRefresh && (
          <button
            type="button"
            onClick={onRefresh}
            disabled={isRefreshing}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-600 hover:text-indigo-800 disabled:opacity-50 transition-colors cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? "animate-spin" : ""}`} />
            <span>Scan Hardware</span>
          </button>
        )}
      </div>

      {/* Exactly 2 Printer Cards: Canon (B&W) & Brother (Color) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {onlyTwoPrinters.map((printer) => {
          const isColor = printer.mode === "color";
          const isSelected = selectedPrinterId === printer.id || (selectedPrinterId ? false : colorMode === printer.mode);

          return (
            <div
              key={printer.id}
              onClick={() => {
                onSelectPrinter(printer.id, printer.mode);
              }}
              className={`relative rounded-3xl p-5 transition-all duration-200 cursor-pointer select-none border-2 overflow-hidden ${
                isSelected
                  ? isColor
                    ? "border-pink-500 bg-gradient-to-br from-pink-500/10 via-purple-500/15 to-amber-500/10 ring-4 ring-pink-500/20 shadow-xl shadow-pink-500/10 -translate-y-0.5"
                    : "border-black bg-slate-950 text-white ring-4 ring-slate-900/15 shadow-xl shadow-slate-950/20 -translate-y-0.5"
                  : isColor
                  ? "bg-gradient-to-br from-pink-50/40 via-purple-50/20 to-white hover:bg-pink-50/60 border-purple-200 hover:border-pink-400 shadow-xs"
                  : "bg-white hover:bg-slate-50 border-slate-300 hover:border-black shadow-xs"
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3.5 min-w-0">
                  <div
                    className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 transition-transform ${
                      isSelected
                        ? isColor
                          ? "bg-gradient-to-tr from-pink-500 to-rose-500 text-white shadow-md shadow-pink-500/25"
                          : "bg-white text-slate-950 shadow-md shadow-black/25"
                        : isColor
                        ? "bg-pink-100 text-pink-700 border border-pink-200"
                        : "bg-slate-100 text-slate-800 border border-slate-300"
                    }`}
                  >
                    <PrinterIcon className="w-6 h-6 stroke-[2.2]" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <h5
                        className={`font-black text-base leading-tight truncate tracking-tight ${
                          isSelected
                            ? isColor
                              ? "bg-gradient-to-r from-pink-600 via-purple-600 to-indigo-600 bg-clip-text text-transparent"
                              : "text-white"
                            : isColor
                            ? "text-purple-950 font-bold"
                            : "text-slate-900"
                        }`}
                      >
                        {printer.display_name}
                      </h5>
                    </div>
                    <p
                      className={`text-xs mt-0.5 font-medium truncate ${
                        isSelected
                          ? isColor
                            ? "text-purple-900 font-semibold"
                            : "text-slate-300"
                          : "text-slate-500"
                      }`}
                    >
                      {printer.description}
                    </p>
                  </div>
                </div>

                {isSelected ? (
                  <span
                    className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 text-white text-xs ${
                      isColor ? "bg-gradient-to-r from-pink-600 to-purple-600 shadow-xs" : "bg-white text-slate-950"
                    }`}
                  >
                    <Check className={`w-3.5 h-3.5 stroke-[3] ${isColor ? "text-white" : "text-slate-950"}`} />
                  </span>
                ) : (
                  <span className="w-6 h-6 rounded-full border border-slate-300 flex items-center justify-center shrink-0">
                    <span className="w-2 h-2 rounded-full bg-slate-200"></span>
                  </span>
                )}
              </div>

              {/* Status and Mode Capability Tags */}
              <div
                className={`mt-4 flex items-center justify-between pt-3 border-t text-xs ${
                  isSelected && !isColor ? "border-slate-800" : "border-slate-100"
                }`}
              >
                <span
                  className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full font-black text-[11px] ${
                    isColor
                      ? isSelected
                        ? "bg-gradient-to-r from-pink-600 via-purple-600 to-indigo-600 text-white shadow-xs"
                        : "bg-pink-100 text-pink-800 border border-pink-200"
                      : isSelected
                      ? "bg-white text-slate-950 shadow-xs"
                      : "bg-slate-100 text-slate-800 border border-slate-300"
                  }`}
                >
                  {isColor ? "🌈 Vibrant Color Mode" : "⚫ Monochrome B&W"}
                </span>

                <span
                  className={`inline-flex items-center gap-1.5 font-bold text-xs ${
                    isSelected && !isColor ? "text-emerald-400" : "text-emerald-700"
                  }`}
                >
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                  Ready to Print
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
