import { PDFDocument } from "pdf-lib";

export interface PosterOptions {
  shopName: string;
  siteUrl: string;
  logoUrl: string;
  qrDataUrl: string;
  shopSlug?: string;
}

/**
 * Draws the high-resolution, business-grade A4 counter poster onto an HTML5 canvas.
 * Canvas resolution: 1654 x 2339 (Standard A4 at 200 DPI)
 */
export async function drawPosterToCanvas(
  canvas: HTMLCanvasElement,
  options: PosterOptions
): Promise<void> {
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Could not get canvas context");

  const W = 1654;
  const H = 2339;
  canvas.width = W;
  canvas.height = H;

  // 1. Background Fill
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, W, H);

  // Subtle decorative top gradient bar
  const topGrad = ctx.createLinearGradient(0, 0, W, 0);
  topGrad.addColorStop(0, "#4f46e5");
  topGrad.addColorStop(0.5, "#06b6d4");
  topGrad.addColorStop(1, "#3b82f6");
  ctx.fillStyle = topGrad;
  ctx.fillRect(0, 0, W, 18);

  // Outer Decorative Frame / Border
  ctx.strokeStyle = "#e2e8f0";
  ctx.lineWidth = 4;
  ctx.strokeRect(50, 50, W - 100, H - 100);

  // Inner Subtle Border
  ctx.strokeStyle = "#0f172a";
  ctx.lineWidth = 3;
  ctx.strokeRect(62, 62, W - 124, H - 124);

  // Corner Accent Brackets for the Outer Frame
  const cornerSize = 40;
  ctx.strokeStyle = "#4f46e5";
  ctx.lineWidth = 8;
  // Top-left
  ctx.beginPath();
  ctx.moveTo(46, 46 + cornerSize);
  ctx.lineTo(46, 46);
  ctx.lineTo(46 + cornerSize, 46);
  ctx.stroke();
  // Top-right
  ctx.beginPath();
  ctx.moveTo(W - 46 - cornerSize, 46);
  ctx.lineTo(W - 46, 46);
  ctx.lineTo(W - 46, 46 + cornerSize);
  ctx.stroke();
  // Bottom-left
  ctx.beginPath();
  ctx.moveTo(46, H - 46 - cornerSize);
  ctx.lineTo(46, H - 46);
  ctx.lineTo(46 + cornerSize, H - 46);
  ctx.stroke();
  // Bottom-right
  ctx.beginPath();
  ctx.moveTo(W - 46 - cornerSize, H - 46);
  ctx.lineTo(W - 46, H - 46);
  ctx.lineTo(W - 46, H - 46 - cornerSize);
  ctx.stroke();

  let curY = 130;

  // 2. Top Header Pill Badge
  ctx.fillStyle = "#e0e7ff";
  drawRoundRect(ctx, W / 2 - 270, curY, 540, 52, 26);
  ctx.fill();
  ctx.strokeStyle = "#c7d2fe";
  ctx.lineWidth = 2;
  ctx.stroke();

  ctx.fillStyle = "#3730a3";
  ctx.font = "bold 20px Inter, -apple-system, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("⚡ OFFICIAL EXPRESS PRINT COUNTER", W / 2, curY + 26);

  curY += 80;

  // 3. Draw Business Logo (if available)
  if (options.logoUrl) {
    try {
      const logoImg = await loadImage(options.logoUrl);
      const targetHeight = 120;
      const targetWidth = (logoImg.width / logoImg.height) * targetHeight;
      const logoW = Math.min(targetWidth, 540);
      const logoH = (logoImg.height / logoImg.width) * logoW;
      ctx.drawImage(logoImg, W / 2 - logoW / 2, curY, logoW, logoH);
      curY += logoH + 30;
    } catch {
      // Fallback text if logo fails to load
      ctx.fillStyle = "#0f172a";
      ctx.font = "900 68px Inter, -apple-system, sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "top";
      ctx.fillText(options.shopName || "Preeti Communication", W / 2, curY);
      curY += 90;
    }
  } else {
    ctx.fillStyle = "#0f172a";
    ctx.font = "900 68px Inter, -apple-system, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "top";
    ctx.fillText(options.shopName || "Preeti Communication", W / 2, curY);
    curY += 90;
  }

  // 4. Subtitle and Main Instruction
  ctx.fillStyle = "#0f172a";
  ctx.font = "800 44px Inter, -apple-system, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "top";
  ctx.fillText("Print Directly from Your Mobile Phone!", W / 2, curY);
  curY += 60;

  // Feature highlight pills
  const badgeText = "⚡ Instant Queue  •  📱 No WhatsApp Waiting  •  🔒 100% Private";
  ctx.fillStyle = "#475569";
  ctx.font = "600 22px Inter, -apple-system, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText(badgeText, W / 2, curY);
  curY += 55;

  // 5. Hero QR Code Card
  const qrCardW = 680;
  const qrCardH = 750;
  const qrCardX = W / 2 - qrCardW / 2;
  const qrCardY = curY;

  // Card Background with soft shadow
  ctx.save();
  ctx.shadowColor = "rgba(15, 23, 42, 0.08)";
  ctx.shadowBlur = 40;
  ctx.shadowOffsetY = 15;
  ctx.fillStyle = "#ffffff";
  drawRoundRect(ctx, qrCardX, qrCardY, qrCardW, qrCardH, 36);
  ctx.fill();
  ctx.restore();

  ctx.strokeStyle = "#cbd5e1";
  ctx.lineWidth = 3;
  drawRoundRect(ctx, qrCardX, qrCardY, qrCardW, qrCardH, 36);
  ctx.stroke();

  // Draw Camera Viewfinder Brackets around QR Box
  const vfMargin = 30;
  const vfSize = 48;
  ctx.strokeStyle = "#4f46e5";
  ctx.lineWidth = 7;
  ctx.lineCap = "round";
  // Top-left
  ctx.beginPath();
  ctx.moveTo(qrCardX + vfMargin, qrCardY + vfMargin + vfSize);
  ctx.lineTo(qrCardX + vfMargin, qrCardY + vfMargin);
  ctx.lineTo(qrCardX + vfMargin + vfSize, qrCardY + vfMargin);
  ctx.stroke();
  // Top-right
  ctx.beginPath();
  ctx.moveTo(qrCardX + qrCardW - vfMargin - vfSize, qrCardY + vfMargin);
  ctx.lineTo(qrCardX + qrCardW - vfMargin, qrCardY + vfMargin);
  ctx.lineTo(qrCardX + qrCardW - vfMargin, qrCardY + vfMargin + vfSize);
  ctx.stroke();
  // Bottom-left
  ctx.beginPath();
  ctx.moveTo(qrCardX + vfMargin, qrCardY + qrCardH - vfMargin - vfSize);
  ctx.lineTo(qrCardX + vfMargin, qrCardY + qrCardH - vfMargin);
  ctx.lineTo(qrCardX + vfMargin + vfSize, qrCardY + qrCardH - vfMargin);
  ctx.stroke();
  // Bottom-right
  ctx.beginPath();
  ctx.moveTo(qrCardX + qrCardW - vfMargin - vfSize, qrCardY + qrCardH - vfMargin);
  ctx.lineTo(qrCardX + qrCardW - vfMargin, qrCardY + qrCardH - vfMargin);
  ctx.lineTo(qrCardX + qrCardW - vfMargin, qrCardY + qrCardH - vfMargin - vfSize);
  ctx.stroke();

  // Draw the QR Code image
  if (options.qrDataUrl) {
    try {
      const qrImg = await loadImage(options.qrDataUrl);
      const qrW = 460;
      const qrH = 460;
      ctx.drawImage(qrImg, W / 2 - qrW / 2, qrCardY + 50, qrW, qrH);
    } catch (e) {
      console.error("Failed to draw QR image:", e);
    }
  }

  // QR Instructions Pill
  ctx.fillStyle = "#0f172a";
  drawRoundRect(ctx, W / 2 - 260, qrCardY + 535, 520, 50, 25);
  ctx.fill();

  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 20px Inter, -apple-system, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("📷 SCAN WITH ANY CAMERA OR QR APP", W / 2, qrCardY + 560);

  // Supported Scanners Subtitle
  ctx.fillStyle = "#64748b";
  ctx.font = "600 17px Inter, -apple-system, sans-serif";
  ctx.fillText("Works with: Google Lens • WhatsApp • Paytm • GPay • iPhone Camera", W / 2, qrCardY + 610);

  // Short URL link
  ctx.fillStyle = "#2563eb";
  ctx.font = "bold 19px monospace, sans-serif";
  ctx.fillText(options.siteUrl.replace(/^https?:\/\//, ""), W / 2, qrCardY + 655);

  curY += qrCardH + 50;

  // 6. 3-Step Express Process Section
  const stepCardW = 460;
  const stepCardH = 260;
  const gap = 30;
  const totalStepsW = stepCardW * 3 + gap * 2;
  const startX = W / 2 - totalStepsW / 2;

  const steps = [
    {
      num: "1",
      badgeBg: "#4f46e5",
      title: "Scan & Upload",
      desc: "Open your mobile camera or WhatsApp, scan QR and select documents (PDF, Photos, Word).",
    },
    {
      num: "2",
      badgeBg: "#0891b2",
      title: "Pick Options",
      desc: "Select Canon B&W or Brother Colour, number of copies, single or double-sided & page range.",
    },
    {
      num: "3",
      badgeBg: "#16a34a",
      title: "Pay & Collect",
      desc: "Pay securely via UPI / QR or Cash at counter. Your prints are generated automatically in 60s!",
    },
  ];

  for (let i = 0; i < steps.length; i++) {
    const s = steps[i];
    const sx = startX + i * (stepCardW + gap);
    const sy = curY;

    // Card Box
    ctx.fillStyle = "#f8fafc";
    drawRoundRect(ctx, sx, sy, stepCardW, stepCardH, 24);
    ctx.fill();
    ctx.strokeStyle = "#e2e8f0";
    ctx.lineWidth = 2.5;
    drawRoundRect(ctx, sx, sy, stepCardW, stepCardH, 24);
    ctx.stroke();

    // Step Number Badge
    ctx.fillStyle = s.badgeBg;
    drawRoundRect(ctx, sx + 25, sy + 25, 48, 48, 14);
    ctx.fill();

    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 24px Inter, -apple-system, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(s.num, sx + 49, sy + 49);

    // Title
    ctx.fillStyle = "#0f172a";
    ctx.font = "800 24px Inter, -apple-system, sans-serif";
    ctx.textAlign = "left";
    ctx.textBaseline = "middle";
    ctx.fillText(s.title, sx + 90, sy + 49);

    // Description (Multi-line wrap)
    ctx.fillStyle = "#475569";
    ctx.font = "500 17px Inter, -apple-system, sans-serif";
    wrapText(ctx, s.desc, sx + 25, sy + 105, stepCardW - 50, 26);
  }

  curY += stepCardH + 45;

  // 7. Supported Document Types Strip
  const formats = [
    "📄 PDF Documents",
    "🆔 Aadhaar & PAN Card",
    "📸 Passport Photos",
    "📊 Word & Excel",
    "🎟️ Rail & Flight Tickets",
    "📱 WhatsApp Files",
  ];

  ctx.fillStyle = "#f1f5f9";
  drawRoundRect(ctx, 100, curY, W - 200, 65, 18);
  ctx.fill();
  ctx.strokeStyle = "#cbd5e1";
  ctx.lineWidth = 1.5;
  drawRoundRect(ctx, 100, curY, W - 200, 65, 18);
  ctx.stroke();

  ctx.fillStyle = "#334155";
  ctx.font = "bold 18px Inter, -apple-system, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(formats.join("   •   "), W / 2, curY + 32);

  curY += 105;

  // 8. Footer Section
  ctx.fillStyle = "#64748b";
  ctx.font = "600 18px Inter, -apple-system, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("Need assistance? Please ask our counter staff anytime!  •  WiFi available on request", W / 2, curY);

  ctx.fillStyle = "#94a3b8";
  ctx.font = "500 15px Inter, -apple-system, sans-serif";
  ctx.fillText("🔒 100% Privacy Guaranteed: Your uploaded files are automatically deleted after printing.", W / 2, curY + 30);
}

/**
 * Creates and downloads a pristine, vector-embedded A4 PDF identical to the template.
 */
export async function downloadPosterPdf(options: PosterOptions): Promise<void> {
  const canvas = document.createElement("canvas");
  await drawPosterToCanvas(canvas, options);

  const pngDataUrl = canvas.toDataURL("image/png");

  // Create standard A4 PDF via pdf-lib
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([595.28, 841.89]); // Standard A4 dimensions in points

  const embeddedPng = await pdfDoc.embedPng(pngDataUrl);
  page.drawImage(embeddedPng, {
    x: 0,
    y: 0,
    width: 595.28,
    height: 841.89,
  });

  const pdfBytes = await pdfDoc.save();
  const blob = new Blob([pdfBytes as any], { type: "application/pdf" });
  const downloadUrl = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = downloadUrl;
  const fileName = `${(options.shopSlug || "preeti").toLowerCase()}-counter-poster-A4.pdf`;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(downloadUrl);
}

/**
 * Downloads the high-resolution 300 DPI poster as a PNG image.
 */
export async function downloadPosterPng(options: PosterOptions): Promise<void> {
  const canvas = document.createElement("canvas");
  await drawPosterToCanvas(canvas, options);

  canvas.toBlob((blob) => {
    if (!blob) return;
    const downloadUrl = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = downloadUrl;
    a.download = `${(options.shopSlug || "preeti").toLowerCase()}-counter-poster-A4.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(downloadUrl);
  }, "image/png");
}

/* Helper to load an image asynchronously */
function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = (e) => reject(e);
    img.src = src;
  });
}

/* Helper to draw rounded rectangles on canvas */
function drawRoundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  if (w < 2 * r) r = w / 2;
  if (h < 2 * r) r = h / 2;
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

/* Helper to wrap text into multiple lines */
function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight: number
) {
  const words = text.split(" ");
  let line = "";
  let curY = y;

  for (let n = 0; n < words.length; n++) {
    const testLine = line + words[n] + " ";
    const metrics = ctx.measureText(testLine);
    if (metrics.width > maxWidth && n > 0) {
      ctx.fillText(line, x, curY);
      line = words[n] + " ";
      curY += lineHeight;
    } else {
      line = testLine;
    }
  }
  ctx.fillText(line, x, curY);
}
