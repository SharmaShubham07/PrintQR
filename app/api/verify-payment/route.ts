import { NextRequest, NextResponse } from "next/server";
import { verifyRazorpaySignature } from "@/lib/razorpay";
import { getAdminSupabase, isSupabaseConfigured } from "@/lib/supabase";

export async function POST(req: NextRequest) {
  try {
    let body: any;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json(
        { success: false, error: "Invalid JSON request body" },
        { status: 400 }
      );
    }

    const orderId = (body?.razorpay_order_id || body?.order_id)?.toString().trim();
    const paymentId = (body?.razorpay_payment_id || body?.payment_id)?.toString().trim();
    const signature = (body?.razorpay_signature || body?.signature)?.toString().trim();
    const printOrderId = body?.print_order_id || body?.order_token;

    // Validate missing fields: return 400
    if (!orderId || !paymentId || !signature) {
      return NextResponse.json(
        {
          success: false,
          error: "Missing required fields. Both order_id, payment_id, and signature are required.",
        },
        { status: 400 }
      );
    }

    // Verify signature using HMAC-SHA256(order_id + "|" + payment_id, KEY_SECRET)
    let isValid = false;
    try {
      isValid = verifyRazorpaySignature(orderId, paymentId, signature);
    } catch (err: any) {
      console.error("Signature verification error:", err);
      return NextResponse.json(
        { success: false, error: err?.message || "Verification configuration error" },
        { status: 500 }
      );
    }

    // Signature mismatch: return 400, do NOT mark as paid
    if (!isValid) {
      return NextResponse.json(
        {
          success: false,
          error: "Payment verification failed. Signature mismatch.",
        },
        { status: 400 }
      );
    }

    // If linked to an internal print order, update status to paid / queued
    if (printOrderId) {
      try {
        if (isSupabaseConfigured) {
          const supabase = getAdminSupabase();
          // Update order status and set payment ID as reference
          const { error: updateErr } = await supabase
            .from("orders")
            .update({
              status: "queued",
              utr_number: paymentId,
            })
            .or(`id.eq.${printOrderId},access_token.eq.${printOrderId},order_number.eq.${printOrderId}`);

          if (!updateErr) {
            await supabase.from("print_logs").insert({
              order_id: printOrderId,
              status: "queued",
              message: `Razorpay payment verified (${paymentId}). Dispatched to printer queue.`,
            });
          }
        } else {
          // In-memory fallback
          const globalStore = globalThis as unknown as { _mockOrders?: any[] };
          if (globalStore._mockOrders) {
            const target = globalStore._mockOrders.find(
              (o) =>
                o.id === printOrderId ||
                o.access_token === printOrderId ||
                o.order_number === printOrderId
            );
            if (target) {
              target.status = "queued";
              target.utr_number = paymentId;
            }
          }
        }
      } catch (dbErr) {
        console.error("Error updating print order status on verified payment:", dbErr);
      }
    }

    // Return success
    return NextResponse.json({
      success: true,
      message: "Payment verified successfully",
      order_id: orderId,
      payment_id: paymentId,
    });
  } catch (err: any) {
    console.error("Unexpected error in /api/verify-payment:", err);
    return NextResponse.json(
      { success: false, error: err?.message || "Internal server error" },
      { status: 500 }
    );
  }
}
