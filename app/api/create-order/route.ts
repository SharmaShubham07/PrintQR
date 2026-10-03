import { NextRequest, NextResponse } from "next/server";
import { getRazorpayClient } from "@/lib/razorpay";

export async function POST(req: NextRequest) {
  try {
    let body: any;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json(
        { error: "Invalid JSON request body" },
        { status: 400 }
      );
    }

    const { amount, currency = "INR", receipt, notes } = body || {};

    // Validate amount
    const parsedAmount = Number(amount);
    if (!amount || isNaN(parsedAmount)) {
      return NextResponse.json(
        { error: "Amount is required and must be a valid number" },
        { status: 400 }
      );
    }

    // Minimum amount: 100 paise (1 INR)
    if (parsedAmount < 100) {
      return NextResponse.json(
        { error: "Amount must be at least 100 paise (₹1.00)" },
        { status: 400 }
      );
    }

    // Generate safe receipt (max 40 chars for Razorpay)
    const sanitizedReceipt = receipt
      ? String(receipt).slice(0, 40)
      : `rcpt_${Date.now()}_${Math.floor(100 + Math.random() * 900)}`.slice(0, 40);

    let razorpay;
    try {
      razorpay = getRazorpayClient();
    } catch (configErr: any) {
      console.error("Razorpay config error:", configErr);
      return NextResponse.json(
        { error: configErr.message || "Razorpay is not configured on the server" },
        { status: 500 }
      );
    }

    try {
      const orderOptions = {
        amount: Math.round(parsedAmount),
        currency: currency || "INR",
        receipt: sanitizedReceipt,
        notes: notes || {},
      };

      const order = await razorpay.orders.create(orderOptions);

      return NextResponse.json({
        order_id: order.id,
        id: order.id,
        amount: order.amount,
        currency: order.currency,
        receipt: order.receipt,
      });
    } catch (apiErr: any) {
      console.error("Razorpay API error creating order:", apiErr);

      // Handle auth failures (return 401)
      const statusCode = apiErr?.statusCode || apiErr?.status;
      if (statusCode === 401 || apiErr?.error?.code === "BAD_REQUEST_ERROR" && apiErr?.message?.toLowerCase().includes("auth")) {
        return NextResponse.json(
          { error: "Razorpay authentication failed. Please verify API keys." },
          { status: 401 }
        );
      }

      // Handle Razorpay API errors (return 500)
      return NextResponse.json(
        {
          error:
            apiErr?.error?.description ||
            apiErr?.message ||
            "Failed to create Razorpay order",
        },
        { status: 500 }
      );
    }
  } catch (err: any) {
    console.error("Unexpected error in /api/create-order:", err);
    return NextResponse.json(
      { error: err?.message || "Internal server error" },
      { status: 500 }
    );
  }
}
