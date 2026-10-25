"use client";

import React, { useState, useEffect, useMemo } from "react";
import AdminSidebar from "@/components/AdminSidebar";
import AdminHeader from "@/components/AdminHeader";
import { Download, Calendar, BarChart3, TrendingUp, Layers, CheckCircle, RefreshCw } from "lucide-react";
import { Order } from "@/lib/types";

export default function AdminReportsPage() {
  const [period, setPeriod] = useState<"today" | "week" | "month" | "all">("month");
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/orders");
      const data = await res.json();
      if (data.success && Array.isArray(data.orders)) {
        setOrders(data.orders);
      }
    } catch (err) {
      console.error("Error loading orders for reports:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  const filteredOrders = useMemo(() => {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    return orders.filter((o) => {
      if (o.status === "cancelled" || o.status === "rejected") return false;
      const orderDate = new Date(o.created_at);

      if (period === "today") {
        return orderDate >= startOfToday;
      }
      if (period === "week") {
        return orderDate >= startOfWeek;
      }
      if (period === "month") {
        return orderDate >= startOfMonth;
      }
      return true; // "all"
    });
  }, [orders, period]);

  const reportData = useMemo(() => {
    let totalRevenue = 0;
    let bwPages = 0;
    let colorPages = 0;

    filteredOrders.forEach((o) => {
      totalRevenue += Number(o.total_amount) || 0;
      if (Array.isArray(o.files)) {
        o.files.forEach((f) => {
          const pages = (Number(f.page_count) || 1) * (Number(f.copies) || 1);
          if (f.color_mode === "color") {
            colorPages += pages;
          } else {
            bwPages += pages;
          }
        });
      }
    });

    const totalOrders = filteredOrders.length;
    const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

    return {
      totalRevenue,
      totalOrders,
      bwPages,
      colorPages,
      avgOrderValue,
    };
  }, [filteredOrders]);

  const exportCSV = () => {
    const header = ["Order ID", "Customer Name", "Phone", "Status", "Amount (INR)", "Payment Ref", "Created At"];
    const rows = filteredOrders.map((o) => [
      `"${o.order_number}"`,
      `"${(o.customer_name || "").replace(/"/g, '""')}"`,
      `"${o.customer_phone || ""}"`,
      `"${o.status}"`,
      Number(o.total_amount || 0).toFixed(2),
      `"${o.utr_number || "N/A"}"`,
      `"${new Date(o.created_at).toLocaleString("en-IN")}"`,
    ]);

    const csvContent = "data:text/csv;charset=utf-8," + [header.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Preeti_Communication_Orders_${period}_${new Date().toISOString().slice(0, 10)}.csv`);
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
          subtitle="Real-time sales performance, print volume distribution, and CSV export from database"
        />

        <main className="p-3 sm:p-6 pb-24 md:pb-6 max-w-4xl space-y-4 sm:space-y-6 flex-1 overflow-y-auto">
          {/* Header Controls */}
          <div className="bg-white border border-slate-200 rounded-2xl p-3.5 sm:p-4 shadow-xs flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 sm:gap-4">
            <div className="flex items-center justify-between sm:justify-start gap-2 sm:gap-3 flex-wrap">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-slate-400" />
                <div className="flex gap-1 bg-slate-100 p-1 rounded-xl text-xs font-semibold">
                  {(["today", "week", "month", "all"] as const).map((p) => (
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

              <button
                type="button"
                onClick={fetchOrders}
                disabled={loading}
                className="p-1.5 text-slate-400 hover:text-indigo-600 transition-colors"
                title="Refresh Live Data"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
              </button>
            </div>
          </div>


            <button
              type="button"
              onClick={exportCSV}
              disabled={filteredOrders.length === 0}
              className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white font-bold rounded-xl text-xs flex items-center gap-2 shadow-sm transition-all"
            >
              <Download className="w-4 h-4" />
              <span>Export {filteredOrders.length} Orders (CSV)</span>
            </button>
          </div>

          {/* Metrics Overview */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                Total Period Revenue
              </span>
              <div className="mt-2 text-3xl font-black text-slate-900">
                ₹{reportData.totalRevenue.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
              <p className="text-[11px] text-emerald-600 font-semibold mt-1">
                From {reportData.totalOrders} live customer jobs
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
                {reportData.bwPages} B&W • {reportData.colorPages} Colour
              </p>
            </div>

            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                Average Customer Bill
              </span>
              <div className="mt-2 text-2xl font-black text-slate-900">
                ₹{reportData.avgOrderValue.toFixed(2)}
              </div>
              <p className="text-[11px] text-slate-500 mt-1">
                Based on active period orders
              </p>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
