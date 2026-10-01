"use client";

import React, { useState } from "react";
import AdminSidebar from "@/components/AdminSidebar";
import AdminHeader from "@/components/AdminHeader";
import { Printer, Radio, Save, Check, Terminal, RefreshCw, AlertCircle, Info } from "lucide-react";

export default function AdminPrintersPage() {
  const [printers, setPrinters] = useState([
    {
      id: "11111111-1111-1111-1111-111111111111",
      display_name: "Canon imageCLASS MF3010",
      system_name: "Canon_MF3010",
      type: "bw",
      is_active: true,
      status: "online",
      description: "Dedicated High-Speed Monochrome Laser Printer",
    },
    {
      id: "22222222-2222-2222-2222-222222222222",
      display_name: "Brother DCP-T220",
      system_name: "Brother_DCP_T220",
      type: "both",
      is_active: true,
      status: "online",
      description: "High-Yield Ink Tank for Vibrant Colour and High Quality Prints",
    },
  ]);

  const [saved, setSaved] = useState(false);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  const updatePrinter = (idx: number, updates: any) => {
    const updated = [...printers];
    updated[idx] = { ...updated[idx], ...updates };
    setPrinters(updated);
  };

  return (
    <div className="flex min-h-screen bg-slate-100">
      <AdminSidebar isAgentOnline={true} />

      <div className="flex-1 flex flex-col min-w-0">
        <AdminHeader
          title="Printers & Print Agent Control"
          subtitle="Map physical shop printers to system device drivers and manage automated routing"
        />

        <main className="p-6 max-w-4xl space-y-6 flex-1 overflow-y-auto">
          {saved && (
            <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 p-4 rounded-2xl flex items-center gap-2 text-sm font-semibold animate-in fade-in">
              <Check className="w-5 h-5 text-emerald-600" />
              <span>Printer device mappings saved! Print agent will now use these system printer names.</span>
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
                  <h3 className="font-bold text-slate-900 text-base">Shop PC Print Agent: Online</h3>
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  Connected via WebSockets � Node.js Agent active on Preeti Communication PC
                </p>
              </div>
            </div>

            <div className="text-left sm:text-right shrink-0">
              <span className="text-[11px] text-slate-400 block">Last Heartbeat</span>
              <span className="text-xs font-mono font-bold text-slate-700">Just now (12s ago)</span>
            </div>
          </div>

          {/* Configured Printers Form */}
          <form onSubmit={handleSave} className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider">
                Configured Printers ({printers.length})
              </h2>
              <button
                type="submit"
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-sm transition-all"
              >
                <Save className="w-3.5 h-3.5" />
                <span>Save Printer Mapping</span>
              </button>
            </div>

            <div className="grid grid-cols-1 gap-4">
              {printers.map((printer, idx) => (
                <div key={printer.id} className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-700">
                        <Printer className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="font-bold text-slate-900 text-base">{printer.display_name}</h4>
                        <p className="text-xs text-slate-500">{printer.description}</p>
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

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                        Display Name (Shown to Customers)
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
                        System Device Name (Used by SumatraPDF / CUPS)
                      </label>
                      <input
                        type="text"
                        value={printer.system_name}
                        onChange={(e) => updatePrinter(idx, { system_name: e.target.value })}
                        className="w-full px-3 py-2 text-xs font-mono border border-slate-300 rounded-xl outline-none focus:border-indigo-500 bg-slate-50"
                      />
                    </div>
                  </div>

                  <div className="flex items-center gap-2 pt-1 text-[11px] text-slate-500">
                    <span className="font-bold uppercase tracking-wider">Supported Modes:</span>
                    <span className="bg-slate-100 px-2 py-0.5 rounded text-slate-700 font-medium">
                      {printer.type === "bw" ? "Black & White Only" : "Colour & Black & White"}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </form>

          {/* System Device Guide Box */}
          <div className="bg-slate-900 text-slate-300 rounded-3xl p-6 space-y-3">
            <div className="flex items-center gap-2 text-white font-bold text-sm">
              <Terminal className="w-4 h-4 text-emerald-400" />
              <span>How to find exact system printer names on Windows / Linux</span>
            </div>
            <p className="text-xs text-slate-400">
              The print agent requires the exact printer device name listed in Windows or CUPS. Run this command on the shop PC to see all installed printer names:
            </p>
            <div className="bg-slate-950 p-3 rounded-xl font-mono text-xs text-emerald-300 overflow-x-auto">
              # On Windows PowerShell:<br />
              Get-Printer | Select-Object Name<br /><br />
              # On Linux:<br />
              lpstat -p -d
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
