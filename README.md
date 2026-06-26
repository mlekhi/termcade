# ascii-3d

A software 3D renderer that draws to the terminal — truecolor half-blocks and
shape-matched glyphs. **Pure TypeScript, no GPU, no native deps.** You own the
loop; the renderer is stateless.

```
┌───────────┐   ┌────────────┐   ┌──────────────────────┐
│ rasterize │ → │ RenderTarget │ → │ toHalfBlock / glyph │ → terminal
└───────────┘   └────────────┘   └──────────────────────┘
```

## Install

```bash
npm install ascii-3d
```

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

// 1. a buffer — rendered at 2 pixels per terminal cell (the half-block trick)
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

  // 3. encode pixels → terminal characters
  process.stdout.write('\x1b[H' + toHalfBlock(downsample(target, SS)));
}, 1000 / 30);
```

**Animation = `t += dt` each tick, rebuild the matrix from `t`.** No engine
state, no framework. The renderer never owns the loop — you do.

## What's in the box

| Export | What it does |
| --- | --- |
| `RenderTarget` | RGB color buffer + depth buffer (render at 2× height for half-blocks) |
| `rasterize` | perspective-correct software triangle rasterizer, depth-tested |
| `Material` (`{ vertex, fragment }`) | the style hook — a shader pair. Bring your own, or use a built-in |
| `lambertMaterial` / `glassMaterial` / `wispMaterial` / `pieceMaterial` | ready-made looks |
| `cube` / `quad` / `tetrahedron` / `parseObj` | meshes (or load your own `.obj`) |
| `cameraMatrices` + `mat4*` / `vec*` helpers | camera + linear algebra |
| `toHalfBlock` | `▀` upper half-block: 2 stacked pixels per cell, coalesced truecolor escapes |
| `toShapeGlyph` | picks the character whose ink *shape* best matches each cell |
| `toLuminance` | classic brightness-ramp ASCII |
| `downsample` | box-average supersampled buffer down for antialiased edges |
| `bloom` | additive glow post-pass |

## Writing a material

A material is just two functions — a vertex shader and a fragment shader:

```ts
const flat: Material<{ mvp: Mat4 }> = {
  vertex: (u, v) => ({ clip: mat4MulVec4(u.mvp, { ...v.position, w: 1 }), varying: {} }),
  fragment: () => ({ r: 255, g: 80, b: 200 }),
};
```

Because the look lives in the material, one renderer drives every visual style.

## Try it

```bash
npm run example     # live spinning cube (q to quit)
npm run snapshot    # render one frame to .snapshots/cube.ppm (headless, no TTY)
```

## License

MIT — see [LICENSE](LICENSE). Attributions in [NOTICE.md](NOTICE.md).
