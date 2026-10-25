"use client";

import React, { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import { Order } from "@/lib/types";
import { 
  triggerFullOrderAlert, 
  getNotificationPermission, 
  requestNotificationPermission,
  stopTabFlashing 
} from "@/lib/notifications";
import { Printer, Zap, X, ArrowRight, User } from "lucide-react";

export default function AdminOrderNotificationWatcher() {
  const router = useRouter();
  const seenOrderIdsRef = useRef<Set<string>>(new Set());
  const isInitialMountRef = useRef(true);
  const [floatingAlert, setFloatingAlert] = useState<Order | null>(null);

  // Auto-request notification permission on admin mount if default
  useEffect(() => {
    if (typeof window !== "undefined") {
      const perm = getNotificationPermission();
      if (perm === "default") {
        requestNotificationPermission().catch(() => {});
      }
    }
  }, []);

  // Listen for custom incoming order event to show floating on-screen toast
  useEffect(() => {
    const handleIncoming = (e: any) => {
      if (e.detail?.order) {
        setFloatingAlert(e.detail.order);
      }
    };
    window.addEventListener("printqr:incoming-order", handleIncoming);
    return () => window.removeEventListener("printqr:incoming-order", handleIncoming);
  }, []);

  // Auto-dismiss floating toast after 14 seconds
  useEffect(() => {
    if (!floatingAlert) return;
    const timer = setTimeout(() => {
      setFloatingAlert(null);
    }, 14000);
    return () => clearTimeout(timer);
  }, [floatingAlert]);

  // Main polling & realtime watcher
  useEffect(() => {
    let isCancelled = false;

    const checkNewOrders = async () => {
      try {
        const res = await fetch(`/api/orders?t=${Date.now()}`, {
          cache: "no-store",
          headers: { "Pragma": "no-cache", "Cache-Control": "no-cache" }
        });
        if (!res.ok) return;

        const data = await res.json();
        if (isCancelled || !data?.success || !Array.isArray(data.orders)) return;

        const orders = data.orders as Order[];

        // On first run, seed all existing IDs so we don't alert for past orders
        if (isInitialMountRef.current) {
          orders.forEach((o) => seenOrderIdsRef.current.add(o.id));
          isInitialMountRef.current = false;
          return;
        }

        // Identify genuine newly submitted orders
        const newOrders = orders.filter((o) => !seenOrderIdsRef.current.has(o.id));
        if (newOrders.length > 0) {
          newOrders.forEach((o) => seenOrderIdsRef.current.add(o.id));

          // Trigger alert for latest incoming order
          const latestOrder = newOrders[0];
          triggerFullOrderAlert(latestOrder, () => {
            stopTabFlashing();
            router.push(`/admin/orders?order=${latestOrder.order_number || latestOrder.id}`);
          });
          setFloatingAlert(latestOrder);
        }
      } catch (err) {
        console.warn("Background order check error:", err);
      }
    };

    // Initial check
    checkNewOrders();

    // Supabase Realtime channel
    let channel: any = null;
    if (isSupabaseConfigured) {
      channel = supabase
        .channel("global-admin-order-watcher")
        .on("postgres_changes", { event: "INSERT", schema: "public", table: "orders" }, () => {
          checkNewOrders();
        })
        .on("postgres_changes", { event: "UPDATE", schema: "public", table: "orders" }, () => {
          checkNewOrders();
        })
        .subscribe();
    }

    // Background polling fallback with tab visibility checks
    const pollOrders = () => {
      if (typeof document !== "undefined" && document.hidden) return;
      checkNewOrders();
    };

    const interval = setInterval(pollOrders, 8000);

    const onVisibility = () => {
      if (typeof document !== "undefined" && !document.hidden) {
        checkNewOrders();
      }
    };
    if (typeof document !== "undefined") {
      document.addEventListener("visibilitychange", onVisibility);
    }

    return () => {
      isCancelled = true;
      clearInterval(interval);
      if (typeof document !== "undefined") {
        document.removeEventListener("visibilitychange", onVisibility);
      }
      if (channel) supabase.removeChannel(channel);
    };
  }, [router]);

  if (!floatingAlert) return null;

  const isColor = floatingAlert.files?.some((f) => f.color_mode === "color");
  const totalPages = floatingAlert.files?.reduce(
    (sum, f) => sum + ((f.effective_pages || f.page_count || 1) * (f.copies || 1)),
    0
  ) || 1;

  return (
    <div className="fixed top-5 right-5 z-[9999] max-w-sm sm:max-w-md w-full bg-slate-900/95 backdrop-blur-md text-white p-4 rounded-2xl shadow-2xl border border-indigo-500/50 animate-in slide-in-from-top-4 duration-200">
      <div className="flex items-start justify-between gap-3 border-b border-slate-800 pb-2.5 mb-2.5">
        <div className="flex items-center gap-2">
          <span className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
          </span>
          <span className="text-[11px] font-black uppercase tracking-wider text-emerald-400 flex items-center gap-1">
            <Zap className="w-3.5 h-3.5 fill-current" />
            New Print Order Incoming!
          </span>
        </div>
        <button
          type="button"
          onClick={() => {
            stopTabFlashing();
            setFloatingAlert(null);
          }}
          className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="flex items-center gap-3">
        <div className="w-11 h-11 rounded-xl bg-indigo-600 text-white flex flex-col items-center justify-center shrink-0 font-black shadow-xs">
          <span className="text-[9px] uppercase tracking-wider text-indigo-200">Token</span>
          <span className="text-base font-black leading-none mt-0.5">
            #{floatingAlert.token_number || 1}
          </span>
        </div>

        <div className="flex-1 min-w-0">
          <h4 className="text-sm font-bold text-white truncate flex items-center gap-1.5">
            <User className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
            <span>{floatingAlert.customer_name || "Walk-in Customer"}</span>
          </h4>
          <p className="text-xs text-slate-300 mt-0.5 flex items-center gap-1.5 flex-wrap">
            <span className="font-mono text-slate-400">Ref: {floatingAlert.order_number}</span>
            <span>•</span>
            <span className={isColor ? "text-purple-300 font-semibold" : "text-slate-300 font-semibold"}>
              {isColor ? "Color" : "B&W"} ({totalPages}p)
            </span>
            <span>•</span>
            <span className="font-bold text-emerald-400">
              ₹{Number(floatingAlert.total_amount || 0).toFixed(2)}
            </span>
          </p>
        </div>
      </div>

      <div className="mt-3 pt-2.5 border-t border-slate-800/80 flex items-center justify-between gap-2">
        <span className="text-[11px] text-slate-400 italic">
          Desktop alert triggered on PC
        </span>
        <button
          type="button"
          onClick={() => {
            stopTabFlashing();
            setFloatingAlert(null);
            router.push(`/admin/orders?order=${floatingAlert.order_number || floatingAlert.id}`);
          }}
          className="py-1 px-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-bold transition flex items-center gap-1 cursor-pointer"
        >
          <span>View & Print</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
