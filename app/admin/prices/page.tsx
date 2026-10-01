"use client";

import React, { useState } from "react";
import AdminSidebar from "@/components/AdminSidebar";
import AdminHeader from "@/components/AdminHeader";
import { Check, Save, Tag, IndianRupee, Sparkles, AlertCircle } from "lucide-react";

export default function AdminPricesPage() {
  const [rates, setRates] = useState({
    bw_page: 8.0,
    color_page: 10.0,
    double_sided_discount: 0.0,
    min_order_amount: 8.0,
  });

  const [saved, setSaved] = useState(false);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  return (
    <div className="flex min-h-screen bg-slate-100">
      <AdminSidebar isAgentOnline={true} />

      <div className="flex-1 flex flex-col min-w-0">
        <AdminHeader
          title="Pricing & Extras Management"
          subtitle="Configure Black & White, Colour, and discount rates for Preeti Communication"
        />

        <main className="p-6 max-w-3xl space-y-6 flex-1 overflow-y-auto">
          {saved && (
            <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 p-4 rounded-2xl flex items-center gap-2 text-sm font-semibold animate-in fade-in">
              <Check className="w-5 h-5 text-emerald-600" />
              <span>Pricing successfully saved! New orders will immediately use these rates.</span>
            </div>
          )}

          <form onSubmit={handleSave} className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-xs space-y-6">
            <div className="border-b border-slate-100 pb-4">
              <h2 className="text-base font-bold text-slate-900">Per-Page Print Rates</h2>
              <p className="text-xs text-slate-500">Base printing charges applied per page per copy</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              {/* Black & White */}
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-800 text-sm">Black & White Print</span>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-200 text-slate-700">Mono</span>
                </div>
                <p className="text-xs text-slate-500">Applies to Canon MF3010 and Brother DCP-T220 mono jobs</p>

                <div className="relative mt-2">
                  <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400 font-bold">
                    ?
                  </span>
                  <input
                    type="number"
                    step="0.5"
                    min="1"
                    required
                    value={rates.bw_page}
                    onChange={(e) => setRates({ ...rates, bw_page: parseFloat(e.target.value) || 0 })}
                    className="w-full pl-8 pr-4 py-2.5 text-lg font-bold border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                </div>
                <p className="text-[11px] text-slate-400">Current seed rate: ?8.00 / page</p>
              </div>

              {/* Colour */}
              <div className="bg-purple-50/50 border border-purple-200/80 rounded-2xl p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-800 text-sm">Colour Print</span>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-100 text-purple-700">Colour</span>
                </div>
                <p className="text-xs text-slate-500">Applies to Brother DCP-T220 colour ink-tank jobs</p>

                <div className="relative mt-2">
                  <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400 font-bold">
                    ?
                  </span>
                  <input
                    type="number"
                    step="0.5"
                    min="1"
                    required
                    value={rates.color_page}
                    onChange={(e) => setRates({ ...rates, color_page: parseFloat(e.target.value) || 0 })}
                    className="w-full pl-8 pr-4 py-2.5 text-lg font-bold border border-slate-300 rounded-xl focus:ring-2 focus:ring-purple-500 outline-none"
                  />
                </div>
                <p className="text-[11px] text-slate-400">Current seed rate: ?10.00 / page</p>
              </div>
            </div>

            {/* Discounts and Order Limits */}
            <div className="border-t border-slate-100 pt-6 space-y-4">
              <h3 className="text-sm font-bold text-slate-900">Discounts & Minimum Order</h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Minimum Order Amount (?)
                  </label>
                  <input
                    type="number"
                    step="1"
                    min="0"
                    value={rates.min_order_amount}
                    onChange={(e) => setRates({ ...rates, min_order_amount: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl outline-none focus:border-indigo-500"
                  />
                  <p className="text-[11px] text-slate-400 mt-1">
                    Prevents orders below this threshold (e.g. ?8.00)
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Double-Sided Discount per Sheet (?)
                  </label>
                  <input
                    type="number"
                    step="0.5"
                    min="0"
                    value={rates.double_sided_discount}
                    onChange={(e) => setRates({ ...rates, double_sided_discount: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl outline-none focus:border-indigo-500"
                  />
                  <p className="text-[11px] text-slate-400 mt-1">
                    Optional discount for saving paper (set 0 to disable)
                  </p>
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-100 flex justify-end">
              <button
                type="submit"
                className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-2xl shadow-md shadow-indigo-600/20 active:scale-[0.99] transition-all flex items-center gap-2 text-sm"
              >
                <Save className="w-4 h-4" />
                <span>Save Pricing Changes</span>
              </button>
            </div>
          </form>
        </main>
      </div>
    </div>
  );
}
