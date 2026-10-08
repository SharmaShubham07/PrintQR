import { Order, OrderFileItem } from "./types";
import { supabase, isSupabaseConfigured } from "./supabase";

/**
 * Resolves the download URL for an order file.
 * Checks existing download_url, the /api/orders/[id] endpoint, and Supabase storage.
 */
export async function getFileDownloadUrl(
  file: OrderFileItem,
  orderId?: string
): Promise<string | null> {
  const fileAny = file as any;
  if (fileAny.download_url) {
    return fileAny.download_url;
  }

  // If orderId is provided, fetch order with signed URLs from the API
  if (orderId) {
    try {
      const res = await fetch(`/api/orders/${orderId}`);
      if (res.ok) {
        const json = await res.json();
        const serverFile = json?.order?.files?.find(
          (sf: any) => sf.id === file.id || sf.file_name === file.file_name
        );
        if (serverFile?.download_url) {
          return serverFile.download_url;
        }
      }
    } catch (e) {
      console.warn("Could not fetch file download URL via API:", e);
    }
  }

  // Try fetching directly via Supabase client if configured
  if (isSupabaseConfigured && file.storage_path) {
    try {
      const { data: signed } = await supabase.storage
        .from("order-files")
        .createSignedUrl(file.storage_path, 3600);
      if (signed?.signedUrl) {
        return signed.signedUrl;
      }

      const { data: pub } = supabase.storage
        .from("order-files")
        .getPublicUrl(file.storage_path);
      if (pub?.publicUrl) {
        return pub.publicUrl;
      }
    } catch (sErr) {
      console.warn("Storage signed URL error:", sErr);
    }
  }

  return null;
}

/**
 * Triggers the browser's native Ctrl+P print dialog for a document URL or blob.
 * Uses a same-origin hidden iframe to summon the system printer selector.
 */
export async function printUrlOrBlob(url: string, fileName?: string): Promise<boolean> {
  if (typeof window === "undefined") return false;

  const ext = fileName?.split(".").pop()?.toLowerCase() || "";
  const isImage = ["jpg", "jpeg", "png", "webp", "bmp", "svg", "gif"].includes(ext) || url.startsWith("data:image/");

  try {
    let blobUrl = url;
    let isBlobCreated = false;

    // Fetch as blob to ensure same-origin blob: URL for the print iframe
    if (!url.startsWith("blob:") && !url.startsWith("data:")) {
      try {
        const res = await fetch(url, { mode: "cors" });
        if (res.ok) {
          const blob = await res.blob();
          blobUrl = URL.createObjectURL(blob);
          isBlobCreated = true;
        }
      } catch (fetchErr) {
        console.warn("Direct blob fetch failed, using original URL:", fetchErr);
      }
    }

    if (isImage) {
      return new Promise<boolean>((resolve) => {
        const iframe = document.createElement("iframe");
        iframe.style.position = "fixed";
        iframe.style.right = "0";
        iframe.style.bottom = "0";
        iframe.style.width = "0";
        iframe.style.height = "0";
        iframe.style.border = "0";
        iframe.style.opacity = "0";
        iframe.style.pointerEvents = "none";
        document.body.appendChild(iframe);

        const doc = iframe.contentWindow?.document;
        if (!doc) {
          fallbackPrintWindow(blobUrl);
          resolve(true);
          return;
        }

        doc.open();
        doc.write(`
          <!DOCTYPE html>
          <html>
            <head>
              <title>${fileName || "Print Document"}</title>
              <style>
                @page { size: auto; margin: 0; }
                body { margin: 0; padding: 0; display: flex; justify-content: center; align-items: center; min-height: 100vh; background: #fff; }
                img { max-width: 100%; max-height: 100vh; object-fit: contain; }
              </style>
            </head>
            <body>
              <img id="printImg" src="${blobUrl}" alt="Print Preview" />
            </body>
          </html>
        `);
        doc.close();

        const img = doc.getElementById("printImg") as HTMLImageElement;
        const triggerPrint = () => {
          setTimeout(() => {
            try {
              iframe.contentWindow?.focus();
              iframe.contentWindow?.print();
            } catch (e) {
              fallbackPrintWindow(blobUrl);
            } finally {
              setTimeout(() => {
                try { document.body.removeChild(iframe); } catch {}
                if (isBlobCreated) URL.revokeObjectURL(blobUrl);
              }, 4000);
              resolve(true);
            }
          }, 400);
        };

        if (img?.complete) {
          triggerPrint();
        } else if (img) {
          img.onload = triggerPrint;
          img.onerror = () => {
            fallbackPrintWindow(blobUrl);
            resolve(false);
          };
        } else {
          fallbackPrintWindow(blobUrl);
          resolve(false);
        }
      });
    }

    // PDF or other documents
    return new Promise<boolean>((resolve) => {
      const iframe = document.createElement("iframe");
      iframe.style.position = "fixed";
      iframe.style.right = "0";
      iframe.style.bottom = "0";
      iframe.style.width = "0";
      iframe.style.height = "0";
      iframe.style.border = "0";
      iframe.style.opacity = "0";
      iframe.style.pointerEvents = "none";
      iframe.src = blobUrl;

      iframe.onload = () => {
        // Wait 700ms for PDF engine (MimeHandlerView) to render
        setTimeout(() => {
          try {
            iframe.contentWindow?.focus();
            iframe.contentWindow?.print();
            resolve(true);
          } catch (err) {
            console.warn("iframe print blocked, opening print window fallback:", err);
            fallbackPrintWindow(blobUrl);
            resolve(true);
          } finally {
            setTimeout(() => {
              try { document.body.removeChild(iframe); } catch {}
              if (isBlobCreated) URL.revokeObjectURL(blobUrl);
            }, 6000);
          }
        }, 700);
      };

      document.body.appendChild(iframe);
    });
  } catch (err) {
    console.error("Print URL error:", err);
    fallbackPrintWindow(url);
    return false;
  }
}

