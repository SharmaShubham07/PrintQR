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
    const notif = new Notification(options.title, {
      body: options.body,
      icon: options.icon || "/favicon.ico",
      tag: options.tag || "printqr-order-" + Date.now(),
      requireInteraction: true, // Keep notification on screen until user interacts with it in Chrome
    });

    notif.onclick = () => {
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
 * 2. Chrome Desktop OS notification
 * 3. Browser tab flashing
 */
export function triggerFullOrderAlert(order: MinimalOrderInfo, onClick?: () => void) {
  // 1. Play crystal clear shop audio chime
  playNewOrderChime();

  const tokenLabel = order.token_number ? `#${order.token_number}` : (order.order_number || "");
  const isColor = order.files?.some((f) => f.color_mode === "color");
  const totalPages = order.files?.reduce((sum, f) => sum + ((f.effective_pages || f.page_count || 1) * (f.copies || 1)), 0) || 1;
  const printerType = isColor ? "🌈 COLOR (Brother)" : "⚫ B&W (Canon)";
  const customerName = order.customer_name || "Customer";
  const amountStr = order.total_amount ? `₹${Number(order.total_amount).toFixed(2)}` : "Paid";

  // 2. Start tab flashing
  startTabFlashing(`(1) 🖨️ NEW ORDER Token ${tokenLabel}!`);

  // 3. Dispatch on-screen in-app notification popup event (always displays on screen)
  if (typeof window !== "undefined") {
    window.dispatchEvent(
      new CustomEvent("printqr:incoming-order", {
        detail: { order, onClick },
      })
    );
  }

  // 4. Dispatch native Chrome / OS desktop notification (if granted)
  sendDesktopNotification({
    title: `🖨️ New Print Order! Token ${tokenLabel}`,
    body: `${customerName} • ${printerType} • ${totalPages} pgs • ${amountStr}`,
    icon: "/favicon.ico",
    tag: `order-${order.id}`,
    onClick: () => {
      stopTabFlashing();
      if (onClick) onClick();
    },
  });
}
