"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { Volume2, Bell, Shield, Check, Copy, ExternalLink, QrCode, Sparkles, BellRing, BellOff, KeyRound, LogOut } from "lucide-react";
import { useRouter } from "next/navigation";
import ChangePasswordModal from "@/components/ChangePasswordModal";
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

  return (
    <header className="bg-white border-b border-slate-200 px-6 py-4 flex flex-col md:flex-row md:items-center justify-between gap-4 sticky top-0 z-30 shadow-xs">
      <div>
        <div className="flex items-center gap-2.5 flex-wrap">
          <h1 className="text-xl font-black text-slate-900 tracking-tight">{title}</h1>
          <button
            type="button"
            onClick={toggleShop}
            disabled={isToggling}
            className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold border transition-colors cursor-pointer ${
              localClosed
                ? "bg-rose-50 hover:bg-rose-100 text-rose-700 border-rose-200"
                : "bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border-emerald-200"
            }`}
            title="Click to toggle shop open/closed status"
          >
            <span className={`w-1.5 h-1.5 rounded-full ${localClosed ? "bg-rose-500" : "bg-emerald-500 animate-pulse"}`}></span>
            <span>{localClosed ? "Queue Paused (Click to Open)" : "Counter Active (Click to Pause)"}</span>
          </button>
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

        {/* Chrome / Desktop Popup Notification Button */}
        <button
          type="button"
          onClick={handleToggleOrTestNotification}
          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-semibold transition-all shadow-xs ${
            notifPermission === "granted"
              ? "border-emerald-200 bg-emerald-50/80 text-emerald-700 hover:bg-emerald-100/80"
              : notifPermission === "denied"
              ? "border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100"
              : "border-indigo-300 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 animate-pulse"
          }`}
          title={
            notifPermission === "granted"
              ? "Chrome alerts active! Click to test popup & sound."
              : notifPermission === "denied"
              ? "Chrome notifications blocked. Click for instructions to unblock."
              : "Click to enable Chrome popup notifications for new print orders!"
          }
        >
          {notifPermission === "granted" ? (
            testedAudio ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <BellRing className="w-3.5 h-3.5 text-emerald-600" />
          ) : notifPermission === "denied" ? (
            <BellOff className="w-3.5 h-3.5 text-rose-600" />
          ) : (
            <Bell className="w-3.5 h-3.5 text-indigo-600" />
          )}
          <span>
            {notifPermission === "granted"
              ? (testedAudio ? "Chime & Popup Sent!" : "Chrome Alerts: On")
              : notifPermission === "denied"
              ? "Alerts Blocked"
              : "Enable Chrome Popups"}
          </span>
        </button>

        {/* Shopkeeper Profile Card with Quick Actions */}
        <div className="relative flex items-center gap-2 pl-2 border-l border-slate-200">
          <button
            type="button"
            onClick={() => setShowPasswordModal(true)}
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-xs font-semibold text-slate-700 transition shadow-xs cursor-pointer"
            title="Change Admin Password"
          >
            <KeyRound className="w-3.5 h-3.5 text-indigo-600" />
            <span className="hidden sm:inline">Change Password</span>
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
          <div className="hidden sm:block text-left">
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

