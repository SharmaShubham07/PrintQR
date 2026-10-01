export type Language = "en" | "hi" | "gu";

export type OrderStatus =
  | "payment_pending"
  | "paid"
  | "queued"
  | "printing"
  | "completed"
  | "cancelled"
  | "rejected";

export type PrinterType = "bw" | "color" | "both";
export type ColorMode = "bw" | "color";
export type DuplexMode = "single" | "double";
export type PaperSize = "A4" | "Legal" | "Letter";

export interface Printer {
  id: string;
  display_name: string;
  system_name: string;
  type: PrinterType;
  is_active: boolean;
  status: "online" | "offline" | "busy" | "error";
  last_heartbeat?: string | null;
  error_message?: string | null;
}

export interface PricingItem {
  id: string;
  key: string;
  name: string;
  rate: number;
  unit: string;
  description?: string;
  is_active: boolean;
}

export interface PaymentMethod {
  id: string;
  type: string;
  upi_id: string;
  payee_name: string;
  static_qr_url?: string | null;
  is_active: boolean;
}

export interface ShopInfo {
  shop_name: string;
  tagline: string;
  phone: string;
  email: string;
  address: string;
  working_hours: string;
  is_closed: boolean;
  closed_notice?: string;
}

export interface PrintRules {
  max_file_size_mb: number;
  retention_days: number;
  allowed_extensions: string[];
}

export interface OrderFileItem {
  id?: string;
  file?: File;
  file_name: string;
  file_type: string;
  file_size: number;
  storage_path?: string;
  page_count: number;
  manual_page_override?: boolean;
  copies: number;
  color_mode: ColorMode;
  paper_size: PaperSize;
  duplex: DuplexMode;
  page_range: string; // e.g. "all", "1-3,5"
  effective_pages: number; // pages in range
  printer_id?: string;
  price: number;
  status?: string;
}

export interface Order {
  id: string;
  order_number: string;
  access_token: string;
  customer_name: string;
  customer_phone: string;
  customer_note?: string | null;
  status: OrderStatus;
  total_amount: number;
  utr_number?: string | null;
  screenshot_url?: string | null;
  rejection_reason?: string | null;
  created_at: string;
  updated_at: string;
  files?: OrderFileItem[];
}

export interface OrderStats {
  today_orders: number;
  today_revenue: number;
  bw_pages: number;
  color_pages: number;
  pending_payments: number;
  active_printers: number;
}
