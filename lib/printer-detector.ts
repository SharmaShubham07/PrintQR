import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

export interface DetectedPrinter {
  id: string;
  display_name: string;
  system_name: string;
  type: "bw" | "color" | "both";
  status: "online" | "offline";
  is_default: boolean;
  port_name: string;
  driver_name: string;
  is_active: boolean;
}

/**
 * Detects real physical and virtual printers installed on the Windows host in real-time.
 */
export async function detectWindowsPrinters(): Promise<DetectedPrinter[]> {
  if (process.platform !== "win32") {
    return [];
  }

  try {
    const psCommand = `powershell -NoProfile -Command "Get-CimInstance -ClassName Win32_Printer | Select-Object Name, DriverName, PrinterStatus, WorkOffline, Default, PortName | ConvertTo-Json -Compress"`;
    const { stdout } = await execAsync(psCommand, { timeout: 8000 });
    
    if (!stdout || !stdout.trim()) {
      return [];
    }

    const raw = JSON.parse(stdout.trim());
    const printerList = Array.isArray(raw) ? raw : [raw];

    return printerList.map((p: any, index: number) => {
      const name = String(p.Name || `Printer-${index + 1}`).trim();
      const driver = String(p.DriverName || "").toLowerCase();
      const lowerName = name.toLowerCase();
      const isOffline = Boolean(p.WorkOffline) || p.PrinterStatus === 7;
      const isDefault = Boolean(p.Default);
      const portName = String(p.PortName || "");

      // Capability auto-detection
      let type: "bw" | "color" | "both" = "both";
      if (
        lowerName.includes("mf3010") ||
        lowerName.includes("lbp") ||
        lowerName.includes("laserjet") ||
        driver.includes("mono") ||
        driver.includes("black and white")
      ) {
        type = "bw";
      } else if (
        lowerName.includes("brother") ||
        lowerName.includes("t220") ||
        lowerName.includes("color") ||
        lowerName.includes("colour") ||
        lowerName.includes("ink") ||
        driver.includes("color")
      ) {
        type = "both";
      }

      const id = generateDeterministicId(name);

      return {
        id,
        display_name: name,
        system_name: name,
        type,
        status: isOffline ? "offline" : "online",
        is_default: isDefault,
        port_name: portName,
        driver_name: p.DriverName || "",
        is_active: true,
      };
    });
  } catch (err: any) {
    console.error("Error detecting Windows printers:", err.message);
    return [];
  }
}

function generateDeterministicId(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    const char = name.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0;
  }
  const hex = Math.abs(hash).toString(16).padStart(8, "0");
  return `${hex.slice(0, 8)}-4444-4444-4444-${hex.slice(0, 12).padEnd(12, "0")}`;
}
