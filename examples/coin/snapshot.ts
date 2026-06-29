import { writeFileSync } from 'node:fs';
import { RenderTarget, downsample, bloom } from '../../src/index.ts';
import { renderCoin } from './scene.ts';
const W = Number(process.argv[2] ?? 150), H = Number(process.argv[3] ?? 44), SS = 3;
const ts = (process.argv[4] ?? '0.4').split(',').map(Number);
for (const t of ts) {
  const tg = new RenderTarget(W*SS, H*2*SS);
  renderCoin(tg, t);
  bloom(tg, { threshold: 0.62, intensity: 0.85 });
  const img = downsample(tg, SS);
  const w=img.width,h=img.height,b=Buffer.alloc(w*h*3),c=img.color;
  for(let i=0;i<w*h*3;i++)b[i]=Math.max(0,Math.min(255,Math.round(c[i])));
  const p=`/tmp/coin_${t}.ppm`;
  writeFileSync(p, Buffer.concat([Buffer.from(`P6\n${w} ${h}\n255\n`,'ascii'),b]));
  console.log('wrote',p);
}
