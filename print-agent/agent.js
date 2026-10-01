/**
 * ==============================================================================
 * PrintQR Local Print Agent
 * Shop: Preeti Communication
 * Target OS: Windows (SumatraPDF) / Linux (CUPS lp)
 * Office Conversion: Headless LibreOffice
 * ==============================================================================
 */

const fs = require("fs");
const path = require("path");
const { exec, execFile } = require("child_process");
const { promisify } = require("util");
const { createClient } = require("@supabase/supabase-js");
require("dotenv").config();

const execAsync = promisify(exec);

// Configuration
const SUPABASE_URL = process.env.SUPABASE_URL || "https://your-project.supabase.co";
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
const CANON_PRINTER = process.env.CANON_PRINTER_NAME || "Canon_MF3010";
const BROTHER_PRINTER = process.env.BROTHER_PRINTER_NAME || "Brother_DCP_T220";
const POLL_INTERVAL = parseInt(process.env.POLL_INTERVAL_MS || "5000", 10);
const HEARTBEAT_INTERVAL = parseInt(process.env.HEARTBEAT_INTERVAL_MS || "30000", 10);
const TEMP_DIR = path.resolve(process.env.TEMP_DIR || "./temp");
const DRY_RUN = process.argv.includes("--dry-run") || process.env.DRY_RUN === "true";

const isWindows = process.platform === "win32";

// Ensure temp directory exists
if (!fs.existsSync(TEMP_DIR)) {
  fs.mkdirSync(TEMP_DIR, { recursive: true });
}

console.log("=================================================");
console.log("  PrintQR Local Print Agent - Preeti Communication");
console.log("=================================================");
console.log(`OS Platform:       ${process.platform}`);
console.log(`Canon Printer:     ${CANON_PRINTER} (Mono Laser)`);
console.log(`Brother Printer:   ${BROTHER_PRINTER} (Colour Ink Tank)`);
console.log(`Temp Directory:    ${TEMP_DIR}`);
console.log(`Dry-run Mode:      ${DRY_RUN ? "ENABLED (Simulation)" : "DISABLED (Physical Printing)"}`);
console.log("=================================================\n");

let supabase = null;
if (SUPABASE_KEY && !SUPABASE_URL.includes("your-project")) {
  supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
    auth: { persistSession: false },
  });
  console.log("? Connected to Supabase Cloud.");
} else {
  console.warn("! Warning: Valid Supabase credentials not found in .env.");
  console.warn("  Agent is running in local test / simulation mode.\n");
}

/**
 * Sends heartbeat ping to Supabase to indicate agent is online
 */
async function sendHeartbeat() {
  if (!supabase) return;
  try {
    const timestamp = new Date().toISOString();
    await supabase
      .from("printers")
      .update({
        status: "online",
        last_heartbeat: timestamp,
      })
      .in("system_name", [CANON_PRINTER, BROTHER_PRINTER]);

    console.log(`[${new Date().toLocaleTimeString()}] Heartbeat sent.`);
  } catch (err) {
    console.error("Heartbeat error:", err.message);
  }
}

/**
 * Converts DOCX / PPTX / Images to PDF using LibreOffice headless
 */
async function convertToPdf(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  if (ext === ".pdf") {
    return filePath;
  }

  console.log(`  -> Converting ${path.basename(filePath)} to PDF via LibreOffice...`);

  if (DRY_RUN) {
    console.log("  [DRY RUN] Simulating document conversion to PDF.");
    return filePath;
  }

  const outDir = path.dirname(filePath);
  const command = `soffice --headless --convert-to pdf --outdir "${outDir}" "${filePath}"`;

  try {
    await execAsync(command);
    const pdfPath = filePath.replace(ext, ".pdf");
    if (fs.existsSync(pdfPath)) {
      return pdfPath;
    }
    throw new Error(`Converted PDF file not found at ${pdfPath}`);
  } catch (err) {
    console.error("  Conversion failed:", err.message);
    throw err;
  }
}

/**
 * Dispatches PDF to the physical printer via SumatraPDF (Windows) or CUPS (Linux)
 */
async function printPdf(pdfPath, printerName, copies = 1, duplex = "single") {
  console.log(`  -> Sending to printer: "${printerName}" (${copies} copies, ${duplex})...`);

  if (DRY_RUN) {
    console.log(`  [DRY RUN] Would execute print command for: ${path.basename(pdfPath)} on ${printerName}`);
    await new Promise((r) => setTimeout(r, 2000));
    return;
  }

  if (isWindows) {
    // Windows: SumatraPDF CLI
    // Example: SumatraPDF.exe -print-to "Canon_MF3010" -print-settings "1x,duplex" file.pdf
    const duplexSetting = duplex === "double" ? "duplex" : "simplex";
    const settings = `${copies}x,${duplexSetting}`;
    const cmd = `SumatraPDF.exe -print-to "${printerName}" -print-settings "${settings}" -silent "${pdfPath}"`;

    console.log(`  Executing: ${cmd}`);
    await execAsync(cmd);
  } else {
    // Linux: CUPS lp
    const duplexSetting = duplex === "double" ? "-o sides=two-sided-long-edge" : "-o sides=one-sided";
    const cmd = `lp -d "${printerName}" -n ${copies} ${duplexSetting} "${pdfPath}"`;

    console.log(`  Executing: ${cmd}`);
    await execAsync(cmd);
  }

  console.log(`  ? Successfully dispatched to ${printerName}`);
}

