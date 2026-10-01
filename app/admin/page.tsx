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
  AlertCircle 
} from "lucide-react";
import { Order, Printer as PrinterType } from "@/lib/types";
import { DEFAULT_PRINTERS } from "@/components/PrinterSelector";

export default function AdminDashboard() {
  const [stats, setStats] = useState({
    today_orders: 14,
    today_revenue: 486.00,
    bw_pages: 52,
    color_pages: 18,
    pending_payments: 2,
    active_printers: 2,
  });

  const [recentOrders, setRecentOrders] = useState<Partial<Order>[]>([
    {
      id: "1",
      order_number: "PC-1048",
      customer_name: "Amit Patel",
      customer_phone: "9825100000",
      status: "payment_pending",
      total_amount: 48.00,
      utr_number: "427819382104",
      created_at: new Date(Date.now() - 5 * 60000).toISOString(),
    },
    {
      id: "2",
      order_number: "PC-1047",
      customer_name: "Sunita Verma",
      customer_phone: "9879100000",
      status: "queued",
      total_amount: 30.00,
      utr_number: "427819381900",
      created_at: new Date(Date.now() - 15 * 60000).toISOString(),
    },
    {
      id: "3",
      order_number: "PC-1046",
      customer_name: "Karan Shah",
      customer_phone: "9426000000",
      status: "completed",
      total_amount: 80.00,
      utr_number: "427819380122",
      created_at: new Date(Date.now() - 40 * 60000).toISOString(),
    },
  ]);

  return (
    <div className="flex min-h-screen bg-slate-100">
      <AdminSidebar isAgentOnline={true} />

      <div className="flex-1 flex flex-col min-w-0">
        <AdminHeader 
          title="Preeti Communication Dashboard" 
          subtitle="Real-time operations, revenue metrics, and printer readiness"
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
                ?{stats.today_revenue.toFixed(2)}
              </div>
              <p className="text-[11px] text-emerald-600 font-semibold mt-1">
                +18% from yesterday
              </p>
            </div>

            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Today&apos;s Orders
                </span>
                <span className="p-2 rounded-xl bg-indigo-50 text-indigo-600">
                  <ShoppingBag className="w-4 h-4" />
                </span>
              </div>
              <div className="mt-2 text-2xl font-black text-slate-900">
                {stats.today_orders}
              </div>
              <p className="text-[11px] text-slate-500 mt-1">
                Average ?34.70 per customer
              </p>
            </div>

            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Pages Printed
                </span>
                <span className="p-2 rounded-xl bg-purple-50 text-purple-600">
                  <Layers className="w-4 h-4" />
                </span>
              </div>
              <div className="mt-2 text-2xl font-black text-slate-900">
                {stats.bw_pages + stats.color_pages}
              </div>
              <p className="text-[11px] text-slate-500 mt-1">
                {stats.bw_pages} B&W � {stats.color_pages} Colour
              </p>
            </div>

            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Pending Payments
                </span>
                <span className="p-2 rounded-xl bg-amber-50 text-amber-600">
                  <Clock className="w-4 h-4" />
                </span>
              </div>
              <div className="mt-2 text-2xl font-black text-amber-600">
                {stats.pending_payments}
              </div>
              <Link
                href="/admin/orders?status=payment_pending"
                className="text-[11px] text-indigo-600 font-semibold hover:underline inline-block mt-1"
              >
                Review UTRs in queue ?
              </Link>
            </div>
          </div>

          {/* Printers Status Cards */}
          <div className="space-y-3">
            <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider">
              Connected Shop Printers
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center text-slate-700">
                    <Printer className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 text-sm">Canon imageCLASS MF3010</h3>
                    <p className="text-xs text-slate-500">Monochrome Laser � System name: <code className="bg-slate-100 px-1 rounded font-mono">Canon_MF3010</code></p>
                  </div>
                </div>
                <div className="text-right">
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                    <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                    Online
                  </span>
                </div>
              </div>

              <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-purple-50 flex items-center justify-center text-purple-700">
                    <Printer className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 text-sm">Brother DCP-T220</h3>
                    <p className="text-xs text-slate-500">Colour & B&W Ink Tank � System name: <code className="bg-slate-100 px-1 rounded font-mono">Brother_DCP_T220</code></p>
                  </div>
                </div>
                <div className="text-right">
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                    <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                    Online
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Recent Orders Table */}
          <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-slate-900 text-base">Recent Orders</h3>
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
                    <th className="py-3 px-4">Order Token</th>
                    <th className="py-3 px-4">Customer</th>
                    <th className="py-3 px-4">UTR Number</th>
                    <th className="py-3 px-4">Amount</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {recentOrders.map((ord) => (
                    <tr key={ord.id} className="hover:bg-slate-50/50">
                      <td className="py-3 px-4 font-mono font-bold text-slate-900">
                        {ord.order_number}
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-semibold text-slate-800">{ord.customer_name}</div>
                        <div className="text-slate-400">{ord.customer_phone}</div>
                      </td>
                      <td className="py-3 px-4 font-mono text-slate-600">
                        {ord.utr_number || "�"}
                      </td>
                      <td className="py-3 px-4 font-bold text-slate-900">
                        ?{ord.total_amount?.toFixed(2)}
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            ord.status === "payment_pending"
                              ? "bg-amber-50 text-amber-700 border border-amber-200"
                              : ord.status === "completed"
                              ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                              : "bg-indigo-50 text-indigo-700 border border-indigo-200"
                          }`}
                        >
                          {ord.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <Link
                          href={`/admin/orders?order=${ord.order_number}`}
                          className="font-bold text-indigo-600 hover:text-indigo-800"
                        >
                          Manage ?
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
