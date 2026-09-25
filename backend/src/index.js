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

// Security
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  methods: ['GET', 'POST'],
  credentials: true,
}));
app.use(express.json());

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 50,
  message: { error: 'Muitas requisições. Tente novamente em alguns minutos.' },
});
app.use('/api', limiter);

// Multer — memory storage, 50MB max
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (!['image/png', 'image/jpeg', 'image/tiff'].includes(file.mimetype)) {
      return cb(new Error('Apenas PNG, JPEG e TIFF são aceitos.'));
    }
    cb(null, true);
  },
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', version: '1.0.0' });
});

// Image info endpoint
app.post('/api/image/info', upload.single('image'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'Nenhuma imagem enviada.' });

    const meta = await sharp(req.file.buffer).metadata();
    res.json({
      width: meta.width,
      height: meta.height,
      dpi: meta.density || 72,
      format: meta.format,
      channels: meta.channels,
      hasAlpha: meta.hasAlpha,
      size: req.file.size,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Preview halftone (fast, low-res)
app.post('/api/halftone/preview', upload.single('image'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'Nenhuma imagem enviada.' });

    const options = parseOptions(req.body);
    const result = await processHalftoneThumbnail(req.file.buffer, options);

    res.set({
      'Content-Type': 'image/png',
      'X-Request-Id': uuidv4(),
      'Cache-Control': 'no-store',
    });
    res.send(result.composite);
  } catch (err) {
    console.error('[preview]', err);
    res.status(500).json({ error: err.message });
  }
});

// Full resolution halftone export
app.post('/api/halftone/export', upload.single('image'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'Nenhuma imagem enviada.' });

    const options = parseOptions(req.body);
    const start = Date.now();

    const result = await processHalftone(req.file.buffer, options);

    const elapsed = ((Date.now() - start) / 1000).toFixed(2);
    console.log(`[export] ${req.file.originalname} processed in ${elapsed}s`);

    const filename = `halftone_${Date.now()}.png`;
    res.set({
      'Content-Type': 'image/png',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'X-Processing-Time': elapsed,
      'X-Request-Id': uuidv4(),
    });
    res.send(result.composite);
  } catch (err) {
    console.error('[export]', err);
    res.status(500).json({ error: err.message });
  }
});

// Channel separation export
app.post('/api/halftone/separation', upload.single('image'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'Nenhuma imagem enviada.' });

    const options = { ...parseOptions(req.body), outputMode: 'separation' };
    const channel = req.body.channel || 'black';

    const result = await processHalftone(req.file.buffer, options);
    const buffer = result[channel];

    res.set({
      'Content-Type': 'image/png',
      'Content-Disposition': `attachment; filename="separation_${channel}_${Date.now()}.png"`,
    });
    res.send(buffer);
  } catch (err) {
    console.error('[separation]', err);
    res.status(500).json({ error: err.message });
  }
});

function parseOptions(body) {
  return {
    lpi: Number(body.lpi) || 65,
    dpi: Number(body.dpi) || 300,
    dotShape: body.dotShape || 'round',
    dotGain: Number(body.dotGain) ?? 0.18,
    minDot: Number(body.minDot) ?? 0.03,
    maxDot: Number(body.maxDot) ?? 0.97,
    outputMode: body.outputMode || 'composite',
    channels: body.channels ? JSON.parse(body.channels) : ['cyan', 'magenta', 'yellow', 'black'],
    ucr: body.ucr !== 'false',
    ucAmount: Number(body.ucAmount) ?? 0.7,
  };
}

// Error handler
app.use((err, req, res, next) => {
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(413).json({ error: 'Arquivo muito grande. Máximo: 50MB.' });
  }
  res.status(400).json({ error: err.message });
});

app.listen(PORT, () => {
  console.log(`🖨️  Halftone API rodando na porta ${PORT}`);
});
