/**
 * Renders an availability calendar to a canvas and exports it as a PNG image,
 * designed to be shared with chalet guests. It deliberately shows only whether
 * a day is Available or Booked (plus an optional price) — never any guest or
 * status details.
 */

export type DayAvailability = 'available' | 'booked';

export interface CalendarImageDay {
  iso: string;
  dayNumber: number;
  inMonth: boolean;
  status: DayAvailability;
  /** Regular price for this day (OMR). 0 = hide. */
  price: number;
  /** Optional offer price (OMR). 0 = none. */
  discount: number;
}

export interface CalendarImageOptions {
  title: string;
  monthLabel: string;
  /** 7 weekday labels aligned to the grid's week start. */
  weekdayLabels: string[];
  /** Day cells, length must be a multiple of 7. */
  days: CalendarImageDay[];
  showPrices: boolean;
  logoSrc?: string | null;
}

// Brand palette (kept in sync with styles.css).
const COLORS = {
  bg: '#f4e9d7',
  card: '#ffffff',
  border: '#e0cdb0',
  text: '#3d2a1a',
  muted: '#8a6f55',
  primary: '#7a4f2e',
  availableBg: '#e6f4e6',
  availableBorder: '#bfe0bf',
  availableText: '#1f7a34',
  bookedBg: '#f6dcd7',
  bookedBorder: '#e6b9af',
  bookedText: '#b23a2e',
  outside: '#efe5d4',
};

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
): void {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + w, y, x + w, y + h, radius);
  ctx.arcTo(x + w, y + h, x, y + h, radius);
  ctx.arcTo(x, y + h, x, y, radius);
  ctx.arcTo(x, y, x + w, y, radius);
  ctx.closePath();
}

