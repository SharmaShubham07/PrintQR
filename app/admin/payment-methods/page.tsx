"use client";

import React, { useState, useEffect } from "react";
import AdminSidebar from "@/components/AdminSidebar";
import AdminHeader from "@/components/AdminHeader";
import { 
  CreditCard, 
  Save, 
  Check, 
  Smartphone, 
  ExternalLink, 
  ShieldCheck, 
  Lock, 
  Zap, 
  Building2, 
  Wallet, 
  CheckCircle2, 
  AlertCircle,
  QrCode,
  Banknote
} from "lucide-react";
import Link from "next/link";

export default function AdminPaymentMethodsPage() {
  const [payeeName, setPayeeName] = useState("Preeti Communication");
  const [upiId, setUpiId] = useState("jkbmerc00757954@jkb");
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const razorpayKeyId = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || "rzp_live_Tn2aA8EXZT9cMp";
  const maskedKeyId = razorpayKeyId.length > 8 
    ? `${razorpayKeyId.slice(0, 8)}••••••••${razorpayKeyId.slice(-4)}`
    : razorpayKeyId;

  const loadData = async () => {
    try {
      const res = await fetch("/api/admin/payment-methods");
      const data = await res.json();
      if (data.success && data.primary) {
        if (data.primary.payee_name) setPayeeName(data.primary.payee_name);
        if (data.primary.upi_id && data.primary.upi_id !== "razorpay") {
          setUpiId(data.primary.upi_id);
        }
      }
    } catch (err) {
      console.error("Error loading payment configuration:", err);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setErrorMsg(null);
    try {
      const res = await fetch("/api/admin/payment-methods", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: "33333333-3333-3333-3333-333333333333",
          type: "upi",
          upi_id: upiId.trim(),
          payee_name: payeeName.trim(),
          is_active: true,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to save payment configuration");
      }

      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (err: any) {
      console.error("Error saving payment method:", err);
      setErrorMsg(err.message || "Failed to save payment settings");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-slate-100">
      <AdminSidebar isAgentOnline={true} />

      <div className="flex-1 flex flex-col min-w-0">
        <AdminHeader
          title="Payment Gateway & QR Management"
          subtitle="Configure Razorpay online payments and shop counter UPI QR code"
        />

        <main className="p-6 max-w-4xl space-y-6 flex-1 overflow-y-auto">
          {saved && (
            <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 p-4 rounded-2xl flex items-center gap-2 text-sm font-semibold animate-in fade-in">
              <Check className="w-5 h-5 text-emerald-600" />
              <span>Payment configuration updated successfully! Customer site is now synced.</span>
            </div>
          )}

          {errorMsg && (
            <div className="bg-rose-50 border border-rose-200 text-rose-800 p-4 rounded-2xl flex items-center gap-2 text-sm font-semibold animate-in fade-in">
              <AlertCircle className="w-5 h-5 text-rose-600" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Active Gateway Status Card */}
          <div className="bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 rounded-3xl p-6 sm:p-8 text-white border border-indigo-500/30 shadow-xl space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-6">
              <div className="flex items-center gap-3.5">
                <div className="w-12 h-12 rounded-2xl bg-indigo-600/40 border border-indigo-400/40 flex items-center justify-center shrink-0">
                  <CreditCard className="w-6 h-6 text-indigo-300" />
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="text-xl font-black text-white">Razorpay & UPI Payments</h2>
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                      Multi-Channel Active
                    </span>
                  </div>
                  <p className="text-xs text-slate-300 mt-1">
                    Customers can pay securely via Razorpay (Cards, UPI, Netbanking) or scan the counter UPI QR.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Link
                  href="/test-razorpay"
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-md shadow-indigo-600/30 transition-all whitespace-nowrap"
                >
                  <Zap className="w-3.5 h-3.5" />
                  <span>Test Gateway</span>
                </Link>

                <a
                  href="https://dashboard.razorpay.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 border border-white/15 transition-all whitespace-nowrap"
                >
                  <span>Merchant Portal</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
            </div>

            {/* Gateway Key Information */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-white/5 border border-white/10 rounded-2xl p-4">
                <span className="text-[11px] font-bold uppercase text-slate-400 block mb-1">
                  Razorpay Key ID
                </span>
                <span className="font-mono text-xs font-bold text-indigo-200 break-all block">
                  {maskedKeyId}
                </span>
              </div>

              <div className="bg-white/5 border border-white/10 rounded-2xl p-4">
                <span className="text-[11px] font-bold uppercase text-slate-400 block mb-1">
                  Secret Key
                </span>
                <span className="text-xs font-bold text-emerald-300 flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5" />
                  Configured Securely on Server
                </span>
              </div>

              <div className="bg-white/5 border border-white/10 rounded-2xl p-4">
                <span className="text-[11px] font-bold uppercase text-slate-400 block mb-1">
                  Signature Verification
                </span>
                <span className="text-xs font-bold text-emerald-300 flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  HMAC-SHA256 Active
                </span>
              </div>
            </div>
          </div>

          {/* Form to update business name and UPI ID */}
          <form onSubmit={handleSave} className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-xs space-y-5">
            <div>
              <h3 className="text-base font-bold text-slate-900">
                Shop Payment & QR Configuration
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                These settings update the customer checkout page and the shop counter poster instantly.
              </p>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Shop Payee / Business Name
                </label>
                <input
                  type="text"
                  required
                  value={payeeName}
                  onChange={(e) => setPayeeName(e.target.value)}
                  placeholder="e.g. Preeti Communication"
                  className="w-full px-4 py-3 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none font-semibold"
                />
                <p className="text-[11px] text-slate-400 mt-1">
                  Shown to customer on payment modals and receipts
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Shop UPI ID (For Direct Scan QR)
                </label>
                <input
                  type="text"
                  required
                  value={upiId}
                  onChange={(e) => setUpiId(e.target.value)}
                  placeholder="e.g. jkbmerc00757954@jkb"
                  className="w-full px-4 py-3 text-sm font-mono border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none font-semibold"
                />
                <p className="text-[11px] text-slate-400 mt-1">
                  Used to generate dynamic UPI QR for GPay, PhonePe, Paytm
                </p>
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="submit"
                disabled={saving}
                className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-2xl shadow-md shadow-indigo-600/20 active:scale-[0.99] transition-all flex items-center gap-2 text-sm cursor-pointer disabled:opacity-60"
              >
                <Save className="w-4 h-4" />
                <span>{saving ? "Saving..." : "Save Payment Settings"}</span>
              </button>
            </div>
          </form>
        </main>
      </div>
    </div>
  );
}
