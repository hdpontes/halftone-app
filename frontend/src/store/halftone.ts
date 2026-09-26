import { create } from 'zustand';

export type DotShape = 'round' | 'ellipse' | 'square' | 'diamond' | 'line' | 'dot';
export type ColorMode = 'color' | 'bw';

export interface HalftoneOptions {
  lpi:         number;   // 20–150
  angle:       number;   // 0–179
  dotShape:    DotShape;
  dotGain:     number;   // 0–50 (%)
  blackPoint:  number;   // 0–255
  whitePoint:  number;   // 0–255
  brightness:  number;   // -100 to +100
  saturation:  number;   // -100 to +100
  colorMode:   ColorMode;
}

export interface ImageInfo {
  width: number; height: number; dpi: number;
  format: string; size: number; hasAlpha: boolean;
}

export const DEFAULT_OPTIONS: HalftoneOptions = {
  lpi:        65,
  angle:      45,
  dotShape:   'round',
  dotGain:    15,
  blackPoint: 0,
  whitePoint: 255,
  brightness: 0,
  saturation: 0,
  colorMode:  'color',
};

export const PRESETS: Record<string, { label: string; desc: string; options: HalftoneOptions }> = {
  dtf_color: {
    label: 'DTF Colorido Padrão',
    desc: 'Ideal para camisetas e tecidos claros',
    options: { ...DEFAULT_OPTIONS, lpi: 65, dotShape: 'round', dotGain: 15 },
  },
  dtf_fine: {
    label: 'DTF Alta Definição',
    desc: 'Detalhes finos, 85 LPI',
    options: { ...DEFAULT_OPTIONS, lpi: 85, dotShape: 'round', dotGain: 10 },
  },
  dtf_dark: {
    label: 'DTF Tecido Escuro',
    desc: 'Contraste elevado para fundos escuros',
    options: { ...DEFAULT_OPTIONS, lpi: 55, dotShape: 'round', dotGain: 20, brightness: 10, saturation: 15 },
  },
  dtf_bw: {
    label: 'Preto e Branco',
    desc: 'Halftone clássico monocromático',
    options: { ...DEFAULT_OPTIONS, lpi: 75, dotShape: 'round', dotGain: 12, colorMode: 'bw' },
  },
  newspaper: {
    label: 'Estilo Jornal',
    desc: 'Efeito gráfico retro, pontos grandes',
    options: { ...DEFAULT_OPTIONS, lpi: 35, dotShape: 'round', dotGain: 22, colorMode: 'bw' },
  },
};

interface HalftoneState {
  file:               File | null;
  imageInfo:          ImageInfo | null;
  previewUrl:         string | null;
  originalPreviewUrl: string | null;
  options:            HalftoneOptions;
  isProcessing:       boolean;
  isExporting:        boolean;
  processingProgress: number;
  previewMode:        'original' | 'halftone';
  setFile:            (f: File | null) => void;
  setImageInfo:       (i: ImageInfo | null) => void;
  setPreviewUrl:      (u: string | null) => void;
  setOriginalPreviewUrl: (u: string | null) => void;
  setOption:          <K extends keyof HalftoneOptions>(k: K, v: HalftoneOptions[K]) => void;
  resetOptions:       () => void;
  setProcessing:      (v: boolean) => void;
  setExporting:       (v: boolean) => void;
  setProgress:        (v: number) => void;
  setPreviewMode:     (m: 'original' | 'halftone') => void;
}

export const useHalftoneStore = create<HalftoneState>((set) => ({
  file: null, imageInfo: null, previewUrl: null, originalPreviewUrl: null,
  options: { ...DEFAULT_OPTIONS },
  isProcessing: false, isExporting: false, processingProgress: 0, previewMode: 'halftone',
  setFile:               (file)  => set({ file }),
  setImageInfo:          (info)  => set({ imageInfo: info }),
  setPreviewUrl:         (url)   => set({ previewUrl: url }),
  setOriginalPreviewUrl: (url)   => set({ originalPreviewUrl: url }),
  setOption: (k, v) => set((s) => ({ options: { ...s.options, [k]: v } })),
  resetOptions: () => set({ options: { ...DEFAULT_OPTIONS } }),
  setProcessing: (v) => set({ isProcessing: v }),
  setExporting:  (v) => set({ isExporting: v }),
  setProgress:   (v) => set({ processingProgress: v }),
  setPreviewMode:(m) => set({ previewMode: m }),
}));
