/// <reference types="vite/client" />

const API_BASE = import.meta.env.VITE_API_URL || '/api';

async function apiFetch(path: string, init?: RequestInit): Promise<Response> {
  const res = await fetch(`${API_BASE}${path}`, init);
  if (!res.ok && res.headers.get('content-type')?.includes('application/json')) {
    const err = await res.json();
    throw new Error(err.error || 'Erro desconhecido.');
  }
  return res;
}

export interface ImageInfo {
  width: number; height: number; dpi: number;
  format: string; size: number; hasAlpha: boolean;
}

export async function getImageInfo(file: File): Promise<ImageInfo> {
  const form = new FormData();
  form.append('image', file);
  const res = await apiFetch('/image/info', { method: 'POST', body: form });
  return res.json();
}

export interface ApiOptions {
  lpi: number; angle: number; dotShape: string; dotGain: number;
  blackPoint: number; whitePoint: number; brightness: number;
  saturation: number; colorMode: string;
}

function buildForm(file: File, opts: ApiOptions): FormData {
  const f = new FormData();
  f.append('image',      file);
  f.append('lpi',        String(opts.lpi));
  f.append('dpi',        '300');
  f.append('angle',      String(opts.angle));
  f.append('dotShape',   opts.dotShape);
  f.append('dotGain',    String(opts.dotGain));
  f.append('blackPoint', String(opts.blackPoint));
  f.append('whitePoint', String(opts.whitePoint));
  f.append('brightness', String(opts.brightness));
  f.append('saturation', String(opts.saturation));
  f.append('colorMode',  opts.colorMode);
  return f;
}

export async function getHalftonePreview(file: File, opts: ApiOptions): Promise<string> {
  const res = await apiFetch('/halftone/preview', { method: 'POST', body: buildForm(file, opts) });
  return URL.createObjectURL(await res.blob());
}

export async function exportHalftone(file: File, opts: ApiOptions, onProgress?: (p: number) => void): Promise<Blob> {
  onProgress?.(10);
  const res = await apiFetch('/halftone/export', { method: 'POST', body: buildForm(file, opts) });
  onProgress?.(85);
  const blob = await res.blob();
  onProgress?.(100);
  return blob;
}

export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename; a.click();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}
