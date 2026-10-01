"use client";

import React from "react";
import { OrderFileItem, Language } from "@/lib/types";
import { translations } from "@/lib/translations";
import { calculateFileCost, calculateOrderTotal, PricingConfig, DEFAULT_PRICING } from "@/lib/price-calculator";
import { FileText, Printer, Copy, Layers, ShieldCheck, IndianRupee } from "lucide-react";

interface Props {
  files: OrderFileItem[];
  pricing?: PricingConfig;
  language: Language;
}

export default function OrderSummary({
  files,
  pricing = DEFAULT_PRICING,
  language,
}: Props) {
  const t = translations[language];
  const { subtotal, total, minOrderApplied } = calculateOrderTotal(files, pricing);

  return (
    <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
      <div className="px-5 py-4 border-b border-slate-100 bg-slate-50/70">
        <h3 className="font-bold text-slate-800 text-base">
          {t.summary_title}
        </h3>
        <p className="text-xs text-slate-500 mt-0.5">
          {t.summary_sub}
        </p>
      </div>

      <div className="p-4 sm:p-5 space-y-3 divide-y divide-slate-100">
        {files.map((file, idx) => {
          const cost = calculateFileCost(file, pricing);
          const totalPages = file.effective_pages * file.copies;

          return (
            <div key={idx} className={`pt-3 first:pt-0 flex flex-col sm:flex-row sm:items-center justify-between gap-3`}>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-indigo-600 shrink-0" />
                  <span className="font-semibold text-slate-800 text-sm truncate max-w-[280px] sm:max-w-md">
                    {file.file_name}
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-1.5 text-xs text-slate-500">
                  <span
                    className={`inline-flex items-center px-2 py-0.5 rounded-md font-semibold text-[11px] ${
                      file.color_mode === "color"
                        ? "bg-purple-50 text-purple-700 border border-purple-200"
                        : "bg-slate-100 text-slate-700 border border-slate-200"
                    }`}
                  >
                    {file.color_mode === "color" ? "Colour (₹10)" : "B&W (₹8)"}
                  </span>

                  <span className="inline-flex items-center gap-1 bg-slate-50 px-2 py-0.5 rounded-md border border-slate-200">
                    <Copy className="w-3 h-3 text-slate-400" />
                    {file.copies} {file.copies === 1 ? "copy" : "copies"}
                  </span>

                  <span className="inline-flex items-center gap-1 bg-slate-50 px-2 py-0.5 rounded-md border border-slate-200">
                    <Layers className="w-3 h-3 text-slate-400" />
                    {file.effective_pages} pages ({totalPages} total)
                  </span>

                  {file.duplex === "double" && (
                    <span className="bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-md border border-emerald-200 text-[11px] font-medium">
                      Double-sided
                    </span>
                  )}
                </div>
              </div>

              <div className="text-right shrink-0">
                <span className="text-base font-bold text-slate-900">
                  ₹{cost.toFixed(2)}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Bill Totals */}
      <div className="bg-slate-50/80 px-5 py-4 border-t border-slate-200 space-y-2">
        <div className="flex justify-between text-xs text-slate-600">
          <span>Subtotal</span>
          <span>₹{subtotal.toFixed(2)}</span>
        </div>

        {minOrderApplied && (
          <div className="flex justify-between text-xs text-amber-700">
            <span>Minimum Order Charge</span>
            <span>₹{pricing.min_order_amount.toFixed(2)}</span>
          </div>
        )}

        <div className="flex justify-between items-baseline pt-2 border-t border-slate-200/80">
          <div>
            <span className="font-bold text-slate-900 text-base">
              {t.total_amount}
            </span>
            <p className="text-[11px] text-slate-500">Including all taxes & paper charges</p>
          </div>
          <div className="text-2xl font-black text-indigo-600">
            ₹{total.toFixed(2)}
          </div>
        </div>
      </div>
    </div>
  );
}
