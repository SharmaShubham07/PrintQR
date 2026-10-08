import { NextRequest, NextResponse } from "next/server";
import { getAdminSupabase, isSupabaseConfigured } from "@/lib/supabase";

const globalMemoryStore = globalThis as unknown as {
  _mockOrders?: any[];
};

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const identifier = params.id;
    const tokenQuery = req.nextUrl.searchParams.get("token") || identifier;

    if (isSupabaseConfigured) {
      const supabase = getAdminSupabase();

      let query = supabase
        .from("orders")
        .select(`
          *,
          files:order_files(
            *,
            printer:printers(id, display_name, system_name)
          )
        `);

      if (tokenQuery.includes("-") && tokenQuery.length === 36) {
        query = query.or(`access_token.eq.${tokenQuery},id.eq.${tokenQuery}`);
      } else {
        query = query.eq("order_number", tokenQuery);
      }

      const { data, error } = await query.single();

      if (error || !data) {
        return NextResponse.json({ error: "Order not found" }, { status: 404 });
      }

      if (data.files && Array.isArray(data.files)) {
        for (const file of data.files) {
          if (file.storage_path) {
            const { data: signed } = await supabase.storage
              .from("order-files")
              .createSignedUrl(file.storage_path, 3600);
            file.download_url = signed?.signedUrl;
          }
        }
      }

      if (data.screenshot_url) {
        const { data: signed } = await supabase.storage
          .from("order-files")
          .createSignedUrl(data.screenshot_url, 3600);
        data.screenshot_download_url = signed?.signedUrl;
      }

      // Calculate token_number (sequential order for today) and people_ahead
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);

      const { count: priorTodayCount } = await supabase
        .from("orders")
        .select("*", { count: "exact", head: true })
        .gte("created_at", todayStart.toISOString())
        .lte("created_at", data.created_at);

      const tokenNumber = Math.max(1, priorTodayCount || 1);

      const activeStatuses = ["payment_pending", "paid", "queued", "printing"];
      let peopleAhead = 0;
      if (activeStatuses.includes(data.status)) {
        const { count: activeAheadCount } = await supabase
          .from("orders")
          .select("*", { count: "exact", head: true })
          .in("status", activeStatuses)
          .lt("created_at", data.created_at);
        peopleAhead = activeAheadCount || 0;
      }

      data.token_number = tokenNumber;
      data.people_ahead = peopleAhead;

      return NextResponse.json({ 
        order: data, 
        token_number: tokenNumber, 
        people_ahead: peopleAhead 
      });
    }

    const mockOrder = globalMemoryStore._mockOrders?.find(
      (o) => o.access_token === identifier || o.id === identifier || o.order_number === identifier
    );

    if (!mockOrder) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    // Mock calculations
    const allMock = globalMemoryStore._mockOrders || [];
    const orderIdx = allMock.findIndex((o) => o.id === mockOrder.id);
    const tokenNumber = orderIdx !== -1 ? orderIdx + 1 : 1;
    const activeAhead = allMock.filter((o, idx) => 
      idx < orderIdx && ["payment_pending", "paid", "queued", "printing"].includes(o.status)
    ).length;

    mockOrder.token_number = tokenNumber;
    mockOrder.people_ahead = activeAhead;

    return NextResponse.json({ 
      order: mockOrder, 
      token_number: tokenNumber, 
      people_ahead: activeAhead 
    });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "Failed to fetch order" }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = params.id;
    const body = await req.json();
    const { status, rejection_reason, utr_number, file_id, file_status } = body;

    if (isSupabaseConfigured) {
      const supabase = getAdminSupabase();

      // If updating a specific file inside this order
      if (file_id && file_status) {
        await supabase
          .from("order_files")
          .update({ status: file_status })
          .eq("id", file_id)
          .eq("order_id", id);
      }

      const updateData: any = { updated_at: new Date().toISOString() };
      if (status) updateData.status = status;
      if (rejection_reason !== undefined) updateData.rejection_reason = rejection_reason;
      if (utr_number) updateData.utr_number = utr_number;

      const { data, error } = await supabase
        .from("orders")
        .update(updateData)
        .eq("id", id)
        .select()
        .single();

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      // If marked as completed or printed, mark all files in this order as printed
      if (status === "completed") {
        await supabase
          .from("order_files")
          .update({ status: "printed" })
          .eq("order_id", id);
      }

      if (status) {
        await supabase.from("print_logs").insert({
          order_id: id,
          status,
          message: `Order status updated to ${status}${rejection_reason ? `: ${rejection_reason}` : ""}`,
        });
      }

      return NextResponse.json({ success: true, order: data });
    }

    if (globalMemoryStore._mockOrders) {
      const idx = globalMemoryStore._mockOrders.findIndex((o) => o.id === id);
      if (idx !== -1) {
        const current = globalMemoryStore._mockOrders[idx];
        if (file_id && file_status && current.files) {
          const f = current.files.find((f: any) => f.id === file_id || f.file_name === file_id);
          if (f) f.status = file_status;
        }
        if (status === "completed" && current.files) {
          current.files.forEach((f: any) => { f.status = "printed"; });
        }
        globalMemoryStore._mockOrders[idx] = {
          ...current,
          ...body,
          updated_at: new Date().toISOString(),
        };
        return NextResponse.json({ success: true, order: globalMemoryStore._mockOrders[idx] });
      }
    }

    return NextResponse.json({ error: "Order not found" }, { status: 404 });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "Update failed" }, { status: 500 });
  }
}

