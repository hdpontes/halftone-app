import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ZoomIn, ZoomOut, Maximize2, RotateCcw, Eye, Layers, Info } from 'lucide-react';
import { useHalftoneStore } from '../store/halftone';

export default function ImagePreview() {
  const { previewUrl, originalPreviewUrl, imageInfo, isProcessing, previewMode, setPreviewMode } = useHalftoneStore();
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const panStart = useRef({ x: 0, y: 0, panX: 0, panY: 0 });

  const currentUrl = previewMode === 'original' ? originalPreviewUrl : previewUrl;

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.85 : 1.18;
    setZoom(z => Math.min(8, Math.max(0.2, z * delta)));
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return;
    setIsPanning(true);
    panStart.current = { x: e.clientX, y: e.clientY, panX: pan.x, panY: pan.y };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isPanning) return;
    setPan({
      x: panStart.current.panX + (e.clientX - panStart.current.x),
      y: panStart.current.panY + (e.clientY - panStart.current.y),
    });
  };

  const resetView = () => { setZoom(1); setPan({ x: 0, y: 0 }); };
  const fitView = () => { setZoom(0.9); setPan({ x: 0, y: 0 }); };

  const formatBytes = (b: number) => {
    if (b > 1024 * 1024) return `${(b / 1024 / 1024).toFixed(1)} MB`;
    return `${Math.round(b / 1024)} KB`;
  };

  return (
    <div className="h-full flex flex-col bg-screen-900">
      {/* Toolbar */}
      <div className="flex items-center gap-2 px-4 py-2 border-b border-screen-400 bg-screen-800">
        {/* View toggle */}
        <div className="flex rounded-lg bg-screen-700 p-0.5 border border-screen-400">
          <button
            onClick={() => setPreviewMode('original')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
              previewMode === 'original'
                ? 'bg-screen-500 text-white'
                : 'text-screen-100 hover:text-white'
            }`}
          >
            <Eye size={12} />
            Original
          </button>
          <button
            onClick={() => setPreviewMode('halftone')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
              previewMode === 'halftone'
                ? 'bg-ink-600 text-white'
                : 'text-screen-100 hover:text-white'
            }`}
          >
            <Layers size={12} />
            Halftone
          </button>
        </div>

        <div className="h-4 w-px bg-screen-400 mx-1" />

        {/* Zoom controls */}
        <button
          onClick={() => setZoom(z => Math.max(0.2, z * 0.75))}
          className="p-1.5 rounded-lg text-screen-100 hover:text-white hover:bg-screen-600 transition-colors"
        >
          <ZoomOut size={14} />
        </button>
        <span className="text-xs text-screen-100 font-mono w-12 text-center">
          {Math.round(zoom * 100)}%
        </span>
        <button
          onClick={() => setZoom(z => Math.min(8, z * 1.33))}
          className="p-1.5 rounded-lg text-screen-100 hover:text-white hover:bg-screen-600 transition-colors"
        >
          <ZoomIn size={14} />
        </button>
        <button
          onClick={fitView}
          className="p-1.5 rounded-lg text-screen-100 hover:text-white hover:bg-screen-600 transition-colors"
          title="Ajustar à tela"
        >
          <Maximize2 size={14} />
        </button>
        <button
          onClick={resetView}
          className="p-1.5 rounded-lg text-screen-100 hover:text-white hover:bg-screen-600 transition-colors"
          title="Resetar zoom"
        >
          <RotateCcw size={14} />
        </button>

        <div className="flex-1" />

        {/* Image info */}
        {imageInfo && (
          <div className="flex items-center gap-3 text-xs font-mono text-screen-100">
            <span className="flex items-center gap-1">
              <Info size={11} />
              {imageInfo.width} × {imageInfo.height}px
            </span>
            <span>{imageInfo.dpi} DPI</span>
            <span>{formatBytes(imageInfo.size)}</span>
          </div>
        )}
      </div>

      {/* Canvas area */}
      <div
        className="flex-1 relative overflow-hidden bg-[#0d0d14] cursor-grab active:cursor-grabbing"
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={() => setIsPanning(false)}
        onMouseLeave={() => setIsPanning(false)}
        style={{ backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.04) 1px, transparent 1px)', backgroundSize: '20px 20px' }}
      >
        {/* Processing overlay */}
        <AnimatePresence>
          {isProcessing && previewMode === 'halftone' && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-screen-900/70 backdrop-blur-sm"
            >
              <ScannerAnimation />
              <p className="text-sm text-ink-200 mt-4 font-mono">Gerando halftone…</p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Image */}
        <div
          className="absolute inset-0 flex items-center justify-center"
          style={{
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
            transformOrigin: 'center',
            transition: isPanning ? 'none' : 'transform 0.1s ease',
          }}
        >
          {currentUrl ? (
            <img
              src={currentUrl}
              alt="Preview"
              className="max-w-full max-h-full object-contain select-none shadow-2xl"
              style={{ imageRendering: zoom > 3 ? 'pixelated' : 'auto' }}
              draggable={false}
            />
          ) : (
            <div className="flex flex-col items-center gap-3 text-screen-200">
              <Layers size={40} className="opacity-30" />
              <p className="text-sm">Gerando preview…</p>
            </div>
          )}
        </div>

        {/* Zoom hint */}
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-xs text-screen-200 font-mono opacity-50 select-none pointer-events-none">
          Scroll para zoom · Arrastar para mover
        </div>
      </div>
    </div>
  );
}

function ScannerAnimation() {
  return (
    <div className="relative w-24 h-24">
      <div className="absolute inset-0 rounded-xl border border-ink-500/40" />
      <div className="absolute inset-0 overflow-hidden rounded-xl">
        <motion.div
          animate={{ y: ['-100%', '200%'] }}
          transition={{ duration: 1.8, repeat: Infinity, ease: 'linear' }}
          className="absolute inset-x-0 h-0.5 bg-gradient-to-r from-transparent via-ink-400 to-transparent"
        />
      </div>
      {/* Mini dot grid */}
      {Array.from({ length: 9 }).map((_, i) => (
        <motion.div
          key={i}
          animate={{ opacity: [0.2, 1, 0.2] }}
          transition={{ duration: 1.5, repeat: Infinity, delay: i * 0.15 }}
          className="absolute w-2 h-2 rounded-full bg-ink-400"
          style={{
            left: `${(i % 3) * 33 + 12}%`,
            top: `${Math.floor(i / 3) * 33 + 12}%`,
          }}
        />
      ))}
    </div>
  );
}
