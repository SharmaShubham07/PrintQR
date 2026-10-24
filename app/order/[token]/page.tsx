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
  const [retryUtr, setRetryUtr] = useState("");
  const [isResubmitting, setIsResubmitting] = useState(false);
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

  const handleResubmitPayment = async (newUtr?: string) => {
    if (!order) return;
    setIsResubmitting(true);
    try {
      const finalUtr = newUtr?.trim() || retryUtr.trim() || `RETRY-${Date.now().toString().slice(-6)}`;
      const res = await fetch(`/api/orders/${order.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: "payment_pending",
          utr_number: finalUtr,
          rejection_reason: null,
        }),
      });

      if (res.ok) {
        setOrder((prev) => prev ? ({ ...prev, status: "payment_pending", utr_number: finalUtr, rejection_reason: undefined }) : null);
        setRetryUtr("");
      }
    } catch (err) {
      console.error("Resubmit payment error:", err);
    } finally {
      setIsResubmitting(false);
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
        {/* Top Header Ticket Stub (Neo-Card Concert Ticket) */}
        <div className="neo-card p-6 sm:p-8 bg-white text-center space-y-4 relative overflow-hidden">
          {isCompleted && (
            <div className="absolute top-0 inset-x-0 bg-emerald-400 border-b-2 border-slate-900 text-slate-950 py-1.5 text-xs font-black uppercase tracking-wider flex items-center justify-center gap-1.5 shadow-sm">
              <Sparkles className="w-4 h-4 fill-slate-950 stroke-[2.5]" />
              🎉 Ready for Pickup at Counter!
            </div>
          )}

          <div className={isCompleted ? "pt-5" : "pt-1"}>
            <div className="flex flex-wrap items-center justify-center gap-2 mb-2">
              <span className="sticker-badge bg-yellow-300 text-slate-950 text-xs rotate-[-2deg]">
                🎟️ TOKEN NUMBER
              </span>
              <span className="sticker-badge bg-pink-200 text-pink-950 text-xs rotate-[1deg]">
                EXPRESS COUNTER
              </span>
            </div>

            <div className="flex items-center justify-center gap-3 my-2">
              <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-3xl bg-yellow-300 border-3 border-slate-900 shadow-[4px_4px_0px_0px_#0f172a] flex items-center justify-center text-4xl sm:text-5xl font-black text-slate-950">
                #{order.token_number || 1}
              </div>
            </div>

            <h2 className="text-base sm:text-lg font-black text-slate-900 mt-2">
              Order Ref: <span className="font-mono bg-slate-100 border-2 border-slate-900 px-2 py-0.5 rounded-lg">{order.order_number}</span>
            </h2>
            <p className="text-xs font-bold text-slate-600 mt-1">
              Customer: <strong>{order.customer_name}</strong> • +91 {order.customer_phone}
            </p>
          </div>

          {/* Perforated dashed divider */}
          <div className="border-t-2 border-dashed border-slate-900/30 pt-3 flex items-center justify-center gap-2">
            <button
              type="button"
              onClick={copyOrderLink}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-black bg-slate-100 hover:bg-yellow-200 border-2 border-slate-900 shadow-[2px_2px_0px_0px_#0f172a] text-slate-900 transition-all cursor-pointer"
            >
              <Copy className="w-3.5 h-3.5 stroke-[2.5]" />
              <span>{copiedLink ? "Link Copied! 📋" : "Share / Bookmark Tracking Link"}</span>
            </button>
          </div>
        </div>

        {/* Live Queue Position Card (Neo-Card Alert) */}
        {!isCompleted && !isRejected && (
          <div className={`rounded-3xl p-6 text-center border-2 border-slate-900 shadow-[4px_4px_0px_0px_#0f172a] space-y-2 ${
            order.status === "payment_pending"
              ? "bg-amber-100 text-amber-950"
              : order.status === "printing"
              ? "bg-indigo-100 text-indigo-950"
              : (order.people_ahead === 0 || order.people_ahead === undefined)
              ? "bg-emerald-100 text-emerald-950"
              : "bg-sky-100 text-sky-950"
          }`}>
            <div className="w-14 h-14 rounded-2xl border-2 border-slate-900 flex items-center justify-center mx-auto bg-white shadow-[2px_2px_0px_0px_#0f172a] text-2xl">
              {order.status === "payment_pending" ? "⏳" : order.status === "printing" ? "🖨️" : (order.people_ahead === 0 ? "✨" : "👥")}
            </div>

            <h3 className="text-xl font-black tracking-tight">
              {order.status === "payment_pending"
                ? "Waiting for Shopkeeper Approval"
                : order.status === "printing"
                ? "Your Documents are Printing Now!"
                : (order.people_ahead === 0 || order.people_ahead === undefined)
                ? "You are Next in Line!"
                : `${order.people_ahead} customer${order.people_ahead > 1 ? "s" : ""} ahead of you`}
            </h3>

            <p className="text-xs font-bold opacity-90 max-w-sm mx-auto leading-relaxed">
              {order.status === "payment_pending"
                ? "The shopkeeper must verify and accept your files at the counter before printing."
                : order.status === "printing"
                ? "Collecting copies from shop printer. Please approach the counter."
                : (order.people_ahead === 0 || order.people_ahead === undefined)
                ? "Your files are ready at the counter. Please wait a moment."
                : "Please wait a moment at the counter. Your token will be called shortly."}
            </p>
          </div>
        )}

        {/* Counter Pickup Celebratory Banner */}
        {isCompleted && (
          <div className="bg-emerald-400 border-3 border-slate-900 rounded-3xl p-6 text-slate-950 text-center shadow-[4px_4px_0px_0px_#0f172a] space-y-2 animate-in zoom-in-95 duration-200">
            <div className="w-14 h-14 bg-white border-2 border-slate-900 rounded-2xl flex items-center justify-center mx-auto shadow-[2px_2px_0px_0px_#0f172a]">
              <CheckCircle2 className="w-8 h-8 text-emerald-600 stroke-[3]" />
            </div>
            <h2 className="text-2xl font-black">
              {t.status_completed}
            </h2>
            <p className="text-xs sm:text-sm font-bold text-slate-900 max-w-md mx-auto">
              {t.collect_notice}
            </p>
          </div>
        )}

        {/* Rejected Banner with Resubmission Option */}
        {isRejected && (
          <div className="bg-rose-100 border-2 border-slate-900 rounded-3xl p-6 sm:p-7 text-center space-y-4 shadow-[4px_4px_0px_0px_#0f172a] animate-in fade-in">
            <div className="w-14 h-14 bg-rose-200 border-2 border-slate-900 text-rose-950 rounded-2xl flex items-center justify-center mx-auto shadow-[2px_2px_0px_0px_#0f172a]">
              <AlertCircle className="w-8 h-8 stroke-[2.5]" />
            </div>
            <div>
              <h3 className="text-lg font-black text-rose-950">
                Payment Verification Needed
              </h3>
              <p className="text-xs font-bold text-rose-900 mt-1 max-w-md mx-auto">
                <strong>Reason:</strong> {order.rejection_reason || "Payment could not be verified by counter staff. Please pay at the counter or re-submit your 12-digit UPI UTR number below."}
              </p>
            </div>

            <div className="max-w-sm mx-auto space-y-2 pt-2">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={retryUtr}
                  onChange={(e) => setRetryUtr(e.target.value)}
                  placeholder="Enter corrected 12-digit UPI UTR"
                  className="flex-1 px-3 py-2 text-xs font-bold font-mono border-2 border-slate-900 rounded-xl outline-none focus:bg-yellow-50 bg-white"
                />
                <button
                  type="button"
                  disabled={isResubmitting || !retryUtr.trim()}
                  onClick={() => handleResubmitPayment(retryUtr)}
                  className="px-4 py-2 neo-btn-primary text-xs shrink-0 cursor-pointer disabled:opacity-50"
                >
                  {isResubmitting ? "Updating..." : "Resubmit"}
                </button>
              </div>

              <button
                type="button"
                disabled={isResubmitting}
                onClick={() => handleResubmitPayment("CASH-AT-COUNTER")}
                className="w-full py-2.5 bg-white hover:bg-slate-100 border-2 border-slate-900 text-slate-900 text-xs font-black rounded-xl shadow-[2px_2px_0px_0px_#0f172a] transition-all cursor-pointer"
              >
                I will pay cash (₹{Number(order.total_amount).toFixed(2)}) at the counter
              </button>
            </div>
          </div>
        )}

        {/* Status Stepper Pipeline (Neo-Card) */}
        <div className="neo-card p-6 sm:p-8 bg-white space-y-6">
          <div className="flex items-center justify-between border-b-2 border-slate-900/10 pb-3">
            <h3 className="font-black text-slate-900 text-base flex items-center gap-2">
              <span>📋 {t.order_status_title}</span>
            </h3>
            <span className="sticker-badge bg-yellow-300 text-slate-950 text-[10px]">
              LIVE TRACKING
            </span>
          </div>

          <div className="space-y-4">
            {statusSteps.map((step, idx) => {
              const state = getStepStatus(step.key);

              return (
                <div key={step.key} className="flex items-start gap-4 relative">
                  {idx !== statusSteps.length - 1 && (
                    <div
                      className={`absolute left-4 top-8 -bottom-4 w-0.5 border-l-2 border-dashed ${
                        state === "finished" ? "border-emerald-500" : "border-slate-300"
                      }`}
                    />
                  )}

                  <div
                    className={`w-9 h-9 rounded-xl border-2 border-slate-900 flex items-center justify-center shrink-0 z-10 font-black text-xs transition-all ${
                      state === "finished"
                        ? "bg-emerald-400 text-slate-950 shadow-[2px_2px_0px_0px_#0f172a]"
                        : state === "active"
                        ? "bg-yellow-300 text-slate-950 shadow-[3px_3px_0px_0px_#0f172a] scale-110"
                        : "bg-slate-100 text-slate-400"
                    }`}
                  >
                    {state === "finished" ? "✓" : idx + 1}
                  </div>

                  <div className="flex-1 pt-1">
                    <h4
                      className={`text-sm font-black ${
                        state === "active"
                          ? "text-slate-950"
                          : state === "finished"
                          ? "text-slate-800"
                          : "text-slate-400"
                      }`}
                    >
                      {step.label}
                    </h4>

                    {state === "active" && step.key === "payment_pending" && (
                      <p className="text-xs text-amber-800 font-bold mt-0.5">
                        {order.utr_number?.startsWith("CASH")
                          ? `Please hand over ₹${Number(order.total_amount).toFixed(2)} cash to the counter staff to start printing.`
                          : `Payment Reference: ${order.utr_number} • Waiting for shopkeeper verification...`}
                      </p>
                    )}

                    {state === "active" && step.key === "paid" && (
                      <p className="text-xs text-emerald-700 font-bold mt-0.5">
                        Payment verified. Sending to shop printer queue...
                      </p>
                    )}

                    {state === "active" && step.key === "queued" && (
                      <p className="text-xs text-sky-700 font-bold mt-0.5 flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 animate-spin" />
                        Print request sent! Shop print agent is downloading and printing your document...
                      </p>
                    )}

                    {state === "active" && step.key === "printing" && (
                      <p className="text-xs text-indigo-700 font-bold mt-0.5 flex items-center gap-1.5">
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

        {/* Order Details & Summary Card (Neo-Card) */}
        <div className="neo-card p-6 bg-white space-y-4">
          <div className="flex items-center justify-between border-b-2 border-slate-900/10 pb-3">
            <span className="font-black text-slate-900 text-sm">Order Summary</span>
            <span className="text-lg font-black text-slate-950">
              Total: ₹{Number(order.total_amount).toFixed(2)}
            </span>
          </div>

          <div className="space-y-2">
            {order.files?.map((f, i) => {
              const fileStatus = f.status || (order.status === "completed" ? "printed" : order.status === "printing" ? "printing" : "queued");
              return (
                <div key={i} className="flex flex-col sm:flex-row sm:items-center justify-between text-xs p-3 rounded-2xl bg-amber-50/60 border-2 border-slate-900 shadow-[2px_2px_0px_0px_#0f172a] gap-2">
                  <div className="flex items-center gap-2 truncate max-w-[240px] sm:max-w-md">
                    <FileText className="w-4 h-4 text-slate-700 shrink-0 stroke-[2.5]" />
                    <span className="font-black text-slate-900 truncate">{f.file_name}</span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-700 font-bold shrink-0">
                    <span>{f.page_count}p • {f.copies}x • {f.color_mode.toUpperCase()}</span>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-black border border-slate-900 ${
                      fileStatus === "printed"
                        ? "bg-emerald-300 text-slate-950"
                        : fileStatus === "printing"
                        ? "bg-indigo-300 text-slate-950 animate-pulse"
                        : "bg-yellow-300 text-slate-950"
                    }`}>
                      {fileStatus === "printed" && "✅ Printed"}
                      {fileStatus === "printing" && "🖨️ Printing…"}
                      {fileStatus === "queued" && "⏳ In Queue"}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="pt-2 text-xs font-bold text-slate-500 flex items-center justify-between">
            <span>Payment ID: <strong className="font-mono text-slate-800">{order.utr_number || "Verified"}</strong></span>
            <span>{new Date(order.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-3 pt-2">
          <a
            href="tel:+919876543210"
            className="flex-1 py-3.5 px-4 bg-white hover:bg-slate-100 border-2 border-slate-900 rounded-2xl font-black text-slate-900 shadow-[3px_3px_0px_0px_#0f172a] active:translate-x-0.5 active:translate-y-0.5 transition-all flex items-center justify-center gap-2 text-sm cursor-pointer"
          >
            <PhoneCall className="w-4 h-4 text-emerald-600 stroke-[2.5]" />
            <span>{t.call_shop}</span>
          </a>

          <button
            type="button"
            onClick={() => router.push("/")}
            className="flex-1 py-3.5 px-4 neo-btn-primary text-sm cursor-pointer flex items-center justify-center gap-2"
          >
            <PlusCircle className="w-4 h-4 stroke-[3]" />
            <span>{t.print_another}</span>
          </button>
        </div>
      </main>
    </div>
  );
}
