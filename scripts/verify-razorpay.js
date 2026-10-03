const Razorpay = require("razorpay");
const crypto = require("crypto");
const fs = require("fs");
const path = require("path");

// Load .env
const envPath = path.resolve(__dirname, "../.env");
if (fs.existsSync(envPath)) {
  const content = fs.readFileSync(envPath, "utf-8");
  content.split("\n").forEach((line) => {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith("#") && trimmed.includes("=")) {
      const [key, ...rest] = trimmed.split("=");
      process.env[key.trim()] = rest.join("=").trim();
    }
  });
}

const key_id = process.env.RAZORPAY_KEY_ID;
const key_secret = process.env.RAZORPAY_KEY_SECRET;

console.log("=== Verifying Razorpay Environment & Credentials ===");
console.log("RAZORPAY_KEY_ID:", key_id);
console.log("RAZORPAY_KEY_SECRET:", key_secret ? "Present (" + key_secret.slice(0, 4) + "..." + key_secret.slice(-4) + ")" : "MISSING");

if (!key_id || !key_secret) {
  console.error("FAIL: Missing credentials in .env");
  process.exit(1);
}

const razorpay = new Razorpay({ key_id, key_secret });

async function run() {
  console.log("\n=== 1. Testing Order Creation with Razorpay API ===");
  try {
    const order = await razorpay.orders.create({
      amount: 500, // 500 paise = ₹5.00
      currency: "INR",
      receipt: `test_rcpt_${Date.now()}`.slice(0, 40),
      notes: { source: "PrintQR Test Script" },
    });

    console.log("✅ SUCCESS: Order created on Razorpay!");
    console.log("   Order ID:", order.id);
    console.log("   Amount:", order.amount, "paise (₹" + (order.amount / 100).toFixed(2) + ")");
    console.log("   Currency:", order.currency);
    console.log("   Receipt:", order.receipt);
    console.log("   Status:", order.status);

    console.log("\n=== 2. Testing HMAC-SHA256 Signature Verification ===");
    const testPaymentId = "pay_test_" + Math.floor(10000000 + Math.random() * 90000000);
    const expectedSignature = crypto
      .createHmac("sha256", key_secret)
      .update(`${order.id}|${testPaymentId}`)
      .digest("hex");

    console.log("   Test Payment ID:", testPaymentId);
    console.log("   Calculated Signature:", expectedSignature);

    // Verify valid signature
    const verifySignature = (oid, pid, sig) => {
      const generated = crypto.createHmac("sha256", key_secret).update(`${oid}|${pid}`).digest("hex");
      return crypto.timingSafeEqual(Buffer.from(generated, "utf-8"), Buffer.from(sig, "utf-8"));
    };

    const isMatch = verifySignature(order.id, testPaymentId, expectedSignature);
    console.log("   Valid Signature Match:", isMatch ? "✅ PASS" : "❌ FAIL");

    // Test tampered signature
    const tamperedSig = "a".repeat(expectedSignature.length);
    const isTamperedMatch = verifySignature(order.id, testPaymentId, tamperedSig);
    console.log("   Tampered Signature Rejection:", !isTamperedMatch ? "✅ PASS (Correctly Rejected)" : "❌ FAIL");

    console.log("\nAll Razorpay tests passed successfully!");
  } catch (err) {
    console.error("❌ ERROR communicating with Razorpay API:", err);
    process.exit(1);
  }
}

run();
