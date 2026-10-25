/**
 * Web Desktop Notification and Browser Alerts Manager
 * Supports Chrome, Edge, Firefox, Brave desktop popups even when minimized or in another tab.
 */

import { playNewOrderChime } from "./audio";

export type NotificationStatus = "granted" | "denied" | "default" | "unsupported";

export function isNotificationSupported(): boolean {
  return typeof window !== "undefined" && "Notification" in window;
}

export function getNotificationPermission(): NotificationStatus {
  if (!isNotificationSupported()) return "unsupported";
  return Notification.permission as NotificationStatus;
}

export async function requestNotificationPermission(): Promise<NotificationStatus> {
  if (!isNotificationSupported()) return "unsupported";
  try {
    const permission = await Notification.requestPermission();
    return permission as NotificationStatus;
  } catch (err) {
    console.error("Error requesting notification permission:", err);
    return Notification.permission as NotificationStatus;
  }
}

let titleFlashTimer: ReturnType<typeof setInterval> | null = null;
let originalPageTitle = "";

export function startTabFlashing(alertText: string) {
  if (typeof window === "undefined" || typeof document === "undefined") return;

  if (!originalPageTitle) {
    originalPageTitle = document.title || "PrintQR Admin";
  }

  if (titleFlashTimer) {
    clearInterval(titleFlashTimer);
    titleFlashTimer = null;
  }

  let toggle = false;
  titleFlashTimer = setInterval(() => {
    document.title = toggle ? alertText : originalPageTitle;
    toggle = !toggle;
  }, 1000);

  const stopFlashing = () => {
    if (titleFlashTimer) {
      clearInterval(titleFlashTimer);
      titleFlashTimer = null;
    }
    if (originalPageTitle) {
      document.title = originalPageTitle;
    }
    window.removeEventListener("focus", stopFlashing);
    window.removeEventListener("click", stopFlashing);
  };

  window.addEventListener("focus", stopFlashing, { once: true });
  window.addEventListener("click", stopFlashing, { once: true });
}

export function stopTabFlashing() {
  if (typeof window === "undefined" || typeof document === "undefined") return;
  if (titleFlashTimer) {
    clearInterval(titleFlashTimer);
    titleFlashTimer = null;
  }
  if (originalPageTitle) {
    document.title = originalPageTitle;
  }
}

const ALERTED_STORAGE_KEY = "printqr_alerted_orders";

export function hasOrderBeenAlerted(orderId: string): boolean {
  if (typeof window === "undefined") return false;
  try {
    const raw = sessionStorage.getItem(ALERTED_STORAGE_KEY);
    if (!raw) return false;
    const ids = JSON.parse(raw);
    return Array.isArray(ids) && ids.includes(orderId);
  } catch {
    return false;
  }
}

export function markOrderAlerted(orderId: string): void {
  if (typeof window === "undefined") return;
  try {
    const raw = sessionStorage.getItem(ALERTED_STORAGE_KEY);
    const ids: string[] = raw ? JSON.parse(raw) : [];
    if (!ids.includes(orderId)) {
      ids.push(orderId);
      if (ids.length > 50) ids.shift();
      sessionStorage.setItem(ALERTED_STORAGE_KEY, JSON.stringify(ids));
    }
  } catch {}
}

export interface DesktopNotificationOptions {
  title: string;
  body: string;
  icon?: string;
  tag?: string;
  onClick?: () => void;
}

export function sendDesktopNotification(options: DesktopNotificationOptions): Notification | null {
  if (!isNotificationSupported()) return null;
  if (Notification.permission !== "granted") return null;

  try {
    const iconUrl = options.icon || (typeof window !== "undefined" ? `${window.location.origin}/favicon.ico` : "/favicon.ico");
    const notif = new Notification(options.title, {
      body: options.body,
      icon: iconUrl,
      badge: iconUrl,
      tag: options.tag || "printqr-order-" + Date.now(),
      requireInteraction: true, // Keep notification visible on screen in Windows until dismissed/clicked
      silent: false,
    });

    notif.onclick = (e) => {
      e.preventDefault();
      try {
        window.focus();
      } catch (e) {
        // ignore
      }
      if (options.onClick) {
        options.onClick();
      }
      notif.close();
    };

    return notif;
  } catch (err) {
    console.warn("Failed to instantiate desktop notification:", err);
    return null;
  }
}

export interface MinimalOrderInfo {
  id: string;
  token_number?: number;
  order_number?: string;
  customer_name?: string;
  total_amount?: number;
  status?: string;
  files?: Array<{
    color_mode?: string;
    page_count?: number;
    effective_pages?: number;
    copies?: number;
  }>;
}

/**
 * Triggers full multi-modal alert:
 * 1. Audio chime (Web Audio API)
 * 2. Chrome Desktop OS notification (pops up on Windows regardless of active app/tab)
 * 3. Browser tab flashing
 */
export function triggerFullOrderAlert(order: MinimalOrderInfo, onClick?: () => void) {
  // Prevent duplicate chimes across components or multiple open admin tabs
  if (order.id && !order.id.startsWith("test-")) {
    if (hasOrderBeenAlerted(order.id)) {
      return;
    }
    markOrderAlerted(order.id);
  }

  // 1. Play crystal clear shop audio chime
  playNewOrderChime();

  const tokenLabel = order.token_number ? `#${order.token_number}` : (order.order_number || "");
  const isColor = order.files?.some((f) => f.color_mode === "color");
  const totalPages = order.files?.reduce((sum, f) => sum + ((f.effective_pages || f.page_count || 1) * (f.copies || 1)), 0) || 1;
  const printerType = isColor ? "Color (Brother)" : "B&W (Canon)";
  const customerName = order.customer_name || "Customer";
  const amountStr = order.total_amount ? `₹${Number(order.total_amount).toFixed(2)}` : "₹0.00";

  // 2. Start tab flashing
  startTabFlashing(`(1) 🖨️ NEW ORDER: Token ${tokenLabel} (${customerName})!`);

  // 3. Dispatch on-screen in-app notification popup event
  if (typeof window !== "undefined") {
    window.dispatchEvent(
      new CustomEvent("printqr:incoming-order", {
        detail: { order, onClick },
      })
    );
  }

  // 4. Dispatch native Windows OS desktop notification (visible from any desktop tab / program)
  sendDesktopNotification({
    title: `🖨️ New Print Request! Token ${tokenLabel}`,
    body: `Customer: ${customerName}\n${printerType} • ${totalPages} pg • Total: ${amountStr}`,
    icon: "/favicon.ico",
    tag: `order-${order.id}`,
    onClick: () => {
      stopTabFlashing();
      if (onClick) {
        onClick();
      } else if (typeof window !== "undefined") {
        window.focus();
        window.location.href = `/admin/orders?order=${order.order_number || order.id}`;
      }
    },
  });
}
