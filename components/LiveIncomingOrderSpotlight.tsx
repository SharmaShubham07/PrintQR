"use client";

import React from "react";
import { Order, OrderFileItem } from "@/lib/types";
import { Zap, X, FileText, Eye, Check, Printer } from "lucide-react";

interface Props {
  order: Order;
  onDismiss?: () => void;
  onPreviewFile?: (file: OrderFileItem, order: Order) => void;
  onExpressPrint?: (order: Order) => void;
  onPrintSlip?: (order: Order) => void;
  onDecline?: (order: Order) => void;
  isPrinting?: boolean;
}

export default function LiveIncomingOrderSpotlight({
  order,
  onDismiss,
  onPreviewFile,
  onExpressPrint,
  onPrintSlip,
  onDecline,
  isPrinting = false,
}: Props) {
  const formatTimeAgo = (dateStr: string) => {
    if (!dateStr) return "Just now";
    const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
    if (diff < 60) return "Just now";
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    return `${Math.floor(diff / 3600)}h ago`;
  };

  const hasColor = order.files?.some((f) => f.color_mode === "color");

  return (
    <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 border-2 border-indigo-500/40 shadow-2xl p-5 sm:p-6 text-white animate-in slide-in-from-top-4 duration-300">
      {/* Background ambient glow */}
      <div className="absolute -top-24 -right-24 w-60 h-60 bg-indigo-500/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-24 -left-24 w-60 h-60 bg-cyan-500/15 rounded-full blur-3xl pointer-events-none" />

      {/* Top Banner Row */}
      <div className="flex items-center justify-between gap-3 border-b border-white/10 pb-4 mb-4">
        <div className="flex items-center gap-2.5 flex-wrap">
          <span className="relative flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
          </span>
          <span className="px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 flex items-center gap-1.5 shadow-xs">
            <Zap className="w-3.5 h-3.5 fill-emerald-300" />
            LIVE INCOMING ORDER REQUEST
          </span>
          <span className="text-xs text-slate-400 font-medium">
            Received {formatTimeAgo(order.created_at)}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-indigo-300 font-mono hidden sm:inline">
            Ref: {order.order_number}
          </span>
          {onDismiss && (
            <button
              type="button"
              onClick={onDismiss}
              className="p-1.5 text-slate-400 hover:text-white rounded-xl hover:bg-white/10 transition cursor-pointer"
              title="Dismiss Spotlight"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-center">
        {/* Token & Customer Profile */}
        <div className="lg:col-span-4 flex items-center gap-4">
          <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-3xl bg-gradient-to-tr from-indigo-500 to-violet-500 border border-indigo-400/40 flex flex-col items-center justify-center shrink-0 shadow-lg shadow-indigo-500/30">
            <span className="text-[10px] font-bold text-indigo-200 uppercase tracking-widest">TOKEN</span>
            <span className="text-3xl sm:text-4xl font-black text-white leading-none">
              #{order.token_number || 1}
            </span>
          </div>

          <div className="min-w-0">
            <h3 className="text-lg sm:text-xl font-black text-white truncate">
              {order.customer_name || "Walk-in Customer"}
            </h3>
            <p className="text-xs text-slate-300 font-mono mt-0.5 flex items-center gap-1.5">
              <span>📱 +91 {order.customer_phone || "Walk-in"}</span>
            </p>
            <div className="mt-1.5 flex items-center gap-2">
              <span
                className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                  order.status === "payment_pending"
                    ? "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                    : "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                }`}
              >
                {order.status === "payment_pending" ? "⏳ Payment Awaiting Verification" : "✅ Payment Verified"}
              </span>
            </div>
          </div>
        </div>

        {/* Document & Printer Details */}
        <div className="lg:col-span-5 space-y-2 border-y lg:border-y-0 lg:border-x border-white/10 py-3 lg:py-0 lg:px-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Documents ({order.files?.length || 0})
            </span>
            {hasColor ? (
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-black uppercase bg-gradient-to-r from-pink-500 to-rose-500 text-white shadow-xs">
                🌈 Brother DCP-T220 Color
              </span>
            ) : (
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-black uppercase bg-slate-800 text-white border border-slate-700 shadow-xs">
                ⚫ Canon MF3010 B&amp;W Laser
              </span>
            )}
          </div>

          {/* Documents Pills with Quick Preview */}
          <div className="space-y-1.5 max-h-32 overflow-y-auto pr-1">
            {order.files && order.files.length > 0 ? (
              order.files.map((file, fIdx) => (
                <div
                  key={fIdx}
                  className="bg-white/10 hover:bg-white/15 border border-white/10 rounded-xl px-3 py-1.5 flex items-center justify-between text-xs transition"
                >
                  <div className="flex items-center gap-2 min-w-0 pr-2">
                    <FileText className="w-3.5 h-3.5 text-indigo-300 shrink-0" />
                    <span className="font-semibold text-white truncate max-w-[170px] sm:max-w-xs">
                      {file.file_name}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-[11px] text-slate-300 font-mono">
                      {file.page_count}p • {file.copies}x
                    </span>
                    {onPreviewFile && (
                      <button
                        type="button"
                        onClick={() => onPreviewFile(file, order)}
                        className="p-1 rounded-md bg-white/10 hover:bg-white/20 text-indigo-300 hover:text-white transition cursor-pointer"
                        title="Preview Document"
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <div className="text-xs text-slate-400 italic py-1">No documents attached</div>
            )}
          </div>
        </div>

        {/* Amount & Primary Action Buttons */}
        <div className="lg:col-span-3 flex flex-col justify-center space-y-3">
          <div className="flex items-baseline justify-between lg:justify-end gap-2">
            <span className="text-xs text-slate-400 font-bold uppercase">Total Bill:</span>
            <span className="text-2xl sm:text-3xl font-black text-white">
              ₹{Number(order.total_amount || 0).toFixed(2)}
            </span>
          </div>

          <div className="flex flex-col gap-2">
            <button
              type="button"
              disabled={isPrinting}
              onClick={() => onExpressPrint?.(order)}
              className="w-full py-3 px-4 bg-gradient-to-r from-cyan-400 via-indigo-400 to-violet-400 hover:from-cyan-300 hover:to-violet-300 text-slate-950 font-black text-xs rounded-xl transition flex items-center justify-center gap-2 shadow-lg shadow-indigo-500/25 cursor-pointer disabled:opacity-50"
            >
              <Printer className="w-4 h-4 fill-current" />
              <span>{isPrinting ? "Printing In Progress..." : "1-Click Express Print"}</span>
            </button>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => onPrintSlip?.(order)}
                className="flex-1 py-2 px-3 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <span>Print Slip 🧾</span>
              </button>
              {onDecline && (
                <button
                  type="button"
                  onClick={() => onDecline(order)}
                  className="py-2 px-3 bg-rose-500/20 hover:bg-rose-500/30 border border-rose-500/40 text-rose-300 rounded-xl text-xs font-bold transition cursor-pointer"
                >
                  Decline
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
