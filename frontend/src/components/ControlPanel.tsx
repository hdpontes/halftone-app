import { useEffect } from 'react';
import { motion } from 'framer-motion';
import { Sliders, Circle, Square, Diamond, Minus, Zap } from 'lucide-react';
import { useHalftoneStore, PRESETS, DEFAULT_OPTIONS, type HalftoneOptions } from '../store/halftone';
import SliderField from './SliderField';

interface Props {
  onOptionsChange: () => void;
}

const DOT_SHAPES: { value: HalftoneOptions['dotShape']; label: string; icon: React.ReactNode }[] = [
  { value: 'round',   label: 'Redondo',  icon: <Circle size={14} /> },
  { value: 'ellipse', label: 'Elipse',   icon: <Circle size={14} className="scale-x-75" /> },
  { value: 'square',  label: 'Quadrado', icon: <Square size={14} /> },
  { value: 'diamond', label: 'Losango',  icon: <Diamond size={14} /> },
  { value: 'line',    label: 'Linha',    icon: <Minus size={14} /> },
];

const PRESET_LABELS: Record<string, string> = {
  dtf_standard:    'DTF Padrão',
  dtf_fine:        'DTF Fino',
  dtf_bold:        'DTF Bold',
  dtf_dark_garment:'DTF Dark',
  newspaper:       'Jornal',
};

