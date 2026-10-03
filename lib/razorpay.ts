import Razorpay from "razorpay";
import crypto from "crypto";

export function getRazorpayClient(): Razorpay {
  const key_id = process.env.RAZORPAY_KEY_ID || process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || "rzp_test_TjKMh7ogcUlyTU";
  const key_secret = process.env.RAZORPAY_KEY_SECRET || "CWpvMeDB6zZH2fJ8hUIwku4K";

  if (!key_id || !key_secret) {
    throw new Error("Razorpay credentials (RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET) are not configured in environment variables.");
  }

  return new Razorpay({
    key_id,
    key_secret,
  });
}

/**
 * Verify Razorpay payment signature using HMAC-SHA256
 * Algorithm: HMAC-SHA256(order_id + "|" + payment_id, KEY_SECRET)
 */
export function verifyRazorpaySignature(
  orderId: string,
  paymentId: string,
  signature: string
): boolean {
  const keySecret = process.env.RAZORPAY_KEY_SECRET || "CWpvMeDB6zZH2fJ8hUIwku4K";
  if (!keySecret) {
    throw new Error("RAZORPAY_KEY_SECRET is not configured in environment variables.");
  }

  const expectedSignature = crypto
    .createHmac("sha256", keySecret)
    .update(`${orderId}|${paymentId}`)
    .digest("hex");

  // Timing-safe comparison to prevent timing attacks
  const expectedBuffer = Buffer.from(expectedSignature, "utf-8");
  const receivedBuffer = Buffer.from(signature, "utf-8");

  if (expectedBuffer.length !== receivedBuffer.length) {
    return false;
  }

  return crypto.timingSafeEqual(expectedBuffer, receivedBuffer);
}
