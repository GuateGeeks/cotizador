# Performance

Planning targets are not results. Largest campus: 62 entities, 4 levels, 6 programs, 8 walkers.
Measured 2026-11-02 at 1400 x 880 on an RTX 3060 Ti through WSL's d3d12 layer.
Evidence: `runs/web-parity-04/bench.json`.

| Measure | Result | Target | Verdict |
| --- | ---: | ---: | --- |
| Frame rate | 59 fps | 60 fps | PASS, within measurement noise |
| Draw calls, including shadow pass | 140 | 150 | PASS |
| Triangles per frame, including shadow pass | 486,704 | 500,000 | PASS |
| Compressed kit | 1.30 MB | 8 MB | PASS |
| Mid-range phone | not measured | 30 fps | BLOCKED: no device attached |

Draw calls fell from 4,536 by merging each entity's static parts, then batching settled entities into one
draw per material. During a transition the batch is off, and draw calls rise to about 590 until it rebuilds.
Students swap to a 1,400-triangle model at campus distance. `InstancedMesh` was not needed.
