import { NextRequest, NextResponse } from "next/server";
import { detectWindowsPrinters } from "@/lib/printer-detector";
import { getAdminSupabase, isSupabaseConfigured } from "@/lib/supabase";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    // 1. Detect live real-time printers from Windows
    const livePrinters = await detectWindowsPrinters();

    // 2. If Supabase is configured, sync live printers into database
    if (isSupabaseConfigured && livePrinters.length > 0) {
      const supabase = getAdminSupabase();

      for (const p of livePrinters) {
        await supabase
          .from("printers")
          .upsert(
            {
              id: p.id,
              display_name: p.display_name,
              system_name: p.system_name,
              type: p.type,
              status: p.status,
              is_active: p.is_active,
              last_heartbeat: new Date().toISOString(),
            },
            { onConflict: "id" }
          );
      }
    }

    // 3. Fallback or merge with database printers
    if (livePrinters.length > 0) {
      return NextResponse.json({
        success: true,
        source: "windows-realtime",
        printers: livePrinters,
        timestamp: new Date().toISOString(),
      });
    }

    // If no Windows printers detected (e.g. cloud host), query Supabase
    if (isSupabaseConfigured) {
      const supabase = getAdminSupabase();
      const { data } = await supabase
        .from("printers")
        .select("*")
        .eq("is_active", true);

      return NextResponse.json({
        success: true,
        source: "database",
        printers: data || [],
        timestamp: new Date().toISOString(),
      });
    }

    return NextResponse.json({
      success: true,
      source: "empty",
      printers: [],
      timestamp: new Date().toISOString(),
    });
  } catch (err: any) {
    console.error("Live printer route error:", err);
    return NextResponse.json(
      { success: false, error: err.message },
      { status: 500 }
    );
  }
}
