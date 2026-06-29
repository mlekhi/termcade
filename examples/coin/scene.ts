import {
  cameraMatrices,
  type Camera,
  mat4Multiply,
  mat4RotX,
  mat4RotY,
  type Mat4,
  mat4MulVec4,
  mat4MulDir,
  type Material,
  type Mesh,
  normalize3,
  dot3,
  rasterize,
  type RenderTarget,
  type Vec3,
  type VertexIn,
} from '../../src/index.ts';

const RIM = { x: 255, y: 214, z: 40 }; // raised rim ring + outer border (bright)
const FIELD = { x: 226, y: 168, z: 18 }; // recessed inner field (dimmer)
const BAR = { x: 255, y: 232, z: 96 }; // embossed centre bar (brightest)
const WALL = { x: 168, y: 112, z: 8 }; // step side walls (darkest, for depth)

// A Mario-style coin: a thick gold disc with a raised outer rim, a recessed
// inner field, and an embossed vertical bar in the centre. Built procedurally
// because the library ships only cube/quad/tetra primitives.
export function coin(): Mesh {
  const vertices: VertexIn[] = [];
  const indices: number[] = [];
  const S = 56;
  const T = 0.2; // half-thickness of the disc body
  const E = 0.06; // relief height of raised features

  const push = (p: Vec3, n: Vec3, color: Vec3): number => {
    vertices.push({ position: p, normal: normalize3(n), uv: [0, 0], color });
    return vertices.length - 1;
  };
  const tri = (a: number, b: number, c: number): void => {
    indices.push(a, b, c);
  };
  const quad = (a: number, b: number, c: number, d: number): void => {
    tri(a, b, c);
    tri(a, c, d);
  };

  // A flat annulus (ring) on a constant-z plane, facing ±z.
  const annulus = (z: number, rIn: number, rOut: number, nz: number, color: Vec3): void => {
    const inner: number[] = [];
    const outer: number[] = [];
    for (let i = 0; i < S; i++) {
      const a = (i / S) * Math.PI * 2;
      const cx = Math.cos(a);
      const sy = Math.sin(a);
      inner.push(push({ x: cx * rIn, y: sy * rIn, z }, { x: 0, y: 0, z: nz }, color));
      outer.push(push({ x: cx * rOut, y: sy * rOut, z }, { x: 0, y: 0, z: nz }, color));
    }
    for (let i = 0; i < S; i++) {
      const n = (i + 1) % S;
      if (nz >= 0) quad(inner[i], outer[i], outer[n], inner[n]);
      else quad(inner[i], inner[n], outer[n], outer[i]);
    }
  };

  // A cylindrical wall at radius r between two z planes; normal points out (±1).
  const wall = (r: number, z0: number, z1: number, dir: number, color: Vec3): void => {
    const a0: number[] = [];
    const a1: number[] = [];
    for (let i = 0; i < S; i++) {
      const a = (i / S) * Math.PI * 2;
      const nx = Math.cos(a) * dir;
      const ny = Math.sin(a) * dir;
      a0.push(push({ x: Math.cos(a) * r, y: Math.sin(a) * r, z: z0 }, { x: nx, y: ny, z: 0 }, color));
      a1.push(push({ x: Math.cos(a) * r, y: Math.sin(a) * r, z: z1 }, { x: nx, y: ny, z: 0 }, color));
    }
    for (let i = 0; i < S; i++) {
      const n = (i + 1) % S;
      if (dir > 0) quad(a0[i], a1[i], a1[n], a0[n]);
      else quad(a0[i], a0[n], a1[n], a1[i]);
    }
  };

  // Outer cylindrical edge of the coin (the chunky gold rim seen when tilted).
  wall(1, -T, T, 1, WALL);

  // Build one face's relief, then call twice (front and mirrored back).
  const buildFace = (sign: number): void => {
    const z = sign * T;
    const top = z + sign * E;
    const nz = sign;
    // Outer flat border between the edge and the raised rim ring.
    annulus(z, 0.9, 1.0, nz, RIM);
    // Raised rim ring: top + inner/outer walls.
    annulus(top, 0.72, 0.9, nz, RIM);
    wall(0.9, z, top, 1, WALL);
    wall(0.72, z, top, -1, WALL);
    // Recessed inner field.
    annulus(z, 0.0001, 0.72, nz, FIELD);

    // Centre embossed bar: a raised vertical slab (the coin's "I").
    const bw = 0.13;
    const bh = 0.4;
    const corners: Vec3[] = [
      { x: -bw, y: -bh, z: top },
      { x: bw, y: -bh, z: top },
      { x: bw, y: bh, z: top },
      { x: -bw, y: bh, z: top },
    ];
    const c0 = push(corners[0], { x: 0, y: 0, z: nz }, BAR);
    const c1 = push(corners[1], { x: 0, y: 0, z: nz }, BAR);
    const c2 = push(corners[2], { x: 0, y: 0, z: nz }, BAR);
    const c3 = push(corners[3], { x: 0, y: 0, z: nz }, BAR);
    if (sign > 0) quad(c0, c1, c2, c3);
    else quad(c0, c3, c2, c1);
    // Bar side walls (4 sides) from base z up to top.
    const wallQuad = (ax: number, ay: number, bx: number, by: number, nx: number, ny: number): void => {
      const p0 = push({ x: ax, y: ay, z }, { x: nx, y: ny, z: 0 }, WALL);
      const p1 = push({ x: bx, y: by, z }, { x: nx, y: ny, z: 0 }, WALL);
      const p2 = push({ x: bx, y: by, z: top }, { x: nx, y: ny, z: 0 }, WALL);
      const p3 = push({ x: ax, y: ay, z: top }, { x: nx, y: ny, z: 0 }, WALL);
      quad(p0, p1, p2, p3);
    };
    wallQuad(-bw, -bh, bw, -bh, 0, -1);
    wallQuad(bw, -bh, bw, bh, 1, 0);
    wallQuad(bw, bh, -bw, bh, 0, 1);
    wallQuad(-bw, bh, -bw, -bh, -1, 0);
  };

  buildFace(1);
  buildFace(-1);
  return { vertices, indices };
}

