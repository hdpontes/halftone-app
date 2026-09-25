import { createCanvas, loadImage } from 'canvas';
import sharp from 'sharp';

/**
 * Professional halftone engine for DTF printing
 * Supports CMYK channel separation with screen angles
 */

const CHANNEL_CONFIGS = {
  cyan:    { angle: 15,  color: [0, 188, 212] },
  magenta: { angle: 75,  color: [233, 30, 99] },
  yellow:  { angle: 90,  color: [255, 215, 0]  },
  black:   { angle: 45,  color: [0, 0, 0]      },
};

/**
 * Convert sRGB to linear light
 */
function srgbToLinear(v) {
  const n = v / 255;
  return n <= 0.04045 ? n / 12.92 : Math.pow((n + 0.055) / 1.055, 2.4);
}

/**
 * Apply dot gain correction (compensates for ink spread on DTF film)
 */
function applyDotGain(value, gain = 0.18) {
  // Murray-Davies dot gain model
  return value + gain * value * (1 - value);
}

/**
 * Generate halftone for a single grayscale channel
 */
function generateHalftonChannel(grayData, width, height, options) {
  const {
    lpi,
    dpi,
    angle,
    dotShape = 'round',
    dotGain = 0.18,
    minDot = 0.03,
    maxDot = 0.97,
  } = options;

  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, width, height);
  ctx.fillStyle = '#000000';

  // Cell size in pixels
  const cellSize = dpi / lpi;
  const halfCell = cellSize / 2;
  const angleRad = (angle * Math.PI) / 180;
  const cosA = Math.cos(angleRad);
  const sinA = Math.sin(angleRad);

  // Extend scan bounds to cover rotated grid
  const diagonal = Math.ceil(Math.sqrt(width * width + height * height));
  const startU = -diagonal;
  const startV = -diagonal;
  const endU = diagonal + width;
  const endV = diagonal + height;

  for (let u = startU; u < endU; u += cellSize) {
    for (let v = startV; v < endV; v += cellSize) {
      // Center of this screen cell in screen coords
      const cx_screen = u + halfCell;
      const cy_screen = v + halfCell;

      // Rotate back to image coords
      const cx = cx_screen * cosA - cy_screen * sinA + width / 2;
      const cy = cx_screen * sinA + cy_screen * cosA + height / 2;

      // Sample image at this position (bilinear)
      const ix = Math.round(cx);
      const iy = Math.round(cy);

      if (ix < 0 || ix >= width || iy < 0 || iy >= height) continue;

      const idx = iy * width + ix;
      const gray = grayData[idx] / 255; // 0=dark, 1=light
      const ink = 1 - gray; // ink coverage

      // Apply dot gain
      let coverage = applyDotGain(ink, dotGain);

      // Clamp to min/max dot
      coverage = Math.max(minDot, Math.min(maxDot, coverage));

      // Skip empty dots
      if (coverage < minDot) continue;

      // Calculate dot radius
      const maxR = halfCell * 0.95;
      const r = maxR * Math.sqrt(coverage);

      // Draw dot with rotation transform
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(angleRad);

      drawDot(ctx, dotShape, r, coverage);

      ctx.restore();
    }
  }

  return canvas;
}

function drawDot(ctx, shape, r, coverage) {
  switch (shape) {
    case 'round':
      ctx.beginPath();
      ctx.arc(0, 0, r, 0, Math.PI * 2);
      ctx.fill();
      break;

    case 'ellipse':
      ctx.beginPath();
      ctx.ellipse(0, 0, r, r * 0.75, 0, 0, Math.PI * 2);
      ctx.fill();
      break;

    case 'square':
      const s = r * 1.6;
      ctx.fillRect(-s / 2, -s / 2, s, s);
      break;

    case 'diamond': {
      const d = r * 1.4;
      ctx.beginPath();
      ctx.moveTo(0, -d);
      ctx.lineTo(d, 0);
      ctx.lineTo(0, d);
      ctx.lineTo(-d, 0);
      ctx.closePath();
      ctx.fill();
      break;
    }

    case 'line': {
      const lw = r * 2;
      ctx.fillRect(-r * 2, -lw / 4, r * 4, lw / 2);
      break;
    }

    default:
      ctx.beginPath();
      ctx.arc(0, 0, r, 0, Math.PI * 2);
      ctx.fill();
  }
}

/**
 * Separate image into CMYK channels
 */
