# arcade-terminal

arcade-terminal renders real 3D in your terminal. It rasterizes triangles in plain
TypeScript and paints them with truecolor half-blocks or shape-matched glyphs.
There's no GPU, no WebGL, and no native dependencies, just math and characters.

The renderer is stateless. It doesn't run a loop or own the screen; you call it
with a scene and it hands back a buffer of pixels (or a string of characters)
that you can do whatever you like with.

```
┌───────────┐   ┌──────────────┐   ┌─────────────────────┐
│ rasterize │ → │ RenderTarget │ → │ toHalfBlock / glyph │ → terminal
└───────────┘   └──────────────┘   └─────────────────────┘
```

## Install

```bash
npm install arcade-terminal
```

It's ESM only and runs on Node 18+ or Bun, with zero runtime dependencies.

## Getting started

Here's a spinning, lit cube. It's really only three steps: make a buffer,
rasterize a mesh into it, and turn the pixels into characters.

```ts
import {
  RenderTarget, rasterize, downsample, toHalfBlock,
  cube, lambertMaterial, cameraMatrices,
  mat4Multiply, mat4RotX, mat4RotY, normalize3, type Camera,
} from 'arcade-terminal';

const SS = 2;
const cols = process.stdout.columns ?? 80;
const rows = process.stdout.rows ?? 24;

// A buffer rendered at 2 pixels per terminal cell, which is the half-block trick.
const target = new RenderTarget(cols * SS, (rows - 1) * 2 * SS);

const mesh = cube(1);
const camera: Camera = {
  eye: { x: 0, y: 0, z: 4.5 }, target: { x: 0, y: 0, z: 0 }, up: { x: 0, y: 1, z: 0 },
  fovy: Math.PI / 3, near: 0.1, far: 100,
};
const light = normalize3({ x: -0.4, y: 0.7, z: 0.6 });

let t = 0;
setInterval(() => {
  t += 1 / 30;
  target.clear(0, 0, 0);
  const { viewProjection } = cameraMatrices(camera, target.width / target.height);
  const model = mat4Multiply(mat4RotY(t * 0.6), mat4RotX(t * 0.35));
  const mvp = mat4Multiply(viewProjection, model);

  rasterize(target, mesh, lambertMaterial, { mvp, model, lightDir: light, ambient: 0.15 });

  process.stdout.write('\x1b[H' + toHalfBlock(downsample(target, SS)));
}, 1000 / 30);
```

The animation is nothing more than nudging `t` each tick and rebuilding the
model matrix from it. There's no scene graph and no framework to learn. If you
want it to spin faster, change a number; if you want it to stop, stop calling
`rasterize`.

## What's in the box

| Export | What it does |
| --- | --- |
| `RenderTarget` | RGB color buffer plus a depth buffer (render at 2x height for half-blocks) |
| `rasterize` | perspective-correct software triangle rasterizer, depth-tested |
| `Material` (`{ vertex, fragment }`) | the style hook, a shader pair. Bring your own, or use a built-in |
| `lambertMaterial` / `glassMaterial` / `wispMaterial` / `pieceMaterial` | ready-made looks |
| `cube` / `quad` / `tetrahedron` / `parseObj` | meshes, or load your own `.obj` |
| `cameraMatrices` plus `mat4*` / `vec*` helpers | camera and linear algebra |
| `toHalfBlock` | `▀` upper half-block: two stacked pixels per cell, with coalesced truecolor escapes |
| `toShapeGlyph` | picks the character whose ink *shape* best matches each cell |
| `toLuminance` | the classic brightness-ramp ASCII look |
| `downsample` | box-averages a supersampled buffer down for antialiased edges |
| `bloom` | an additive glow post-pass |

## Writing a material

A material is just two functions, a vertex shader and a fragment shader. The
vertex stage projects each point into clip space, and the fragment stage decides
the color of each pixel.

```ts
import { type Material, type Mat4, mat4MulVec4 } from 'arcade-terminal';

const flat: Material<{ mvp: Mat4 }> = {
  vertex: (u, v) => ({
    clip: mat4MulVec4(u.mvp, { ...v.position, w: 1 }),
    world: v.position, normal: v.normal, uv: v.uv, color: v.color,
    bary: { x: 0, y: 0, z: 0 },
  }),
  fragment: () => ({ r: 255, g: 80, b: 200, a: 1 }), // RGBA, or return null to discard
};
```

Because every visual style lives in the material, one renderer can drive all of
them. The built-ins are a good place to start reading if you want to write a
fancier one.

## Try it

```bash
npm run example     # live spinning cube (press q to quit)
npm run snapshot    # render one frame to .snapshots/cube.ppm (headless, no TTY)
```

## Loading textures (Node only)

PNG decoding is the one piece that needs a Node builtin (`node:zlib`), so it
lives behind its own subpath and the core renderer never imports it. That keeps
the main entry safe to bundle for the browser.

```ts
import { decodePng } from 'arcade-terminal/png';   // Node and Bun only
import { sampleTexture } from 'arcade-terminal';    // platform-neutral

const tex = decodePng(await readFile('logo.png'));
const rgba = sampleTexture(tex, 0.5, 0.5);
```

## Compatibility

Each of these was checked by packing the tarball, installing it into a fresh
project, and running it for real.

| Target | Status |
| --- | --- |
| Node 18+ (ESM) | ✅ |
| Bun (ESM and native TS) | ✅ |
| TypeScript via `tsx` | ✅ |
| `tsc` types (`Bundler` and `NodeNext` resolution) | ✅ |
| esbuild and other bundlers, Node target | ✅ |
| esbuild and other bundlers, **browser** (core, no `arcade-terminal/png`) | ✅ ~13 kB, no Node builtins |
| `require()` (CommonJS) | ❌ ESM only, use `import` or a dynamic `import()` |
| `arcade-terminal/png` in the browser | ❌ needs `node:zlib` |

In short, the main entry is pure compute and bundles for the browser, while
`arcade-terminal/png` is the only thing tied to Node or Bun. If you're on CommonJS,
reach it through a dynamic `import()`.

## Development

```bash
npm install
npm run type-check   # tsc --noEmit
npm run build        # emit dist/ (js and d.ts)
npm run example      # run the cube example via tsx
```

The source is plain ESM TypeScript with explicit `.ts` import specifiers, and
the build rewrites those to `.js` on emit. Everything lives in `src/`, the
public API is the `src/index.ts` barrel, and `src/png.ts` is the only Node-bound
module.

Contributions are welcome. The main things to keep in mind are to leave the
renderer dependency-free and the public surface small, so please open an issue
before any large changes.

## License

MIT, see [LICENSE](LICENSE). Attributions are in [NOTICE.md](NOTICE.md).
