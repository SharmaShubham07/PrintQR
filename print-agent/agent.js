/**
 * ==============================================================================
 * PrintQR Real-Time Print Agent
 * Shop: Preeti Communication
 * Target OS: Windows (SumatraPDF) / Linux (CUPS lp)
 * Direct Real-Time Hardware Detection & Print Command Dispatch
 * ==============================================================================
 */

const fs = require("fs");
const path = require("path");
const { exec, execSync } = require("child_process");
const { promisify } = require("util");

const execAsync = promisify(exec);

// Helper to load .env files
function loadEnvFile(envFilePath) {
  if (fs.existsSync(envFilePath)) {
    const content = fs.readFileSync(envFilePath, "utf8");
    for (const line of content.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eqIdx = trimmed.indexOf("=");
      if (eqIdx !== -1) {
        const key = trimmed.slice(0, eqIdx).trim();
        let val = trimmed.slice(eqIdx + 1).trim();
        if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
          val = val.slice(1, -1);
        }
        if (!process.env[key]) {
          process.env[key] = val;
        }
      }
    }
  }
}

// 1. Load local print-agent/.env, then fallback to root .env.local
loadEnvFile(path.join(__dirname, ".env"));
loadEnvFile(path.join(__dirname, "..", ".env.local"));

// 2. Resolve @supabase/supabase-js
let createClient;
try {
  ({ createClient } = require("@supabase/supabase-js"));
} catch (e) {
  try {
    ({ createClient } = require(path.join(__dirname, "..", "node_modules", "@supabase/supabase-js")));
  } catch (err) {
    console.error("FATAL: Could not resolve @supabase/supabase-js:", err.message);
    process.exit(1);
  }
}

// Configuration
const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
const POLL_INTERVAL = parseInt(process.env.POLL_INTERVAL_MS || "3000", 10);
const HEARTBEAT_INTERVAL = parseInt(process.env.HEARTBEAT_INTERVAL_MS || "10000", 10);
const TEMP_DIR = path.resolve(__dirname, process.env.TEMP_DIR || "./temp");
const DRY_RUN = process.argv.includes("--dry-run") || process.env.DRY_RUN === "true";

const isWindows = process.platform === "win32";

// Locate SumatraPDF executable on Windows
let sumatraExecutable = "SumatraPDF.exe";
if (isWindows) {
  const localBinSumatra = path.join(__dirname, "bin", "SumatraPDF.exe");
  if (fs.existsSync(localBinSumatra)) {
    sumatraExecutable = localBinSumatra;
  } else if (process.env.SUMATRAPDF_PATH && fs.existsSync(process.env.SUMATRAPDF_PATH)) {
    sumatraExecutable = process.env.SUMATRAPDF_PATH;
  }
}

// Ensure temp directory exists
if (!fs.existsSync(TEMP_DIR)) {
  fs.mkdirSync(TEMP_DIR, { recursive: true });
}

let supabase = null;
if (SUPABASE_KEY && SUPABASE_URL && !SUPABASE_URL.includes("your-project")) {
  supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
    auth: { persistSession: false },
  });
}

function generateDeterministicId(name) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    const char = name.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0;
  }
  const hex = Math.abs(hash).toString(16).padStart(8, "0");
  return `${hex.slice(0, 8)}-4444-4444-4444-${hex.slice(0, 12).padEnd(12, "0")}`;
}

/**
 * Scans installed Windows printers in real time
 */
function scanWindowsPrinters() {
  if (!isWindows) return [];

  try {
    const stdout = execSync(
      'powershell -NoProfile -Command "Get-CimInstance -ClassName Win32_Printer | Select-Object Name, DriverName, PrinterStatus, WorkOffline, Default, PortName | ConvertTo-Json -Compress"',
      { encoding: "utf8", timeout: 7000 }
    );
    if (!stdout || !stdout.trim()) return [];

    const raw = JSON.parse(stdout.trim());
    const list = Array.isArray(raw) ? raw : [raw];

    return list.map((p, idx) => {
      const name = String(p.Name || `Printer-${idx + 1}`).trim();
      const driver = String(p.DriverName || "").toLowerCase();
      const lowerName = name.toLowerCase();
      const isOffline = Boolean(p.WorkOffline) || p.PrinterStatus === 7;
      const isDefault = Boolean(p.Default);

      let type = "both";
      if (
        lowerName.includes("mf3010") ||
        lowerName.includes("lbp") ||
        lowerName.includes("laserjet") ||
        driver.includes("mono")
      ) {
        type = "bw";
      } else if (
        lowerName.includes("brother") ||
        lowerName.includes("t220") ||
        lowerName.includes("color") ||
        lowerName.includes("colour") ||
        lowerName.includes("ink")
      ) {
        type = "both";
      }

      return {
        id: generateDeterministicId(name),
        display_name: name,
        system_name: name,
        type,
        status: isOffline ? "offline" : "online",
        is_default: isDefault,
        port_name: String(p.PortName || ""),
        driver_name: p.DriverName || "",
        is_active: true,
      };
    });
  } catch (err) {
    console.error("Printer scan error:", err.message);
    return [];
  }
}

