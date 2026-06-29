import { writeFileSync } from 'node:fs';
import gifenc from 'gifenc';
const { GIFEncoder, quantize, applyPalette } = gifenc;
import { RenderTarget, bloom, downsample } from '../../src/index.ts';
import { renderCoin } from './scene.ts';

const SIZE = Number(process.argv[2] ?? 200); // output square size in pixels
const SS = Number(process.argv[3] ?? 3); // supersample factor for antialiasing
const FRAMES = Number(process.argv[4] ?? 36);
const out = process.argv[5] ?? 'assets/coin.gif';

const OW = SIZE;
const OH = SIZE;

// Render one spin frame supersampled, then box-average down for clean edges so
// the rim and centre-bar relief read clearly.
function frameRGBA(t: number): Uint8Array {
  const tgt = new RenderTarget(SIZE * SS, SIZE * SS);
  renderCoin(tgt, t);
  bloom(tgt, { threshold: 0.75, intensity: 0.45 });
  const img = downsample(tgt, SS);
  const src = img.color;
  const rgba = new Uint8Array(OW * OH * 4);
  for (let i = 0, p = 0; i < OW * OH; i++) {
    rgba[p++] = Math.max(0, Math.min(255, src[i * 3]));
    rgba[p++] = Math.max(0, Math.min(255, src[i * 3 + 1]));
    rgba[p++] = Math.max(0, Math.min(255, src[i * 3 + 2]));
    rgba[p++] = 255;
  }
  return rgba;
}

const frames: Uint8Array[] = [];
for (let i = 0; i < FRAMES; i++) frames.push(frameRGBA((i / FRAMES) * Math.PI * 2));

// One global palette from a few representative frames so colors don't flicker.
const sampleIdx = [0, Math.floor(FRAMES / 8), Math.floor(FRAMES / 4)];
const merged = new Uint8Array(sampleIdx.length * OW * OH * 4);
sampleIdx.forEach((f, k) => merged.set(frames[f], k * OW * OH * 4));
const palette = quantize(merged, 128);

const gif = GIFEncoder();
for (const rgba of frames) {
  const index = applyPalette(rgba, palette);
  gif.writeFrame(index, OW, OH, { palette, delay: 55 });
}
gif.finish();
writeFileSync(out, gif.bytes());
console.log(`wrote ${out} (${OW}x${OH}, ${FRAMES} frames)`);
