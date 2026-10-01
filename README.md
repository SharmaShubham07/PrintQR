# PrintQR - Cyber Cafe & Print Shop Express Automation
### Built for Preeti Communication � Next.js App Router � Supabase Cloud � Local Print Agent � Vercel Ready

---

## ?? Key Features

1. **Customer Mobile-First Self-Service (No login required)**:
   - Customers scan the shop counter QR on their mobile phone.
   - **Language Toggle**: Full support for English, Hindi (`??????`), and Gujarati (`???????`).
   - **Auto Page Counting**: Detects pages automatically in PDFs (using client-side `pdf-lib`) and images, with manual override for Word/PowerPoint documents.
   - **Multi-File Options**: Configure copies, page range (`all` or `1-3,5`), single/double-sided, and paper size per file.
   - **Printer Routing Rules**:
     - *Canon imageCLASS MF3010*: Monochrome laser.
     - *Brother DCP-T220*: Colour + B&W ink tank.
     - Enforces business logic: Colour documents can only be routed to the Brother DCP-T220.
   - **Dynamic UPI Payment**: Generates dynamic UPI QR codes and deep links (`upi://pay?pa=...&am=...&cu=INR&tn=...`) for instant 1-tap checkout via Google Pay, PhonePe, Paytm, or BHIM.
   - **Live Real-time Status**: Unguessable tracking token URL (`/order/[token]`) with live updates:
     `Payment Pending` ? `Confirmed` ? `Queued` ? `Printing` ? `Completed` (with confetti celebration and counter pickup banner).

2. **Admin Counter Control (`/admin`)**:
   - **Dashboard**: Today's revenue, order count, B&W vs Colour page breakdown, pending payment alerts, and printer status cards.
   - **Live Orders**: Real-time incoming order stream with audio chime notifications. Confirm payment, reject payment with custom reason, send to print, reprint, or cancel.
   - **Pricing Manager**: Edit B&W (?8) and Colour (?10) rates, double-sided discounts, and minimum order limits.
   - **Payment QRs**: Manage active UPI ID, payee name, and upload counter stand fallback QR.
   - **Printers**: Manage system device mappings (`Canon_MF3010`, `Brother_DCP_T220`) and monitor print agent heartbeats.
   - **Emergency "Shop Closed" Kill-Switch**: Temporarily pause customer checkout during holidays or paper restocking.
   - **Printable Shop Poster**: One-click printable A4 counter poster with custom QR code ready to hang in the shop.
   - **Reports & CSV Export**: Daily and monthly revenue figures with instant `.csv` download.

3. **Shop PC Local Print Agent (`/print-agent`)**:
   - Standalone Node.js service running on the cyber cafe PC (Windows or Linux).
   - Real-time WebSocket listener + 5-second polling fallback.
   - Downloads private files via Supabase service key.
   - Headless LibreOffice converts DOCX, PPTX, and images to PDF on the fly.
   - Sends print jobs to SumatraPDF CLI on Windows or CUPS `lp` on Linux.
   - Heartbeat ping so the web dashboard displays "Agent Online".

---

## ??? Database Setup (Supabase Cloud)

Since you have Supabase open in your Chrome browser:

1. In Supabase, create a new project (e.g. named `Preeti-Communication`).
2. Go to the **SQL Editor** on the left menu.
3. Open the file `supabase/migrations/20240101_init.sql` from this repository.
4. Copy the entire contents, paste it into the Supabase SQL Editor, and click **Run**.
   - This creates all 8 tables (`orders`, `order_files`, `printers`, `pricing`, `payment_methods`, `settings`, `print_logs`, `admin_profiles`).
   - Enables Row-Level Security (RLS) policies.
   - Configures Supabase Realtime subscriptions.
   - Pre-seeds printers (Canon MF3010, Brother DCP-T220), pricing (?8 B&W, ?10 Colour), and Preeti Communication settings.
5. In Supabase, go to **Project Settings** > **API**:
   - Copy **Project URL** ? `NEXT_PUBLIC_SUPABASE_URL`
   - Copy **anon public key** ? `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - Copy **service_role secret key** ? `SUPABASE_SERVICE_ROLE_KEY`

---

## ?? Deploying to Vercel

The application is built with standard Next.js 14 App Router and is 100% ready for Vercel deployment:

1. Push your `D:\PrintQR` repository to GitHub or GitLab.
2. In [Vercel Dashboard](https://vercel.com), click **Add New...** > **Project** and import your repository.
3. In the **Environment Variables** section, add:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `NEXT_PUBLIC_SITE_URL` (set to your Vercel URL, e.g. `https://your-app.vercel.app`)
4. Click **Deploy**. Vercel will build and deploy the customer portal and admin panel in under 2 minutes.

---

## ?? Local Development

1. Open PowerShell in `D:\PrintQR`:
   ```powershell
   cd D:\PrintQR
   copy .env.example .env.local
   # Fill in your Supabase credentials in .env.local
   ```
2. Verify database connection:
   ```powershell
   npm run db:check
   ```
3. Start the Next.js development server:
   ```powershell
   npm run dev
   ```
4. Open [http://localhost:3000](http://localhost:3000) for the Customer Site.  
   Open [http://localhost:3000/admin](http://localhost:3000/admin) for the Admin Dashboard.

---

## ??? Shop PC Print Agent Installation

Follow the detailed instructions in [`print-agent/README.md`](file:///D:/PrintQR/print-agent/README.md):

1. Install SumatraPDF & LibreOffice on the shop computer via PowerShell:
   ```powershell
   winget install SumatraPDF.SumatraPDF
   winget install TheDocumentFoundation.LibreOffice
   ```
2. Configure `print-agent/.env` with your Supabase Service Role Key and printer names:
   ```env
   SUPABASE_URL=https://your-project.supabase.co
   SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
   CANON_PRINTER_NAME=Canon_MF3010
   BROTHER_PRINTER_NAME=Brother_DCP_T220
   ```
3. Test in dry-run mode:
   ```powershell
   cd D:\PrintQR\print-agent
   npm run test
   ```
4. Start live agent or install as an auto-starting Windows background service using NSSM.

---

## ? Verification & Test Checklist

- [x] **Trilingual Toggle**: Toggle between English, Hindi, and Gujarati on the customer site and confirm all UI text adapts.
- [x] **Auto Page Detection**: Upload a PDF or Image; confirm page count is detected and manual override modal functions.
- [x] **Printer Constraints**:
  - Select Colour mode -> Verify Canon MF3010 is disabled and user is guided to Brother DCP-T220.
  - Select B&W mode -> Verify both Canon and Brother are selectable.
- [x] **Price Calculation**:
  - 3 pages B&W x 2 copies @ ?8 = ?48.00.
  - 2 pages Colour x 1 copy @ ?10 = ?20.00.
  - Total = ?68.00.
- [x] **Payment Verification**:
  - Verify dynamic UPI QR renders with correct amount and payee name.
  - Submit 12-digit UTR number and confirm status transitions to `payment_pending`.
- [x] **Admin Confirmation**:
  - Open `/admin/orders`, view incoming order, play audio chime, and click **Confirm & Print**.
  - Customer live tracking page immediately switches from `Payment Pending` to `Queued` / `Printing` via Realtime.
- [x] **Print Agent Execution**:
  - Print agent picks up queued order, downloads file, converts document via LibreOffice, and dispatches to SumatraPDF.
  - Customer page transitions to `Completed` with confetti celebration!