// Global cache of live detected printers
let livePrinters = [];

/**
 * Synchronizes real detected printers to Supabase database
 */
async function syncPrintersWithDatabase() {
  livePrinters = scanWindowsPrinters();
  const timestamp = new Date().toISOString();

  if (livePrinters.length > 0) {
    console.log(`[REALTIME SCAN] Detected ${livePrinters.length} printer(s) on Windows:`);
    livePrinters.forEach((p) => {
      console.log(`  -> ${p.system_name} [${p.status.toUpperCase()}] ${p.is_default ? "(Default)" : ""} (${p.type.toUpperCase()})`);
    });
  } else {
    console.log("[REALTIME SCAN] No Windows printers detected.");
  }

  if (!supabase) return;

  try {
    // 1. Upsert all live detected printers
    for (const p of livePrinters) {
      await supabase.from("printers").upsert(
        {
          id: p.id,
          display_name: p.display_name,
          system_name: p.system_name,
          type: p.type,
          status: p.status,
          is_active: true,
          last_heartbeat: timestamp,
        },
        { onConflict: "id" }
      );
    }

    // 2. Any printer in the DB that is NOT in Windows gets marked offline
    const detectedNames = new Set(livePrinters.map((p) => p.system_name.toLowerCase()));
    const { data: dbPrinters } = await supabase.from("printers").select("id, system_name, status");

    if (dbPrinters) {
      for (const dbp of dbPrinters) {
        if (!detectedNames.has(dbp.system_name.toLowerCase()) && dbp.status !== "offline") {
          await supabase
            .from("printers")
            .update({ status: "offline", last_heartbeat: timestamp })
            .eq("id", dbp.id);
          console.log(`  ! Flagged offline in DB: ${dbp.system_name} (Device not connected)`);
        }
      }
    }
  } catch (err) {
    console.error("DB Sync error:", err.message);
  }
}

/**
 * Resolves the best physical or virtual printer to send the print command to
 */
function resolvePrinter(requestedPrinterId, requestedPrinterName, colorMode) {
  if (livePrinters.length === 0) {
    livePrinters = scanWindowsPrinters();
  }

  // 1. Try to match by requestedPrinterId
  if (requestedPrinterId) {
    const matchById = livePrinters.find((p) => p.id === requestedPrinterId);
    if (matchById && matchById.status === "online") {
      return matchById.system_name;
    }
  }

  // 2. Try to match by requestedPrinterName
  if (requestedPrinterName) {
    const matchByName = livePrinters.find(
      (p) => p.system_name.toLowerCase() === requestedPrinterName.toLowerCase()
    );
    if (matchByName && matchByName.status === "online") {
      return matchByName.system_name;
    }

    // Fuzzy match (e.g. "Canon" or "Brother")
    const fuzzy = livePrinters.find((p) =>
      p.system_name.toLowerCase().includes(requestedPrinterName.toLowerCase())
    );
    if (fuzzy && fuzzy.status === "online") {
      return fuzzy.system_name;
    }
  }

  // 3. Fallback to Windows default printer
  const defaultPrinter = livePrinters.find((p) => p.is_default && p.status === "online");
  if (defaultPrinter) {
    return defaultPrinter.system_name;
  }

  // 4. Any online printer
  const anyOnline = livePrinters.find((p) => p.status === "online");
  if (anyOnline) {
    return anyOnline.system_name;
  }

  // 5. Fallback to Microsoft Print to PDF or first available
  return livePrinters[0]?.system_name || "Microsoft Print to PDF";
}

/**
 * Converts DOCX / PPTX / Images to PDF using LibreOffice headless if needed
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
    console.error("  Conversion failed, printing original:", err.message);
    return filePath;
  }
}

/**
 * Dispatches PDF to the physical printer via SumatraPDF (Windows) or CUPS (Linux)
 */
