"use client";

import React from "react";
import Link from "next/link";
import { Printer, ShieldCheck, Sparkles } from "lucide-react";
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
    <header className="sticky top-0 z-40 bg-white/85 backdrop-blur-xl border-b border-slate-200/80 shadow-xs">
      <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
        {/* Modern Sleek Brand Logo */}
        <Link href="/" className="flex items-center gap-3 group">
          <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-gradient-to-tr from-indigo-600 via-indigo-600 to-violet-600 text-white flex items-center justify-center shadow-md shadow-indigo-600/25 group-hover:scale-105 transition-all">
            <Printer className="w-5 h-5 sm:w-6 sm:h-6 stroke-[2.2]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-slate-900 text-base sm:text-lg leading-tight tracking-tight">
                {t.shop_title}
              </span>
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-indigo-50 text-indigo-700 border border-indigo-200/80">
                <Sparkles className="w-2.5 h-2.5 text-indigo-600" />
                PrintQR
              </span>
            </div>
            <p className="text-[11px] text-slate-500 font-medium hidden sm:block">
              {t.shop_subtitle}
            </p>
          </div>
        </Link>

        {/* Right Controls */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Status Badge */}
          {isShopClosed ? (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200 hidden sm:inline-flex">
              <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse"></span>
              Counter Paused
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 hidden sm:inline-flex">
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
            className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold shadow-xs active:scale-95 transition-all flex items-center gap-1.5"
            title="Shopkeeper Admin Login"
          >
            <ShieldCheck className="w-4 h-4 text-indigo-400 stroke-[2.5]" />
            <span className="hidden md:inline">Admin</span>
          </Link>
        </div>
      </div>
    </header>
  );
}
