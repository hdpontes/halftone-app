import { create } from 'zustand';

export interface HalftoneOptions {
  lpi: number;
  dpi: number;
  dotShape: 'round' | 'ellipse' | 'square' | 'diamond' | 'line';
  dotGain: number;
  minDot: number;
  maxDot: number;
  ucr: boolean;
  ucAmount: number;
  channels: ('cyan' | 'magenta' | 'yellow' | 'black')[];
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
  dpi: 300,
  dotShape: 'round',
  dotGain: 0.18,
  minDot: 0.03,
  maxDot: 0.97,
  ucr: true,
  ucAmount: 0.7,
  channels: ['cyan', 'magenta', 'yellow', 'black'],
};

// Presets for different substrates
export const PRESETS: Record<string, Partial<HalftoneOptions>> = {
  dtf_standard: { lpi: 65, dotShape: 'round', dotGain: 0.18, ucr: true, ucAmount: 0.70 },
  dtf_fine:     { lpi: 85, dotShape: 'round', dotGain: 0.14, ucr: true, ucAmount: 0.65 },
  dtf_bold:     { lpi: 50, dotShape: 'square', dotGain: 0.22, ucr: true, ucAmount: 0.80 },
  dtf_dark_garment: { lpi: 55, dotShape: 'ellipse', dotGain: 0.20, ucr: false, ucAmount: 0 },
  newspaper:    { lpi: 85, dotShape: 'round', dotGain: 0.25, ucr: true, ucAmount: 0.60 },
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
  setOption: (key, value) =>
    set((s) => ({ options: { ...s.options, [key]: value } })),
  resetOptions: () => set({ options: { ...DEFAULT_OPTIONS } }),
  setProcessing: (v) => set({ isProcessing: v }),
  setExporting: (v) => set({ isExporting: v }),
  setProgress: (v) => set({ processingProgress: v }),
  setPreviewMode: (m) => set({ previewMode: m }),
}));
