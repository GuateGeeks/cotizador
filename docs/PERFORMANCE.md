# Performance

Planning targets are not results. Measurements below are real and will grow with the campus.

| Measure (slice scene, 2026-11-01, RTX 3060 Ti via WSL d3d12) | Result | Target |
| --- | --- | --- |
| Triangles rendered per frame, including shadow pass | 97,224 | 500,000 at largest campus |
| Draw calls, including shadow pass | 502 | 150 at largest campus: **FAIL for now** |
| GLB download for the slice kit | under 1 MB | 8 MB |

Draw calls fail because instancing and merging belong to Task 18. Frame rate and phones are `NOT_RUN`.
