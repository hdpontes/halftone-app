import { motion, AnimatePresence } from 'framer-motion';
import { Zap, Circle, Square, Diamond, Minus } from 'lucide-react';
import { useHalftoneStore, PRESETS, type HalftoneOptions } from '../store/halftone';
import SliderField from './SliderField';

interface Props {
  onOptionsChange: () => void;
}

const DOT_SHAPES: { value: HalftoneOptions['dotShape']; label: string; icon: React.ReactNode }[] = [
  { value: 'round',   label: 'Redondo',  icon: <Circle size={16} /> },
  { value: 'ellipse', label: 'Elipse',   icon: <Circle size={16} className="scale-x-[0.6]" /> },
  { value: 'square',  label: 'Quadrado', icon: <Square size={16} /> },
  { value: 'diamond', label: 'Losango',  icon: <Diamond size={16} /> },
];

export default function ControlPanel({ onOptionsChange }: Props) {
  const { options, setOption } = useHalftoneStore();

  const applyPreset = (key: string) => {
    const preset = PRESETS[key].options;
    (Object.keys(preset) as (keyof HalftoneOptions)[]).forEach((k) => {
      setOption(k, preset[k] as any);
    });
    setTimeout(onOptionsChange, 50);
  };

  const handleChange = <K extends keyof HalftoneOptions>(key: K, value: HalftoneOptions[K]) => {
    setOption(key, value);
    onOptionsChange();
  };

  return (
    <div className="p-5 space-y-7">

      {/* Presets */}
      <div>
        <h3 className="text-xs font-semibold text-screen-100 uppercase tracking-widest mb-3 flex items-center gap-1.5">
          <Zap size={12} /> Presets
        </h3>
        <div className="space-y-2">
          {Object.entries(PRESETS).map(([key, preset]) => (
            <button
              key={key}
              onClick={() => applyPreset(key)}
              className={`w-full text-left px-4 py-3 rounded-xl border transition-all ${
                options.lpi === preset.options.lpi &&
                options.dotShape === preset.options.dotShape
                  ? 'bg-ink-600/20 border-ink-500 text-white'
                  : 'bg-screen-700 border-screen-400 text-screen-100 hover:border-screen-300 hover:text-white'
              }`}
            >
              <p className="text-sm font-medium">{preset.label}</p>
              <p className="text-xs text-screen-200 mt-0.5">{preset.desc}</p>
            </button>
          ))}
        </div>
      </div>

      <div className="h-px bg-screen-400" />

      {/* LPI */}
      <div>
        <h3 className="text-xs font-semibold text-screen-100 uppercase tracking-widest mb-4">
          Densidade da retícula
        </h3>
        <SliderField
          label="LPI — linhas por polegada"
          value={options.lpi}
          min={20} max={120} step={5}
          format={(v) => `${v} lpi`}
          onChange={(v) => handleChange('lpi', v)}
        />
        <div className="flex justify-between text-xs text-screen-200 mt-2 px-0.5">
          <span>Mais grosso</span>
          <span>Mais fino</span>
        </div>
      </div>

      <div className="h-px bg-screen-400" />

      {/* Dot shape */}
      <div>
        <h3 className="text-xs font-semibold text-screen-100 uppercase tracking-widest mb-3">
          Formato do ponto
        </h3>
        <div className="grid grid-cols-2 gap-2">
          {DOT_SHAPES.map((s) => (
            <button
              key={s.value}
              onClick={() => handleChange('dotShape', s.value)}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl border text-sm transition-all ${
                options.dotShape === s.value
                  ? 'bg-ink-600/20 border-ink-500 text-white'
                  : 'bg-screen-700 border-screen-400 text-screen-100 hover:border-screen-300 hover:text-white'
              }`}
            >
              {s.icon}
              {s.label}
            </button>
          ))}
        </div>
      </div>

      <div className="h-px bg-screen-400" />

      {/* Dot gain — advanced, collapsed by default */}
      <AdvancedSection>
        <SliderField
          label="Ganho de ponto (dot gain)"
          value={options.dotGain}
          min={0} max={0.4} step={0.01}
          format={(v) => `${Math.round(v * 100)}%`}
          onChange={(v) => handleChange('dotGain', v)}
        />
        <p className="text-xs text-screen-200 mt-2">
          Compensa o espalhamento da tinta no filme DTF. Valores maiores = pontos menores na saída.
        </p>
      </AdvancedSection>

      <div className="pb-4" />
    </div>
  );
}

function AdvancedSection({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = React.useState(false);

  return (
    <div>
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 text-xs text-screen-200 hover:text-screen-100 transition-colors w-full"
      >
        <span className={`transition-transform ${open ? 'rotate-90' : ''}`}>▶</span>
        Configurações avançadas
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden mt-4"
          >
            {children}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// Need React import for useState in function component
import React from 'react';
