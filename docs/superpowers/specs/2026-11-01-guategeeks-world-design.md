# GuateGeeks World: design

Status: approved by the user ("proceed with the full implementation"). Date: 2026-11-01.
Source brief: "GuateGeeks 3D World Production System" (supplied in conversation) and
the five reference sheets in `assets/references/brief-20261101/`. The brief remains
authoritative for art direction, material values, module lists and deliverables; this
document records how it will be built and what was decided around it.

## 1. Intent

Replace the papercraft campus in the live cotizador with one cohesive, rounded,
toy-like 3D school that grows as a customer configures an educational proposal, so that
the quote visibly becomes "their school". The replacement is eventual: the live
cotizador is not touched until the new world proves itself.

## 2. Goals, non-goals, anti-goals

**Goals**
- A reusable kit: shared materials, modules with real sockets, characters, equipment,
  furniture and vegetation that look like one world.
- A deterministic, incremental growth experience driven by the quote's scope.
- A reproducible, traceable pipeline: every asset has a Blender source or recorded
  provider origin, a GLB, previews, metrics and a separate visual verdict.
- Ready to swap in: same scope inputs and an equivalent scene API to today's campus.

**Non-goals (for now)**
- Any change to the cotizador repo before the swap milestone.
- Price logic: the scene never computes or displays quote numbers it did not receive.
- The full asset library before the vertical slice is signed off.
- Publishing to `3d-assets`' public gallery or catalog.

**Anti-goals (a failure even if it technically works)**
- Unrelated models that do not read as one world.
- A school that is one inseparable mesh, or that rebuilds entirely on each change.
- Facets, paper folds, noisy textures, photorealism or heavy metal finishes.
- Regressing the manual quote flow, no-WebGL use, reduced motion or Geeky.
- Claiming performance from triangle counts, or visual approval from a clean export.
- Replicating specific Thiings catalog assets, or LEGO/SPIKE branding.

## 3. Current state

- `cotizador` (main): quote state in `asesor.js`, `motor.js`, `config.js`. The campus
  is code-built papercraft: `planCampus()` (`asesor/lab/paper/plan.js`) drives catalog
  pieces, shipped in `asesor/vendor/lab-scene.min.js` (1.15 MB). No GLB loading in the
  campus runtime. `three` 0.186.1. Budget 40,000 triangles; last recorded peak about
  39k (a memory from 2026-10-26, to be re-measured at the swap).
- Entry point: `window.GGLab.createMascot(container, opts)` returns `update, resize,
  rotate, zoom, resetView, setPaused, agentGesture, setFocus, setInsets, setHoverVerb,
  setView, capture, getDiagnostics, dispose`.
- Input: `normalizeCampusData()` (`asesor/lab/campus-layout.js`): `levels`, `programs`,
  `enrollment`, `students`, `equipment` (units, stations, sharing, plan, groups),
  `focusedLevel/Program`, `activeConfig`.
- IDs: levels `pre prim bas bach`; programs `tale master spike electronics drones
  immersive`.
- Tools verified 2026-11-01: Blender 5.2.3 LTS (Windows, driven from WSL), `bpy` 4.2
  for tests only, Node 22.23.4, RTX 3060 Ti 8 GB, Meshy MCP connected, 880 credits.

## 4. Approaches considered

1. GLB kit rendered from the existing `planCampus()`. Keeps growth rules and wiring;
   constrains the world to the current slots.
2. Models baked into JS data modules, as the Meshy students are today. No loader, but
   the bundle grows per asset and shared PBR materials and LODs fit poorly.
3. **Chosen by the user:** a new scene and a new layout engine in a separate project.
   Most freedom to match the floating-island references; the planner, activities and
   Geeky integration must be rebuilt, so regression risk is the main cost and is
   managed by the parity gate in section 10.

## 5. Decided by the user

- The world eventually replaces the papercraft campus in the live cotizador.
- Approach 3: new scene and layout engine.
- Separate project: new private sibling repo `../guategeeks-world`.

The user approved the sections below on 2026-11-01. Choices marked as targets remain
the author's calls.

## 6. Project shape

