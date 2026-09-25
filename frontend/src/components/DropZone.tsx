import { useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { motion } from 'framer-motion';
import { Upload, ImageIcon, AlertCircle } from 'lucide-react';

interface Props {
  onFile: (file: File) => void;
}

export default function DropZone({ onFile }: Props) {
  const onDrop = useCallback((accepted: File[], rejected: any[]) => {
    if (rejected.length > 0) return;
    if (accepted[0]) onFile(accepted[0]);
  }, [onFile]);

  const { getRootProps, getInputProps, isDragActive, isDragReject } = useDropzone({
    onDrop,
    accept: { 'image/png': ['.png'], 'image/jpeg': ['.jpg', '.jpeg'], 'image/tiff': ['.tif', '.tiff'] },
    maxFiles: 1,
    maxSize: 50 * 1024 * 1024,
  });

  return (
    <div className="w-full max-w-2xl">
      {/* Main drop area */}
      <div
        {...getRootProps()}
        className={`
          relative cursor-pointer rounded-2xl border-2 border-dashed transition-all duration-200 p-16
          ${isDragReject
            ? 'border-red-500/60 bg-red-500/5'
            : isDragActive
              ? 'border-ink-400 bg-ink-500/10 ink-glow scale-[1.01]'
              : 'border-screen-300 bg-screen-800/50 hover:border-ink-500/60 hover:bg-screen-800'
          }
        `}
      >
        <input {...getInputProps()} />

        {/* Dot grid pattern */}
        <div className="absolute inset-0 rounded-2xl dot-grid opacity-40 pointer-events-none" />

        <div className="relative flex flex-col items-center gap-5 text-center">
          <motion.div
            animate={isDragActive ? { scale: 1.1, rotate: 5 } : { scale: 1, rotate: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 20 }}
            className={`
              flex items-center justify-center w-20 h-20 rounded-2xl border
              ${isDragReject
                ? 'bg-red-500/10 border-red-500/30'
                : 'bg-ink-500/10 border-ink-500/20'
              }
            `}
          >
            {isDragReject
              ? <AlertCircle size={36} className="text-red-400" />
              : isDragActive
                ? <ImageIcon size={36} className="text-ink-300" />
                : <Upload size={36} className="text-ink-400" />
            }
          </motion.div>

          {isDragReject ? (
            <div>
              <p className="text-base font-medium text-red-400">Formato não suportado</p>
              <p className="text-sm text-screen-100 mt-1">Use PNG, JPEG ou TIFF</p>
            </div>
          ) : isDragActive ? (
            <div>
              <p className="text-base font-medium text-ink-200">Solte para processar</p>
            </div>
          ) : (
            <div>
              <p className="text-base font-medium text-white">
                Solte a imagem aqui
              </p>
              <p className="text-sm text-screen-100 mt-1">
                ou <span className="text-ink-300 hover:text-ink-200 cursor-pointer">clique para selecionar</span>
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Specs */}
      <div className="mt-6 grid grid-cols-3 gap-3">
        {[
          { label: 'Formatos', value: 'PNG · JPEG · TIFF' },
          { label: 'Resolução ideal', value: '300 DPI ou mais' },
          { label: 'Tamanho máximo', value: '50 MB' },
        ].map((item) => (
          <div key={item.label} className="glass rounded-xl px-4 py-3 text-center">
            <p className="text-xs text-screen-100 mb-1">{item.label}</p>
            <p className="text-sm font-medium text-white font-mono">{item.value}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
