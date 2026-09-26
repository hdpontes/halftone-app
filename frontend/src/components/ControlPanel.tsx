import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Zap, ChevronDown } from 'lucide-react';
import { useHalftoneStore, PRESETS, type HalftoneOptions, type DotShape } from '../store/halftone';
import SliderField from './SliderField';

interface Props { onOptionsChange: () => void; }

const DOT_SHAPES: { value: DotShape; label: string; svg: React.ReactNode }[] = [
  { value: 'round',   label: 'Redondo',  svg: <circle cx="12" cy="12" r="8" fill="currentColor"/> },
  { value: 'ellipse', label: 'Elipse',   svg: <ellipse cx="12" cy="12" rx="10" ry="6" fill="currentColor"/> },
  { value: 'square',  label: 'Quadrado', svg: <rect x="4" y="4" width="16" height="16" fill="currentColor"/> },
  { value: 'diamond', label: 'Losango',  svg: <polygon points="12,2 22,12 12,22 2,12" fill="currentColor"/> },
  { value: 'line',    label: 'Linha',    svg: <rect x="2" y="10" width="20" height="4" fill="currentColor"/> },
  { value: 'dot',     label: 'Ponto inv.',svg: <><rect x="2" y="2" width="20" height="20" fill="currentColor"/><circle cx="12" cy="12" r="6" fill="white"/></> },
];

function Section({ title, children, defaultOpen = true }: { title: string; children: React.ReactNode; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border border-screen-400 rounded-xl overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-4 py-3 bg-screen-700 hover:bg-screen-600 transition-colors"
      >
        <span className="text-xs font-semibold text-screen-100 uppercase tracking-widest">{title}</span>
        <ChevronDown size={14} className={`text-screen-200 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }}
            className="overflow-hidden"
          >
            <div className="p-4 space-y-4">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function ControlPanel({ onOptionsChange }: Props) {
  const { options, setOption } = useHalftoneStore();

  const set = <K extends keyof HalftoneOptions>(k: K, v: HalftoneOptions[K]) => {
    setOption(k, v);
    onOptionsChange();
  };

  const applyPreset = (key: string) => {
    const p = PRESETS[key].options;
    (Object.keys(p) as (keyof HalftoneOptions)[]).forEach(k => setOption(k, p[k] as any));
    setTimeout(onOptionsChange, 50);
  };

  return (
    <div className="p-4 space-y-3">

      {/* Presets */}
      <Section title="⚡ Presets">
        <div className="space-y-1.5">
          {Object.entries(PRESETS).map(([key, preset]) => (
            <button key={key} onClick={() => applyPreset(key)}
              className={`w-full text-left px-3 py-2.5 rounded-lg border text-sm transition-all ${
                JSON.stringify(options) === JSON.stringify(preset.options)
                  ? 'bg-ink-600/25 border-ink-500 text-white'
                  : 'bg-screen-700 border-screen-400 text-screen-100 hover:border-screen-200 hover:text-white'
              }`}
            >
              <span className="font-medium">{preset.label}</span>
              <span className="block text-xs text-screen-200 mt-0.5">{preset.desc}</span>
            </button>
          ))}
        </div>
      </Section>

      {/* Modo */}
      <Section title="Modo de cor">
        <div className="grid grid-cols-2 gap-2">
          {(['color', 'bw'] as const).map(m => (
            <button key={m} onClick={() => set('colorMode', m)}
              className={`py-2.5 rounded-lg border text-sm font-medium transition-all ${
                options.colorMode === m
                  ? 'bg-ink-600/25 border-ink-500 text-white'
                  : 'bg-screen-700 border-screen-400 text-screen-100 hover:text-white'
              }`}
            >
              {m === 'color' ? '🎨 Colorido' : '⬛ P&B'}
            </button>
          ))}
        </div>
      </Section>

      {/* Retícula */}
      <Section title="Retícula">
        <SliderField label="LPI — densidade" value={options.lpi} min={20} max={120} step={5}
          format={v => `${v} lpi`} onChange={v => set('lpi', v)} />
        <div className="flex justify-between text-xs text-screen-200 -mt-2 px-0.5">
          <span>← Grosso</span><span>Fino →</span>
        </div>

        <SliderField label="Ângulo da tela" value={options.angle} min={0} max={179} step={1}
          format={v => `${v}°`} onChange={v => set('angle', v)} />
        <div className="flex gap-1.5 flex-wrap mt-1">
          {[0, 15, 45, 75, 90].map(a => (
            <button key={a} onClick={() => set('angle', a)}
              className={`px-2.5 py-1 rounded-md text-xs font-mono transition-all ${
                options.angle === a
                  ? 'bg-ink-500 text-white'
                  : 'bg-screen-600 text-screen-100 hover:text-white'
              }`}
            >{a}°</button>
          ))}
        </div>
      </Section>

      {/* Formato do ponto */}
      <Section title="Formato do ponto">
        <div className="grid grid-cols-3 gap-2">
          {DOT_SHAPES.map(s => (
            <button key={s.value} onClick={() => set('dotShape', s.value)}
              className={`flex flex-col items-center gap-1.5 py-3 rounded-xl border transition-all ${
                options.dotShape === s.value
                  ? 'bg-ink-600/25 border-ink-500 text-ink-200'
                  : 'bg-screen-700 border-screen-400 text-screen-100 hover:border-screen-200 hover:text-white'
              }`}
            >
              <svg width="24" height="24" viewBox="0 0 24 24">{s.svg}</svg>
              <span className="text-xs leading-none">{s.label}</span>
            </button>
          ))}
        </div>
      </Section>

      {/* Ponto preto / branco */}
      <Section title="Ponto Preto &amp; Branco">
        <SliderField label="Força do ponto preto" value={options.blackPoint} min={0} max={128} step={1}
          format={v => `${v}`} onChange={v => set('blackPoint', v)} />
        <SliderField label="Força do ponto branco" value={options.whitePoint} min={128} max={255} step={1}
          format={v => `${v}`} onChange={v => set('whitePoint', v)} />
        <button onClick={() => { set('blackPoint', 0); set('whitePoint', 255); }}
          className="text-xs text-screen-200 hover:text-white transition-colors">
          ↺ Resetar níveis
        </button>
      </Section>

      {/* Dot Gain */}
      <Section title="Dot Gain" defaultOpen={false}>
        <SliderField label="Ganho de ponto" value={options.dotGain} min={0} max={50} step={1}
          format={v => `${v}%`} onChange={v => set('dotGain', v)} />
        <p className="text-xs text-screen-200">
          Compensa o espalhamento da tinta no filme DTF. Padrão: 15%.
        </p>
      </Section>

      {/* Brilho e Saturação */}
      <Section title="Brilho &amp; Saturação">
        <SliderField label="Brilho" value={options.brightness} min={-100} max={100} step={1}
          format={v => `${v > 0 ? '+' : ''}${v}`} onChange={v => set('brightness', v)} />
        <SliderField label="Saturação" value={options.saturation} min={-100} max={100} step={1}
          format={v => `${v > 0 ? '+' : ''}${v}`} onChange={v => set('saturation', v)} />
        <button onClick={() => { set('brightness', 0); set('saturation', 0); }}
          className="text-xs text-screen-200 hover:text-white transition-colors">
          ↺ Resetar
        </button>
      </Section>

      <div className="pb-4" />
    </div>
  );
}
