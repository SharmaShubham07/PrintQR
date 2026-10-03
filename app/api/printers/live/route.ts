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

    // 3. Merge live detected printers with database printers
    if (isSupabaseConfigured) {
      const supabase = getAdminSupabase();
      const { data: dbPrinters } = await supabase
        .from("printers")
        .select("*")
        .eq("is_active", true);

      if (dbPrinters && dbPrinters.length > 0) {
        const liveMap = new Map(
          livePrinters.map((p) => [p.system_name.toLowerCase(), p])
        );

        const merged = dbPrinters.map((p) => {
          const match = liveMap.get(p.system_name.toLowerCase());
          if (match) {
            return { ...p, status: match.status };
          }
          return p;
        });

        // Add any newly detected Windows printers not yet in DB
        const dbNames = new Set(dbPrinters.map((p) => p.system_name.toLowerCase()));
        for (const p of livePrinters) {
          if (!dbNames.has(p.system_name.toLowerCase())) {
            merged.push(p);
          }
        }

        return NextResponse.json({
          success: true,
          source: "merged",
          printers: merged,
          timestamp: new Date().toISOString(),
        });
      }
    }

    if (livePrinters.length > 0) {
      return NextResponse.json({
        success: true,
        source: "windows-realtime",
        printers: livePrinters,
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