Local git repo at `makecode/guategeeks-world`; a GitHub remote is created only when
asked. Structure follows the brief's section 13:

```
assets/{references,sources/{blender,meshy},models/*,materials,animations,previews,manifests}
scripts/{blender,asset-validation,asset-export,previews}
web/            Vite app: world runtime + preview shell (three 0.186.1)
docs/           STYLE_BIBLE, ASSET_CATALOG, ASSEMBLY_SYSTEM, MATERIALS, PERFORMANCE,
                PRODUCTION_PIPELINE
runs/           per-run evidence, git-ignored, never overwritten
```

Blender runs as the Windows 5.2.3 executable with `wslpath -w` paths, headless, through
one driver script. Per-machine paths live in a git-ignored local config. `.blend` and
GLB files are git-ignored for now: Git LFS is not installed on this machine, and
binaries must not silently bloat history. Hashes in manifests keep them traceable until
LFS or another store is chosen. This means a fresh clone cannot yet restore them. The `gg3d-*` skills in `3d-assets` are reused by
reading them; verdict vocabulary is `PASS`, `FAIL`, `BLOCKED`, `NOT_RUN`, with
technical, visual, content and provenance judged separately.

The Sol/Luna production profile in `3d-assets/AGENTS.md` is not available in this
Claude session. Receipts record the actual model used, and that difference, rather than
substituting silently.

## 7. World contract

- **Units:** Blender 1 unit = 1 m, Z up, front −Y. Three.js Y up, front +Z: the glTF
  export conversion `(x, y, z) → (x, z, −y)`. No extra scale is applied in the runtime.
- **Reference heights:** primary student 1.35 m (brief: 1.3–1.5 m). Toy proportions
  apply to shape, not to the metric contract.
- **Module grid:** 6.0 × 5.0 m classroom bay, floor height 3.4 m. Terrain tile 1.0 m
  subdivision. Final numbers may change during the blockout; they must then change once,
  in one shared constants file consumed by both Blender and the web runtime.
- **Origins:** floor-standing assets at the centre of the ground contact. Animated parts
  keep their own pivots.
- **IDs:** stable kebab-case with a category prefix, e.g. `arch-classroom-standard`,
  `equip-rover-spike`, `char-student-primary`, `furn-chair-orange`, `veg-tree-large`.
- **Sockets:** empties named as in the brief, exported as GLB nodes, measured from
  geometry and validated pairwise by script (position within 1 mm, opposing facing,
  matching elevation).
- **Per-asset manifest:** the brief's section 13 list, including hashes and tool
  versions, in `assets/manifests/<id>.json`.

## 8. Materials

One Python definition of the palette and PBR values generates both the Blender material
library and a JSON consumed by a shared Three.js material factory, so the two cannot
drift. The ten `GG_*` materials and the brief's values are the starting point. Flat
Principled materials are the default; `MeshStandardMaterial` is used throughout,
`MeshPhysicalMaterial` only where a comparison render shows a visible benefit. Glass is
alpha-blended, not transmissive. Screens use emissive colour or small textures.

Colour-managed comparison of one asset rendered in Blender and in Three.js is a Phase 1
exit check.

## 9. Asset routes

| Route | Assets | Notes |
| --- | --- | --- |
| Blender procedural | Architecture, furniture, trees, terrain, sockets | Python generators with parameters and seeds |
| Meshy + Blender | Characters | Clean concept image, then 3D, rig, reduction and pose inspection |
| Blender first, Meshy only as shape reference | Rover, dinosaur, drone, VR headset, printer, laptop, screen, arm | Changed by the POC: the Meshy rover was noisy and fused into one mesh |

Meshy output is judged before optimisation; wrong results are regenerated, not patched.
Parameters, references and task IDs are kept. Textures are removed where regions can
map to `GG_*` materials, since this keeps the world coherent; otherwise they are limited
to 1024 px. Every paid step is announced with its estimated credits first. Proposed
ceiling for M2: 200 credits of the 880 available, stopping to ask before exceeding it.

Geometry compression uses meshopt (the cotizador already carries `meshoptimizer`), with
the decoder bundled locally; no external CDN at runtime.

### POC findings (2026-11-01)

