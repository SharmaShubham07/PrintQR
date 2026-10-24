"use client";

import React, { useEffect, useState } from "react";
import QRCode from "qrcode";
import AdminSidebar from "@/components/AdminSidebar";
import AdminHeader from "@/components/AdminHeader";
import { Printer, Download, Sparkles, Smartphone, UploadCloud, CheckCircle } from "lucide-react";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";

export default function AdminPosterPage() {
  const [siteUrl, setSiteUrl] = useState("https://print-qr-rose.vercel.app");
  const [qrCodeData, setQrCodeData] = useState<string>("");
  const [shopName, setShopName] = useState("Preeti Communication");
  const [ownerName, setOwnerName] = useState("Preeti Communication");
  const [shopSlug, setShopSlug] = useState("preeti");

  const generateQR = (url: string) => {
    QRCode.toDataURL(url, {
      width: 600,
      margin: 2,
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
        // Default target QR directly to the customer website portal
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

  const handleDownloadQr = () => {
    if (!qrCodeData) return;
    const a = document.createElement("a");
    a.href = qrCodeData;
    a.download = `printqr-${shopSlug || "counter"}-qr.png`;
    a.click();
  };

  return (
    <div className="flex min-h-screen bg-slate-100 print:bg-white">
      <div className="print:hidden">
        <AdminSidebar isAgentOnline={true} />
      </div>

      <div className="flex-1 flex flex-col min-w-0 print:p-0">
        <div className="print:hidden">
          <AdminHeader
            title="Printable Shop Counter Poster & QR"
            subtitle="Customer QR code synced to your live website URL for easy walk-in printing"
            shopName={shopName}
            ownerName={ownerName}
            shopSlug={shopSlug}
          />
        </div>

        <main className="p-6 space-y-6 flex-1 overflow-y-auto print:p-0">
          {/* Controls Bar (Hidden during print) */}
          <div className="print:hidden bg-white border border-slate-200 rounded-2xl p-4 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 w-full sm:w-auto">
              <span className="text-xs font-bold text-slate-700 whitespace-nowrap">QR Links To:</span>
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <input
                  type="text"
                  value={siteUrl}
                  onChange={(e) => handleUrlChange(e.target.value)}
                  placeholder="https://print-qr-rose.vercel.app"
                  className="px-3 py-2 text-xs font-mono border border-slate-300 rounded-xl outline-none focus:border-indigo-500 w-full sm:w-72"
                />
                <button
                  type="button"
                  onClick={() => {
                    if (typeof window !== "undefined") {
                      handleUrlChange(window.location.origin);
                    }
                  }}
                  className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-lg text-xs whitespace-nowrap"
                  title="Reset to Website Home"
                >
                  Website Home (/)
                </button>
              </div>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
              <button
                type="button"
                onClick={handleDownloadQr}
                className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 transition-all"
              >
                <Download className="w-4 h-4" />
                <span>Save QR PNG</span>
              </button>

              <button
                type="button"
                onClick={handlePrint}
                className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-2 shadow-sm transition-all"
              >
                <Printer className="w-4 h-4" />
                <span>Print Poster (A4 Ready)</span>
              </button>
            </div>
          </div>

          {/* Printable A4 Poster Frame */}
          <div className="max-w-xl mx-auto bg-white border-2 border-slate-900 rounded-3xl p-8 sm:p-12 shadow-xl print:shadow-none print:border-none print:max-w-none print:p-8 space-y-8 text-center text-slate-900">
            {/* Header */}
            <div className="space-y-2">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-indigo-50 text-indigo-700 border border-indigo-200">
                <Sparkles className="w-4 h-4" />
                EXPRESS SELF-SERVICE PRINTING
              </div>
              <h1 className="text-4xl sm:text-5xl font-black tracking-tight text-slate-900">
                {shopName}
              </h1>
              <p className="text-base sm:text-lg font-semibold text-slate-600">
                Print Documents Straight from Your Mobile Phone!
              </p>
            </div>

            {/* QR Code */}
            <div className="bg-slate-50 border-4 border-slate-900 rounded-3xl p-6 inline-block shadow-inner mx-auto">
              {qrCodeData && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={qrCodeData}
                  alt="Customer Site QR"
                  className="w-64 h-64 mx-auto rounded-2xl"
                />
              )}
              <p className="mt-3 font-mono font-bold text-xs tracking-wider text-slate-700">
                SCAN WITH ANY CAMERA OR QR APP
              </p>
              <p className="mt-1 font-mono text-[11px] text-slate-500 break-all max-w-[280px]">
                {siteUrl}
              </p>
            </div>

            {/* 3 Steps */}
            <div className="grid grid-cols-3 gap-3 text-left">
              <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200">
                <div className="w-7 h-7 bg-indigo-600 text-white font-black rounded-lg flex items-center justify-center text-xs mb-2">
                  1
                </div>
                <h4 className="font-bold text-xs">Scan &amp; Upload</h4>
                <p className="text-[11px] text-slate-500 mt-0.5">PDF, Photos, Word docs from WhatsApp/storage</p>
              </div>

              <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200">
                <div className="w-7 h-7 bg-indigo-600 text-white font-black rounded-lg flex items-center justify-center text-xs mb-2">
                  2
                </div>
                <h4 className="font-bold text-xs">Pick Options</h4>
                <p className="text-[11px] text-slate-500 mt-0.5">Black &amp; White or Colour, copies &amp; page range</p>
              </div>

              <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200">
                <div className="w-7 h-7 bg-indigo-600 text-white font-black rounded-lg flex items-center justify-center text-xs mb-2">
                  3
                </div>
                <h4 className="font-bold text-xs">Pay &amp; Collect</h4>
                <p className="text-[11px] text-slate-500 mt-0.5">Pay via Razorpay / UPI &amp; collect prints at counter!</p>
              </div>
            </div>

            <p className="text-[11px] text-slate-400">
              Need assistance? Ask our counter staff for help anytime!
            </p>
          </div>
        </main>
      </div>
    </div>
  );
}