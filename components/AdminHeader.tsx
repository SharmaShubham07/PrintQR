"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Volume2, Bell, Shield, Check, Copy, ExternalLink, QrCode, Sparkles } from "lucide-react";
import { playNewOrderChime } from "@/lib/audio";

interface Props {
  title: string;
  subtitle?: string;
  shopName?: string;
  ownerName?: string;
  shopSlug?: string;
  isShopClosed?: boolean;
}

export default function AdminHeader({ 
  title, 
  subtitle,
  shopName = "Preeti Communication",
  ownerName = "Preeti Communication",
  shopSlug = "preeti",
  isShopClosed = false
}: Props) {
  const [testedAudio, setTestedAudio] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  const testAudio = () => {
    playNewOrderChime();
    setTestedAudio(true);
    setTimeout(() => setTestedAudio(false), 2000);
  };

  const copyCustomerLink = () => {
    if (typeof window !== "undefined") {
      const origin = window.location.origin;
      navigator.clipboard.writeText(origin);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2200);
    }
  };

  return (
    <header className="bg-white border-b border-slate-200 px-6 py-4 flex flex-col md:flex-row md:items-center justify-between gap-4 sticky top-0 z-30 shadow-xs">
      <div>
        <div className="flex items-center gap-2.5 flex-wrap">
          <h1 className="text-xl font-black text-slate-900 tracking-tight">{title}</h1>
          <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${
            isShopClosed
              ? "bg-rose-50 text-rose-700 border-rose-200"
              : "bg-emerald-50 text-emerald-700 border-emerald-200"
          }`}>
            <span className={`w-1.5 h-1.5 rounded-full ${isShopClosed ? "bg-rose-500" : "bg-emerald-500 animate-pulse"}`}></span>
            {isShopClosed ? "Queue Paused" : "Counter Active"}
          </span>
        </div>
        {subtitle && <p className="text-xs text-slate-500 mt-0.5 font-medium">{subtitle}</p>}
      </div>

      <div className="flex items-center gap-2.5 flex-wrap">
        {/* Customer Shop URL 1-Click Copy */}
        <button
          type="button"
          onClick={copyCustomerLink}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-indigo-200 bg-indigo-50/70 hover:bg-indigo-100/70 text-indigo-700 text-xs font-bold transition-all shadow-xs"
          title="Copy customer website upload link"
        >
          {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5 text-indigo-600" />}
          <span>{copiedLink ? "Link Copied!" : "Website Link"}</span>
        </button>

        {/* Counter Poster Quick Link */}
        <Link
          href="/admin/poster"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-xs font-semibold text-slate-700 transition-colors shadow-xs"
          title="Print Shopkeeper Counter Stand QR Poster"
        >
          <QrCode className="w-3.5 h-3.5 text-slate-500" />
          <span className="hidden sm:inline">Counter Poster</span>
        </Link>

        {/* Audio notification test button */}
        <button
          type="button"
          onClick={testAudio}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-xs font-semibold text-slate-600 transition-colors shadow-xs"
          title="Test Order Incoming Chime"
        >
          {testedAudio ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Volume2 className="w-3.5 h-3.5 text-indigo-600" />}
          <span className="hidden sm:inline">{testedAudio ? "Chime Played!" : "Test Chime"}</span>
        </button>

        {/* Shopkeeper Profile Card */}
        <div className="flex items-center gap-2 pl-2 border-l border-slate-200">
          <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-indigo-600 to-cyan-500 text-white flex items-center justify-center font-black text-xs shadow-xs">
            {ownerName ? ownerName.charAt(0).toUpperCase() : "S"}
          </div>
          <div className="hidden sm:block text-left">
            <p className="text-xs font-bold text-slate-800 leading-none">{ownerName || "Shopkeeper"}</p>
            <p className="text-[10px] text-slate-400 font-medium truncate max-w-[120px]">{shopName}</p>
          </div>
        </div>
      </div>
    </header>
  );
}