Evidence: `runs/poc-03`, `runs/poc-meshy-01`, `runs/poc-meshy-04`; spike code in
`scripts/blender/poc_*.py` is reference only.

- The procedural kit reads as one rounded world, and sockets snapped with a 0.0 gap.
- Concept image, Meshy 3D, then auto-rig produced a strong student whose walk holds up at
  shoulders, hips and knees. Skirt and backpack stretch, and height needs normalising.
- Both Meshy models are about 20,000 triangles, so character reduction is an open risk.
- Floor-to-floor height is 3.2 m (0.2 m base plus 3.0 m walls), replacing the 3.4 m estimate.

## 10. Runtime

A new layout engine, pure ESM with no DOM, no three.js and no `Math.random`:

- `normalizeWorldInput(input)` accepts the same shape as `normalizeCampusData`, with
  that behaviour pinned by shared fixtures.
- `planWorld(normalized)` returns modules with stable keys. Key format stays compatible
  (`room:prim:0`, `project:spike`), because Geeky and focus address rooms by key.
- The floating rounded island grows in tile sets from one room to multiple rooms to a
  two-storey campus with stairs and bridges, per reference sheet 4. Existing keys never
  move once placed, and removing scope reverses the addition.

Scene:

- `createWorld(container, opts)` exposes the same method names as `createMascot`, so the
  swap is a small change in `asesor.js`.
- Entities are diffed by key and signature; only changed entities are created, animated
  or disposed. Geometry and materials are shared; repeats use instancing.
- Assets load progressively, with the island shell first so a slow network still shows
  something. A failed load falls back to the manual flow.
- Orthographic camera, render on demand, `#F4F1F6` stage, baked or cheap contact shadows.

**Parity gate before any swap:** manual and no-WebGL quoting, reduced motion, context
loss recovery, selection and focus, keyboard use, Geeky guidance and gestures, program
activities that make each of the six programs recognisable, and `getDiagnostics`.

## 11. Milestones

Each ends with evidence and a user-visible report.

- **M1 Foundation (brief phase 1):** repo tooling, style bible, material library and
  factory, preview automation (ortho views, 3/4, neutral, final), contracts, validators,
  Blender/Three comparison.
- **M2 Vertical slice (brief phase 2):** primary student (rigged, idle/walk/sit/interact),
  SPIKE-inspired rover, classroom, entrance, desk, chair, tree, assembled in an
  interactive preview. **Stops for the user's visual sign-off. No library production
  before it.**
- **M3 Expansion (brief phase 3):** full module kit, layout engine, one-room to two-storey
  growth with animation.
- **M4 Library (brief phase 4):** remaining equipment, characters, furniture, vegetation.
- **M5 QA and readiness (brief phase 5):** LODs, real GPU and mobile benchmarks,
  browser matrix, parity gate.
- **M6 Swap:** a separate approved change in the cotizador, behind a flag, with a rollback
  path. Deployment only when asked.

## 12. Performance

The brief's triangle ranges are planning targets. The 40,000-triangle campus limit does
not carry over; the new limit is set from real measurements in M5. Initial targets, to be
measured rather than assumed: at most 150 draw calls and 500k triangles in the largest
campus, 60 fps on the RTX 3060 Ti, 30 fps on a mid-range phone, and a first-load kit of
at most 8 MB compressed. If these prove wrong they are revised in `PERFORMANCE.md` with
the measurement, not silently.

## 13. Risks and constraints

- Meshy results may not match the references; the slice exists to learn this cheaply.
- Rigid-part characters are the fallback if auto-rig deformation fails inspection.
- WSL software rendering is not a GPU benchmark; real GPU needs the documented d3d12
  and ANGLE setup.
- One heavy GPU job at a time.
- Rights: the reference sheets are user-supplied. The rover must remain "inspired by",
  with no LEGO, SPIKE or micro:bit marks on the model. Whether the program names shown in
  the UI are licensed is the cotizador's existing concern.

## 14. Left to the builder

File-level architecture, generator internals, preview lighting, animation clip details,
exact LOD thresholds, test tooling, and the precise island outline, provided the contracts
above hold.
