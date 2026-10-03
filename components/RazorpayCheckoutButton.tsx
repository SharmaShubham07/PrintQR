"use client";

import React, { useState } from "react";
import { loadRazorpayScript } from "@/lib/razorpay-client";
import { CreditCard, Loader2, AlertCircle, CheckCircle } from "lucide-react";

interface RazorpayCheckoutButtonProps {
  amount: number; // in Rupees (e.g. 10.50)
  orderNumber?: string;
  customerName?: string;
  customerPhone?: string;
  customerEmail?: string;
  onSuccess?: (paymentDetails: {
    orderId: string;
    paymentId: string;
    signature: string;
  }) => void;
  onError?: (errorMessage: string) => void;
  onCancel?: () => void;
  buttonText?: string;
  disabled?: boolean;
  className?: string;
}

export default function RazorpayCheckoutButton({
  amount,
  orderNumber = "ORDER",
  customerName = "Customer",
  customerPhone = "",
  customerEmail = "",
  onSuccess,
  onError,
  onCancel,
  buttonText,
  disabled = false,
  className = "",
}: RazorpayCheckoutButtonProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleCheckout = async () => {
    try {
      setLoading(true);
      setError(null);
      setSuccess(null);

      // Amount in paise (minimum 100 paise = ₹1.00)
      const amountInPaise = Math.round(amount * 100);
      if (amountInPaise < 100) {
        const msg = "Minimum payment amount is ₹1.00 (100 paise)";
        setError(msg);
        onError?.(msg);
        setLoading(false);
        return;
      }

      // Step 1: Ensure Razorpay checkout.js script is loaded
      const isScriptLoaded = await loadRazorpayScript();
      if (!isScriptLoaded) {
        const msg = "Failed to load Razorpay SDK. Please check your internet connection.";
        setError(msg);
        onError?.(msg);
        setLoading(false);
        return;
      }

      // Step 2: Call backend /api/create-order
      const createOrderRes = await fetch("/api/create-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: amountInPaise,
          currency: "INR",
          receipt: `rcpt_${orderNumber}_${Date.now().toString().slice(-6)}`.slice(0, 40),
          notes: {
            orderNumber,
            customerName,
          },
        }),
      });

      const orderData = await createOrderRes.json();
      if (!createOrderRes.ok || !orderData.order_id) {
        throw new Error(orderData.error || "Failed to initialize payment order with server.");
      }

      // Step 3: Open Razorpay Payment Modal
      const razorpayKey = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || "rzp_test_TjKMh7ogcUlyTU";

      const options = {
        key: razorpayKey,
        amount: orderData.amount,
        currency: orderData.currency || "INR",
        name: "Preeti Communication",
        description: `Order #${orderNumber}`,
        image: "/favicon.ico",
        order_id: orderData.order_id,
        handler: async function (response: {
          razorpay_payment_id: string;
          razorpay_order_id: string;
          razorpay_signature: string;
        }) {
          try {
            // Step 4: Call backend /api/verify-payment
            const verifyRes = await fetch("/api/verify-payment", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
              }),
            });

            const verifyData = await verifyRes.json();
            if (!verifyRes.ok || !verifyData.success) {
              throw new Error(verifyData.error || "Payment signature verification failed.");
            }

            setSuccess(`Payment verified! ID: ${response.razorpay_payment_id}`);
            onSuccess?.({
              orderId: response.razorpay_order_id,
              paymentId: response.razorpay_payment_id,
              signature: response.razorpay_signature,
            });
          } catch (verifyErr: any) {
            console.error("Signature verification error:", verifyErr);
            const msg = verifyErr.message || "Payment verification failed.";
            setError(msg);
            onError?.(msg);
          } finally {
            setLoading(false);
          }
        },
        modal: {
          ondismiss: function () {
            setLoading(false);
            setError("Payment modal closed by user.");
            onCancel?.();
          },
        },
        prefill: {
          name: customerName !== "Walk-in Customer" ? customerName : "",
          contact: customerPhone !== "Walk-in" ? customerPhone : "",
          email: customerEmail || "",
        },
        notes: {
          orderNumber,
        },
        theme: {
          color: "#4f46e5", // Indigo theme matching PrintQR
        },
      };

      const rzp = new (window as any).Razorpay(options);

      // Handle payment.failed event
      rzp.on("payment.failed", function (response: any) {
        console.error("Razorpay payment failed:", response.error);
        const reason = response.error?.description || response.error?.reason || "Payment was declined or failed.";
        setError(`Payment Failed: ${reason}`);
        onError?.(reason);
        setLoading(false);
      });

      rzp.open();
    } catch (err: any) {
      console.error("Razorpay checkout error:", err);
      const msg = err.message || "Failed to start payment. Please try again.";
      setError(msg);
      onError?.(msg);
      setLoading(false);
    }
  };

  const defaultBtnClass =
    "w-full py-4 px-6 bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-600 hover:from-indigo-700 hover:to-purple-700 disabled:opacity-60 text-white font-extrabold rounded-2xl shadow-xl shadow-indigo-600/25 active:scale-[0.99] transition-all flex items-center justify-center gap-2.5 text-base border border-indigo-400/30 cursor-pointer disabled:cursor-not-allowed";

  return (
    <div className="w-full space-y-2">
      <button
        type="button"
        disabled={disabled || loading}
        onClick={handleCheckout}
        className={className || defaultBtnClass}
      >
        {loading ? (
          <>
            <Loader2 className="w-5 h-5 animate-spin" />
            <span>Processing Payment...</span>
          </>
        ) : (
          <>
            <CreditCard className="w-5 h-5" />
            <span>
              {buttonText || `Pay ₹${amount.toFixed(2)} with Razorpay`}
            </span>
          </>
        )}
      </button>

      {error && (
        <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl flex items-center gap-2 animate-in fade-in">
          <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
          <span className="flex-1">{error}</span>
        </div>
      )}

      {success && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl flex items-center gap-2 animate-in fade-in">
          <CheckCircle className="w-4 h-4 shrink-0 text-emerald-600" />
          <span className="flex-1">{success}</span>
        </div>
      )}
    </div>
  );
}
