import sharp from 'sharp';

// Cor de destaque da capa (Etapa D): a cor média da imagem do favorito, ajustada para enfeites
// (sublinhado, bordas) com pelo menos 3:1 de contraste com o fundo de cada tema (WCAG 1.4.11).
export const ACCENT_BACKGROUNDS = { dark: '#0d0820', light: '#ffffff' };
const DEFAULT_IMAGE_BASE = 'https://image.tmdb.org/t/p';
const TIMEOUT_MS = 4000;

const toRgb = (hex) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
const toHex = (rgb) => `#${rgb.map((v) => Math.round(Math.min(255, Math.max(0, v))).toString(16).padStart(2, '0')).join('')}`;

function luminance(hex) {
  const [r, g, b] = toRgb(hex).map((v) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function contrastRatio(a, b) {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

function rgbToHsl([r, g, b]) {
  const [rn, gn, bn] = [r / 255, g / 255, b / 255];
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const l = (max + min) / 2;
  if (max === min) return [0, 0, l];
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  const h = max === rn ? (gn - bn) / d + (gn < bn ? 6 : 0) : max === gn ? (bn - rn) / d + 2 : (rn - gn) / d + 4;
  return [h / 6, s, l];
}

function hslToRgb([h, s, l]) {
  if (s === 0) return [l * 255, l * 255, l * 255];
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  const channel = (t) => {
    let x = t;
    if (x < 0) x += 1;
    if (x > 1) x -= 1;
    if (x < 1 / 6) return p + (q - p) * 6 * x;
    if (x < 1 / 2) return q;
    if (x < 2 / 3) return p + (q - p) * (2 / 3 - x) * 6;
    return p;
  };
  return [channel(h + 1 / 3), channel(h), channel(h - 1 / 3)].map((v) => v * 255);
}

// Clareia (fundo escuro) ou escurece (fundo claro) mantendo o matiz, até chegar ao contraste mínimo.
export function adjustForBackground(hex, bgHex, min = 3) {
  if (contrastRatio(hex, bgHex) >= min) return hex;
  const [h, s, l0] = rgbToHsl(toRgb(hex));
  const step = luminance(bgHex) < 0.5 ? 0.02 : -0.02;
  for (let l = l0 + step; l >= 0 && l <= 1; l += step) {
    const candidate = toHex(hslToRgb([h, s, l]));
    if (contrastRatio(candidate, bgHex) >= min) return candidate;
  }
  return step > 0 ? '#ffffff' : '#000000';
}

export const accentPair = (hex) => ({
  dark: adjustForBackground(hex, ACCENT_BACKGROUNDS.dark),
  light: adjustForBackground(hex, ACCENT_BACKGROUNDS.light),
});

// Baixa a imagem pequena do TMDB e tira a cor média. Qualquer falha (ou demora) → null:
// a capa é salva mesmo assim e usa a cor do tema.
export async function extractAccent(backdropPath, { fetchImpl = fetch, timeoutMs = TIMEOUT_MS } = {}) {
  if (!backdropPath) return null;
  const base = (process.env.TMDB_IMAGE_BASE_URL || DEFAULT_IMAGE_BASE).replace(/\/$/, '');
  try {
    const response = await fetchImpl(`${base}/w300${backdropPath}`, { signal: AbortSignal.timeout(timeoutMs) });
    if (!response.ok) return null;
    const buffer = Buffer.from(await response.arrayBuffer());
    const { data } = await sharp(buffer).removeAlpha().resize(1, 1, { fit: 'fill' }).raw().toBuffer({ resolveWithObject: true });
    return accentPair(toHex([data[0], data[1], data[2]]));
  } catch {
    return null;
  }
}
