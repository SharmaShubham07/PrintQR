"use client";

import React from "react";
import Link from "next/link";
import { Printer, ShieldCheck, PhoneCall } from "lucide-react";
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
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur border-b border-slate-100 shadow-xs">
      <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 group">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-indigo-500 flex items-center justify-center text-white shadow-md shadow-indigo-200 group-hover:scale-105 transition-transform">
            <Printer className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-slate-900 text-lg leading-tight tracking-tight">
                {t.shop_title}
              </span>
              <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                PrintQR
              </span>
            </div>
            <p className="text-xs text-slate-500 hidden sm:block">
              {t.shop_subtitle}
            </p>
          </div>
        </Link>

        <div className="flex items-center gap-3">
          {isShopClosed ? (
            <span className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-rose-50 text-rose-700 border border-rose-200">
              <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse"></span>
              Closed
            </span>
          ) : (
            <span className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              Counter Live
            </span>
          )}

          <LanguageToggle
            currentLanguage={language}
            onLanguageChange={onLanguageChange}
          />

          <Link
            href="/admin"
            className="p-2 text-slate-500 hover:text-indigo-600 hover:bg-slate-100 rounded-lg transition-colors"
            title="Admin Login"
          >
            <ShieldCheck className="w-5 h-5" />
          </Link>
        </div>
      </div>
    </header>
  );
}
