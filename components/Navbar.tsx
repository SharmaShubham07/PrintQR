"use client";

import React from "react";
import Link from "next/link";
import { Printer, ShieldCheck, Sparkles, Zap } from "lucide-react";
import LanguageToggle from "./LanguageToggle";
import { Language } from "@/lib/types";
import { translations } from "@/lib/translations";

interface Props {
  language: Language;
  onLanguageChange: (lang: Language) => void;
  isShopClosed?: boolean;
}

export default function Navbar({ language, onLanguageChange, isShopClosed }: Props) {
  const t = translations[language];

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b-2 border-slate-900/90 shadow-xs">
      <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
        {/* Brand with Doodly Sticker Style */}
        <Link href="/" className="flex items-center gap-2.5 group">
          <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-amber-300 border-2 border-slate-900 text-slate-900 flex items-center justify-center shadow-[3px_3px_0px_0px_#0f172a] group-hover:rotate-6 group-hover:scale-105 transition-all">
            <Printer className="w-5 h-5 sm:w-6 sm:h-6 stroke-[2.5]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-black text-slate-900 text-base sm:text-lg leading-tight tracking-tight">
                {t.shop_title}
              </span>
              <span className="sticker-badge bg-yellow-300 text-slate-950 text-[10px] sm:text-[11px] rotate-[-2deg]">
                <Sparkles className="w-3 h-3 text-indigo-700" />
                PrintQR
              </span>
            </div>
            <p className="text-[11px] text-slate-500 font-bold hidden sm:block">
              {t.shop_subtitle}
            </p>
          </div>
        </Link>

        {/* Right Controls */}
        <div className="flex items-center gap-2.5 sm:gap-3">
          {/* Status Badge */}
          {isShopClosed ? (
            <span className="sticker-badge bg-rose-100 text-rose-900 border-slate-900 text-[11px] hidden sm:inline-flex">
              <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse"></span>
              Counter Paused
            </span>
          ) : (
            <span className="sticker-badge bg-emerald-100 text-emerald-950 border-slate-900 text-[11px] hidden sm:inline-flex rotate-[1deg]">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
              60s Fast Prints
            </span>
          )}

          {/* Language Switcher */}
          <LanguageToggle
            currentLanguage={language}
            onLanguageChange={onLanguageChange}
          />

          {/* Admin Dashboard Quick Link */}
          <Link
            href="/admin"
            className="p-2 sm:px-3 sm:py-1.5 rounded-2xl bg-slate-100 hover:bg-slate-200 border-2 border-slate-900 text-slate-800 text-xs font-black shadow-[2px_2px_0px_0px_#0f172a] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none transition-all flex items-center gap-1.5"
            title="Shopkeeper Admin Login"
          >
            <ShieldCheck className="w-4 h-4 text-indigo-600 stroke-[2.5]" />
            <span className="hidden md:inline">Admin</span>
          </Link>
        </div>
      </div>
    </header>
  );
}
