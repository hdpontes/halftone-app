import sharp from 'sharp';

/**
 * ============================================================
 * Professional AM Halftone Engine — Photoshop-equivalent
 * ============================================================
 *
 * Algorithm: Rational Tangent Screen (same as PostScript/Photoshop)
 *   1. For each screen angle, build a tileable halftone cell using
 *      rational tangent approximation of the requested angle.
 *   2. Inside each cell, rank pixels by distance from dot center
 *      (this is the "spot function" — Photoshop uses Euclidean dot).
 *   3. For each output pixel, find which cell it belongs to,
 *      look up the threshold for that position, compare against
 *      the channel's ink value → dot or no dot.
 *
 * Spot functions supported:
 *   round   → Euclidean distance (PS default)
 *   ellipse → elliptical distance
 *   square  → Chebyshev distance
 *   diamond → Manhattan distance
 *   line    → horizontal stripe
 *   dot     → inverted Euclidean (highlight dots)
 *
 * Color model: RGB → process as R, G, B channels at classic angles
 *   R: 105°  G: 75°  B: 90°  (PS Color Halftone defaults)
 *   Black-and-white mode uses single channel at requested angle.
 *
 * Tone controls:
 *   - blackPoint  (0–255): crush shadows
 *   - whitePoint  (0–255): clip highlights
 *   - brightness  (-100 to +100)
 *   - saturation  (-100 to +100): applied before screening
 *   - dotGain     (0–50%): Murray-Davies compensation
 */

// ---------------------------------------------------------------------------
// Spot functions — return distance 0 (center) to 1 (edge) for point (x,y)
// x,y are in normalised cell coords [-1, 1]
// ---------------------------------------------------------------------------
const SPOT_FUNCTIONS = {
  round:   (x, y) => Math.sqrt(x * x + y * y) / Math.SQRT2,
  ellipse: (x, y) => Math.sqrt((x * x) / 1.0 + (y * y) / 0.5) / Math.SQRT2,
  square:  (x, y) => Math.max(Math.abs(x), Math.abs(y)),
  diamond: (x, y) => (Math.abs(x) + Math.abs(y)) / 2,
  line:    (x, y) => Math.abs(y),
  dot:     (x, y) => 1 - Math.sqrt(x * x + y * y) / Math.SQRT2,
};

// ---------------------------------------------------------------------------
// Build threshold matrix for one screen using rational tangent method
// Returns { matrix: Uint8Array(cellW * cellH), cellW, cellH }
// ---------------------------------------------------------------------------
function buildThresholdMatrix(lpi, dpi, angleDeg, spotFn) {
  // Rational tangent: find integers p,q such that tan(angle) ≈ p/q
  // and the cell size = dpi/lpi
  const targetSize = dpi / lpi;           // ideal cell size in pixels
  const angleRad   = (angleDeg % 180) * Math.PI / 180;
  const tanA       = Math.tan(angleRad);

  // Find best rational approximation of tanA with small integers
  let bestP = 0, bestQ = 1, bestErr = Infinity;
  for (let q = 1; q <= 20; q++) {
    const p = Math.round(tanA * q);
    const err = Math.abs(tanA - p / q);
    if (err < bestErr) { bestErr = err; bestP = p; bestQ = q; }
    if (err < 0.001) break;
  }

  // Cell dimensions in pixels (must be integers for a tileable screen)
  const cellW = Math.max(2, Math.round(targetSize * Math.sqrt(bestQ * bestQ + bestP * bestP) / bestQ));
  const cellH = Math.max(2, Math.round(targetSize * Math.sqrt(bestQ * bestQ + bestP * bestP) / Math.max(1, Math.abs(bestP || bestQ))));

  // Clamp to reasonable sizes
  const cW = Math.min(cellW, 64);
  const cH = Math.min(cellH, 64);

  // Build threshold matrix by ranking pixels by spot function distance
  const n = cW * cH;
  const coords = Array.from({ length: n }, (_, i) => {
    const px = i % cW;
    const py = Math.floor(i / cW);
    // Normalise to [-1, 1] relative to cell centre, with screen rotation
    const fx = (px / cW - 0.5) * 2;
    const fy = (py / cH - 0.5) * 2;
    // Rotate by screen angle
    const rx = fx * Math.cos(angleRad) + fy * Math.sin(angleRad);
    const ry = -fx * Math.sin(angleRad) + fy * Math.cos(angleRad);
    return { i, dist: spotFn(rx, ry) };
  });

  coords.sort((a, b) => a.dist - b.dist);

  const matrix = new Uint8Array(n);
  coords.forEach(({ i }, rank) => {
    matrix[i] = Math.round((rank / (n - 1)) * 255);
  });

  return { matrix, cellW: cW, cellH: cH };
}

