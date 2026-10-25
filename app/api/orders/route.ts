import { NextRequest, NextResponse } from "next/server";
import { getAdminSupabase, isSupabaseConfigured } from "@/lib/supabase";
import { calculateOrderTotal, calculateFileCost, PricingConfig, DEFAULT_PRICING, parsePricingRows } from "@/lib/price-calculator";

export const dynamic = "force-dynamic";
export const revalidate = 0;

// In-memory store fallback when running before Supabase keys are configured
const globalMemoryStore = globalThis as unknown as {
  _mockOrders?: any[];
};
const DEFAULT_SAMPLE_ORDERS = [
  {
    id: "ord-1",
    order_number: "PC-1048",
    token_number: 1,
    access_token: "tok-1",
    customer_name: "Amit Patel",
    customer_phone: "9825100000",
    customer_note: "Please staple properly on top left",
    status: "payment_pending",
    total_amount: 48.00,
    utr_number: "427819382104",
    created_at: new Date(Date.now() - 3 * 60000).toISOString(),
    updated_at: new Date().toISOString(),
    files: [
      {
        id: "f-1",
        file_name: "Aadhaar_Card_Front_Back.pdf",
        file_type: "application/pdf",
        file_size: 450000,
        page_count: 2,
        copies: 3,
        color_mode: "bw",
        paper_size: "A4",
        duplex: "single",
        page_range: "all",
        effective_pages: 2,
        price: 48.00,
        status: "pending",
        printer: {
          id: "p-mf3010",
          display_name: "Canon imageCLASS MF3010 (B&W Laser)",
          system_name: "Canon MF3010"
        }
      },
    ],
  },
  {
    id: "ord-2",
    order_number: "PC-1047",
    token_number: 2,
    access_token: "tok-2",
    customer_name: "Sunita Verma",
    customer_phone: "9879100000",
    status: "queued",
    total_amount: 30.00,
    utr_number: "427819381900",
    created_at: new Date(Date.now() - 15 * 60000).toISOString(),
    updated_at: new Date().toISOString(),
    files: [
      {
        id: "f-2",
        file_name: "Project_Presentation_Charts.pptx",
        file_type: "application/vnd.ms-powerpoint",
        file_size: 1540000,
        page_count: 3,
        copies: 1,
        color_mode: "color",
        paper_size: "A4",
        duplex: "single",
        page_range: "all",
        effective_pages: 3,
        price: 30.00,
        status: "queued",
        printer: {
          id: "p-t220",
          display_name: "Brother DCP-T220 (Color Tank)",
          system_name: "Brother DCP-T220"
        }
      },
    ],
  },
  {
    id: "ord-3",
    order_number: "PC-1046",
    token_number: 3,
    access_token: "tok-3",
    customer_name: "Rohan Gupta",
    customer_phone: "9811122233",
    status: "completed",
    total_amount: 16.00,
    utr_number: "427819381750",
    created_at: new Date(Date.now() - 40 * 60000).toISOString(),
    updated_at: new Date(Date.now() - 35 * 60000).toISOString(),
    files: [
      {
        id: "f-3",
        file_name: "Resume_Rohan_2026.pdf",
        file_type: "application/pdf",
        file_size: 210000,
        page_count: 2,
        copies: 1,
        color_mode: "bw",
        paper_size: "A4",
        duplex: "single",
        page_range: "all",
        effective_pages: 2,
        price: 16.00,
        status: "printed",
      },
    ],
  },
];