function loadImage(src: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

function priceText(value: number): string {
  return `${value.toFixed(2)} OMR`;
}

/** Render the calendar to a high-resolution canvas. */
export async function renderCalendarCanvas(
  opts: CalendarImageOptions,
): Promise<HTMLCanvasElement> {
  const scale = 2; // crisp on retina / when zoomed
  const W = 920;
  const pad = 40;
  const headerH = 104;
  const weekdayH = 40;
  const rows = Math.ceil(opts.days.length / 7);
  const gap = 8;
  const gridW = W - pad * 2;
  const cellW = (gridW - gap * 6) / 7;
  const cellH = opts.showPrices ? 104 : 84;
  const legendH = 64;
  const H = pad + headerH + weekdayH + rows * (cellH + gap) + legendH + pad;

  const canvas = document.createElement('canvas');
  canvas.width = W * scale;
  canvas.height = H * scale;
  const ctx = canvas.getContext('2d')!;
  ctx.scale(scale, scale);
  ctx.textBaseline = 'middle';

  // Background
  ctx.fillStyle = COLORS.bg;
  ctx.fillRect(0, 0, W, H);

  // ---- Header ----
  const logo = opts.logoSrc ? await loadImage(opts.logoSrc) : null;
  let titleX = pad;
  if (logo) {
    const size = 56;
    ctx.save();
    roundRect(ctx, pad, pad + 6, size, size, 12);
    ctx.clip();
    ctx.drawImage(logo, pad, pad + 6, size, size);
    ctx.restore();
    titleX = pad + size + 16;
  }
  ctx.fillStyle = COLORS.text;
  ctx.font = '700 30px "Segoe UI", system-ui, sans-serif';
  ctx.fillText(opts.title, titleX, pad + 24);
  ctx.fillStyle = COLORS.primary;
  ctx.font = '600 20px "Segoe UI", system-ui, sans-serif';
  ctx.fillText(opts.monthLabel, titleX, pad + 54);

  // "Availability" tag on the right
  const tag = 'Availability';
  ctx.font = '600 15px "Segoe UI", system-ui, sans-serif';
  const tagW = ctx.measureText(tag).width + 28;
  roundRect(ctx, W - pad - tagW, pad + 12, tagW, 32, 16);
  ctx.fillStyle = COLORS.primary;
  ctx.fill();
  ctx.fillStyle = '#fbf2e3';
  ctx.fillText(tag, W - pad - tagW + 14, pad + 29);

  // ---- Weekday header ----
  const gridTop = pad + headerH;
  ctx.font = '700 15px "Segoe UI", system-ui, sans-serif';
  ctx.textAlign = 'center';
  for (let i = 0; i < 7; i += 1) {
    const x = pad + i * (cellW + gap);
    ctx.fillStyle = COLORS.muted;
    ctx.fillText(opts.weekdayLabels[i] ?? '', x + cellW / 2, gridTop + weekdayH / 2);
  }
  ctx.textAlign = 'left';

  // ---- Day cells ----
  const cellsTop = gridTop + weekdayH;
  opts.days.forEach((day, index) => {
    const col = index % 7;
    const row = Math.floor(index / 7);
    const x = pad + col * (cellW + gap);
    const y = cellsTop + row * (cellH + gap);

    if (!day.inMonth) {
      roundRect(ctx, x, y, cellW, cellH, 12);
      ctx.fillStyle = COLORS.outside;
      ctx.fill();
      return;
    }

    const isAvail = day.status === 'available';
    roundRect(ctx, x, y, cellW, cellH, 12);
    ctx.fillStyle = isAvail ? COLORS.availableBg : COLORS.bookedBg;
    ctx.fill();
    ctx.lineWidth = 1.5;
    ctx.strokeStyle = isAvail ? COLORS.availableBorder : COLORS.bookedBorder;
    ctx.stroke();

    // Day number
    ctx.fillStyle = COLORS.text;
    ctx.font = '700 22px "Segoe UI", system-ui, sans-serif';
    ctx.fillText(String(day.dayNumber), x + 12, y + 22);

    // Status pill
    const label = isAvail ? 'Available' : 'Booked';
    ctx.font = '700 12px "Segoe UI", system-ui, sans-serif';
    ctx.fillStyle = isAvail ? COLORS.availableText : COLORS.bookedText;
    ctx.textAlign = 'right';
    ctx.fillText(label, x + cellW - 12, y + 22);
    ctx.textAlign = 'left';

    // Price (available days only)
    if (opts.showPrices && isAvail && day.price > 0) {
      const hasOffer = day.discount > 0 && day.discount < day.price;
      if (hasOffer) {
        ctx.font = '400 13px "Segoe UI", system-ui, sans-serif';
        ctx.fillStyle = COLORS.muted;
        const original = priceText(day.price);
        ctx.fillText(original, x + 12, y + cellH - 34);
        const ow = ctx.measureText(original).width;
        ctx.strokeStyle = COLORS.muted;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(x + 12, y + cellH - 34);
        ctx.lineTo(x + 12 + ow, y + cellH - 34);
        ctx.stroke();

        ctx.font = '800 17px "Segoe UI", system-ui, sans-serif';
        ctx.fillStyle = COLORS.availableText;
        ctx.fillText(priceText(day.discount), x + 12, y + cellH - 14);
      } else {
        ctx.font = '800 17px "Segoe UI", system-ui, sans-serif';
        ctx.fillStyle = COLORS.primary;
        ctx.fillText(priceText(day.price), x + 12, y + cellH - 16);
      }
    }
  });

  // ---- Legend ----
  const legendY = cellsTop + rows * (cellH + gap) + 18;
  const drawSwatch = (sx: number, fill: string, stroke: string, text: string) => {
    roundRect(ctx, sx, legendY, 18, 18, 5);
    ctx.fillStyle = fill;
    ctx.fill();
    ctx.lineWidth = 1.5;
    ctx.strokeStyle = stroke;
    ctx.stroke();
    ctx.fillStyle = COLORS.text;
    ctx.font = '600 15px "Segoe UI", system-ui, sans-serif';
    ctx.fillText(text, sx + 26, legendY + 9);
    return sx + 26 + ctx.measureText(text).width + 28;
  };
  let lx = pad;
  lx = drawSwatch(lx, COLORS.availableBg, COLORS.availableBorder, 'Available');
  drawSwatch(lx, COLORS.bookedBg, COLORS.bookedBorder, 'Booked');

  return canvas;
}

/** Convert a canvas to a PNG Blob. */
export function canvasToBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) {
        resolve(blob);
      } else {
        reject(new Error('Could not create image.'));
      }
    }, 'image/png');
  });
}

/** Render and download the calendar as a PNG file. */
export async function downloadCalendarImage(
  filename: string,
  opts: CalendarImageOptions,
): Promise<void> {
  const canvas = await renderCalendarCanvas(opts);
  const blob = await canvasToBlob(canvas);
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename.endsWith('.png') ? filename : `${filename}.png`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/**
 * Render and share the calendar image via the Web Share API when available
 * (great on mobile). Returns true if shared, false if sharing is unsupported
 * (caller can fall back to download).
 */
export async function shareCalendarImage(
  filename: string,
  opts: CalendarImageOptions,
): Promise<boolean> {
  const canvas = await renderCalendarCanvas(opts);
  const blob = await canvasToBlob(canvas);
  const name = filename.endsWith('.png') ? filename : `${filename}.png`;
  const file = new File([blob], name, { type: 'image/png' });
  const nav = navigator as Navigator & {
    canShare?: (data: ShareData) => boolean;
    share?: (data: ShareData) => Promise<void>;
  };
  if (nav.canShare && nav.share && nav.canShare({ files: [file] })) {
    try {
      await nav.share({ files: [file], title: opts.title, text: opts.monthLabel });
      return true;
    } catch {
      return false;
    }
  }
  return false;
}
