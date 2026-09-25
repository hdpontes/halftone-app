interface Props {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  format: (v: number) => string;
  onChange: (v: number) => void;
}

export default function SliderField({ label, value, min, max, step, format, onChange }: Props) {
  const pct = ((value - min) / (max - min)) * 100;

  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <label className="text-xs text-screen-100">{label}</label>
        <span className="text-xs font-mono text-ink-300 tabular-nums">{format(value)}</span>
      </div>
      <div className="relative h-5 flex items-center">
        {/* Track */}
        <div className="absolute inset-x-0 h-1 rounded-full bg-screen-500">
          {/* Fill */}
          <div
            className="absolute left-0 top-0 h-full rounded-full bg-ink-500 transition-all"
            style={{ width: `${pct}%` }}
          />
        </div>
        {/* Native input (invisible but interactive) */}
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className="absolute inset-0 w-full opacity-0 cursor-pointer h-full"
        />
        {/* Thumb */}
        <div
          className="absolute w-4 h-4 rounded-full bg-white border-2 border-ink-400 shadow pointer-events-none transition-all"
          style={{ left: `calc(${pct}% - 8px)` }}
        />
      </div>
    </div>
  );
}
