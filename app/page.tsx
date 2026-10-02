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

  useEffect(() => {
    async function loadShopConfig() {
      try {
        const { data: pm } = await supabase
          .from("payment_methods")
          .select("*")
          .eq("is_active", true)
          .limit(1)
          .maybeSingle();
        if (pm) {
          setPaymentMethod(pm);
        }

        const { data: setting } = await supabase
          .from("settings")
          .select("value")
          .eq("key", "shop_info")
          .maybeSingle();
        if (setting?.value?.is_closed !== undefined) {
          setIsShopClosed(Boolean(setting.value.is_closed));
        }

        // Fetch live connected printers directly from system
        await fetchLivePrinters();

        // Fetch live pricing
        await fetchLivePricing();
      } catch (err) {
        console.error("Error loading shop config:", err);
      }
    }

    loadShopConfig();

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

    // If color mode changed to color, ensure printer supports color
    if (updates.color_mode === "color") {
      const colorPrinter = printers.find(p => (p.type === "both" || p.type === "color") && p.status === "online")
        || printers.find(p => p.type === "both" || p.type === "color");
      if (colorPrinter) {
        target.printer_id = colorPrinter.id;
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
        {/* Hero Banner */}
        <div className="text-center space-y-2">
          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold bg-indigo-100 text-indigo-700">
            <Sparkles className="w-3.5 h-3.5" />
            Preeti Communication Express Print Counter
          </span>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
            {t.shop_title}
          </h1>
          <p className="text-sm text-slate-600 max-w-lg mx-auto">
            {t.tagline}
          </p>
        </div>

        {/* Stepper Progress Bar (3 Simple Steps) */}
        <div className="bg-white border border-slate-200 rounded-2xl p-3 sm:p-4 shadow-xs">
          <div className="flex items-center justify-between">
            {[
              { num: 1, label: language === "hi" ? "1. PDF भेजें / अपलोड" : "1. Upload PDF" },
              { num: 2, label: language === "hi" ? "2. प्रिंटर और सेटिंग्स" : "2. Printer & Options" },
              { num: 3, label: language === "hi" ? "3. भुगतान और प्रिंट" : "3. Pay & Print" },
            ].map((step) => {
              const isActive = currentStep === step.num;
              const isPast = currentStep > step.num;

              return (
                <div key={step.num} className="flex-1 flex flex-col items-center relative">
                  <div
                    className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                      isPast
                        ? "bg-emerald-500 text-white"
                        : isActive
                        ? "bg-indigo-600 text-white ring-4 ring-indigo-100"
                        : "bg-slate-100 text-slate-400"
                    }`}
                  >
                    {isPast ? "✓" : step.num}
                  </div>
                  <span
                    className={`mt-1.5 text-[11px] sm:text-xs font-medium text-center truncate max-w-[90px] sm:max-w-[120px] ${
                      isActive ? "text-indigo-600 font-bold" : "text-slate-400"
                    }`}
                  >
                    {step.label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Error message banner */}
        {errorMsg && (
          <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs sm:text-sm rounded-xl flex items-center gap-2">
            <span>{errorMsg}</span>
          </div>
        )}

        {/* STEP 1: UPLOAD PDF / FILES (DIRECT FIRST PAGE) */}
        {currentStep === 1 && (
          <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-xs space-y-6 animate-in fade-in duration-200">
            <div>
              <h2 className="text-lg font-bold text-slate-900">
                {t.upload_title}
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
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
            <details className="group bg-slate-50/70 border border-slate-200/80 rounded-2xl p-3.5 transition-all text-xs">
              <summary className="cursor-pointer font-semibold text-slate-600 hover:text-slate-900 list-none flex items-center justify-between select-none">
                <span className="flex items-center gap-1.5">
                  <Sliders className="w-3.5 h-3.5 text-slate-400" />
                  Optional: Special instructions or mobile number
                </span>
                <span className="text-slate-400 text-xs font-mono group-open:rotate-45 transition-transform">+</span>
              </summary>
              <div className="mt-3 pt-3 border-t border-slate-200/60 space-y-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">
                    Mobile Number (Optional)
                  </label>
                  <input
                    type="tel"
                    maxLength={10}
                    value={customerPhone === "Walk-in" ? "" : customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value.replace(/\D/g, "") || "Walk-in")}
                    placeholder="Enter 10-digit number for SMS receipt"
                    className="w-full px-3 py-2 text-xs font-mono border border-slate-300 rounded-xl outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">
                    Special Instructions (Optional)
                  </label>
                  <textarea
                    rows={2}
                    value={customerNote}
                    onChange={(e) => setCustomerNote(e.target.value)}
                    placeholder="e.g. Please staple top left corner, print on thick paper..."
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl outline-none focus:border-indigo-500 resize-none"
                  />
                </div>
              </div>
            </details>

            <div className="pt-2">
              <button
                type="button"
                onClick={handleNextStep}
                disabled={!isFilesValid}
                className="w-full py-4 px-6 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-200 disabled:text-slate-400 text-white font-bold rounded-2xl shadow-lg shadow-indigo-600/20 active:scale-[0.99] transition-all flex items-center justify-center gap-2 text-sm sm:text-base cursor-pointer disabled:cursor-not-allowed"
              >
                <span>{language === "hi" ? "प्रिंटर और सेटिंग्स चुनें" : "Select Printer & Print Options"}</span>
                <ArrowRight className="w-4 h-4" />
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
                    className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
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

            {/* Selected File Settings Card */}
            {(() => {
              const currentFile = files[activeFileIndex] || files[0];
              const fileCost = calculateFileCost(currentFile, pricing);

              return (
                <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-xs space-y-6">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                    <div>
                      <span className="text-xs font-bold text-indigo-600 uppercase tracking-wider">
                        {t.file_options_header} {activeFileIndex + 1} of {files.length}
                      </span>
                      <h3 className="text-base font-bold text-slate-900 truncate max-w-sm sm:max-w-md mt-0.5">
                        {currentFile.file_name}
                      </h3>
                      <p className="text-xs text-slate-500">
                        {currentFile.page_count} pages detected
                      </p>
                    </div>

                    <div className="text-right">
                      <span className="text-xs text-slate-400 block">{t.estimated_cost}</span>
                      <span className="text-xl font-black text-indigo-600">
                        ₹{fileCost.toFixed(2)}
                      </span>
                    </div>
                  </div>

                  <div className="space-y-5">
                    {/* Color Mode Selection */}
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                        {t.color_mode}
                      </label>
                      <div className="grid grid-cols-2 gap-3">
                        <button
                          type="button"
                          onClick={() => updateFileOption(activeFileIndex, { color_mode: "bw" })}
                          className={`p-3.5 rounded-2xl border text-left transition-all ${
                            currentFile.color_mode === "bw"
                              ? "border-indigo-600 bg-indigo-50/50 ring-2 ring-indigo-500/20 font-bold text-slate-900"
                              : "border-slate-200 text-slate-600 hover:bg-slate-50"
                          }`}
                        >
                          <div className="text-sm font-semibold">{t.bw_label} (₹{pricing.bw_page}/page)</div>
                          <div className="text-xs text-slate-500 mt-0.5">Standard documents & text</div>
                        </button>

                        <button
                          type="button"
                          onClick={() => updateFileOption(activeFileIndex, { color_mode: "color" })}
                          className={`p-3.5 rounded-2xl border text-left transition-all ${
                            currentFile.color_mode === "color"
                              ? "border-purple-600 bg-purple-50/50 ring-2 ring-purple-500/20 font-bold text-slate-900"
                              : "border-slate-200 text-slate-600 hover:bg-slate-50"
                          }`}
                        >
                          <div className="text-sm font-semibold">{t.color_label} (₹{pricing.color_page}/page)</div>
                          <div className="text-xs text-slate-500 mt-0.5">Color photos, charts & slides</div>
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
                        onSelectPrinter={(pid) => updateFileOption(activeFileIndex, { printer_id: pid })}
                        onRefresh={fetchLivePrinters}
                        isRefreshing={isRefreshingPrinters}
                      />
                    </div>

                    {/* Copies & Page Range */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
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
                            className="w-10 h-10 border border-slate-300 rounded-l-xl bg-slate-50 hover:bg-slate-100 flex items-center justify-center font-bold text-slate-700"
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
                            className="w-16 h-10 border-y border-slate-300 text-center font-bold text-slate-800 outline-none"
                          />
                          <button
                            type="button"
                            onClick={() =>
                              updateFileOption(activeFileIndex, {
                                copies: currentFile.copies + 1,
                              })
                            }
                            className="w-10 h-10 border border-slate-300 rounded-r-xl bg-slate-50 hover:bg-slate-100 flex items-center justify-center font-bold text-slate-700"
                          >
                            +
                          </button>
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
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
                          className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                        />
                        <p className="text-[11px] text-slate-400 mt-1">
                          Printing {currentFile.effective_pages} of {currentFile.page_count} pages
                        </p>
                      </div>
                    </div>

                    {/* Paper Size & Sides */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                          {t.paper_size_label}
                        </label>
                        <select
                          value={currentFile.paper_size}
                          onChange={(e) =>
                            updateFileOption(activeFileIndex, {
                              paper_size: e.target.value as PaperSize,
                            })
                          }
                          className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none bg-white"
                        >
                          <option value="A4">A4 (Standard 210 x 297 mm)</option>
                          <option value="Legal">Legal (216 x 356 mm)</option>
                          <option value="Letter">Letter (216 x 279 mm)</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                          {t.duplex_label}
                        </label>
                        <div className="grid grid-cols-2 gap-2">
                          <button
                            type="button"
                            onClick={() => updateFileOption(activeFileIndex, { duplex: "single" })}
                            className={`py-2 px-3 text-xs rounded-xl border font-semibold transition-all ${
                              currentFile.duplex === "single"
                                ? "border-indigo-600 bg-indigo-50 text-indigo-700"
                                : "border-slate-200 text-slate-600 hover:bg-slate-50"
                            }`}
                          >
                            {t.single_sided}
                          </button>
                          <button
                            type="button"
                            onClick={() => updateFileOption(activeFileIndex, { duplex: "double" })}
                            className={`py-2 px-3 text-xs rounded-xl border font-semibold transition-all ${
                              currentFile.duplex === "double"
                                ? "border-indigo-600 bg-indigo-50 text-indigo-700"
                                : "border-slate-200 text-slate-600 hover:bg-slate-50"
                            }`}
                          >
                            {t.double_sided}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Estimated Total Bar */}
                  <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 flex items-center justify-between">
                    <div>
                      <span className="text-xs font-bold text-slate-700">
                        Total Amount ({files.length} document{files.length > 1 ? "s" : ""})
                      </span>
                      <div className="text-[11px] text-slate-500 mt-0.5">
                        {files.reduce((acc, f) => acc + (f.effective_pages * f.copies), 0)} total pages to print
                      </div>
                    </div>
                    <div className="text-2xl font-black text-indigo-600">
                      ₹{total.toFixed(2)}
                    </div>
                  </div>

                  <div className="flex gap-3 pt-2">
                    <button
                      type="button"
                      onClick={handlePrevStep}
                      className="px-5 py-3.5 border border-slate-300 hover:bg-slate-50 text-slate-700 font-bold rounded-2xl transition-colors flex items-center gap-1.5 text-sm"
                    >
                      <ArrowLeft className="w-4 h-4" />
                      <span>Back to Files</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleNextStep}
                      className="flex-1 py-3.5 px-6 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-2xl shadow-lg shadow-indigo-600/20 active:scale-[0.99] transition-all flex items-center justify-center gap-2 text-sm sm:text-base cursor-pointer"
                    >
                      <span>Proceed to Payment (₹{total.toFixed(2)})</span>
                      <ArrowRight className="w-4 h-4" />
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
            <div className="bg-white border border-slate-200 rounded-2xl p-4 flex items-center justify-between shadow-2xs">
              <div className="min-w-0 pr-3">
                <span className="text-xs font-bold text-slate-800 block">
                  {files.length} document{files.length > 1 ? "s" : ""} ready to print
                </span>
                <span className="text-[11px] text-slate-500 truncate block mt-0.5">
                  {files.map((f) => f.file_name).join(", ")}
                </span>
              </div>
              <div className="text-right shrink-0">
                <span className="text-[11px] text-slate-400 block uppercase font-bold">Total</span>
                <span className="text-xl font-black text-indigo-600">
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
            />

            <div className="pt-2 text-center">
              <button
                type="button"
                onClick={handlePrevStep}
                disabled={isSubmitting}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800 transition-colors"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Back to Printer & Options</span>
              </button>
            </div>
          </div>
        )}

        {/* Track Existing Order Footer Section */}
        <div className="mt-10 pt-6 border-t border-slate-200/80 text-center">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
            Already Placed an Order?
          </p>
          <div className="max-w-xs mx-auto flex items-center gap-2">
            <input
              type="text"
              value={trackTokenInput}
              onChange={(e) => setTrackTokenInput(e.target.value)}
              placeholder="Enter Order # (e.g. PC-1001)"
              className="flex-1 px-3 py-2 text-xs border border-slate-300 rounded-xl outline-none focus:border-indigo-500 uppercase font-mono"
            />
            <button
              type="button"
              onClick={() => {
                if (trackTokenInput.trim()) {
                  router.push(`/order/${trackTokenInput.trim()}`);
                }
              }}
              className="px-3.5 py-2 bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold rounded-xl transition-colors shrink-0"
            >
              Track
            </button>
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
