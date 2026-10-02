"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import AdminSidebar from "@/components/AdminSidebar";
import AdminHeader from "@/components/AdminHeader";
import { 
  TrendingUp, 
  ShoppingBag, 
  Clock, 
  Printer, 
  CheckCircle, 
  ArrowRight, 
  Layers, 
  AlertCircle,
  RefreshCw,
  Zap
} from "lucide-react";
import { Order, Printer as PrinterType } from "@/lib/types";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";

export default function AdminDashboard() {
  const [stats, setStats] = useState({
    today_orders: 0,
    today_revenue: 0,
    total_pages: 0,
    pending_queued: 0,
    active_printers: 0,
  });

  const [printers, setPrinters] = useState<PrinterType[]>([]);
  const [recentOrders, setRecentOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchDashboardData = async () => {
    try {
      // 1. Fetch live printers
      const pRes = await fetch("/api/printers/live");
      const pData = await pRes.json();
      if (pData.success && Array.isArray(pData.printers)) {
        setPrinters(pData.printers);
        setStats((prev) => ({
          ...prev,
          active_printers: pData.printers.filter((p: PrinterType) => p.status === "online").length,
        }));
      }

      // 2. Fetch live orders & calculate real metrics from Supabase
      if (isSupabaseConfigured) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const todayIso = today.toISOString();

        const { data: allOrders } = await supabase
          .from("orders")
          .select("*, files:order_files(*)")
          .order("created_at", { ascending: false });

        if (allOrders) {
          setRecentOrders(allOrders.slice(0, 6) as Order[]);

          const todayOrders = allOrders.filter(
            (o) => new Date(o.created_at) >= today && o.status !== "cancelled" && o.status !== "rejected"
          );

          const revenue = todayOrders.reduce((acc, o) => acc + (Number(o.total_amount) || 0), 0);
          const queuedCount = allOrders.filter((o) => o.status === "queued" || o.status === "printing" || o.status === "payment_pending").length;

          let pagesCount = 0;
          allOrders.forEach((o) => {
            if (o.status === "completed" && Array.isArray(o.files)) {
              o.files.forEach((f: any) => {
                pagesCount += (f.effective_pages || f.page_count || 1) * (f.copies || 1);
              });
            }
          });

          setStats((prev) => ({
            ...prev,
            today_orders: todayOrders.length,
            today_revenue: revenue,
            total_pages: pagesCount,
            pending_queued: queuedCount,
          }));
        }
      }
    } catch (err) {
      console.error("Dashboard data fetch error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();

    // Subscribe to realtime orders and printers updates
    let channel: any = null;
    if (isSupabaseConfigured) {
      channel = supabase
        .channel("admin-dashboard-realtime")
        .on("postgres_changes", { event: "*", schema: "public", table: "orders" }, () => {
          fetchDashboardData();
        })
        .on("postgres_changes", { event: "*", schema: "public", table: "printers" }, () => {
          fetchDashboardData();
        })
        .subscribe();
    }

    const interval = setInterval(fetchDashboardData, 10000);
    return () => {
      clearInterval(interval);
      if (channel) supabase.removeChannel(channel);
    };
  }, []);

  return (
    <div className="flex min-h-screen bg-slate-100">
      <AdminSidebar isAgentOnline={stats.active_printers > 0} />

      <div className="flex-1 flex flex-col min-w-0">
        <AdminHeader 
          title="Preeti Communication Dashboard" 
          subtitle="Real-time operations, revenue metrics, and hardware printer readiness"
        />

        <main className="p-6 space-y-6 flex-1 overflow-y-auto">
          {/* Top Metric Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Today&apos;s Revenue
                </span>
                <span className="p-2 rounded-xl bg-emerald-50 text-emerald-600">
                  <TrendingUp className="w-4 h-4" />
                </span>
              </div>
              <div className="mt-2 text-2xl font-black text-slate-900">
                ₹{stats.today_revenue.toFixed(2)}
              </div>
              <p className="text-[11px] text-emerald-600 font-semibold mt-1">
                {stats.today_orders} orders received today
              </p>
            </div>

            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Total Orders
                </span>
                <span className="p-2 rounded-xl bg-indigo-50 text-indigo-600">
                  <ShoppingBag className="w-4 h-4" />
                </span>
              </div>
              <div className="mt-2 text-2xl font-black text-slate-900">
                {stats.today_orders}
              </div>
              <p className="text-[11px] text-slate-500 mt-1">
                Active customer print requests
              </p>
            </div>

            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Total Pages Printed
                </span>
                <span className="p-2 rounded-xl bg-purple-50 text-purple-600">
                  <Layers className="w-4 h-4" />
                </span>
              </div>
              <div className="mt-2 text-2xl font-black text-slate-900">
                {stats.total_pages}
              </div>
              <p className="text-[11px] text-slate-500 mt-1">
                Outputted on shop printers
              </p>
            </div>

            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Active Queue & Printing
                </span>
                <span className="p-2 rounded-xl bg-amber-50 text-amber-600">
                  <Clock className="w-4 h-4" />
                </span>
              </div>
              <div className="mt-2 text-2xl font-black text-amber-600">
                {stats.pending_queued}
              </div>
              <Link
                href="/admin/orders"
                className="text-[11px] text-indigo-600 font-semibold hover:underline inline-block mt-1"
              >
                Manage live queue →
              </Link>
            </div>
          </div>

          {/* Connected Hardware Printers */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                <span>Real-Time Connected Shop Printers</span>
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              </h2>
              <Link
                href="/admin/printers"
                className="text-xs font-bold text-indigo-600 hover:text-indigo-800"
              >
                Manage All Printers →
              </Link>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {printers.slice(0, 6).map((printer) => {
                const isOnline = printer.status === "online";

                return (
                  <div
                    key={printer.id}
                    className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs flex items-center justify-between"
                  >
                    <div className="flex items-center gap-3 min-w-0 pr-2">
                      <div
                        className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                          isOnline
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                            : "bg-slate-100 text-slate-400"
                        }`}
                      >
                        <Printer className="w-5 h-5" />
                      </div>
                      <div className="min-w-0">
                        <h3 className="font-bold text-slate-900 text-sm truncate">
                          {printer.display_name}
                        </h3>
                        <p className="text-[11px] text-slate-500 font-mono truncate">
                          {printer.type === "bw" ? "B&W Mono Laser" : "Color & B&W"}
                        </p>
                      </div>
                    </div>
                    <div className="shrink-0">
                      {isOnline ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                          Online
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-500 border border-slate-200">
                          Offline
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Recent Orders Table */}
          <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-slate-900 text-base">Recent Live Orders</h3>
                <p className="text-xs text-slate-500">Real-time incoming customer jobs</p>
              </div>
              <Link
                href="/admin/orders"
                className="inline-flex items-center gap-1 text-xs font-bold text-indigo-600 hover:text-indigo-800"
              >
                <span>View All Orders</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider font-semibold border-b border-slate-100">
                  <tr>
                    <th className="py-3 px-4">Order #</th>
                    <th className="py-3 px-4">Customer</th>
                    <th className="py-3 px-4">Files & Details</th>
                    <th className="py-3 px-4">Amount</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {recentOrders.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-slate-400">
                        No orders recorded yet. Open customer site to place an order.
                      </td>
                    </tr>
                  ) : (
                    recentOrders.map((ord) => {
                      const isCompleted = ord.status === "completed";
                      const isQueued = ord.status === "queued" || ord.status === "printing";

                      return (
                        <tr key={ord.id} className="hover:bg-slate-50/50">
                          <td className="py-3 px-4 font-mono font-bold text-slate-900">
                            {ord.order_number}
                          </td>
                          <td className="py-3 px-4">
                            <div className="font-semibold text-slate-800">{ord.customer_name}</div>
                            <div className="text-slate-400 text-[11px]">{ord.customer_phone}</div>
                          </td>
                          <td className="py-3 px-4">
                            <span className="font-semibold text-slate-700">
                              {ord.files?.length || 1} file(s)
                            </span>
                            <div className="text-[11px] text-slate-400 truncate max-w-xs">
                              {ord.files?.map((f) => f.file_name).join(", ")}
                            </div>
                          </td>
                          <td className="py-3 px-4 font-bold text-slate-900">
                            ₹{ord.total_amount?.toFixed(2)}
                          </td>
                          <td className="py-3 px-4">
                            <span
                              className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                                isCompleted
                                  ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                  : isQueued
                                  ? "bg-indigo-50 text-indigo-700 border border-indigo-200"
                                  : "bg-amber-50 text-amber-700 border border-amber-200"
                              }`}
                            >
                              {isQueued && <Zap className="w-3 h-3 text-indigo-600 animate-pulse" />}
                              {isCompleted && <CheckCircle className="w-3 h-3 text-emerald-600" />}
                              <span>{ord.status}</span>
                            </span>
                          </td>
                          <td className="py-3 px-4 text-right">
                            <Link
                              href={`/admin/orders?order=${ord.order_number}`}
                              className="font-bold text-indigo-600 hover:text-indigo-800"
                            >
                              Manage →
                            </Link>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
