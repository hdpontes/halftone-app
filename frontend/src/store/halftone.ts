import { create } from 'zustand';

export interface HalftoneOptions {
  lpi: number;
  dotShape: 'round' | 'ellipse' | 'square' | 'diamond';
  dotGain: number;
}

export interface ImageInfo {
  width: number;
  height: number;
  dpi: number;
  format: string;
  size: number;
  hasAlpha: boolean;
}

interface HalftoneState {
  file: File | null;
  imageInfo: ImageInfo | null;
  previewUrl: string | null;
  originalPreviewUrl: string | null;
  options: HalftoneOptions;
  isProcessing: boolean;
  isExporting: boolean;
  processingProgress: number;
  previewMode: 'original' | 'halftone';
  setFile: (file: File | null) => void;
  setImageInfo: (info: ImageInfo | null) => void;
  setPreviewUrl: (url: string | null) => void;
  setOriginalPreviewUrl: (url: string | null) => void;
  setOption: <K extends keyof HalftoneOptions>(key: K, value: HalftoneOptions[K]) => void;
  resetOptions: () => void;
  setProcessing: (v: boolean) => void;
  setExporting: (v: boolean) => void;
  setProgress: (v: number) => void;
  setPreviewMode: (m: 'original' | 'halftone') => void;
}

export const DEFAULT_OPTIONS: HalftoneOptions = {
  lpi: 65,
  dotShape: 'round',
  dotGain: 0.15,
};

export const PRESETS: Record<string, { label: string; desc: string; options: HalftoneOptions }> = {
  dtf_standard: {
    label: 'DTF Padrão',
    desc: 'Ideal para camisetas e tecidos claros',
    options: { lpi: 65, dotShape: 'round', dotGain: 0.15 },
  },
  dtf_fine: {
    label: 'DTF Fino',
    desc: 'Alta definição para detalhes pequenos',
    options: { lpi: 85, dotShape: 'round', dotGain: 0.10 },
  },
  dtf_bold: {
    label: 'DTF Bold',
    desc: 'Pontos maiores para tecidos escuros',
    options: { lpi: 45, dotShape: 'round', dotGain: 0.20 },
  },
  dtf_textured: {
    label: 'Texturizado',
    desc: 'Efeito granulado artístico',
    options: { lpi: 55, dotShape: 'ellipse', dotGain: 0.18 },
  },
};

export const useHalftoneStore = create<HalftoneState>((set) => ({
  file: null,
  imageInfo: null,
  previewUrl: null,
  originalPreviewUrl: null,
  options: { ...DEFAULT_OPTIONS },
  isProcessing: false,
  isExporting: false,
  processingProgress: 0,
  previewMode: 'halftone',

  setFile: (file) => set({ file }),
  setImageInfo: (info) => set({ imageInfo: info }),
  setPreviewUrl: (url) => set({ previewUrl: url }),
  setOriginalPreviewUrl: (url) => set({ originalPreviewUrl: url }),
  setOption: (key, value) => set((s) => ({ options: { ...s.options, [key]: value } })),
  resetOptions: () => set({ options: { ...DEFAULT_OPTIONS } }),
  setProcessing: (v) => set({ isProcessing: v }),
  setExporting: (v) => set({ isExporting: v }),
  setProgress: (v) => set({ processingProgress: v }),
  setPreviewMode: (m) => set({ previewMode: m }),
}));