export default function ControlPanel({ onOptionsChange }: Props) {
  const { options, setOption } = useHalftoneStore();

  const applyPreset = (key: string) => {
    const preset = PRESETS[key];
    Object.entries(preset).forEach(([k, v]) => {
      setOption(k as keyof HalftoneOptions, v as any);
    });
    setTimeout(onOptionsChange, 50);
  };

  const handleChange = <K extends keyof HalftoneOptions>(key: K, value: HalftoneOptions[K]) => {
    setOption(key, value);
    onOptionsChange();
  };

  const toggleChannel = (ch: 'cyan' | 'magenta' | 'yellow' | 'black') => {
    const current = options.channels;
    const next = current.includes(ch)
      ? current.filter(c => c !== ch)
      : [...current, ch];
    if (next.length === 0) return; // keep at least one
    handleChange('channels', next);
  };

  const CHANNEL_COLORS: Record<string, string> = {
    cyan:    'bg-cyan-500',
    magenta: 'bg-pink-500',
    yellow:  'bg-yellow-400',
    black:   'bg-white',
  };

  return (
    <div className="p-4 space-y-6">
      {/* Section: Presets */}
      <Section title="Presets" icon={<Zap size={13} />}>
        <div className="grid grid-cols-2 gap-1.5">
          {Object.keys(PRESETS).map((key) => (
            <button
              key={key}
              onClick={() => applyPreset(key)}
              className="px-3 py-2 rounded-lg text-xs text-screen-100 hover:text-white bg-screen-700 hover:bg-ink-600/70 border border-screen-400 hover:border-ink-500 transition-all text-left font-medium"
            >
              {PRESET_LABELS[key]}
            </button>
          ))}
        </div>
      </Section>

      <Divider />

      {/* Section: Screen */}
      <Section title="Retícula" icon={<Sliders size={13} />}>
        <SliderField
          label="LPI (linhas por polegada)"
          value={options.lpi}
          min={25} max={150} step={5}
          format={(v) => `${v} lpi`}
          onChange={(v) => handleChange('lpi', v)}
        />

        <SliderField
          label="DPI de saída"
          value={options.dpi}
          min={72} max={600} step={1}
          format={(v) => `${v} dpi`}
          onChange={(v) => handleChange('dpi', v)}
        />
      </Section>

      <Divider />

      {/* Section: Dot shape */}
      <Section title="Formato do ponto">
        <div className="grid grid-cols-5 gap-1">
          {DOT_SHAPES.map((s) => (
            <button
              key={s.value}
              onClick={() => handleChange('dotShape', s.value)}
              title={s.label}
              className={`flex flex-col items-center gap-1 py-2.5 px-1 rounded-xl border text-xs transition-all ${
                options.dotShape === s.value
                  ? 'bg-ink-600/30 border-ink-500 text-ink-200'
                  : 'bg-screen-700 border-screen-400 text-screen-100 hover:border-screen-300 hover:text-white'
              }`}
            >
              {s.icon}
              <span className="leading-none" style={{ fontSize: 9 }}>{s.label}</span>
            </button>
          ))}
        </div>
      </Section>

      <Divider />

      {/* Section: Ink/Dot parameters */}
      <Section title="Parâmetros de ponto">
        <SliderField
          label="Ganho de ponto"
          value={options.dotGain}
          min={0} max={0.5} step={0.01}
          format={(v) => `${Math.round(v * 100)}%`}
          onChange={(v) => handleChange('dotGain', v)}
        />
        <SliderField
          label="Ponto mínimo"
          value={options.minDot}
          min={0} max={0.15} step={0.005}
          format={(v) => `${Math.round(v * 100)}%`}
          onChange={(v) => handleChange('minDot', v)}
        />
        <SliderField
          label="Ponto máximo"
          value={options.maxDot}
          min={0.7} max={1} step={0.005}
          format={(v) => `${Math.round(v * 100)}%`}
          onChange={(v) => handleChange('maxDot', v)}
        />
      </Section>

      <Divider />

      {/* Section: UCR */}
      <Section title="UCR (Under Color Removal)">
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs text-screen-100">Ativar UCR</span>
          <Toggle
            checked={options.ucr}
            onChange={(v) => handleChange('ucr', v)}
          />
        </div>
        {options.ucr && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
          >
            <SliderField
              label="Intensidade UCR"
              value={options.ucAmount}
              min={0} max={1} step={0.05}
              format={(v) => `${Math.round(v * 100)}%`}
              onChange={(v) => handleChange('ucAmount', v)}
            />
          </motion.div>
        )}
      </Section>

      <Divider />

      {/* Section: Channels */}
      <Section title="Canais CMYK">
        <div className="grid grid-cols-4 gap-2">
          {(['cyan', 'magenta', 'yellow', 'black'] as const).map((ch) => {
            const active = options.channels.includes(ch);
            return (
              <button
                key={ch}
                onClick={() => toggleChannel(ch)}
                className={`flex flex-col items-center gap-2 py-3 rounded-xl border transition-all ${
                  active
                    ? 'bg-screen-600 border-screen-300'
                    : 'bg-screen-800 border-screen-500 opacity-40'
                }`}
              >
                <div className={`w-3 h-3 rounded-full ${CHANNEL_COLORS[ch]}`} />
                <span className="text-xs text-screen-100 capitalize" style={{ fontSize: 9 }}>
                  {ch === 'cyan' ? 'C' : ch === 'magenta' ? 'M' : ch === 'yellow' ? 'Y' : 'K'}
                </span>
              </button>
            );
          })}
        </div>
        <p className="text-xs text-screen-200 mt-2">
          Ângulos: C 15° · M 75° · Y 90° · K 45°
        </p>
      </Section>

      <div className="pb-4" />
    </div>
  );
}

function Section({ title, icon, children }: { title: string; icon?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div>
      <div className="flex items-center gap-1.5 mb-3">
        {icon && <span className="text-screen-100">{icon}</span>}
        <h3 className="text-xs font-semibold text-screen-100 uppercase tracking-widest">{title}</h3>
      </div>
      <div className="space-y-3">{children}</div>
    </div>
  );
}

function Divider() {
  return <div className="h-px bg-screen-400" />;
}

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!checked)}
      className={`relative w-9 h-5 rounded-full transition-colors ${checked ? 'bg-ink-500' : 'bg-screen-400'}`}
    >
      <span
        className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${
          checked ? 'translate-x-4' : 'translate-x-0.5'
        }`}
      />
    </button>
  );
}