async function printPdf(pdfPath, printerName, copies = 1, duplex = "single") {
  console.log(`\n>>> [DISPATCHING PRINT COMMAND] >>>`);
  console.log(`  Target Printer:  "${printerName}"`);
  console.log(`  Document:        "${path.basename(pdfPath)}"`);
  console.log(`  Copies:          ${copies}`);
  console.log(`  Duplex / Sides:  ${duplex}`);

  if (DRY_RUN) {
    console.log(`  [DRY RUN] Print command simulated for ${printerName}`);
    await new Promise((r) => setTimeout(r, 1000));
    return;
  }

  if (isWindows) {
    const isVirtualPrompt =
      printerName.toLowerCase().includes("print to pdf") ||
      printerName.toLowerCase().includes("xps") ||
      printerName.toLowerCase().includes("fax");
    const duplexSetting = duplex === "double" ? "duplex" : "simplex";
    const settings = `${copies}x,${duplexSetting}`;
    const cmd = `"${sumatraExecutable}" -print-to "${printerName}" -print-settings "${settings}" -silent "${pdfPath}"`;

    console.log(`  Executing Windows Spool Command: ${cmd}`);
    try {
      const timeoutMs = isVirtualPrompt ? 4000 : 30000;
      await execAsync(cmd, { timeout: timeoutMs });
      console.log(`  ✓ Print command successfully sent to printer hardware: "${printerName}"`);
    } catch (err) {
      if (isVirtualPrompt) {
        console.log(`  ✓ Virtual print job dispatched to "${printerName}" (completed).`);
        try {
          execSync('powershell -Command "Stop-Process -Name SumatraPDF -Force -ErrorAction SilentlyContinue"');
        } catch (e) {}
      } else {
        console.warn(`  SumatraPDF command exit message: ${err.message}`);
      }
    }
  } else {
    // Linux: CUPS lp
    const duplexSetting = duplex === "double" ? "-o sides=two-sided-long-edge" : "-o sides=one-sided";
    const cmd = `lp -d "${printerName}" -n ${copies} ${duplexSetting} "${pdfPath}"`;

    console.log(`  Executing Linux CUPS Command: ${cmd}`);
    await execAsync(cmd);
    console.log(`  ✓ Print job dispatched to CUPS: "${printerName}"`);
  }
}

/**
 * Downloads a file from Supabase storage into local temp folder
 */
async function downloadOrderFile(storagePath, localFileName) {
  const safeName = localFileName.replace(/[^a-zA-Z0-9._-]/g, "_");
  const localPath = path.join(TEMP_DIR, `${Date.now()}_${safeName}`);

  if (DRY_RUN || !supabase) {
    fs.writeFileSync(localPath, "%PDF-1.4 dummy print data");
    return localPath;
  }

  const { data, error } = await supabase.storage.from("order-files").download(storagePath);

  if (error) {
    throw new Error(`Failed to download ${storagePath}: ${error.message}`);
  }

  const buffer = Buffer.from(await data.arrayBuffer());
  fs.writeFileSync(localPath, buffer);
  return localPath;
}

/**
 * Processes a queued print order automatically
 */
