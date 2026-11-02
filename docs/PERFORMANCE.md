# Performance

Planning targets are not results. Largest campus: 62 entities, 4 levels, 6 programs, 8 walkers.
Measured 2026-11-02, with all six characters, at 1400 x 880 on an RTX 3060 Ti through WSL's d3d12 layer.
Evidence: `runs/web-parity-06/bench.json`.

| Measure | Result | Target | Verdict |
| --- | ---: | ---: | --- |
| Frame rate | 57 fps | 60 fps | FAIL by 3 fps; was 59 before the full cast |
| Draw calls, including shadow pass | 149 | 150 | PASS, no margin |
| Triangles per frame, including shadow pass | 499,315 | 500,000 | PASS, no margin |
| Compressed kit | 4.46 MB | 8 MB | PASS |
| Mid-range phone | not measured | 30 fps | BLOCKED: no device attached |

Draw calls fell from 4,536 by merging each entity's static parts, then batching settled entities into one
draw per material. During a transition the batch is off, and draw calls rise to about 600 until it rebuilds.
Characters swap to a 1,400-triangle model at campus distance. `InstancedMesh` was not needed.
