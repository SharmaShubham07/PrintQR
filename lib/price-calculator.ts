import { OrderFileItem } from "./types";

export interface PricingConfig {
  bw_page: number; // default 8
  color_page: number; // default 10
  double_sided_discount: number; // default 0
  min_order_amount: number; // default 8
}

export const DEFAULT_PRICING: PricingConfig = {
  bw_page: 8.0,
  color_page: 10.0,
  double_sided_discount: 0.0,
  min_order_amount: 8.0,
};

/**
 * Parses raw pricing rows from Supabase into PricingConfig object
 */
export function parsePricingRows(rows: any[] | null | undefined): PricingConfig {
  const config = { ...DEFAULT_PRICING };
  if (!Array.isArray(rows)) return config;
  for (const r of rows) {
    if (!r || !r.key) continue;
    const rateNum = Number(r.rate);
    if (!isNaN(rateNum) && r.key in config) {
      (config as any)[r.key] = rateNum;
    }
  }
  return config;
}

/**
 * Calculates single file cost based on pages, copies, color mode, duplex and pricing rates
 */
export function calculateFileCost(
  file: Pick<OrderFileItem, "effective_pages" | "copies" | "color_mode" | "duplex">,
  pricing: PricingConfig = DEFAULT_PRICING
): number {
  const rate = file.color_mode === "color" ? pricing.color_page : pricing.bw_page;
  const copies = Math.max(1, file.copies || 1);
  const pages = Math.max(1, file.effective_pages || 1);

  let cost = pages * copies * rate;

  if (file.duplex === "double" && pricing.double_sided_discount > 0) {
    const sheetsPerCopy = Math.ceil(pages / 2);
    const totalSheets = sheetsPerCopy * copies;
    const discount = totalSheets * pricing.double_sided_discount;
    cost = Math.max(0, cost - discount);
  }

  return Number(cost.toFixed(2));
}

/**
 * Calculates order total across all files with minimum order validation
 */
export function calculateOrderTotal(
  files: OrderFileItem[],
  pricing: PricingConfig = DEFAULT_PRICING
): { subtotal: number; total: number; minOrderApplied: boolean } {
  let subtotal = 0;
  for (const f of files) {
    subtotal += calculateFileCost(f, pricing);
  }

  subtotal = Number(subtotal.toFixed(2));
  const total = Math.max(subtotal, subtotal > 0 ? pricing.min_order_amount : 0);
  const minOrderApplied = subtotal > 0 && subtotal < pricing.min_order_amount;

  return {
    subtotal,
    total: Number(total.toFixed(2)),
    minOrderApplied,
  };
}
