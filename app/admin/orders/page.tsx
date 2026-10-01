"use client";

import React, { useEffect, useState, useRef } from "react";
import AdminSidebar from "@/components/AdminSidebar";
import AdminHeader from "@/components/AdminHeader";
import { Order, OrderStatus } from "@/lib/types";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import { playNewOrderChime } from "@/lib/audio";
import { 
  Search, 
  Filter, 
  Check, 
  X, 
  Printer, 
  FileText, 
  ExternalLink, 
  Download, 
  Eye, 
  CheckCircle2, 
  RotateCcw, 
  Clock, 
  AlertTriangle 
} from "lucide-react";

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [rejectionModalOpen, setRejectionModalOpen] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");
  const prevOrderCountRef = useRef(0);

  const fetchOrders = async () => {
    try {
      if (isSupabaseConfigured) {
        const { data, error } = await supabase
          .from("orders")
          .select(`
            *,
            files:order_files(
              *,
              printer:printers(id, display_name, system_name)
            )
          `)
          .order("created_at", { ascending: false });

        if (!error && data) {
          if (data.length > prevOrderCountRef.current && prevOrderCountRef.current > 0) {
            playNewOrderChime();
          }
          prevOrderCountRef.current = data.length;
          setOrders(data as Order[]);
        }
      } else {
        // Mock fallback orders
        const mockList: Order[] = [
          {
            id: "ord-1",
            order_number: "PC-1048",
            access_token: "tok-1",
            customer_name: "Amit Patel",
            customer_phone: "9825100000",
            customer_note: "Please staple properly",
            status: "payment_pending",
            total_amount: 48.00,
            utr_number: "427819382104",
            created_at: new Date(Date.now() - 3 * 60000).toISOString(),
            updated_at: new Date().toISOString(),
            files: [
              {
                file_name: "Aadhaar_Card_Front_Back.pdf",
                file_type: "application/pdf",
                file_size: 450000,
                page_count: 2,
                copies: 3,
                color_mode: "bw",
                paper_size: "A4",
                duplex: "single",
                page_range: "all",
                effective_pages: 2,
                price: 48.00,
                status: "pending",
              },
            ],
          },
          {
            id: "ord-2",
            order_number: "PC-1047",
            access_token: "tok-2",
            customer_name: "Sunita Verma",
            customer_phone: "9879100000",
            status: "queued",
            total_amount: 30.00,
            utr_number: "427819381900",
            created_at: new Date(Date.now() - 15 * 60000).toISOString(),
            updated_at: new Date().toISOString(),
            files: [
              {
                file_name: "Project_Presentation_Charts.pptx",
                file_type: "application/vnd.ms-powerpoint",
                file_size: 1540000,
                page_count: 3,
                copies: 1,
                color_mode: "color",
                paper_size: "A4",
                duplex: "single",
                page_range: "all",
                effective_pages: 3,
                price: 30.00,
                status: "queued",
              },
            ],
          },
        ];
        setOrders(mockList);
        prevOrderCountRef.current = mockList.length;
      }
    } catch (err) {
      console.error("Error fetching admin orders:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();

    let subscription: any = null;
    if (isSupabaseConfigured) {
      subscription = supabase
        .channel("admin_orders_channel")
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "orders" },
          () => fetchOrders()
        )
        .subscribe();
    }

    const interval = setInterval(fetchOrders, 5000);
    return () => {
      clearInterval(interval);
      if (subscription) supabase.removeChannel(subscription);
    };
  }, []);

  const updateOrderStatus = async (orderId: string, status: OrderStatus, reason?: string) => {
    try {
      const res = await fetch(`/api/orders/${orderId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status,
          rejection_reason: reason,
        }),
      });

      if (res.ok) {
        setOrders((prev) =>
          prev.map((o) => (o.id === orderId ? { ...o, status, rejection_reason: reason } : o))
        );
        if (selectedOrder?.id === orderId) {
          setSelectedOrder((prev) => (prev ? { ...prev, status, rejection_reason: reason } : null));
        }
      }
    } catch (err) {
      console.error("Update status error:", err);
    }
  };

  const handleConfirmPayment = (orderId: string) => {
    // When confirmed, status becomes "queued" so the print agent picks it up
    updateOrderStatus(orderId, "queued");
  };

  const handleRejectPayment = () => {
    if (!selectedOrder) return;
    updateOrderStatus(selectedOrder.id, "rejected", rejectionReason || "UTR verification failed");
    setRejectionModalOpen(false);
    setRejectionReason("");
  };

  const filteredOrders = orders.filter((o) => {
    const matchesStatus = statusFilter === "all" || o.status === statusFilter;
    const matchesSearch =
      o.customer_name.toLowerCase().includes(search.toLowerCase()) ||
      o.customer_phone.includes(search) ||
      o.order_number.toLowerCase().includes(search.toLowerCase()) ||
      (o.utr_number && o.utr_number.includes(search));
    return matchesStatus && matchesSearch;
  });

  return (
    <div className="flex min-h-screen bg-slate-100">
      <AdminSidebar isAgentOnline={true} />

      <div className="flex-1 flex flex-col min-w-0">
        <AdminHeader
          title="Live Orders Management"
          subtitle="Real-time order verification, UTR matching, and automated printing control"
        />

        <main className="p-6 space-y-4 flex-1 overflow-y-auto">
          {/* Filters Bar */}
          <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="relative w-full sm:w-80">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by Token, Name, Phone, or UTR..."
                className="w-full pl-9 pr-3 py-2 text-xs border border-slate-300 rounded-xl outline-none focus:border-indigo-500"
              />
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto">
              {[
                { key: "all", label: "All" },
                { key: "payment_pending", label: "Payment Pending" },
                { key: "queued", label: "Queued" },
                { key: "printing", label: "Printing" },
                { key: "completed", label: "Completed" },
                { key: "rejected", label: "Rejected" },
              ].map((f) => (
                <button
                  key={f.key}
                  type="button"
                  onClick={() => setStatusFilter(f.key)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors ${
                    statusFilter === f.key
                      ? "bg-indigo-600 text-white shadow-xs"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          {/* Orders Table */}
          <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider font-semibold border-b border-slate-100">
                  <tr>
                    <th className="py-3 px-4">Order Token</th>
                    <th className="py-3 px-4">Customer</th>
                    <th className="py-3 px-4">UTR Number</th>
                    <th className="py-3 px-4">Files & Pages</th>
                    <th className="py-3 px-4">Total Amount</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Quick Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredOrders.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-slate-400">
                        No orders matching the current filter.
                      </td>
                    </tr>
                  ) : (
                    filteredOrders.map((ord) => {
                      const totalPages = ord.files?.reduce((acc, f) => acc + f.effective_pages * f.copies, 0) || 0;

                      return (
                        <tr
                          key={ord.id}
                          className="hover:bg-indigo-50/20 cursor-pointer transition-colors"
                          onClick={() => setSelectedOrder(ord)}
                        >
                          <td className="py-3 px-4 font-mono font-bold text-slate-900">
                            {ord.order_number}
                          </td>
                          <td className="py-3 px-4">
                            <div className="font-semibold text-slate-800">{ord.customer_name}</div>
                            <div className="text-slate-400">{ord.customer_phone}</div>
                          </td>
                          <td className="py-3 px-4 font-mono font-medium text-slate-700">
                            {ord.utr_number || "�"}
                          </td>
                          <td className="py-3 px-4">
                            <span className="font-medium text-slate-700">
                              {ord.files?.length || 1} file(s) � {totalPages} pages
                            </span>
                          </td>
                          <td className="py-3 px-4 font-black text-slate-900">
                            ?{ord.total_amount?.toFixed(2)}
                          </td>
                          <td className="py-3 px-4">
                            <span
                              className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                ord.status === "payment_pending"
                                  ? "bg-amber-100 text-amber-800 border border-amber-200 animate-pulse"
                                  : ord.status === "completed"
                                  ? "bg-emerald-100 text-emerald-800 border border-emerald-200"
                                  : ord.status === "queued"
                                  ? "bg-sky-100 text-sky-800 border border-sky-200"
                                  : ord.status === "printing"
                                  ? "bg-purple-100 text-purple-800 border border-purple-200"
                                  : "bg-rose-100 text-rose-800 border border-rose-200"
                              }`}
                            >
                              {ord.status.replace("_", " ")}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-right space-x-1" onClick={(e) => e.stopPropagation()}>
                            {ord.status === "payment_pending" && (
                              <>
                                <button
                                  type="button"
                                  onClick={() => handleConfirmPayment(ord.id)}
                                  className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold text-[11px] shadow-xs"
                                >
                                  Confirm & Print
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setSelectedOrder(ord);
                                    setRejectionModalOpen(true);
                                  }}
                                  className="px-2 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-lg font-bold text-[11px] border border-rose-200"
                                >
                                  Reject
                                </button>
                              </>
                            )}

                            {ord.status === "queued" && (
                              <button
                                type="button"
                                onClick={() => updateOrderStatus(ord.id, "printing")}
                                className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-bold text-[11px]"
                              >
                                Print Now
                              </button>
                            )}

                            {ord.status === "printing" && (
                              <button
                                type="button"
                                onClick={() => updateOrderStatus(ord.id, "completed")}
                                className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold text-[11px]"
                              >
                                Mark Ready
                              </button>
                            )}

                            <button
                              type="button"
                              onClick={() => setSelectedOrder(ord)}
                              className="px-2 py-1 text-slate-500 hover:text-indigo-600 hover:bg-slate-100 rounded-lg text-[11px] font-semibold"
                            >
                              Details
                            </button>
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

      {/* Order Detail Modal / Drawer */}
      {selectedOrder && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-xl w-full max-h-[90vh] overflow-y-auto p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <span className="text-xs font-bold text-indigo-600 uppercase tracking-widest font-mono">
                  {selectedOrder.order_number}
                </span>
                <h3 className="text-lg font-bold text-slate-900">
                  {selectedOrder.customer_name}
                </h3>
                <p className="text-xs text-slate-500">
                  Phone: +91 {selectedOrder.customer_phone}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedOrder(null)}
                className="p-2 text-slate-400 hover:text-slate-700 rounded-xl hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Payment & UTR Box */}
            <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-500 uppercase">UTR / Reference ID</span>
                <span className="text-sm font-mono font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200">
                  {selectedOrder.utr_number || "Not provided"}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs text-slate-600">
                <span>Amount Paid</span>
                <span className="text-base font-black text-slate-900">?{selectedOrder.total_amount.toFixed(2)}</span>
              </div>
              {selectedOrder.customer_note && (
                <div className="pt-2 border-t border-slate-200 text-xs text-slate-600">
                  <strong>Customer Note:</strong> {selectedOrder.customer_note}
                </div>
              )}
            </div>

            {/* Files List */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                Print Documents ({selectedOrder.files?.length || 0})
              </h4>
              <div className="space-y-2">
                {selectedOrder.files?.map((f, i) => (
                  <div key={i} className="bg-white border border-slate-200 rounded-xl p-3 text-xs space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-800 truncate max-w-xs">{f.file_name}</span>
                      <span className="font-bold text-indigo-600">?{f.price.toFixed(2)}</span>
                    </div>
                    <div className="flex flex-wrap gap-2 text-slate-500 text-[11px]">
                      <span>{f.page_count} pages (Range: {f.page_range})</span>
                      <span>�</span>
                      <span>{f.copies} copies</span>
                      <span>�</span>
                      <span className="font-semibold text-slate-700 uppercase">{f.color_mode}</span>
                      <span>�</span>
                      <span>{f.duplex}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="pt-3 border-t border-slate-100 flex flex-wrap gap-2 justify-end">
              {selectedOrder.status === "payment_pending" && (
                <>
                  <button
                    type="button"
                    onClick={() => {
                      setRejectionModalOpen(true);
                    }}
                    className="px-4 py-2 text-xs font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 rounded-xl border border-rose-200"
                  >
                    Reject Payment
                  </button>
                  <button
                    type="button"
                    onClick={() => handleConfirmPayment(selectedOrder.id)}
                    className="px-5 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-xs"
                  >
                    Confirm & Send to Print
                  </button>
                </>
              )}

              {selectedOrder.status === "queued" && (
                <button
                  type="button"
                  onClick={() => updateOrderStatus(selectedOrder.id, "printing")}
                  className="px-5 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-xs"
                >
                  Send to Printer
                </button>
              )}

              {selectedOrder.status === "printing" && (
                <button
                  type="button"
                  onClick={() => updateOrderStatus(selectedOrder.id, "completed")}
                  className="px-5 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-xs"
                >
                  Mark Completed
                </button>
              )}

              {selectedOrder.status === "completed" && (
                <button
                  type="button"
                  onClick={() => updateOrderStatus(selectedOrder.id, "queued")}
                  className="px-4 py-2 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl"
                >
                  Reprint Order
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Reject Payment Reason Modal */}
      {rejectionModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-5 space-y-4">
            <h3 className="text-base font-bold text-slate-900">Reject Payment</h3>
            <p className="text-xs text-slate-500">
              Provide a reason for rejecting this payment (e.g. UTR mismatch, wrong amount).
            </p>
            <textarea
              rows={3}
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              placeholder="e.g. UTR not received in bank account / Amount mismatch"
              className="w-full p-2.5 text-xs border border-slate-300 rounded-xl outline-none focus:border-rose-500"
            />
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setRejectionModalOpen(false)}
                className="px-3 py-1.5 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-lg"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleRejectPayment}
                className="px-4 py-1.5 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-lg"
              >
                Confirm Reject
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
