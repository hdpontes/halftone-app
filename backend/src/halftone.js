import { createCanvas } from 'canvas';
import sharp from 'sharp';

/**
 * Professional RGB Halftone Engine for DTF printing
 *
 * Approach: Color-halftone in RGB space
 * - Split image into R, G, B channels
 * - Apply halftone screen to each channel at classic angles (R:15° G:75° B:45°)
 * - Reconstruct full-color RGB image from screened channels
 * - Result: colored halftone dots, ready for DTF print
 */

const CHANNEL_ANGLES = { r: 15, g: 75, b: 45 };

function applyDotGain(ink, gain) {
  // Murray-Davies: compensates for ink spread on DTF film
  return ink + gain * ink * (1 - ink);
}

/**
 * Apply halftone screen to a single 8-bit grayscale channel
 * Returns Uint8Array (0-255) of screened values
 */
function screenChannel(channelData, width, height, opts) {
  const { lpi, dpi, angle, dotShape, dotGain, minDot, maxDot } = opts;

  const cellSize = dpi / lpi;
  const halfCell = cellSize / 2;
  const angleRad = (angle * Math.PI) / 180;
  const cosA = Math.cos(angleRad);
  const sinA = Math.sin(angleRad);

  // Build screened output — start at 255 (white/full channel value)
  const out = new Uint8Array(width * height).fill(255);

  const diagonal = Math.ceil(Math.sqrt(width * width + height * height));

  for (let u = -diagonal; u < diagonal + width; u += cellSize) {
    for (let v = -diagonal; v < diagonal + height; v += cellSize) {
      const cxS = u + halfCell;
      const cyS = v + halfCell;

      // Rotate cell center back to image space
      const cx = cxS * cosA - cyS * sinA + width / 2;
      const cy = cxS * sinA + cyS * cosA + height / 2;

      const ix = Math.round(cx);
      const iy = Math.round(cy);
      if (ix < 0 || ix >= width || iy < 0 || iy >= height) continue;

      // Channel value: 0=no ink (white bg), 255=full ink (full color)
      const channelVal = channelData[iy * width + ix] / 255; // 0–1
      let coverage = applyDotGain(channelVal, dotGain);
      coverage = Math.max(minDot, Math.min(maxDot, coverage));

      const maxR = halfCell * 0.95;
      const r = maxR * Math.sqrt(coverage);
      if (r < 0.5) continue;

      // Rasterize dot into output buffer
      const bx0 = Math.max(0, Math.floor(cx - maxR - 1));
      const by0 = Math.max(0, Math.floor(cy - maxR - 1));
      const bx1 = Math.min(width  - 1, Math.ceil(cx + maxR + 1));
      const by1 = Math.min(height - 1, Math.ceil(cy + maxR + 1));

      for (let py = by0; py <= by1; py++) {
        for (let px = bx0; px <= bx1; px++) {
          if (isInsideDot(px - cx, py - cy, r, dotShape, angleRad)) {
            out[py * width + px] = 0; // dot present = full ink in this cell
          }
        }
      }
    }
  }

  return out;
}

function isInsideDot(dx, dy, r, shape, angle) {
  // Rotate point into dot's local space
  const cosA = Math.cos(-angle);
  const sinA = Math.sin(-angle);
  const lx = dx * cosA - dy * sinA;
  const ly = dx * sinA + dy * cosA;

  switch (shape) {
    case 'square': {
      const h = r * 0.9;
      return Math.abs(lx) <= h && Math.abs(ly) <= h;
    }
    case 'diamond': {
      const d = r * 1.2;
      return (Math.abs(lx) + Math.abs(ly)) <= d;
    }
    case 'ellipse':
      return (lx * lx) / (r * r) + (ly * ly) / ((r * 0.7) * (r * 0.7)) <= 1;
    case 'line':
      return Math.abs(ly) <= r * 0.35 && Math.abs(lx) <= r * 2;
    default: // round
      return dx * dx + dy * dy <= r * r;
  }
}

