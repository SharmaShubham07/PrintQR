/**
 * Database connectivity verification script
 * Usage: npm run db:check
 */
const { createClient } = require("@supabase/supabase-js");
const fs = require("fs");
const path = require("path");

// Load .env.local natively without requiring external dotenv
const envPath = path.resolve(process.cwd(), ".env.local");
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, "utf-8");
  for (const line of envContent.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eqIdx = trimmed.indexOf("=");
    if (eqIdx !== -1) {
      const key = trimmed.slice(0, eqIdx).trim();
      const val = trimmed.slice(eqIdx + 1).trim();
      if (!process.env[key]) {
        process.env[key] = val;
      }
    }
  }
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

console.log("==========================================");
console.log("  PrintQR Database Connectivity Check");
console.log("==========================================");

if (!supabaseUrl || !supabaseKey || supabaseUrl.includes("your-project")) {
  console.log("? Supabase environment variables not configured in .env.local.");
  console.log("  Please copy .env.example to .env.local and add your Supabase credentials.");
  console.log("  The application is currently running in local fallback/demo mode.\n");
  process.exit(0);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkDatabase() {
  console.log(`Connecting to: ${supabaseUrl}`);

  const tables = ["orders", "order_files", "printers", "pricing", "payment_methods", "settings"];

  for (const table of tables) {
    try {
      const { count, error } = await supabase.from(table).select("*", { count: "exact", head: true });
      if (error) {
        console.log(`? Table "${table}": Error (${error.message})`);
      } else {
        console.log(`? Table "${table}": Accessible (${count ?? 0} records)`);
      }
    } catch (err) {
      console.log(`? Table "${table}": Failed (${err.message})`);
    }
  }

  console.log("\nDatabase check complete!");
}

checkDatabase();
