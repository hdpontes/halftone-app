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

export interface ApiHalftoneOptions {
  lpi: number;
  dotShape: string;
  dotGain: number;
}

function buildForm(file: File, opts: ApiHalftoneOptions): FormData {
  const form = new FormData();
  form.append('image', file);
  form.append('lpi',      String(opts.lpi));
  form.append('dotShape', opts.dotShape);
  form.append('dotGain',  String(opts.dotGain));
  form.append('dpi',      '300');
  form.append('minDot',   '0.02');
  form.append('maxDot',   '0.98');
  return form;
}

export async function getHalftonePreview(file: File, opts: ApiHalftoneOptions): Promise<string> {
  const form = buildForm(file, opts);
  const res = await apiFetch('/halftone/preview', { method: 'POST', body: form });
  const blob = await res.blob();
  return URL.createObjectURL(blob);
}

export async function exportHalftone(
  file: File,
  opts: ApiHalftoneOptions,
  onProgress?: (p: number) => void,
): Promise<Blob> {
  onProgress?.(10);
  const form = buildForm(file, opts);
  onProgress?.(30);
  const res = await apiFetch('/halftone/export', { method: 'POST', body: form });
  onProgress?.(85);
  const blob = await res.blob();
  onProgress?.(100);
  return blob;
}

export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}
