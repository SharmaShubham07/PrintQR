import { NextRequest, NextResponse } from "next/server";
import { getAdminSupabase, isSupabaseConfigured, supabase as anonSupabase } from "@/lib/supabase";
import { DEFAULT_PRICING, parsePricingRows, PricingConfig } from "@/lib/price-calculator";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    if (!isSupabaseConfigured) {
      return NextResponse.json({
        success: true,
        pricing: DEFAULT_PRICING,
        source: "fallback",
      });
    }

    const client = getAdminSupabase();
    const { data, error } = await client.from("pricing").select("*");

    if (error) {
      console.error("Error fetching pricing from Supabase:", error);
      return NextResponse.json({
        success: true,
        pricing: DEFAULT_PRICING,
        source: "error_fallback",
        error: error.message,
      });
    }

    const config = parsePricingRows(data);
    return NextResponse.json({
      success: true,
      pricing: config,
      rows: data,
      source: "supabase",
    });
  } catch (err: any) {
    console.error("GET /api/admin/pricing exception:", err);
    return NextResponse.json(
      { success: false, error: err.message || "Failed to fetch pricing" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    if (!isSupabaseConfigured) {
      return NextResponse.json(
        { error: "Supabase credentials are not configured" },
        { status: 500 }
      );
    }

    const client = getAdminSupabase();
    const keys: (keyof PricingConfig)[] = [
      "bw_page",
      "color_page",
      "double_sided_discount",
      "min_order_amount",
    ];

    const updates = [];

    for (const key of keys) {
      if (body[key] !== undefined) {
        const rate = parseFloat(body[key]);
        if (!isNaN(rate) && rate >= 0) {
          const promise = client
            .from("pricing")
            .update({
              rate,
              updated_at: new Date().toISOString(),
            })
            .eq("key", key)
            .select();
          updates.push(promise);
        }
      }
    }

    await Promise.all(updates);

    // Fetch updated rows
    const { data: updatedRows, error: fetchErr } = await client
      .from("pricing")
      .select("*");

    if (fetchErr) {
      console.error("Error re-fetching pricing:", fetchErr);
    }

    const newConfig = parsePricingRows(updatedRows);

    return NextResponse.json({
      success: true,
      message: "Pricing updated successfully",
      pricing: newConfig,
    });
  } catch (err: any) {
    console.error("POST /api/admin/pricing exception:", err);
    return NextResponse.json(
      { success: false, error: err.message || "Failed to update pricing" },
      { status: 500 }
    );
  }
}
