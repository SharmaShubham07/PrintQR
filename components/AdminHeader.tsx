"use client";

import React, { useState } from "react";
import { Volume2, Bell, Shield, Check } from "lucide-react";
import { playNewOrderChime } from "@/lib/audio";

interface Props {
  title: string;
  subtitle?: string;
}

export default function AdminHeader({ title, subtitle }: Props) {
  const [testedAudio, setTestedAudio] = useState(false);

  const testAudio = () => {
    playNewOrderChime();
    setTestedAudio(true);
    setTimeout(() => setTestedAudio(false), 2000);
  };

  return (
    <header className="bg-white border-b border-slate-200 px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      <div>
        <h1 className="text-xl font-bold text-slate-900 tracking-tight">{title}</h1>
        {subtitle && <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>}
      </div>

      <div className="flex items-center gap-2.5">
        {/* Audio notification test button */}
        <button
          type="button"
          onClick={testAudio}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-xs font-semibold text-slate-600 transition-colors"
          title="Test Order Incoming Chime"
        >
          {testedAudio ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Volume2 className="w-3.5 h-3.5 text-indigo-600" />}
          <span>{testedAudio ? "Chime Played!" : "Test Chime"}</span>
        </button>

        <div className="flex items-center gap-2 pl-2 border-l border-slate-200">
          <div className="w-8 h-8 rounded-full bg-indigo-50 border border-indigo-200 flex items-center justify-center text-indigo-700 font-bold text-xs">
            PC
          </div>
          <div className="hidden sm:block text-left">
            <p className="text-xs font-bold text-slate-800 leading-none">Preeti Staff</p>
            <p className="text-[10px] text-slate-400">Shop Counter</p>
          </div>
        </div>
      </div>
    </header>
  );
}
