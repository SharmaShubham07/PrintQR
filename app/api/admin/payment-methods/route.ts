import { NextRequest, NextResponse } from "next/server";
import { getAdminSupabase, isSupabaseConfigured } from "@/lib/supabase";

export const dynamic = "force-dynamic";

const DEFAULT_PAYMENT_METHOD = {
  id: "33333333-3333-3333-3333-333333333333",
  type: "upi",
  upi_id: "jkbmerc00757954@jkb",
  payee_name: "Preeti Communication",
  static_qr_url: "/payment-qr.png",
  is_active: true,
};

export async function GET() {
  try {
    if (!isSupabaseConfigured) {
      return NextResponse.json({
        success: true,
        payment_methods: [DEFAULT_PAYMENT_METHOD],
        primary: DEFAULT_PAYMENT_METHOD,
      });
    }

    const supabase = getAdminSupabase();
    const { data, error } = await supabase
      .from("payment_methods")
      .select("*")
      .order("created_at", { ascending: true });

    if (error) {
      console.error("Error fetching payment methods:", error);
      return NextResponse.json({
        success: true,
        payment_methods: [DEFAULT_PAYMENT_METHOD],
        primary: DEFAULT_PAYMENT_METHOD,
        error: error.message,
      });
    }

    const methods = data && data.length > 0 ? data : [DEFAULT_PAYMENT_METHOD];
    const primary = methods.find((m) => m.is_active) || methods[0];

    return NextResponse.json({
      success: true,
      payment_methods: methods,
      primary,
    });
  } catch (err: any) {
    console.error("GET /api/admin/payment-methods error:", err);
    return NextResponse.json(
      { success: false, error: err.message || "Failed to fetch payment methods" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    if (!isSupabaseConfigured) {
      return NextResponse.json(
        { error: "Database not configured" },
        { status: 500 }
      );
    }

    const supabase = getAdminSupabase();
    const {
      id = "33333333-3333-3333-3333-333333333333",
      type = "upi",
      upi_id = "jkbmerc00757954@jkb",
      payee_name = "Preeti Communication",
      static_qr_url = null,
      is_active = true,
    } = body;

    const { data, error } = await supabase
      .from("payment_methods")
      .upsert({
        id,
        type,
        upi_id: upi_id.trim(),
        payee_name: payee_name.trim(),
        static_qr_url,
        is_active,
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      console.error("Error updating payment method:", error);
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Payment method updated successfully",
      payment_method: data,
    });
  } catch (err: any) {
    console.error("POST /api/admin/payment-methods error:", err);
    return NextResponse.json(
      { success: false, error: err.message || "Failed to save payment method" },
      { status: 500 }
    );
  }
}
