import { NextRequest, NextResponse } from "next/server";
import { getAdminSupabase, isSupabaseConfigured } from "@/lib/supabase";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(req: NextRequest) {
  try {
    if (!isSupabaseConfigured) {
      return NextResponse.json({
        success: false,
        error: "Supabase is not configured",
      });
    }

    const supabase = getAdminSupabase();

    // 1. Fetch all orders with files and joined printer details
    const { data: allOrders, error: ordersErr } = await supabase
      .from("orders")
      .select("*, files:order_files(*, printer:printers(id, display_name, system_name))")
      .order("created_at", { ascending: false });

    if (ordersErr) {
      console.error("Orders fetch error:", ordersErr);
      throw new Error(ordersErr.message);
    }

    // 2. Fetch all active printers
    const { data: allPrinters } = await supabase
      .from("printers")
      .select("*")
      .eq("is_active", true);

    const orders = allOrders || [];
    const printers = allPrinters || [];

    // 3. Compute Real Metrics with India Timezone (UTC+5:30)
    const istOffsetMs = 5.5 * 60 * 60 * 1000;
    const istNow = new Date(Date.now() + istOffsetMs);
    const istTodayStartUtc = new Date(
      Date.UTC(istNow.getUTCFullYear(), istNow.getUTCMonth(), istNow.getUTCDate(), 0, 0, 0) - istOffsetMs
    );

    const validOrders = orders.filter((o) => o.status !== "cancelled" && o.status !== "rejected");

    // Filter today's orders (based on Indian business day)
    const todayOrders = validOrders.filter((o) => {
      const orderDate = new Date(o.created_at);
      return orderDate >= istTodayStartUtc;
    });

    const todayRevenue = todayOrders.reduce((sum, o) => sum + (Number(o.total_amount) || 0), 0);
    const allTimeRevenue = validOrders.reduce((sum, o) => sum + (Number(o.total_amount) || 0), 0);

    const queuedCount = orders.filter(
      (o) => o.status === "queued" || o.status === "printing" || o.status === "payment_pending"
    ).length;

    const completedCount = orders.filter((o) => o.status === "completed").length;

    let totalPages = 0;
    orders.forEach((o) => {
      if (Array.isArray(o.files)) {
        o.files.forEach((f: any) => {
          totalPages += (Number(f.page_count) || 1) * (Number(f.copies) || 1);
        });
      }
    });

    const activePrintersCount = printers.filter((p) => p.status === "online").length;

    // Calculate sequential daily token numbers
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const sortedAsc = [...orders].sort(
      (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    );

    let todayTokenCounter = 1;
    const tokenMap = new Map<string, number>();
    for (const ord of sortedAsc) {
      if (new Date(ord.created_at) >= todayStart) {
        tokenMap.set(ord.id, todayTokenCounter++);
      } else {
        tokenMap.set(ord.id, 1);
      }
    }

    const recentOrdersSlice = orders.slice(0, 15);
    const statSigningTasks: Promise<any>[] = [];
    for (const ord of recentOrdersSlice) {
      ord.token_number = tokenMap.get(ord.id) || 1;
      // Only sign active or first 5 recent orders for instant dashboard response
      if (ord.files && Array.isArray(ord.files)) {
        for (const f of ord.files) {
          if (f.storage_path) {
            statSigningTasks.push(
              supabase.storage
                .from("order-files")
                .createSignedUrl(f.storage_path, 3600)
                .then(({ data: signed }) => {
                  if (signed?.signedUrl) {
                    f.download_url = signed.signedUrl;
                  }
                })
                .catch(() => {})
            );
          }
        }
      }
    }

    if (statSigningTasks.length > 0) {
      await Promise.all(statSigningTasks);
    }

    return new NextResponse(
      JSON.stringify({
        success: true,
        stats: {
          today_revenue: todayRevenue,
          all_time_revenue: allTimeRevenue,
          today_orders: todayOrders.length,
          total_orders: orders.length,
          pending_queued: queuedCount,
          completed_orders: completedCount,
          total_pages: totalPages,
          active_printers: activePrintersCount,
        },
        recent_orders: recentOrdersSlice,
        printers,
        timestamp: new Date().toISOString(),
      }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0",
        },
      }
    );
  } catch (err: any) {
    console.error("Admin stats API error:", err);
    return NextResponse.json(
      { success: false, error: err.message },
      { status: 500 }
    );
  }
}
