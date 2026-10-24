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

        // Only keep Brother and Canon printers
        const ALLOWED_KEYWORDS = ["canon", "cannon", "brother", "mf3010", "t220"];
        const filtered = merged
          .filter((p) => {
            const name = (p.display_name + " " + p.system_name).toLowerCase();
            return ALLOWED_KEYWORDS.some((kw) => name.includes(kw));
          })
          .map((p) => {
            const name = (p.display_name + " " + p.system_name).toLowerCase();
            const isCanon = name.includes("canon") || name.includes("cannon") || name.includes("mf3010");
            return {
              ...p,
              type: isCanon ? ("bw" as const) : ("both" as const),
              status: "online" as const,
            };
          });

        // Ensure we always have both Canon and Brother represented
        const hasCanon = filtered.some((p) => (p.display_name + " " + p.system_name).toLowerCase().includes("canon"));
        const hasBrother = filtered.some((p) => (p.display_name + " " + p.system_name).toLowerCase().includes("brother"));

        const finalPrinters = [...filtered];
        if (!hasCanon) {
          finalPrinters.unshift({
            id: "11111111-1111-1111-1111-111111111111",
            display_name: "Canon imageCLASS MF3010",
            system_name: "Canon_MF3010",
            type: "bw",
            is_active: true,
            status: "online",
          });
        }
        if (!hasBrother) {
          finalPrinters.push({
            id: "22222222-2222-2222-2222-222222222222",
            display_name: "Brother DCP-T220",
            system_name: "Brother_DCP_T220",
            type: "both",
            is_active: true,
            status: "online",
          });
        }

        return NextResponse.json({
          success: true,
          source: "merged",
          printers: finalPrinters.slice(0, 2),
          timestamp: new Date().toISOString(),
        });
      }
    }

    // Default 2 printers: Canon (Black & White) and Brother (Color)
    return NextResponse.json({
      success: true,
      source: "default-hardware",
      printers: [
        {
          id: "11111111-1111-1111-1111-111111111111",
          display_name: "Canon imageCLASS MF3010",
          system_name: "Canon_MF3010",
          type: "bw",
          is_active: true,
          status: "online",
        },
        {
          id: "22222222-2222-2222-2222-222222222222",
          display_name: "Brother DCP-T220",
          system_name: "Brother_DCP_T220",
          type: "both",
          is_active: true,
          status: "online",
        },
      ],
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

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { printers } = body;

    if (!Array.isArray(printers)) {
      return NextResponse.json(
        { success: false, error: "printers array is required" },
        { status: 400 }
      );
    }

    if (!isSupabaseConfigured) {
      return NextResponse.json(
        { success: false, error: "Database is not configured" },
        { status: 500 }
      );
    }

    const supabase = getAdminSupabase();

    for (const p of printers) {
      await supabase
        .from("printers")
        .upsert(
          {
            id: p.id,
            display_name: p.display_name,
            system_name: p.system_name,
            type: p.type,
            is_active: p.is_active,
            status: p.status || "online",
            updated_at: new Date().toISOString(),
          },
          { onConflict: "id" }
        );
    }

    // Return refreshed printers
    const { data: updatedPrinters } = await supabase
      .from("printers")
      .select("*")
      .order("display_name", { ascending: true });

    return NextResponse.json({
      success: true,
      message: "Printers updated successfully",
      printers: updatedPrinters || [],
    });
  } catch (err: any) {
    console.error("POST /api/printers/live error:", err);
    return NextResponse.json(
      { success: false, error: err.message },
      { status: 500 }
    );
  }
}