/**
 * Core halftone processor — RGB in, RGB halftone out
 */
export async function processHalftone(imageBuffer, options = {}) {
  const {
    lpi      = 65,
    dpi      = 300,
    dotShape = 'round',
    dotGain  = 0.15,
    minDot   = 0.02,
    maxDot   = 0.98,
  } = options;

  console.log(`[halftone] ${dpi}dpi ${lpi}lpi shape=${dotShape} gain=${dotGain}`);

  // Normalize: flatten alpha over white, output raw RGB
  const { data, info } = await sharp(imageBuffer)
    .flatten({ background: { r: 255, g: 255, b: 255 } })
    .ensureAlpha(1)
    .raw()
    .toBuffer({ resolveWithObject: true });

  const { width, height } = info;
  const pixels = width * height;
  console.log(`[halftone] image ${width}x${height} px`);

  // Extract R, G, B channels
  // For color halftone: each channel represents how much of that color is present
  // We screen the INVERSE (ink) and reconstruct
  const Rch = new Uint8Array(pixels);
  const Gch = new Uint8Array(pixels);
  const Bch = new Uint8Array(pixels);

  for (let i = 0; i < pixels; i++) {
    Rch[i] = data[i * 4];
    Gch[i] = data[i * 4 + 1];
    Bch[i] = data[i * 4 + 2];
  }

  // Invert each channel to get ink coverage (dark = more ink)
  const Rinv = Rch.map(v => 255 - v);
  const Ginv = Gch.map(v => 255 - v);
  const Binv = Bch.map(v => 255 - v);

  const commonOpts = { lpi, dpi, dotShape, dotGain, minDot, maxDot };

  // Screen each channel independently
  const Rs = screenChannel(Rinv, width, height, { ...commonOpts, angle: CHANNEL_ANGLES.r });
  const Gs = screenChannel(Ginv, width, height, { ...commonOpts, angle: CHANNEL_ANGLES.g });
  const Bs = screenChannel(Binv, width, height, { ...commonOpts, angle: CHANNEL_ANGLES.b });

  // Reconstruct RGB output
  // screened channel: 0 = dot present (ink) → output = original color
  //                   255 = no dot (paper white) → output = 255
  const outData = Buffer.alloc(pixels * 4);
  for (let i = 0; i < pixels; i++) {
    // Each screened channel tells us where dots are (0) vs paper (255)
    // Dot presence means we print the original channel color at that spot
    const rDot = Rs[i] === 0 ? 1 : 0;
    const gDot = Gs[i] === 0 ? 1 : 0;
    const bDot = Bs[i] === 0 ? 1 : 0;

    // Reconstruct: dot = original channel value, no dot = 255 (white paper)
    outData[i * 4]     = rDot ? Rch[i] : 255;
    outData[i * 4 + 1] = gDot ? Gch[i] : 255;
    outData[i * 4 + 2] = bDot ? Bch[i] : 255;
    outData[i * 4 + 3] = 255;
  }

  // Encode to PNG with DPI metadata
  const finalBuffer = await sharp(outData, { raw: { width, height, channels: 4 } })
    .withMetadata({ density: dpi })
    .png({ compressionLevel: 6 })
    .toBuffer();

  console.log(`[halftone] done — ${(finalBuffer.length / 1024).toFixed(0)} KB`);
  return { composite: finalBuffer };
}

/**
 * Fast preview — downscale → halftone at screen resolution
 */
export async function processHalftoneThumbnail(imageBuffer, options = {}) {
  const meta = await sharp(imageBuffer).metadata();
  const maxDim = 800;
  const scale = Math.min(1, maxDim / Math.max(meta.width, meta.height));

  const preview = await sharp(imageBuffer)
    .resize(Math.round(meta.width * scale), Math.round(meta.height * scale))
    .png()
    .toBuffer();

  return processHalftone(preview, {
    ...options,
    dpi: 96,
    lpi: Math.max(15, Math.round((options.lpi || 65) * scale * 0.5)),
  });
}
