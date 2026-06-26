import { writeFileSync } from 'node:fs';
import { downsample, RenderTarget } from '../../src/index.ts';
import { renderCube } from './scene.ts';

const cols = Number(process.argv[2] ?? 80);
const rows = Number(process.argv[3] ?? 40);
const t = Number(process.argv[4] ?? 0.7);
const out = process.argv[5] ?? '.snapshots/cube.ppm';
const SS = 3;

const target = new RenderTarget(cols * SS, rows * 2 * SS);
renderCube(target, t);
const img = downsample(target, SS);

const w = img.width;
const h = img.height;
const header = `P6\n${w} ${h}\n255\n`;
const body = Buffer.alloc(w * h * 3);
const col = img.color;
for (let i = 0; i < w * h * 3; i++) {
  body[i] = Math.max(0, Math.min(255, Math.round(col[i])));
}
writeFileSync(out, Buffer.concat([Buffer.from(header, 'ascii'), body]));
console.log(`wrote ${out} (${w}x${h}) at t=${t}`);
