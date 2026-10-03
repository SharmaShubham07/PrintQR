/**
 * Client-side script loader for Razorpay Standard Checkout
 */
export function loadRazorpayScript(): Promise<boolean> {
  return new Promise((resolve) => {
    // If already loaded on window
    if (typeof window !== "undefined" && (window as any).Razorpay) {
      resolve(true);
      return;
    }

    // Check if script tag already exists in document
    const existingScript = document.querySelector('script[src="https://checkout.razorpay.com/v1/checkout.js"]');
    if (existingScript) {
      existingScript.addEventListener("load", () => resolve(true));
      existingScript.addEventListener("error", () => resolve(false));
      return;
    }

    // Create script tag
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;
    script.onload = () => resolve(true);
    script.onerror = () => {
      console.error("Failed to load Razorpay checkout script.");
      resolve(false);
    };

    document.body.appendChild(script);
  });
}
