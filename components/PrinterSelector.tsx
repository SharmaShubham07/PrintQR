"use client";

import React from "react";
import { ColorMode, Printer } from "@/lib/types";
import { Printer as PrinterIcon, Check, AlertTriangle, Sparkles, RefreshCw, Zap } from "lucide-react";

interface Props {
  selectedPrinterId?: string;
  colorMode: ColorMode;
  onSelectPrinter: (printerId: string) => void;
  printers?: Printer[];
  onRefresh?: () => void;
  isRefreshing?: boolean;
}

export const DEFAULT_PRINTERS: Printer[] = [
  {
    id: "1e56f4b2-4444-4444-4444-1e56f4b20000",
    display_name: "Microsoft Print to PDF",
    system_name: "Microsoft Print to PDF",
    type: "both",
    is_active: true,
    status: "online",
  },
  {
    id: "11111111-1111-1111-1111-111111111111",
    display_name: "Canon imageCLASS MF3010",
    system_name: "Canon_MF3010",
    type: "bw",
    is_active: true,
    status: "online",
  },
  {
    id: "22222222-2222-2222-2222-222222222222",
    display_name: "Brother DCP-T220",
    system_name: "Brother_DCP_T220",
    type: "both",
    is_active: true,
    status: "online",
  },
];

export default function PrinterSelector({
  selectedPrinterId,
  colorMode,
  onSelectPrinter,
  printers = DEFAULT_PRINTERS,
  onRefresh,
  isRefreshing = false,
}: Props) {
  // Sort online printers first
  const sortedPrinters = [...printers].sort((a, b) => {
    if (a.status === "online" && b.status !== "online") return -1;
    if (a.status !== "online" && b.status === "online") return 1;
    return a.display_name.localeCompare(b.display_name);
  });

  const onlineCount = printers.filter((p) => p.status === "online").length;

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
            Real-Time Hardware:{" "}
            <span className="text-emerald-700 font-bold">
              {onlineCount} {onlineCount === 1 ? "Printer" : "Printers"} Ready
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

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {sortedPrinters.map((printer) => {
          const isOnline = printer.status === "online";
          const isBwOnly = printer.type === "bw";
          const isColorDisabled = isBwOnly && colorMode === "color";
          const isSelected = selectedPrinterId === printer.id;
          const isDisabled = !isOnline || isColorDisabled;

          return (
            <div
              key={printer.id}
              onClick={() => {
                if (!isDisabled) {
                  onSelectPrinter(printer.id);
                }
              }}
              className={`relative border rounded-2xl p-4 transition-all duration-200 select-none ${
                !isOnline
                  ? "bg-slate-50/80 border-slate-200 opacity-60 cursor-not-allowed"
                  : isColorDisabled
                  ? "bg-slate-100/70 border-slate-200 opacity-60 cursor-not-allowed"
                  : isSelected
                  ? "border-indigo-600 bg-indigo-50/50 ring-2 ring-indigo-500/20 cursor-pointer shadow-sm"
                  : "border-slate-200 hover:border-slate-300 bg-white hover:bg-slate-50/50 cursor-pointer"
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                      isSelected && isOnline
                        ? "bg-indigo-600 text-white shadow-sm"
                        : isOnline
                        ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                        : "bg-slate-100 text-slate-400"
                    }`}
                  >
                    <PrinterIcon className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <h5 className="font-bold text-slate-800 text-sm leading-tight truncate">
                      {printer.display_name}
                    </h5>
                    <p className="text-[11px] text-slate-500 mt-0.5 truncate">
                      {isBwOnly ? "Mono Laser (High Speed)" : "Color & B&W High Resolution"}
                    </p>
                  </div>
                </div>

                {isSelected && !isDisabled && (
                  <span className="w-5 h-5 rounded-full bg-indigo-600 text-white flex items-center justify-center shrink-0">
                    <Check className="w-3.5 h-3.5 stroke-[3]" />
                  </span>
                )}
              </div>

              {/* Status and Capability Tags */}
              <div className="mt-3 flex items-center justify-between pt-2 border-t border-slate-100 text-[11px]">
                <span
                  className={`inline-flex items-center gap-1 font-semibold px-2 py-0.5 rounded-full ${
                    isBwOnly
                      ? "bg-slate-100 text-slate-700"
                      : "bg-purple-100 text-purple-700"
                  }`}
                >
                  {!isBwOnly && <Sparkles className="w-3 h-3 text-purple-600" />}
                  {isBwOnly ? "B&W Only" : "Colour & B&W"}
                </span>

                {isOnline ? (
                  <span className="inline-flex items-center gap-1 text-emerald-700 font-bold">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                    Live Connected
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-slate-400 font-medium">
                    <span className="w-2 h-2 rounded-full bg-slate-300"></span>
                    Offline
                  </span>
                )}
              </div>

              {/* Notice if color mode selected for B&W printer */}
              {isColorDisabled && (
                <div className="mt-2.5 flex items-start gap-1.5 p-2 bg-amber-50 border border-amber-200 rounded-xl text-[11px] text-amber-800">
                  <AlertTriangle className="w-3.5 h-3.5 shrink-0 text-amber-600 mt-0.5" />
                  <span>
                    This printer only prints Black & White. Choose a colour printer above.
                  </span>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
