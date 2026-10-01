"use client";

import React, { useEffect, useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import confetti from "canvas-confetti";
import Navbar from "@/components/Navbar";
import { Order, Language } from "@/lib/types";
import { translations } from "@/lib/translations";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import { 
  CheckCircle2, 
  Clock, 
  Printer, 
  AlertCircle, 
  PhoneCall, 
  PlusCircle, 
  Share2, 
  Sparkles, 
  Copy, 
  FileText 
} from "lucide-react";

export default function OrderTrackingPage() {
  const params = useParams();
  const router = useRouter();
  const token = params.token as string;

  const [language, setLanguage] = useState<Language>("en");
  const t = translations[language];

  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [copiedLink, setCopiedLink] = useState(false);
  const confettiFiredRef = useRef(false);

  // Fetch order function
  const fetchOrder = async () => {
    try {
      const res = await fetch(`/api/orders/${token}`);
      if (!res.ok) {
        throw new Error("Order not found");
      }
      const data = await res.json();
      setOrder(data.order);
    } catch (err) {
      console.error("Fetch order error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrder();

    // Set up Realtime subscription if Supabase is configured
    let subscription: any = null;

    if (isSupabaseConfigured) {
      subscription = supabase
        .channel(`order_tracking_${token}`)
        .on(
          "postgres_changes",
          {
            event: "UPDATE",
            schema: "public",
            table: "orders",
          },
          (payload) => {
            if (
              payload.new &&
              (payload.new.access_token === token ||
                payload.new.id === token ||
                payload.new.order_number === token)
            ) {
              setOrder((prev) => (prev ? ({ ...prev, ...payload.new } as Order) : (payload.new as Order)));
            }
          }
        )
        .subscribe();
    }

    // Polling fallback every 4 seconds
    const interval = setInterval(fetchOrder, 4000);

    return () => {
      clearInterval(interval);
      if (subscription) {
        supabase.removeChannel(subscription);
      }
    };
  }, [token]);

  // Trigger celebration confetti when order status becomes "completed"
  useEffect(() => {
    if (order?.status === "completed" && !confettiFiredRef.current) {
      confettiFiredRef.current = true;
      confetti({
        particleCount: 120,
        spread: 70,
        origin: { y: 0.6 },
      });
    }
  }, [order?.status]);

  const copyOrderLink = () => {
    if (typeof window !== "undefined") {
      navigator.clipboard.writeText(window.location.href);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col bg-slate-50">
        <Navbar language={language} onLanguageChange={setLanguage} />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center space-y-3">
            <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
            <p className="text-sm font-semibold text-slate-600">Loading order details...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-screen flex flex-col bg-slate-50">
        <Navbar language={language} onLanguageChange={setLanguage} />
        <div className="flex-1 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-3xl p-8 max-w-md w-full text-center space-y-4">
            <div className="w-14 h-14 bg-rose-100 text-rose-600 rounded-full flex items-center justify-center mx-auto">
              <AlertCircle className="w-8 h-8" />
            </div>
            <h2 className="text-xl font-bold text-slate-800">Order Not Found</h2>
            <p className="text-sm text-slate-500">
              We couldn&apos;t find an order matching &quot;{token}&quot;. Please check the order token or contact the shop counter.
            </p>
            <button
              onClick={() => router.push("/")}
              className="w-full py-3 bg-indigo-600 text-white font-bold rounded-xl"
            >
              Start New Print Order
            </button>
          </div>
        </div>
      </div>
    );
  }

  const statusSteps = [
    { key: "payment_pending", label: t.status_payment_pending },
    { key: "paid", label: t.status_paid },
    { key: "queued", label: t.status_queued },
    { key: "printing", label: t.status_printing },
    { key: "completed", label: t.status_completed },
  ];

  const getStepStatus = (stepKey: string) => {
    const orderStatus = order.status;
    if (orderStatus === "rejected") return "rejected";
    if (orderStatus === "cancelled") return "cancelled";

    const keys = ["payment_pending", "paid", "queued", "printing", "completed"];
    const currentIdx = keys.indexOf(orderStatus);
    const stepIdx = keys.indexOf(stepKey);

    if (currentIdx > stepIdx) return "finished";
    if (currentIdx === stepIdx) return "active";
    return "pending";
  };

  const isCompleted = order.status === "completed";
  const isRejected = order.status === "rejected";

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-slate-50 to-indigo-50/20">
      <Navbar language={language} onLanguageChange={setLanguage} />

      <main className="flex-1 max-w-2xl w-full mx-auto px-4 py-6 sm:py-8 space-y-6">
        {/* Top Header Card */}
        <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-xs text-center space-y-3 relative overflow-hidden">
          {isCompleted && (
            <div className="absolute top-0 inset-x-0 bg-emerald-500 text-white py-1 text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-1">
              <Sparkles className="w-3.5 h-3.5" />
              Prints Ready for Counter Pickup
            </div>
          )}

          <div className="pt-2">
            <span className="text-xs font-bold text-indigo-600 uppercase tracking-widest">
              Live Print Token
            </span>
            <h1 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight font-mono mt-1">
              {order.order_number}
            </h1>
            <p className="text-xs text-slate-500 mt-1">
              Customer: <strong>{order.customer_name}</strong> � +91 {order.customer_phone}
            </p>
          </div>

          <div className="flex items-center justify-center gap-2 pt-2">
            <button
              type="button"
              onClick={copyOrderLink}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors"
            >
              <Copy className="w-3.5 h-3.5" />
              <span>{copiedLink ? "Link Copied!" : "Share / Bookmark Tracking Link"}</span>
            </button>
          </div>
        </div>

        {/* Counter Pickup Celebratory Banner */}
        {isCompleted && (
          <div className="bg-gradient-to-r from-emerald-500 to-teal-600 rounded-3xl p-6 text-white text-center shadow-lg shadow-emerald-500/20 space-y-2 animate-in zoom-in-95 duration-200">
            <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-7 h-7 text-white" />
            </div>
            <h2 className="text-xl font-black">
              {t.status_completed}
            </h2>
            <p className="text-sm text-emerald-100 max-w-md mx-auto">
              {t.collect_notice}
            </p>
          </div>
        )}

        {/* Rejected Banner */}
        {isRejected && (
          <div className="bg-rose-50 border border-rose-200 rounded-3xl p-6 text-center space-y-2">
            <div className="w-12 h-12 bg-rose-100 text-rose-600 rounded-2xl flex items-center justify-center mx-auto">
              <AlertCircle className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-rose-800">
              Payment Verification Failed
            </h3>
            <p className="text-xs text-rose-700">
              {order.rejection_reason || "The transaction ID or amount could not be verified. Please visit the counter."}
            </p>
          </div>
        )}

        {/* Status Stepper Pipeline */}
        <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-xs space-y-6">
          <h3 className="font-bold text-slate-900 text-base border-b border-slate-100 pb-3">
            {t.order_status_title}
          </h3>

          <div className="space-y-4">
            {statusSteps.map((step, idx) => {
              const state = getStepStatus(step.key);

              return (
                <div key={step.key} className="flex items-start gap-4 relative">
                  {idx !== statusSteps.length - 1 && (
                    <div
                      className={`absolute left-4 top-8 -bottom-4 w-0.5 ${
                        state === "finished" ? "bg-emerald-500" : "bg-slate-200"
                      }`}
                    />
                  )}

                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 z-10 font-bold text-xs transition-colors ${
                      state === "finished"
                        ? "bg-emerald-500 text-white"
                        : state === "active"
                        ? "bg-indigo-600 text-white ring-4 ring-indigo-100 animate-pulse"
                        : "bg-slate-100 text-slate-400"
                    }`}
                  >
                    {state === "finished" ? "?" : idx + 1}
                  </div>

                  <div className="flex-1 pt-1">
                    <h4
                      className={`text-sm font-bold ${
                        state === "active"
                          ? "text-indigo-600"
                          : state === "finished"
                          ? "text-slate-800"
                          : "text-slate-400"
                      }`}
                    >
                      {step.label}
                    </h4>

                    {state === "active" && step.key === "payment_pending" && (
                      <p className="text-xs text-slate-500 mt-0.5">
                        Shopkeeper is matching UTR <strong>{order.utr_number}</strong> with bank records...
                      </p>
                    )}

                    {state === "active" && step.key === "printing" && (
                      <p className="text-xs text-indigo-600 font-medium mt-0.5 flex items-center gap-1.5">
                        <Printer className="w-3.5 h-3.5 animate-bounce" />
                        Printing job in progress on shop printer...
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Order Details & Summary Card */}
        <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <span className="font-bold text-slate-800 text-sm">Order Summary</span>
            <span className="text-base font-black text-indigo-600">
              Total: ?{order.total_amount.toFixed(2)}
            </span>
          </div>

          <div className="space-y-2">
            {order.files?.map((f, i) => (
              <div key={i} className="flex items-center justify-between text-xs py-1.5 border-b border-slate-50 last:border-0">
                <div className="flex items-center gap-2 truncate max-w-[240px] sm:max-w-md">
                  <FileText className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span className="font-medium text-slate-700 truncate">{f.file_name}</span>
                </div>
                <div className="text-slate-500 shrink-0">
                  {f.page_count}p � {f.copies}x � {f.color_mode.toUpperCase()}
                </div>
              </div>
            ))}
          </div>

          <div className="pt-2 text-xs text-slate-400 flex items-center justify-between">
            <span>UTR: {order.utr_number || "N/A"}</span>
            <span>{new Date(order.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-3 pt-2">
          <a
            href="tel:+919876543210"
            className="flex-1 py-3 px-4 border border-slate-300 hover:bg-slate-50 text-slate-700 font-bold rounded-2xl transition-colors flex items-center justify-center gap-2 text-sm shadow-xs"
          >
            <PhoneCall className="w-4 h-4 text-emerald-600" />
            <span>{t.call_shop}</span>
          </a>

          <button
            type="button"
            onClick={() => router.push("/")}
            className="flex-1 py-3 px-4 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-2xl shadow-md shadow-indigo-600/20 transition-all flex items-center justify-center gap-2 text-sm"
          >
            <PlusCircle className="w-4 h-4" />
            <span>{t.print_another}</span>
          </button>
        </div>
      </main>
    </div>
  );
}