if (!globalMemoryStore._mockOrders || globalMemoryStore._mockOrders.length === 0) {
  globalMemoryStore._mockOrders = [...DEFAULT_SAMPLE_ORDERS];
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();

    const customer_name = (formData.get("customer_name") as string)?.trim() || `Customer-${Math.floor(100 + Math.random() * 900)}`;
    const customer_phone = (formData.get("customer_phone") as string)?.trim() || "Walk-in";
    const customer_note = (formData.get("customer_note") as string) || "";
    const utr_number = (formData.get("utr_number") as string)?.trim() || `PAY-${Date.now().toString().slice(-8)}`;
    const filesJson = formData.get("files") as string;
    const autoPrintParam = formData.get("auto_print") as string | null;

    if (!filesJson) {
      return NextResponse.json(
        { error: "No print documents provided" },
        { status: 400 }
      );
    }

    const files = JSON.parse(filesJson);
    if (!Array.isArray(files) || files.length === 0) {
      return NextResponse.json(
        { error: "At least one file must be provided" },
        { status: 400 }
      );
    }

    // Fetch live pricing from Supabase
    let currentPricing = DEFAULT_PRICING;
    if (isSupabaseConfigured) {
      try {
        const client = getAdminSupabase();
        const { data: pricingRows } = await client.from("pricing").select("*");
        if (pricingRows && pricingRows.length > 0) {
          currentPricing = parsePricingRows(pricingRows);
        }
      } catch (pErr) {
        console.error("Error reading pricing from Supabase in orders POST:", pErr);
      }
    }

    // Calculate total amount server-side for security
    const { total } = calculateOrderTotal(files, currentPricing);

    const orderNumber = `PC-${Math.floor(1000 + Math.random() * 9000)}`;
    const accessToken = crypto.randomUUID();
    const orderId = crypto.randomUUID();

    if (isSupabaseConfigured) {
      const supabase = getAdminSupabase();

      // Payment check: order is only queued/printing if payment was completed online
      let isPaid = false;
      if (autoPrintParam === "true") {
        isPaid = true;
      }
      const initialStatus = isPaid ? "queued" : "payment_pending";

      // 1. Upload any attached screenshot or files to storage bucket
      let screenshotUrl: string | null = null;
      const screenshotFile = formData.get("screenshot") as File | null;
      if (screenshotFile && screenshotFile.size > 0) {
        const ext = screenshotFile.name.split(".").pop();
        const path = `screenshots/${orderId}.${ext}`;
        const buffer = Buffer.from(await screenshotFile.arrayBuffer());
        const { error: uploadErr } = await supabase.storage
          .from("order-files")
          .upload(path, buffer, {
            contentType: screenshotFile.type,
            upsert: true,
          });

        if (!uploadErr) {
          screenshotUrl = path;
        }
      }

      // 2. Upload actual document files if provided in FormData
      const processedFiles = [];
      for (let i = 0; i < files.length; i++) {
        const fileMeta = files[i];
        const uploadedFile = formData.get(`file_${i}`) as File | null;
        let storagePath = fileMeta.storage_path || `documents/${orderId}/${fileMeta.file_name}`;

        if (uploadedFile && uploadedFile.size > 0) {
          const buffer = Buffer.from(await uploadedFile.arrayBuffer());
          const { error: fErr } = await supabase.storage
            .from("order-files")
            .upload(storagePath, buffer, {
              contentType: uploadedFile.type || "application/octet-stream",
              upsert: true,
            });
          if (fErr) {
            console.error("Error uploading document to storage:", fErr);
          }
        }

        processedFiles.push({
          ...fileMeta,
          storage_path: storagePath,
        });
      }

      // 3. Insert order
      const { data: orderData, error: orderErr } = await supabase
        .from("orders")
        .insert({
          id: orderId,
          order_number: orderNumber,
          access_token: accessToken,
          customer_name,
          customer_phone,
          customer_note,
          status: initialStatus,
          total_amount: total,
          utr_number,
          screenshot_url: screenshotUrl,
        })
        .select()
        .single();

      if (orderErr) {
        console.error("Supabase insert order error:", orderErr);
        throw new Error(orderErr.message);
      }

      if (initialStatus === "queued") {
        await supabase.from("print_logs").insert({
          order_id: orderId,
          status: "queued",
          message: "Payment received. Order automatically dispatched to shop printer queue.",
        });
      }

      // 4. Insert order files
      const fileInserts = processedFiles.map((f) => ({
        order_id: orderId,
        file_name: f.file_name,
        storage_path: f.storage_path,
        file_type: f.file_type,
        file_size: f.file_size,
        page_count: f.page_count,
        copies: f.copies || 1,
        color_mode: f.color_mode || "bw",
        paper_size: f.paper_size || "A4",
        duplex: f.duplex || "single",
        page_range: f.page_range || "all",
        printer_id: f.printer_id || (f.color_mode === "color" ? "22222222-2222-2222-2222-222222222222" : "11111111-1111-1111-1111-111111111111"),
        price: calculateFileCost(f, currentPricing),
        status: "pending",
      }));

      const { error: filesErr } = await supabase
        .from("order_files")
        .insert(fileInserts);

      if (filesErr) {
        console.error("Supabase insert files error:", filesErr);
      }

      return NextResponse.json({
        success: true,
        order: {
          id: orderId,
          order_number: orderNumber,
          access_token: accessToken,
          status: initialStatus,
          total_amount: total,
        },
      });
    }

    const fallbackStatus = autoPrintParam === "true" ? "queued" : "payment_pending";

    // Fallback store for instant local testing
    const newMockOrder = {
      id: orderId,
      order_number: orderNumber,
      access_token: accessToken,
      customer_name,
      customer_phone,
      customer_note,
      status: fallbackStatus,
      total_amount: total,
      utr_number,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      files,
    };

    (globalMemoryStore._mockOrders = globalMemoryStore._mockOrders || []).unshift(newMockOrder);

    return NextResponse.json({
      success: true,
      order: {
        id: orderId,
        order_number: orderNumber,
        access_token: accessToken,
        status: fallbackStatus,
        total_amount: total,
      },
    });
  } catch (err: any) {
    console.error("Order creation API error:", err);
    return NextResponse.json(
      { error: err?.message || "Failed to create order" },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  try {
    if (isSupabaseConfigured) {
      const supabase = getAdminSupabase();
      const { data, error } = await supabase
        .from("orders")
        .select(`
          *,
          files:order_files(
            *,
            printer:printers(id, display_name, system_name)
          )
        `)
        .order("created_at", { ascending: false });

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      const orders = data || [];
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);

      // Sort chronological to assign token numbers
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

      // Assign token numbers
      for (const ord of orders) {
        ord.token_number = tokenMap.get(ord.id) || 1;
      }

      // Performance Optimization: Only generate signed URLs in parallel for active & recent orders
      // Historical orders resolve URLs on-demand via /api/orders/[id] when clicked
      const signingTasks: Promise<any>[] = [];
      const ordersToSign = orders.filter(
        (o, idx) => idx < 10 || ["queued", "printing", "payment_pending"].includes(o.status)
      );

      for (const ord of ordersToSign) {
        if (ord.files && Array.isArray(ord.files)) {
          for (const f of ord.files) {
            if (f.storage_path) {
              signingTasks.push(
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

      if (signingTasks.length > 0) {
        await Promise.all(signingTasks);
      }

      return NextResponse.json({ success: true, orders });
    }

    const mockList = globalMemoryStore._mockOrders || [];
    return NextResponse.json({ success: true, orders: mockList });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "Failed to list orders" }, { status: 500 });
  }
}

