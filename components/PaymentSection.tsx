"use client";

import React, { useState, useEffect } from "react";
import QRCode from "qrcode";
import { Language, PaymentMethod } from "@/lib/types";
import { translations } from "@/lib/translations";
import { 
  ShieldCheck,
  Zap,
  Lock,
  Smartphone,
  QrCode,
  ArrowRight,
  ExternalLink,
  Copy,
  Check,
  Sparkles
} from "lucide-react";
import RazorpayCheckoutButton from "@/components/RazorpayCheckoutButton";

interface Props {
  amount: number;
  orderNumber: string;
  paymentMethod?: PaymentMethod;
  language: Language;
  onSubmitPayment: (utr?: string, screenshotFile?: File, autoPrint?: boolean) => Promise<void>;
  isSubmitting?: boolean;
  customerName?: string;
  customerPhone?: string;
  customerEmail?: string;
}

export const DEFAULT_PAYMENT_METHOD: PaymentMethod = {
  id: "33333333-3333-3333-3333-333333333333",
  type: "upi",
  upi_id: "jkbmerc00757954@jkb",
  payee_name: "Preeti Communication",
  static_qr_url: null,
  is_active: true,
};

export default function PaymentSection({
  amount,
  orderNumber,
  paymentMethod = DEFAULT_PAYMENT_METHOD,
  language,
  onSubmitPayment,
  isSubmitting = false,
  customerName = "Customer",
  customerPhone = "",
  customerEmail = "",
}: Props) {
  const t = translations[language];
  const cleanAmount = amount.toFixed(2);

  // Digital Payment Tabs: "razorpay" (Automated UPI & QR) | "upi_qr" (Manual Direct UPI)
  const [activeTab, setActiveTab] = useState<"razorpay" | "upi_qr">("razorpay");

  // UPI QR state
  const [upiQrData, setUpiQrData] = useState<string>("");
  const [utrNumber, setUtrNumber] = useState<string>("");
  const [screenshotFile, setScreenshotFile] = useState<File | null>(null);
  const [copiedUpi, setCopiedUpi] = useState(false);
  const [upiError, setUpiError] = useState<string | null>(null);

  const shopUpiId = paymentMethod.upi_id && paymentMethod.upi_id !== "razorpay" 
    ? paymentMethod.upi_id 
    : "jkbmerc00757954@jkb";
  const shopPayee = paymentMethod.payee_name || "Preeti Communication";

  // Dynamic UPI Deep Link
  const upiDeepLink = `upi://pay?pa=${encodeURIComponent(shopUpiId)}&pn=${encodeURIComponent(shopPayee)}&am=${cleanAmount}&cu=INR&tn=${encodeURIComponent(`Print Order ${orderNumber}`)}`;

  useEffect(() => {
    QRCode.toDataURL(upiDeepLink, {
      width: 320,
      margin: 2,
      color: {
        dark: "#0f172a",
        light: "#ffffff",
      },
    }).then(setUpiQrData).catch((err) => console.error("QR Error:", err));
  }, [upiDeepLink]);

  const copyUpiId = () => {
    if (typeof window !== "undefined") {
      navigator.clipboard.writeText(shopUpiId);
      setCopiedUpi(true);
      setTimeout(() => setCopiedUpi(false), 2000);
    }
  };

  const handleUpiSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setUpiError(null);

    const trimmedUtr = utrNumber.trim();
    if (!trimmedUtr && !screenshotFile) {
      setUpiError("Payment verification required: Please complete your payment via UPI app and enter the 12-digit UPI UTR number or attach a payment receipt.");
      return;
    }

    if (trimmedUtr && trimmedUtr.length < 6) {
      setUpiError("Please enter a valid UPI Reference / UTR Number (usually 12 digits).");
      return;
    }

    // manual UPI requires approval or auto_print based on shop
    onSubmitPayment(trimmedUtr || `UPI-VERIFY-${Date.now().toString().slice(-6)}`, screenshotFile || undefined, false);
  };

  return (
    <div className="space-y-6 max-w-lg mx-auto">
      {/* Header */}
      <div className="text-center space-y-2">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-indigo-50/90 text-indigo-700 border border-indigo-200/80 shadow-xs">
          <ShieldCheck className="w-4 h-4 text-indigo-600 stroke-[2.5]" />
          <span>100% Secure UPI &amp; QR Payments</span>
        </div>
        <h3 className="text-2xl font-black text-slate-900 tracking-tight">
          Choose How to Pay
        </h3>
        <p className="text-xs font-medium text-slate-500 max-w-sm mx-auto">
          Pay via automated gateway for instant auto-print, or scan shop UPI QR code
        </p>
      </div>

      {/* Modern Payment Method Switcher Tabs (2 Digital UPI/QR Options) */}
      <div className="grid grid-cols-2 gap-2 bg-slate-100/90 p-1.5 rounded-2xl border border-slate-200/90 text-xs">
        <button
          type="button"
          onClick={() => setActiveTab("razorpay")}
          className={`py-3 px-3 rounded-xl transition-all font-bold flex items-center justify-center gap-2 cursor-pointer ${
            activeTab === "razorpay"
              ? "bg-white text-indigo-700 shadow-sm border border-slate-200/60"
              : "text-slate-600 hover:text-slate-900"
          }`}
        >
          <QrCode className="w-4 h-4 text-indigo-600 stroke-[2.5]" />
          <span className="truncate">Automated UPI &amp; QR</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("upi_qr")}
          className={`py-3 px-3 rounded-xl transition-all font-bold flex items-center justify-center gap-2 cursor-pointer ${
            activeTab === "upi_qr"
              ? "bg-white text-indigo-700 shadow-sm border border-slate-200/60"
              : "text-slate-600 hover:text-slate-900"
          }`}
        >
          <Smartphone className="w-4 h-4 stroke-[2.5]" />
          <span className="truncate">Direct Shop UPI</span>
        </button>
      </div>

      {/* TAB 1: RAZORPAY GATEWAY (UPI & QR ONLY) - MODERN SLEEK CARD */}
      {activeTab === "razorpay" && (
        <div className="bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 border border-indigo-500/25 rounded-3xl p-6 sm:p-7 shadow-xl text-white space-y-6 relative overflow-hidden animate-in fade-in duration-200">
          {/* Subtle graphic accent */}
          <div className="absolute top-0 right-0 w-44 h-44 bg-indigo-500/15 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-44 h-44 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />

          {/* Amount & Shop Info */}
          <div className="flex items-center justify-between border-b border-white/10 pb-5">
            <div>
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 mb-1.5">
                <Zap className="w-3 h-3 fill-emerald-300" />
                Instant Auto-Print
              </span>
              <div className="text-3xl sm:text-4xl font-black text-white tracking-tight flex items-baseline gap-1 mt-1">
                <span>₹{cleanAmount}</span>
                <span className="text-xs font-semibold text-slate-400">INR</span>
              </div>
            </div>

            <div className="text-right">
              <span className="text-xs font-bold text-indigo-200 block">
                {shopPayee}
              </span>
              <p className="text-[10px] text-slate-400 mt-0.5">
                Fast Express Counter
              </p>
            </div>
          </div>

          {/* Supported Channels (Only UPI & Dynamic QR Code) */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-300">
                100% Free UPI • No Card Fees
              </span>
              <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full">
                Zero Surcharge
              </span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <div className="bg-white/5 border border-white/10 rounded-2xl p-2.5 text-center flex flex-col items-center justify-center gap-1 hover:border-cyan-400/40 transition-colors">
                <QrCode className="w-5 h-5 text-emerald-400" />
                <span className="text-xs font-bold text-white">Dynamic QR</span>
                <span className="text-[9px] text-slate-400">Instant Scan</span>
              </div>
              <div className="bg-white/5 border border-white/10 rounded-2xl p-2.5 text-center flex flex-col items-center justify-center gap-1 hover:border-sky-400/40 transition-colors">
                <Smartphone className="w-5 h-5 text-sky-400" />
                <span className="text-xs font-bold text-white">Google Pay</span>
                <span className="text-[9px] text-slate-400">Direct UPI</span>
              </div>
              <div className="bg-white/5 border border-white/10 rounded-2xl p-2.5 text-center flex flex-col items-center justify-center gap-1 hover:border-purple-400/40 transition-colors">
                <Smartphone className="w-5 h-5 text-purple-400" />
                <span className="text-xs font-bold text-white">PhonePe</span>
                <span className="text-[9px] text-slate-400">1-Tap Intent</span>
              </div>
              <div className="bg-white/5 border border-white/10 rounded-2xl p-2.5 text-center flex flex-col items-center justify-center gap-1 hover:border-amber-400/40 transition-colors">
                <Zap className="w-5 h-5 text-amber-400" />
                <span className="text-xs font-bold text-white">Paytm / BHIM</span>
                <span className="text-[9px] text-slate-400">Any UPI ID</span>
              </div>
            </div>
          </div>

          {/* Trigger Button */}
          <div className="pt-2">
            <RazorpayCheckoutButton
              amount={amount}
              orderNumber={orderNumber}
              customerName={customerName}
              customerPhone={customerPhone}
              customerEmail={customerEmail}
              disabled={isSubmitting}
              buttonText={`Pay ₹${cleanAmount} via UPI / QR Code 🚀`}
              onSuccess={(payment) => {
                onSubmitPayment(payment.paymentId, undefined, true);
              }}
            />
          </div>

          <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-[11px] text-slate-400 pt-3 border-t border-white/10">
            <span className="flex items-center gap-1.5 text-slate-300 font-medium">
              <ShieldCheck className="w-4 h-4 text-emerald-400 stroke-[2.5]" />
              100% Verified Payment
            </span>
            <span>•</span>
            <span className="flex items-center gap-1.5 text-slate-300 font-medium">
              <Lock className="w-3.5 h-3.5 text-indigo-400 stroke-[2.5]" />
              Razorpay Secured
            </span>
          </div>
        </div>
      )}

      {/* TAB 2: DIRECT SHOP UPI QR CODE & APPS */}
      {activeTab === "upi_qr" && (
        <form onSubmit={handleUpiSubmit} className="glass-card p-6 sm:p-7 space-y-6 animate-in fade-in duration-200">
          <div className="text-center space-y-1">
            <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200/80">
              <Sparkles className="w-3.5 h-3.5 text-amber-600" />
              <span>Scan via any UPI App</span>
            </span>
            <div className="text-3xl font-black text-slate-900 mt-1">
              ₹{cleanAmount}
            </div>
            <p className="text-xs font-medium text-slate-500">
              Open <strong>Google Pay, PhonePe, Paytm, or BHIM</strong> to scan
            </p>
          </div>

          {/* QR Code Container */}
          <div className="flex flex-col items-center justify-center space-y-3">
            <div className="p-3 bg-white border border-slate-200 rounded-3xl shadow-md inline-block">
              {upiQrData ? (
                <img
                  src={upiQrData}
                  alt="Shop UPI QR Code"
                  className="w-48 h-48 sm:w-56 sm:h-56 rounded-2xl mx-auto"
                />
              ) : (
                <div className="w-48 h-48 bg-slate-100 rounded-2xl flex items-center justify-center text-slate-400 text-xs font-bold">
                  Loading QR...
                </div>
              )}
            </div>

            {/* 1-Tap Open UPI App for Mobile */}
            <a
              href={upiDeepLink}
              className="sm:hidden w-full py-3 px-4 neo-btn-accent text-xs flex items-center justify-center gap-2 cursor-pointer"
            >
              <Smartphone className="w-4 h-4 stroke-[2.5]" />
              <span>Tap to Open GPay / PhonePe</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>

            {/* UPI ID Copy Pill */}
            <button
              type="button"
              onClick={copyUpiId}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-mono font-semibold transition-all cursor-pointer"
            >
              <span>UPI: <strong>{shopUpiId}</strong></span>
              {copiedUpi ? <Check className="w-3.5 h-3.5 text-emerald-600 stroke-[3]" /> : <Copy className="w-3.5 h-3.5 text-slate-400" />}
            </button>
          </div>

          {/* UTR Input & Screenshot */}
          <div className="space-y-4 pt-3 border-t border-slate-100">
            {upiError && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium rounded-2xl flex items-center gap-2">
                <span>⚠️ {upiError}</span>
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                UPI Reference / UTR Number <span className="text-rose-600">*</span>
              </label>
              <input
                type="text"
                value={utrNumber}
                onChange={(e) => {
                  setUtrNumber(e.target.value);
                  if (upiError) setUpiError(null);
                }}
                placeholder="Enter 12-digit UPI UTR from your app receipt"
                className="w-full px-4 py-3 text-xs font-mono font-bold border border-slate-200 rounded-xl outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
              />
              <p className="text-[10px] text-slate-400 mt-1">
                Required after paying: Found in your GPay / PhonePe transaction details.
              </p>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Payment Screenshot (Optional)
              </label>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => {
                  setScreenshotFile(e.target.files?.[0] || null);
                  if (upiError) setUpiError(null);
                }}
                className="w-full text-xs text-slate-500 file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100 cursor-pointer"
              />
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-4 px-6 neo-btn-primary text-base cursor-pointer disabled:opacity-60"
            >
              <span>{isSubmitting ? "Submitting Order..." : "I Have Paid ₹" + cleanAmount + " & Confirm Order"}</span>
              <ArrowRight className="w-5 h-5 stroke-[2.5]" />
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
