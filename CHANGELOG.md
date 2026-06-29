# Changelog

All notable changes to this project are documented here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project
adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.1] - 2026-06-29

### Added

- Spinning-coin example (`examples/coin`) with a procedurally modelled
  Mario-style coin (raised rim, recessed field, embossed centre bar) and a
  glossy gold material.
- Animated coin GIF in the README, rendered with the library itself.

## [0.1.0] - 2026-06-28

Initial release.

### Added

- Software 3D renderer: perspective-correct, depth-tested triangle rasterizer.
- Programmable materials (`{ vertex, fragment }` shader pairs) with `lambert`,
  `glass`, `wisp`, and `piece` built-ins.
- Terminal encoders: `toHalfBlock`, `toShapeGlyph`, `toLuminance`.
- Meshes (`cube`, `quad`, `tetrahedron`, `parseObj`), camera matrices, vector and
  matrix math, `downsample`, and `bloom`.
- `termcade/png` subpath for PNG decoding (Node/Bun only); the core entry stays
  platform-neutral and bundles for the browser.
- Runnable cube example and a headless snapshot script.
