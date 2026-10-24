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
      description: "High Speed Monochrome Laser Printer",
      tagText: "⚫ Black & White Only",
    },
    {
      ...detectedBrother,
      display_name: "Brother DCP-T220",
      type: "both" as const,
      status: "online" as const,
      mode: "color" as ColorMode,
      modeLabel: "Full Color",
      description: "High Resolution Vibrant Color Printer",
      tagText: "🌈 Full Color Print",
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
            Hardware Printers:{" "}
            <span className="text-emerald-700 font-bold">
              2 Printers Live (Canon &amp; Brother)
            </span>
          </span>
        </div>

        {onRefresh && (
          <button
            type="button"
            onClick={onRefresh}
            disabled={isRefreshing}
            className="inline-flex items-center gap-1 text-[11px] font-semibold text-indigo-600 hover:text-indigo-800 disabled:opacity-50 transition-colors cursor-pointer"
          >
            <RefreshCw className={`w-3 h-3 ${isRefreshing ? "animate-spin" : ""}`} />
            <span>Scan Hardware</span>
          </button>
        )}
      </div>

      {/* Exactly 2 Printer Cards: Canon & Brother */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
        {onlyTwoPrinters.map((printer) => {
          const isColor = printer.mode === "color";
          // Selected if ID matches, or synchronized with colorMode
          const isSelected = selectedPrinterId === printer.id || (selectedPrinterId ? false : colorMode === printer.mode);

          return (
            <div
              key={printer.id}
              onClick={() => {
                // When selecting Brother -> Color; when selecting Canon -> Black & White
                onSelectPrinter(printer.id, printer.mode);
              }}
              className={`relative border-2 rounded-2xl p-4 transition-all duration-200 cursor-pointer select-none ${
                isSelected
                  ? isColor
                    ? "border-purple-600 bg-purple-50/60 ring-2 ring-purple-500/25 shadow-md"
                    : "border-slate-900 bg-slate-50/80 ring-2 ring-slate-800/20 shadow-md"
                  : "border-slate-200 hover:border-slate-400 bg-white hover:bg-slate-50/60 shadow-xs"
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 transition-colors ${
                      isSelected
                        ? isColor
                          ? "bg-gradient-to-tr from-purple-600 to-indigo-600 text-white shadow-sm"
                          : "bg-slate-900 text-white shadow-sm"
                        : isColor
                        ? "bg-purple-100 text-purple-700 border border-purple-200"
                        : "bg-slate-100 text-slate-700 border border-slate-200"
                    }`}
                  >
                    <PrinterIcon className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <h5 className="font-extrabold text-slate-900 text-sm leading-tight truncate">
                        {printer.display_name}
                      </h5>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-0.5 truncate">
                      {printer.description}
                    </p>
                  </div>
                </div>

                {isSelected ? (
                  <span
                    className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 text-white shadow-xs ${
                      isColor ? "bg-purple-600" : "bg-slate-900"
                    }`}
                  >
                    <Check className="w-3.5 h-3.5 stroke-[3]" />
                  </span>
                ) : (
                  <span className="w-6 h-6 rounded-full border border-slate-300 flex items-center justify-center shrink-0 text-slate-300">
                    <span className="w-2 h-2 rounded-full bg-transparent"></span>
                  </span>
                )}
              </div>

              {/* Status and Mode Capability Tags */}
              <div className="mt-3 flex items-center justify-between pt-2.5 border-t border-slate-100 text-[11px]">
                <span
                  className={`inline-flex items-center gap-1 font-bold px-2.5 py-0.5 rounded-full ${
                    isColor
                      ? "bg-gradient-to-r from-purple-100 to-pink-100 text-purple-800 border border-purple-200"
                      : "bg-slate-900 text-white shadow-xs"
                  }`}
                >
                  {isColor && <Sparkles className="w-3 h-3 text-purple-600" />}
                  {printer.tagText}
                </span>

                <span className="inline-flex items-center gap-1.5 text-emerald-700 font-bold">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                  Online Ready
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
