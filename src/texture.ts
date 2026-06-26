import type { RGBA } from './color.ts';

// An RGBA8 image in memory: row-major, top-left origin, 4 bytes/pixel. The
// engine's only image primitive — decode a PNG into one (decodePng, from the
// `ascii-3d/png` subpath) then read it with sampleTexture. Knows nothing about
// where the bytes came from (the caller reads files / fetches URLs and hands us
// the buffer), matching parseObj. This module is platform-neutral — no node
// builtins — so the core renderer bundles for the browser; only `ascii-3d/png`
// pulls node:zlib.
export interface Texture {
  width: number;
  height: number;
  data: Uint8Array;
}

const clamp01 = (x: number): number => (x < 0 ? 0 : x > 1 ? 1 : x);

// Bilinearly sample a texture at uv in [0,1] (clamped at the edges). Returns the
// engine's RGBA convention: rgb 0..255, alpha 0..1 — so the result drops straight
// into blendOver()/plot() without conversion. v=0 is the top row.
export function sampleTexture(tex: Texture, u: number, v: number): RGBA {
  const { width: W, height: H, data: d } = tex;
  const fx = clamp01(u) * (W - 1);
  const fy = clamp01(v) * (H - 1);
  const x0 = Math.floor(fx);
  const y0 = Math.floor(fy);
  const x1 = Math.min(W - 1, x0 + 1);
  const y1 = Math.min(H - 1, y0 + 1);
  const tx = fx - x0;
  const ty = fy - y0;
  const i00 = (y0 * W + x0) * 4;
  const i10 = (y0 * W + x1) * 4;
  const i01 = (y1 * W + x0) * 4;
  const i11 = (y1 * W + x1) * 4;
  const lerp = (k: number): number => {
    const top = d[i00 + k] + (d[i10 + k] - d[i00 + k]) * tx;
    const bot = d[i01 + k] + (d[i11 + k] - d[i01 + k]) * tx;
    return top + (bot - top) * ty;
  };
  return [lerp(0), lerp(1), lerp(2), lerp(3) / 255];
}
