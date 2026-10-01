"use client";

import React, { useEffect, useState } from "react";
import QRCode from "qrcode";
import AdminSidebar from "@/components/AdminSidebar";
import AdminHeader from "@/components/AdminHeader";
import { Printer, Download, Sparkles, Smartphone, UploadCloud, CheckCircle } from "lucide-react";

export default function AdminPosterPage() {
  const [siteUrl, setSiteUrl] = useState("https://print-qr-rose.vercel.app");
  const [qrCodeData, setQrCodeData] = useState<string>("");

  useEffect(() => {
    if (typeof window !== "undefined") {
      const origin = window.location.origin;
      setSiteUrl(origin);
      QRCode.toDataURL(origin, {
        width: 400,
        margin: 2,
        color: {
          dark: "#0f172a",
          light: "#ffffff",
        },
      }).then(setQrCodeData);
    }
  }, []);

  const handleUrlChange = (newUrl: string) => {
    setSiteUrl(newUrl);
    QRCode.toDataURL(newUrl, {
      width: 400,
      margin: 2,
      color: {
        dark: "#0f172a",
        light: "#ffffff",
      },
    }).then(setQrCodeData);
  };

  const handlePrint = () => {
    if (typeof window !== "undefined") {
      window.print();
    }
  };

  return (
    <div className="flex min-h-screen bg-slate-100 print:bg-white">
      <div className="print:hidden">
        <AdminSidebar isAgentOnline={true} />
      </div>

      <div className="flex-1 flex flex-col min-w-0 print:p-0">
        <div className="print:hidden">
          <AdminHeader
            title="Printable Shop Counter Poster"
            subtitle="Generate an attractive A4 counter poster with custom QR code for customer walk-ins"
          />
        </div>

        <main className="p-6 space-y-6 flex-1 overflow-y-auto print:p-0">
          {/* Controls Bar (Hidden during print) */}
          <div className="print:hidden bg-white border border-slate-200 rounded-2xl p-4 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <span className="text-xs font-bold text-slate-700 whitespace-nowrap">Target QR URL:</span>
              <input
                type="text"
                value={siteUrl}
                onChange={(e) => handleUrlChange(e.target.value)}
                placeholder="https://..."
                className="px-3 py-1.5 text-xs font-mono border border-slate-300 rounded-xl outline-none focus:border-indigo-500 w-full sm:w-80"
              />
            </div>

            <button
              type="button"
              onClick={handlePrint}
              className="w-full sm:w-auto px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-2 shadow-sm transition-all"
            >
              <Printer className="w-4 h-4" />
              <span>Print Poster Now (A4 Ready)</span>
            </button>
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
                Preeti Communication
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
            </div>

            {/* 3 Steps */}
            <div className="grid grid-cols-3 gap-3 text-left">
              <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200">
                <div className="w-7 h-7 bg-indigo-600 text-white font-black rounded-lg flex items-center justify-center text-xs mb-2">
                  1
                </div>
                <h4 className="font-bold text-xs">Scan & Upload</h4>
                <p className="text-[11px] text-slate-500 mt-0.5">PDF, Photos, Word docs from WhatsApp/storage</p>
              </div>

              <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200">
                <div className="w-7 h-7 bg-indigo-600 text-white font-black rounded-lg flex items-center justify-center text-xs mb-2">
                  2
                </div>
                <h4 className="font-bold text-xs">Pick Options</h4>
                <p className="text-[11px] text-slate-500 mt-0.5">Black & White or Colour, copies & page range</p>
              </div>

              <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200">
                <div className="w-7 h-7 bg-indigo-600 text-white font-black rounded-lg flex items-center justify-center text-xs mb-2">
                  3
                </div>
                <h4 className="font-bold text-xs">Pay & Collect</h4>
                <p className="text-[11px] text-slate-500 mt-0.5">Pay via UPI QR & collect prints at this counter!</p>
              </div>
            </div>

            {/* Pricing Footer on Poster */}
            <div className="bg-indigo-900 text-white rounded-2xl p-4 flex items-center justify-around font-bold text-sm">
              <div>
                Black & White: <span className="text-amber-300 font-black">?8 / page</span>
              </div>
              <div className="h-4 w-px bg-indigo-700"></div>
              <div>
                Colour: <span className="text-amber-300 font-black">?10 / page</span>
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
