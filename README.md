# ascii-3d

A software 3D renderer that draws to the terminal with truecolor half-blocks
and shape-matched glyphs. **Pure TypeScript, no GPU, no native deps.** You own
the loop; the renderer is stateless.

```
┌───────────┐   ┌──────────────┐   ┌─────────────────────┐
│ rasterize │ → │ RenderTarget │ → │ toHalfBlock / glyph │ → terminal
└───────────┘   └──────────────┘   └─────────────────────┘
```

## Install

```bash
npm install ascii-3d
```

ESM only. Node 18+ or Bun. Zero runtime dependencies.

## Three calls

A spinning, lit cube in your terminal:

```ts
import {
  RenderTarget, rasterize, downsample, toHalfBlock,
  cube, lambertMaterial, cameraMatrices,
  mat4Multiply, mat4RotX, mat4RotY, normalize3, type Camera,
} from 'ascii-3d';

const SS = 2;
const cols = process.stdout.columns ?? 80;
const rows = process.stdout.rows ?? 24;

// 1. a buffer, rendered at 2 pixels per terminal cell (the half-block trick)
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

  // 2. rasterize the mesh through a material into the buffer
  rasterize(target, mesh, lambertMaterial, { mvp, model, lightDir: light, ambient: 0.15 });

  // 3. encode pixels to terminal characters
  process.stdout.write('\x1b[H' + toHalfBlock(downsample(target, SS)));
}, 1000 / 30);
```

Animation is just `t += dt` each tick, rebuilding the matrix from `t`. No engine
state, no framework. The renderer never owns the loop; you do.

## What's in the box

| Export | What it does |
| --- | --- |
| `RenderTarget` | RGB color buffer + depth buffer (render at 2x height for half-blocks) |
| `rasterize` | perspective-correct software triangle rasterizer, depth-tested |
| `Material` (`{ vertex, fragment }`) | the style hook, a shader pair. Bring your own, or use a built-in |
| `lambertMaterial` / `glassMaterial` / `wispMaterial` / `pieceMaterial` | ready-made looks |
| `cube` / `quad` / `tetrahedron` / `parseObj` | meshes (or load your own `.obj`) |
| `cameraMatrices` + `mat4*` / `vec*` helpers | camera + linear algebra |
| `toHalfBlock` | `▀` upper half-block: 2 stacked pixels per cell, coalesced truecolor escapes |
| `toShapeGlyph` | picks the character whose ink *shape* best matches each cell |
| `toLuminance` | classic brightness-ramp ASCII |
| `downsample` | box-average a supersampled buffer down for antialiased edges |
| `bloom` | additive glow post-pass |

## Writing a material

A material is two functions: a vertex shader and a fragment shader.

```ts
import { type Material, type Mat4, mat4MulVec4 } from 'ascii-3d';

const flat: Material<{ mvp: Mat4 }> = {
  vertex: (u, v) => ({
    clip: mat4MulVec4(u.mvp, { ...v.position, w: 1 }),
    world: v.position, normal: v.normal, uv: v.uv, color: v.color,
    bary: { x: 0, y: 0, z: 0 },
  }),
  fragment: () => ({ r: 255, g: 80, b: 200, a: 1 }), // RGBA, or return null to discard
};
```

Because the look lives in the material, one renderer drives every visual style.

## Try it

```bash
npm run example     # live spinning cube (q to quit)
npm run snapshot    # render one frame to .snapshots/cube.ppm (headless, no TTY)
```

## Loading textures (Node only)

PNG decoding is the one part that needs a Node builtin (`node:zlib`), so it
lives in a separate subpath. The core renderer above never imports it:

```ts
import { decodePng } from 'ascii-3d/png';   // Node / Bun only
import { sampleTexture } from 'ascii-3d';    // platform-neutral

const tex = decodePng(await readFile('logo.png'));
const rgba = sampleTexture(tex, 0.5, 0.5);
```

## Compatibility

Verified end-to-end by installing the packed tarball into a fresh project and
running it under each target:

| Target | Status |
| --- | --- |
| Node 18+ (ESM) | ✅ |
| Bun (ESM + native TS) | ✅ |
| TypeScript via `tsx` | ✅ |
| `tsc` types (`Bundler` and `NodeNext` resolution) | ✅ |
| esbuild / bundlers, Node target | ✅ |
| esbuild / bundlers, **browser** (core, no `ascii-3d/png`) | ✅ ~13 kB, no Node builtins |
| `require()` (CommonJS) | ❌ ESM only, use `import` or dynamic `import()` |
| `ascii-3d/png` in the browser | ❌ needs `node:zlib` |

The main entry (`ascii-3d`) is pure compute and bundles for the browser. Only
`ascii-3d/png` is bound to Node/Bun. CommonJS consumers must use a dynamic
`import()`.

## Development

```bash
npm install
npm run type-check   # tsc --noEmit
npm run build        # emit dist/ (js + d.ts)
npm run example      # run the cube example via tsx
```

The library is plain ESM TypeScript with explicit `.ts` import specifiers; the
build rewrites them to `.js` on emit. Source lives in `src/`, the public API is
the `src/index.ts` barrel, and the only Node-bound module is `src/png.ts`.

Contributions welcome. Keep the renderer dependency-free and the public surface
small; open an issue before large changes.

## License

MIT, see [LICENSE](LICENSE). Attributions in [NOTICE.md](NOTICE.md).
