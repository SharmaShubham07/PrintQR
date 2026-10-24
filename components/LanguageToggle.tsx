"use client";

import React from "react";
import { Language } from "@/lib/types";
import { Globe } from "lucide-react";

interface Props {
  currentLanguage: Language;
  onLanguageChange: (lang: Language) => void;
}

export default function LanguageToggle({ currentLanguage, onLanguageChange }: Props) {
  const languages: { code: Language; label: string; native: string }[] = [
    { code: "en", label: "English", native: "EN" },
    { code: "hi", label: "Hindi", native: "हिन्दी" },
    { code: "gu", label: "Gujarati", native: "ગુજરાતી" },
  ];

  return (
    <div className="inline-flex items-center bg-white border-2 border-slate-900 rounded-full p-0.5 shadow-[2px_2px_0px_0px_#0f172a]">
      <div className="pl-1.5 pr-1 text-slate-700">
        <Globe className="w-3.5 h-3.5" />
      </div>
      <div className="flex space-x-1">
        {languages.map((lang) => {
          const isActive = currentLanguage === lang.code;
          return (
            <button
              key={lang.code}
              type="button"
              onClick={() => onLanguageChange(lang.code)}
              className={`px-2.5 py-0.5 text-[11px] font-black rounded-full transition-all duration-150 ${
                isActive
                  ? "bg-slate-900 text-yellow-300 shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              {lang.native}
            </button>
          );
        })}
      </div>
    </div>
  );
}
