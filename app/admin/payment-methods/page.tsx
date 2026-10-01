"use client";

import React, { useState, useEffect } from "react";
import AdminSidebar from "@/components/AdminSidebar";
import AdminHeader from "@/components/AdminHeader";
import { QrCode, Save, Check, Upload, Smartphone, ExternalLink, ShieldCheck, Phone } from "lucide-react";
import { supabase } from "@/lib/supabase";

export default function AdminPaymentMethodsPage() {
  const [upiId, setUpiId] = useState("jkbmerc00757954@jkb");
  const [payeeName, setPayeeName] = useState("Preeti Communication");
  const [upiPhone, setUpiPhone] = useState("9055143328");
  const [staticQrUrl, setStaticQrUrl] = useState<string | null>("/payment-qr.png");
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function loadData() {
      try {
        const { data: pm } = await supabase
          .from("payment_methods")
          .select("*")
          .limit(1)
          .maybeSingle();

        if (pm) {
          setUpiId(pm.upi_id || "jkbmerc00757954@jkb");
          setPayeeName(pm.payee_name || "Preeti Communication");
          if (pm.static_qr_url) setStaticQrUrl(pm.static_qr_url);
        }

        const { data: set } = await supabase
          .from("settings")
          .select("value")
          .eq("key", "shop_info")
          .maybeSingle();

        if (set?.value?.upi_number) {
          setUpiPhone(set.value.upi_number);
        }
      } catch (err) {
        console.error("Error loading payment methods:", err);
      }
    }
    loadData();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await supabase
        .from("payment_methods")
        .upsert({
          id: "33333333-3333-3333-3333-333333333333",
          type: "upi",
          upi_id: upiId.trim(),
          payee_name: payeeName.trim(),
          static_qr_url: staticQrUrl,
          is_active: true,
          updated_at: new Date().toISOString()
        });

      const { data: set } = await supabase
        .from("settings")
        .select("value")
        .eq("key", "shop_info")
        .maybeSingle();

      if (set?.value) {
        await supabase
          .from("settings")
          .upsert({
            key: "shop_info",
            value: { ...set.value, upi_number: upiPhone.trim() },
            updated_at: new Date().toISOString()
          });
      }

      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (err) {
      console.error("Error saving payment method:", err);
    } finally {
      setSaving(false);
    }
  };

  const handleStaticQrUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const url = URL.createObjectURL(file);
      setStaticQrUrl(url);
    }
  };

  return (
    <div className="flex min-h-screen bg-slate-100">
      <AdminSidebar isAgentOnline={true} />

      <div className="flex-1 flex flex-col min-w-0">
        <AdminHeader
          title="UPI & Payment QR Management"
          subtitle="Configure UPI receiver credentials, dynamic QR code generation, and counter posters"
        />

        <main className="p-6 max-w-3xl space-y-6 flex-1 overflow-y-auto">
          {saved && (
            <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 p-4 rounded-2xl flex items-center gap-2 text-sm font-semibold animate-in fade-in">
              <Check className="w-5 h-5 text-emerald-600" />
              <span>UPI settings updated! Customers will now pay using these credentials.</span>
            </div>
          )}

          <form onSubmit={handleSave} className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-xs space-y-6">
            <div className="border-b border-slate-100 pb-4">
              <h2 className="text-base font-bold text-slate-900">Active UPI Credentials</h2>
              <p className="text-xs text-slate-500">
                These credentials generate the deep links and dynamic QR codes for customers
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  UPI ID (VPA) <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <Smartphone className="w-4 h-4" />
                  </span>
                  <input
                    type="text"
                    required
                    value={upiId}
                    onChange={(e) => setUpiId(e.target.value)}
                    placeholder="e.g. preeti.communication@upi"
                    className="w-full pl-10 pr-4 py-3 text-sm font-mono border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                </div>
                <p className="text-[11px] text-slate-400 mt-1">
                  Supported by PhonePe, Google Pay, BHIM, Paytm, and all banking apps
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Shop / Payee Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={payeeName}
                  onChange={(e) => setPayeeName(e.target.value)}
                  placeholder="e.g. Preeti Communication"
                  className="w-full px-4 py-3 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                />
                <p className="text-[11px] text-slate-400 mt-1">
                  Displays on customer&apos;s phone screen when UPI app opens
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  UPI Mobile Number (for direct GPay / PhonePe payment)
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <Phone className="w-4 h-4" />
                  </span>
                  <input
                    type="text"
                    value={upiPhone}
                    onChange={(e) => setUpiPhone(e.target.value)}
                    placeholder="e.g. 9055143328"
                    className="w-full pl-10 pr-4 py-3 text-sm font-mono border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                </div>
                <p className="text-[11px] text-slate-400 mt-1">
                  Allows customers to send money directly to this phone number
                </p>
              </div>
            </div>

            {/* Static QR Alternative Upload */}
            <div className="border-t border-slate-100 pt-6 space-y-3">
              <h3 className="text-sm font-bold text-slate-900">Counter Physical Stand QR (Optional Fallback)</h3>
              <p className="text-xs text-slate-500">
                Upload a photo/scan of your shop counter UPI stand (e.g. PhonePe / Google Pay stand QR).
              </p>

              <div className="flex items-center gap-4">
                {staticQrUrl ? (
                  <div className="relative w-24 h-24 border rounded-xl overflow-hidden bg-slate-50 shrink-0">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={staticQrUrl} alt="Static QR" className="w-full h-full object-contain" />
                  </div>
                ) : (
                  <div className="w-24 h-24 border-2 border-dashed border-slate-300 rounded-xl flex items-center justify-center text-slate-400 shrink-0">
                    <QrCode className="w-8 h-8" />
                  </div>
                )}

                <div>
                  <label className="inline-flex items-center gap-2 px-4 py-2 border border-slate-300 hover:bg-slate-50 rounded-xl text-xs font-bold text-slate-700 cursor-pointer transition-colors">
                    <Upload className="w-4 h-4" />
                    <span>Upload QR Image</span>
                    <input type="file" accept="image/*" className="hidden" onChange={handleStaticQrUpload} />
                  </label>
                  <p className="text-[11px] text-slate-400 mt-1.5">
                    PNG, JPG or WebP up to 5 MB
                  </p>
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-100 flex justify-end">
              <button
                type="submit"
                className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-2xl shadow-md shadow-indigo-600/20 active:scale-[0.99] transition-all flex items-center gap-2 text-sm"
              >
                <Save className="w-4 h-4" />
                <span>Save Payment Settings</span>
              </button>
            </div>
          </form>
        </main>
      </div>
    </div>
  );
}