async function processOrder(order) {
  console.log(`\n=================================================`);
  console.log(`[AUTO-PRINT] Processing Order: ${order.order_number} (${order.customer_name})`);
  console.log(`Total: ₹${order.total_amount} | Files: ${order.files?.length || 0}`);
  console.log(`=================================================`);

  if (supabase) {
    await supabase.from("orders").update({ status: "printing" }).eq("id", order.id);
    await supabase.from("print_logs").insert({
      order_id: order.id,
      status: "printing",
      message: `Print command initiated for order ${order.order_number}`,
    });
  }

  try {
    for (const file of order.files || []) {
      console.log(`\nProcessing: "${file.file_name}" (${(file.color_mode || "bw").toUpperCase()})`);

      // Resolve the actual live printer requested
      const targetPrinter = resolvePrinter(file.printer_id, file.printer_name, file.color_mode);

      // 1. Download file from Supabase storage
      const localFile = await downloadOrderFile(file.storage_path, file.file_name);

      // 2. Convert to PDF if necessary
      const readyPdf = await convertToPdf(localFile);

      // 3. Dispatch print command to hardware printer
      await printPdf(readyPdf, targetPrinter, file.copies || 1, file.duplex || "single");

      // 4. Log individual file print success
      if (supabase) {
        await supabase.from("print_logs").insert({
          order_id: order.id,
          status: "printing",
          message: `Print command sent to "${targetPrinter}" for "${file.file_name}".`,
        });
      }

      // 5. Cleanup local temp file
      try {
        if (fs.existsSync(localFile)) fs.unlinkSync(localFile);
        if (readyPdf !== localFile && fs.existsSync(readyPdf)) fs.unlinkSync(readyPdf);
      } catch (cleanErr) {
        // ignore cleanup
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
        message: `Order ${order.order_number} printed automatically and marked completed.`,
      });
    }

    console.log(`\n✓ [ORDER COMPLETED] All files printed for order ${order.order_number}.`);
  } catch (err) {
    console.error(`\nERROR: Failed to process order ${order.order_number}:`, err.message);

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
 * Checks for queued orders
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
      console.log(`[QUEUE] Found ${orders.length} queued order(s) awaiting printing.`);
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
  console.log("=================================================");
  console.log("  PrintQR Real-Time Print Agent - Preeti Communication");
  console.log("=================================================");
  console.log(`OS Platform:       ${process.platform}`);
  console.log(`SumatraPDF Engine: ${sumatraExecutable} (${fs.existsSync(sumatraExecutable) ? "Ready" : "System PATH"})`);
  console.log(`Temp Directory:    ${TEMP_DIR}`);
  console.log(`Dry-run Mode:      ${DRY_RUN ? "ENABLED" : "DISABLED (Physical Printing Active)"}`);
  console.log("=================================================\n");

  if (!supabase) {
    console.warn("! Warning: Valid Supabase credentials not found.");
    return;
  }

  // 1. Initial live scan & sync
  syncPrintersWithDatabase();

  // 2. Periodic heartbeat & live hardware re-scan (every 10 seconds)
  setInterval(() => {
    syncPrintersWithDatabase();
  }, HEARTBEAT_INTERVAL);

  // 3. Periodic queue check fallback (every 3 seconds)
  setInterval(() => {
    checkForQueuedOrders();
  }, POLL_INTERVAL);

  // 4. Supabase Realtime channel subscription
  try {
    const channel = supabase
      .channel("realtime-print-agent")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "orders",
          filter: "status=eq.queued",
        },
        async (payload) => {
          console.log(`\n[REALTIME EVENT] New queued order received: ${payload.new.order_number}`);
          await new Promise((r) => setTimeout(r, 600));

          let { data: fullOrder } = await supabase
            .from("orders")
            .select("*, files:order_files(*)")
            .eq("id", payload.new.id)
            .single();

          if (!fullOrder?.files || fullOrder.files.length === 0) {
            await new Promise((r) => setTimeout(r, 800));
            const retry = await supabase
              .from("orders")
              .select("*, files:order_files(*)")
              .eq("id", payload.new.id)
              .single();
            if (retry.data?.files?.length > 0) {
              fullOrder = retry.data;
            }
          }

          if (fullOrder && fullOrder.files && fullOrder.files.length > 0) {
            await processOrder(fullOrder);
          }
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "orders",
          filter: "status=eq.queued",
        },
        async (payload) => {
          console.log(`\n[REALTIME EVENT] Order status changed to queued: ${payload.new.order_number}`);
          await new Promise((r) => setTimeout(r, 600));

          let { data: fullOrder } = await supabase
            .from("orders")
            .select("*, files:order_files(*)")
            .eq("id", payload.new.id)
            .single();

          if (!fullOrder?.files || fullOrder.files.length === 0) {
            await new Promise((r) => setTimeout(r, 800));
            const retry = await supabase
              .from("orders")
              .select("*, files:order_files(*)")
              .eq("id", payload.new.id)
              .single();
            if (retry.data?.files?.length > 0) {
              fullOrder = retry.data;
            }
          }

          if (fullOrder && fullOrder.files && fullOrder.files.length > 0) {
            await processOrder(fullOrder);
          }
        }
      )
      .subscribe((status) => {
        console.log(`[REALTIME] Supabase Realtime channel status: ${status}`);
      });
  } catch (err) {
    console.error("Realtime subscription error, using polling fallback:", err.message);
  }

  console.log(`[AGENT READY] Listening for print orders in real-time...\n`);
}

// Start agent
startAgent();