// Glossy gold: lambert diffuse plus a Blinn specular highlight, so bloom can
// blow the highlights out into a metallic shine.
interface GoldUniforms {
  mvp: Mat4;
  model: Mat4;
  lightDir: Vec3;
  ambient: number;
}
const view: Vec3 = { x: 0, y: 0, z: 1 };
const goldMaterial: Material<GoldUniforms> = {
  cull: 'back',
  vertex(u, vin) {
    const clip = mat4MulVec4(u.mvp, { x: vin.position.x, y: vin.position.y, z: vin.position.z, w: 1 });
    const normal = mat4MulDir(u.model, vin.normal);
    return { clip, world: vin.position, normal, uv: vin.uv, color: vin.color, bary: { x: 0, y: 0, z: 0 } };
  },
  fragment(u, vy) {
    const n = normalize3(vy.normal);
    const diff = Math.max(u.ambient, dot3(n, u.lightDir));
    const hx = u.lightDir.x + view.x;
    const hy = u.lightDir.y + view.y;
    const hz = u.lightDir.z + view.z;
    const hl = Math.hypot(hx, hy, hz) || 1;
    const spec = Math.pow(Math.max(0, (n.x * hx + n.y * hy + n.z * hz) / hl), 28) * 200;
    return {
      r: Math.min(255, vy.color.x * diff + spec),
      g: Math.min(255, vy.color.y * diff + spec),
      b: Math.min(255, vy.color.z * diff + spec * 0.7),
      a: 1,
    };
  },
};

const mesh = coin();
const camera: Camera = {
  eye: { x: 0, y: 0, z: 3.3 },
  target: { x: 0, y: 0, z: 0 },
  up: { x: 0, y: 1, z: 0 },
  fovy: Math.PI / 3.2,
  near: 0.1,
  far: 100,
};
const light = normalize3({ x: -0.45, y: 0.7, z: 0.8 });

export function renderCoin(target: RenderTarget, t: number): void {
  target.clear(0, 0, 0);
  const aspect = target.width / target.height;
  const { viewProjection } = cameraMatrices(camera, aspect);
  const model = mat4Multiply(mat4RotY(t), mat4RotX(0.16));
  const mvp = mat4Multiply(viewProjection, model);
  rasterize(target, mesh, goldMaterial, { mvp, model, lightDir: light, ambient: 0.45 });
}
