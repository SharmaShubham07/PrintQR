"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { 
  LayoutDashboard, 
  ShoppingBag, 
  Tag, 
  QrCode, 
  Printer, 
  Settings, 
  FileText, 
  BarChart3, 
  Radio 
} from "lucide-react";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";

interface Props {
  isAgentOnline?: boolean;
}

export default function AdminSidebar({ isAgentOnline: initialAgentOnline = true }: Props) {
  const pathname = usePathname();
  const [isAgentOnline, setIsAgentOnline] = useState<boolean>(initialAgentOnline);
  const [onlinePrinterCount, setOnlinePrinterCount] = useState<number>(0);

  useEffect(() => {
    async function checkAgentStatus() {
      if (!isSupabaseConfigured) return;
      try {
        const { data: dbPrinters } = await supabase
          .from("printers")
          .select("status, last_heartbeat");

        if (dbPrinters && dbPrinters.length > 0) {
          const now = Date.now();
          const hasRecentHeartbeat = dbPrinters.some((p) => {
            if (!p.last_heartbeat) return false;
            const diffSeconds = (now - new Date(p.last_heartbeat).getTime()) / 1000;
            return diffSeconds < 90;
          });

          const onlineCount = dbPrinters.filter((p) => p.status === "online").length;
          setIsAgentOnline(hasRecentHeartbeat || onlineCount > 0);
          setOnlinePrinterCount(onlineCount);
        }
      } catch (err) {
        // keep previous state on network error
      }
    }

    checkAgentStatus();
    const interval = setInterval(checkAgentStatus, 8000);
    return () => clearInterval(interval);
  }, []);

  const navItems = [
    { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
    { href: "/admin/orders", label: "Live Orders", icon: ShoppingBag },
    { href: "/admin/prices", label: "Pricing & Extras", icon: Tag },
    { href: "/admin/payment-methods", label: "UPI & QRs", icon: QrCode },
    { href: "/admin/printers", label: "Printers & Agent", icon: Printer },
    { href: "/admin/settings", label: "Shop Settings", icon: Settings },
    { href: "/admin/poster", label: "Shop Poster QR", icon: FileText },
    { href: "/admin/reports", label: "Reports & CSV", icon: BarChart3 },
  ];

  return (
    <aside className="w-64 bg-slate-900 text-slate-300 flex flex-col shrink-0 min-h-screen">
      {/* Brand Header */}
      <div className="p-5 border-b border-slate-800 flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="font-black text-white text-base tracking-tight">
              Preeti Communication
            </span>
          </div>
          <p className="text-[11px] text-slate-400 font-medium">
            PrintQR Shop Control
          </p>
        </div>
        <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
          Admin
        </span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-colors ${
                isActive
                  ? "bg-indigo-600 text-white shadow-sm"
                  : "text-slate-400 hover:text-white hover:bg-slate-800"
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* Print Agent Live Indicator Footer */}
      <div className="p-4 border-t border-slate-800 space-y-3">
        <div className="bg-slate-800/80 rounded-2xl p-3 border border-slate-700/60">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-300 flex items-center gap-1.5">
              <Radio className={`w-3.5 h-3.5 ${isAgentOnline ? "text-emerald-400 animate-pulse" : "text-slate-500"}`} />
              Shop PC Agent
            </span>
            <span
              className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                isAgentOnline
                  ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                  : "bg-rose-500/20 text-rose-300 border border-rose-500/30"
              }`}
            >
              {isAgentOnline ? "Online" : "Offline"}
            </span>
          </div>
          <p className="text-[10px] text-slate-400 mt-1">
            {onlinePrinterCount > 0
              ? `${onlinePrinterCount} hardware printer(s) connected`
              : "Checking local print queue..."}
          </p>
        </div>

        <Link
          href="/"
          target="_blank"
          className="flex items-center justify-between text-xs text-slate-400 hover:text-white px-2 py-1 transition-colors"
        >
          <span>Open Customer Site</span>
          <span className="text-[10px] bg-slate-800 px-1.5 py-0.5 rounded">↗</span>
        </Link>
      </div>
    </aside>
  );
}
