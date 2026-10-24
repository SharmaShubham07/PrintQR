"use client";

import React, { useRef, useState } from "react";
import { OrderFileItem, Language } from "@/lib/types";
import { translations } from "@/lib/translations";
import { detectFilePageCount, calculateEffectivePages } from "@/lib/pdf-utils";
import { calculateFileCost, PricingConfig } from "@/lib/price-calculator";
import { 
  UploadCloud, 
  FileText, 
  Image as ImageIcon, 
  Trash2, 
  Edit3, 
  AlertCircle, 
  CheckCircle2, 
  Plus, 
  FileCode 
} from "lucide-react";

interface Props {
  files: OrderFileItem[];
  onChange: (files: OrderFileItem[]) => void;
  language: Language;
  maxSizeMb?: number;
  pricing?: PricingConfig;
}

export default function FileUploader({ files, onChange, language, maxSizeMb = 25, pricing }: Props) {
  const t = translations[language];
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [editingFileIndex, setEditingFileIndex] = useState<number | null>(null);
  const [manualPagesInput, setManualPagesInput] = useState<string>("1");
  const [errorNotice, setErrorNotice] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const processFiles = async (fileList: FileList | File[]) => {
    setErrorNotice(null);
    setIsProcessing(true);
    const newItems: OrderFileItem[] = [...files];

    for (let i = 0; i < fileList.length; i++) {
      const file = fileList[i];
      const sizeMb = file.size / (1024 * 1024);

      if (sizeMb > maxSizeMb) {
        setErrorNotice(`File "${file.name}" exceeds the maximum allowed size of ${maxSizeMb} MB.`);
        continue;
      }

      const ext = file.name.split(".").pop()?.toLowerCase() || "";
      const allowed = ["pdf", "jpg", "jpeg", "png", "webp", "docx", "pptx"];
      if (!allowed.includes(ext)) {
        setErrorNotice(`File "${file.name}" has an unsupported format. Supported: PDF, JPG, PNG, DOCX, PPTX.`);
        continue;
      }

      // Detect pages
      const { pages, canAutoDetect } = await detectFilePageCount(file);

      const newItem: OrderFileItem = {
        file,
        file_name: file.name,
        file_type: file.type || ext,
        file_size: file.size,
        page_count: pages,
        manual_page_override: !canAutoDetect,
        copies: 1,
        color_mode: "bw",
        paper_size: "A4",
        duplex: "single",
        page_range: "all",
        effective_pages: pages,
        price: calculateFileCost({
          effective_pages: pages,
          copies: 1,
          color_mode: "bw",
          duplex: "single",
        }, pricing),
      };

      newItems.push(newItem);
    }

    onChange(newItems);
    setIsProcessing(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processFiles(e.dataTransfer.files);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      processFiles(e.target.files);
    }
  };

  const removeFile = (index: number) => {
    const updated = files.filter((_, i) => i !== index);
    onChange(updated);
  };

  const openEditPages = (index: number) => {
    setEditingFileIndex(index);
    setManualPagesInput(String(files[index].page_count));
  };

  const saveEditedPages = () => {
    if (editingFileIndex === null) return;
    const parsed = parseInt(manualPagesInput, 10);
    if (isNaN(parsed) || parsed < 1) {
      alert("Please enter a valid page count (at least 1).");
      return;
    }

    const updated = [...files];
    const target = updated[editingFileIndex];
    target.page_count = parsed;
    target.manual_page_override = true;
    target.effective_pages = calculateEffectivePages(target.page_range, parsed);
    target.price = calculateFileCost(target, pricing);

    onChange(updated);
    setEditingFileIndex(null);
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024 * 1024) {
      return `${(bytes / 1024).toFixed(1)} KB`;
    }
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  return (
    <div className="space-y-4">
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept=".pdf,.jpg,.jpeg,.png,.docx,.pptx"
        className="hidden"
        onChange={handleFileSelect}
      />

      {/* Modern Drag & Drop Area */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`relative border-2 border-dashed rounded-3xl p-8 sm:p-10 text-center cursor-pointer transition-all duration-200 group ${
          isDragging
            ? "border-indigo-500 bg-indigo-50/60 scale-[0.99] shadow-md"
            : "border-slate-300 hover:border-indigo-400 bg-slate-50/60 hover:bg-indigo-50/30 hover:shadow-sm"
        }`}
      >
        <div className="w-16 h-16 mx-auto rounded-2xl bg-gradient-to-tr from-indigo-500/10 to-violet-500/10 text-indigo-600 border border-indigo-200/80 flex items-center justify-center mb-3.5 group-hover:scale-105 transition-all shadow-xs">
          <UploadCloud className="w-8 h-8 stroke-[2.2]" />
        </div>
        <h4 className="font-extrabold text-slate-900 text-lg sm:text-xl mb-1 tracking-tight">
          Drop your files here, or <span className="text-indigo-600 underline underline-offset-4 decoration-indigo-400">tap to browse</span>
        </h4>
        <p className="text-xs sm:text-sm text-slate-500 font-medium mb-3.5 max-w-md mx-auto">
          College notes, assignments, reports, presentation slides or photos
        </p>
        
        {/* Modern Format Chips */}
        <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-white border border-slate-200/90 text-slate-700 shadow-xs">📄 PDF</span>
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-white border border-slate-200/90 text-slate-700 shadow-xs">📸 JPG / PNG</span>
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-white border border-slate-200/90 text-slate-700 shadow-xs">📝 DOCX / PPTX</span>
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-indigo-50 border border-indigo-200 text-indigo-700 shadow-xs">📦 Up to 25MB</span>
        </div>
      </div>

      {errorNotice && (
        <div className="flex items-center gap-2.5 p-4 text-xs sm:text-sm font-semibold text-rose-800 bg-rose-50 border border-rose-200 rounded-2xl shadow-xs">
          <AlertCircle className="w-4 h-4 shrink-0 text-rose-600 stroke-[2.5]" />
          <span>{errorNotice}</span>
        </div>
      )}

      {isProcessing && (
        <div className="flex items-center justify-center gap-2 p-4 text-sm font-bold text-indigo-900 bg-indigo-50 border border-indigo-200 rounded-2xl shadow-xs animate-pulse">
          <span>✨ Scanning document &amp; detecting pages...</span>
        </div>
      )}

      {/* Uploaded Files List */}
      {files.length > 0 && (
        <div className="space-y-3 pt-2">
          <div className="flex items-center justify-between px-1">
            <span className="text-xs font-bold text-slate-600 uppercase tracking-wider flex items-center gap-1.5">
              <span>Ready to Print ({files.length})</span>
            </span>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 transition-colors cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
              <span>Add More Files</span>
            </button>
          </div>

          <div className="space-y-2.5">
            {files.map((file, idx) => {
              const isPdf = file.file_name.toLowerCase().endsWith(".pdf");
              const isImage = ["jpg", "jpeg", "png", "webp"].some((e) =>
                file.file_name.toLowerCase().endsWith(e)
              );

              return (
                <div
                  key={idx}
                  className="bg-white border border-slate-200/90 rounded-2xl p-4 flex items-center justify-between gap-3 shadow-xs hover:border-indigo-300 hover:shadow-md transition-all"
                >
                  <div className="flex items-center gap-3.5 min-w-0">
                    <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center shrink-0 text-slate-600">
                      {isPdf ? (
                        <FileText className="w-5 h-5 text-rose-500" />
                      ) : isImage ? (
                        <ImageIcon className="w-5 h-5 text-sky-500" />
                      ) : (
                        <FileCode className="w-5 h-5 text-amber-500" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="font-bold text-slate-800 text-sm truncate">
                        {file.file_name}
                      </p>
                      <div className="flex items-center gap-2 text-xs text-slate-500 mt-0.5">
                        <span>{formatFileSize(file.file_size)}</span>
                        <span>•</span>
                        <span className="font-semibold text-slate-700 bg-slate-100 px-2 py-0.5 rounded-md">
                          {file.page_count} {file.page_count === 1 ? "page" : "pages"}
                        </span>
                        {file.manual_page_override && (
                          <span className="text-[10px] font-semibold text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">
                            Customized
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => openEditPages(idx)}
                      className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-colors cursor-pointer"
                      title={t.override_pages}
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => removeFile(idx)}
                      className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors cursor-pointer"
                      title="Remove file"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Manual Page Count Override Modal */}
      {editingFileIndex !== null && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl border border-slate-100 animate-in fade-in zoom-in-95 duration-150">
            <h3 className="text-base font-bold text-slate-900 mb-1">
              {t.override_pages}
            </h3>
            <p className="text-xs text-slate-500 mb-4 truncate">
              {files[editingFileIndex].file_name}
            </p>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Total document pages to bill:
                </label>
                <input
                  type="number"
                  min="1"
                  max="1000"
                  value={manualPagesInput}
                  onChange={(e) => setManualPagesInput(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingFileIndex(null)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
                >
                  {t.cancel}
                </button>
                <button
                  type="button"
                  onClick={saveEditedPages}
                  className="px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-sm transition-colors"
                >
                  {t.save}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
