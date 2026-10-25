"use client";

import React, { useEffect, useState } from "react";
import QRCode from "qrcode";
import AdminSidebar from "@/components/AdminSidebar";
import AdminHeader from "@/components/AdminHeader";
import { 
  Printer, 
  Download, 
  Sparkles, 
  FileDown, 
  Image as ImageIcon, 
  QrCode, 
  ShieldCheck, 
  Check, 
  CheckCircle,
  Loader2,
  ExternalLink
} from "lucide-react";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import { downloadPosterPdf, downloadPosterPng } from "@/lib/poster-canvas";

const LOGO_OPTIONS = [
  {
    id: "badge",
    name: "Badge Logo",
    path: "/logos/logo-badge.svg",
    desc: "Printer icon + Cyan & Blue Gradient",
  },
  {
    id: "monogram",
    name: "Monogram Logo",
    path: "/logos/logo-monogram.svg",
    desc: "Sleek Dark 'P' + Amber Accent",
  },
  {
    id: "pixel",
    name: "Pixel Logo",
    path: "/logos/logo-pixel.svg",
    desc: "Modern Tech Pixel 'P' in Indigo",
  },
];

export default function AdminPosterPage() {
  const [siteUrl, setSiteUrl] = useState("https://print-qr-rose.vercel.app");
  const [qrCodeData, setQrCodeData] = useState<string>("");
  const [shopName, setShopName] = useState("Preeti Communication");
  const [ownerName, setOwnerName] = useState("Preeti Communication");
  const [shopSlug, setShopSlug] = useState("preeti");
  const [selectedLogo, setSelectedLogo] = useState<string>("/logos/logo-badge.svg");
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [isGeneratingPng, setIsGeneratingPng] = useState(false);

  const generateQR = (url: string) => {
    QRCode.toDataURL(url, {
      width: 700,
      margin: 1.5,
      color: {
        dark: "#0f172a",
        light: "#ffffff",
      },
    }).then(setQrCodeData);
  };

  useEffect(() => {
    async function loadShop() {
      let slug = "preeti";
      let name = "Preeti Communication";
      let owner = "Preeti Communication";

      if (isSupabaseConfigured) {
        try {
          const { data } = await supabase
            .from("settings")
            .select("value")
            .eq("key", "shop_info")
            .maybeSingle();
          if (data?.value) {
            if (data.value.shop_name) name = data.value.shop_name;
            if (data.value.owner_name) owner = data.value.owner_name;
            if (data.value.shop_slug) slug = data.value.shop_slug;
          }
        } catch (e) {
          console.error("Error loading poster shop info:", e);
        }
      }

      setShopName(name);
      setOwnerName(owner);
      setShopSlug(slug);

      if (typeof window !== "undefined") {
        const origin = window.location.origin;
        setSiteUrl(origin);
        generateQR(origin);
      } else {
        generateQR("https://print-qr-rose.vercel.app");
      }
    }

    loadShop();
  }, []);

  const handleUrlChange = (newUrl: string) => {
    setSiteUrl(newUrl);
    generateQR(newUrl);
  };

  const handlePrint = () => {
    if (typeof window !== "undefined") {
      window.print();
    }
  };

  const handleDownloadQrOnly = () => {
    if (!qrCodeData) return;
    const a = document.createElement("a");
    a.href = qrCodeData;
    a.download = `printqr-${shopSlug || "counter"}-qr.png`;
    a.click();
  };

  const handleDownloadPdf = async () => {
    try {
      setIsGeneratingPdf(true);
      await downloadPosterPdf({
        shopName,
        siteUrl,
        logoUrl: selectedLogo,
        qrDataUrl: qrCodeData,
        shopSlug,
      });
    } catch (err) {
      console.error("PDF generation failed:", err);
      alert("Failed to generate PDF. You can also use 'Print Poster' and choose 'Save as PDF'.");
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  const handleDownloadPosterPng = async () => {
    try {
      setIsGeneratingPng(true);
      await downloadPosterPng({
        shopName,
        siteUrl,
        logoUrl: selectedLogo,
        qrDataUrl: qrCodeData,
        shopSlug,
      });
    } catch (err) {
      console.error("PNG poster generation failed:", err);
    } finally {
      setIsGeneratingPng(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-slate-100 print:bg-white">
      {/* Sidebar hidden during print */}
      <div className="print:hidden">
        <AdminSidebar isAgentOnline={true} />
      </div>

      <div className="flex-1 flex flex-col min-w-0 print:p-0">
        <div className="print:hidden">
          <AdminHeader
            title="Shop Counter Poster & Print Kit"
            subtitle="Professional business counter display with your official logo & instant QR code"
            shopName={shopName}
            ownerName={ownerName}
            shopSlug={shopSlug}
          />
        </div>

        <main className="p-4 sm:p-6 space-y-6 flex-1 overflow-y-auto print:p-0">
          {/* Top Control Bar (Hidden during print) */}
          <div className="print:hidden bg-white border border-slate-200 rounded-3xl p-5 shadow-xs space-y-4">
            <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
              {/* URL Config */}
              <div className="space-y-1.5 w-full lg:w-auto">
                <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Target Destination URL:
                </span>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={siteUrl}
                    onChange={(e) => handleUrlChange(e.target.value)}
                    placeholder="https://print-qr-rose.vercel.app"
                    className="px-3.5 py-2 text-xs font-mono font-medium border border-slate-300 rounded-xl outline-none focus:border-indigo-500 w-full sm:w-80 bg-slate-50/50"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      if (typeof window !== "undefined") {
                        handleUrlChange(window.location.origin);
                      }
                    }}
                    className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl text-xs whitespace-nowrap transition cursor-pointer"
                    title="Reset to current site origin"
                  >
                    Current Host (/)
                  </button>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center gap-2.5 w-full lg:w-auto justify-start lg:justify-end">
                {/* Download A4 PDF (Identical to template) */}
                <button
                  type="button"
                  onClick={handleDownloadPdf}
                  disabled={isGeneratingPdf}
                  className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs flex items-center gap-2 shadow-sm transition-all cursor-pointer disabled:opacity-60"
                  title="Download standard A4 PDF identical to template"
                >
                  {isGeneratingPdf ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <FileDown className="w-4 h-4" />
                  )}
                  <span>{isGeneratingPdf ? "Generating PDF…" : "Download A4 PDF"}</span>
                </button>

                {/* Download High-Res Poster Image */}
                <button
                  type="button"
                  onClick={handleDownloadPosterPng}
                  disabled={isGeneratingPng}
                  className="px-3.5 py-2.5 bg-slate-800 hover:bg-slate-900 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-60"
                  title="Download 300 DPI high-resolution PNG image"
                >
                  {isGeneratingPng ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <ImageIcon className="w-4 h-4" />
                  )}
                  <span>Poster Image</span>
                </button>

                {/* Save QR Only */}
                <button
                  type="button"
                  onClick={handleDownloadQrOnly}
                  className="px-3 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs flex items-center gap-1.5 transition-all cursor-pointer"
                  title="Save only the QR code graphic"
                >
                  <QrCode className="w-4 h-4" />
                  <span>QR Only</span>
                </button>

                {/* Print Dialog */}
                <button
                  type="button"
                  onClick={handlePrint}
                  className="px-3.5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-xs transition-all cursor-pointer"
                  title="Open browser print dialog (Ctrl+P)"
                >
                  <Printer className="w-4 h-4" />
                  <span>Print (A4)</span>
                </button>
              </div>
            </div>

            {/* Logo Selection Row */}
            <div className="pt-3 border-t border-slate-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-700">
                <span>Select Logo on Poster:</span>
                <span className="text-[11px] text-slate-400 font-normal">
                  (Pick which logo design appears on your counter printout)
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {LOGO_OPTIONS.map((logo) => {
                  const isSelected = selectedLogo === logo.path;
                  return (
                    <button
                      key={logo.id}
                      type="button"
                      onClick={() => setSelectedLogo(logo.path)}
                      className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-semibold transition cursor-pointer ${
                        isSelected
                          ? "border-indigo-600 bg-indigo-50/70 text-indigo-900 shadow-xs ring-1 ring-indigo-500"
                          : "border-slate-200 bg-white hover:bg-slate-50 text-slate-700"
                      }`}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={logo.path} alt={logo.name} className="h-4 w-auto object-contain" />
                      <span>{logo.name}</span>
                      {isSelected && <Check className="w-3.5 h-3.5 text-indigo-600 ml-0.5" />}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* PRINTABLE A4 POSTER CANVAS CONTAINER */}
          {/* Matches 1:1 with the generated PDF */}
          <div className="max-w-xl mx-auto bg-white border-2 border-slate-900 rounded-3xl p-6 sm:p-10 shadow-2xl print:shadow-none print:border-none print:max-w-none print:p-4 space-y-6 text-center text-slate-900 relative overflow-hidden">
            {/* Top decorative gradient bar */}
            <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-indigo-600 via-cyan-500 to-blue-600"></div>

            {/* Corner Viewfinder brackets for the whole poster */}
            <div className="absolute top-3 left-3 w-6 h-6 border-t-4 border-l-4 border-indigo-600 pointer-events-none"></div>
            <div className="absolute top-3 right-3 w-6 h-6 border-t-4 border-r-4 border-indigo-600 pointer-events-none"></div>
            <div className="absolute bottom-3 left-3 w-6 h-6 border-b-4 border-l-4 border-indigo-600 pointer-events-none"></div>
            <div className="absolute bottom-3 right-3 w-6 h-6 border-b-4 border-r-4 border-indigo-600 pointer-events-none"></div>

            {/* Header: Official Counter Pill & Logo */}
            <div className="space-y-3 pt-2">
              <div className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full text-xs font-black bg-indigo-50 text-indigo-700 border border-indigo-200 shadow-xs">
                <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                <span>OFFICIAL EXPRESS PRINT COUNTER</span>
              </div>

              {/* Display Chosen Business Logo */}
              <div className="flex items-center justify-center pt-1">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={selectedLogo}
                  alt={shopName}
                  className="h-16 sm:h-20 max-w-[280px] sm:max-w-[340px] object-contain mx-auto"
                />
              </div>

              <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900 leading-tight">
                Print Documents Straight from Your Phone!
              </h1>
              <p className="text-xs sm:text-sm font-semibold text-slate-500 max-w-md mx-auto">
                ⚡ Instant Queue &bull; 📱 No WhatsApp Waiting &bull; 🔒 100% Private
              </p>
            </div>

            {/* Hero QR Card with Scanner Target Frame */}
            <div className="bg-slate-50/80 border-2 border-slate-300 rounded-3xl p-5 inline-block shadow-md mx-auto relative group">
              {/* Corner Viewfinder Brackets */}
              <div className="absolute top-2.5 left-2.5 w-6 h-6 border-t-4 border-l-4 border-indigo-600 rounded-tl-lg pointer-events-none"></div>
              <div className="absolute top-2.5 right-2.5 w-6 h-6 border-t-4 border-r-4 border-indigo-600 rounded-tr-lg pointer-events-none"></div>
              <div className="absolute bottom-2.5 left-2.5 w-6 h-6 border-b-4 border-l-4 border-indigo-600 rounded-bl-lg pointer-events-none"></div>
              <div className="absolute bottom-2.5 right-2.5 w-6 h-6 border-b-4 border-r-4 border-indigo-600 rounded-br-lg pointer-events-none"></div>

              {qrCodeData && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={qrCodeData}
                  alt="Customer Site QR"
                  className="w-56 h-56 sm:w-64 sm:h-64 mx-auto rounded-2xl bg-white p-2 shadow-inner"
                />
              )}

              {/* Scanner CTA Badge */}
              <div className="mt-3 inline-flex items-center gap-1.5 px-4 py-1.5 bg-slate-900 text-white rounded-full text-xs font-bold shadow-xs">
                <span>📷 SCAN WITH ANY CAMERA OR QR APP</span>
              </div>

              <p className="mt-2 text-[11px] font-semibold text-slate-500">
                Works with Google Lens &bull; WhatsApp &bull; Paytm &bull; GPay &bull; PhonePe
              </p>

              <p className="mt-1 font-mono text-[11px] font-bold text-indigo-600 break-all max-w-[280px] mx-auto">
                {siteUrl.replace(/^https?:\/\//, "")}
              </p>
            </div>

            {/* 3 Step Process Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-left">
              <div className="bg-slate-50/90 p-3.5 rounded-2xl border border-slate-200 shadow-xs">
                <div className="w-7 h-7 bg-indigo-600 text-white font-black rounded-lg flex items-center justify-center text-xs mb-1.5">
                  1
                </div>
                <h4 className="font-extrabold text-xs text-slate-900">Scan &amp; Upload</h4>
                <p className="text-[10.5px] text-slate-600 mt-0.5 leading-snug font-medium">
                  Open camera, scan QR &amp; select files from WhatsApp or storage.
                </p>
              </div>

              <div className="bg-slate-50/90 p-3.5 rounded-2xl border border-slate-200 shadow-xs">
                <div className="w-7 h-7 bg-cyan-600 text-white font-black rounded-lg flex items-center justify-center text-xs mb-1.5">
                  2
                </div>
                <h4 className="font-extrabold text-xs text-slate-900">Pick Options</h4>
                <p className="text-[10.5px] text-slate-600 mt-0.5 leading-snug font-medium">
                  Choose Canon B&amp;W or Brother Colour, copies &amp; page ranges.
                </p>
              </div>

              <div className="bg-slate-50/90 p-3.5 rounded-2xl border border-slate-200 shadow-xs">
                <div className="w-7 h-7 bg-emerald-600 text-white font-black rounded-lg flex items-center justify-center text-xs mb-1.5">
                  3
                </div>
                <h4 className="font-extrabold text-xs text-slate-900">Pay &amp; Collect</h4>
                <p className="text-[10.5px] text-slate-600 mt-0.5 leading-snug font-medium">
                  Pay securely via UPI or cash, collect ready prints at the counter!
                </p>
              </div>
            </div>

            {/* Supported Document Types Strip */}
            <div className="bg-slate-100/80 border border-slate-200 rounded-xl py-2 px-3 text-[11px] font-bold text-slate-700 flex flex-wrap items-center justify-center gap-x-3 gap-y-1">
              <span>📄 PDF Docs</span>
              <span>•</span>
              <span>🆔 Aadhaar &amp; PAN</span>
              <span>•</span>
              <span>📸 Passport Photos</span>
              <span>•</span>
              <span>📑 Word &amp; Excel</span>
              <span>•</span>
              <span>🎟️ Rail/Air Tickets</span>
            </div>

            {/* Business Trust & Privacy Footer */}
            <div className="space-y-1 text-center pt-1 border-t border-slate-100">
              <p className="text-[11px] text-slate-600 font-medium">
                Need assistance? Ask our counter staff for help anytime! &bull; WiFi available on request
              </p>
              <p className="text-[10px] text-slate-400 font-medium">
                🔒 100% Privacy: Files are processed securely and automatically deleted after printing.
              </p>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}