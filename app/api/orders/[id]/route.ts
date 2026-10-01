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

      return NextResponse.json({ order: data });
    }

    const mockOrder = globalMemoryStore._mockOrders?.find(
      (o) => o.access_token === identifier || o.id === identifier || o.order_number === identifier
    );

    if (!mockOrder) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    return NextResponse.json({ order: mockOrder });
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
    const { status, rejection_reason, utr_number } = body;

    if (isSupabaseConfigured) {
      const supabase = getAdminSupabase();

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
        globalMemoryStore._mockOrders[idx] = {
          ...globalMemoryStore._mockOrders[idx],
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
