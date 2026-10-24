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
        {/* Modern Hero Banner */}
        <div className="text-center space-y-3 pt-2">
          <div className="flex flex-wrap items-center justify-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-200/80 shadow-xs">
              <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
              <span>Express Print Counter</span>
            </span>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200/80 shadow-xs">
              <span>⚡ Ready in 60 Seconds</span>
            </span>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-sky-50 text-sky-700 border border-sky-200/80 hidden sm:inline-flex shadow-xs">
              <span>📱 No Pendrive Needed</span>
            </span>
          </div>

          <h1 className="text-3xl sm:text-4xl md:text-5xl font-black text-slate-900 tracking-tight leading-tight">
            Scan. Upload. <span className="gradient-text">Get Prints.</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 font-medium max-w-lg mx-auto leading-relaxed">
            Send documents directly from your phone, choose Canon B&amp;W or Brother Color, pay online via UPI, and collect in seconds at the counter.
          </p>
        </div>

        {/* Stepper Progress Bar (Modern Glass Stepper) */}
        <div className="glass-card p-3 sm:p-4">
          <div className="flex items-center justify-between gap-2 sm:gap-4">
            {[
              { num: 1, label: language === "hi" ? "1. अपलोड" : "1. Upload File" },
              { num: 2, label: language === "hi" ? "2. सेटिंग्स" : "2. Printer & Options" },
              { num: 3, label: language === "hi" ? "3. भुगतान" : "3. Pay & Print" },
            ].map((step) => {
              const isActive = currentStep === step.num;
              const isPast = currentStep > step.num;

              return (
                <div key={step.num} className="flex-1 flex flex-col items-center relative">
                  <div
                    className={`w-9 h-9 sm:w-10 sm:h-10 rounded-2xl flex items-center justify-center text-xs sm:text-sm font-black transition-all ${
                      isPast
                        ? "bg-emerald-500 text-white shadow-sm"
                        : isActive
                        ? "bg-gradient-to-tr from-indigo-600 to-violet-600 text-white shadow-md shadow-indigo-600/30 scale-105"
                        : "bg-slate-100 text-slate-400"
                    }`}
                  >
                    {isPast ? "✓" : step.num}
                  </div>
                  <span
                    className={`mt-1.5 text-[11px] sm:text-xs font-bold text-center truncate max-w-[100px] sm:max-w-[140px] ${
                      isActive ? "text-indigo-600 font-black" : "text-slate-500"
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
          <div className="bg-rose-50 border border-rose-200 rounded-3xl p-4 sm:p-5 flex items-start gap-3.5 text-rose-950 shadow-xs animate-in fade-in">
            <div className="w-10 h-10 rounded-2xl bg-rose-100 text-rose-700 flex items-center justify-center shrink-0">
              <Clock className="w-5 h-5 stroke-[2.2]" />
            </div>
            <div className="flex-1">
              <h3 className="text-sm font-bold uppercase tracking-wide">Counter Currently Paused</h3>
              <p className="text-xs text-rose-800 mt-0.5 font-medium leading-relaxed">
                {closedNotice || "The print shop counter is temporarily not accepting orders. Please visit the counter or try again later."}
              </p>
            </div>
          </div>
        )}

        {/* Error message banner */}
        {errorMsg && (
          <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-900 text-xs sm:text-sm font-semibold rounded-2xl shadow-xs flex items-center gap-2">
            <span>{errorMsg}</span>
          </div>
        )}

        {/* STEP 1: UPLOAD PDF / FILES (DIRECT FIRST PAGE) */}
        {currentStep === 1 && (
          <div className="glass-card p-6 sm:p-8 space-y-6 animate-in fade-in duration-200">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-indigo-50 text-indigo-700 border border-indigo-200">
                  STEP 01
                </span>
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Select Documents
                </span>
              </div>
              <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                {t.upload_title}
              </h2>
              <p className="text-xs sm:text-sm text-slate-500 font-medium mt-0.5">
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
            <details className="group bg-slate-50/70 border border-slate-200/80 rounded-2xl p-4 transition-all text-xs">
              <summary className="cursor-pointer font-bold text-slate-700 hover:text-slate-950 list-none flex items-center justify-between select-none">
                <span className="flex items-center gap-2">
                  <Sliders className="w-4 h-4 text-indigo-600 stroke-[2.2]" />
                  <span>Optional: Special instructions or mobile number</span>
                </span>
                <span className="text-slate-500 font-bold text-sm font-mono group-open:rotate-45 transition-transform">+</span>
              </summary>
              <div className="mt-3 pt-3 border-t border-slate-200/80 space-y-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                    Mobile Number (Optional)
                  </label>
                  <input
                    type="tel"
                    maxLength={10}
                    value={customerPhone === "Walk-in" ? "" : customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value.replace(/\D/g, "") || "Walk-in")}
                    placeholder="Enter 10-digit number for SMS receipt"
                    className="w-full px-3.5 py-2.5 text-xs font-medium font-mono border border-slate-200 rounded-xl outline-none focus:border-indigo-500 bg-white"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                    Special Instructions (Optional)
                  </label>
                  <textarea
                    rows={2}
                    value={customerNote}
                    onChange={(e) => setCustomerNote(e.target.value)}
                    placeholder="e.g. Please staple top left corner, print on thick paper..."
                    className="w-full px-3.5 py-2.5 text-xs font-medium border border-slate-200 rounded-xl outline-none focus:border-indigo-500 bg-white resize-none"
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
                <ArrowRight className="w-5 h-5 stroke-[2.5]" />
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
                    className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                      activeFileIndex === i
                        ? "bg-indigo-600 text-white shadow-sm"
                        : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    File {i + 1}: {f.file_name.substring(0, 16)}...
                  </button>
                ))}
              </div>
            )}

            {/* Selected File Settings Card (Glass-Card) */}
            {(() => {
              const currentFile = files[activeFileIndex] || files[0];
              const fileCost = calculateFileCost(currentFile, pricing);

              return (
                <div className="glass-card p-6 sm:p-8 space-y-6">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                    <div>
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-indigo-50 text-indigo-700 mb-1">
                        {t.file_options_header} {activeFileIndex + 1} of {files.length}
                      </span>
                      <h3 className="text-base sm:text-lg font-bold text-slate-900 truncate max-w-sm sm:max-w-md mt-1">
                        {currentFile.file_name}
                      </h3>
                      <p className="text-xs font-medium text-slate-500">
                        📄 {currentFile.page_count} pages detected
                      </p>
                    </div>

                    <div className="text-right">
                      <span className="text-[10px] font-bold uppercase text-slate-400 block tracking-wider">{t.estimated_cost}</span>
                      <span className="text-2xl font-black text-indigo-600">
                        ₹{fileCost.toFixed(2)}
                      </span>
                    </div>
                  </div>

                  <div className="space-y-6">
                    {/* Color Mode Selection */}
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                        <span>{t.color_mode}</span>
                        <span className="text-[10px] font-normal text-slate-400 normal-case">(Auto-selects printer)</span>
                      </label>
                      <div className="grid grid-cols-2 gap-3.5">
                        {/* Black & White Box */}
                        <button
                          type="button"
                          onClick={() => updateFileOption(activeFileIndex, { color_mode: "bw" })}
                          className={`relative p-4 rounded-2xl text-left transition-all duration-200 cursor-pointer overflow-hidden ${
                            currentFile.color_mode === "bw"
                              ? "bg-slate-950 text-white border-2 border-black ring-4 ring-slate-900/15 shadow-xl shadow-slate-950/20 -translate-y-0.5"
                              : "bg-white text-slate-800 border-2 border-slate-300 hover:border-slate-800 hover:bg-slate-50/80 shadow-xs"
                          }`}
                        >
                          <div className="flex items-center justify-between gap-1.5">
                            <span className="text-sm font-black flex items-center gap-1.5">
                              <span className="text-base">⚫</span>
                              <span className={currentFile.color_mode === "bw" ? "text-white" : "text-slate-900"}>
                                {t.bw_label}
                              </span>
                            </span>
                            <span
                              className={`text-xs font-black px-2.5 py-0.5 rounded-full ${
                                currentFile.color_mode === "bw"
                                  ? "bg-white text-slate-950 shadow-xs"
                                  : "bg-slate-100 text-slate-800 border border-slate-300"
                              }`}
                            >
                              ₹{pricing.bw_page}/pg
                            </span>
                          </div>
                          <div
                            className={`text-xs mt-1.5 font-medium ${
                              currentFile.color_mode === "bw" ? "text-slate-300" : "text-slate-500"
                            }`}
                          >
                            Assignments, text &amp; notes
                          </div>
                          {currentFile.color_mode === "bw" && (
                            <div className="mt-2.5 pt-2 border-t border-slate-800 flex items-center gap-1.5 text-[11px] font-bold text-slate-200">
                              <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse"></span>
                              <span>Active: Monochrome Mode</span>
                            </div>
                          )}
                        </button>

                        {/* Full Color Box */}
                        <button
                          type="button"
                          onClick={() => updateFileOption(activeFileIndex, { color_mode: "color" })}
                          className={`relative p-4 rounded-2xl text-left transition-all duration-200 cursor-pointer overflow-hidden ${
                            currentFile.color_mode === "color"
                              ? "bg-gradient-to-br from-pink-500/10 via-purple-500/15 to-amber-500/10 border-2 border-pink-500 ring-4 ring-pink-500/25 shadow-xl shadow-pink-500/15 -translate-y-0.5"
                              : "bg-gradient-to-br from-pink-50/40 via-purple-50/20 to-white text-slate-800 border-2 border-purple-200 hover:border-pink-400 hover:bg-pink-50/50 shadow-xs"
                          }`}
                        >
                          <div className="flex items-center justify-between gap-1.5">
                            <span className="text-sm font-black flex items-center gap-1.5">
                              <span className="text-base">🌈</span>
                              <span
                                className={
                                  currentFile.color_mode === "color"
                                    ? "bg-gradient-to-r from-pink-600 via-purple-600 to-indigo-600 bg-clip-text text-transparent font-black"
                                    : "text-purple-950 font-bold"
                                }
                              >
                                {t.color_label}
                              </span>
                            </span>
                            <span
                              className={`text-xs font-black px-2.5 py-0.5 rounded-full ${
                                currentFile.color_mode === "color"
                                  ? "bg-gradient-to-r from-pink-600 via-purple-600 to-indigo-600 text-white shadow-md shadow-pink-500/25"
                                  : "bg-pink-100 text-pink-700 border border-pink-200"
                              }`}
                            >
                              ₹{pricing.color_page}/pg
                            </span>
                          </div>
                          <div
                            className={`text-xs mt-1.5 font-medium ${
                              currentFile.color_mode === "color" ? "text-purple-900 font-semibold" : "text-slate-500"
                            }`}
                          >
                            Diagrams, charts &amp; photos
                          </div>
                          {currentFile.color_mode === "color" && (
                            <div className="mt-2.5 pt-2 border-t border-pink-200/60 flex items-center gap-1.5 text-[11px] font-bold text-pink-700">
                              <span className="w-1.5 h-1.5 rounded-full bg-pink-500 animate-pulse"></span>
                              <span>Active: Vibrant Color Mode</span>
                            </div>
                          )}
                        </button>
                      </div>
                    </div>

                    {/* Printer Selection with Rules */}
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                        {t.printer_label}
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
                      <div className="bg-slate-50/80 border border-slate-200/80 rounded-2xl p-3.5">
                        <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-2">
                          {t.copies_label}
                        </label>
                        <div className="flex items-center">
                          <button
                            type="button"
                            onClick={() =>
                              updateFileOption(activeFileIndex, {
                                copies: Math.max(1, currentFile.copies - 1),
                              })
                            }
                            className="w-10 h-10 border border-slate-200 rounded-xl bg-white hover:bg-slate-100 flex items-center justify-center font-bold text-slate-700 cursor-pointer"
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
                            className="w-16 h-10 text-center font-bold text-slate-900 text-base outline-none bg-transparent"
                          />
                          <button
                            type="button"
                            onClick={() =>
                              updateFileOption(activeFileIndex, {
                                copies: currentFile.copies + 1,
                              })
                            }
                            className="w-10 h-10 border border-slate-200 rounded-xl bg-white hover:bg-slate-100 flex items-center justify-center font-bold text-slate-700 cursor-pointer"
                          >
                            +
                          </button>
                        </div>
                      </div>

                      <div className="bg-slate-50/80 border border-slate-200/80 rounded-2xl p-3.5">
                        <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-2">
                          {t.page_range_label}
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
                          className="w-full px-3 py-2 text-xs font-mono font-bold border border-slate-200 rounded-xl bg-white focus:border-indigo-500 outline-none"
                        />
                        <p className="text-[10px] text-slate-400 mt-1.5">
                          Printing <strong>{currentFile.effective_pages}</strong> of {currentFile.page_count} pages
                        </p>
                      </div>
                    </div>

                    {/* Paper Size & Sides */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="bg-slate-50/80 border border-slate-200/80 rounded-2xl p-3.5">
                        <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-2">
                          {t.paper_size_label}
                        </label>
                        <select
                          value={currentFile.paper_size}
                          onChange={(e) =>
                            updateFileOption(activeFileIndex, {
                              paper_size: e.target.value as PaperSize,
                            })
                          }
                          className="w-full px-3 py-2 text-xs font-semibold border border-slate-200 rounded-xl bg-white focus:border-indigo-500 outline-none"
                        >
                          <option value="A4">A4 (Standard 210 x 297 mm)</option>
                          <option value="Legal">Legal (216 x 356 mm)</option>
                          <option value="Letter">Letter (216 x 279 mm)</option>
                        </select>
                      </div>

                      <div className="bg-slate-50/80 border border-slate-200/80 rounded-2xl p-3.5">
                        <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-2">
                          {t.duplex_label}
                        </label>
                        <div className="grid grid-cols-2 gap-2">
                          <button
                            type="button"
                            onClick={() => updateFileOption(activeFileIndex, { duplex: "single" })}
                            className={`py-2 px-3 text-xs rounded-xl font-bold transition-all cursor-pointer ${
                              currentFile.duplex === "single"
                                ? "bg-indigo-600 text-white shadow-xs"
                                : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-100"
                            }`}
                          >
                            {t.single_sided}
                          </button>
                          <button
                            type="button"
                            onClick={() => updateFileOption(activeFileIndex, { duplex: "double" })}
                            className={`py-2 px-3 text-xs rounded-xl font-bold transition-all cursor-pointer ${
                              currentFile.duplex === "double"
                                ? "bg-indigo-600 text-white shadow-xs"
                                : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-100"
                            }`}
                          >
                            {t.double_sided}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Estimated Total Bar */}
                  <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white rounded-2xl p-4 sm:p-5 flex items-center justify-between shadow-md">
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-black uppercase bg-emerald-500 text-slate-950">
                          TOTAL
                        </span>
                        <span className="text-xs font-bold text-slate-200">
                          {files.length} document{files.length > 1 ? "s" : ""}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-400 mt-1">
                        ⚡ {files.reduce((acc, f) => acc + (f.effective_pages * f.copies), 0)} total pages ready to print
                      </div>
                    </div>
                    <div className="text-3xl font-black text-white">
                      ₹{total.toFixed(2)}
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-3 pt-2">
                    <button
                      type="button"
                      onClick={handlePrevStep}
                      className="px-5 py-3.5 border border-slate-200 rounded-2xl bg-white hover:bg-slate-50 font-bold text-slate-700 shadow-xs transition-all flex items-center justify-center gap-2 text-sm cursor-pointer"
                    >
                      <ArrowLeft className="w-4 h-4" />
                      <span>Back to Files</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleNextStep}
                      className="flex-1 py-4 px-6 neo-btn-primary text-base sm:text-lg cursor-pointer"
                    >
                      <span>Proceed to Payment (₹{total.toFixed(2)})</span>
                      <ArrowRight className="w-5 h-5 stroke-[2.5]" />
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
            {/* Order Quick Details */}
            <div className="glass-card p-4 sm:p-5 flex items-center justify-between">
              <div className="min-w-0 pr-3">
                <div className="flex items-center gap-1.5 mb-1">
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-200">
                    READY TO PRINT
                  </span>
                  <span className="text-xs font-bold text-slate-900">
                    {files.length} document{files.length > 1 ? "s" : ""}
                  </span>
                </div>
                <span className="text-xs text-slate-500 truncate block">
                  {files.map((f) => f.file_name).join(", ")}
                </span>
              </div>
              <div className="text-right shrink-0">
                <span className="text-[10px] font-bold uppercase text-slate-400 block tracking-wider">Final Price</span>
                <span className="text-2xl sm:text-3xl font-black text-indigo-600">
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
                className="inline-flex items-center gap-2 px-4 py-2 border border-slate-200 rounded-xl bg-white text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-50 shadow-xs transition-all cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5 stroke-[2.2]" />
                <span>Change Printer &amp; Options</span>
              </button>
            </div>
          </div>
        )}

        {/* Track Existing Order Footer Section */}
        <div className="mt-10 pt-6 border-t border-slate-200/80 text-center">
          <div className="glass-card p-5 max-w-md mx-auto space-y-3">
            <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-700">
              🎟️ Already Placed an Order?
            </span>
            <p className="text-xs font-medium text-slate-500">
              Enter your token number or order ID to view live printing status
            </p>
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={trackTokenInput}
                onChange={(e) => setTrackTokenInput(e.target.value)}
                placeholder="Order # (e.g. PC-1001 or Token #1)"
                className="flex-1 px-3.5 py-2.5 text-xs font-mono font-bold border border-slate-200 rounded-xl outline-none focus:border-indigo-500 uppercase placeholder:normal-case placeholder:font-normal bg-white"
              />
              <button
                type="button"
                onClick={() => {
                  if (trackTokenInput.trim()) {
                    router.push(`/order/${trackTokenInput.trim()}`);
                  }
                }}
                className="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl transition-all shrink-0 cursor-pointer"
              >
                Track Now
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
