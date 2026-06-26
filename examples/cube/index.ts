import { downsample, RenderTarget, toHalfBlock } from '../../src/index.ts';
import { renderCube } from './scene.ts';

const FPS = 30;
const SS = 2;

let cols = process.stdout.columns ?? 80;
let rows = process.stdout.rows ?? 24;
let target = new RenderTarget(cols * SS, (rows - 1) * 2 * SS);
let display: RenderTarget | undefined;
let t = 0;
let frame: ReturnType<typeof setInterval> | undefined;

function quit(): void {
  if (frame) clearInterval(frame);
  process.stdout.write('\x1b[?25h\x1b[?1049l');
  if (process.stdin.isTTY) process.stdin.setRawMode(false);
  process.exit(0);
}

process.stdin.on('data', (buf) => {
  const s = buf.toString();
  if (s === 'q' || s === '\x03' || s === '\x1b') quit();
});

process.stdout.on('resize', () => {
  cols = process.stdout.columns ?? 80;
  rows = process.stdout.rows ?? 24;
  target = new RenderTarget(cols * SS, (rows - 1) * 2 * SS);
  display = undefined;
});

process.stdout.write('\x1b[?1049h\x1b[?25l\x1b[2J');
if (process.stdin.isTTY) process.stdin.setRawMode(true);
process.stdin.resume();

frame = setInterval(() => {
  t += 1 / FPS;
  renderCube(target, t);
  display = downsample(target, SS, display);
  const hud = `\x1b[${rows};1H\x1b[2m ascii-3d — spinning cube · q: quit \x1b[0m\x1b[K`;
  process.stdout.write('\x1b[H' + toHalfBlock(display) + hud);
}, 1000 / FPS);
