import { NextRequest, NextResponse } from "next/server";
import { getAdminSupabase, isSupabaseConfigured } from "@/lib/supabase";

export const dynamic = "force-dynamic";

const DEFAULT_SHOP_SETTINGS = {
  shop_name: "Preeti Communication",
  owner_name: "Preeti Communication",
  shop_slug: "preeti",
  tagline: "Cyber Cafe, High Speed Printing & Xeroxing",
  phone: "+91 90551 43328",
  alt_phone: "+91 96221 43328",
  email: "preeti.communication@gmail.com",
  address: "Shop No. 4, Market Complex, Opp. Bus Station",
  working_hours: "08:00 AM - 09:30 PM (Mon-Sat)",
  is_closed: false,
  closed_notice: "Shop is currently closed. We reopen tomorrow morning at 08:00 AM.",
  require_approval: true,
  auto_print_on_payment: true,
  max_file_size_mb: 25,
  retention_days: 2,
};

export async function GET() {
  try {
    if (!isSupabaseConfigured) {
      return NextResponse.json({
        success: true,
        settings: DEFAULT_SHOP_SETTINGS,
        source: "fallback",
      });
    }

    const supabase = getAdminSupabase();
    const { data, error } = await supabase
      .from("settings")
      .select("value")
      .eq("key", "shop_info")
      .maybeSingle();

    if (error) {
      console.error("Error reading settings:", error);
      return NextResponse.json({
        success: true,
        settings: DEFAULT_SHOP_SETTINGS,
        source: "fallback_on_error",
      });
    }

    const merged = {
      ...DEFAULT_SHOP_SETTINGS,
      ...(data?.value || {}),
    };

    return NextResponse.json({
      success: true,
      settings: merged,
      source: "supabase",
    });
  } catch (err: any) {
    console.error("GET /api/admin/settings error:", err);
    return NextResponse.json(
      { success: false, error: err.message || "Failed to fetch settings" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    if (!isSupabaseConfigured) {
      return NextResponse.json(
        { error: "Database is not configured" },
        { status: 500 }
      );
    }

    const supabase = getAdminSupabase();

    // Fetch existing settings first
    const { data: existingData } = await supabase
      .from("settings")
      .select("value")
      .eq("key", "shop_info")
      .maybeSingle();

    const currentSettings = existingData?.value || DEFAULT_SHOP_SETTINGS;
    const updatedSettings = {
      ...currentSettings,
      ...body,
    };

    const { data, error } = await supabase
      .from("settings")
      .upsert({
        key: "shop_info",
        value: updatedSettings,
        updated_at: new Date().toISOString(),
      })
      .select();

    if (error) {
      console.error("Error updating settings:", error);
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Shop settings updated successfully",
      settings: updatedSettings,
    });
  } catch (err: any) {
    console.error("POST /api/admin/settings error:", err);
    return NextResponse.json(
      { success: false, error: err.message || "Failed to save settings" },
      { status: 500 }
    );
  }
}
