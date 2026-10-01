"use client";

import React, { useState } from "react";
import AdminSidebar from "@/components/AdminSidebar";
import AdminHeader from "@/components/AdminHeader";
import { Download, Calendar, BarChart3, TrendingUp, Layers, CheckCircle } from "lucide-react";

export default function AdminReportsPage() {
  const [period, setPeriod] = useState("month");

  const reportData = {
    totalRevenue: 12450.0,
    totalOrders: 312,
    bwPages: 1120,
    colorPages: 349,
    avgOrderValue: 39.9,
  };

  const exportCSV = () => {
    const rows = [
      ["Order ID", "Customer Name", "Phone", "UTR Number", "Amount", "Status", "Date"],
      ["PC-1048", "Amit Patel", "9825100000", "427819382104", "48.00", "completed", "2026-09-30 14:20"],
      ["PC-1047", "Sunita Verma", "9879100000", "427819381900", "30.00", "completed", "2026-09-30 13:55"],
      ["PC-1046", "Karan Shah", "9426000000", "427819380122", "80.00", "completed", "2026-09-30 11:10"],
      ["PC-1045", "Deepak Joshi", "9974000000", "427819379811", "16.00", "completed", "2026-09-29 18:30"],
      ["PC-1044", "Meena Sharma", "9898000000", "427819378120", "100.00", "completed", "2026-09-29 16:15"],
    ];

    const csvContent =
      "data:text/csv;charset=utf-8," + rows.map((e) => e.join(",")).join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Preeti_Communication_Orders_${period}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="flex min-h-screen bg-slate-100">
      <AdminSidebar isAgentOnline={true} />

      <div className="flex-1 flex flex-col min-w-0">
        <AdminHeader
          title="Revenue Reports & Analytics"
          subtitle="Review sales performance, print volume distribution, and export tax records"
        />

        <main className="p-6 max-w-4xl space-y-6 flex-1 overflow-y-auto">
          {/* Header Controls */}
          <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-slate-400" />
              <div className="flex gap-1 bg-slate-100 p-1 rounded-xl text-xs font-semibold">
                {["today", "week", "month", "all"].map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setPeriod(p)}
                    className={`px-3 py-1 rounded-lg capitalize transition-colors ${
                      period === p
                        ? "bg-white text-indigo-700 shadow-xs"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>

            <button
              type="button"
              onClick={exportCSV}
              className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs flex items-center gap-2 shadow-sm transition-all"
            >
              <Download className="w-4 h-4" />
              <span>Export Orders CSV</span>
            </button>
          </div>

          {/* Metrics Overview */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                Total Period Revenue
              </span>
              <div className="mt-2 text-3xl font-black text-slate-900">
                ?{reportData.totalRevenue.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
              </div>
              <p className="text-[11px] text-emerald-600 font-semibold mt-1">
                From {reportData.totalOrders} customer jobs
              </p>
            </div>

            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                B&W vs Colour Pages
              </span>
              <div className="mt-2 text-2xl font-black text-slate-900">
                {reportData.bwPages + reportData.colorPages} Pages
              </div>
              <p className="text-[11px] text-slate-500 mt-1">
                {reportData.bwPages} B&W (?{reportData.bwPages * 8}) � {reportData.colorPages} Colour (?{reportData.colorPages * 10})
              </p>
            </div>

            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                Average Customer Bill
              </span>
              <div className="mt-2 text-2xl font-black text-slate-900">
                ?{reportData.avgOrderValue.toFixed(2)}
              </div>
              <p className="text-[11px] text-slate-500 mt-1">
                Includes multi-file combined orders
              </p>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
