"use client";

import React, { useState } from "react";
import Navbar from "@/components/Navbar";
import RazorpayCheckoutButton from "@/components/RazorpayCheckoutButton";
import { CheckCircle2, AlertTriangle, Play, RefreshCw, ShieldCheck, Terminal, ArrowRight } from "lucide-react";
import Link from "next/link";

import { Language } from "@/lib/types";

export default function RazorpayTestPage() {
  const [language, setLanguage] = useState<Language>("en");
  const [testAmount, setTestAmount] = useState<number>(5.0);

  const [customerName, setCustomerName] = useState<string>("Test Customer");
  const [customerPhone, setCustomerPhone] = useState<string>("9876543210");
  const [customerEmail, setCustomerEmail] = useState<string>("test@example.com");

  const [logs, setLogs] = useState<Array<{ time: string; type: "info" | "success" | "error"; text: string; data?: any }>>([]);
  const [apiTesting, setApiTesting] = useState<boolean>(false);

  const keyId = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || "rzp_test_TjKMh7ogcUlyTU";

  const addLog = (type: "info" | "success" | "error", text: string, data?: any) => {
    const time = new Date().toLocaleTimeString();
    setLogs((prev) => [{ time, type, text, data }, ...prev]);
  };

  const handleTestCreateOrder = async () => {
    setApiTesting(true);
    addLog("info", "Calling POST /api/create-order...", {
      amount: Math.round(testAmount * 100),
      currency: "INR",
      receipt: `test_rcpt_${Date.now()}`,
    });

    try {
      const res = await fetch("/api/create-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: Math.round(testAmount * 100),
          currency: "INR",
          receipt: `test_${Date.now().toString().slice(-6)}`,
          notes: { test: "true", name: customerName },
        }),
      });

      const data = await res.json();
      if (res.ok && data.order_id) {
        addLog("success", `Order created successfully: ${data.order_id}`, data);
      } else {
        addLog("error", `Order creation returned status ${res.status}`, data);
      }
    } catch (err: any) {
      addLog("error", `Failed to call /api/create-order: ${err.message}`);
    } finally {
      setApiTesting(false);
    }
  };

  const handleTestInvalidAmount = async () => {
    setApiTesting(true);
    addLog("info", "Testing edge case: amount < 100 paise (50 paise)...");
    try {
      const res = await fetch("/api/create-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: 50, // Less than 100 paise
          currency: "INR",
        }),
      });

      const data = await res.json();
      if (res.status === 400) {
        addLog("success", `Edge case PASSED: API returned 400 Bad Request as required.`, data);
      } else {
        addLog("error", `Unexpected response status ${res.status}`, data);
      }
    } catch (err: any) {
      addLog("error", `Error: ${err.message}`);
    } finally {
      setApiTesting(false);
    }
  };

  const handleTestSignatureTampering = async () => {
    setApiTesting(true);
    addLog("info", "Testing edge case: POST /api/verify-payment with invalid signature (tampered)...");
    try {
      const res = await fetch("/api/verify-payment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          razorpay_order_id: "order_test_123456",
          razorpay_payment_id: "pay_test_987654",
          razorpay_signature: "tampered_invalid_signature_1234567890abcdef",
        }),
      });

      const data = await res.json();
      if (res.status === 400) {
        addLog("success", `Edge case PASSED: Tampered signature rejected with 400 Bad Request.`, data);
      } else {
        addLog("error", `Unexpected response status ${res.status}`, data);
      }
    } catch (err: any) {
      addLog("error", `Error: ${err.message}`);
    } finally {
      setApiTesting(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      <Navbar language={language} onLanguageChange={setLanguage} />

      <main className="flex-1 max-w-4xl w-full mx-auto px-4 py-8 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-indigo-100 text-indigo-700 mb-2">
              <ShieldCheck className="w-3.5 h-3.5" />
              Integration Verification
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900">
              Razorpay Standard Checkout Test Console
            </h1>
            <p className="text-xs text-slate-500 mt-1">
              Verify order creation, interactive checkout modal, and backend signature verification.
            </p>
          </div>

          <Link
            href="/"
            className="hidden sm:inline-flex items-center gap-1.5 text-xs font-bold text-indigo-600 hover:text-indigo-800 bg-white border border-slate-200 px-3.5 py-2 rounded-xl shadow-xs"
          >
            <span>Back to Shop</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {/* Credentials Status Card */}
        <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
              Frontend Key ID (Public)
            </span>
            <div className="font-mono text-xs font-bold text-slate-800 bg-slate-50 p-2.5 rounded-xl border border-slate-200 truncate">
              {keyId ? keyId : "Missing NEXT_PUBLIC_RAZORPAY_KEY_ID"}
            </div>
            <p className="text-[10px] text-emerald-600 mt-1 flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3" /> Safe to expose to client bundle
            </p>
          </div>

          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
              Backend Key Secret (Protected)
            </span>
            <div className="font-mono text-xs font-bold text-slate-800 bg-slate-50 p-2.5 rounded-xl border border-slate-200 flex items-center justify-between">
              <span>••••••••••••••••••••••••</span>
              <span className="text-[10px] text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md font-bold">
                Server-Only
              </span>
            </div>
            <p className="text-[10px] text-emerald-600 mt-1 flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3" /> Secret strictly confined to Node.js backend routes
            </p>
          </div>
        </div>

        {/* Test Interactive Modal Card */}
        <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs space-y-6">
          <div className="border-b border-slate-100 pb-4">
            <h2 className="text-base font-bold text-slate-900">
              Interactive Standard Checkout Test
            </h2>
            <p className="text-xs text-slate-500">
              Clicking below will call <code>/api/create-order</code>, launch the Razorpay modal, and verify the payment via <code>/api/verify-payment</code>.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                Amount (₹ INR)
              </label>
              <input
                type="number"
                min="1"
                step="0.5"
                value={testAmount}
                onChange={(e) => setTestAmount(parseFloat(e.target.value) || 0)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl font-bold font-mono outline-none focus:border-indigo-500"
              />
              <span className="text-[11px] text-slate-400 mt-1 block">
                = {Math.round(testAmount * 100)} paise (Min: 100 paise)
              </span>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                Customer Name (Optional)
              </label>
              <input
                type="text"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl outline-none focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                Mobile Number
              </label>
              <input
                type="tel"
                value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl font-mono outline-none focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                Email Address
              </label>
              <input
                type="email"
                value={customerEmail}
                onChange={(e) => setCustomerEmail(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl outline-none focus:border-indigo-500"
              />
            </div>
          </div>

          <div className="pt-2">
            <RazorpayCheckoutButton
              amount={testAmount}
              orderNumber={`TEST-${Math.floor(1000 + Math.random() * 9000)}`}
              customerName={customerName}
              customerPhone={customerPhone}
              customerEmail={customerEmail}
              buttonText={`Launch Razorpay Modal (₹${testAmount.toFixed(2)})`}
              onSuccess={(res) => {
                addLog("success", "Payment & signature verified successfully!", res);
              }}
              onError={(err) => {
                addLog("error", `Payment error: ${err}`);
              }}
              onCancel={() => {
                addLog("info", "User dismissed the Razorpay checkout modal.");
              }}
            />
          </div>
        </div>

        {/* API Edge Cases Testing Suite */}
        <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs space-y-4">
          <div className="border-b border-slate-100 pb-3">
            <h2 className="text-base font-bold text-slate-900">
              Automated API Endpoint Tests
            </h2>
            <p className="text-xs text-slate-500">
              Test server routes directly to verify compliance with error handling rules.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              disabled={apiTesting}
              onClick={handleTestCreateOrder}
              className="px-4 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 text-xs font-bold rounded-xl transition-colors flex items-center gap-1.5"
            >
              <Play className="w-3.5 h-3.5" />
              <span>Test POST /api/create-order</span>
            </button>

            <button
              type="button"
              disabled={apiTesting}
              onClick={handleTestInvalidAmount}
              className="px-4 py-2 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 text-xs font-bold rounded-xl transition-colors flex items-center gap-1.5"
            >
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>Test Amount &lt; 100 Paise (Expect 400)</span>
            </button>

            <button
              type="button"
              disabled={apiTesting}
              onClick={handleTestSignatureTampering}
              className="px-4 py-2 bg-rose-50 hover:bg-rose-100 text-rose-800 border border-rose-200 text-xs font-bold rounded-xl transition-colors flex items-center gap-1.5"
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Test Tampered Signature (Expect 400)</span>
            </button>
          </div>
        </div>

        {/* Activity & Console Log Viewer */}
        <div className="bg-slate-900 text-slate-100 rounded-3xl p-6 shadow-xl space-y-3 font-mono text-xs">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <Terminal className="w-4 h-4 text-emerald-400" />
              <span className="font-bold text-slate-200">Execution Log Console</span>
            </div>
            {logs.length > 0 && (
              <button
                type="button"
                onClick={() => setLogs([])}
                className="text-slate-400 hover:text-slate-200 text-[11px] flex items-center gap-1"
              >
                <RefreshCw className="w-3 h-3" />
                Clear
              </button>
            )}
          </div>

          <div className="max-h-60 overflow-y-auto space-y-2">
            {logs.length === 0 ? (
              <p className="text-slate-500 italic py-4 text-center">
                Ready. Click &quot;Launch Razorpay Modal&quot; or any of the API tests above to view live requests and responses.
              </p>
            ) : (
              logs.map((log, idx) => (
                <div key={idx} className="space-y-1 border-b border-slate-800/80 pb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-slate-500 text-[10px]">[{log.time}]</span>
                    <span
                      className={`font-bold ${
                        log.type === "success"
                          ? "text-emerald-400"
                          : log.type === "error"
                          ? "text-rose-400"
                          : "text-sky-400"
                      }`}
                    >
                      {log.type.toUpperCase()}:
                    </span>
                    <span className="text-slate-200">{log.text}</span>
                  </div>
                  {log.data && (
                    <pre className="bg-slate-950 p-2 rounded-lg text-[10px] text-slate-300 overflow-x-auto">
                      {JSON.stringify(log.data, null, 2)}
                    </pre>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
