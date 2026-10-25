"use client";

import React, { useEffect, useState, useCallback, useMemo } from "react";
import Link from "next/link";
import AdminSidebar from "@/components/AdminSidebar";
import AdminHeader from "@/components/AdminHeader";
import LiveIncomingOrderSpotlight from "@/components/LiveIncomingOrderSpotlight";
import DocumentPreviewModal from "@/components/DocumentPreviewModal";
import { printOrderFile, printOrderSlip } from "@/lib/browser-printer";
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
import { Order, OrderFileItem, Printer as PrinterType } from "@/lib/types";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";

const SAMPLE_DEMO_ORDER: Order = {
  id: "ord-demo-1",
  order_number: "PC-3446",
  token_number: 6,
  access_token: "tok-demo",
  customer_name: "Walk-in Customer",
  customer_phone: "9825100000",
  status: "queued",
  total_amount: 13.00,
  created_at: new Date(Date.now() - 35 * 60000).toISOString(),
  updated_at: new Date().toISOString(),
  files: [
    {
      id: "f-demo-1",
      file_name: "WhatsApp Image 2026-09-06 at 10.51.48 PM (1).pdf",
      file_type: "application/pdf",
      file_size: 450000,
      page_count: 1,
      copies: 1,
      color_mode: "color",
      paper_size: "A4",
      duplex: "single",
      page_range: "all",
      effective_pages: 1,
      price: 13.00,
      status: "queued",
      printer: {
        id: "22222222-2222-2222-2222-222222222222",
        display_name: "Brother DCP-T220",
        system_name: "Brother DCP-T220",
        type: "both",
        is_active: true,
        status: "online",
      },
    },
  ],
};

