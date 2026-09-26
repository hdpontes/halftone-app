import { createCanvas } from 'canvas';
import sharp from 'sharp';

/**
 * Professional halftone engine for DTF printing
 * Supports CMYK channel separation with screen angles
 */

const CHANNEL_CONFIGS = {
  cyan:    { angle: 15  },
  magenta: { angle: 75  },
  yellow:  { angle: 90  },
  black:   { angle: 45  },
};

function applyDotGain(value, gain = 0.18) {
  return value + gain * value * (1 - value);
}

/**
 * Generate halftone for a single grayscale channel (Uint8Array, 0=black 255=white)
 * Returns a canvas with black dots on white background
 */
function generateHalftoneChannel(grayData, width, height, options) {
  const { lpi, dpi, angle, dotShape = 'round', dotGain = 0.18, minDot = 0.03, maxDot = 0.97 } = options;

  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, width, height);
  ctx.fillStyle = '#000000';

  const cellSize = dpi / lpi;
  const halfCell = cellSize / 2;
  const angleRad = (angle * Math.PI) / 180;
  const cosA = Math.cos(angleRad);
  const sinA = Math.sin(angleRad);
  const diagonal = Math.ceil(Math.sqrt(width * width + height * height));

  for (let u = -diagonal; u < diagonal + width; u += cellSize) {
    for (let v = -diagonal; v < diagonal + height; v += cellSize) {
      const cx_screen = u + halfCell;
      const cy_screen = v + halfCell;
      const cx = cx_screen * cosA - cy_screen * sinA + width / 2;
      const cy = cx_screen * sinA + cy_screen * cosA + height / 2;

      const ix = Math.round(cx);
      const iy = Math.round(cy);
      if (ix < 0 || ix >= width || iy < 0 || iy >= height) continue;

      const gray = grayData[iy * width + ix] / 255; // 0=dark,1=light
      const ink = 1 - gray;
      let coverage = applyDotGain(ink, dotGain);
      coverage = Math.max(minDot, Math.min(maxDot, coverage));
      if (coverage < minDot) continue;

      const maxR = halfCell * 0.95;
      const r = maxR * Math.sqrt(coverage);

      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(angleRad);
      drawDot(ctx, dotShape, r);
      ctx.restore();
    }
  }

  return canvas;
}

function drawDot(ctx, shape, r) {
  ctx.beginPath();
  switch (shape) {
    case 'square': {
      const s = r * 1.6;
      ctx.rect(-s / 2, -s / 2, s, s);
      break;
    }
    case 'diamond':
      ctx.moveTo(0, -r * 1.4);
      ctx.lineTo(r * 1.4, 0);
      ctx.lineTo(0, r * 1.4);
      ctx.lineTo(-r * 1.4, 0);
      ctx.closePath();
      break;
    case 'ellipse':
      ctx.ellipse(0, 0, r, r * 0.7, 0, 0, Math.PI * 2);
      break;
    case 'line':
      ctx.rect(-r * 2, -r * 0.3, r * 4, r * 0.6);
      break;
    default: // round
      ctx.arc(0, 0, r, 0, Math.PI * 2);
  }
  ctx.fill();
}

/**
 * Separate sRGB image into CMYK channels using sharp (returns raw RGBA)
 */
async function separateCMYK(imageBuffer) {
  const { data, info } = await sharp(imageBuffer)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const { width, height } = info;
  const pixels = width * height;

  const C = new Uint8Array(pixels);
  const M = new Uint8Array(pixels);
  const Y = new Uint8Array(pixels);
  const K = new Uint8Array(pixels);

  for (let i = 0; i < pixels; i++) {
    const r = data[i * 4]     / 255;
    const g = data[i * 4 + 1] / 255;
    const b = data[i * 4 + 2] / 255;
    const a = data[i * 4 + 3] / 255;

    // Composite over white for transparent pixels
    const R = r * a + (1 - a);
    const G = g * a + (1 - a);
    const B = b * a + (1 - a);

    const Kv = 1 - Math.max(R, G, B);
    if (Kv >= 0.9999) {
      C[i] = 0; M[i] = 0; Y[i] = 0; K[i] = 255;
    } else {
      const d = 1 - Kv;
      C[i] = Math.round(((1 - R - Kv) / d) * 255);
      M[i] = Math.round(((1 - G - Kv) / d) * 255);
      Y[i] = Math.round(((1 - B - Kv) / d) * 255);
      K[i] = Math.round(Kv * 255);
    }
  }

  return { C, M, Y, K, width, height };
}

