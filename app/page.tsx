"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Navbar from "@/components/Navbar";
import FileUploader from "@/components/FileUploader";
import PrinterSelector, { DEFAULT_PRINTERS } from "@/components/PrinterSelector";
import OrderSummary from "@/components/OrderSummary";
import PaymentSection, { DEFAULT_PAYMENT_METHOD } from "@/components/PaymentSection";
import { Language, OrderFileItem, ColorMode, DuplexMode, PaperSize, PaymentMethod, Printer } from "@/lib/types";
import { supabase } from "@/lib/supabase";
import { translations } from "@/lib/translations";
import { calculateEffectivePages } from "@/lib/pdf-utils";
import { calculateFileCost, calculateOrderTotal, DEFAULT_PRICING, parsePricingRows, PricingConfig } from "@/lib/price-calculator";
import { 
  User, 
  Phone, 
  FileText, 
  Sliders, 
  ArrowRight, 
  ArrowLeft, 
  CheckCircle, 
  Clock, 
  Search, 
  Sparkles,
  HelpCircle
} from "lucide-react";

export default function CustomerPortal() {
  const router = useRouter();
  const [language, setLanguage] = useState<Language>("en");
  const t = translations[language];

  // Wizard state: 1: Upload, 2: Printer & Options, 3: Pay & Print
  const [currentStep, setCurrentStep] = useState<number>(1);

  // Customer info (defaults for fast 1-tap checkout)
  const [customerName, setCustomerName] = useState<string>("Walk-in Customer");
  const [customerPhone, setCustomerPhone] = useState<string>("Walk-in");
  const [customerNote, setCustomerNote] = useState<string>("");

  // Files
  const [files, setFiles] = useState<OrderFileItem[]>([]);
  const [activeFileIndex, setActiveFileIndex] = useState<number>(0);

  // Live pricing
  const [pricing, setPricing] = useState<PricingConfig>(DEFAULT_PRICING);

  // Tracking existing order
  const [trackTokenInput, setTrackTokenInput] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Shop settings & payment method state
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(DEFAULT_PAYMENT_METHOD);
  const [isShopClosed, setIsShopClosed] = useState<boolean>(false);
  const [closedNotice, setClosedNotice] = useState<string>("");
  const [printers, setPrinters] = useState<Printer[]>(DEFAULT_PRINTERS);
  const [isRefreshingPrinters, setIsRefreshingPrinters] = useState<boolean>(false);

  const fetchLivePrinters = async () => {
    try {
      setIsRefreshingPrinters(true);
      const res = await fetch("/api/printers/live");
      const data = await res.json();
      if (data.success && Array.isArray(data.printers) && data.printers.length > 0) {
        setPrinters(data.printers);
      }
    } catch (err) {
      console.error("Error fetching live printers:", err);
    } finally {
      setIsRefreshingPrinters(false);
    }
  };

  const fetchLivePricing = async () => {
    try {
      const res = await fetch("/api/admin/pricing");
      const data = await res.json();
      if (data.success && data.pricing) {
        setPricing(data.pricing);
      }
    } catch (err) {
      console.error("Error fetching live pricing:", err);
    }
  };

  const fetchShopSettings = async () => {
    try {
      const res = await fetch("/api/admin/settings");
      const data = await res.json();
      if (data.success && data.settings) {
        setIsShopClosed(Boolean(data.settings.is_closed));
        if (data.settings.closed_notice) {
          setClosedNotice(data.settings.closed_notice);
        }
      }
    } catch (err) {
      console.error("Error fetching shop settings:", err);
    }
  };

  const fetchPaymentMethod = async () => {
    try {
      const res = await fetch("/api/admin/payment-methods");
      const data = await res.json();
      if (data.success && data.primary) {
        setPaymentMethod(data.primary);
      }
    } catch (err) {
      console.error("Error fetching payment methods:", err);
    }
  };

  useEffect(() => {
    const loadAll = async () => {
      await Promise.all([
        fetchShopSettings(),
        fetchPaymentMethod(),
        fetchLivePrinters(),
        fetchLivePricing(),
      ]);
    };

    loadAll();

    // 8-second polling fallback ensures instantaneous sync if shopkeeper adjusts rates or pauses counter
    const pollInterval = setInterval(() => {
      loadAll();
    }, 8000);

    // Subscribe to realtime printer updates
    const printerChannel = supabase
      .channel("customer-live-printers")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "printers" },
        () => {
          fetchLivePrinters();
        }
      )
      .subscribe();

    // Subscribe to realtime pricing updates
    const pricingChannel = supabase
      .channel("customer-live-pricing")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "pricing" },
        () => {
          fetchLivePricing();
        }
      )
      .subscribe();

    return () => {
      clearInterval(pollInterval);
      supabase.removeChannel(printerChannel);
      supabase.removeChannel(pricingChannel);
    };
  }, []);

  // Whenever live pricing updates, recalculate file costs
  useEffect(() => {
    setFiles((prev) => {
      if (prev.length === 0) return prev;
      return prev.map((f) => ({
        ...f,
        price: calculateFileCost(f, pricing),
      }));
    });
  }, [pricing]);

  // Validation
  const isFilesValid = files.length > 0;

  // Handler for options per file
  const updateFileOption = (
    index: number,
    updates: Partial<OrderFileItem>
  ) => {
    const updated = [...files];
    const target = { ...updated[index], ...updates };

    // Synchronize Brother = Color, Canon = Black & White
    if (updates.color_mode === "color") {
      const brother = printers.find(p => (p.display_name + " " + p.system_name).toLowerCase().includes("brother"))
        || printers.find(p => p.type === "both" || p.type === "color");
      if (brother) {
        target.printer_id = brother.id;
      }
    } else if (updates.color_mode === "bw") {
      const canon = printers.find(p => (p.display_name + " " + p.system_name).toLowerCase().includes("canon"))
        || printers.find(p => p.type === "bw");
      if (canon) {
        target.printer_id = canon.id;
      }
    }

    if (updates.printer_id) {
      const printerObj = printers.find(p => p.id === updates.printer_id);
      const pName = ((printerObj?.display_name || "") + " " + (printerObj?.system_name || "")).toLowerCase();
      if (pName.includes("brother")) {
        target.color_mode = "color";
      } else if (pName.includes("canon") || pName.includes("cannon")) {
        target.color_mode = "bw";
      }
    }

    if (updates.page_range !== undefined || updates.page_count !== undefined) {
      target.effective_pages = calculateEffectivePages(
        target.page_range,
        target.page_count
      );
    }

    target.price = calculateFileCost(target, pricing);
    updated[index] = target;
    setFiles(updated);
  };

  const handleNextStep = () => {
    setErrorMsg(null);
    if (currentStep === 1) {
      if (!isFilesValid) {
        setErrorMsg("Please upload at least one document or PDF to proceed.");
        return;
      }
      // Initialize default live printer for files if unset
      const onlineList = printers.filter(p => p.status === "online");
      const activePool = onlineList.length > 0 ? onlineList : printers;
      const defaultBw = activePool.find(p => p.type === "bw") || activePool[0];
      const defaultColor = activePool.find(p => p.type === "both" || p.type === "color") || activePool[0];

      const updated = files.map(f => {
        if (!f.printer_id) {
          return {
            ...f,
            printer_id: f.color_mode === "color" 
              ? (defaultColor?.id || activePool[0]?.id || "default")
              : (defaultBw?.id || activePool[0]?.id || "default"),
          };
        }
        return f;
      });
      setFiles(updated);
      setCurrentStep(2);
    } else if (currentStep === 2) {
      setCurrentStep(3);
    }
  };

  const handlePrevStep = () => {
    setErrorMsg(null);
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  // Submit payment & create order
  const handlePaymentSubmit = async (utr?: string, screenshot?: File, autoPrint: boolean = true) => {
    setIsSubmitting(true);
    setErrorMsg(null);

    try {
      const finalUtr = utr?.trim() || `UPI${Math.floor(100000000000 + Math.random() * 900000000000)}`;
      const formData = new FormData();
      formData.append("customer_name", customerName.trim() || "Walk-in Customer");
      formData.append("customer_phone", customerPhone.trim() || "Walk-in");
      formData.append("customer_note", customerNote.trim());
      formData.append("utr_number", finalUtr);
      formData.append("auto_print", autoPrint ? "true" : "false");

      const filesMetadata = files.map((f, i) => {
        const matchedPrinter = printers.find(p => p.id === f.printer_id);
        return {
          file_name: f.file_name,
          file_type: f.file_type,
          file_size: f.file_size,
          page_count: f.page_count,
          copies: f.copies,
          color_mode: f.color_mode,
          paper_size: f.paper_size,
          duplex: f.duplex,
          page_range: f.page_range,
          effective_pages: f.effective_pages,
          printer_id: f.printer_id,
          printer_name: matchedPrinter?.system_name || matchedPrinter?.display_name || "",
          price: f.price,
        };
      });

      formData.append("files", JSON.stringify(filesMetadata));

      if (screenshot) {
        formData.append("screenshot", screenshot);
      }

      // Attach actual file binaries
      files.forEach((f, idx) => {
        if (f.file) {
          formData.append(`file_${idx}`, f.file);
        }
      });

      const res = await fetch("/api/orders", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Order submission failed");
      }

      // Route to live tracking page
      router.push(`/order/${data.order.access_token}`);
    } catch (err: any) {
      console.error("Order submit error:", err);
      setErrorMsg(err.message || "Failed to submit order. Please try again.");
      setIsSubmitting(false);
    }
  };

  const { total } = calculateOrderTotal(files, pricing);

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-slate-50 to-indigo-50/20">
      <Navbar
        language={language}
        onLanguageChange={setLanguage}
        isShopClosed={isShopClosed}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-3xl w-full mx-auto px-4 py-6 sm:py-8 space-y-6">
        {/* Doodly Hero Banner */}
        <div className="text-center space-y-3 pt-1">
          <div className="flex flex-wrap items-center justify-center gap-2">
            <span className="sticker-badge bg-yellow-300 text-slate-950 rotate-[-2deg]">
              <Sparkles className="w-3.5 h-3.5 text-indigo-700 stroke-[2.5]" />
              <span>Zero Line • No Pendrive</span>
            </span>
            <span className="sticker-badge bg-pink-200 text-pink-950 rotate-[1.5deg]">
              <span>⚡ Prints in 60 Seconds</span>
            </span>
            <span className="sticker-badge bg-emerald-200 text-emerald-950 hidden sm:inline-flex rotate-[-1deg]">
              <span>🎓 College Notes &amp; Assignments</span>
            </span>
          </div>

          <h1 className="text-3xl sm:text-4xl md:text-5xl font-black text-slate-900 tracking-tight leading-tight">
            Scan. Upload. <span className="wavy-underline">Get Prints.</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 font-bold max-w-lg mx-auto leading-relaxed">
            Fastest express printing counter. Send files directly from your phone, choose Canon B&amp;W or Brother Color, pay via UPI, and pick up in seconds!
          </p>
        </div>

        {/* Stepper Progress Bar (Doodly Neo-Card) */}
        <div className="neo-card p-3 sm:p-4 bg-white">
          <div className="flex items-center justify-between gap-1 sm:gap-2">
            {[
              { num: 1, label: language === "hi" ? "1. अपलोड" : "1. Upload File" },
              { num: 2, label: language === "hi" ? "2. सेटिंग्स" : "2. Options" },
              { num: 3, label: language === "hi" ? "3. भुगतान" : "3. Pay & Print" },
            ].map((step) => {
              const isActive = currentStep === step.num;
              const isPast = currentStep > step.num;

              return (
                <div key={step.num} className="flex-1 flex flex-col items-center relative">
                  <div
                    className={`w-9 h-9 sm:w-10 sm:h-10 rounded-2xl border-2 border-slate-900 flex items-center justify-center text-xs sm:text-sm font-black transition-all ${
                      isPast
                        ? "bg-emerald-400 text-slate-950 shadow-[2px_2px_0px_0px_#0f172a]"
                        : isActive
                        ? "bg-yellow-300 text-slate-950 shadow-[3px_3px_0px_0px_#0f172a] scale-105"
                        : "bg-slate-100 text-slate-400"
                    }`}
                  >
                    {isPast ? "✓" : step.num}
                  </div>
                  <span
                    className={`mt-1.5 text-[11px] sm:text-xs font-black text-center truncate max-w-[90px] sm:max-w-[120px] ${
                      isActive ? "text-slate-900" : "text-slate-400"
                    }`}
                  >
                    {step.label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Shop Closed Alert Banner */}
        {isShopClosed && (
          <div className="bg-rose-100 border-2 border-slate-900 rounded-3xl p-4 sm:p-5 flex items-start gap-3.5 text-rose-950 shadow-[4px_4px_0px_0px_#0f172a] animate-in fade-in">
            <div className="w-10 h-10 rounded-2xl bg-rose-200 border-2 border-slate-900 text-rose-900 flex items-center justify-center shrink-0 shadow-[2px_2px_0px_0px_#0f172a]">
              <Clock className="w-5 h-5 stroke-[2.5]" />
            </div>
            <div className="flex-1">
              <h3 className="text-sm font-black uppercase tracking-wide">Counter Currently Paused</h3>
              <p className="text-xs text-rose-800 mt-0.5 font-bold leading-relaxed">
                {closedNotice || "The print shop counter is temporarily not accepting orders. Please visit the counter or try again later."}
              </p>
            </div>
          </div>
        )}

        {/* Error message banner */}
        {errorMsg && (
          <div className="p-3.5 bg-rose-100 border-2 border-slate-900 text-rose-950 text-xs sm:text-sm font-bold rounded-2xl shadow-[3px_3px_0px_0px_#0f172a] flex items-center gap-2">
            <span>{errorMsg}</span>
          </div>
        )}

        {/* STEP 1: UPLOAD PDF / FILES (DIRECT FIRST PAGE) */}
        {currentStep === 1 && (
          <div className="neo-card p-6 sm:p-8 bg-white space-y-6 animate-in fade-in duration-200">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="sticker-badge bg-yellow-300 text-slate-950 text-[10px] rotate-[-2deg]">
                  STEP 01
                </span>
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Select Your Files
                </span>
              </div>
              <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                {t.upload_title}
              </h2>
              <p className="text-xs sm:text-sm text-slate-600 font-bold mt-0.5">
                {t.upload_sub}
              </p>
            </div>

            <FileUploader
              files={files}
              onChange={setFiles}
              language={language}
              maxSizeMb={25}
              pricing={pricing}
            />

            {/* Optional Instructions Drawer */}
            <details className="group bg-slate-50 border-2 border-slate-900 rounded-2xl p-4 transition-all text-xs shadow-[2px_2px_0px_0px_#0f172a]">
              <summary className="cursor-pointer font-black text-slate-800 hover:text-slate-950 list-none flex items-center justify-between select-none">
                <span className="flex items-center gap-2">
                  <Sliders className="w-4 h-4 text-indigo-600 stroke-[2.5]" />
                  <span>Optional: Special instructions or mobile number</span>
                </span>
                <span className="text-slate-900 font-black text-sm font-mono group-open:rotate-45 transition-transform">+</span>
              </summary>
              <div className="mt-3 pt-3 border-t-2 border-slate-900/10 space-y-3">
                <div>
                  <label className="block text-[11px] font-black text-slate-700 uppercase mb-1">
                    Mobile Number (Optional)
                  </label>
                  <input
                    type="tel"
                    maxLength={10}
                    value={customerPhone === "Walk-in" ? "" : customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value.replace(/\D/g, "") || "Walk-in")}
                    placeholder="Enter 10-digit number for SMS receipt"
                    className="w-full px-3.5 py-2.5 text-xs font-bold font-mono border-2 border-slate-900 rounded-xl outline-none focus:bg-yellow-50"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-black text-slate-700 uppercase mb-1">
                    Special Instructions (Optional)
                  </label>
                  <textarea
                    rows={2}
                    value={customerNote}
                    onChange={(e) => setCustomerNote(e.target.value)}
                    placeholder="e.g. Please staple top left corner, print on thick paper..."
                    className="w-full px-3.5 py-2.5 text-xs font-bold border-2 border-slate-900 rounded-xl outline-none focus:bg-yellow-50 resize-none"
                  />
                </div>
              </div>
            </details>

            <div className="pt-2">
              <button
                type="button"
                onClick={handleNextStep}
                disabled={!isFilesValid || isShopClosed}
                className="w-full py-4 px-6 neo-btn-primary text-base sm:text-lg cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <span>{isShopClosed ? "Counter Orders Paused" : (language === "hi" ? "प्रिंटर और सेटिंग्स चुनें" : "Choose Printer & Options")}</span>
                <ArrowRight className="w-5 h-5 stroke-[3]" />
              </button>
            </div>
          </div>
        )}

        {/* STEP 2: SELECT PRINTER & CONFIGURE OPTIONS */}
        {currentStep === 2 && files.length > 0 && (
          <div className="space-y-4 animate-in fade-in duration-200">
            {/* File Switcher Tabs */}
            {files.length > 1 && (
              <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
                {files.map((f, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setActiveFileIndex(i)}
                    className={`px-4 py-2 rounded-2xl text-xs font-black whitespace-nowrap border-2 border-slate-900 transition-all ${
                      activeFileIndex === i
                        ? "bg-yellow-300 text-slate-950 shadow-[3px_3px_0px_0px_#0f172a] -translate-y-0.5"
                        : "bg-white text-slate-700 hover:bg-slate-50 shadow-[1px_1px_0px_0px_#0f172a]"
                    }`}
                  >
                    File {i + 1}: {f.file_name.substring(0, 16)}...
                  </button>
                ))}
              </div>
            )}

            {/* Selected File Settings Card (Neo-Card) */}
            {(() => {
              const currentFile = files[activeFileIndex] || files[0];
              const fileCost = calculateFileCost(currentFile, pricing);

              return (
                <div className="neo-card p-6 sm:p-8 bg-white space-y-6">
                  <div className="flex items-center justify-between border-b-2 border-slate-900/10 pb-4">
                    <div>
                      <span className="sticker-badge bg-indigo-100 text-indigo-950 text-[10px] mb-1">
                        {t.file_options_header} {activeFileIndex + 1} of {files.length}
                      </span>
                      <h3 className="text-base sm:text-lg font-black text-slate-900 truncate max-w-sm sm:max-w-md mt-1">
                        {currentFile.file_name}
                      </h3>
                      <p className="text-xs font-bold text-slate-500">
                        📄 {currentFile.page_count} pages detected
                      </p>
                    </div>

                    <div className="text-right">
                      <span className="text-[10px] font-black uppercase text-slate-400 block tracking-wider">{t.estimated_cost}</span>
                      <span className="text-2xl font-black text-slate-900">
                        ₹{fileCost.toFixed(2)}
                      </span>
                    </div>
                  </div>

                  <div className="space-y-6">
                    {/* Color Mode Selection */}
                    <div>
                      <label className="block text-xs font-black text-slate-800 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                        <span>🎨 {t.color_mode}</span>
                        <span className="text-[10px] font-bold text-slate-400 normal-case">(Auto-selects printer)</span>
                      </label>
                      <div className="grid grid-cols-2 gap-3">
                        <button
                          type="button"
                          onClick={() => updateFileOption(activeFileIndex, { color_mode: "bw" })}
                          className={`p-3.5 sm:p-4 rounded-2xl border-2 border-slate-900 text-left transition-all ${
                            currentFile.color_mode === "bw"
                              ? "bg-amber-100/90 text-slate-950 shadow-[3px_3px_0px_0px_#0f172a] -translate-y-0.5 ring-2 ring-amber-400"
                              : "bg-white text-slate-600 hover:bg-slate-50 shadow-[1px_1px_0px_0px_#0f172a]"
                          }`}
                        >
                          <div className="text-sm font-black flex items-center gap-1.5">
                            <span>⚫ {t.bw_label}</span>
                            <span className="sticker-badge bg-yellow-300 text-slate-950 text-[10px]">₹{pricing.bw_page}/pg</span>
                          </div>
                          <div className="text-[11px] font-bold text-slate-500 mt-1">Assignments, text &amp; notes</div>
                        </button>

                        <button
                          type="button"
                          onClick={() => updateFileOption(activeFileIndex, { color_mode: "color" })}
                          className={`p-3.5 sm:p-4 rounded-2xl border-2 border-slate-900 text-left transition-all ${
                            currentFile.color_mode === "color"
                              ? "bg-pink-100 text-slate-950 shadow-[3px_3px_0px_0px_#0f172a] -translate-y-0.5 ring-2 ring-pink-400"
                              : "bg-white text-slate-600 hover:bg-slate-50 shadow-[1px_1px_0px_0px_#0f172a]"
                          }`}
                        >
                          <div className="text-sm font-black flex items-center gap-1.5">
                            <span>🌈 {t.color_label}</span>
                            <span className="sticker-badge bg-pink-300 text-slate-950 text-[10px]">₹{pricing.color_page}/pg</span>
                          </div>
                          <div className="text-[11px] font-bold text-slate-500 mt-1">Diagrams, charts &amp; photos</div>
                        </button>
                      </div>
                    </div>

                    {/* Printer Selection with Rules */}
                    <div>
                      <label className="block text-xs font-black text-slate-800 uppercase tracking-wider mb-2">
                        🖨️ {t.printer_label}
                      </label>
                      <PrinterSelector
                        selectedPrinterId={currentFile.printer_id}
                        colorMode={currentFile.color_mode}
                        printers={printers}
                        onSelectPrinter={(pid, mode) => updateFileOption(activeFileIndex, { printer_id: pid, color_mode: mode })}
                        onRefresh={fetchLivePrinters}
                        isRefreshing={isRefreshingPrinters}
                      />
                    </div>

                    {/* Copies & Page Range */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="bg-slate-50 border-2 border-slate-900 rounded-2xl p-3.5 shadow-[2px_2px_0px_0px_#0f172a]">
                        <label className="block text-[11px] font-black text-slate-800 uppercase tracking-wider mb-2">
                          🔢 {t.copies_label}
                        </label>
                        <div className="flex items-center">
                          <button
                            type="button"
                            onClick={() =>
                              updateFileOption(activeFileIndex, {
                                copies: Math.max(1, currentFile.copies - 1),
                              })
                            }
                            className="w-10 h-10 border-2 border-slate-900 rounded-xl bg-white hover:bg-yellow-200 flex items-center justify-center font-black text-slate-900 text-lg shadow-[2px_2px_0px_0px_#0f172a] active:translate-x-0.5 active:translate-y-0.5 cursor-pointer"
                          >
                            -
                          </button>
                          <input
                            type="number"
                            min="1"
                            max="100"
                            value={currentFile.copies}
                            onChange={(e) =>
                              updateFileOption(activeFileIndex, {
                                copies: Math.max(1, parseInt(e.target.value, 10) || 1),
                              })
                            }
                            className="w-16 h-10 text-center font-black text-slate-900 text-base outline-none bg-transparent"
                          />
                          <button
                            type="button"
                            onClick={() =>
                              updateFileOption(activeFileIndex, {
                                copies: currentFile.copies + 1,
                              })
                            }
                            className="w-10 h-10 border-2 border-slate-900 rounded-xl bg-white hover:bg-yellow-200 flex items-center justify-center font-black text-slate-900 text-lg shadow-[2px_2px_0px_0px_#0f172a] active:translate-x-0.5 active:translate-y-0.5 cursor-pointer"
                          >
                            +
                          </button>
                        </div>
                      </div>

                      <div className="bg-slate-50 border-2 border-slate-900 rounded-2xl p-3.5 shadow-[2px_2px_0px_0px_#0f172a]">
                        <label className="block text-[11px] font-black text-slate-800 uppercase tracking-wider mb-2">
                          📑 {t.page_range_label}
                        </label>
                        <input
                          type="text"
                          value={currentFile.page_range === "all" ? "" : currentFile.page_range}
                          placeholder="All pages (or e.g. 1-3, 5)"
                          onChange={(e) =>
                            updateFileOption(activeFileIndex, {
                              page_range: e.target.value.trim() ? e.target.value : "all",
                            })
                          }
                          className="w-full px-3 py-2 text-xs font-bold font-mono border-2 border-slate-900 rounded-xl bg-white focus:bg-yellow-50 outline-none"
                        />
                        <p className="text-[10px] font-bold text-slate-500 mt-1.5">
                          Printing <strong>{currentFile.effective_pages}</strong> of {currentFile.page_count} pages
                        </p>
                      </div>
                    </div>

                    {/* Paper Size & Sides */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="bg-slate-50 border-2 border-slate-900 rounded-2xl p-3.5 shadow-[2px_2px_0px_0px_#0f172a]">
                        <label className="block text-[11px] font-black text-slate-800 uppercase tracking-wider mb-2">
                          📐 {t.paper_size_label}
                        </label>
                        <select
                          value={currentFile.paper_size}
                          onChange={(e) =>
                            updateFileOption(activeFileIndex, {
                              paper_size: e.target.value as PaperSize,
                            })
                          }
                          className="w-full px-3 py-2 text-xs font-bold border-2 border-slate-900 rounded-xl bg-white focus:bg-yellow-50 outline-none"
                        >
                          <option value="A4">A4 (Standard 210 x 297 mm)</option>
                          <option value="Legal">Legal (216 x 356 mm)</option>
                          <option value="Letter">Letter (216 x 279 mm)</option>
                        </select>
                      </div>

                      <div className="bg-slate-50 border-2 border-slate-900 rounded-2xl p-3.5 shadow-[2px_2px_0px_0px_#0f172a]">
                        <label className="block text-[11px] font-black text-slate-800 uppercase tracking-wider mb-2">
                          🔄 {t.duplex_label}
                        </label>
                        <div className="grid grid-cols-2 gap-2">
                          <button
                            type="button"
                            onClick={() => updateFileOption(activeFileIndex, { duplex: "single" })}
                            className={`py-2 px-3 text-xs rounded-xl border-2 border-slate-900 font-black transition-all ${
                              currentFile.duplex === "single"
                                ? "bg-yellow-300 text-slate-950 shadow-[2px_2px_0px_0px_#0f172a]"
                                : "bg-white text-slate-600 hover:bg-slate-100"
                            }`}
                          >
                            {t.single_sided}
                          </button>
                          <button
                            type="button"
                            onClick={() => updateFileOption(activeFileIndex, { duplex: "double" })}
                            className={`py-2 px-3 text-xs rounded-xl border-2 border-slate-900 font-black transition-all ${
                              currentFile.duplex === "double"
                                ? "bg-yellow-300 text-slate-950 shadow-[2px_2px_0px_0px_#0f172a]"
                                : "bg-white text-slate-600 hover:bg-slate-100"
                            }`}
                          >
                            {t.double_sided}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Estimated Total Bar (Neo-Card) */}
                  <div className="bg-amber-50 border-2 border-slate-900 rounded-2xl p-4 flex items-center justify-between shadow-[3px_3px_0px_0px_#0f172a]">
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="sticker-badge bg-yellow-300 text-slate-950 text-[10px]">
                          TOTAL
                        </span>
                        <span className="text-xs font-black text-slate-900">
                          {files.length} document{files.length > 1 ? "s" : ""}
                        </span>
                      </div>
                      <div className="text-[11px] font-bold text-slate-600 mt-1">
                        ⚡ {files.reduce((acc, f) => acc + (f.effective_pages * f.copies), 0)} total pages ready to print
                      </div>
                    </div>
                    <div className="text-3xl font-black text-slate-900">
                      ₹{total.toFixed(2)}
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-3 pt-2">
                    <button
                      type="button"
                      onClick={handlePrevStep}
                      className="px-5 py-3.5 border-2 border-slate-900 rounded-2xl bg-white hover:bg-slate-100 font-black text-slate-900 shadow-[3px_3px_0px_0px_#0f172a] active:translate-x-0.5 active:translate-y-0.5 transition-all flex items-center justify-center gap-2 text-sm cursor-pointer"
                    >
                      <ArrowLeft className="w-4 h-4 stroke-[3]" />
                      <span>Back to Files</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleNextStep}
                      className="flex-1 py-4 px-6 neo-btn-primary text-base sm:text-lg cursor-pointer"
                    >
                      <span>Proceed to Payment (₹{total.toFixed(2)})</span>
                      <ArrowRight className="w-5 h-5 stroke-[3]" />
                    </button>
                  </div>
                </div>
              );
            })()}
          </div>
        )}

        {/* STEP 3: PAY & INSTANT PRINT */}
        {currentStep === 3 && (
          <div className="space-y-6 animate-in fade-in duration-200">
            {/* Order Quick Details (Neo-Card) */}
            <div className="neo-card p-4 sm:p-5 bg-white flex items-center justify-between">
              <div className="min-w-0 pr-3">
                <div className="flex items-center gap-1.5 mb-1">
                  <span className="sticker-badge bg-emerald-300 text-slate-950 text-[10px]">
                    READY TO PRINT
                  </span>
                  <span className="text-xs font-black text-slate-900">
                    {files.length} document{files.length > 1 ? "s" : ""}
                  </span>
                </div>
                <span className="text-xs font-bold text-slate-600 truncate block">
                  {files.map((f) => f.file_name).join(", ")}
                </span>
              </div>
              <div className="text-right shrink-0">
                <span className="text-[10px] font-black uppercase text-slate-400 block tracking-wider">Final Price</span>
                <span className="text-2xl sm:text-3xl font-black text-slate-900">
                  ₹{total.toFixed(2)}
                </span>
              </div>
            </div>

            <PaymentSection
              amount={total}
              orderNumber="EXPRESS"
              paymentMethod={paymentMethod}
              language={language}
              onSubmitPayment={handlePaymentSubmit}
              isSubmitting={isSubmitting}
              customerName={customerName}
              customerPhone={customerPhone}
            />

            <div className="pt-2 text-center">
              <button
                type="button"
                onClick={handlePrevStep}
                disabled={isSubmitting}
                className="inline-flex items-center gap-2 px-4 py-2 border-2 border-slate-900 rounded-xl bg-white text-xs font-black text-slate-800 shadow-[2px_2px_0px_0px_#0f172a] hover:bg-yellow-200 transition-all cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5 stroke-[2.5]" />
                <span>Change Printer &amp; Options</span>
              </button>
            </div>
          </div>
        )}

        {/* Track Existing Order Footer Section (Doodly Ticket Stub) */}
        <div className="mt-10 pt-6 border-t-2 border-slate-900/10 text-center">
          <div className="neo-card-sm p-4 bg-white/90 max-w-md mx-auto space-y-3">
            <div className="flex items-center justify-center gap-2">
              <span className="sticker-badge bg-sky-200 text-sky-950 text-[11px] rotate-[-1deg]">
                🎟️ Already Placed an Order?
              </span>
            </div>
            <p className="text-xs font-bold text-slate-600">
              Enter your token number or order ID to view live printing status
            </p>
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={trackTokenInput}
                onChange={(e) => setTrackTokenInput(e.target.value)}
                placeholder="Order # (e.g. PC-1001 or Token #1)"
                className="flex-1 px-3.5 py-2.5 text-xs font-black font-mono border-2 border-slate-900 rounded-xl outline-none focus:bg-yellow-50 uppercase placeholder:normal-case placeholder:font-normal"
              />
              <button
                type="button"
                onClick={() => {
                  if (trackTokenInput.trim()) {
                    router.push(`/order/${trackTokenInput.trim()}`);
                  }
                }}
                className="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-yellow-300 text-xs font-black rounded-xl border-2 border-slate-900 shadow-[2px_2px_0px_0px_#0f172a] active:translate-x-0.5 active:translate-y-0.5 transition-all shrink-0 cursor-pointer"
              >
                Track Now 🚀
              </button>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="mt-auto py-6 border-t border-slate-200/60 text-center text-xs text-slate-400">
        <p>� {new Date().getFullYear()} Preeti Communication. All rights reserved.</p>
        <p className="mt-1 text-[11px] text-slate-400">
          Powered by PrintQR � Auto Printing Engine
        </p>
      </footer>
    </div>
  );
}
