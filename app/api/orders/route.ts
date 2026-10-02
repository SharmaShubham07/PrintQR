import { NextRequest, NextResponse } from "next/server";
import { getAdminSupabase, isSupabaseConfigured } from "@/lib/supabase";
import { calculateOrderTotal, calculateFileCost, PricingConfig, DEFAULT_PRICING, parsePricingRows } from "@/lib/price-calculator";

// In-memory store fallback when running before Supabase keys are configured
const globalMemoryStore = globalThis as unknown as {
  _mockOrders?: any[];
};
if (!globalMemoryStore._mockOrders) {
  globalMemoryStore._mockOrders = [];
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

      // Check auto-print configuration
      let isAutoPrint = true;
      if (autoPrintParam !== null) {
        isAutoPrint = autoPrintParam === "true";
      } else {
        try {
          const { data: setRes } = await supabase
            .from("settings")
            .select("value")
            .eq("key", "shop_info")
            .maybeSingle();
          if (setRes?.value?.auto_print_on_payment !== undefined) {
            isAutoPrint = Boolean(setRes.value.auto_print_on_payment);
          }
        } catch (e) {
          // default to true
        }
      }

      const initialStatus = isAutoPrint ? "queued" : "payment_pending";

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

    const fallbackStatus = autoPrintParam !== "false" ? "queued" : "payment_pending";

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