/**
 * Main composite halftone — renders CMYK dots multiplicatively onto white
 */
export async function processHalftone(imageBuffer, options = {}) {
  const {
    lpi        = 65,
    dpi        = 300,
    dotShape   = 'round',
    dotGain    = 0.18,
    minDot     = 0.03,
    maxDot     = 0.97,
    channels   = ['cyan', 'magenta', 'yellow', 'black'],
    ucr        = true,
    ucAmount   = 0.7,
  } = options;

  console.log(`[halftone] ${dpi}dpi ${lpi}lpi ${dotShape} ucr=${ucr}`);

  const meta = await sharp(imageBuffer).metadata();
  const { width, height } = meta;
  console.log(`[halftone] image ${width}x${height}`);

  let { C, M, Y, K } = await separateCMYK(imageBuffer);

  // UCR
  if (ucr) {
    for (let i = 0; i < C.length; i++) {
      const reduction = (K[i] / 255) * ucAmount * 255;
      C[i] = Math.max(0, C[i] - reduction);
      M[i] = Math.max(0, M[i] - reduction);
      Y[i] = Math.max(0, Y[i] - reduction);
    }
  }

  const channelData = { cyan: C, magenta: M, yellow: Y, black: K };

  // Ink colors for multiply blend (CMYK subtractive)
  const INK_COLORS = {
    cyan:    [0,   188, 212],
    magenta: [233, 30,  99 ],
    yellow:  [255, 220, 0  ],
    black:   [20,  20,  20 ],
  };

  // Output canvas — white background
  const output = createCanvas(width, height);
  const outCtx = output.getContext('2d');
  outCtx.fillStyle = '#ffffff';
  outCtx.fillRect(0, 0, width, height);

  for (const ch of channels) {
    const grayData = channelData[ch];
    const dotCanvas = generateHalftoneChannel(grayData, width, height, {
      lpi, dpi, angle: CHANNEL_CONFIGS[ch].angle,
      dotShape, dotGain, minDot, maxDot,
    });

    // Tint dots with ink color
    const tint = createCanvas(width, height);
    const tCtx = tint.getContext('2d');
    tCtx.drawImage(dotCanvas, 0, 0);

    // Replace black dots with ink color, keep white
    // Use source-in won't work here; instead invert + colorize
    const imgData = tCtx.getImageData(0, 0, width, height);
    const [ir, ig, ib] = INK_COLORS[ch];
    for (let i = 0; i < imgData.data.length; i += 4) {
      const luma = imgData.data[i]; // grayscale: 0=dot, 255=paper
      const dot = 1 - luma / 255;  // 1 where dot, 0 where paper
      imgData.data[i]     = Math.round(255 - dot * (255 - ir));
      imgData.data[i + 1] = Math.round(255 - dot * (255 - ig));
      imgData.data[i + 2] = Math.round(255 - dot * (255 - ib));
      imgData.data[i + 3] = 255;
    }
    tCtx.putImageData(imgData, 0, 0);

    // Multiply blend onto output
    outCtx.globalCompositeOperation = 'multiply';
    outCtx.drawImage(tint, 0, 0);
  }

  // Reset composite op
  outCtx.globalCompositeOperation = 'source-over';

  const pngBuffer = output.toBuffer('image/png');

  // Embed DPI metadata
  const finalBuffer = await sharp(pngBuffer)
    .withMetadata({ density: dpi })
    .png({ compressionLevel: 6 })
    .toBuffer();

  console.log(`[halftone] done, output ${finalBuffer.length} bytes`);
  return { composite: finalBuffer };
}

/**
 * Fast preview — downscale first, then halftone
 */
export async function processHalftoneThumbnail(imageBuffer, options = {}) {
  const meta = await sharp(imageBuffer).metadata();
  const maxDim = 600;
  const scale = Math.min(1, maxDim / Math.max(meta.width, meta.height));

  const previewBuffer = await sharp(imageBuffer)
    .resize(Math.round(meta.width * scale), Math.round(meta.height * scale))
    .png()
    .toBuffer();

  const previewLpi = Math.max(20, Math.round((options.lpi || 65) * scale));

  return processHalftone(previewBuffer, {
    ...options,
    dpi: 72,
    lpi: previewLpi,
  });
}
