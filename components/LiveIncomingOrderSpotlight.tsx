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
    <div className="relative rounded-2xl bg-slate-900 border border-slate-800 p-4 sm:p-5 text-white shadow-sm animate-in slide-in-from-top-3 duration-200">
      {/* Top Banner Row */}
      <div className="flex items-center justify-between gap-3 border-b border-slate-800 pb-3 mb-3.5">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
          </span>
          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider bg-emerald-950 text-emerald-300 border border-emerald-800/80 flex items-center gap-1">
            <Zap className="w-3 h-3 fill-emerald-300" />
            Live Incoming Request
          </span>
          <span className="text-xs text-slate-400">
            {formatTimeAgo(order.created_at)}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-400 font-mono hidden sm:inline">
            Ref: {order.order_number}
          </span>
          {onDismiss && (
            <button
              type="button"
              onClick={onDismiss}
              className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition cursor-pointer"
              title="Dismiss Spotlight"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-center">
        {/* Token & Customer Profile */}
        <div className="lg:col-span-4 flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-xl bg-indigo-600 text-white flex flex-col items-center justify-center shrink-0 font-black shadow-xs">
            <span className="text-[9px] uppercase font-bold tracking-wider text-indigo-200 leading-none">Token</span>
            <span className="text-xl font-black leading-none mt-0.5">
              #{order.token_number || 1}
            </span>
          </div>

          <div className="min-w-0">
            <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Customer</div>
            <h3 className="text-base sm:text-lg font-bold text-white truncate flex items-center gap-1.5">
              <span>{order.customer_name || "Walk-in Customer"}</span>
            </h3>
            <p className="text-xs text-slate-300 font-mono flex items-center gap-1 mt-0.5">
              <span>📱 +91 {order.customer_phone || "Walk-in"}</span>
            </p>
          </div>
        </div>

        {/* Document & Printer Details */}
        <div className="lg:col-span-5 space-y-2 border-y lg:border-y-0 lg:border-x border-slate-800 py-3 lg:py-0 lg:px-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Documents ({order.files?.length || 0})
            </span>
            {hasColor ? (
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-purple-950 text-purple-300 border border-purple-800">
                Brother Color
              </span>
            ) : (
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-slate-800 text-slate-200 border border-slate-700">
                Canon B&amp;W
              </span>
            )}
          </div>

          {/* Documents Pills with Quick Preview */}
          <div className="space-y-1.5 max-h-28 overflow-y-auto pr-1">
            {order.files && order.files.length > 0 ? (
              order.files.map((file, fIdx) => (
                <div
                  key={fIdx}
                  className="bg-slate-800/80 hover:bg-slate-800 border border-slate-700/80 rounded-xl px-3 py-1.5 flex items-center justify-between text-xs transition"
                >
                  <div className="flex items-center gap-2 min-w-0 pr-2">
                    <FileText className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                    <span className="font-medium text-slate-100 truncate max-w-[170px] sm:max-w-xs">
                      {file.file_name}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-[11px] text-slate-400 font-mono">
                      {file.page_count}p • {file.copies}x
                    </span>
                    {onPreviewFile && (
                      <button
                        type="button"
                        onClick={() => onPreviewFile(file, order)}
                        className="p-1 rounded-md bg-slate-700 hover:bg-slate-600 text-slate-200 hover:text-white transition cursor-pointer"
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
        <div className="lg:col-span-3 flex flex-col justify-center space-y-2.5">
          <div className="flex items-baseline justify-between lg:justify-end gap-2">
            <span className="text-xs text-slate-400 font-semibold uppercase">Total:</span>
            <span className="text-xl sm:text-2xl font-black text-white">
              ₹{Number(order.total_amount || 0).toFixed(2)}
            </span>
          </div>

          <div className="flex flex-col gap-2">
            <button
              type="button"
              disabled={isPrinting}
              onClick={() => onExpressPrint?.(order)}
              className="w-full py-2.5 px-4 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl transition flex items-center justify-center gap-2 shadow-xs cursor-pointer disabled:opacity-50"
            >
              <Printer className="w-4 h-4" />
              <span>{isPrinting ? "Printing In Progress..." : `Print for ${order.customer_name || "Customer"}`}</span>
            </button>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => onPrintSlip?.(order)}
                className="flex-1 py-1.5 px-3 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 rounded-xl text-xs font-semibold transition flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <span>Slip 🧾</span>
              </button>
              {onDecline && (
                <button
                  type="button"
                  onClick={() => onDecline(order)}
                  className="py-1.5 px-3 bg-rose-950/40 hover:bg-rose-900/50 border border-rose-800/60 text-rose-300 rounded-xl text-xs font-semibold transition cursor-pointer"
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