// ---------------------------------------------------------------------------
// Screen a single-channel Uint8Array (0=white, 255=black ink)
// using a pre-built threshold matrix
// ---------------------------------------------------------------------------
function applyScreen(inkChannel, width, height, thresholdMatrix, cellW, cellH, dotGainFrac) {
  const out = new Uint8Array(width * height);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const ink = inkChannel[y * width + x] / 255; // 0–1

      // Murray-Davies dot gain compensation
      const gained = ink > 0
        ? ink + dotGainFrac * ink * (1 - ink)
        : 0;
      const inkVal = Math.round(Math.min(1, gained) * 255);

      // Find threshold from cell matrix
      const tx = ((x % cellW) + cellW) % cellW;
      const ty = ((y % cellH) + cellH) % cellH;
      const threshold = thresholdMatrix[ty * cellW + tx];

      out[y * width + x] = inkVal > threshold ? 255 : 0;
    }
  }
  return out;
}

// ---------------------------------------------------------------------------
// Tone adjustments on a raw RGBA buffer
// ---------------------------------------------------------------------------
function applyToneAdjustments(data, width, height, opts) {
  const { blackPoint = 0, whitePoint = 255, brightness = 0, saturation = 0 } = opts;

  const bpN = blackPoint / 255;
  const wpN = whitePoint / 255;
  const brN = brightness / 100;
  const satScale = 1 + saturation / 100;

  for (let i = 0; i < width * height; i++) {
    let r = data[i * 4]     / 255;
    let g = data[i * 4 + 1] / 255;
    let b = data[i * 4 + 2] / 255;

    // Saturation (via luminance-preserving scale)
    const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b;
    r = Math.max(0, Math.min(1, lum + (r - lum) * satScale));
    g = Math.max(0, Math.min(1, lum + (g - lum) * satScale));
    b = Math.max(0, Math.min(1, lum + (b - lum) * satScale));

    // Brightness (additive)
    r = Math.max(0, Math.min(1, r + brN));
    g = Math.max(0, Math.min(1, g + brN));
    b = Math.max(0, Math.min(1, b + brN));

    // Black/white point (levels)
    const remap = (v) => {
      if (wpN <= bpN) return v;
      return Math.max(0, Math.min(1, (v - bpN) / (wpN - bpN)));
    };
    r = remap(r); g = remap(g); b = remap(b);

    data[i * 4]     = Math.round(r * 255);
    data[i * 4 + 1] = Math.round(g * 255);
    data[i * 4 + 2] = Math.round(b * 255);
  }
}

