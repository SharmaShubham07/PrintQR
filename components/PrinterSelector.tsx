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

      {/* Exactly 2 Printer Cards: Canon & Brother with Neo-Pop Styling */}
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
              className={`relative border-2 border-slate-900 rounded-3xl p-5 transition-all duration-200 cursor-pointer select-none ${
                isSelected
                  ? isColor
                    ? "bg-gradient-to-br from-purple-900 via-indigo-950 to-slate-950 text-white shadow-[5px_5px_0px_0px_#ec4899] rotate-0.5 scale-[1.01]"
                    : "bg-slate-900 text-white shadow-[5px_5px_0px_0px_#f59e0b] -rotate-0.5 scale-[1.01]"
                  : "bg-white hover:bg-slate-50 text-slate-900 shadow-[3px_3px_0px_0px_#0f172a] hover:shadow-[5px_5px_0px_0px_#0f172a]"
              }`}
            >
              {/* Corner Sticker Tag */}
              <div className="absolute -top-3 -right-2">
                <span className={`sticker-badge text-[10px] font-black ${
                  isColor
                    ? "bg-pink-300 text-pink-950 rotate-[3deg]"
                    : "bg-yellow-300 text-slate-950 rotate-[-2deg]"
                }`}>
                  {isColor ? "✨ VIBRANT COLOR" : "⚡ CRISP LASER"}
                </span>
              </div>

              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-3.5 min-w-0">
                  <div
                    className={`w-12 h-12 rounded-2xl border-2 border-slate-900 flex items-center justify-center shrink-0 transition-transform ${
                      isSelected
                        ? isColor
                          ? "bg-gradient-to-tr from-pink-500 to-purple-500 text-white shadow-[2px_2px_0px_0px_#fff]"
                          : "bg-yellow-400 text-slate-950 shadow-[2px_2px_0px_0px_#fff]"
                        : isColor
                        ? "bg-purple-100 text-purple-900 shadow-[2px_2px_0px_0px_#0f172a]"
                        : "bg-slate-100 text-slate-900 shadow-[2px_2px_0px_0px_#0f172a]"
                    }`}
                  >
                    <PrinterIcon className="w-6 h-6 stroke-[2.5]" />
                  </div>
                  <div className="min-w-0">
                    <h5 className={`font-black text-base sm:text-lg leading-tight truncate tracking-tight ${
                      isSelected ? "text-white" : "text-slate-900"
                    }`}>
                      {printer.display_name}
                    </h5>
                    <p className={`text-xs mt-0.5 font-bold truncate ${
                      isSelected ? "text-slate-300" : "text-slate-500"
                    }`}>
                      {isColor ? "High-res presentation & photos" : "Fast & sharp notes, documents & forms"}
                    </p>
                  </div>
                </div>

                {isSelected ? (
                  <span
                    className={`w-7 h-7 rounded-full border-2 border-slate-900 flex items-center justify-center shrink-0 text-slate-950 font-black shadow-[2px_2px_0px_0px_#fff] ${
                      isColor ? "bg-pink-400" : "bg-yellow-400"
                    }`}
                  >
                    <Check className="w-4 h-4 stroke-[3]" />
                  </span>
                ) : (
                  <span className="w-7 h-7 rounded-full border-2 border-slate-300 flex items-center justify-center shrink-0">
                    <span className="w-2.5 h-2.5 rounded-full bg-slate-200"></span>
                  </span>
                )}
              </div>

              {/* Status and Mode Capability Tags */}
              <div className={`mt-4 flex items-center justify-between pt-3 border-t text-[11px] font-bold ${
                isSelected ? "border-white/15" : "border-slate-200"
              }`}>
                <span
                  className={`inline-flex items-center gap-1 px-3 py-1 rounded-full border-2 border-slate-900 font-black text-xs ${
                    isColor
                      ? "bg-gradient-to-r from-pink-400 to-purple-400 text-slate-950 shadow-[2px_2px_0px_0px_#0f172a]"
                      : "bg-white text-slate-950 shadow-[2px_2px_0px_0px_#0f172a]"
                  }`}
                >
                  {isColor ? "🌈 Full Color Mode" : "⚫ Black & White Mode"}
                </span>

                <span className={`inline-flex items-center gap-1.5 font-black text-xs ${
                  isSelected ? "text-emerald-300" : "text-emerald-700"
                }`}>
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
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