export default function AdminDashboard() {
  const [stats, setStats] = useState({
    today_orders: 0,
    total_orders: 0,
    today_revenue: 0,
    all_time_revenue: 0,
    total_pages: 0,
    pending_queued: 0,
    completed_orders: 0,
    active_printers: 0,
  });

  const [printers, setPrinters] = useState<PrinterType[]>([]);
  const [recentOrders, setRecentOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<string>("");
  const [dismissedSpotlightId, setDismissedSpotlightId] = useState<string | null>(null);
  const [isPrinting, setIsPrinting] = useState(false);
  const [previewFile, setPreviewFile] = useState<OrderFileItem | null>(null);
  const [previewOrder, setPreviewOrder] = useState<Order | null>(null);

  const [shopInfo, setShopInfo] = useState({
    shop_name: "Preeti Communication",
    owner_name: "Preeti Communication",
    shop_slug: "preeti",
    is_closed: false,
  });

  const incomingSpotlightOrder = useMemo(() => {
    // 1. Look for active incoming order needing attention (payment_pending, paid, queued, printing)
    const active = recentOrders.find(
      (o) => ["payment_pending", "paid", "queued", "printing"].includes(o.status) && o.id !== dismissedSpotlightId
    );
    if (active) return active;

    // 2. If no active pending orders, check if there's a freshly placed order from the last 15 minutes
    const now = Date.now();
    const freshOrder = recentOrders.find((o) => {
      if (o.id === dismissedSpotlightId) return false;
      if (o.status === "rejected" || o.status === "cancelled") return false;
      const orderAgeMs = now - new Date(o.created_at).getTime();
      return orderAgeMs < 15 * 60 * 1000;
    });
    if (freshOrder) return freshOrder;

    return null;
  }, [recentOrders, dismissedSpotlightId]);

  const updateOrderStatus = async (orderId: string, status: string, rejectionReason?: string) => {
    try {
      const res = await fetch(`/api/orders/${orderId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status, rejection_reason: rejectionReason }),
      });
      if (res.ok) {
        setRecentOrders((prev) =>
          prev.map((o) => (o.id === orderId ? { ...o, status: status as any, rejection_reason: rejectionReason } : o))
        );
      }
    } catch (err) {
      console.error("Failed to update status:", err);
    }
  };

  const handleExpressPrint = async (order: Order) => {
    setIsPrinting(true);
    try {
      // 1. Mark printing in database
      await updateOrderStatus(order.id, "printing");

      // 2. Print all attached files
      if (order.files && order.files.length > 0) {
        for (const file of order.files) {
          await printOrderFile(file, order);
        }
      }

      // 3. Print receipt slip
      await printOrderSlip(order);

      // 4. Mark completed in database
      await updateOrderStatus(order.id, "completed");

      // 5. Dismiss this order so next in queue shows up
      setDismissedSpotlightId(order.id);

      // 6. Refresh stats & orders
      await fetchDashboardData();
    } catch (err) {
      console.error("Print error:", err);
    } finally {
      setIsPrinting(false);
    }
  };

  const handleDecline = async (order: Order) => {
    if (typeof window !== "undefined" && window.confirm(`Decline and reject order #${order.order_number} for ${order.customer_name || "Customer"}?`)) {
      await updateOrderStatus(order.id, "rejected", "Declined by shopkeeper");
      setDismissedSpotlightId(order.id);
      await fetchDashboardData();
    }
  };

  const handlePrintSlip = async (order: Order) => {
    try {
      await printOrderSlip(order);
    } catch (err) {
      console.error("Print slip error:", err);
    }
  };

  const handleOpenPreview = (file: OrderFileItem, order: Order) => {
    setPreviewFile(file);
    setPreviewOrder(order);
  };

  const fetchDashboardData = useCallback(async (isManual = false) => {
    if (isManual) setRefreshing(true);
    try {
      const statsRes = await fetch(`/api/admin/stats?t=${Date.now()}`, { 
        cache: "no-store",
        headers: { "Pragma": "no-cache", "Cache-Control": "no-cache" }
      });

      const data = await statsRes.json();
      if (data.success && data.stats) {
        setStats(data.stats);
        if (Array.isArray(data.recent_orders)) {
          setRecentOrders(data.recent_orders);
        }
        if (Array.isArray(data.printers)) {
          setPrinters(data.printers);
        }
        const now = new Date();
        setLastUpdated(now.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", second: "2-digit" }));
      }
    } catch (err) {
      console.error("Dashboard data fetch error:", err);
    } finally {
      setLoading(false);
      if (isManual) {
        setTimeout(() => setRefreshing(false), 300);
      }
    }
  }, []);

  // Fetch shop settings once on mount
  useEffect(() => {
    fetch("/api/admin/settings")
      .then((r) => r.json())
      .then((setData) => {
        if (setData?.success && setData.settings) {
          setShopInfo({
            shop_name: setData.settings.shop_name || "Preeti Communication",
            owner_name: setData.settings.owner_name || "Preeti Communication",
            shop_slug: setData.settings.shop_slug || "preeti",
            is_closed: Boolean(setData.settings.is_closed),
          });
        }
      })
      .catch((err) => console.error("Settings load error:", err));
  }, []);

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
        .on("postgres_changes", { event: "*", schema: "public", table: "order_files" }, () => {
          fetchDashboardData();
        })
        .on("postgres_changes", { event: "*", schema: "public", table: "printers" }, () => {
          fetchDashboardData();
        })
        .subscribe();
    }

    // Fast 3.5s polling loop to guarantee incoming orders appear immediately
    const interval = setInterval(() => {
      fetchDashboardData();
    }, 3500);

    return () => {
      clearInterval(interval);
      if (channel) supabase.removeChannel(channel);
    };
  }, [fetchDashboardData]);

  return (
    <div className="flex min-h-screen bg-slate-100">
      <AdminSidebar isAgentOnline={stats.active_printers > 0} />

      <div className="flex-1 flex flex-col min-w-0">
        <AdminHeader 
          title={`${shopInfo.shop_name} | Shopkeeper Overview`} 
          subtitle="Real-time operations, revenue metrics, and hardware printer readiness"
          shopName={shopInfo.shop_name}
          ownerName={shopInfo.owner_name}
          shopSlug={shopInfo.shop_slug}
          isShopClosed={shopInfo.is_closed}
        />

        <main className="p-6 space-y-6 flex-1 overflow-y-auto">
          {/* ⚡ LIVE INCOMING ORDER REQUEST - UNIQUE TOP SPOTLIGHT AT START OF DASHBOARD */}
          {incomingSpotlightOrder && (
            <LiveIncomingOrderSpotlight
              order={incomingSpotlightOrder}
              onDismiss={() => setDismissedSpotlightId(incomingSpotlightOrder.id)}
              onPreviewFile={handleOpenPreview}
              onExpressPrint={handleExpressPrint}
              onPrintSlip={handlePrintSlip}
              onDecline={handleDecline}
              isPrinting={isPrinting}
            />
          )}

          {/* Quick Status & Manual Refresh Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 bg-white px-5 py-3 rounded-2xl border border-slate-200 shadow-xs">
            <div className="flex items-center gap-2.5">
              <span className="relative flex h-2.5 w-2.5">
                <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                  stats.active_printers > 0 ? "bg-emerald-400" : "bg-amber-400"
                }`}></span>
                <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${
                  stats.active_printers > 0 ? "bg-emerald-500" : "bg-amber-500"
                }`}></span>
              </span>
              <span className="text-xs font-bold text-slate-700">
                Live Cloud Sync Active
              </span>
              {lastUpdated && (
                <span className="text-[11px] text-slate-400">
                  • Last synced at {lastUpdated}
                </span>
              )}
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => fetchDashboardData(true)}
                disabled={refreshing}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-xs font-semibold text-slate-700 transition active:scale-95 disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 text-indigo-600 ${refreshing ? "animate-spin" : ""}`} />
                <span>{refreshing ? "Refreshing..." : "Refresh Data"}</span>
              </button>
            </div>
          </div>

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
              <div className="mt-1 flex items-center justify-between text-[11px]">
                <span className="text-emerald-600 font-semibold">
                  {stats.today_orders} orders received today
                </span>
                <span className="text-slate-400">
                  All-time: ₹{stats.all_time_revenue.toFixed(2)}
                </span>
              </div>
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
                {stats.total_orders}
              </div>
              <p className="text-[11px] text-slate-500 mt-1 font-medium">
                {stats.today_orders} today • {stats.completed_orders} completed
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
                <span className="text-xs font-normal text-slate-400 capitalize">
                  ({stats.active_printers} online)
                </span>
              </h2>
              <Link
                href="/admin/printers"
                className="text-xs font-bold text-indigo-600 hover:text-indigo-800"
              >
                Manage All Printers →
              </Link>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {(printers.filter((p) => {
                const name = (p.display_name + " " + p.system_name).toLowerCase();
                return name.includes("brother") || name.includes("canon") || name.includes("cannon");
              }).length > 0
                ? printers.filter((p) => {
                    const name = (p.display_name + " " + p.system_name).toLowerCase();
                    return name.includes("brother") || name.includes("canon") || name.includes("cannon");
                  })
                : [
                    {
                      id: "11111111-1111-1111-1111-111111111111",
                      display_name: "Canon imageCLASS MF3010",
                      system_name: "Canon_MF3010",
                      type: "bw" as const,
                      status: "online" as const,
                      is_active: true,
                    },
                    {
                      id: "22222222-2222-2222-2222-222222222222",
                      display_name: "Brother DCP-T220",
                      system_name: "Brother_DCP_T220",
                      type: "both" as const,
                      status: "online" as const,
                      is_active: true,
                    },
                  ]
              ).map((printer) => {
                const isOnline = printer.status === "online";
                const isColor = (printer.display_name + " " + printer.system_name).toLowerCase().includes("brother") || printer.type === "both" || printer.type === "color";

                return (
                  <div
                    key={printer.id}
                    className="bg-white border-2 border-slate-200 rounded-2xl p-4 shadow-xs flex items-center justify-between"
                  >
                    <div className="flex items-center gap-3 min-w-0 pr-2">
                      <div
                        className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                          isColor
                            ? "bg-purple-100 text-purple-700 border border-purple-200"
                            : "bg-slate-900 text-white"
                        }`}
                      >
                        <Printer className="w-5 h-5" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <h3 className="font-bold text-slate-900 text-sm truncate">
                            {printer.display_name}
                          </h3>
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${
                            isColor ? "bg-purple-100 text-purple-800" : "bg-slate-900 text-white"
                          }`}>
                            {isColor ? "🌈 Color" : "⚫ B&W"}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 font-mono truncate mt-0.5">
                          {isColor ? "Brother Color & B&W High Resolution" : "Canon Monochrome Laser"}
                        </p>
                      </div>
                    </div>
                    <div className="shrink-0">
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                        Online
                      </span>
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
                <span>View All Orders ({stats.total_orders})</span>
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
                    <th className="py-3 px-4">Time</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {recentOrders.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-slate-400">
                        {loading ? "Loading live orders..." : "No orders recorded yet. Open customer site to place an order."}
                      </td>
                    </tr>
                  ) : (
                    recentOrders.map((ord) => {
                      const isCompleted = ord.status === "completed";
                      const isQueued = ord.status === "queued" || ord.status === "printing";
                      const isPending = ord.status === "payment_pending";

                      let timeDisplay = "";
                      try {
                        const d = new Date(ord.created_at);
                        timeDisplay = d.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
                      } catch {
                        timeDisplay = "";
                      }

                      return (
                        <tr key={ord.id} className="hover:bg-slate-50/50 transition-colors">
                          <td className="py-3 px-4 font-mono font-bold text-slate-900">
                            {ord.order_number}
                          </td>
                          <td className="py-3 px-4">
                            <div className="font-semibold text-slate-800">{ord.customer_name}</div>
                            <div className="text-slate-400 text-[11px]">{ord.customer_phone}</div>
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="font-bold text-slate-800">
                                {ord.files?.length || 1} file(s)
                              </span>
                              {ord.files?.some((f) => f.color_mode === "color") ? (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-purple-50 text-purple-700 border border-purple-200">
                                  Brother Color
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-800 border border-slate-300">
                                  Canon B&amp;W
                                </span>
                              )}
                            </div>
                            <div className="text-[11px] text-slate-400 truncate max-w-xs mt-0.5">
                              {ord.files?.map((f) => f.file_name).join(", ")}
                            </div>
                          </td>
                          <td className="py-3 px-4 font-bold text-slate-900">
                            ₹{ord.total_amount?.toFixed(2)}
                          </td>
                          <td className="py-3 px-4">
                            <span
                              className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold ${
                                isCompleted
                                  ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                  : isQueued
                                  ? "bg-indigo-50 text-indigo-700 border border-indigo-200"
                                  : isPending
                                  ? "bg-amber-50 text-amber-800 border border-amber-300 font-bold"
                                  : "bg-slate-100 text-slate-700 border border-slate-200"
                              }`}
                            >
                              {isPending && "Payment Pending"}
                              {isQueued && "Paid & In Queue"}
                              {isCompleted && "Completed"}
                              {!isPending && !isQueued && !isCompleted && ord.status}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-slate-500 text-[11px] font-mono">
                            {timeDisplay}
                          </td>
                          <td className="py-3 px-4 text-right">
                            {isPending ? (
                              <Link
                                href={`/admin/orders?order=${ord.order_number}`}
                                className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 hover:text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200"
                              >
                                <Printer className="w-3 h-3" />
                                <span>Print for {ord.customer_name.split(" ")[0]} →</span>
                              </Link>
                            ) : (
                              <Link
                                href={`/admin/orders?order=${ord.order_number}`}
                                className="font-semibold text-indigo-600 hover:text-indigo-800 text-xs"
                              >
                                Manage →
                              </Link>
                            )}
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

      <DocumentPreviewModal
        isOpen={Boolean(previewFile && previewOrder)}
        onClose={() => {
          setPreviewFile(null);
          setPreviewOrder(null);
        }}
        file={previewFile}
        order={previewOrder}
        onPrint={(file, order) => {
          printOrderFile(file, order);
        }}
      />
    </div>
  );
}
