"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { 
  LayoutDashboard, 
  ShoppingBag, 
  Tag, 
  CreditCard, 
  Printer, 
  Settings, 
  FileText, 
  BarChart3, 
  Radio,
  X,
  Menu,
  ExternalLink
} from "lucide-react";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import { useAdminNav } from "@/components/AdminNavContext";

interface Props {
  isAgentOnline?: boolean;
}

export default function AdminSidebar({ isAgentOnline: initialAgentOnline = true }: Props) {
  const pathname = usePathname();
  const { isMobileNavOpen, closeMobileNav, toggleMobileNav } = useAdminNav();
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
    { href: "/admin/payment-methods", label: "Payment Gateway", icon: CreditCard },
    { href: "/admin/printers", label: "Printers & Agent", icon: Printer },
    { href: "/admin/settings", label: "Shop Settings", icon: Settings },
    { href: "/admin/poster", label: "Shop Poster QR", icon: FileText },
    { href: "/admin/reports", label: "Reports & CSV", icon: BarChart3 },
  ];

  // Helper renderer for sidebar content
  const renderSidebarContent = (isMobile = false) => (
    <div className="flex flex-col h-full">
      {/* Brand Header */}
      <div className="p-4 border-b border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-10 h-10 rounded-xl bg-white/10 p-1 flex items-center justify-center border border-white/15 shrink-0">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logos/logo-badge.svg" alt="Preeti Communication" className="w-full h-full object-contain" />
          </div>
          <div className="min-w-0">
            <span className="block font-black text-white text-sm tracking-tight truncate max-w-[130px]">
              Preeti Communication
            </span>
            <p className="text-[10px] text-slate-400 font-medium truncate">
              Cyber Cafe &amp; Print Hub
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
            PRO
          </span>
          {isMobile && (
            <button
              type="button"
              onClick={closeMobileNav}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
              aria-label="Close navigation"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => {
                if (isMobile) closeMobileNav();
              }}
              className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-colors ${
                isActive
                  ? "bg-indigo-600 text-white shadow-sm"
                  : "text-slate-400 hover:text-white hover:bg-slate-800"
              }`}
            >
              <Icon className="w-4 h-4 shrink-0" />
              <span className="truncate">{item.label}</span>
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
          <ExternalLink className="w-3.5 h-3.5" />
        </Link>
      </div>
    </div>
  );

  return (
    <>
      {/* 1. Desktop Fixed Sidebar (Hidden on mobile < md) */}
      <aside className="hidden md:flex md:w-64 bg-slate-900 text-slate-300 flex-col shrink-0 min-h-screen border-r border-slate-800">
        {renderSidebarContent(false)}
      </aside>

      {/* 2. Mobile Slide-Over Drawer with Backdrop (Visible on mobile when isMobileNavOpen is true) */}
      {isMobileNavOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex animate-in fade-in duration-200">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-slate-950/80 backdrop-blur-xs transition-opacity"
            onClick={closeMobileNav}
            aria-hidden="true"
          />

          {/* Slide-out Drawer */}
          <div className="relative w-72 max-w-[85vw] bg-slate-900 text-slate-300 flex flex-col h-full shadow-2xl z-10 animate-in slide-in-from-left duration-200">
            {renderSidebarContent(true)}
          </div>
        </div>
      )}

      {/* 3. Mobile Bottom Quick Navigation Bar (Sticky at bottom on phones) */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-slate-900/95 backdrop-blur-md border-t border-slate-800 px-3 py-1.5 flex items-center justify-around shadow-2xl">
        <Link
          href="/admin"
          className={`flex flex-col items-center gap-0.5 py-1 px-2.5 rounded-xl transition ${
            pathname === "/admin" ? "text-indigo-400 font-bold" : "text-slate-400 hover:text-slate-200"
          }`}
        >
          <LayoutDashboard className="w-4 h-4" />
          <span className="text-[10px]">Dashboard</span>
        </Link>

        <Link
          href="/admin/orders"
          className={`flex flex-col items-center gap-0.5 py-1 px-2.5 rounded-xl transition ${
            pathname === "/admin/orders" ? "text-indigo-400 font-bold" : "text-slate-400 hover:text-slate-200"
          }`}
        >
          <ShoppingBag className="w-4 h-4" />
          <span className="text-[10px]">Orders</span>
        </Link>

        <Link
          href="/admin/printers"
          className={`flex flex-col items-center gap-0.5 py-1 px-2.5 rounded-xl transition ${
            pathname === "/admin/printers" ? "text-indigo-400 font-bold" : "text-slate-400 hover:text-slate-200"
          }`}
        >
          <Printer className="w-4 h-4" />
          <span className="text-[10px]">Printers</span>
        </Link>

        <Link
          href="/admin/poster"
          className={`flex flex-col items-center gap-0.5 py-1 px-2.5 rounded-xl transition ${
            pathname === "/admin/poster" ? "text-indigo-400 font-bold" : "text-slate-400 hover:text-slate-200"
          }`}
        >
          <FileText className="w-4 h-4" />
          <span className="text-[10px]">Poster QR</span>
        </Link>

        <button
          type="button"
          onClick={toggleMobileNav}
          className={`flex flex-col items-center gap-0.5 py-1 px-2.5 rounded-xl transition cursor-pointer ${
            isMobileNavOpen ? "text-indigo-400 font-bold" : "text-slate-400 hover:text-slate-200"
          }`}
          aria-label="Open navigation menu"
        >
          <Menu className="w-4 h-4" />
          <span className="text-[10px]">More</span>
        </button>
      </div>
    </>
  );
}

