"use client";

import React, { useEffect, useState, useRef } from "react";
import QRCode from "qrcode";
import { Language, PaymentMethod } from "@/lib/types";
import { translations } from "@/lib/translations";
import { 
  QrCode, 
  Smartphone, 
  ShieldCheck, 
  Upload, 
  CheckCircle, 
  AlertCircle, 
  Copy, 
  ExternalLink, 
  Loader2,
  Printer,
  Zap
} from "lucide-react";

interface Props {
  amount: number;
  orderNumber: string;
  paymentMethod?: PaymentMethod;
  language: Language;
  onSubmitPayment: (utr?: string, screenshotFile?: File, autoPrint?: boolean) => Promise<void>;
  isSubmitting?: boolean;
}

export const DEFAULT_PAYMENT_METHOD: PaymentMethod = {
  id: "33333333-3333-3333-3333-333333333333",
  type: "upi",
  upi_id: "jkbmerc00757954@jkb",
  payee_name: "Preeti Communication",
  static_qr_url: "/payment-qr.png",
  is_active: true,
};

export default function PaymentSection({
  amount,
  orderNumber,
  paymentMethod = DEFAULT_PAYMENT_METHOD,
  language,
  onSubmitPayment,
  isSubmitting = false,
}: Props) {
  const t = translations[language];
  const [qrDataUrl, setQrDataUrl] = useState<string>("");
  const [utrNumber, setUtrNumber] = useState<string>("");
  const [screenshotFile, setScreenshotFile] = useState<File | null>(null);
  const [copiedUpi, setCopiedUpi] = useState(false);
  const [copiedPhone, setCopiedPhone] = useState(false);
  const [activeTab, setActiveTab] = useState<"dynamic" | "static">("dynamic");
  const [validationError, setValidationError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const upiPhoneNumber = "9055143328";

  const cleanAmount = amount.toFixed(2);
  const encodedPayee = encodeURIComponent(paymentMethod.payee_name);
  const encodedNote = encodeURIComponent(`Order ${orderNumber}`);
  const upiDeepLink = `upi://pay?pa=${paymentMethod.upi_id}&pn=${encodedPayee}&am=${cleanAmount}&cu=INR&tn=${encodedNote}&mode=01`;

  useEffect(() => {
    QRCode.toDataURL(upiDeepLink, {
      width: 280,
      margin: 2,
      color: {
        dark: "#1e1b4b",
        light: "#ffffff",
      },
    })
      .then((url) => setQrDataUrl(url))
      .catch((err) => console.error("QR generation error:", err));
  }, [upiDeepLink]);

  const copyUpiId = () => {
    navigator.clipboard.writeText(paymentMethod.upi_id);
    setCopiedUpi(true);
    setTimeout(() => setCopiedUpi(false), 2000);
  };

  const copyPhone = () => {
    navigator.clipboard.writeText(upiPhoneNumber);
    setCopiedPhone(true);
    setTimeout(() => setCopiedPhone(false), 2000);
  };

  const handleScreenshotSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setScreenshotFile(e.target.files[0]);
    }
  };

  const handlePayAndPrint = (customUtr?: string) => {
    setValidationError(null);
    const finalUtr = customUtr?.trim() || utrNumber.trim() || `UPI${Math.floor(100000000000 + Math.random() * 900000000000)}`;
    onSubmitPayment(finalUtr, screenshotFile || undefined, true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handlePayAndPrint();
  };

  return (
    <div className="space-y-6">
      <div className="text-center max-w-md mx-auto">
        <h3 className="text-lg font-bold text-slate-900">
          {t.payment_title}
        </h3>
        <p className="text-xs text-slate-500 mt-1">
          {t.payment_sub}
        </p>
      </div>

      {/* UPI Quick Pay Deep Link Button (Mobile First) */}
      <div className="max-w-sm mx-auto">
        <a
          href={upiDeepLink}
          className="w-full inline-flex items-center justify-center gap-2.5 px-6 py-3.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-bold rounded-2xl shadow-lg shadow-emerald-600/20 active:scale-[0.99] transition-all"
        >
          <Smartphone className="w-5 h-5" />
          <span>{t.pay_with_upi_app}</span>
          <ExternalLink className="w-4 h-4 ml-1 opacity-80" />
        </a>
        <p className="text-[11px] text-center text-slate-400 mt-2">
          Opens Google Pay, PhonePe, Paytm, or BHIM directly
        </p>
      </div>

      {/* QR Code Container */}
      <div className="max-w-xs mx-auto bg-white border border-slate-200 rounded-3xl p-5 shadow-sm text-center">
        {paymentMethod.static_qr_url && (
          <div className="flex bg-slate-100 p-1 rounded-xl mb-4 text-xs font-semibold">
            <button
              type="button"
              onClick={() => setActiveTab("dynamic")}
              className={`flex-1 py-1.5 rounded-lg transition-colors ${
                activeTab === "dynamic" ? "bg-white text-indigo-700 shadow-xs" : "text-slate-500"
              }`}
            >
              Dynamic Amount QR
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("static")}
              className={`flex-1 py-1.5 rounded-lg transition-colors ${
                activeTab === "static" ? "bg-white text-indigo-700 shadow-xs" : "text-slate-500"
              }`}
            >
              Counter Shop QR
            </button>
          </div>
        )}

        <div className="relative inline-block p-2 bg-white rounded-2xl border border-slate-100 shadow-inner">
          {activeTab === "dynamic" && qrDataUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={qrDataUrl}
              alt="UPI Payment QR Code"
              className="w-56 h-56 mx-auto rounded-xl"
            />
          ) : activeTab === "static" && paymentMethod.static_qr_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={paymentMethod.static_qr_url}
              alt="Static Counter QR"
              className="w-56 h-56 mx-auto rounded-xl object-contain"
            />
          ) : (
            <div className="w-56 h-56 flex items-center justify-center bg-slate-50 rounded-xl">
              <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
            </div>
          )}
        </div>

        <div className="mt-3">
          <div className="text-2xl font-black text-slate-900 tracking-tight">
            ₹{cleanAmount}
          </div>
          <div className="text-xs font-semibold text-slate-600 mt-0.5">
            {paymentMethod.payee_name}
          </div>
        </div>

        {/* Payment Credentials Details */}
        <div className="mt-4 space-y-2 text-left">
          {/* UPI ID */}
          <div className="flex items-center justify-between p-2.5 bg-slate-50 border border-slate-200/80 rounded-2xl">
            <div className="min-w-0 pr-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                UPI ID (VPA)
              </span>
              <span className="font-mono text-xs font-bold text-slate-800 truncate block">
                {paymentMethod.upi_id}
              </span>
            </div>
            <button
              type="button"
              onClick={copyUpiId}
              className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:text-indigo-700 bg-white border border-slate-200 px-2.5 py-1.5 rounded-xl shadow-2xs hover:bg-slate-50 transition-colors shrink-0"
            >
              <Copy className="w-3.5 h-3.5" />
              <span>{copiedUpi ? "Copied!" : "Copy"}</span>
            </button>
          </div>

          {/* Pay via Mobile Number */}
          <div className="flex items-center justify-between p-2.5 bg-emerald-50/70 border border-emerald-200/70 rounded-2xl">
            <div className="min-w-0 pr-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 block">
                Pay via Mobile Number (GPay / PhonePe / Paytm)
              </span>
              <span className="font-mono text-sm font-black text-emerald-950 block">
                +91 {upiPhoneNumber}
              </span>
            </div>
            <button
              type="button"
              onClick={copyPhone}
              className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 hover:text-emerald-800 bg-white border border-emerald-200 px-2.5 py-1.5 rounded-xl shadow-2xs hover:bg-emerald-50 transition-colors shrink-0"
            >
              <Copy className="w-3.5 h-3.5" />
              <span>{copiedPhone ? "Copied!" : "Copy"}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Auto-Print Banner */}
      <div className="max-w-md mx-auto bg-gradient-to-r from-indigo-50 to-purple-50 border border-indigo-200/80 rounded-2xl p-3.5 flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center shrink-0 shadow-xs">
          <Printer className="w-5 h-5 animate-pulse" />
        </div>
        <div className="text-left">
          <div className="text-xs font-bold text-indigo-950 flex items-center gap-1.5">
            <span>Automated Shop Counter Printing</span>
            <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
              <Zap className="w-3 h-3 text-emerald-600 fill-emerald-600" /> Auto-Print
            </span>
          </div>
          <p className="text-[11px] text-slate-600 mt-0.5">
            Your document is automatically sent to the shop printer the moment payment is made.
          </p>
        </div>
      </div>

      {/* Primary 1-Click Pay & Print Button - No UTR Required */}
      <div className="max-w-md mx-auto space-y-3">
        <button
          type="button"
          disabled={isSubmitting}
          onClick={() => handlePayAndPrint()}
          className="w-full py-4 px-6 bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-600 hover:from-emerald-700 hover:to-teal-700 disabled:opacity-60 text-white font-extrabold rounded-2xl shadow-xl shadow-emerald-600/25 active:scale-[0.99] transition-all flex items-center justify-center gap-2.5 text-base border border-emerald-400/30"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              <span>Sending Print Request to Printer...</span>
            </>
          ) : (
            <>
              <Zap className="w-5 h-5 text-amber-300 fill-amber-300" />
              <span>I Have Paid ₹{cleanAmount} - Print Now</span>
              <Printer className="w-5 h-5 ml-1 opacity-90" />
            </>
          )}
        </button>

        <p className="text-[11px] text-center text-slate-400">
          ⚡ Instant Automatic Printing: No transaction ID required &bull; Direct to shop printer
        </p>

        {/* Optional collapsed section for receipt/UTR */}
        <details className="pt-2 text-center text-xs text-slate-400 group">
          <summary className="cursor-pointer hover:text-slate-600 transition-colors select-none list-none">
            <span className="underline decoration-dotted underline-offset-4">
              Optional: Have a UTR number or receipt screenshot?
            </span>
          </summary>

          <div className="mt-3 p-4 bg-white border border-slate-200 rounded-2xl text-left space-y-3 shadow-xs">
            <div>
              <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                UPI Reference / UTR (Optional)
              </label>
              <input
                type="text"
                value={utrNumber}
                onChange={(e) => setUtrNumber(e.target.value.replace(/[^a-zA-Z0-9]/g, ""))}
                placeholder="e.g. 427819482103 (optional)"
                className="w-full px-3 py-2 text-xs font-mono border border-slate-300 rounded-xl outline-none focus:border-indigo-500 uppercase"
              />
            </div>

            <div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleScreenshotSelect}
              />
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border border-dashed border-slate-300 hover:border-indigo-400 rounded-xl p-2.5 flex items-center justify-between cursor-pointer bg-slate-50 hover:bg-slate-100 transition-colors"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <Upload className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                  <span className="text-xs text-slate-600 truncate">
                    {screenshotFile ? screenshotFile.name : "Attach receipt screenshot (optional)"}
                  </span>
                </div>
                {screenshotFile && (
                  <span className="text-[11px] font-bold text-emerald-600 shrink-0">Attached</span>
                )}
              </div>
            </div>
          </div>
        </details>
      </div>
    </div>
  );
}
