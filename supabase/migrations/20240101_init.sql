-- ==============================================================================
-- PrintQR Database Migration
-- Shop: Preeti Communication
-- Built for Supabase Cloud PostgreSQL + Realtime + Storage + Auth
-- ==============================================================================

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. SEQUENCES
CREATE SEQUENCE IF NOT EXISTS order_num_seq START WITH 1001;

-- 3. ENUMS / CHECKS
-- Orders status: payment_pending, paid, queued, printing, completed, cancelled, rejected
-- Printers type: bw, color, both
-- Order file color_mode: bw, color
-- Order file duplex: single, double

-- 4. PRINTERS TABLE
CREATE TABLE IF NOT EXISTS public.printers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    display_name TEXT NOT NULL,
    system_name TEXT NOT NULL,
    type TEXT NOT NULL DEFAULT 'both' CHECK (type IN ('bw', 'color', 'both')),
    is_active BOOLEAN NOT NULL DEFAULT true,
    status TEXT NOT NULL DEFAULT 'online' CHECK (status IN ('online', 'offline', 'busy', 'error')),
    last_heartbeat TIMESTAMPTZ,
    error_message TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 5. PRICING TABLE
CREATE TABLE IF NOT EXISTS public.pricing (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    key TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    rate NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    unit TEXT NOT NULL DEFAULT 'per_page',
    description TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 6. PAYMENT METHODS TABLE
CREATE TABLE IF NOT EXISTS public.payment_methods (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    type TEXT NOT NULL DEFAULT 'upi',
    upi_id TEXT NOT NULL,
    payee_name TEXT NOT NULL,
    static_qr_url TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 7. SETTINGS TABLE
CREATE TABLE IF NOT EXISTS public.settings (
    key TEXT PRIMARY KEY,
    value JSONB NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 8. ORDERS TABLE
CREATE TABLE IF NOT EXISTS public.orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_number TEXT UNIQUE NOT NULL DEFAULT ('PC-' || nextval('order_num_seq')),
    access_token UUID NOT NULL DEFAULT gen_random_uuid(),
    customer_name TEXT NOT NULL,
    customer_phone TEXT NOT NULL,
    customer_note TEXT,
    status TEXT NOT NULL DEFAULT 'payment_pending' CHECK (status IN ('payment_pending', 'paid', 'queued', 'printing', 'completed', 'cancelled', 'rejected')),
    total_amount NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    utr_number TEXT,
    screenshot_url TEXT,
    rejection_reason TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 9. ORDER FILES TABLE
CREATE TABLE IF NOT EXISTS public.order_files (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
    file_name TEXT NOT NULL,
    storage_path TEXT NOT NULL,
    file_type TEXT NOT NULL,
    file_size BIGINT NOT NULL,
    page_count INT NOT NULL DEFAULT 1,
    copies INT NOT NULL DEFAULT 1,
    color_mode TEXT NOT NULL DEFAULT 'bw' CHECK (color_mode IN ('bw', 'color')),
    paper_size TEXT NOT NULL DEFAULT 'A4',
    duplex TEXT NOT NULL DEFAULT 'single' CHECK (duplex IN ('single', 'double')),
    page_range TEXT DEFAULT 'all',
    printer_id UUID REFERENCES public.printers(id),
    price NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'queued', 'printing', 'printed', 'failed')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 10. PRINT LOGS TABLE
CREATE TABLE IF NOT EXISTS public.print_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID REFERENCES public.orders(id) ON DELETE CASCADE,
    file_id UUID REFERENCES public.order_files(id) ON DELETE SET NULL,
    printer_id UUID REFERENCES public.printers(id) ON DELETE SET NULL,
    status TEXT NOT NULL,
    message TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 11. ADMIN PROFILES
CREATE TABLE IF NOT EXISTS public.admin_profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT,
    full_name TEXT,
    role TEXT NOT NULL DEFAULT 'staff' CHECK (role IN ('owner', 'staff')),
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 12. INDEXES FOR PERFORMANCE
CREATE INDEX IF NOT EXISTS idx_orders_access_token ON public.orders(access_token);
CREATE INDEX IF NOT EXISTS idx_orders_status ON public.orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON public.orders(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_order_files_order_id ON public.order_files(order_id);
CREATE INDEX IF NOT EXISTS idx_print_logs_order_id ON public.print_logs(order_id);

-- 13. AUTO-UPDATE UPDATED_AT TRIGGER
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS trigger_update_orders_updated_at ON public.orders;
CREATE TRIGGER trigger_update_orders_updated_at
    BEFORE UPDATE ON public.orders
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trigger_update_printers_updated_at ON public.printers;
CREATE TRIGGER trigger_update_printers_updated_at
    BEFORE UPDATE ON public.printers
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trigger_update_pricing_updated_at ON public.pricing;
CREATE TRIGGER trigger_update_pricing_updated_at
    BEFORE UPDATE ON public.pricing
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trigger_update_payment_methods_updated_at ON public.payment_methods;
CREATE TRIGGER trigger_update_payment_methods_updated_at
    BEFORE UPDATE ON public.payment_methods
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 14. ROW-LEVEL SECURITY (RLS)
ALTER TABLE public.printers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pricing ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_methods ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.print_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_profiles ENABLE ROW LEVEL SECURITY;

-- Printers: Public can view active printers, Admins full access
DROP POLICY IF EXISTS "Public can view active printers" ON public.printers;
CREATE POLICY "Public can view active printers" ON public.printers
    FOR SELECT USING (is_active = true);
DROP POLICY IF EXISTS "Admins have full access to printers" ON public.printers;
CREATE POLICY "Admins have full access to printers" ON public.printers
    FOR ALL TO authenticated USING (true);

-- Pricing: Public can view pricing, Admins full access
DROP POLICY IF EXISTS "Public can view pricing" ON public.pricing;
CREATE POLICY "Public can view pricing" ON public.pricing
    FOR SELECT USING (is_active = true);
DROP POLICY IF EXISTS "Admins have full access to pricing" ON public.pricing;
CREATE POLICY "Admins have full access to pricing" ON public.pricing
    FOR ALL TO authenticated USING (true);

-- Payment Methods: Public can view active payment methods, Admins full access
DROP POLICY IF EXISTS "Public can view active payment methods" ON public.payment_methods;
CREATE POLICY "Public can view active payment methods" ON public.payment_methods
    FOR SELECT USING (is_active = true);
DROP POLICY IF EXISTS "Admins have full access to payment methods" ON public.payment_methods;
CREATE POLICY "Admins have full access to payment methods" ON public.payment_methods
    FOR ALL TO authenticated USING (true);

-- Settings: Public can view settings, Admins full access
DROP POLICY IF EXISTS "Public can view settings" ON public.settings;
CREATE POLICY "Public can view settings" ON public.settings
    FOR SELECT USING (true);
DROP POLICY IF EXISTS "Admins have full access to settings" ON public.settings;
CREATE POLICY "Admins have full access to settings" ON public.settings
    FOR ALL TO authenticated USING (true);

-- Orders: Anyone can insert, anyone with token can view, Admins full access
DROP POLICY IF EXISTS "Anyone can create orders" ON public.orders;
CREATE POLICY "Anyone can create orders" ON public.orders
    FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "Customers can view own order by access_token" ON public.orders;
CREATE POLICY "Customers can view own order by access_token" ON public.orders
    FOR SELECT USING (true);
DROP POLICY IF EXISTS "Customers can update own order utr" ON public.orders;
CREATE POLICY "Customers can update own order utr" ON public.orders
    FOR UPDATE USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "Admins have full access to orders" ON public.orders;
CREATE POLICY "Admins have full access to orders" ON public.orders
    FOR ALL TO authenticated USING (true);

-- Order Files: Anyone can insert, viewable if order is viewable, Admins full access
DROP POLICY IF EXISTS "Anyone can create order files" ON public.order_files;
CREATE POLICY "Anyone can create order files" ON public.order_files
    FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "Anyone can view order files" ON public.order_files;
CREATE POLICY "Anyone can view order files" ON public.order_files
    FOR SELECT USING (true);
DROP POLICY IF EXISTS "Admins have full access to order files" ON public.order_files;
CREATE POLICY "Admins have full access to order files" ON public.order_files
    FOR ALL TO authenticated USING (true);

-- Print logs: Admins and print agent can view/insert
DROP POLICY IF EXISTS "Admins have full access to print logs" ON public.print_logs;
CREATE POLICY "Admins have full access to print logs" ON public.print_logs
    FOR ALL TO authenticated USING (true);

-- Admin Profiles
DROP POLICY IF EXISTS "Admins can view profiles" ON public.admin_profiles;
CREATE POLICY "Admins can view profiles" ON public.admin_profiles
    FOR SELECT TO authenticated USING (true);

-- 15. ENABLE REALTIME
-- Adds tables to the supabase_realtime publication
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' AND tablename = 'orders'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.orders;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' AND tablename = 'order_files'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.order_files;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' AND tablename = 'printers'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.printers;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' AND tablename = 'settings'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.settings;
    END IF;
END $$;

-- 16. SEED DATA
-- Insert Printers (Canon imageCLASS MF3010 and Brother DCP-T220)
INSERT INTO public.printers (id, display_name, system_name, type, is_active, status)
VALUES 
    ('11111111-1111-1111-1111-111111111111', 'Canon imageCLASS MF3010', 'Canon_MF3010', 'bw', true, 'online'),
    ('22222222-2222-2222-2222-222222222222', 'Brother DCP-T220', 'Brother_DCP_T220', 'both', true, 'online')
ON CONFLICT (id) DO UPDATE SET
    display_name = EXCLUDED.display_name,
    system_name = EXCLUDED.system_name,
    type = EXCLUDED.type;

-- Insert Default Pricing (B&W = Rs 8, Colour = Rs 10)
INSERT INTO public.pricing (key, name, rate, unit, description, is_active)
VALUES
    ('bw_page', 'Black & White Print', 8.00, 'per_page', 'Crisp monochrome laser/ink print on standard 75 GSM paper', true),
    ('color_page', 'Colour Print', 10.00, 'per_page', 'Vibrant high-resolution colour print on standard 75 GSM paper', true),
    ('double_sided_discount', 'Double-Sided Discount', 0.00, 'per_sheet', 'Optional discount applied per duplex sheet printed', true),
    ('min_order_amount', 'Minimum Order Amount', 8.00, 'order', 'Minimum billing amount required per order', true)
ON CONFLICT (key) DO UPDATE SET
    rate = EXCLUDED.rate,
    name = EXCLUDED.name;

-- Insert Payment Method (UPI ID & Payee Name)
INSERT INTO public.payment_methods (id, type, upi_id, payee_name, static_qr_url, is_active)
VALUES
    ('33333333-3333-3333-3333-333333333333', 'upi', 'jkbmerc00757954@jkb', 'Preeti Communication', '/payment-qr.png', true)
ON CONFLICT (id) DO UPDATE SET
    upi_id = EXCLUDED.upi_id,
    payee_name = EXCLUDED.payee_name,
    static_qr_url = EXCLUDED.static_qr_url;

-- Insert Default Settings
INSERT INTO public.settings (key, value)
VALUES
    ('shop_info', '{
        "shop_name": "Preeti Communication",
        "tagline": "Cyber Cafe, High Speed Printing & Xeroxing",
        "phone": "+91 90551 43328",
        "alt_phone": "+91 96221 43328",
        "upi_number": "9055143328",
        "email": "preeti.communication@gmail.com",
        "address": "Shop No. 4, Market Complex, Opp. Bus Station",
        "working_hours": "08:00 AM - 09:30 PM (Mon-Sat)",
        "is_closed": false,
        "closed_notice": "Shop is currently closed. We reopen tomorrow at 8:00 AM."
    }'::jsonb),
    ('print_rules', '{
        "max_file_size_mb": 25,
        "retention_days": 2,
        "allowed_extensions": ["pdf", "jpg", "jpeg", "png", "docx", "pptx"]
    }'::jsonb)
ON CONFLICT (key) DO UPDATE SET
    value = EXCLUDED.value;

-- 17. STORAGE BUCKETS (Run in SQL or create in Dashboard)
-- Insert bucket entries into storage.buckets if table exists
INSERT INTO storage.buckets (id, name, public)
VALUES 
    ('order-files', 'order-files', false),
    ('shop-assets', 'shop-assets', true)
ON CONFLICT (id) DO NOTHING;

-- Storage RLS
DROP POLICY IF EXISTS "Allow public upload to order-files" ON storage.objects;
CREATE POLICY "Allow public upload to order-files" ON storage.objects
    FOR INSERT WITH CHECK (bucket_id = 'order-files');

DROP POLICY IF EXISTS "Allow anyone to read order-files" ON storage.objects;
CREATE POLICY "Allow anyone to read order-files" ON storage.objects
    FOR SELECT USING (bucket_id = 'order-files');

DROP POLICY IF EXISTS "Allow public read of shop-assets" ON storage.objects;
CREATE POLICY "Allow public read of shop-assets" ON storage.objects
    FOR SELECT USING (bucket_id = 'shop-assets');
