# PrintQR - Shop PC Local Print Agent
**Shop**: Preeti Communication  
**Printers**: Canon imageCLASS MF3010 (Mono Laser) & Brother DCP-T220 (Colour Ink Tank)

---

## Overview
The Print Agent is a lightweight Node.js background service running directly on the Preeti Communication shop computer. It listens to Supabase for newly confirmed print orders (`queued`), downloads the documents, converts DOCX/PPTX/Images to PDF using headless LibreOffice, and automatically sends the files to the correct printer using **SumatraPDF** (Windows) or **CUPS** (Linux).

---

## Prerequisites (Shop PC Setup)

### 1. Install Node.js
If not already installed, download and install Node.js (v18 or newer) from [nodejs.org](https://nodejs.org).

### 2. Install SumatraPDF (Windows)
SumatraPDF provides ultra-fast, silent command-line printing for Windows.
Open PowerShell on the shop PC and run:
```powershell
winget install SumatraPDF.SumatraPDF
```
*Ensure `SumatraPDF.exe` is in your Windows PATH (usually installed at `C:\Users\<user>\AppData\Local\SumatraPDF\SumatraPDF.exe` or `C:\Program Files\SumatraPDF`).*

### 3. Install LibreOffice (for Office Document Conversion)
Headless LibreOffice converts incoming Word (.docx), PowerPoint (.pptx), and image files to crisp printable PDFs.
Open PowerShell on the shop PC and run:
```powershell
winget install TheDocumentFoundation.LibreOffice
```
*Verify by running `soffice --version` in terminal.*

---

## Discover Exact Printer Device Names

On the shop PC, run:
```powershell
Get-Printer | Select-Object Name
```
Note the exact names for:
1. **Canon imageCLASS MF3010** (e.g. `Canon MF3010` or `Canon_MF3010`)
2. **Brother DCP-T220** (e.g. `Brother DCP-T220 Printer`)

---

## Agent Installation & Configuration

1. Open terminal inside the `print-agent` directory:
   ```powershell
   cd D:\PrintQR\print-agent
   npm install
   ```

2. Create your `.env` file from `.env.example`:
   ```powershell
   copy .env.example .env
   ```

3. Edit `.env` with your actual Supabase URL, Service Role Key, and printer names:
   ```env
   SUPABASE_URL=https://your-project-id.supabase.co
   SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here
   CANON_PRINTER_NAME=Canon MF3010
   BROTHER_PRINTER_NAME=Brother DCP-T220 Printer
   ```

4. Test run in dry-run mode (simulation without paper):
   ```powershell
   npm run test
   ```

5. Start the live print agent:
   ```powershell
   npm start
   ```

---

## Running as an Automatic Windows Service (Auto-Start on PC Boot)

To ensure the agent starts automatically whenever the shop computer is turned on, use **NSSM** (Non-Sucking Service Manager):

1. Install NSSM via winget or download from [nssm.cc](https://nssm.cc):
   ```powershell
   winget install NSSM.NSSM
   ```

2. Register the service:
   ```powershell
   nssm install PrintQRAgent "C:\Program Files\nodejs\node.exe" "D:\PrintQR\print-agent\agent.js"
   nssm set PrintQRAgent AppDirectory "D:\PrintQR\print-agent"
   nssm start PrintQRAgent
   ```

The agent will now run silently in the background on Windows startup, automatically pulling customer print jobs from your Vercel site!
