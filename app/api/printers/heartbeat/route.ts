import { NextRequest, NextResponse } from "next/server";
import { getAdminSupabase, isSupabaseConfigured } from "@/lib/supabase";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { printers, agent_version } = body;

    if (isSupabaseConfigured) {
      const supabase = getAdminSupabase();

      if (Array.isArray(printers)) {
        for (const p of printers) {
          await supabase
            .from("printers")
            .update({
              status: p.status || "online",
              last_heartbeat: new Date().toISOString(),
              error_message: p.error_message || null,
            })
            .eq("system_name", p.system_name);
        }
      }

      return NextResponse.json({ success: true, timestamp: new Date().toISOString() });
    }

    return NextResponse.json({ success: true, mode: "mock", timestamp: new Date().toISOString() });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "Heartbeat failed" }, { status: 500 });
  }
}
