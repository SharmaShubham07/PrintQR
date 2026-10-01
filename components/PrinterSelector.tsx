"use client";

import React from "react";
import { ColorMode, Printer } from "@/lib/types";
import { Printer as PrinterIcon, Check, AlertTriangle, Sparkles } from "lucide-react";

interface Props {
  selectedPrinterId?: string;
  colorMode: ColorMode;
  onSelectPrinter: (printerId: string) => void;
  printers?: Printer[];
}

export const DEFAULT_PRINTERS: Printer[] = [
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
}: Props) {
  return (
    <div className="space-y-2">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {printers.map((printer) => {
          const isCanon = printer.display_name.toLowerCase().includes("canon") || printer.type === "bw";
          const isColorDisabled = isCanon && colorMode === "color";
          const isSelected = selectedPrinterId === printer.id;

          return (
            <div
              key={printer.id}
              onClick={() => {
                if (!isColorDisabled) {
                  onSelectPrinter(printer.id);
                }
              }}
              className={`relative border rounded-2xl p-4 transition-all duration-200 select-none ${
                isColorDisabled
                  ? "bg-slate-100/70 border-slate-200 opacity-60 cursor-not-allowed"
                  : isSelected
                  ? "border-indigo-600 bg-indigo-50/40 ring-2 ring-indigo-500/20 cursor-pointer shadow-sm"
                  : "border-slate-200 hover:border-slate-300 bg-white hover:bg-slate-50/50 cursor-pointer"
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-3">
                  <div
                    className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                      isSelected
                        ? "bg-indigo-600 text-white shadow-sm"
                        : "bg-slate-100 text-slate-600"
                    }`}
                  >
                    <PrinterIcon className="w-5 h-5" />
                  </div>
                  <div>
                    <h5 className="font-semibold text-slate-800 text-sm leading-tight">
                      {printer.display_name}
                    </h5>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {isCanon ? "Monochrome Laser (High Speed)" : "Colour & B&W Ink Tank"}
                    </p>
                  </div>
                </div>

                {isSelected && !isColorDisabled && (
                  <span className="w-5 h-5 rounded-full bg-indigo-600 text-white flex items-center justify-center shrink-0">
                    <Check className="w-3.5 h-3.5 stroke-[3]" />
                  </span>
                )}
              </div>

              {/* Status and tags */}
              <div className="mt-3 flex items-center gap-2 pt-2 border-t border-slate-100">
                <span
                  className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full ${
                    isCanon
                      ? "bg-slate-100 text-slate-700"
                      : "bg-purple-100 text-purple-700"
                  }`}
                >
                  {!isCanon && <Sparkles className="w-3 h-3 text-purple-600" />}
                  {isCanon ? "B&W Only" : "Colour & B&W"}
                </span>

                <span className="inline-flex items-center gap-1 text-[11px] text-emerald-700 font-medium">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                  Ready
                </span>
              </div>

              {/* Explanation message if disabled */}
              {isColorDisabled && (
                <div className="mt-2.5 flex items-start gap-1.5 p-2 bg-amber-50 border border-amber-200 rounded-xl text-[11px] text-amber-800">
                  <AlertTriangle className="w-3.5 h-3.5 shrink-0 text-amber-600 mt-0.5" />
                  <span>
                    Canon MF3010 is Black & White only. Select <strong>Brother DCP-T220</strong> for colour printing.
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
