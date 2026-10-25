"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { Volume2, Bell, Shield, Check, Copy, ExternalLink, QrCode, Sparkles, BellRing, BellOff, KeyRound, LogOut, Menu } from "lucide-react";
import { useRouter } from "next/navigation";
import ChangePasswordModal from "@/components/ChangePasswordModal";
import { useAdminNav } from "@/components/AdminNavContext";
import { playNewOrderChime } from "@/lib/audio";

import { 
  getNotificationPermission, 
  requestNotificationPermission, 
  triggerFullOrderAlert, 
  NotificationStatus 
} from "@/lib/notifications";

interface Props {
  title: string;
  subtitle?: string;
  shopName?: string;
  ownerName?: string;
  shopSlug?: string;
  isShopClosed?: boolean;
  onToggleShopClosed?: (closed: boolean) => void;
}

export default function AdminHeader({ 
  title, 
  subtitle,
  shopName = "Preeti Communication",
  ownerName = "Preeti Communication",
  shopSlug = "preeti",
  isShopClosed = false,
  onToggleShopClosed
}: Props) {
  const router = useRouter();
  const [testedAudio, setTestedAudio] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [localClosed, setLocalClosed] = useState(isShopClosed);
  const [isToggling, setIsToggling] = useState(false);
  const [notifPermission, setNotifPermission] = useState<NotificationStatus>("default");
  const [showPasswordModal, setShowPasswordModal] = useState(false);

  const handleLogout = async () => {
    try {
      await fetch("/api/admin/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "logout" }),
      });
      router.push("/admin/login");
    } catch {
      router.push("/admin/login");
    }
  };

  useEffect(() => {
    setLocalClosed(isShopClosed);
    const perm = getNotificationPermission();
    setNotifPermission(perm);
    if (perm === "default") {
      requestNotificationPermission()
        .then((res) => setNotifPermission(res))
        .catch(() => {});
    }
  }, [isShopClosed]);

  const handleToggleOrTestNotification = async () => {
    // 1. Immediately trigger the On-Screen popup alert + audio chime
    setTestedAudio(true);
    triggerFullOrderAlert({
      id: "test-notification-" + Date.now(),
      token_number: 1,
      customer_name: "Walk-in Customer (Test)",
      total_amount: 30.00,
      status: "queued",
      files: [{ color_mode: "color", page_count: 2, copies: 1 }]
    });
    setTimeout(() => setTestedAudio(false), 2500);

    // 2. Also prompt/verify browser OS desktop notification permission
    const current = getNotificationPermission();
    if (current === "default") {
      const res = await requestNotificationPermission();
      setNotifPermission(res);
    } else if (current === "denied") {
      alert("Chrome desktop notifications are blocked in your browser settings.\n\nTo allow Chrome popups outside this tab:\n1. Click the tune/lock icon 🔒 to the left of the address bar.\n2. Set 'Notifications' to 'Allow'.\n3. Refresh this page.\n\n(In-app on-screen popups and sound will still work normally!)");
    }
  };

  const toggleShop = async () => {
    setIsToggling(true);
    const targetState = !localClosed;
    setLocalClosed(targetState);
    try {
      await fetch("/api/admin/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_closed: targetState }),
      });
      onToggleShopClosed?.(targetState);
    } catch (err) {
      console.error("Error toggling shop status:", err);
      setLocalClosed(!targetState);
    } finally {
      setIsToggling(false);
    }
  };

  const copyCustomerLink = () => {
    if (typeof window !== "undefined") {
      const origin = window.location.origin;
      navigator.clipboard.writeText(origin);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2200);
    }
  };

  const { toggleMobileNav } = useAdminNav();

  return (
    <header className="bg-white border-b border-slate-200 px-3.5 sm:px-6 py-2.5 sm:py-3.5 flex flex-col md:flex-row md:items-center justify-between gap-3 sticky top-0 z-30 shadow-xs">
      <div className="flex items-center justify-between gap-2.5">
        <div className="flex items-center gap-2.5 min-w-0">
          {/* Mobile Hamburger Trigger */}
          <button
            type="button"
            onClick={toggleMobileNav}
            className="md:hidden p-2 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-slate-200 transition shrink-0 cursor-pointer"
            aria-label="Toggle navigation menu"
          >
            <Menu className="w-5 h-5" />
          </button>

          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-base sm:text-xl font-black text-slate-900 tracking-tight truncate max-w-[200px] sm:max-w-md">
                {title}
              </h1>
              <button
                type="button"
                onClick={toggleShop}
                disabled={isToggling}
                className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] sm:text-[11px] font-bold border transition-colors cursor-pointer shrink-0 ${
                  localClosed
                    ? "bg-rose-50 hover:bg-rose-100 text-rose-700 border-rose-200"
                    : "bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border-emerald-200"
                }`}
                title="Click to toggle shop open/closed status"
              >
                <span className={`w-1.5 h-1.5 rounded-full ${localClosed ? "bg-rose-500" : "bg-emerald-500 animate-pulse"}`}></span>
                <span>
                  {localClosed ? "Paused" : "Active"}
                  <span className="hidden sm:inline">{localClosed ? " (Click to Open)" : " Counter"}</span>
                </span>
              </button>
            </div>
            {subtitle && (
              <p className="text-[11px] sm:text-xs text-slate-500 mt-0.5 font-medium truncate max-w-sm sm:max-w-xl">
                {subtitle}
              </p>
            )}
          </div>
        </div>

        {/* Mobile Quick Logout & Password icons (only on tiny screens) */}
        <div className="flex sm:hidden items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={() => setShowPasswordModal(true)}
            className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:text-indigo-600 hover:bg-slate-50 transition"
            title="Change Password"
          >
            <KeyRound className="w-4 h-4 text-indigo-600" />
          </button>
          <button
            type="button"
            onClick={handleLogout}
            className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:text-rose-600 hover:bg-rose-50 transition"
            title="Log Out"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="flex items-center gap-2 sm:gap-2.5 flex-wrap justify-between sm:justify-end">
        {/* Customer Shop URL 1-Click Copy */}
        <button
          type="button"
          onClick={copyCustomerLink}
          className="inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl border border-indigo-200 bg-indigo-50/70 hover:bg-indigo-100/70 text-indigo-700 text-xs font-bold transition-all shadow-xs cursor-pointer"
          title="Copy customer website upload link"
        >
          {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5 text-indigo-600" />}
          <span className="text-[11px] sm:text-xs">{copiedLink ? "Copied!" : "Link"}</span>
        </button>

        {/* Counter Poster Quick Link */}
        <Link
          href="/admin/poster"
          className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-xs font-semibold text-slate-700 transition-colors shadow-xs"
          title="Print Shopkeeper Counter Stand QR Poster"
        >
          <QrCode className="w-3.5 h-3.5 text-slate-500" />
          <span>Counter Poster</span>
        </Link>

        {/* Chrome / Desktop Popup Notification Button */}
        <button
          type="button"
          onClick={handleToggleOrTestNotification}
          className={`inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl border text-xs font-semibold transition-all shadow-xs cursor-pointer ${
            notifPermission === "granted"
              ? "border-emerald-200 bg-emerald-50/80 text-emerald-700 hover:bg-emerald-100/80"
              : notifPermission === "denied"
              ? "border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100"
              : "border-indigo-300 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 animate-pulse"
          }`}
          title={
            notifPermission === "granted"
              ? "Alerts active! Click to test chime."
              : notifPermission === "denied"
              ? "Notifications blocked."
              : "Enable alert notifications"
          }
        >
          {notifPermission === "granted" ? (
            testedAudio ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <BellRing className="w-3.5 h-3.5 text-emerald-600" />
          ) : notifPermission === "denied" ? (
            <BellOff className="w-3.5 h-3.5 text-rose-600" />
          ) : (
            <Bell className="w-3.5 h-3.5 text-indigo-600" />
          )}
          <span className="text-[11px] sm:text-xs">
            {notifPermission === "granted"
              ? (testedAudio ? "Chime Sent!" : "Alerts: On")
              : notifPermission === "denied"
              ? "Alerts Off"
              : "Enable Alerts"}
          </span>
        </button>

        {/* Shopkeeper Profile Card with Quick Actions */}
        <div className="hidden sm:flex items-center gap-2 pl-2 border-l border-slate-200">
          <button
            type="button"
            onClick={() => setShowPasswordModal(true)}
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-xs font-semibold text-slate-700 transition shadow-xs cursor-pointer"
            title="Change Admin Password"
          >
            <KeyRound className="w-3.5 h-3.5 text-indigo-600" />
            <span className="hidden md:inline">Password</span>
          </button>

          <button
            type="button"
            onClick={handleLogout}
            className="p-1.5 rounded-xl border border-slate-200 hover:bg-rose-50 hover:text-rose-600 text-slate-500 transition shadow-xs cursor-pointer"
            title="Log Out of Admin Panel"
          >
            <LogOut className="w-3.5 h-3.5" />
          </button>

          <div className="w-8 h-8 rounded-full bg-white border border-slate-200 p-0.5 flex items-center justify-center shadow-xs overflow-hidden">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logos/logo-badge.svg" alt="Preeti Logo" className="w-full h-full object-contain" />
          </div>
          <div className="hidden lg:block text-left">
            <p className="text-xs font-bold text-slate-800 leading-none">{ownerName || "Preeti Communication"}</p>
            <p className="text-[10px] text-slate-400 font-medium truncate max-w-[120px]">{shopName}</p>
          </div>
        </div>
      </div>

      <ChangePasswordModal
        isOpen={showPasswordModal}
        onClose={() => setShowPasswordModal(false)}
      />
    </header>
  );
}

