import { motion, AnimatePresence } from 'framer-motion';
import { Download, Loader2, FileImage } from 'lucide-react';
import { useHalftoneStore } from '../store/halftone';

interface Props {
  onExport: () => void;
}

export default function ExportBar({ onExport }: Props) {
  const { isExporting, processingProgress, isProcessing, options, imageInfo } = useHalftoneStore();

  return (
    <div className="flex-shrink-0 border-t border-screen-400 bg-screen-800 px-4 py-3 flex items-center gap-4">
      <div className="flex items-center gap-2 text-xs font-mono text-screen-100 min-w-0">
        <FileImage size={13} className="flex-shrink-0 text-screen-200" />
        <span className="truncate">
          {imageInfo
            ? `${imageInfo.width}×${imageInfo.height}px · ${options.lpi} LPI · 300 DPI`
            : 'Carregando…'
          }
        </span>
      </div>

      <div className="flex-1" />

      <AnimatePresence>
        {isProcessing && (
          <motion.div
            initial={{ opacity: 0, x: 8 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 8 }}
            className="flex items-center gap-1.5 text-xs text-screen-100"
          >
            <Loader2 size={12} className="animate-spin text-ink-400" />
            <span>Atualizando preview…</span>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="relative">
        <button
          onClick={onExport}
          disabled={isExporting || isProcessing}
          className={`
            flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all
            ${isExporting
              ? 'bg-ink-700 cursor-not-allowed text-ink-300'
              : 'bg-ink-500 hover:bg-ink-400 text-white active:scale-95 ink-glow'
            }
          `}
        >
          {isExporting ? (
            <><Loader2 size={15} className="animate-spin" />Exportando…</>
          ) : (
            <><Download size={15} />Exportar 300 DPI</>
          )}
        </button>

        <AnimatePresence>
          {isExporting && (
            <motion.div
              initial={{ scaleX: 0 }}
              animate={{ scaleX: processingProgress / 100 }}
              exit={{ opacity: 0 }}
              transition={{ ease: 'easeOut' }}
              className="absolute bottom-0 left-0 right-0 h-0.5 bg-ink-300 rounded-b-xl origin-left"
            />
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
