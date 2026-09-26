import express from 'express';
import multer from 'multer';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { v4 as uuidv4 } from 'uuid';
import sharp from 'sharp';
import { processHalftone, processHalftoneThumbnail } from './halftone.js';

const app = express();
const PORT = process.env.PORT || 3001;

app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(cors({
  origin: process.env.FRONTEND_URL || '*',
  methods: ['GET', 'POST'],
  credentials: true,
}));
app.use(express.json());

const limiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 100 });
app.use('/api', limiter);

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 80 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (!['image/png', 'image/jpeg', 'image/tiff', 'image/webp'].includes(file.mimetype))
      return cb(new Error('Apenas PNG, JPEG, TIFF e WebP são aceitos.'));
    cb(null, true);
  },
});

app.get('/health', (req, res) => res.json({ status: 'ok', version: '2.0.0' }));

app.post('/api/image/info', upload.single('image'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'Nenhuma imagem enviada.' });
    const meta = await sharp(req.file.buffer).metadata();
    res.json({
      width: meta.width, height: meta.height,
      dpi: meta.density || 72, format: meta.format,
      channels: meta.channels, hasAlpha: meta.hasAlpha,
      size: req.file.size,
    });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/halftone/preview', upload.single('image'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'Nenhuma imagem enviada.' });
    const opts = parseOptions(req.body);
    const result = await processHalftoneThumbnail(req.file.buffer, opts);
    res.set({ 'Content-Type': 'image/png', 'Cache-Control': 'no-store' });
    res.send(result.composite);
  } catch (err) {
    console.error('[preview]', err);
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/halftone/export', upload.single('image'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'Nenhuma imagem enviada.' });
    const opts = parseOptions(req.body);
    const t = Date.now();
    const result = await processHalftone(req.file.buffer, opts);
    console.log(`[export] done in ${((Date.now()-t)/1000).toFixed(1)}s`);
    res.set({
      'Content-Type': 'image/png',
      'Content-Disposition': `attachment; filename="halftone_${Date.now()}.png"`,
    });
    res.send(result.composite);
  } catch (err) {
    console.error('[export]', err);
    res.status(500).json({ error: err.message });
  }
});

function parseOptions(body) {
  return {
    lpi:        Number(body.lpi)        || 65,
    dpi:        Number(body.dpi)        || 300,
    angle:      Number(body.angle)      ?? 45,
    dotShape:   body.dotShape           || 'round',
    dotGain:    Number(body.dotGain)    ?? 15,
    blackPoint: Number(body.blackPoint) ?? 0,
    whitePoint: Number(body.whitePoint) ?? 255,
    brightness: Number(body.brightness) ?? 0,
    saturation: Number(body.saturation) ?? 0,
    colorMode:  body.colorMode          || 'color',
  };
}

app.use((err, req, res, next) => {
  if (err.code === 'LIMIT_FILE_SIZE') return res.status(413).json({ error: 'Arquivo muito grande. Máximo: 80MB.' });
  res.status(400).json({ error: err.message });
});

app.listen(PORT, () => console.log(`🖨️  Halftone API v2 na porta ${PORT}`));
