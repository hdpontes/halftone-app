import { useCallback, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import Header from '../components/Header';
import DropZone from '../components/DropZone';
import ImagePreview from '../components/ImagePreview';
import ControlPanel from '../components/ControlPanel';
import ExportBar from '../components/ExportBar';
import { useHalftoneStore } from '../store/halftone';
import { getImageInfo, getHalftonePreview, exportHalftone, downloadBlob } from '../utils/api';

export default function HalftonePage() {
  const {
    file, options, isProcessing, isExporting,
    setFile, setImageInfo, setPreviewUrl, setOriginalPreviewUrl,
    setProcessing, setExporting, setProgress,
  } = useHalftoneStore();

  const previewDebounce = useRef<ReturnType<typeof setTimeout>>();

  const handleFile = useCallback(async (f: File) => {
    setFile(f);
    setPreviewUrl(null);

    // Set original preview
    const origUrl = URL.createObjectURL(f);
    setOriginalPreviewUrl(origUrl);

    // Get image info
    try {
      const info = await getImageInfo(f);
      setImageInfo({ ...info, size: f.size });

      if (info.dpi < 200) {
        toast('Imagem com resolução abaixo de 300 DPI. Qualidade pode ser reduzida.', {
          icon: '⚠️',
          duration: 5000,
        });
      }
    } catch (err: any) {
      toast.error('Erro ao ler imagem: ' + err.message);
    }

    // Generate initial preview
    requestPreview(f, options);
  }, [options]);

  const requestPreview = useCallback((f: File, opts: typeof options) => {
    clearTimeout(previewDebounce.current);
    previewDebounce.current = setTimeout(async () => {
      setProcessing(true);
      try {
        const url = await getHalftonePreview(f, opts);
        setPreviewUrl(url);
      } catch (err: any) {
        toast.error('Erro no preview: ' + err.message);
      } finally {
        setProcessing(false);
      }
    }, 600);
  }, []);

  const handleOptionsChange = useCallback(() => {
    if (file) requestPreview(file, options);
  }, [file, options, requestPreview]);

  const handleExport = async () => {
    if (!file) return;
    setExporting(true);
    setProgress(0);
    try {
      const blob = await exportHalftone(file, options, setProgress);
      const name = file.name.replace(/\.[^.]+$/, '') + '_halftone_300dpi.png';
      downloadBlob(blob, name);
      toast.success('Exportado com sucesso!');
    } catch (err: any) {
      toast.error('Erro na exportação: ' + err.message);
    } finally {
      setExporting(false);
      setProgress(0);
    }
  };

  return (
    <div className="min-h-screen bg-screen-900 flex flex-col">
      <Header />

      <main className="flex-1 flex overflow-hidden">
        {/* Left: Preview area */}
        <div className="flex-1 flex flex-col min-w-0">
          <AnimatePresence mode="wait">
            {!file ? (
              <motion.div
                key="drop"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex-1 flex items-center justify-center p-8"
              >
                <DropZone onFile={handleFile} />
              </motion.div>
            ) : (
              <motion.div
                key="preview"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex-1 min-h-0"
              >
                <ImagePreview />
              </motion.div>
            )}
          </AnimatePresence>

          {file && <ExportBar onExport={handleExport} />}
        </div>

        {/* Right: Control panel */}
        <AnimatePresence>
          {file && (
            <motion.aside
              initial={{ x: 320, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: 320, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              className="w-80 flex-shrink-0 border-l border-screen-400 bg-screen-800 overflow-y-auto"
            >
              <ControlPanel onOptionsChange={handleOptionsChange} />
            </motion.aside>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}
