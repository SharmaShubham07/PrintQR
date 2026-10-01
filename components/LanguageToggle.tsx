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
    <div className="inline-flex items-center bg-white/90 backdrop-blur-sm border border-slate-200 rounded-full p-1 shadow-sm">
      <div className="px-2 text-slate-400">
        <Globe className="w-4 h-4" />
      </div>
      <div className="flex space-x-1">
        {languages.map((lang) => {
          const isActive = currentLanguage === lang.code;
          return (
            <button
              key={lang.code}
              type="button"
              onClick={() => onLanguageChange(lang.code)}
              className={`px-3 py-1 text-xs font-semibold rounded-full transition-all duration-200 ${
                isActive
                  ? "bg-indigo-600 text-white shadow-sm"
                  : "text-slate-600 hover:text-indigo-600 hover:bg-slate-100"
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