/**
 * Fallback to open the document in a dedicated print window if iframe printing is blocked.
 */
function fallbackPrintWindow(url: string) {
  const printWin = window.open(url, "_blank");
  if (printWin) {
    printWin.focus();
    printWin.onload = () => {
      try {
        printWin.print();
      } catch (e) {
        console.warn("Auto-print in popup blocked:", e);
      }
    };
  }
}

/**
 * Generates and prints an Order Job Slip & Receipt via the Ctrl+P print dialog.
 * Useful for shop verification, customer receipts, or when offline/mock files are used.
 */
export function printOrderSlip(order: Order, specificFile?: OrderFileItem): boolean {
  if (typeof window === "undefined") return false;

  const dateStr = new Date(order.created_at || Date.now()).toLocaleString("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  });

  const filesToPrint = specificFile ? [specificFile] : (order.files || []);

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <title>Print Slip - ${order.order_number}</title>
        <style>
          @page {
            size: A4 portrait;
            margin: 15mm;
          }
          * { box-sizing: border-box; margin: 0; padding: 0; }
          body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
            color: #1e293b;
            background: #ffffff;
            padding: 20px;
          }
          .ticket {
            max-width: 650px;
            margin: 0 auto;
            border: 2px dashed #94a3b8;
            border-radius: 16px;
            padding: 24px;
          }
          .header {
            text-align: center;
            border-bottom: 2px solid #e2e8f0;
            padding-bottom: 16px;
            margin-bottom: 20px;
          }
          .shop-title {
            font-size: 24px;
            font-weight: 900;
            color: #0f172a;
            letter-spacing: 0.5px;
          }
          .shop-sub {
            font-size: 13px;
            color: #64748b;
            margin-top: 4px;
            font-weight: 500;
          }
          .token-badge {
            display: inline-block;
            margin-top: 12px;
            padding: 6px 16px;
            background: #e0e7ff;
            color: #4338ca;
            font-size: 18px;
            font-weight: 800;
            font-family: monospace;
            border-radius: 10px;
            border: 1px solid #c7d2fe;
          }
          .grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 12px;
            margin-bottom: 20px;
            background: #f8fafc;
            padding: 14px;
            border-radius: 12px;
            font-size: 13px;
          }
          .grid-item span {
            display: block;
            color: #64748b;
            font-size: 11px;
            text-transform: uppercase;
            font-weight: 700;
          }
          .grid-item strong {
            color: #0f172a;
            font-size: 14px;
          }
          .table-title {
            font-size: 13px;
            font-weight: 800;
            color: #334155;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            margin-bottom: 8px;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            font-size: 12px;
            margin-bottom: 20px;
          }
          th {
            background: #f1f5f9;
            color: #475569;
            text-align: left;
            padding: 8px 10px;
            font-weight: 700;
            border-bottom: 2px solid #cbd5e1;
          }
          td {
            padding: 8px 10px;
            border-bottom: 1px solid #e2e8f0;
          }
          .badge {
            display: inline-block;
            padding: 2px 6px;
            border-radius: 6px;
            font-size: 10px;
            font-weight: 700;
            text-transform: uppercase;
          }
          .badge-bw { background: #f1f5f9; color: #334155; }
          .badge-color { background: #fee2e2; color: #dc2626; }
          .total-box {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 14px 18px;
            background: #0f172a;
            color: #ffffff;
            border-radius: 12px;
            margin-top: 10px;
          }
          .total-label { font-size: 14px; font-weight: 600; }
          .total-amount { font-size: 22px; font-weight: 900; }
          .footer {
            text-align: center;
            font-size: 11px;
            color: #94a3b8;
            margin-top: 24px;
            border-top: 1px solid #f1f5f9;
            padding-top: 12px;
          }
        </style>
      </head>
      <body>
        <div class="ticket">
          <div class="header">
            <div class="shop-title">PREETI COMMUNICATION</div>
            <div class="shop-sub">High-Speed Cyber Cafe Printing & Photocopy</div>
            <div class="token-badge">${order.order_number}</div>
          </div>

          <div class="grid">
            <div class="grid-item">
              <span>Customer Name</span>
              <strong>${order.customer_name || "Walk-in Customer"}</strong>
            </div>
            <div class="grid-item">
              <span>Customer Phone</span>
              <strong>+91 ${order.customer_phone || "N/A"}</strong>
            </div>
            <div class="grid-item">
              <span>UTR / Reference ID</span>
              <strong>${order.utr_number || "Verified"}</strong>
            </div>
            <div class="grid-item">
              <span>Date & Time</span>
              <strong>${dateStr}</strong>
            </div>
            ${order.customer_note ? `
              <div class="grid-item" style="grid-column: 1 / -1;">
                <span>Special Instructions</span>
                <strong style="color: #b45309;">${order.customer_note}</strong>
              </div>
            ` : ""}
          </div>

          <div class="table-title">Documents to Print (${filesToPrint.length})</div>
          <table>
            <thead>
              <tr>
                <th>Document Name</th>
                <th>Mode</th>
                <th>Sides</th>
                <th>Copies</th>
                <th>Pages</th>
                <th style="text-align: right;">Cost</th>
              </tr>
            </thead>
            <tbody>
              ${filesToPrint.map((f) => `
                <tr>
                  <td style="font-weight: 600;">${f.file_name}</td>
                  <td>
                    <span class="badge ${f.color_mode === 'color' ? 'badge-color' : 'badge-bw'}">
                      ${f.color_mode}
                    </span>
                  </td>
                  <td style="text-transform: capitalize;">${f.duplex || 'single'}</td>
                  <td>${f.copies || 1}x</td>
                  <td>${f.effective_pages || f.page_count || 1} pgs (${f.page_range || 'all'})</td>
                  <td style="text-align: right; font-weight: 700;">₹${Number(f.price || 0).toFixed(2)}</td>
                </tr>
              `).join("")}
            </tbody>
          </table>

          <div class="total-box">
            <span class="total-label">Total Amount Paid</span>
            <span class="total-amount">₹${Number(order.total_amount || 0).toFixed(2)}</span>
          </div>

          <div class="footer">
            Preeti Communication • Fast & Reliable Cyber Cafe Printing • Thank you!
          </div>
        </div>
      </body>
    </html>
  `;

  return printHtml(html, `Print-Slip-${order.order_number}`);
}

/**
 * Helper to render and print HTML in a hidden iframe with Ctrl+P dialog.
 */
export function printHtml(html: string, title?: string): boolean {
  if (typeof window === "undefined") return false;

  const iframe = document.createElement("iframe");
  iframe.style.position = "fixed";
  iframe.style.right = "0";
  iframe.style.bottom = "0";
  iframe.style.width = "0";
  iframe.style.height = "0";
  iframe.style.border = "0";
  iframe.style.opacity = "0";
  iframe.style.pointerEvents = "none";
  document.body.appendChild(iframe);

  const doc = iframe.contentWindow?.document;
  if (!doc) {
    const win = window.open("", "_blank");
    if (win) {
      win.document.write(html);
      win.document.close();
      win.focus();
      win.print();
    }
    return true;
  }

  doc.open();
  doc.write(html);
  doc.close();

  setTimeout(() => {
    try {
      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();
    } catch (err) {
      console.warn("HTML iframe print failed:", err);
    } finally {
      setTimeout(() => {
        try { document.body.removeChild(iframe); } catch {}
      }, 4000);
    }
  }, 400);

  return true;
}

/**
 * Main entry function: Prints an order's document or order slip.
 * Resolves the file URL, triggers the browser's Ctrl+P print dialog,
 * and falls back to a formatted order slip if the raw file is inaccessible.
 */
export async function printOrderFile(file: OrderFileItem, order: Order): Promise<boolean> {
  const url = await getFileDownloadUrl(file, order.id);

  if (url) {
    const success = await printUrlOrBlob(url, file.file_name);
    if (success) return true;
  }

  // Fallback to printable job ticket if file URL is not available
  return printOrderSlip(order, file);
}
