"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Navbar from "@/components/Navbar";
import FileUploader from "@/components/FileUploader";
import PrinterSelector, { DEFAULT_PRINTERS } from "@/components/PrinterSelector";
import OrderSummary from "@/components/OrderSummary";
import PaymentSection, { DEFAULT_PAYMENT_METHOD } from "@/components/PaymentSection";
import { Language, OrderFileItem, ColorMode, DuplexMode, PaperSize, PaymentMethod } from "@/lib/types";
import { supabase } from "@/lib/supabase";
import { translations } from "@/lib/translations";
import { calculateEffectivePages } from "@/lib/pdf-utils";
import { calculateFileCost, calculateOrderTotal, DEFAULT_PRICING } from "@/lib/price-calculator";
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

  // Wizard state: 1: Details, 2: Upload, 3: Options, 4: Summary, 5: Payment
  const [currentStep, setCurrentStep] = useState<number>(1);

  // Customer info
  const [customerName, setCustomerName] = useState<string>("");
  const [customerPhone, setCustomerPhone] = useState<string>("");
  const [customerNote, setCustomerNote] = useState<string>("");

  // Files
  const [files, setFiles] = useState<OrderFileItem[]>([]);
  const [activeFileIndex, setActiveFileIndex] = useState<number>(0);

  // Tracking existing order
  const [trackTokenInput, setTrackTokenInput] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Shop settings & payment method state
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(DEFAULT_PAYMENT_METHOD);
  const [isShopClosed, setIsShopClosed] = useState<boolean>(false);

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
      } catch (err) {
        console.error("Error loading shop config:", err);
      }
    }
    loadShopConfig();
  }, []);

  // Validation
  const isDetailsValid = customerName.trim().length >= 2 && /^\d{10}$/.test(customerPhone.trim());
  const isFilesValid = files.length > 0;

  // Handler for options per file
  const updateFileOption = (
    index: number,
    updates: Partial<OrderFileItem>
  ) => {
    const updated = [...files];
    const target = { ...updated[index], ...updates };

    // If color mode changed to color, ensure printer is not Canon MF3010
    if (updates.color_mode === "color") {
      const brotherPrinter = DEFAULT_PRINTERS.find(p => p.type === "both");
      if (brotherPrinter) {
        target.printer_id = brotherPrinter.id;
      }
    }

    if (updates.page_range !== undefined || updates.page_count !== undefined) {
      target.effective_pages = calculateEffectivePages(
        target.page_range,
        target.page_count
      );
    }

    target.price = calculateFileCost(target, DEFAULT_PRICING);
    updated[index] = target;
    setFiles(updated);
  };

  const handleNextStep = () => {
    setErrorMsg(null);
    if (currentStep === 1) {
      if (!isDetailsValid) {
        setErrorMsg("Please enter a valid Name and 10-digit Mobile Number.");
        return;
      }
      setCurrentStep(2);
    } else if (currentStep === 2) {
      if (!isFilesValid) {
        setErrorMsg(t.no_files_uploaded);
        return;
      }
      // Initialize default printer for files if unset
      const updated = files.map(f => {
        if (!f.printer_id) {
          return {
            ...f,
            printer_id: f.color_mode === "color" 
              ? "22222222-2222-2222-2222-222222222222" // Brother
              : "11111111-1111-1111-1111-111111111111", // Canon
          };
        }
        return f;
      });
      setFiles(updated);
      setCurrentStep(3);
    } else if (currentStep === 3) {
      setCurrentStep(4);
    } else if (currentStep === 4) {
      setCurrentStep(5);
    }
  };

  const handlePrevStep = () => {
    setErrorMsg(null);
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  // Submit payment & create order
  const handlePaymentSubmit = async (utr: string, screenshot?: File) => {
    setIsSubmitting(true);
    setErrorMsg(null);

    try {
      const formData = new FormData();
      formData.append("customer_name", customerName.trim());
      formData.append("customer_phone", customerPhone.trim());
      formData.append("customer_note", customerNote.trim());
      formData.append("utr_number", utr.trim());

      const filesMetadata = files.map((f, i) => ({
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
        price: f.price,
      }));

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

  const { total } = calculateOrderTotal(files, DEFAULT_PRICING);

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

        {/* Stepper Progress Bar */}
        <div className="bg-white border border-slate-200 rounded-2xl p-3 sm:p-4 shadow-xs">
          <div className="flex items-center justify-between">
            {[
              { num: 1, label: t.step_details },
              { num: 2, label: t.step_upload },
              { num: 3, label: t.step_options },
              { num: 4, label: t.step_summary },
              { num: 5, label: t.step_payment },
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
                    {isPast ? "?" : step.num}
                  </div>
                  <span
                    className={`mt-1.5 text-[10px] sm:text-xs font-medium text-center truncate max-w-[60px] sm:max-w-[80px] ${
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

        {/* STEP 1: CUSTOMER DETAILS */}
        {currentStep === 1 && (
          <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-xs space-y-5 animate-in fade-in duration-200">
            <div>
              <h2 className="text-lg font-bold text-slate-900">
                {t.cust_details_title}
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                {t.cust_details_sub}
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  {t.name_label} <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <User className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    required
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    placeholder={t.name_placeholder}
                    className="w-full pl-10 pr-4 py-3 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  {t.phone_label} <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <Phone className="w-4 h-4" />
                  </div>
                  <input
                    type="tel"
                    required
                    maxLength={10}
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value.replace(/\D/g, ""))}
                    placeholder={t.phone_placeholder}
                    className="w-full pl-10 pr-4 py-3 text-sm font-mono border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                  />
                </div>
                <p className="text-[11px] text-slate-400 mt-1">
                  Used by the shopkeeper to announce your print order at the counter
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  {t.note_label}
                </label>
                <textarea
                  rows={2}
                  value={customerNote}
                  onChange={(e) => setCustomerNote(e.target.value)}
                  placeholder={t.note_placeholder}
                  className="w-full px-4 py-2.5 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none resize-none"
                />
              </div>
            </div>

            <div className="pt-2">
              <button
                type="button"
                onClick={handleNextStep}
                disabled={!isDetailsValid}
                className="w-full py-3.5 px-6 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-200 disabled:text-slate-400 text-white font-bold rounded-2xl shadow-md shadow-indigo-600/20 active:scale-[0.99] transition-all flex items-center justify-center gap-2 text-sm sm:text-base"
              >
                <span>{t.continue_btn}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* STEP 2: UPLOAD FILES */}
        {currentStep === 2 && (
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
            />

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={handlePrevStep}
                className="px-5 py-3.5 border border-slate-300 hover:bg-slate-50 text-slate-700 font-bold rounded-2xl transition-colors flex items-center gap-1.5 text-sm"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Back</span>
              </button>
              <button
                type="button"
                onClick={handleNextStep}
                disabled={!isFilesValid}
                className="flex-1 py-3.5 px-6 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-200 disabled:text-slate-400 text-white font-bold rounded-2xl shadow-md shadow-indigo-600/20 active:scale-[0.99] transition-all flex items-center justify-center gap-2 text-sm sm:text-base"
              >
                <span>{t.continue_to_options}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* STEP 3: OPTIONS PER FILE */}
        {currentStep === 3 && files.length > 0 && (
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
              const fileCost = calculateFileCost(currentFile, DEFAULT_PRICING);

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
                        ?{fileCost.toFixed(2)}
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
                          <div className="text-sm font-semibold">{t.bw_label}</div>
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
                          <div className="text-sm font-semibold">{t.color_label}</div>
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
                        onSelectPrinter={(pid) => updateFileOption(activeFileIndex, { printer_id: pid })}
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

                  <div className="flex gap-3 pt-4 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={handlePrevStep}
                      className="px-5 py-3 border border-slate-300 hover:bg-slate-50 text-slate-700 font-bold rounded-2xl transition-colors flex items-center gap-1.5 text-sm"
                    >
                      <ArrowLeft className="w-4 h-4" />
                      <span>Back</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleNextStep}
                      className="flex-1 py-3 px-6 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-2xl shadow-md shadow-indigo-600/20 active:scale-[0.99] transition-all flex items-center justify-center gap-2 text-sm sm:text-base"
                    >
                      <span>{t.continue_to_summary}</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })()}
          </div>
        )}

        {/* STEP 4: SUMMARY */}
        {currentStep === 4 && (
          <div className="space-y-6 animate-in fade-in duration-200">
            <OrderSummary
              files={files}
              pricing={DEFAULT_PRICING}
              language={language}
            />

            <div className="flex gap-3">
              <button
                type="button"
                onClick={handlePrevStep}
                className="px-5 py-3.5 border border-slate-300 hover:bg-slate-50 text-slate-700 font-bold rounded-2xl transition-colors flex items-center gap-1.5 text-sm"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>{t.back_to_options}</span>
              </button>
              <button
                type="button"
                onClick={handleNextStep}
                className="flex-1 py-3.5 px-6 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-2xl shadow-lg shadow-indigo-600/20 active:scale-[0.99] transition-all flex items-center justify-center gap-2 text-sm sm:text-base"
              >
                <span>{t.proceed_to_payment}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* STEP 5: UPI PAYMENT */}
        {currentStep === 5 && (
          <div className="animate-in fade-in duration-200">
            <PaymentSection
              amount={total}
              orderNumber="PREVIEW"
              paymentMethod={paymentMethod}
              language={language}
              onSubmitPayment={handlePaymentSubmit}
              isSubmitting={isSubmitting}
            />
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
