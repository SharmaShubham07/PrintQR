"use client";

import React, { useState, useEffect } from "react";
import QRCode from "qrcode";
import { Language, PaymentMethod } from "@/lib/types";
import { translations } from "@/lib/translations";
import { 
  CreditCard,
  ShieldCheck,
  Zap,
  Lock,
  Smartphone,
  CheckCircle2,
  Building2,
  Wallet,
  QrCode,
  Banknote,
  Upload,
  ArrowRight,
  ExternalLink,
  Copy,
  Check
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

  // Payment Tabs: "razorpay" | "upi_qr" | "cash"
  const [activeTab, setActiveTab] = useState<"razorpay" | "upi_qr" | "cash">("razorpay");

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

  const handleCashSubmit = () => {
    const cashRef = `CASH-${Date.now().toString().slice(-6)}`;
    onSubmitPayment(cashRef, undefined, false);
  };

  return (
    <div className="space-y-6 max-w-lg mx-auto">
      {/* Header */}
      <div className="text-center space-y-2">
        <div className="inline-flex items-center gap-1.5 sticker-badge bg-emerald-200 text-emerald-950 text-xs rotate-[-1deg]">
          <ShieldCheck className="w-4 h-4 text-emerald-800 stroke-[2.5]" />
          <span>⚡ Instant &amp; Safe Checkout</span>
        </div>
        <h3 className="text-2xl font-black text-slate-900 tracking-tight">
          How would you like to pay?
        </h3>
        <p className="text-xs font-bold text-slate-500 max-w-sm mx-auto">
          Scan QR with any UPI app, pay via automated gateway, or hand cash to counter staff
        </p>
      </div>

      {/* Payment Method Switcher Tabs (Doodly Neo-Card Tabs) */}
      <div className="grid grid-cols-3 gap-2 bg-slate-100 p-2 rounded-2xl border-2 border-slate-900 shadow-[3px_3px_0px_0px_#0f172a]">
        <button
          type="button"
          onClick={() => setActiveTab("razorpay")}
          className={`py-2.5 px-2 rounded-xl transition-all border-2 flex flex-col items-center justify-center gap-1 cursor-pointer ${
            activeTab === "razorpay"
              ? "bg-yellow-300 border-slate-900 text-slate-950 shadow-[2px_2px_0px_0px_#0f172a] -translate-y-0.5"
              : "border-transparent text-slate-600 hover:text-slate-900"
          }`}
        >
          <QrCode className="w-4 h-4 stroke-[2.5]" />
          <span className="text-xs font-black truncate">UPI &amp; QR</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("upi_qr")}
          className={`py-2.5 px-2 rounded-xl transition-all border-2 flex flex-col items-center justify-center gap-1 cursor-pointer ${
            activeTab === "upi_qr"
              ? "bg-yellow-300 border-slate-900 text-slate-950 shadow-[2px_2px_0px_0px_#0f172a] -translate-y-0.5"
              : "border-transparent text-slate-600 hover:text-slate-900"
          }`}
        >
          <Smartphone className="w-4 h-4 stroke-[2.5]" />
          <span className="text-xs font-black truncate">Manual UPI</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("cash")}
          className={`py-2.5 px-2 rounded-xl transition-all border-2 flex flex-col items-center justify-center gap-1 cursor-pointer ${
            activeTab === "cash"
              ? "bg-yellow-300 border-slate-900 text-slate-950 shadow-[2px_2px_0px_0px_#0f172a] -translate-y-0.5"
              : "border-transparent text-slate-600 hover:text-slate-900"
          }`}
        >
          <Banknote className="w-4 h-4 stroke-[2.5]" />
          <span className="text-xs font-black truncate">Pay Cash</span>
        </button>
      </div>

      {/* TAB 1: RAZORPAY GATEWAY (UPI & QR ONLY) - NEO BRUTAL DARK CARD */}
      {activeTab === "razorpay" && (
        <div className="bg-slate-950 border-3 border-slate-900 rounded-3xl p-6 sm:p-7 shadow-[6px_6px_0px_0px_#0f172a] text-white space-y-6 relative overflow-hidden animate-in fade-in duration-200">
          {/* Subtle graphic accent */}
          <div className="absolute top-0 right-0 w-32 h-32 bg-yellow-400/10 rounded-full blur-2xl pointer-events-none" />

          {/* Amount & Shop Info */}
          <div className="flex items-center justify-between border-b-2 border-white/10 pb-5">
            <div>
              <span className="sticker-badge bg-yellow-300 text-slate-950 text-[10px] mb-1.5 rotate-[-1deg]">
                ⚡ INSTANT AUTO-PRINT
              </span>
              <div className="text-3xl sm:text-4xl font-black text-white tracking-tight flex items-baseline gap-1 mt-1">
                <span>₹{cleanAmount}</span>
                <span className="text-xs font-bold text-slate-400">INR</span>
              </div>
            </div>

            <div className="text-right">
              <span className="text-xs font-black text-yellow-300 block">
                {shopPayee}
              </span>
              <p className="text-[10px] font-bold text-slate-400 mt-0.5">
                Express Print Counter
              </p>
            </div>
          </div>

          {/* Supported Channels (Only UPI & Dynamic QR Code) */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-black uppercase tracking-wider text-slate-300">
                Supported: UPI Apps &amp; QR
              </span>
              <span className="sticker-badge bg-emerald-400 text-slate-950 text-[10px]">
                0% Fee • Free
              </span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <div className="bg-white/10 border-2 border-white/20 rounded-2xl p-2.5 text-center flex flex-col items-center justify-center gap-1 hover:border-yellow-300 transition-colors">
                <QrCode className="w-5 h-5 text-emerald-400" />
                <span className="text-xs font-black text-white">Dynamic QR</span>
                <span className="text-[9px] font-bold text-slate-400">Instant Scan</span>
              </div>
              <div className="bg-white/10 border-2 border-white/20 rounded-2xl p-2.5 text-center flex flex-col items-center justify-center gap-1 hover:border-yellow-300 transition-colors">
                <Smartphone className="w-5 h-5 text-sky-400" />
                <span className="text-xs font-black text-white">Google Pay</span>
                <span className="text-[9px] font-bold text-slate-400">Direct UPI</span>
              </div>
              <div className="bg-white/10 border-2 border-white/20 rounded-2xl p-2.5 text-center flex flex-col items-center justify-center gap-1 hover:border-yellow-300 transition-colors">
                <Smartphone className="w-5 h-5 text-purple-400" />
                <span className="text-xs font-black text-white">PhonePe</span>
                <span className="text-[9px] font-bold text-slate-400">1-Tap Intent</span>
              </div>
              <div className="bg-white/10 border-2 border-white/20 rounded-2xl p-2.5 text-center flex flex-col items-center justify-center gap-1 hover:border-yellow-300 transition-colors">
                <Zap className="w-5 h-5 text-amber-400" />
                <span className="text-xs font-black text-white">Paytm / BHIM</span>
                <span className="text-[9px] font-bold text-slate-400">Any UPI ID</span>
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

          <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-[11px] text-slate-400 pt-3 border-t border-white/10 font-bold">
            <span className="flex items-center gap-1.5 text-slate-300">
              <ShieldCheck className="w-4 h-4 text-emerald-400 stroke-[2.5]" />
              100% Verified Payment
            </span>
            <span>•</span>
            <span className="flex items-center gap-1.5 text-slate-300">
              <Lock className="w-3.5 h-3.5 text-yellow-300 stroke-[2.5]" />
              Razorpay Secured
            </span>
          </div>
        </div>
      )}

      {/* TAB 2: DIRECT SHOP UPI QR CODE & APPS */}
      {activeTab === "upi_qr" && (
        <form onSubmit={handleUpiSubmit} className="neo-card p-6 sm:p-7 bg-white space-y-6 animate-in fade-in duration-200">
          <div className="text-center space-y-1">
            <span className="sticker-badge bg-yellow-300 text-slate-950 text-[10px] rotate-[-1deg]">
              SCAN VIA ANY UPI APP
            </span>
            <div className="text-3xl font-black text-slate-900 mt-1">
              ₹{cleanAmount}
            </div>
            <p className="text-xs font-bold text-slate-500">
              Open <strong>Google Pay, PhonePe, Paytm, or BHIM</strong> to scan
            </p>
          </div>

          {/* QR Code Container */}
          <div className="flex flex-col items-center justify-center space-y-3">
            <div className="p-3 bg-yellow-50 border-3 border-slate-900 rounded-3xl shadow-[4px_4px_0px_0px_#0f172a] inline-block">
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
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-100 hover:bg-yellow-200 text-slate-900 text-xs font-mono font-bold border-2 border-slate-900 shadow-[2px_2px_0px_0px_#0f172a] transition-all cursor-pointer"
            >
              <span>UPI: <strong>{shopUpiId}</strong></span>
              {copiedUpi ? <Check className="w-3.5 h-3.5 text-emerald-600 stroke-[3]" /> : <Copy className="w-3.5 h-3.5 text-slate-500" />}
            </button>
          </div>

          {/* UTR Input & Screenshot */}
          <div className="space-y-4 pt-3 border-t-2 border-slate-900/10">
            {upiError && (
              <div className="p-3 bg-rose-100 border-2 border-slate-900 text-rose-950 text-xs font-bold rounded-2xl shadow-[2px_2px_0px_0px_#0f172a] flex items-center gap-2">
                <span>⚠️ {upiError}</span>
              </div>
            )}

            <div>
              <label className="block text-xs font-black text-slate-800 uppercase tracking-wider mb-1.5">
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
                className="w-full px-4 py-3 text-xs font-bold font-mono border-2 border-slate-900 rounded-xl outline-none focus:bg-yellow-50"
              />
              <p className="text-[10px] font-bold text-slate-500 mt-1">
                Required after paying: Found in your GPay / PhonePe transaction details.
              </p>
            </div>

            <div>
              <label className="block text-xs font-black text-slate-800 uppercase tracking-wider mb-1.5">
                Payment Screenshot (Optional)
              </label>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => {
                  setScreenshotFile(e.target.files?.[0] || null);
                  if (upiError) setUpiError(null);
                }}
                className="w-full text-xs font-bold text-slate-600 file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border-2 file:border-slate-900 file:text-xs file:font-black file:bg-yellow-300 file:text-slate-950 hover:file:bg-yellow-400 file:shadow-[2px_2px_0px_0px_#0f172a] cursor-pointer"
              />
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-4 px-6 neo-btn-primary text-base cursor-pointer disabled:opacity-60"
            >
              <span>{isSubmitting ? "Submitting Order..." : "I Have Paid ₹" + cleanAmount + " & Confirm Order"}</span>
              <ArrowRight className="w-5 h-5 stroke-[3]" />
            </button>
          </div>
        </form>
      )}

      {/* TAB 3: PAY CASH AT COUNTER */}
      {activeTab === "cash" && (
        <div className="neo-card p-6 sm:p-7 bg-white space-y-6 animate-in fade-in duration-200">
          <div className="text-center space-y-2">
            <div className="w-14 h-14 rounded-2xl bg-amber-100 border-2 border-slate-900 text-amber-900 flex items-center justify-center mx-auto shadow-[3px_3px_0px_0px_#0f172a] text-2xl">
              💵
            </div>
            <h3 className="text-xl font-black text-slate-900">
              Pay Cash at Shop Counter
            </h3>
            <p className="text-xs font-bold text-slate-600 max-w-sm mx-auto">
              Hand over cash (<strong>₹{cleanAmount}</strong>) directly to the shopkeeper. Your prints will start immediately after cash is received.
            </p>
          </div>

          <div className="bg-amber-100/80 border-2 border-slate-900 rounded-2xl p-4 text-xs text-amber-950 space-y-1.5 shadow-[2px_2px_0px_0px_#0f172a]">
            <p className="font-black flex items-center gap-1.5">
              <span>⏳ Walk-in Counter Verification</span>
            </p>
            <p className="text-[11px] font-bold opacity-90 leading-relaxed">
              Once you submit this order, your files land right on the counter dashboard. The shopkeeper will verify cash and press Print!
            </p>
          </div>

          <button
            type="button"
            disabled={isSubmitting}
            onClick={handleCashSubmit}
            className="w-full py-4 px-6 neo-btn-accent text-base cursor-pointer disabled:opacity-60"
          >
            <span>{isSubmitting ? "Placing Order..." : `Place Order (Pay ₹${cleanAmount} in Cash)`}</span>
            <ArrowRight className="w-5 h-5 stroke-[3]" />
          </button>
        </div>
      )}
    </div>
  );
}
