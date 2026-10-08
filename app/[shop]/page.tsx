"use client";

import React, { useState, useEffect, useRef } from "react";
import { useParams } from "next/navigation";
import { 
  Printer, 
  UploadCloud, 
  FileText, 
  Sparkles, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  X, 
  Share2, 
  Copy,
  ChevronRight,
  ShieldCheck,
  Send,
  Loader2
} from "lucide-react";
import confetti from "canvas-confetti";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import { countPdfPages } from "@/lib/pdf-utils";

interface UploadedFileItem {
  file: File;
  name: string;
  size: number;
  type: string;
  pageCount: number;
}

export default function ShopkeeperCustomerPortal() {
  const params = useParams();
  const shopSlug = (params.shop as string) || "heusen";

  // Shop state
  const [shopName, setShopName] = useState<string>("Saga3's Print Shop");
  const [ownerName, setOwnerName] = useState<string>("heusen");
  const [tagline, setTagline] = useState<string>("Direct Walk-in Print Counter");
  const [isShopClosed, setIsShopClosed] = useState<boolean>(false);
  const [closedNotice, setClosedNotice] = useState<string>("");

  // Customer form state
  const [customerName, setCustomerName] = useState<string>("");
  const [customerPhone, setCustomerPhone] = useState<string>("");
  const [customerNote, setCustomerNote] = useState<string>("");
  const [copies, setCopies] = useState<number>(1);
  const [colorMode, setColorMode] = useState<"bw" | "color">("bw");
  const [duplex, setDuplex] = useState<"single" | "double">("single");
  const [selectedFiles, setSelectedFiles] = useState<UploadedFileItem[]>([]);

  // Submission state
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Active session / Token receipt state
  const [activeToken, setActiveToken] = useState<string>("");
  const [orderReceipt, setOrderReceipt] = useState<any>(null);
  const [peopleAhead, setPeopleAhead] = useState<number>(0);
  const [tokenNumber, setTokenNumber] = useState<number>(1);
  const [copiedLink, setCopiedLink] = useState<boolean>(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const pollTimerRef = useRef<NodeJS.Timeout | null>(null);
  const confettiFiredRef = useRef<boolean>(false);

  // Load shop settings
  useEffect(() => {
    async function fetchShopInfo() {
      if (!isSupabaseConfigured) {
        if (shopSlug === "heusen" || shopSlug === "saga3") {
          setShopName("Saga3's Print Shop");
          setOwnerName("heusen");
        }
        return;
      }

      try {
        const { data } = await supabase
          .from("settings")
          .select("value")
          .eq("key", "shop_info")
          .maybeSingle();

        if (data?.value) {
          if (data.value.shop_name) setShopName(data.value.shop_name);
          if (data.value.owner_name) setOwnerName(data.value.owner_name);
          if (data.value.tagline) setTagline(data.value.tagline);
          if (data.value.is_closed !== undefined) setIsShopClosed(Boolean(data.value.is_closed));
          if (data.value.closed_notice) setClosedNotice(data.value.closed_notice);
        }
      } catch (err) {
        console.error("Shop settings fetch error:", err);
      }
    }

    fetchShopInfo();

    // Check localStorage for active session for this shop
    if (typeof window !== "undefined") {
      const savedToken = localStorage.getItem(`printqr_session_${shopSlug}`);
      if (savedToken) {
        setActiveToken(savedToken);
      }
    }
  }, [shopSlug]);

  // Poll active order receipt
  const checkReceiptStatus = async (tokenToCheck?: string) => {
    const token = tokenToCheck || activeToken;
    if (!token) return;

    try {
      const res = await fetch(`/api/orders/${token}`);
      if (res.ok) {
        const data = await res.json();
        if (data.order) {
          setOrderReceipt(data.order);
          setTokenNumber(data.token_number || 1);
          setPeopleAhead(data.people_ahead !== undefined ? data.people_ahead : 0);

          if (data.order.status === "completed" && !confettiFiredRef.current) {
            confettiFiredRef.current = true;
            confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
          }

          // Continue polling if not completed or rejected
          if (!["completed", "rejected"].includes(data.order.status)) {
            if (pollTimerRef.current) clearTimeout(pollTimerRef.current);
            pollTimerRef.current = setTimeout(() => checkReceiptStatus(token), 3000);
          }
        }
      }
    } catch (e) {
      console.error("Receipt status polling error:", e);
    }
  };

  useEffect(() => {
    if (activeToken) {
      checkReceiptStatus(activeToken);
    }
    return () => {
      if (pollTimerRef.current) clearTimeout(pollTimerRef.current);
    };
  }, [activeToken]);

  // File handling
  const handleFilesAdded = async (files: FileList | File[]) => {
    const newItems: UploadedFileItem[] = [];

    for (let i = 0; i < files.length; i++) {
      const f = files[i];
      let pCount = 1;
      if (f.name.toLowerCase().endsWith(".pdf") || f.type === "application/pdf") {
        try {
          pCount = await countPdfPages(f);
        } catch {
          pCount = 1;
        }
      }
      newItems.push({
        file: f,
        name: f.name,
        size: f.size,
        type: f.type,
        pageCount: pCount,
      });
    }

    setSelectedFiles((prev) => [...prev, ...newItems]);
  };

  const removeFile = (idx: number) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== idx));
  };

  const formatBytes = (bytes: number) => {
    if (!bytes) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
  };

  // Submit files to shopkeeper
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedFiles.length === 0) {
      setErrorMsg("Please select at least one document or photo to print.");
      return;
    }

    setIsUploading(true);
    setUploadProgress(20);
    setErrorMsg(null);

    try {
      const formData = new FormData();
      formData.append("customer_name", customerName.trim() || "Walk-in Customer");
      formData.append("customer_phone", customerPhone.trim() || "Walk-in");
      formData.append("customer_note", customerNote.trim());
      formData.append("auto_print", "false"); // Walk-in queue starts with shopkeeper approval

      const filesMetadata = selectedFiles.map((sf) => ({
        file_name: sf.name,
        file_type: sf.type || "application/octet-stream",
        file_size: sf.size,
        page_count: sf.pageCount,
        copies,
        color_mode: colorMode,
        paper_size: "A4",
        duplex,
        page_range: "all",
        effective_pages: sf.pageCount,
      }));

      formData.append("files", JSON.stringify(filesMetadata));

      selectedFiles.forEach((sf, idx) => {
        formData.append(`file_${idx}`, sf.file);
      });

      setUploadProgress(60);

      const res = await fetch("/api/orders", {
        method: "POST",
        body: formData,
      });

      setUploadProgress(100);

      if (!res.ok) {
        throw new Error("Upload failed. Please try again.");
      }

      const data = await res.json();
      if (data.success && data.order) {
        const orderToken = data.order.access_token || data.order.id;
        setActiveToken(orderToken);
        localStorage.setItem(`printqr_session_${shopSlug}`, orderToken);
        setSelectedFiles([]);
        setCustomerNote("");
        checkReceiptStatus(orderToken);
      } else {
        throw new Error(data.error || "Failed to process files");
      }
    } catch (err: any) {
      setErrorMsg(err?.message || "Network error. Please try again.");
    } finally {
      setIsUploading(false);
      setTimeout(() => setUploadProgress(0), 1000);
    }
  };

  const copyReceiptLink = () => {
    if (typeof window !== "undefined") {
      const origin = window.location.origin;
      const url = `${origin}/order/${activeToken}`;
      navigator.clipboard.writeText(url);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    }
  };

  const handleStartNewBatch = () => {
    localStorage.removeItem(`printqr_session_${shopSlug}`);
    setActiveToken("");
    setOrderReceipt(null);
    setSelectedFiles([]);
    confettiFiredRef.current = false;
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center px-4 py-6 sm:py-10 text-slate-900">
      {/* Top Brand Bar */}
      <div className="w-full max-w-lg flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-indigo-600 to-cyan-500 text-white font-black flex items-center justify-center text-sm shadow-xs">
            B
          </div>
          <span className="font-extrabold text-slate-800 text-sm tracking-tight">PrintHub</span>
        </div>
        <span className="text-[11px] font-bold text-slate-500 bg-white border border-slate-200 px-2.5 py-1 rounded-full shadow-2xs">
          🖨️ Direct Print
        </span>
      </div>

      <div className="w-full max-w-lg space-y-4">
        {/* Shopkeeper Profile Card */}
        <div className="bg-white border border-slate-200 rounded-3xl p-6 text-center shadow-xs relative overflow-hidden">
          <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-indigo-600 via-cyan-500 to-indigo-600"></div>

          {/* Online status badge */}
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 mb-3">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span>{isShopClosed ? "Counter Closed" : "Accepting Walk-ins"}</span>
          </div>

          <div className="w-14 h-14 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 font-black text-2xl mx-auto mb-2 shadow-2xs">
            {ownerName ? ownerName.charAt(0).toUpperCase() : "S"}
          </div>

          <h1 className="text-2xl font-black text-slate-900 tracking-tight">
            {shopName}
          </h1>
          <p className="text-xs text-slate-500 mt-0.5 font-medium">
            Owner: <strong>{ownerName}</strong> • {tagline}
          </p>
        </div>

        {/* Emergency Closed Alert */}
        {isShopClosed ? (
          <div className="bg-rose-50 border border-rose-200 rounded-3xl p-6 text-center space-y-3">
            <div className="w-12 h-12 bg-rose-100 text-rose-600 rounded-2xl flex items-center justify-center mx-auto">
              <AlertCircle className="w-6 h-6" />
            </div>
            <h3 className="font-black text-rose-900 text-lg">Shop Counter Currently Closed</h3>
            <p className="text-xs text-rose-700 max-w-sm mx-auto">
              {closedNotice || "The shop is temporarily closed for restocking or holiday. Please check back shortly."}
            </p>
          </div>
        ) : orderReceipt ? (
          /* Live Queue Token Receipt (BGrade style) */
          <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-5 animate-in fade-in duration-300">
            {/* Header with Token */}
            <div className="text-center space-y-2 border-b border-slate-100 pb-5">
              <span className="text-[11px] font-black uppercase tracking-wider text-indigo-600 bg-indigo-50 px-3 py-1 rounded-full border border-indigo-200">
                Your Counter Token
              </span>
              <div className="text-5xl font-black text-slate-900 tracking-tight font-mono">
                #{tokenNumber}
              </div>
              <p className="text-xs text-slate-500">
                Customer: <strong>{orderReceipt.customer_name}</strong> • Ref: {orderReceipt.order_number}
              </p>
            </div>

            {/* Waiting Line Position Status Banner */}
            <div className={`p-5 rounded-2xl text-center border space-y-1.5 ${
              orderReceipt.status === "rejected"
                ? "bg-rose-50 border-rose-200 text-rose-900"
                : orderReceipt.status === "payment_pending"
                ? "bg-amber-50 border-amber-200 text-amber-900"
                : orderReceipt.status === "printing"
                ? "bg-indigo-50 border-indigo-200 text-indigo-900"
                : orderReceipt.status === "completed"
                ? "bg-emerald-50 border-emerald-200 text-emerald-900"
                : peopleAhead === 0
                ? "bg-emerald-50 border-emerald-200 text-emerald-900"
                : "bg-blue-50 border-blue-200 text-blue-900"
            }`}>
              <div className="text-2xl mb-1">
                {orderReceipt.status === "rejected" ? "❌" :
                 orderReceipt.status === "payment_pending" ? "⏳" :
                 orderReceipt.status === "printing" ? "🖨️" :
                 orderReceipt.status === "completed" ? "🎉" :
                 peopleAhead === 0 ? "✨" : "👥"}
              </div>

              <h3 className="font-black text-base">
                {orderReceipt.status === "rejected"
                  ? "Files Declined by Shopkeeper"
                  : orderReceipt.status === "payment_pending"
                  ? "Waiting for Shopkeeper Approval"
                  : orderReceipt.status === "printing"
                  ? "Printing in Progress at Counter!"
                  : orderReceipt.status === "completed"
                  ? "All Documents Printed!"
                  : peopleAhead === 0
                  ? "You are Next in Line!"
                  : `${peopleAhead} customer${peopleAhead > 1 ? "s" : ""} ahead of you`}
              </h3>

              <p className="text-xs font-medium opacity-80">
                {orderReceipt.status === "rejected"
                  ? (orderReceipt.rejection_reason || "Please consult with the shopkeeper at the counter")
                  : orderReceipt.status === "payment_pending"
                  ? "Shopkeeper must accept files at counter before printing"
                  : orderReceipt.status === "printing"
                  ? "Collecting copies from shop printer"
                  : orderReceipt.status === "completed"
                  ? "Please collect your copies at the counter"
                  : peopleAhead === 0
                  ? "Files ready for printing at counter"
                  : "Please wait a moment at the counter"}
              </p>
            </div>

            {/* Uploaded Files Status List */}
            <div className="space-y-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                Your Documents ({orderReceipt.files?.length || 0})
              </span>

              {orderReceipt.files?.map((f: any, i: number) => {
                const fStatus = f.status || (orderReceipt.status === "completed" ? "printed" : orderReceipt.status === "printing" ? "printing" : "queued");
                return (
                  <div key={i} className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-100 text-xs">
                    <div className="flex items-center gap-2 truncate max-w-[200px] sm:max-w-xs">
                      <FileText className="w-4 h-4 text-slate-500 shrink-0" />
                      <div>
                        <p className="font-bold text-slate-800 truncate">{f.file_name}</p>
                        <p className="text-[11px] text-slate-400 font-medium">
                          {f.copies} {f.copies > 1 ? "copies" : "copy"} • {f.color_mode.toUpperCase()}
                        </p>
                      </div>
                    </div>

                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      fStatus === "printed"
                        ? "bg-emerald-100 text-emerald-800"
                        : fStatus === "printing"
                        ? "bg-indigo-100 text-indigo-800 animate-pulse"
                        : fStatus === "rejected"
                        ? "bg-rose-100 text-rose-800"
                        : "bg-amber-100 text-amber-800"
                    }`}>
                      {fStatus === "printed" && "✅ Printed"}
                      {fStatus === "printing" && "🖨️ Printing…"}
                      {fStatus === "queued" && "⏳ In Queue"}
                      {fStatus === "rejected" && "❌ Declined"}
                    </span>
                  </div>
                );
              })}
            </div>

            {/* Receipt Actions */}
            <div className="pt-2 flex flex-col sm:flex-row gap-2 border-t border-slate-100">
              <button
                type="button"
                onClick={copyReceiptLink}
                className="flex-1 py-2.5 px-3 border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5"
              >
                <Copy className="w-3.5 h-3.5" />
                <span>{copiedLink ? "Link Copied!" : "Share / Bookmark Token"}</span>
              </button>

              <button
                type="button"
                onClick={handleStartNewBatch}
                className="flex-1 py-2.5 px-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-xs"
              >
                <span>Send More Files</span>
              </button>
            </div>
          </div>
        ) : (
          /* Customer File Upload Form */
          <form onSubmit={handleSubmit} className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-7 shadow-xs space-y-5">
            <div className="text-xs font-black uppercase tracking-wider text-slate-400 border-b border-slate-100 pb-2">
              Step 1: Your Details
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Your Name (or Counter Name)
                </label>
                <input
                  type="text"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="e.g. Rahul Kumar or Walk-in"
                  className="w-full px-3.5 py-2.5 text-xs sm:text-sm border border-slate-300 rounded-xl outline-none focus:border-indigo-500 font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Phone Number (Optional)
                </label>
                <input
                  type="tel"
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  placeholder="+91 98765 43210"
                  className="w-full px-3.5 py-2.5 text-xs sm:text-sm border border-slate-300 rounded-xl outline-none focus:border-indigo-500 font-mono"
                />
              </div>
            </div>

            <div className="text-xs font-black uppercase tracking-wider text-slate-400 border-b border-slate-100 pb-2 pt-2">
              Step 2: Select Documents to Print
            </div>

            {/* Dropzone */}
            <div
              onClick={() => fileInputRef.current?.click()}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                if (e.dataTransfer.files) handleFilesAdded(e.dataTransfer.files);
              }}
              className="border-2 border-dashed border-slate-300 hover:border-indigo-500 bg-slate-50/60 hover:bg-indigo-50/20 rounded-2xl p-6 text-center cursor-pointer transition"
            >
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept=".pdf,image/*,.doc,.docx"
                onChange={(e) => e.target.files && handleFilesAdded(e.target.files)}
                className="hidden"
              />
              <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-2">
                <UploadCloud className="w-6 h-6" />
              </div>
              <p className="font-bold text-slate-800 text-sm">
                Tap to Select or Drag &amp; Drop Files
              </p>
              <p className="text-[11px] text-slate-400 mt-0.5">
                PDFs, Photos, Aadhaar, PAN Card, Documents
              </p>
            </div>

            {/* Selected Files List */}
            {selectedFiles.length > 0 && (
              <div className="space-y-2">
                <span className="text-[11px] font-bold text-slate-500 uppercase">
                  Selected Files ({selectedFiles.length})
                </span>
                {selectedFiles.map((sf, idx) => (
                  <div key={idx} className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs">
                    <div className="flex items-center gap-2 truncate max-w-[240px]">
                      <FileText className="w-4 h-4 text-indigo-600 shrink-0" />
                      <span className="font-bold text-slate-800 truncate">{sf.name}</span>
                      <span className="text-slate-400 text-[10px]">({formatBytes(sf.size)})</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeFile(idx)}
                      className="text-slate-400 hover:text-rose-600 p-1 rounded-lg"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div className="text-xs font-black uppercase tracking-wider text-slate-400 border-b border-slate-100 pb-2 pt-2">
              Step 3: Print Options
            </div>

            {/* Copies and Color mode */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Number of Copies</label>
                <div className="flex items-center border border-slate-300 rounded-xl overflow-hidden bg-white">
                  <button
                    type="button"
                    onClick={() => setCopies((c) => Math.max(1, c - 1))}
                    className="px-3 py-2 text-slate-600 hover:bg-slate-100 font-bold"
                  >
                    -
                  </button>
                  <span className="flex-1 text-center font-bold text-sm text-slate-900">{copies}</span>
                  <button
                    type="button"
                    onClick={() => setCopies((c) => c + 1)}
                    className="px-3 py-2 text-slate-600 hover:bg-slate-100 font-bold"
                  >
                    +
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Color Mode</label>
                <div className="flex p-0.5 border border-slate-300 rounded-xl bg-slate-100">
                  <button
                    type="button"
                    onClick={() => setColorMode("bw")}
                    className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition ${
                      colorMode === "bw"
                        ? "bg-white text-slate-900 shadow-2xs"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    B&amp;W
                  </button>
                  <button
                    type="button"
                    onClick={() => setColorMode("color")}
                    className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition ${
                      colorMode === "color"
                        ? "bg-indigo-600 text-white shadow-2xs"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    Colour
                  </button>
                </div>
              </div>
            </div>

            {/* Note to operator */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Special Note / Instructions for Counter (Optional)
              </label>
              <input
                type="text"
                value={customerNote}
                onChange={(e) => setCustomerNote(e.target.value)}
                placeholder="e.g. Page 1 to 3 only, double sided, staple..."
                className="w-full px-3.5 py-2 text-xs border border-slate-300 rounded-xl outline-none focus:border-indigo-500 font-medium"
              />
            </div>

            {errorMsg && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-xl font-medium flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* Progress Bar */}
            {isUploading && (
              <div className="space-y-1">
                <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-indigo-600 to-cyan-500 transition-all duration-300"
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
                <p className="text-[11px] text-center font-bold text-slate-500">
                  Uploading files to shop counter ({uploadProgress}%)...
                </p>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isUploading}
              className="w-full py-3.5 px-4 bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 disabled:opacity-50 text-white font-bold rounded-2xl shadow-md shadow-indigo-600/20 active:scale-[0.99] transition-all flex items-center justify-center gap-2 text-sm"
            >
              {isUploading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Sending to Counter...</span>
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  <span>Send Files to Shopkeeper</span>
                </>
              )}
            </button>
          </form>
        )}

        {/* Footer */}
        <div className="text-center text-[11px] text-slate-400 py-4">
          Powered by <strong>PrintQR &amp; BGrade Hub</strong> • 100% Private Browser Print
        </div>
      </div>
    </div>
  );
}
