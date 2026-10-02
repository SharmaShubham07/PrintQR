"use client";

import React, { useState, useEffect } from "react";
import AdminSidebar from "@/components/AdminSidebar";
import AdminHeader from "@/components/AdminHeader";
import { Check, Save, RefreshCw, AlertCircle, IndianRupee } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { PricingConfig, DEFAULT_PRICING, parsePricingRows } from "@/lib/price-calculator";

export default function AdminPricesPage() {
  const [rates, setRates] = useState<PricingConfig>(DEFAULT_PRICING);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [saved, setSaved] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const fetchPricing = async () => {
    try {
      setIsLoading(true);
      setErrorMsg(null);
      const res = await fetch("/api/admin/pricing");
      const data = await res.json();
      if (data.success && data.pricing) {
        setRates(data.pricing);
      } else {
        throw new Error(data.error || "Failed to load pricing");
      }
    } catch (err: any) {
      console.error("Error loading pricing:", err);
      setErrorMsg(err.message || "Failed to load pricing configuration");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPricing();

    // Subscribe to realtime database changes on pricing
    const channel = supabase
      .channel("admin-pricing-changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "pricing" },
        () => {
          fetchPricing();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setErrorMsg(null);
    setSaved(false);

    try {
      const res = await fetch("/api/admin/pricing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(rates),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to save pricing");
      }

      if (data.pricing) {
        setRates(data.pricing);
      }
      setSaved(true);
      setTimeout(() => setSaved(false), 3500);
    } catch (err: any) {
      console.error("Error saving pricing:", err);
      setErrorMsg(err.message || "Failed to save pricing changes");
    } finally {
      setIsSaving(false);
    }
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
          {errorMsg && (
            <div className="bg-rose-50 border border-rose-200 text-rose-800 p-4 rounded-2xl flex items-center gap-2 text-sm font-semibold animate-in fade-in">
              <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {saved && (
            <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 p-4 rounded-2xl flex items-center gap-2 text-sm font-semibold animate-in fade-in">
              <Check className="w-5 h-5 text-emerald-600 shrink-0" />
              <span>
                Pricing successfully saved to database! New orders and customer screens will immediately use these rates.
              </span>
            </div>
          )}

          <form onSubmit={handleSave} className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-xs space-y-6">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <h2 className="text-base font-bold text-slate-900">Per-Page Print Rates</h2>
                <p className="text-xs text-slate-500">Base printing charges applied per page per copy</p>
              </div>
              <button
                type="button"
                onClick={fetchPricing}
                disabled={isLoading}
                className="text-xs text-slate-500 hover:text-indigo-600 flex items-center gap-1 font-semibold p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors"
                title="Refresh latest pricing"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin text-indigo-600" : ""}`} />
                <span>Refresh</span>
              </button>
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
                    ₹
                  </span>
                  <input
                    type="number"
                    step="0.5"
                    min="1"
                    required
                    value={rates.bw_page}
                    onChange={(e) => setRates({ ...rates, bw_page: parseFloat(e.target.value) || 0 })}
                    className="w-full pl-8 pr-4 py-2.5 text-lg font-bold border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none bg-white"
                  />
                </div>
                <p className="text-[11px] text-slate-400">Current live rate: ₹{rates.bw_page.toFixed(2)} / page</p>
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
                    ₹
                  </span>
                  <input
                    type="number"
                    step="0.5"
                    min="1"
                    required
                    value={rates.color_page}
                    onChange={(e) => setRates({ ...rates, color_page: parseFloat(e.target.value) || 0 })}
                    className="w-full pl-8 pr-4 py-2.5 text-lg font-bold border border-slate-300 rounded-xl focus:ring-2 focus:ring-purple-500 outline-none bg-white"
                  />
                </div>
                <p className="text-[11px] text-slate-400">Current live rate: ₹{rates.color_page.toFixed(2)} / page</p>
              </div>
            </div>

            {/* Discounts and Order Limits */}
            <div className="border-t border-slate-100 pt-6 space-y-4">
              <h3 className="text-sm font-bold text-slate-900">Discounts & Minimum Order</h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Minimum Order Amount (₹)
                  </label>
                  <input
                    type="number"
                    step="1"
                    min="0"
                    value={rates.min_order_amount}
                    onChange={(e) => setRates({ ...rates, min_order_amount: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl outline-none focus:border-indigo-500 bg-white"
                  />
                  <p className="text-[11px] text-slate-400 mt-1">
                    Prevents orders below this threshold (currently ₹{rates.min_order_amount.toFixed(2)})
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Double-Sided Discount per Sheet (₹)
                  </label>
                  <input
                    type="number"
                    step="0.5"
                    min="0"
                    value={rates.double_sided_discount}
                    onChange={(e) => setRates({ ...rates, double_sided_discount: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl outline-none focus:border-indigo-500 bg-white"
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
                disabled={isSaving || isLoading}
                className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-bold rounded-2xl shadow-md shadow-indigo-600/20 active:scale-[0.99] transition-all flex items-center gap-2 text-sm cursor-pointer"
              >
                {isSaving ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Saving Changes...</span>
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    <span>Save Pricing Changes</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </main>
      </div>
    </div>
  );
}
