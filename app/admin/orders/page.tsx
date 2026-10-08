"use client";

import React, { useEffect, useState, useRef, useMemo } from "react";
import AdminSidebar from "@/components/AdminSidebar";
import AdminHeader from "@/components/AdminHeader";
import DocumentPreviewModal from "@/components/DocumentPreviewModal";
import { Order, OrderFileItem, OrderStatus, ShopInfo } from "@/lib/types";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import { playNewOrderChime, playCompletedChime, playAlertChime } from "@/lib/audio";
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
    shop_name: "Saga3's Print Shop",
    owner_name: "heusen",
    shop_slug: "heusen",
    tagline: "High Speed Cyber Cafe & Shopkeeper Direct Print Hub",
    phone: "+91 98765 43210",
    email: "heusen.printshop@gmail.com",
    address: "Counter 1, Main Market Plaza",
    working_hours: "08:00 AM - 10:00 PM",
    is_closed: false,
    require_approval: true
  });

  const prevOrderCountRef = useRef(0);

  // Fetch shop settings
  useEffect(() => {
    async function loadShopInfo() {
      if (!isSupabaseConfigured) return;
      try {
        const { data } = await supabase
          .from("settings")
          .select("value")
          .eq("key", "shop_info")
          .maybeSingle();
        if (data?.value) {
          setShopInfo((prev) => ({ ...prev, ...data.value }));
        }
      } catch (e) {
        console.error("Error loading shop settings:", e);
      }
    }
    loadShopInfo();
  }, []);

  // Fetch orders from API
  const fetchOrders = async () => {
    try {
      const res = await fetch("/api/orders");
      if (res.ok) {
        const data = await res.json();
        if (data.success && Array.isArray(data.orders)) {
          const fetchedOrders = data.orders as Order[];
          if (fetchedOrders.length > prevOrderCountRef.current && prevOrderCountRef.current > 0) {
            playNewOrderChime();
          }
          prevOrderCountRef.current = fetchedOrders.length;
          setOrders(fetchedOrders);
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
          if (data.length > prevOrderCountRef.current && prevOrderCountRef.current > 0) {
            playNewOrderChime();
          }
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
                  </div>
                  <h3 className="text-base sm:text-lg font-black text-white mt-0.5">
                    {nextInLineOrder.customer_name} • {nextInLineOrder.files?.length || 0} document{(nextInLineOrder.files?.length || 0) > 1 ? "s" : ""}
                  </h3>
                </div>
              </div>

              <div className="flex items-center gap-2.5 w-full sm:w-auto">
                {nextInLineOrder.status === "payment_pending" && (
                  <button
                    type="button"
                    onClick={() => updateOrderStatus(nextInLineOrder.id, "queued")}
                    className="flex-1 sm:flex-none px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold text-xs rounded-xl transition flex items-center justify-center gap-1.5 shadow-sm"
                  >
                    <Check className="w-4 h-4" />
                    <span>Accept Files</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => handlePrintAllSerial(nextInLineOrder)}
                  className="flex-1 sm:flex-none px-5 py-2.5 bg-gradient-to-r from-cyan-400 to-indigo-400 hover:from-cyan-300 hover:to-indigo-300 text-slate-950 font-black text-xs rounded-xl transition flex items-center justify-center gap-2 shadow-md"
                >
                  <Play className="w-3.5 h-3.5 fill-current" />
                  <span>Print All in Sequence</span>
                </button>
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
                    className={`bg-white border rounded-2xl p-5 shadow-xs transition-all ${
                      isNextInLine
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
                            <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                              isDone
                                ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                : isPrintingOrder
                                ? "bg-indigo-50 text-indigo-700 border border-indigo-200"
                                : isPending
                                ? "bg-amber-50 text-amber-700 border border-amber-200"
                                : isDeclined
                                ? "bg-rose-50 text-rose-700 border border-rose-200"
                                : "bg-cyan-50 text-cyan-700 border border-cyan-200"
                            }`}>
                              {isDone && "✅ All Printed"}
                              {isPrintingOrder && "🖨️ Printing..."}
                              {isPending && "⏳ Pending Approval"}
                              {isDeclined && "❌ Declined"}
                              {order.status === "queued" && "📋 In Queue"}
                            </span>
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
                          </div>
                        </div>
                      </div>

                      {/* Header Batch Actions */}
                      <div className="flex items-center gap-2 self-end sm:self-auto flex-wrap">
                        {isPending && (
                          <>
                            <button
                              type="button"
                              onClick={() => updateOrderStatus(order.id, "queued")}
                              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1 shadow-xs"
                            >
                              <Check className="w-3.5 h-3.5" />
                              <span>Accept</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setOrderToReject(order);
                                setRejectionModalOpen(true);
                              }}
                              className="px-3 py-1.5 bg-white border border-rose-200 hover:bg-rose-50 text-rose-700 rounded-xl text-xs font-bold transition flex items-center gap-1 shadow-xs"
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
                            className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-xs"
                            title="Print all files in this customer batch in serial order"
                          >
                            <Printer className="w-3.5 h-3.5" />
                            <span>1-Click Serial Print</span>
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

                                    <div className="flex items-center gap-2 text-[11px] text-slate-500 font-medium mt-0.5 flex-wrap">
                                      <span className="font-bold text-slate-700">
                                        {file.copies} {file.copies > 1 ? "copies" : "copy"}
                                      </span>
                                      <span>•</span>
                                      <span className={`px-1.5 py-0.2 rounded font-bold uppercase text-[10px] ${
                                        file.color_mode === "color"
                                          ? "bg-amber-100 text-amber-800"
                                          : "bg-slate-200 text-slate-700"
                                      }`}>
                                        {file.color_mode.toUpperCase()}
                                      </span>
                                      <span>•</span>
                                      <span>{file.paper_size || "A4"}</span>
                                      <span>•</span>
                                      <span>{file.duplex === "double" ? "Double-sided" : "Single-sided"}</span>
                                      <span>•</span>
                                      <span>{file.page_count} {file.page_count === 1 ? "page" : "pages"}</span>
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
                                    className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-slate-900 hover:bg-indigo-600 text-white rounded-lg text-xs font-bold transition shadow-2xs"
                                    title="Send this file to print"
                                  >
                                    <Printer className="w-3.5 h-3.5" />
                                    <span>Print</span>
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
    </div>
  );
}
