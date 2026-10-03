"use client";

import React, { useEffect, useState, useRef, useMemo } from "react";
import QRCode from "qrcode";
import { Language, PaymentMethod } from "@/lib/types";
import { translations } from "@/lib/translations";
import { 
  Smartphone, 
  Upload, 
  CheckCircle, 
  AlertCircle, 
  Copy, 
  ExternalLink, 
  Loader2,
  Printer,
  Zap,
  Info,
  CreditCard,
  ShieldCheck
} from "lucide-react";
import RazorpayCheckoutButton from "@/components/RazorpayCheckoutButton";


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

type UpiAppType = "generic" | "gpay" | "phonepe" | "paytm" | "bhim";

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
  const [deviceType, setDeviceType] = useState<"android" | "ios" | "desktop">("desktop");
  const [showDesktopNotice, setShowDesktopNotice] = useState(false);
  const [hasTriggeredUpi, setHasTriggeredUpi] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const upiPhoneNumber = "9055143328";

  // Detect OS/Device type on mount
  useEffect(() => {
    if (typeof navigator !== "undefined") {
      const ua = navigator.userAgent.toLowerCase();
      if (/android/i.test(ua)) {
        setDeviceType("android");
      } else if (/iphone|ipad|ipod/i.test(ua)) {
        setDeviceType("ios");
      } else {
        setDeviceType("desktop");
      }
    }
  }, []);

  const cleanAmount = amount.toFixed(2);
  const cleanPayee = paymentMethod.payee_name.trim();
  const encodedPayee = encodeURIComponent(cleanPayee);
  const encodedNote = encodeURIComponent(`Order ${orderNumber}`.trim());

  // Stable transaction ref per orderNumber so it does NOT generate a new random value on every render
  const cleanTr = useMemo(() => {
    return encodeURIComponent(
      (orderNumber || "ORDER").replace(/[^a-zA-Z0-9]/g, "") +
      "_" +
      Math.floor(100000 + Math.random() * 900000)
    );
  }, [orderNumber]);

  // Clean NPCI-compliant query string
  const upiQuery = useMemo(() => {
    return `pa=${paymentMethod.upi_id}&pn=${encodedPayee}&am=${cleanAmount}&cu=INR&tn=${encodedNote}&tr=${cleanTr}`;
  }, [paymentMethod.upi_id, encodedPayee, cleanAmount, encodedNote, cleanTr]);

  // Universal UPI URI for standard app pickers, iOS Safari, and QR code image
  const standardUpiUri = useMemo(() => `upi://pay?${upiQuery}`, [upiQuery]);

  // Android Chrome Intent URIs
  const androidGenericIntent = useMemo(() => `intent://pay?${upiQuery}#Intent;scheme=upi;end;`, [upiQuery]);
  const gpayAndroidIntent = useMemo(() => `intent://pay?${upiQuery}#Intent;scheme=upi;package=com.google.android.apps.nbu.paisa.user;end;`, [upiQuery]);
  const phonepeAndroidIntent = useMemo(() => `intent://pay?${upiQuery}#Intent;scheme=upi;package=com.phonepe.app;end;`, [upiQuery]);
  const paytmAndroidIntent = useMemo(() => `intent://pay?${upiQuery}#Intent;scheme=upi;package=net.one97.paytm;end;`, [upiQuery]);
  const bhimAndroidIntent = useMemo(() => `intent://pay?${upiQuery}#Intent;scheme=upi;package=in.org.npci.upiapp;end;`, [upiQuery]);

  // iOS App-Specific Schemes
  const gpayIosScheme = useMemo(() => `tez://upi/pay?${upiQuery}`, [upiQuery]);
  const phonepeIosScheme = useMemo(() => `phonepe://pay?${upiQuery}`, [upiQuery]);
  const paytmIosScheme = useMemo(() => `paytmmp://pay?${upiQuery}`, [upiQuery]);

  // Generate Dynamic QR Code using clean UPI deep link without mode=01
  useEffect(() => {
    let isCancelled = false;
    QRCode.toDataURL(standardUpiUri, {
      width: 280,
      margin: 2,
      color: {
        dark: "#1e1b4b",
        light: "#ffffff",
      },
    })
      .then((url) => {
        if (!isCancelled) {
          setQrDataUrl(url);
        }
      })
      .catch((err) => console.error("QR generation error:", err));

    return () => {
      isCancelled = true;
    };
  }, [standardUpiUri]);

  // Resolves primary href for each app button based on user device
  const getAppHref = (app: UpiAppType): string => {
    if (deviceType === "android") {
      switch (app) {
        case "gpay": return gpayAndroidIntent;
        case "phonepe": return phonepeAndroidIntent;
        case "paytm": return paytmAndroidIntent;
        case "bhim": return bhimAndroidIntent;
        case "generic":
        default:
          return androidGenericIntent;
      }
    }
    if (deviceType === "ios") {
      switch (app) {
        case "gpay": return gpayIosScheme;
        case "phonepe": return phonepeIosScheme;
        case "paytm": return paytmIosScheme;
        case "bhim":
        case "generic":
        default:
          return standardUpiUri;
      }
    }
    // Desktop: Scroll to QR code
    return "#upi-qr-container";
  };

  // Handles click to ensure both native href and active window navigation trigger reliably
  const handleUpiTap = (
    e: React.MouseEvent<HTMLAnchorElement>,
    app: UpiAppType
  ) => {
    setHasTriggeredUpi(true);

    if (deviceType === "desktop") {
      e.preventDefault();
      setShowDesktopNotice(true);
      const qrEl = document.getElementById("upi-qr-container");
      if (qrEl) {
        qrEl.scrollIntoView({ behavior: "smooth" });
      }
      return;
    }

    const targetUrl = getAppHref(app);

    // Actively navigate on mobile device to ensure the custom intent or scheme executes
    try {
      window.location.href = targetUrl;
    } catch {
      window.location.href = standardUpiUri;
    }

    // Android fallback: If a specific app was tapped but is not installed, fallback to the generic chooser after 1.2s
    if (deviceType === "android" && app !== "generic") {
      const startTime = Date.now();
      setTimeout(() => {
        if (typeof document !== "undefined" && document.visibilityState === "visible" && Date.now() - startTime < 2500) {
          window.location.href = androidGenericIntent;
        }
      }, 1200);
    }
  };

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

      {/* Recommended: Online Payment via Razorpay Standard Checkout */}
      <div className="max-w-md mx-auto bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 border border-indigo-500/30 rounded-3xl p-5 shadow-xl text-white space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-indigo-600/40 border border-indigo-400/30 flex items-center justify-center shrink-0">
              <CreditCard className="w-5 h-5 text-indigo-300" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-sm font-bold text-white">Online Checkout (Razorpay)</span>
                <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">
                  Instant
                </span>
              </div>
              <p className="text-[11px] text-slate-300 mt-0.5">
                Pay with UPI, Credit/Debit Cards, Netbanking & Wallets
              </p>
            </div>
          </div>
        </div>

        <RazorpayCheckoutButton
          amount={amount}
          orderNumber={orderNumber}
          disabled={isSubmitting}
          buttonText={`Pay ₹${cleanAmount} via Razorpay`}
          onSuccess={(payment) => {
            // Auto submit and queue print with verified Razorpay payment ID
            onSubmitPayment(payment.paymentId, undefined, true);
          }}
        />

        <div className="flex items-center justify-center gap-3 text-[11px] text-slate-400 pt-1 border-t border-white/10">
          <span className="flex items-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            100% Secure Checkout
          </span>
          <span>&bull;</span>
          <span>Instant Auto-Print Queue</span>
        </div>
      </div>

      {/* Divider */}
      <div className="max-w-md mx-auto flex items-center gap-3">
        <div className="flex-1 h-px bg-slate-200"></div>
        <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
          Or Pay via Direct UPI / Counter QR
        </span>
        <div className="flex-1 h-px bg-slate-200"></div>
      </div>

      {/* Primary UPI Payment Actions (Mobile First) */}
      <div className="max-w-sm mx-auto space-y-3">

        {/* Main 1-Tap Pay via UPI App Button */}
        <a
          href={getAppHref("generic")}
          onClick={(e) => handleUpiTap(e, "generic")}
          className="w-full inline-flex items-center justify-center gap-2.5 px-6 py-4 bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-600 hover:from-emerald-700 hover:to-teal-700 text-white font-extrabold rounded-2xl shadow-lg shadow-emerald-600/25 active:scale-[0.99] transition-all text-base border border-emerald-400/30 cursor-pointer"
        >
          <Smartphone className="w-5 h-5" />
          <span>{t.pay_with_upi_app}</span>
          <ExternalLink className="w-4 h-4 ml-1 opacity-80" />
        </a>

        {/* Quick 1-Tap Direct UPI App Buttons */}
        <div className="pt-1">
          <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 text-center mb-2">
            {t.or_choose_app}
          </div>
          <div className="grid grid-cols-4 gap-2">
            {/* Google Pay */}
            <a
              href={getAppHref("gpay")}
              onClick={(e) => handleUpiTap(e, "gpay")}
              className="flex flex-col items-center justify-center p-2.5 bg-white hover:bg-slate-50 border border-slate-200 hover:border-blue-400 rounded-2xl shadow-2xs transition-all active:scale-95 group text-center cursor-pointer"
              title="Pay with Google Pay"
            >
              <div className="w-8 h-8 rounded-full bg-slate-50 border border-slate-100 flex items-center justify-center mb-1 group-hover:scale-105 transition-transform">
                <svg className="w-4 h-4" viewBox="0 0 24 24">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05"/>
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" fill="#EA4335"/>
                </svg>
              </div>
              <span className="text-[11px] font-bold text-slate-700 leading-tight">GPay</span>
            </a>

            {/* PhonePe */}
            <a
              href={getAppHref("phonepe")}
              onClick={(e) => handleUpiTap(e, "phonepe")}
              className="flex flex-col items-center justify-center p-2.5 bg-white hover:bg-slate-50 border border-slate-200 hover:border-purple-400 rounded-2xl shadow-2xs transition-all active:scale-95 group text-center cursor-pointer"
              title="Pay with PhonePe"
            >
              <div className="w-8 h-8 rounded-full bg-[#5f259f] flex items-center justify-center mb-1 text-white font-black text-xs group-hover:scale-105 transition-transform shadow-xs">
                पे
              </div>
              <span className="text-[11px] font-bold text-slate-700 leading-tight">PhonePe</span>
            </a>

            {/* Paytm */}
            <a
              href={getAppHref("paytm")}
              onClick={(e) => handleUpiTap(e, "paytm")}
              className="flex flex-col items-center justify-center p-2.5 bg-white hover:bg-slate-50 border border-slate-200 hover:border-sky-400 rounded-2xl shadow-2xs transition-all active:scale-95 group text-center cursor-pointer"
              title="Pay with Paytm"
            >
              <div className="w-8 h-8 rounded-full bg-[#00baf2] flex items-center justify-center mb-1 text-white font-black text-[9px] tracking-tighter group-hover:scale-105 transition-transform shadow-xs">
                paytm
              </div>
              <span className="text-[11px] font-bold text-slate-700 leading-tight">Paytm</span>
            </a>

            {/* BHIM / Any UPI */}
            <a
              href={getAppHref("bhim")}
              onClick={(e) => handleUpiTap(e, "bhim")}
              className="flex flex-col items-center justify-center p-2.5 bg-white hover:bg-slate-50 border border-slate-200 hover:border-emerald-400 rounded-2xl shadow-2xs transition-all active:scale-95 group text-center cursor-pointer"
              title="Pay with BHIM or Any UPI App"
            >
              <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-[#00823c] to-[#f37021] flex items-center justify-center mb-1 text-white font-black text-[11px] group-hover:scale-105 transition-transform shadow-xs">
                UPI
              </div>
              <span className="text-[11px] font-bold text-slate-700 leading-tight">BHIM</span>
            </a>
          </div>
        </div>

        {/* Desktop Browser Friendly Notice */}
        {showDesktopNotice && (
          <div className="p-3.5 bg-amber-50 border border-amber-200 text-amber-900 rounded-2xl text-xs space-y-1 animate-in fade-in">
            <div className="font-bold flex items-center gap-1.5">
              <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
              <span>{t.desktop_upi_note}</span>
            </div>
            <p className="text-[11px] text-amber-700">
              UPI apps (GPay, PhonePe, Paytm) run on mobile devices. Please scan the QR code below using your phone camera or payment app.
            </p>
          </div>
        )}

        {/* Post-UPI App Redirect Helper Reminder */}
        {hasTriggeredUpi && (
          <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-2xl text-xs space-y-1 animate-in fade-in">
            <div className="font-bold flex items-center gap-1.5 text-emerald-800">
              <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{t.after_upi_redirect_tip}</span>
            </div>
            <p className="text-[11px] text-emerald-700">
              Once you confirm payment in your UPI app, return here and tap the button below to send your documents to the counter printer!
            </p>
          </div>
        )}

        <p className="text-[11px] text-center text-slate-400">
          💡 Tip: If UPI does not open inside WhatsApp/Instagram, tap ⋮ at top right &rarr; &ldquo;Open in Chrome&rdquo;.
        </p>
      </div>

      {/* QR Code Container */}
      <div
        id="upi-qr-container"
        className="max-w-xs mx-auto bg-white border border-slate-200 rounded-3xl p-5 shadow-sm text-center scroll-mt-6"
      >
        <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-3">
          {t.or_scan_qr}
        </div>

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

      {/* Primary 1-Click Pay & Print Button - Instant Automatic Printing */}
      <div className="max-w-md mx-auto space-y-3">
        <button
          type="button"
          disabled={isSubmitting}
          onClick={() => handlePayAndPrint()}
          className="w-full py-4 px-6 bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-600 hover:from-emerald-700 hover:to-teal-700 disabled:opacity-60 text-white font-extrabold rounded-2xl shadow-xl shadow-emerald-600/25 active:scale-[0.99] transition-all flex items-center justify-center gap-2.5 text-base border border-emerald-400/30 cursor-pointer"
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
