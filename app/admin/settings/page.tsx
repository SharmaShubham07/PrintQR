"use client";

import React, { useState, useEffect } from "react";
import AdminSidebar from "@/components/AdminSidebar";
import AdminHeader from "@/components/AdminHeader";
import { Settings, Save, Check, ShieldAlert, Clock, Phone, MapPin, Trash2, Printer, Zap } from "lucide-react";
import { supabase } from "@/lib/supabase";

export default function AdminSettingsPage() {
  const [settings, setSettings] = useState({
    shop_name: "Preeti Communication",
    tagline: "Cyber Cafe, High Speed Printing & Xeroxing",
    phone: "+91 90551 43328",
    email: "preeti.communication@gmail.com",
    address: "Shop No. 4, Market Complex, Opp. Bus Station",
    working_hours: "08:00 AM - 09:30 PM (Mon-Sat)",
    is_closed: false,
    closed_notice: "Shop is currently closed for the day. Orders will resume tomorrow morning at 08:00 AM.",
    auto_print_on_payment: true,
    max_file_size_mb: 25,
    retention_days: 2,
  });

  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function loadSettings() {
      try {
        const { data: setRes } = await supabase
          .from("settings")
          .select("value")
          .eq("key", "shop_info")
          .maybeSingle();

        if (setRes?.value) {
          setSettings((prev) => ({ ...prev, ...setRes.value }));
        }
      } catch (err) {
        console.error("Error loading settings:", err);
      }
    }
    loadSettings();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await supabase
        .from("settings")
        .upsert({
          key: "shop_info",
          value: settings,
          updated_at: new Date().toISOString()
        });

      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (err) {
      console.error("Error saving settings:", err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-slate-100">
      <AdminSidebar isAgentOnline={true} />

      <div className="flex-1 flex flex-col min-w-0">
        <AdminHeader
          title="Shop & System Settings"
          subtitle="Configure business hours, emergency closure toggle, file retention, and counter information"
        />

        <main className="p-6 max-w-4xl space-y-6 flex-1 overflow-y-auto">
          {saved && (
            <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 p-4 rounded-2xl flex items-center gap-2 text-sm font-semibold animate-in fade-in">
              <Check className="w-5 h-5 text-emerald-600" />
              <span>Shop settings successfully updated!</span>
            </div>
          )}

          <form onSubmit={handleSave} className="space-y-6">
            {/* Emergency Shop Closed Toggle */}
            <div className={`border rounded-3xl p-6 transition-all ${
              settings.is_closed 
                ? "bg-rose-50 border-rose-300 ring-2 ring-rose-500/20" 
                : "bg-white border-slate-200 shadow-xs"
            }`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-11 h-11 rounded-2xl flex items-center justify-center ${
                    settings.is_closed ? "bg-rose-100 text-rose-600" : "bg-slate-100 text-slate-600"
                  }`}>
                    <ShieldAlert className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 text-base">Emergency "Shop Closed" Kill-Switch</h3>
                    <p className="text-xs text-slate-500">
                      When enabled, stops customers from placing new orders and shows your closure notice.
                    </p>
                  </div>
                </div>

                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.is_closed}
                    onChange={(e) => setSettings({ ...settings, is_closed: e.target.checked })}
                    className="sr-only peer"
                  />
                  <div className="w-12 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-rose-600"></div>
                </label>
              </div>

              {settings.is_closed && (
                <div className="mt-4 pt-4 border-t border-rose-200 space-y-2">
                  <label className="block text-xs font-bold text-rose-800 uppercase">
                    Customer Closure Notice:
                  </label>
                  <input
                    type="text"
                    value={settings.closed_notice}
                    onChange={(e) => setSettings({ ...settings, closed_notice: e.target.value })}
                    className="w-full px-3 py-2 text-xs border border-rose-300 rounded-xl outline-none focus:ring-2 focus:ring-rose-500 bg-white"
                  />
                </div>
              )}
            </div>

            {/* Auto-Print on Payment Toggle */}
            <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
                    <Printer className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
                      <span>Automatic Printing on Payment</span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                        Active
                      </span>
                    </h3>
                    <p className="text-xs text-slate-500">
                      When enabled, orders automatically dispatch to the shop printer as soon as the customer pays (bypasses manual counter confirmation).
                    </p>
                  </div>
                </div>

                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.auto_print_on_payment ?? true}
                    onChange={(e) => setSettings({ ...settings, auto_print_on_payment: e.target.checked })}
                    className="sr-only peer"
                  />
                  <div className="w-12 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                </label>
              </div>
            </div>

            {/* General Shop Info */}
            <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-xs space-y-5">
              <h3 className="text-base font-bold text-slate-900 border-b border-slate-100 pb-3">
                General Business Information
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Shop Name
                  </label>
                  <input
                    type="text"
                    value={settings.shop_name}
                    onChange={(e) => setSettings({ ...settings, shop_name: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl outline-none focus:border-indigo-500 font-semibold"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Counter Contact Phone
                  </label>
                  <input
                    type="text"
                    value={settings.phone}
                    onChange={(e) => setSettings({ ...settings, phone: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl outline-none focus:border-indigo-500 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Working Hours
                  </label>
                  <input
                    type="text"
                    value={settings.working_hours}
                    onChange={(e) => setSettings({ ...settings, working_hours: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Address / Counter Location
                  </label>
                  <input
                    type="text"
                    value={settings.address}
                    onChange={(e) => setSettings({ ...settings, address: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl outline-none focus:border-indigo-500"
                  />
                </div>
              </div>
            </div>

            {/* Storage & Security Policy */}
            <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-xs space-y-5">
              <h3 className="text-base font-bold text-slate-900 border-b border-slate-100 pb-3">
                File Storage & Privacy Rules
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Max File Upload Limit (MB)
                  </label>
                  <input
                    type="number"
                    min="5"
                    max="100"
                    value={settings.max_file_size_mb}
                    onChange={(e) => setSettings({ ...settings, max_file_size_mb: parseInt(e.target.value, 10) || 25 })}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl outline-none focus:border-indigo-500"
                  />
                  <p className="text-[11px] text-slate-400 mt-1">Default 25 MB per document</p>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Auto-Delete Customer Files After (Days)
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="30"
                    value={settings.retention_days}
                    onChange={(e) => setSettings({ ...settings, retention_days: parseInt(e.target.value, 10) || 2 })}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl outline-none focus:border-indigo-500"
                  />
                  <p className="text-[11px] text-slate-400 mt-1">
                    Protects customer privacy by purging old PDFs automatically
                  </p>
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="submit"
                className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-2xl shadow-md shadow-indigo-600/20 active:scale-[0.99] transition-all flex items-center gap-2 text-sm"
              >
                <Save className="w-4 h-4" />
                <span>Save All Settings</span>
              </button>
            </div>
          </form>
        </main>
      </div>
    </div>
  );
}