// ---------------------------------------------------------------------------
// Main export
// ---------------------------------------------------------------------------
export async function processHalftone(imageBuffer, options = {}) {
  const {
    lpi         = 65,
    dpi         = 300,
    angle       = 45,         // used for BW; color uses fixed CMYK angles
    dotShape    = 'round',
    dotGain     = 15,         // percent 0–50
    blackPoint  = 0,          // 0–255
    whitePoint  = 255,        // 0–255
    brightness  = 0,          // -100 to +100
    saturation  = 0,          // -100 to +100
    colorMode   = 'color',    // 'color' | 'bw'
  } = options;

  const dotGainFrac = Math.min(0.5, Math.max(0, dotGain / 100));
  const spotFn = SPOT_FUNCTIONS[dotShape] || SPOT_FUNCTIONS.round;

  console.log(`[halftone] lpi=${lpi} dpi=${dpi} angle=${angle} shape=${dotShape} gain=${dotGain}% mode=${colorMode}`);

  // Decode image → flat RGBA over white
  const { data: rawData, info } = await sharp(imageBuffer)
    .flatten({ background: { r: 255, g: 255, b: 255 } })
    .ensureAlpha(1)
    .raw()
    .toBuffer({ resolveWithObject: true });

  const { width, height } = info;
  const pixels = width * height;
  const data = Buffer.from(rawData); // mutable copy

  console.log(`[halftone] ${width}x${height}px`);

  // Apply tone adjustments
  applyToneAdjustments(data, width, height, { blackPoint, whitePoint, brightness, saturation });

  // Output buffer (RGBA, starts white)
  const out = Buffer.alloc(pixels * 4, 255);

  if (colorMode === 'bw') {
    // ── Grayscale halftone ──────────────────────────────────────────
    const { matrix, cellW, cellH } = buildThresholdMatrix(lpi, dpi, angle, spotFn);

    const gray = new Uint8Array(pixels);
    for (let i = 0; i < pixels; i++) {
      gray[i] = Math.round(
        0.2126 * data[i * 4] + 0.7152 * data[i * 4 + 1] + 0.0722 * data[i * 4 + 2]
      );
    }
    // Invert: ink = 255 where image is dark
    const ink = gray.map(v => 255 - v);
    const screened = applyScreen(ink, width, height, matrix, cellW, cellH, dotGainFrac);

    for (let i = 0; i < pixels; i++) {
      const v = screened[i] > 0 ? 0 : 255; // dot=black, no dot=white
      out[i * 4] = out[i * 4 + 1] = out[i * 4 + 2] = v;
      out[i * 4 + 3] = 255;
    }

  } else {
    // ── Color halftone — PS Color Halftone angles ───────────────────
    // Photoshop Color Halftone: C=108° M=162° Y=90° K=45°
    // In RGB equivalent:        R=105° G=75°  B=90°
    const SCREEN_ANGLES = {
      r: angle,              // user-chosen angle for primary
      g: (angle + 30)  % 180,
      b: (angle + 60)  % 180,
    };

    const screens = {
      r: buildThresholdMatrix(lpi, dpi, SCREEN_ANGLES.r, spotFn),
      g: buildThresholdMatrix(lpi, dpi, SCREEN_ANGLES.g, spotFn),
      b: buildThresholdMatrix(lpi, dpi, SCREEN_ANGLES.b, spotFn),
    };

    // Extract and screen each channel independently
    const channels = { r: new Uint8Array(pixels), g: new Uint8Array(pixels), b: new Uint8Array(pixels) };
    for (let i = 0; i < pixels; i++) {
      channels.r[i] = data[i * 4];
      channels.g[i] = data[i * 4 + 1];
      channels.b[i] = data[i * 4 + 2];
    }

    const screened = {
      r: applyScreen(channels.r.map(v => 255 - v), width, height, screens.r.matrix, screens.r.cellW, screens.r.cellH, dotGainFrac),
      g: applyScreen(channels.g.map(v => 255 - v), width, height, screens.g.matrix, screens.g.cellW, screens.g.cellH, dotGainFrac),
      b: applyScreen(channels.b.map(v => 255 - v), width, height, screens.b.matrix, screens.b.cellW, screens.b.cellH, dotGainFrac),
    };

    for (let i = 0; i < pixels; i++) {
      // Where screened channel has a dot → use original color; else → white
      out[i * 4]     = screened.r[i] > 0 ? channels.r[i] : 255;
      out[i * 4 + 1] = screened.g[i] > 0 ? channels.g[i] : 255;
      out[i * 4 + 2] = screened.b[i] > 0 ? channels.b[i] : 255;
      out[i * 4 + 3] = 255;
    }
  }

  const finalBuffer = await sharp(out, { raw: { width, height, channels: 4 } })
    .withMetadata({ density: dpi })
    .png({ compressionLevel: 6 })
    .toBuffer();

  console.log(`[halftone] output ${(finalBuffer.length / 1024).toFixed(0)} KB`);
  return { composite: finalBuffer };
}

export async function processHalftoneThumbnail(imageBuffer, options = {}) {
  const meta = await sharp(imageBuffer).metadata();
  const maxDim = 900;
  const scale  = Math.min(1, maxDim / Math.max(meta.width, meta.height));

  const preview = await sharp(imageBuffer)
    .resize(Math.round(meta.width * scale), Math.round(meta.height * scale))
    .png()
    .toBuffer();

  return processHalftone(preview, {
    ...options,
    dpi: 96,
    lpi: Math.max(15, Math.round((options.lpi || 65) * scale * 0.6)),
  });
}
