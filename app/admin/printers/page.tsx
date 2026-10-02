"use client";

import React, { useState, useEffect } from "react";
import AdminSidebar from "@/components/AdminSidebar";
import AdminHeader from "@/components/AdminHeader";
import { Printer as PrinterType } from "@/lib/types";
import { supabase } from "@/lib/supabase";
import { Printer, Radio, Save, Check, Terminal, RefreshCw, AlertCircle, Info, Sparkles } from "lucide-react";

export default function AdminPrintersPage() {
  const [printers, setPrinters] = useState<PrinterType[]>([]);
  const [saved, setSaved] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [lastScanTime, setLastScanTime] = useState<string>("Just now");

  const loadPrinters = async () => {
    try {
      setIsScanning(true);
      const res = await fetch("/api/printers/live");
      const data = await res.json();
      if (data.success && Array.isArray(data.printers)) {
        setPrinters(data.printers);
        setLastScanTime(new Date().toLocaleTimeString());
      }
    } catch (err) {
      console.error("Error loading printers:", err);
    } finally {
      setIsScanning(false);
    }
  };

  useEffect(() => {
    loadPrinters();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      for (const p of printers) {
        await supabase
          .from("printers")
          .upsert({
            id: p.id,
            display_name: p.display_name,
            system_name: p.system_name,
            type: p.type,
            is_active: p.is_active,
            status: p.status,
          });
      }
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (err: any) {
      alert("Error saving: " + err.message);
    }
  };

  const updatePrinter = (idx: number, updates: Partial<PrinterType>) => {
    const updated = [...printers];
    updated[idx] = { ...updated[idx], ...updates };
    setPrinters(updated);
  };

  const onlinePrintersCount = printers.filter((p) => p.status === "online").length;

  return (
    <div className="flex min-h-screen bg-slate-100">
      <AdminSidebar isAgentOnline={true} />

      <div className="flex-1 flex flex-col min-w-0">
        <AdminHeader
          title="Printers & Hardware Control"
          subtitle="Real-time detection and mapping of Windows hardware printers for automatic printing"
        />

        <main className="p-6 max-w-4xl space-y-6 flex-1 overflow-y-auto">
          {saved && (
            <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 p-4 rounded-2xl flex items-center gap-2 text-sm font-semibold animate-in fade-in">
              <Check className="w-5 h-5 text-emerald-600" />
              <span>Printer device mappings saved! Print agent will use these settings for automatic printing.</span>
            </div>
          )}

          {/* Shop PC Agent Live Status Card */}
          <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0">
                <Radio className="w-6 h-6 animate-pulse" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-slate-900 text-base">Shop PC Print Engine: Online</h3>
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  Real-time Windows Spooler & SumatraPDF Engine Active &bull; {onlinePrintersCount} hardware printer(s) ready
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={loadPrinters}
                disabled={isScanning}
                className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isScanning ? "animate-spin" : ""}`} />
                <span>Scan Windows Hardware</span>
              </button>

              <div className="text-left sm:text-right shrink-0">
                <span className="text-[10px] text-slate-400 block uppercase font-bold">Scanned At</span>
                <span className="text-xs font-mono font-bold text-slate-700">{lastScanTime}</span>
              </div>
            </div>
          </div>

          {/* Configured Printers Form */}
          <form onSubmit={handleSave} className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider">
                Real-Time Detected Hardware Printers ({printers.length})
              </h2>
              <button
                type="submit"
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
              >
                <Save className="w-3.5 h-3.5" />
                <span>Save Printer Mapping</span>
              </button>
            </div>

            <div className="grid grid-cols-1 gap-4">
              {printers.map((printer, idx) => {
                const isOnline = printer.status === "online";

                return (
                  <div key={printer.id} className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs space-y-4">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <div
                          className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                            isOnline
                              ? "bg-emerald-100 text-emerald-700 border border-emerald-200"
                              : "bg-slate-100 text-slate-400"
                          }`}
                        >
                          <Printer className="w-5 h-5" />
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <h4 className="font-bold text-slate-900 text-base truncate">{printer.display_name}</h4>
                            {isOnline ? (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 flex items-center gap-1">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse"></span>
                                Live Ready
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-500">
                                Offline
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-slate-500 font-mono mt-0.5">{printer.system_name}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={printer.is_active}
                            onChange={(e) => updatePrinter(idx, { is_active: e.target.checked })}
                            className="w-4 h-4 text-indigo-600 rounded"
                          />
                          <span className="text-xs font-semibold text-slate-700">Active</span>
                        </label>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                          Display Name (Customer Portal)
                        </label>
                        <input
                          type="text"
                          value={printer.display_name}
                          onChange={(e) => updatePrinter(idx, { display_name: e.target.value })}
                          className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl outline-none focus:border-indigo-500 font-semibold"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                          System Device Name (Windows Spooler)
                        </label>
                        <input
                          type="text"
                          value={printer.system_name}
                          onChange={(e) => updatePrinter(idx, { system_name: e.target.value })}
                          className="w-full px-3 py-2 text-xs font-mono border border-slate-300 rounded-xl outline-none focus:border-indigo-500 bg-slate-50"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                          Color Capabilities
                        </label>
                        <select
                          value={printer.type}
                          onChange={(e) => updatePrinter(idx, { type: e.target.value as "bw" | "color" | "both" })}
                          className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl outline-none focus:border-indigo-500 bg-white font-semibold"
                        >
                          <option value="both">Color & Black & White</option>
                          <option value="bw">Monochrome (B&W Only)</option>
                          <option value="color">Color Only</option>
                        </select>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </form>
        </main>
      </div>
    </div>
  );
}