/**
 * Downloads a file from Supabase storage into local temp folder
 */
async function downloadOrderFile(storagePath, localFileName) {
  const localPath = path.join(TEMP_DIR, `${Date.now()}_${localFileName}`);

  if (DRY_RUN || !supabase) {
    // Create dummy file for dry-run
    fs.writeFileSync(localPath, "Dry-run dummy PDF data");
    return localPath;
  }

  const { data, error } = await supabase.storage
    .from("order-files")
    .download(storagePath);

  if (error) {
    throw new Error(`Failed to download ${storagePath}: ${error.message}`);
  }

  const buffer = Buffer.from(await data.arrayBuffer());
  fs.writeFileSync(localPath, buffer);
  return localPath;
}

/**
 * Processes a queued print order
 */
async function processOrder(order) {
  console.log(`\n=================================================`);
  console.log(`Processing Order: ${order.order_number} (${order.customer_name})`);
  console.log(`Total: ?${order.total_amount} | Files: ${order.files?.length || 0}`);
  console.log(`=================================================`);

  if (supabase) {
    await supabase.from("orders").update({ status: "printing" }).eq("id", order.id);
  }

  try {
    for (const file of order.files || []) {
      console.log(`\nFile: ${file.file_name} (${file.color_mode.toUpperCase()})`);

      // Determine printer based on color mode rule
      let targetPrinter = CANON_PRINTER;
      if (file.color_mode === "color") {
        targetPrinter = BROTHER_PRINTER; // Rule: colour jobs MUST go to Brother
      }

      // 1. Download file
      const localFile = await downloadOrderFile(file.storage_path, file.file_name);

      // 2. Convert to PDF if DOCX / PPTX / Image
      const readyPdf = await convertToPdf(localFile);

      // 3. Print
      await printPdf(readyPdf, targetPrinter, file.copies || 1, file.duplex || "single");

      // Cleanup local temp file
      try {
        if (fs.existsSync(localFile)) fs.unlinkSync(localFile);
        if (readyPdf !== localFile && fs.existsSync(readyPdf)) fs.unlinkSync(readyPdf);
      } catch (cleanErr) {
        // ignore
      }
    }

    // Mark order completed
    if (supabase) {
      await supabase
        .from("orders")
        .update({
          status: "completed",
          updated_at: new Date().toISOString(),
        })
        .eq("id", order.id);

      await supabase.from("print_logs").insert({
        order_id: order.id,
        status: "completed",
        message: "Order printed successfully on shop printers.",
      });
    }

    console.log(`\n? Order ${order.order_number} marked as COMPLETED.`);
  } catch (err) {
    console.error(`\n? Error processing order ${order.order_number}:`, err.message);

    if (supabase) {
      await supabase
        .from("orders")
        .update({ status: "queued" }) // Keep queued for retry
        .eq("id", order.id);

      await supabase.from("print_logs").insert({
        order_id: order.id,
        status: "failed",
        message: `Print error: ${err.message}`,
      });
    }
  }
}

/**
 * Polls for queued orders
 */
let isChecking = false;
async function checkForQueuedOrders() {
  if (isChecking || !supabase) return;
  isChecking = true;

  try {
    const { data: orders, error } = await supabase
      .from("orders")
      .select(`
        *,
        files:order_files(*)
      `)
      .eq("status", "queued")
      .order("created_at", { ascending: true })
      .limit(3);

    if (!error && orders && orders.length > 0) {
      for (const ord of orders) {
        await processOrder(ord);
      }
    }
  } catch (err) {
    console.error("Polling error:", err.message);
  } finally {
    isChecking = false;
  }
}

// Start Realtime Subscription & Polling
function startAgent() {
  sendHeartbeat();
  setInterval(sendHeartbeat, HEARTBEAT_INTERVAL);

  if (supabase) {
    console.log("Subscribing to realtime queued print orders...");
    supabase
      .channel("agent_orders_feed")
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "orders",
          filter: "status=eq.queued",
        },
        async (payload) => {
          console.log(`[REALTIME] New queued order detected: ${payload.new.order_number}`);
          checkForQueuedOrders();
        }
      )
      .subscribe();
  }

  // Backup polling
  setInterval(checkForQueuedOrders, POLL_INTERVAL);
  console.log(`Polling check active every ${POLL_INTERVAL / 1000}s.`);
}

startAgent();
