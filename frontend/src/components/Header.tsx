import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Layers, LogOut, Upload, RotateCcw, User, ChevronDown } from 'lucide-react';
import { useAuthStore } from '../store/auth';
import { useHalftoneStore } from '../store/halftone';

export default function Header() {
  const { user, logout } = useAuthStore();
  const { file, setFile, setPreviewUrl, setOriginalPreviewUrl, setImageInfo, resetOptions } = useHalftoneStore();
  const [menuOpen, setMenuOpen] = useState(false);

  const handleNewImage = () => {
    setFile(null);
    setPreviewUrl(null);
    setOriginalPreviewUrl(null);
    setImageInfo(null);
    resetOptions();
  };

  return (
    <header className="h-14 flex-shrink-0 border-b border-screen-400 bg-screen-800 flex items-center px-4 gap-4 z-30">
      {/* Logo */}
      <div className="flex items-center gap-2.5">
        <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-ink-500/20 border border-ink-500/30">
          <Layers size={16} className="text-ink-300" />
        </div>
        <div className="flex items-baseline gap-1.5">
          <span className="text-sm font-semibold text-white tracking-tight">HalftonePro</span>
          <span className="text-xs text-screen-100 font-mono">DTF</span>
        </div>
      </div>

      <div className="h-5 w-px bg-screen-400 mx-1" />

      {/* Actions */}
      {file && (
        <div className="flex items-center gap-2">
          <button
            onClick={handleNewImage}
            className="flex items-center gap-1.5 text-xs text-screen-100 hover:text-white px-3 py-1.5 rounded-lg hover:bg-screen-600 transition-colors"
          >
            <Upload size={13} />
            Nova imagem
          </button>
          <button
            onClick={resetOptions}
            className="flex items-center gap-1.5 text-xs text-screen-100 hover:text-white px-3 py-1.5 rounded-lg hover:bg-screen-600 transition-colors"
          >
            <RotateCcw size={13} />
            Resetar configurações
          </button>
        </div>
      )}

      <div className="flex-1" />

      {/* Status pill */}
      <div className="hidden sm:flex items-center gap-1.5 px-3 py-1 rounded-full bg-screen-700 border border-screen-400">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
        <span className="text-xs text-screen-100 font-mono">300 DPI</span>
      </div>

      {/* User menu */}
      <div className="relative">
        <button
          onClick={() => setMenuOpen(!menuOpen)}
          className="flex items-center gap-2 px-3 py-1.5 rounded-xl hover:bg-screen-600 transition-colors"
        >
          <div className="w-7 h-7 rounded-lg bg-ink-500/30 border border-ink-500/40 flex items-center justify-center">
            <User size={13} className="text-ink-300" />
          </div>
          <span className="text-xs text-screen-100 hidden sm:block">{user?.name}</span>
          <ChevronDown size={12} className="text-screen-200 hidden sm:block" />
        </button>

        <AnimatePresence>
          {menuOpen && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setMenuOpen(false)} />
              <motion.div
                initial={{ opacity: 0, y: -8, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -8, scale: 0.96 }}
                transition={{ duration: 0.15 }}
                className="absolute right-0 top-full mt-2 w-52 glass-strong rounded-xl overflow-hidden z-50 shadow-2xl"
              >
                <div className="px-4 py-3 border-b border-screen-400">
                  <p className="text-sm font-medium text-white">{user?.name}</p>
                  <p className="text-xs text-screen-100 mt-0.5">{user?.email}</p>
                </div>
                <div className="p-1">
                  <button
                    onClick={() => { logout(); setMenuOpen(false); }}
                    className="flex items-center gap-2.5 w-full px-3 py-2.5 text-sm text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                  >
                    <LogOut size={14} />
                    Sair
                  </button>
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </div>
    </header>
  );
}