async function separateCMYK(imageBuffer) {
  const { data, info } = await sharp(imageBuffer)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const { width, height } = info;
  const pixels = data.length / 4;

  const C = new Uint8Array(pixels);
  const M = new Uint8Array(pixels);
  const Y = new Uint8Array(pixels);
  const K = new Uint8Array(pixels);

  for (let i = 0; i < pixels; i++) {
    const r = srgbToLinear(data[i * 4]);
    const g = srgbToLinear(data[i * 4 + 1]);
    const b = srgbToLinear(data[i * 4 + 2]);

    const Kv = 1 - Math.max(r, g, b);
    if (Kv >= 1) {
      C[i] = M[i] = Y[i] = 0;
      K[i] = 255;
    } else {
      C[i] = Math.round(((1 - r - Kv) / (1 - Kv)) * 255);
      M[i] = Math.round(((1 - g - Kv) / (1 - Kv)) * 255);
      Y[i] = Math.round(((1 - b - Kv) / (1 - Kv)) * 255);
      K[i] = Math.round(Kv * 255);
    }
  }

  return { C, M, Y, K, width, height };
}

/**
 * Main halftone processing function
 */
export async function processHalftone(imageBuffer, options = {}) {
  const {
    lpi = 65,
    dpi = 300,
    dotShape = 'round',
    dotGain = 0.18,
    minDot = 0.03,
    maxDot = 0.97,
    outputMode = 'composite', // 'composite' | 'separation'
    channels = ['cyan', 'magenta', 'yellow', 'black'],
    ucr = true, // Under Color Removal
    ucAmount = 0.7,
  } = options;

  // Get image dimensions
  const meta = await sharp(imageBuffer).metadata();
  const { width, height } = meta;

  // Separate CMYK
  const { C, M, Y, K } = await separateCMYK(imageBuffer);

  // UCR: reduce CMY where K is strong
  let Cf = C, Mf = M, Yf = Y, Kf = K;
  if (ucr) {
    for (let i = 0; i < C.length; i++) {
      const k = K[i] / 255;
      const reduction = k * ucAmount * 255;
      Cf[i] = Math.max(0, C[i] - reduction);
      Mf[i] = Math.max(0, M[i] - reduction);
      Yf[i] = Math.max(0, Y[i] - reduction);
      Kf[i] = Math.min(255, K[i] + (reduction * 0.5));
    }
  }

  const channelData = { cyan: Cf, magenta: Mf, yellow: Yf, black: Kf };
  const results = {};

  // Process each channel
  for (const ch of channels) {
    const config = CHANNEL_CONFIGS[ch];
    const grayData = channelData[ch];

    const canvas = generateHalftonChannel(grayData, width, height, {
      lpi,
      dpi,
      angle: config.angle,
      dotShape,
      dotGain,
      minDot,
      maxDot,
    });

    results[ch] = canvas;
  }

  if (outputMode === 'separation') {
    // Return individual channel buffers
    const separations = {};
    for (const ch of channels) {
      separations[ch] = results[ch].toBuffer();
    }
    return separations;
  }

  // Composite mode: blend channels with multiply
  const outputCanvas = createCanvas(width, height);
  const outCtx = outputCanvas.getContext('2d');

  // White background
  outCtx.fillStyle = '#ffffff';
  outCtx.fillRect(0, 0, width, height);

  // Blend each channel
  for (const ch of channels) {
    const config = CHANNEL_CONFIGS[ch];
    const [r, g, b] = config.color;

    // Tint the channel canvas
    const tintCanvas = createCanvas(width, height);
    const tintCtx = tintCanvas.getContext('2d');

    // Draw halftone dots
    tintCtx.drawImage(results[ch], 0, 0);

    // Apply ink color via multiply blend
    tintCtx.globalCompositeOperation = 'source-in';
    tintCtx.fillStyle = `rgb(${r},${g},${b})`;
    tintCtx.fillRect(0, 0, width, height);

    // Multiply onto output
    outCtx.globalCompositeOperation = 'multiply';
    outCtx.drawImage(tintCanvas, 0, 0);
  }

  // Convert to PNG buffer with metadata
  const pngBuffer = outputCanvas.toBuffer('image/png');

  // Re-embed 300dpi metadata via sharp
  const finalBuffer = await sharp(pngBuffer)
    .withMetadata({
      density: dpi,
    })
    .png({ compressionLevel: 6 })
    .toBuffer();

  return { composite: finalBuffer };
}

/**
 * Get thumbnail preview (faster, lower res)
 */
export async function processHalftoneThumbnail(imageBuffer, options = {}) {
  const meta = await sharp(imageBuffer).metadata();
  const maxDim = 800;
  const scale = Math.min(1, maxDim / Math.max(meta.width, meta.height));

  const previewBuffer = await sharp(imageBuffer)
    .resize(Math.round(meta.width * scale), Math.round(meta.height * scale))
    .png()
    .toBuffer();

  return processHalftone(previewBuffer, {
    ...options,
    dpi: 72,
    lpi: options.lpi ? Math.round(options.lpi * scale) : 35,
  });
}
