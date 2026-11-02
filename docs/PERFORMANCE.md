# Performance

Planning targets are not results. Largest campus: 62 entities, 4 levels, 6 programs, 8 walkers.
Measured 2026-11-02, with all six characters, at 1400 x 880 on an RTX 3060 Ti through WSL's d3d12 layer.
Evidence: `runs/sky-parity-09/bench.json`.

| Measure | Result | Target | Verdict |
| --- | ---: | ---: | --- |
| Frame rate | 60 fps | 60 fps | PASS |
| Draw calls, including shadow pass | 135 | 150 | PASS |
| Triangles per frame, including shadow pass | 359,277 | 500,000 | PASS |
| Compressed kit | about 4.6 MB | 8 MB | PASS |
| Mid-range phone | not measured | 30 fps | BLOCKED: no device attached |

Draw calls fell from 4,536 by merging each entity's static parts, then batching settled entities into one
draw per material. During a transition the batch is off, and draw calls rise to about 600 until it rebuilds.
Characters swap to a 1,400-triangle model at campus distance. `InstancedMesh` was not needed.

## 2026-11-02 skyline pass

The V-shaped campus with roofs, terraces and details measured better than the old bar, because two
savings landed with it: chairs, shelves and storage hide at campus distance, and parked rovers merge
their wheels. A merge bug had silently cancelled the first saving before; it is now pinned by a test.
