"use client";

import React, { useEffect, useState, useRef, useMemo } from "react";
import AdminSidebar from "@/components/AdminSidebar";
import AdminHeader from "@/components/AdminHeader";
import DocumentPreviewModal from "@/components/DocumentPreviewModal";
import { Order, OrderFileItem, OrderStatus, ShopInfo } from "@/lib/types";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import { playNewOrderChime, playCompletedChime, playAlertChime } from "@/lib/audio";
import { triggerFullOrderAlert } from "@/lib/notifications";
import { 
  printOrderFile, 
  printOrderSlip, 
  getFileDownloadUrl 
} from "@/lib/browser-printer";
import { 
  Search, 
  Filter, 
  Check, 
  X, 
  Printer, 
  FileText, 
  ExternalLink, 
  Download, 
  Eye, 
  CheckCircle2, 
  RotateCcw, 
  Clock, 
  AlertTriangle,
  Zap,
  Loader2,
  Copy,
  QrCode,
  Sparkles,
  Users,
  CheckCircle,
  XCircle,
  HelpCircle,
  ArrowRight,
  ShieldAlert,
  Play
} from "lucide-react";

export default function ShopkeeperPrintDashboard() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  
  // Rejection modal
  const [rejectionModalOpen, setRejectionModalOpen] = useState(false);
  const [orderToReject, setOrderToReject] = useState<Order | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");

  // Preview modal state
  const [previewModalOpen, setPreviewModalOpen] = useState(false);
  const [previewFile, setPreviewFile] = useState<OrderFileItem | null>(null);
  const [previewOrder, setPreviewOrder] = useState<Order | null>(null);

  // Printing state
  const [isPrinting, setIsPrinting] = useState(false);
  const [printToast, setPrintToast] = useState<{ message: string; sub?: string } | null>(null);

  // Shop info
  const [shopInfo, setShopInfo] = useState<ShopInfo>({
    shop_name: "Preeti Communication",
    owner_name: "Preeti Communication",
    shop_slug: "preeti",
    tagline: "High Speed Cyber Cafe & Shopkeeper Direct Print Hub",
    phone: "+91 90551 43328",
    email: "preeti.communication@gmail.com",
    address: "Shop No. 4, Market Complex, Opp. Bus Station",
    working_hours: "08:00 AM - 09:30 PM",
    is_closed: false,
    require_approval: true
  });

  const prevOrderCountRef = useRef(0);
  const seenOrderIdsRef = useRef<Set<string>>(new Set());
  const isInitialMountRef = useRef<boolean>(true);
  const [incomingOrderAlert, setIncomingOrderAlert] = useState<Order | null>(null);
  const [highlightedOrderId, setHighlightedOrderId] = useState<string | null>(null);

  // Focus and momentarily highlight an order card
  const focusAndHighlightOrder = (orderId: string) => {
    setHighlightedOrderId(orderId);
    const element = document.getElementById(`order-card-${orderId}`);
    if (element) {
      element.scrollIntoView({ behavior: "smooth", block: "center" });
    }
    setTimeout(() => {
      setHighlightedOrderId((curr) => (curr === orderId ? null : curr));
    }, 4500);
  };

  // Auto-dismiss floating incoming order alert after 16 seconds
  useEffect(() => {
    if (!incomingOrderAlert) return;
    const timer = setTimeout(() => {
      setIncomingOrderAlert(null);
    }, 16000);
    return () => clearTimeout(timer);
  }, [incomingOrderAlert]);

  // Listen for internal or cross-component order alerts (e.g. from test button in header or API events)
  useEffect(() => {
    const handleCustomAlert = (e: any) => {
      if (e.detail?.order) {
        setIncomingOrderAlert(e.detail.order as Order);
      }
    };
    window.addEventListener("printqr:incoming-order", handleCustomAlert);
    return () => window.removeEventListener("printqr:incoming-order", handleCustomAlert);
  }, []);

  // Detect newly placed print orders and trigger Chrome desktop notifications & in-app alerts
  const handleIncomingOrdersDetection = (orderList: Order[]) => {
    if (isInitialMountRef.current) {
      orderList.forEach((o) => seenOrderIdsRef.current.add(o.id));
      isInitialMountRef.current = false;
      return;
    }

    const newOrders = orderList.filter((o) => !seenOrderIdsRef.current.has(o.id));
    if (newOrders.length > 0) {
      newOrders.forEach((o) => seenOrderIdsRef.current.add(o.id));
      const latestOrder = newOrders[0];
      // Trigger full multi-modal alert: audio chime + Chrome notification + tab title + on-screen popup
      triggerFullOrderAlert(latestOrder, () => {
        focusAndHighlightOrder(latestOrder.id);
      });
      setIncomingOrderAlert(latestOrder);
    }
  };

  // Fetch shop settings
  useEffect(() => {
    async function loadShopInfo() {
      try {
        const res = await fetch("/api/admin/settings");
        const data = await res.json();
        if (data?.success && data.settings) {
          setShopInfo((prev) => ({ ...prev, ...data.settings }));
        }
      } catch (e) {
        console.error("Error loading shop settings:", e);
      }
    }
    loadShopInfo();
  }, []);

  // Fetch orders from API with strict no-cache to instantly catch incoming customer prints
  const fetchOrders = async () => {
    try {
      const res = await fetch(`/api/orders?t=${Date.now()}`, {
        cache: "no-store",
        headers: { "Pragma": "no-cache", "Cache-Control": "no-cache" }
      });
      if (res.ok) {
        const data = await res.json();
        if (data.success && Array.isArray(data.orders)) {
          const fetchedOrders = data.orders as Order[];
          handleIncomingOrdersDetection(fetchedOrders);
          prevOrderCountRef.current = fetchedOrders.length;
          setOrders(fetchedOrders);
          setLoading(false);
          return;
        }
      }

      // Supabase direct fallback
      if (isSupabaseConfigured) {
        const { data, error } = await supabase
          .from("orders")
          .select(`
            *,
            files:order_files(
              *,
              printer:printers(id, display_name, system_name)
            )
          `)
          .order("created_at", { ascending: false });

        if (!error && data) {
          handleIncomingOrdersDetection(data as Order[]);
          prevOrderCountRef.current = data.length;
          setOrders(data as Order[]);
        }
      } else {
        // Mock fallback orders
        const mockList: Order[] = [
          {
            id: "ord-1",
            order_number: "PC-1048",
            token_number: 1,
            access_token: "tok-1",
            customer_name: "Amit Patel",
            customer_phone: "9825100000",
            customer_note: "Please staple properly on top left",
            status: "payment_pending",
            total_amount: 48.00,
            utr_number: "427819382104",
            created_at: new Date(Date.now() - 3 * 60000).toISOString(),
            updated_at: new Date().toISOString(),
            files: [
              {
                id: "f-1",
                file_name: "Aadhaar_Card_Front_Back.pdf",
                file_type: "application/pdf",
                file_size: 450000,
                page_count: 2,
                copies: 3,
                color_mode: "bw",
                paper_size: "A4",
                duplex: "single",
                page_range: "all",
                effective_pages: 2,
                price: 48.00,
                status: "pending",
              },
            ],
          },
          {
            id: "ord-2",
            order_number: "PC-1047",
            token_number: 2,
            access_token: "tok-2",
            customer_name: "Sunita Verma",
            customer_phone: "9879100000",
            status: "queued",
            total_amount: 30.00,
            utr_number: "427819381900",
            created_at: new Date(Date.now() - 15 * 60000).toISOString(),
            updated_at: new Date().toISOString(),
            files: [
              {
                id: "f-2",
                file_name: "Project_Presentation_Charts.pptx",
                file_type: "application/vnd.ms-powerpoint",
                file_size: 1540000,
                page_count: 3,
                copies: 1,
                color_mode: "color",
                paper_size: "A4",
                duplex: "single",
                page_range: "all",
                effective_pages: 3,
                price: 30.00,
                status: "queued",
              },
            ],
          },
          {
            id: "ord-3",
            order_number: "PC-1046",
            token_number: 3,
            access_token: "tok-3",
            customer_name: "Rohan Gupta",
            customer_phone: "9811122233",
            status: "completed",
            total_amount: 16.00,
            utr_number: "427819381750",
            created_at: new Date(Date.now() - 40 * 60000).toISOString(),
            updated_at: new Date(Date.now() - 35 * 60000).toISOString(),
            files: [
              {
                id: "f-3",
                file_name: "Resume_Rohan_2026.pdf",
                file_type: "application/pdf",
                file_size: 210000,
                page_count: 2,
                copies: 1,
                color_mode: "bw",
                paper_size: "A4",
                duplex: "single",
                page_range: "all",
                effective_pages: 2,
                price: 16.00,
                status: "printed",
              },
            ],
          },
        ];
        setOrders(mockList);
        prevOrderCountRef.current = mockList.length;
      }
    } catch (err) {
      console.error("Error fetching shopkeeper orders:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();

    if (typeof window !== "undefined") {
      const urlParams = new URLSearchParams(window.location.search);
      const orderParam = urlParams.get("order");
      if (orderParam) setSearch(orderParam);
    }

    let subscription: any = null;
    if (isSupabaseConfigured) {
      subscription = supabase
        .channel("shopkeeper_orders_channel")
        .on("postgres_changes", { event: "*", schema: "public", table: "orders" }, () => fetchOrders())
        .on("postgres_changes", { event: "*", schema: "public", table: "order_files" }, () => fetchOrders())
        .subscribe();
    }

    const interval = setInterval(fetchOrders, 4000);
    return () => {
      clearInterval(interval);
      if (subscription) supabase.removeChannel(subscription);
    };
  }, []);

  // Calculate day-based tokens and queue positions
  const ordersWithQueueInfo = useMemo(() => {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const sortedAsc = [...orders].sort(
      (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    );

    let tokenCounter = 1;
    const tokenMap = new Map<string, number>();
    for (const ord of sortedAsc) {
      if (new Date(ord.created_at) >= todayStart) {
        tokenMap.set(ord.id, tokenCounter++);
      } else {
        tokenMap.set(ord.id, 1);
      }
    }

    const activeList = sortedAsc.filter((o) =>
      ["payment_pending", "paid", "queued", "printing"].includes(o.status)
    );

    return orders.map((ord) => {
      const tokenNum = ord.token_number || tokenMap.get(ord.id) || 1;
      let peopleAhead = 0;
      if (["payment_pending", "paid", "queued", "printing"].includes(ord.status)) {
        const activeIdx = activeList.findIndex((o) => o.id === ord.id);
        peopleAhead = activeIdx !== -1 ? activeIdx : 0;
      }
      return {
        ...ord,
        token_number: tokenNum,
        people_ahead: peopleAhead,
      };
    });
  }, [orders]);

  // Summary Metrics
  const metrics = useMemo(() => {
    const waiting = orders.filter((o) => ["queued", "payment_pending", "paid"].includes(o.status)).length;
    const pendingApproval = orders.filter((o) => o.status === "payment_pending").length;
    const printing = orders.filter((o) => o.status === "printing").length;
    const completed = orders.filter((o) => o.status === "completed").length;
    return { waiting, pendingApproval, printing, completed };
  }, [orders]);

  // Update order status
  const updateOrderStatus = async (orderId: string, status: OrderStatus, reason?: string) => {
    try {
      const res = await fetch(`/api/orders/${orderId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status,
          rejection_reason: reason,
        }),
      });

      if (res.ok) {
        if (status === "completed") {
          playCompletedChime();
        } else if (status === "rejected") {
          playAlertChime();
        }
        setOrders((prev) =>
          prev.map((o) => (o.id === orderId ? { ...o, status, rejection_reason: reason } : o))
        );
      }
    } catch (err) {
      console.error("Update status error:", err);
    }
  };

  // Update single file status
  const updateFileStatus = async (orderId: string, fileId: string, fileStatus: string) => {
    try {
      await fetch(`/api/orders/${orderId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          file_id: fileId,
          file_status: fileStatus,
        }),
      });

      setOrders((prev) =>
        prev.map((o) => {
          if (o.id !== orderId || !o.files) return o;
          return {
            ...o,
            files: o.files.map((f) => (f.id === fileId ? { ...f, status: fileStatus } : f)),
          };
        })
      );
    } catch (err) {
      console.error("Update file status error:", err);
    }
  };

  // 1-Click Print for Single File
  const handlePrintFile = async (file: OrderFileItem, order: Order) => {
    // Payment enforcement: payment must be confirmed before printing
    if (order.status === "payment_pending") {
      const confirmPay = window.confirm(
        `⚠️ Payment Verification Required!\n\nToken #${order.token_number || 1} (${order.customer_name}) has payment pending of ₹${Number(order.total_amount).toFixed(2)}.\n\nHas payment been received? Click OK to confirm payment and proceed with printing "${file.file_name}".`
      );
      if (!confirmPay) {
        return;
      }
      await updateOrderStatus(order.id, "queued");
    }

    setIsPrinting(true);
    setPrintToast({
      message: `Sending "${file.file_name}" to printer...`,
      sub: `Token #${order.token_number || 1} • ${file.copies} ${file.copies > 1 ? "copies" : "copy"} (${file.color_mode.toUpperCase()})`,
    });

    try {
      if (order.status !== "printing" && order.status !== "completed") {
        await updateOrderStatus(order.id, "printing");
      }
      if (file.id) {
        await updateFileStatus(order.id, file.id, "printing");
      }

      await printOrderFile(file, order);

      if (file.id) {
        await updateFileStatus(order.id, file.id, "printed");
      }
    } catch (err) {
      console.error("Print error:", err);
    } finally {
      setIsPrinting(false);
      setTimeout(() => setPrintToast(null), 6000);
    }
  };

  // 1-Click Serial Print All Files in Customer Batch
  const handlePrintAllSerial = async (order: Order) => {
    // Payment enforcement: payment must be confirmed before printing
    if (order.status === "payment_pending") {
      const confirmPay = window.confirm(
        `⚠️ Payment Verification Required!\n\nToken #${order.token_number || 1} (${order.customer_name}) has payment pending of ₹${Number(order.total_amount).toFixed(2)}.\n\nHas payment been received? Click OK to confirm payment and print all files in serial order.`
      );
      if (!confirmPay) {
        return;
      }
      await updateOrderStatus(order.id, "queued");
    }

    if (!order.files || order.files.length === 0) {
      printOrderSlip(order);
      return;
    }

    setIsPrinting(true);
    setPrintToast({
      message: `Serial Printing Token #${order.token_number || 1} (${order.files.length} files)...`,
      sub: `Customer: ${order.customer_name} • Printing files sequentially.`,
    });

    try {
      await updateOrderStatus(order.id, "printing");

      for (let i = 0; i < order.files.length; i++) {
        const file = order.files[i];
        if (file.id) await updateFileStatus(order.id, file.id, "printing");
        await printOrderFile(file, order);
        if (file.id) await updateFileStatus(order.id, file.id, "printed");
      }

      await updateOrderStatus(order.id, "completed");
      playCompletedChime();
    } catch (err) {
      console.error("Serial print error:", err);
    } finally {
      setIsPrinting(false);
      setTimeout(() => setPrintToast(null), 7000);
    }
  };

  // Open Preview Modal
  const handleOpenPreview = (file: OrderFileItem, order: Order) => {
    setPreviewFile(file);
    setPreviewOrder(order);
    setPreviewModalOpen(true);
  };

  // Reject / Decline Handler
  const handleConfirmDecline = async () => {
    if (!orderToReject) return;
    await updateOrderStatus(orderToReject.id, "rejected", rejectionReason || "Declined by shopkeeper");
    setRejectionModalOpen(false);
    setOrderToReject(null);
    setRejectionReason("");
  };

  // Filtered orders list
  const filteredOrders = useMemo(() => {
    return ordersWithQueueInfo.filter((o) => {
      const matchesStatus =
        statusFilter === "all"
          ? true
          : statusFilter === "waiting"
          ? ["payment_pending", "paid", "queued"].includes(o.status)
          : o.status === statusFilter;

      const q = search.toLowerCase().trim();
      if (!q) return matchesStatus;

      const tokenStr = `#${o.token_number}`.toLowerCase();
      const matchesSearch =
        o.customer_name.toLowerCase().includes(q) ||
        o.customer_phone.includes(q) ||
        o.order_number.toLowerCase().includes(q) ||
        tokenStr.includes(q) ||
        (o.utr_number && o.utr_number.includes(q)) ||
        (o.files && o.files.some((f) => f.file_name.toLowerCase().includes(q)));

      return matchesStatus && matchesSearch;
    });
  }, [ordersWithQueueInfo, statusFilter, search]);

  const nextInLineOrder = useMemo(() => {
    return ordersWithQueueInfo.find((o) =>
      ["queued", "payment_pending", "paid"].includes(o.status) && o.people_ahead === 0
    );
  }, [ordersWithQueueInfo]);

  const formatTimeAgo = (dateStr: string) => {
    const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
    if (diff < 60) return "Just now";
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    return `${Math.floor(diff / 3600)}h ago`;
  };

  const formatBytes = (bytes: number) => {
    if (!bytes) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
  };

  return (
    <div className="flex min-h-screen bg-slate-100">
      <AdminSidebar isAgentOnline={true} />

      <div className="flex-1 flex flex-col min-w-0">
        <AdminHeader
          title={`${shopInfo.owner_name} ${shopInfo.shop_name} | Shopkeeper Print Dashboard`}
          subtitle="Real-time Walk-in Queue, Token Counter #1, #2, 1-Click Serial Printing & Document Approvals"
          shopName={shopInfo.shop_name}
          ownerName={shopInfo.owner_name}
          shopSlug={shopInfo.shop_slug || "heusen"}
          isShopClosed={shopInfo.is_closed}
        />

        <main className="p-4 sm:p-6 space-y-5 flex-1 overflow-y-auto">
          {/* Active Print Notification Toast */}
          {printToast && (
            <div className="fixed top-20 right-6 z-50 max-w-md w-full bg-slate-900 text-white p-4 rounded-2xl shadow-2xl border border-slate-700 animate-in fade-in slide-in-from-top-4 duration-200">
              <div className="flex items-start gap-3">
                <div className="p-2.5 bg-indigo-600 rounded-xl shrink-0 mt-0.5">
                  <Printer className="w-5 h-5 text-white animate-pulse" />
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="font-bold text-sm text-white flex items-center gap-2">
                    <span>{printToast.message}</span>
                  </h4>
                  {printToast.sub && (
                    <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                      {printToast.sub}
                    </p>
                  )}
                  <p className="text-[11px] text-amber-300 font-medium mt-1.5 flex items-center gap-1">
                    <span>Opening browser / system print dialog. Check your printer tray!</span>
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setPrintToast(null)}
                  className="text-slate-400 hover:text-white p-1 rounded-lg"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* Shopkeeper Status & Fast Counter Summary */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  In Waiting Queue
                </span>
                <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold text-xs">
                  <Users className="w-4 h-4" />
                </div>
              </div>
              <p className="text-2xl sm:text-3xl font-black text-slate-900 mt-2">
                {metrics.waiting}
              </p>
              <p className="text-[11px] text-slate-400 mt-0.5 font-medium">Walk-ins at counter</p>
            </div>

            <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-amber-600 uppercase tracking-wider">
                  Pending Approval
                </span>
                <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold text-xs">
                  <Clock className="w-4 h-4" />
                </div>
              </div>
              <p className="text-2xl sm:text-3xl font-black text-amber-600 mt-2">
                {metrics.pendingApproval}
              </p>
              <p className="text-[11px] text-slate-400 mt-0.5 font-medium">Requires accept/decline</p>
            </div>

            <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-cyan-600 uppercase tracking-wider">
                  Printing Now
                </span>
                <div className="w-8 h-8 rounded-xl bg-cyan-50 text-cyan-600 flex items-center justify-center font-bold text-xs">
                  <Printer className="w-4 h-4" />
                </div>
              </div>
              <p className="text-2xl sm:text-3xl font-black text-cyan-600 mt-2">
                {metrics.printing}
              </p>
              <p className="text-[11px] text-slate-400 mt-0.5 font-medium">Active in printer spool</p>
            </div>

            <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-emerald-600 uppercase tracking-wider">
                  Completed Today
                </span>
                <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold text-xs">
                  <CheckCircle className="w-4 h-4" />
                </div>
              </div>
              <p className="text-2xl sm:text-3xl font-black text-emerald-600 mt-2">
                {metrics.completed}
              </p>
              <p className="text-[11px] text-slate-400 mt-0.5 font-medium">Printed &amp; collected</p>
            </div>
          </div>

          {/* Quick Counter Banner: Next in Line */}
          {nextInLineOrder && (
            <div className="bg-gradient-to-r from-indigo-900 via-indigo-800 to-slate-900 text-white rounded-2xl p-4 sm:p-5 shadow-md flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center text-indigo-300 font-black text-lg">
                  #{nextInLineOrder.token_number}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-500 text-slate-950">
                      Next in Line
                    </span>
                    <span className="text-xs text-indigo-200">
                      {formatTimeAgo(nextInLineOrder.created_at)}
                    </span>
                    {nextInLineOrder.files?.some((f) => f.color_mode === "color") ? (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-gradient-to-r from-amber-400 to-pink-400 text-slate-950 shadow-xs">
                        🌈 Brother Color
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-slate-950 text-white border border-slate-700 shadow-xs">
                        ⚫ Canon B&amp;W
                      </span>
                    )}
                  </div>
                  <h3 className="text-base sm:text-lg font-black text-white mt-0.5">
                    {nextInLineOrder.customer_name} • {nextInLineOrder.files?.length || 0} document{(nextInLineOrder.files?.length || 0) > 1 ? "s" : ""} • ₹{nextInLineOrder.total_amount?.toFixed(2)}
                  </h3>
                </div>
              </div>

              <div className="flex items-center gap-2.5 w-full sm:w-auto">
                {nextInLineOrder.status === "payment_pending" ? (
                  <button
                    type="button"
                    onClick={() => updateOrderStatus(nextInLineOrder.id, "queued")}
                    className="flex-1 sm:flex-none px-4 py-2.5 bg-emerald-400 hover:bg-emerald-300 text-slate-950 font-black text-xs rounded-xl transition flex items-center justify-center gap-1.5 shadow-md"
                  >
                    <Check className="w-4 h-4 stroke-[3]" />
                    <span>Confirm Payment Received</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => handlePrintAllSerial(nextInLineOrder)}
                    className="flex-1 sm:flex-none px-5 py-2.5 bg-gradient-to-r from-cyan-400 to-indigo-400 hover:from-cyan-300 hover:to-indigo-300 text-slate-950 font-black text-xs rounded-xl transition flex items-center justify-center gap-2 shadow-md"
                  >
                    <Play className="w-3.5 h-3.5 fill-current" />
                    <span>Print All in Sequence</span>
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Search & Status Filters */}
          <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs flex flex-col md:flex-row items-center justify-between gap-3">
            <div className="relative w-full md:w-80">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by Token (#1), Name, File, or Phone..."
                className="w-full pl-9 pr-3 py-2 text-xs border border-slate-300 rounded-xl outline-none focus:border-indigo-500 font-medium"
              />
            </div>

            <div className="flex items-center gap-1.5 w-full md:w-auto overflow-x-auto pb-1 md:pb-0">
              {[
                { key: "all", label: "All Orders" },
                { key: "waiting", label: "Active Queue" },
                { key: "payment_pending", label: "Pending Approval" },
                { key: "printing", label: "Printing" },
                { key: "completed", label: "Completed" },
                { key: "rejected", label: "Declined" },
              ].map((f) => (
                <button
                  key={f.key}
                  type="button"
                  onClick={() => setStatusFilter(f.key)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-colors ${
                    statusFilter === f.key
                      ? "bg-slate-900 text-white shadow-xs"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          {/* Walk-in Queue Stream Cards */}
          <div className="space-y-4">
            {loading ? (
              <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center space-y-3">
                <Loader2 className="w-8 h-8 animate-spin text-indigo-600 mx-auto" />
                <p className="text-sm font-semibold text-slate-600">Loading live print queue...</p>
              </div>
            ) : filteredOrders.length === 0 ? (
              <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center space-y-3">
                <div className="w-12 h-12 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto text-slate-400">
                  <FileText className="w-6 h-6" />
                </div>
                <h4 className="font-bold text-slate-800 text-base">No Orders in this View</h4>
                <p className="text-xs text-slate-500 max-w-sm mx-auto">
                  When walk-in customers scan your counter QR poster or upload files, their tokens and files will appear here instantly.
                </p>
              </div>
            ) : (
              filteredOrders.map((order) => {
                const isNextInLine = order.people_ahead === 0 && ["queued", "payment_pending", "paid"].includes(order.status);
                const isPending = order.status === "payment_pending";
                const isPrintingOrder = order.status === "printing";
                const isDone = order.status === "completed";
                const isDeclined = order.status === "rejected";

                return (
                  <div
                    key={order.id}
                    id={`order-card-${order.id}`}
                    className={`bg-white border rounded-2xl p-5 shadow-xs transition-all ${
                      highlightedOrderId === order.id
                        ? "border-indigo-600 ring-4 ring-indigo-500/40 shadow-xl scale-[1.008]"
                        : isNextInLine
                        ? "border-indigo-400 ring-2 ring-indigo-500/10"
                        : isDone
                        ? "border-slate-200 opacity-80"
                        : isDeclined
                        ? "border-rose-200 bg-rose-50/20"
                        : "border-slate-200 hover:border-slate-300"
                    }`}
                  >
                    {/* Token Card Header */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
                      <div className="flex items-center gap-3">
                        {/* Token Badge */}
                        <div className={`w-12 h-12 rounded-2xl flex flex-col items-center justify-center font-black shrink-0 ${
                          isDone 
                            ? "bg-emerald-100 text-emerald-800 border border-emerald-200"
                            : isDeclined
                            ? "bg-rose-100 text-rose-800 border border-rose-200"
                            : isPrintingOrder
                            ? "bg-indigo-600 text-white animate-pulse"
                            : "bg-indigo-50 text-indigo-700 border border-indigo-200"
                        }`}>
                          <span className="text-[10px] leading-none uppercase font-bold text-slate-400">Token</span>
                          <span className="text-base leading-none font-black mt-0.5">#{order.token_number}</span>
                        </div>

                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="font-black text-slate-900 text-base">
                              {order.customer_name}
                            </h3>

                            {/* Queue Position Pill */}
                            {isNextInLine && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-emerald-100 text-emerald-800 border border-emerald-200">
                                <Sparkles className="w-3 h-3 text-emerald-600" />
                                Next in Line
                              </span>
                            )}

                            {order.people_ahead !== undefined && order.people_ahead > 0 && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700">
                                👥 {order.people_ahead} ahead
                              </span>
                            )}

                            {/* Status Badge */}
                            <span className={`inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full text-xs font-bold ${
                              isDone
                                ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                : isPrintingOrder
                                ? "bg-indigo-50 text-indigo-700 border border-indigo-200"
                                : isPending
                                ? "bg-amber-100 text-amber-900 border border-amber-300 animate-pulse font-extrabold"
                                : isDeclined
                                ? "bg-rose-50 text-rose-700 border border-rose-200"
                                : "bg-cyan-50 text-cyan-700 border border-cyan-200"
                            }`}>
                              {isDone && "✅ All Printed"}
                              {isPrintingOrder && "🖨️ Printing..."}
                              {isPending && "⚠️ Payment Pending"}
                              {isDeclined && "❌ Declined"}
                              {order.status === "queued" && "📋 Paid & In Queue"}
                            </span>

                            {/* Color vs B&W Summary Pill */}
                            {(() => {
                              const hasColor = order.files?.some((f) => f.color_mode === "color");
                              const hasBw = order.files?.some((f) => f.color_mode !== "color");
                              if (hasColor && hasBw) {
                                return (
                                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-black bg-purple-700 text-white shadow-xs">
                                    <Sparkles className="w-3 h-3 text-yellow-300" />
                                    Mixed (Color &amp; B&amp;W)
                                  </span>
                                );
                              }
                              if (hasColor) {
                                return (
                                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-black bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-xs">
                                    <Sparkles className="w-3 h-3 text-yellow-300" />
                                    Brother Color Order
                                  </span>
                                );
                              }
                              return (
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-black bg-slate-900 text-white shadow-xs border border-slate-700">
                                  <span className="w-1.5 h-1.5 rounded-full bg-slate-300"></span>
                                  Canon B&amp;W Order
                                </span>
                              );
                            })()}
                          </div>

                          <div className="flex items-center gap-2 text-xs text-slate-500 mt-1 flex-wrap">
                            <span>Phone: <strong>{order.customer_phone}</strong></span>
                            <span>•</span>
                            <span>Ref: <strong className="font-mono text-slate-700">{order.order_number}</strong></span>
                            <span>•</span>
                            <span>{formatTimeAgo(order.created_at)}</span>
                            {order.total_amount > 0 && (
                              <>
                                <span>•</span>
                                <span className="text-slate-900 font-bold">₹{order.total_amount.toFixed(2)}</span>
                              </>
                            )}
                            {order.utr_number && (
                              <>
                                <span>•</span>
                                <span className="font-mono text-[11px] text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded">
                                  Ref: {order.utr_number}
                                </span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Header Batch Actions & Color Mode Tag ("HERE") */}
                      <div className="flex flex-col items-end gap-2 self-end sm:self-auto shrink-0">
                        <div className="flex items-center gap-2 flex-wrap justify-end">
                          {isPending && (
                            <>
                              <button
                                type="button"
                                onClick={() => updateOrderStatus(order.id, "queued")}
                                className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black transition flex items-center gap-1.5 shadow-sm"
                                title="Confirm that payment of this order was received and send to print queue"
                              >
                                <Check className="w-4 h-4 stroke-[3]" />
                                <span>Confirm Payment Received (₹{order.total_amount?.toFixed(2)})</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setOrderToReject(order);
                                  setRejectionModalOpen(true);
                                }}
                                className="px-3 py-2 bg-white border border-rose-200 hover:bg-rose-50 text-rose-700 rounded-xl text-xs font-bold transition flex items-center gap-1 shadow-xs"
                              >
                                <X className="w-3.5 h-3.5" />
                                <span>Decline</span>
                              </button>
                            </>
                          )}

                          {!isDone && !isDeclined && (
                            <button
                              type="button"
                              onClick={() => handlePrintAllSerial(order)}
                              disabled={isPrinting}
                              className={`px-3.5 py-2 rounded-xl text-xs font-black transition flex items-center gap-1.5 shadow-sm ${
                                isPending
                                  ? "bg-amber-600 hover:bg-amber-700 text-white"
                                  : "bg-indigo-600 hover:bg-indigo-700 text-white"
                              }`}
                              title={isPending ? "Payment pending: Click to confirm payment and print all files" : "Print all files in this customer batch in serial order"}
                            >
                              <Printer className="w-3.5 h-3.5" />
                              <span>{isPending ? "Confirm Pay & Serial Print" : "1-Click Serial Print"}</span>
                            </button>
                          )}

                          {!isDone && !isDeclined && (
                            <button
                              type="button"
                              onClick={() => updateOrderStatus(order.id, "completed")}
                              className="px-3 py-1.5 border border-slate-200 hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-300 text-slate-700 rounded-xl text-xs font-semibold transition flex items-center gap-1"
                              title="Mark this customer order as completed"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                              <span>Mark Done</span>
                            </button>
                          )}
                        </div>

                        {/* EXACT POSITION: Prominent Color Mode & Hardware Printer Display ("HERE") */}
                        <div className="flex items-center gap-2 justify-end w-full">
                          {(() => {
                            const hasColor = order.files?.some((f) => f.color_mode === "color");
                            const hasBw = order.files?.some((f) => f.color_mode !== "color");
                            if (hasColor && hasBw) {
                              return (
                                <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-purple-700 via-indigo-700 to-indigo-900 text-white shadow-md border border-purple-400/40 text-xs font-black tracking-wide">
                                  <Sparkles className="w-4 h-4 text-yellow-300 fill-yellow-300" />
                                  <span>MIXED (COLOR &amp; B&amp;W)</span>
                                  <span className="opacity-60">•</span>
                                  <span className="font-bold text-[11px] text-purple-200">Brother &amp; Canon</span>
                                </div>
                              );
                            }
                            if (hasColor) {
                              return (
                                <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-xl bg-gradient-to-r from-purple-600 via-pink-600 to-amber-500 text-white shadow-md border border-purple-400/40 text-xs font-black tracking-wide">
                                  <Sparkles className="w-4 h-4 text-yellow-200 fill-yellow-200" />
                                  <span>COLOR PRINT</span>
                                  <span className="opacity-60">•</span>
                                  <span className="font-bold text-[11px] text-purple-100">Brother DCP-T220</span>
                                </div>
                              );
                            }
                            return (
                              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-xl bg-slate-900 text-white shadow-md border border-slate-700 text-xs font-black tracking-wide">
                                <span className="w-2.5 h-2.5 rounded-full bg-slate-300"></span>
                                <span>BLACK &amp; WHITE</span>
                                <span className="opacity-60">•</span>
                                <span className="font-bold text-[11px] text-slate-300">Canon imageCLASS MF3010</span>
                              </div>
                            );
                          })()}
                        </div>
                      </div>
                    </div>

                    {/* Customer Note if any */}
                    {order.customer_note && (
                      <div className="mt-3 p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900 font-medium">
                        💬 Note from customer: &quot;{order.customer_note}&quot;
                      </div>
                    )}

                    {/* Rejection Reason if declined */}
                    {isDeclined && order.rejection_reason && (
                      <div className="mt-3 p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-900 font-medium">
                        ❌ Reason sent to customer: &quot;{order.rejection_reason}&quot;
                      </div>
                    )}

                    {/* Files List Inside Customer Token */}
                    <div className="mt-4 space-y-2">
                      <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                        Uploaded Documents ({order.files?.length || 0})
                      </div>

                      {order.files && order.files.length > 0 ? (
                        <div className="space-y-2">
                          {order.files.map((file, idx) => {
                            const ext = file.file_name.split(".").pop()?.toLowerCase() || "";
                            const isPdf = ext === "pdf";

                            return (
                              <div
                                key={file.id || idx}
                                className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-xl bg-slate-50 border border-slate-200 hover:bg-slate-100/60 transition"
                              >
                                <div className="flex items-center gap-3 min-w-0">
                                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 font-bold text-xs ${
                                    isPdf ? "bg-rose-100 text-rose-600" : "bg-cyan-100 text-cyan-600"
                                  }`}>
                                    {ext.toUpperCase().slice(0, 3)}
                                  </div>

                                  <div className="min-w-0">
                                    <div className="flex items-center gap-2">
                                      <span className="font-bold text-xs sm:text-sm text-slate-900 truncate max-w-[240px] sm:max-w-md">
                                        {file.file_name}
                                      </span>
                                      <span className="text-[11px] text-slate-400">
                                        ({formatBytes(file.file_size)})
                                      </span>
                                    </div>

                                    <div className="flex items-center gap-2 text-xs font-semibold mt-1.5 flex-wrap">
                                      {/* Prominent Color Mode Badge */}
                                      {file.color_mode === "color" ? (
                                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg font-black text-xs bg-gradient-to-r from-purple-600 via-pink-600 to-amber-500 text-white shadow-xs tracking-wider">
                                          <Sparkles className="w-3.5 h-3.5 text-yellow-200 fill-yellow-200" />
                                          <span>COLOR PRINT</span>
                                        </span>
                                      ) : (
                                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg font-black text-xs bg-slate-900 text-white shadow-xs border border-slate-700 tracking-wider">
                                          <span className="w-2 h-2 rounded-full bg-slate-300"></span>
                                          <span>BLACK &amp; WHITE</span>
                                        </span>
                                      )}

                                      {/* Assigned Hardware Printer */}
                                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg font-bold text-xs bg-indigo-50 text-indigo-700 border border-indigo-200">
                                        <Printer className="w-3.5 h-3.5 text-indigo-600" />
                                        <span>
                                          {file.printer?.display_name ||
                                           (file as any).printer_name ||
                                           (file.color_mode === "color" ? "Brother DCP-T220 (Color)" : "Canon imageCLASS MF3010 (B&W)")}
                                        </span>
                                      </span>

                                      <span className="text-slate-400">•</span>
                                      <span className="font-bold text-slate-800">
                                        {file.copies} {file.copies > 1 ? "copies" : "copy"}
                                      </span>
                                      <span className="text-slate-400">•</span>
                                      <span className="text-slate-600">{file.paper_size || "A4"}</span>
                                      <span className="text-slate-400">•</span>
                                      <span className="text-slate-600">{file.duplex === "double" ? "Double-sided" : "Single-sided"}</span>
                                      <span className="text-slate-400">•</span>
                                      <span className="text-slate-600">{file.page_count} {file.page_count === 1 ? "page" : "pages"}</span>
                                    </div>
                                  </div>
                                </div>

                                {/* File Individual Actions */}
                                <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
                                  {/* Preview Button */}
                                  <button
                                    type="button"
                                    onClick={() => handleOpenPreview(file, order)}
                                    className="p-1.5 text-slate-600 hover:text-indigo-600 hover:bg-indigo-50 border border-slate-200 bg-white rounded-lg transition"
                                    title="Inspect document preview"
                                  >
                                    <Eye className="w-4 h-4" />
                                  </button>

                                  {/* Download Button */}
                                  {file.download_url && (
                                    <a
                                      href={file.download_url}
                                      download={file.file_name}
                                      target="_blank"
                                      rel="noreferrer"
                                      className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-slate-200 bg-white rounded-lg transition"
                                      title="Download file"
                                    >
                                      <Download className="w-4 h-4" />
                                    </a>
                                  )}

                                  {/* Print Single File Button */}
                                  <button
                                    type="button"
                                    onClick={() => handlePrintFile(file, order)}
                                    disabled={isPrinting}
                                    className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold transition shadow-xs ${
                                      isPending
                                        ? "bg-amber-600 hover:bg-amber-700 text-white"
                                        : "bg-slate-900 hover:bg-indigo-600 text-white"
                                    }`}
                                    title={isPending ? "Payment pending: Click to confirm payment and print" : "Send this file to print"}
                                  >
                                    <Printer className="w-3.5 h-3.5" />
                                    <span>{isPending ? "Pay & Print" : "Print"}</span>
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <p className="text-xs text-slate-400 italic">No files attached to this token.</p>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </main>
      </div>

      {/* Document Preview Modal */}
      <DocumentPreviewModal
        isOpen={previewModalOpen}
        onClose={() => {
          setPreviewModalOpen(false);
          setPreviewFile(null);
          setPreviewOrder(null);
        }}
        file={previewFile}
        order={previewOrder}
        onPrint={(f, ord) => handlePrintFile(f, ord)}
      />

      {/* Rejection / Decline Modal */}
      {rejectionModalOpen && orderToReject && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2 text-rose-600 font-bold text-base">
                <AlertTriangle className="w-5 h-5" />
                <span>Decline Customer Batch</span>
              </div>
              <button
                type="button"
                onClick={() => setRejectionModalOpen(false)}
                className="text-slate-400 hover:text-slate-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-600">
              Token <strong>#{orderToReject.token_number}</strong> ({orderToReject.customer_name}) will be notified on their mobile phone immediately.
            </p>

            {/* Quick Reason Chips */}
            <div className="space-y-1.5">
              <span className="text-[11px] font-bold text-slate-500 uppercase">Select Quick Reason:</span>
              <div className="flex flex-wrap gap-1.5">
                {[
                  "Illegible or blurry file",
                  "Incorrect paper orientation",
                  "Restocking paper / Printer busy",
                  "Payment UTR unverified",
                  "Please consult shop counter"
                ].map((chip) => (
                  <button
                    key={chip}
                    type="button"
                    onClick={() => setRejectionReason(chip)}
                    className={`px-2.5 py-1 text-[11px] rounded-lg border font-medium transition ${
                      rejectionReason === chip
                        ? "bg-rose-50 border-rose-300 text-rose-800 font-bold"
                        : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"
                    }`}
                  >
                    {chip}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">Custom Note to Customer:</label>
              <textarea
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="Explain why the file was declined..."
                className="w-full p-2.5 text-xs border border-slate-300 rounded-xl outline-none focus:border-rose-500"
                rows={3}
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setRejectionModalOpen(false)}
                className="px-4 py-2 border border-slate-200 text-slate-600 rounded-xl text-xs font-semibold hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDecline}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold shadow-xs"
              >
                Decline &amp; Notify Customer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Professional Floating New Order Popup (Desktop & In-App) */}
      {incomingOrderAlert && (
        <aside
          aria-label="New Print Order Notification"
          className="fixed top-20 right-4 sm:right-6 z-[9999] max-w-md w-[calc(100vw-2rem)] bg-slate-950/95 backdrop-blur-xl border-2 border-indigo-500/80 rounded-3xl p-5 shadow-[0_20px_50px_rgba(0,0,0,0.6),0_0_40px_rgba(99,102,241,0.35)] text-white animate-in slide-in-from-top-6 duration-300"
        >
          {/* Ambient Glow */}
          <div className="absolute -top-10 -left-10 w-28 h-28 bg-indigo-500/20 rounded-full blur-2xl pointer-events-none" />
          <div className="absolute -bottom-10 -right-10 w-28 h-28 bg-emerald-500/20 rounded-full blur-2xl pointer-events-none" />

          <div className="relative z-10 space-y-3.5">
            {/* Top Header */}
            <div className="flex items-center justify-between gap-2 border-b border-white/10 pb-3">
              <div className="flex items-center gap-2">
                <span className="relative flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
                </span>
                <span className="text-[11px] font-black uppercase tracking-widest text-emerald-400 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5" />
                  New Print Order Arrived!
                </span>
              </div>
              <button
                type="button"
                onClick={() => setIncomingOrderAlert(null)}
                className="text-white/50 hover:text-white p-1 rounded-lg hover:bg-white/10 transition cursor-pointer"
                title="Dismiss notification"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Main Order Info */}
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="px-2.5 py-0.5 rounded-lg bg-indigo-500/25 border border-indigo-400/50 text-indigo-300 font-black text-sm">
                    Token #{incomingOrderAlert.token_number || 1}
                  </span>
                  <span className="font-bold text-slate-100 text-sm">
                    {incomingOrderAlert.customer_name || "Walk-in Customer"}
                  </span>
                </div>
                {incomingOrderAlert.customer_phone && (
                  <p className="text-xs text-white/60 mt-1 font-mono">
                    📱 {incomingOrderAlert.customer_phone}
                  </p>
                )}
              </div>

              <div className="text-right">
                <p className="text-xl font-black text-white">
                  ₹{Number(incomingOrderAlert.total_amount || 0).toFixed(2)}
                </p>
                <span className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded-md mt-0.5 ${
                  incomingOrderAlert.status !== "payment_pending"
                    ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                    : "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                }`}>
                  {incomingOrderAlert.status !== "payment_pending" ? "✅ Payment Done" : "⏳ Payment Pending"}
                </span>
              </div>
            </div>

            {/* Printer & Color Spec Badge */}
            {(() => {
              const isColor = incomingOrderAlert.files?.some(f => f.color_mode === "color");
              const totalPgs = incomingOrderAlert.files?.reduce((s, f) => s + ((f.effective_pages || f.page_count || 1) * (f.copies || 1)), 0) || 1;
              return (
                <div className={`p-2.5 rounded-xl border flex items-center justify-between text-xs font-bold ${
                  isColor
                    ? "bg-gradient-to-r from-amber-500/10 via-rose-500/10 to-indigo-500/10 border-amber-500/40 text-amber-200"
                    : "bg-slate-800/80 border-slate-700 text-slate-200"
                }`}>
                  <div className="flex items-center gap-2">
                    <Printer className="w-4 h-4 text-white" />
                    <span>
                      {isColor ? "🌈 COLOR PRINT (Brother DCP-T220)" : "⚫ BLACK & WHITE (Canon MF3010)"}
                    </span>
                  </div>
                  <span className="text-[11px] text-white/80 font-mono">
                    {totalPgs} {totalPgs === 1 ? "page" : "pages"}
                  </span>
                </div>
              );
            })()}

            {/* Action Buttons */}
            <div className="flex items-center gap-2 pt-1">
              <button
                type="button"
                onClick={() => {
                  focusAndHighlightOrder(incomingOrderAlert.id);
                  setIncomingOrderAlert(null);
                }}
                className="flex-1 py-2.5 px-4 rounded-xl bg-gradient-to-r from-cyan-400 to-indigo-500 hover:from-cyan-300 hover:to-indigo-400 text-slate-950 font-black text-xs transition flex items-center justify-center gap-2 shadow-lg cursor-pointer"
              >
                <Printer className="w-4 h-4 fill-current" />
                <span>View &amp; Print Order</span>
              </button>
              <button
                type="button"
                onClick={() => setIncomingOrderAlert(null)}
                className="py-2.5 px-3 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold transition cursor-pointer"
              >
                Dismiss
              </button>
            </div>

            {/* Auto-dismiss timer indicator */}
            <div className="w-full bg-white/10 h-1 rounded-full overflow-hidden">
              <div 
                className="h-full bg-indigo-400 rounded-full" 
                style={{ 
                  animation: "shrink 12s linear forwards" 
                }} 
              />
            </div>
          </div>
        </aside>
      )}
    </div>
  );
}
