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

## 2026-11-03 Drone field

Two drones race a gate-and-hoop course with two pilots and two watchers. Each drone is now one vertex-coloured
body plus four rotors (the single hovering drone was about 20 separate meshes), so the campus view fell to 120
draw calls at 60 fps (`runs/drone-11-parity`; it was 144). Verdict: PASS against the 150 budget. Focused on the
field: 187 draw calls, 1,136,020 triangles, 60 fps (`runs/drone-12-perf`), in line with the other close views.

## 2026-11-03 Electronics stations

The Electronics room became three workbench stations with four students. Verdict: over the stations design's first limits (142
campus draw calls, 1,080,000 focused triangles); the owner kept four students and raised them to 144 and
1,085,000. Campus view: 144 draw calls at 60 fps
(the two added students cost one draw each), parity PASS (`runs/lab-08-parity`). Focused with the x-ray open:
204 draw calls, 1,081,888 triangles, 60 fps (`runs/lab-07-perf`).

## 2026-11-03 Focused-room x-ray

A focused room is seen in close view, where every room's detail and full-detail characters show. That view had
never been measured: with the Makerzoid or Electronics room focused, the largest campus draws about 195 calls
and 1.06 million triangles at 60 fps before any x-ray (`runs/xray-00-baseline`), over the campus-view targets.
With the x-ray open, veils batch into one draw (one shared material) and the open room's shell copy merges per
material and joins the batch: Makerzoid 179 draw calls, Electronics 207, triangles within 1% of the baseline,
60 fps (`runs/xray-15-perf`). The campus view is unchanged at 142 draw calls (`runs/xray-16-parity`).
Close view over 500,000 triangles is a standing finding for phones.

## 2026-11-03 Classroom kits and Electronics bench

Classrooms now show their programs' kits, and the Electronics printer and arm work at a bench. The first
measurement read 164 draw calls: kits on the tables and the arm's and printer's moving parts, which cannot
merge. Making both close-view detail (dropped at campus distance like the chairs, no shadows) brought the
largest campus back to 60 fps, 142 draw calls and 363,608 triangles (`runs/kits-21-parity/bench.json`).

## 2026-11-03 Makerzoid dinosaur

With the kit dinosaur walking the Makerzoid room (one skinned, vertex-coloured mesh), a driver with a tablet
and two watchers, the largest campus measured 59 fps, 142 draw calls and 383,712 triangles
(`runs/dino-09-parity/bench.json`). A first run measured 45 fps while another session loaded the machine.

## 2026-11-02 VR room

With the immersive room as a VR space (three students in the `vr` loop wearing headsets, controllers in
close view), the largest campus measured 59 fps, 139 draw calls and 377,945 triangles including the shadow
pass (`runs/vr-17-parity/bench.json`; before: 135 draw calls). Each gear piece is one vertex-coloured mesh
that casts no shadow; distance models wear only the headset. Three students fit, so the fallback to two
was not needed.

## 2026-11-02 skyline pass

The V-shaped campus with roofs, terraces and details measured better than the old bar, because two
savings landed with it: chairs, shelves and storage hide at campus distance, and parked rovers merge
their wheels. A merge bug had silently cancelled the first saving before; it is now pinned by a test.
