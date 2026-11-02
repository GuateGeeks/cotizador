# GuateGeeks World Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the reusable GG asset pipeline, kit and interactive growing school in this repo, ready for a later approved cotizador swap.

**Architecture:** One data contract (`world/*.json`) feeds Blender generators and the web runtime. Blender produces validated GLBs, previews and manifests; a pure layout engine turns quote scope into stable modules; a Three.js scene diffs those modules into shared, instanced entities.

**Tech Stack:** Blender 5.2.3 Python (headless, Windows from WSL), Python 3 `unittest`, Node 22, Vite, `three` 0.186.1, Vitest, Playwright, meshopt.

**Spec:** `docs/superpowers/specs/2026-11-01-guategeeks-world-design.md` (the source brief it cites stays authoritative for art direction).

## Global Constraints

- Blender: 1 unit = 1 m, Z up, front −Y. Three.js: Y up, front +Z, no runtime scale.
- Bay 6.0 × 5.0 m, floor-to-floor 3.2 m, primary student 1.35 m. Change these only in `world/constants.json`.
- Every paid Meshy step is announced with its credits. M2 ceiling: 200 credits in total, 74 already spent. Later milestones need a new estimate first.
- Verdicts: `PASS`, `FAIL`, `BLOCKED`, `NOT_RUN`; technical, visual, content and provenance are separate. Open images before any visual verdict.
- New run directory per result; never overwrite evidence. At most two correction rounds per slice asset before reporting to the user.
- One heavy GPU job at a time. Blender is the Windows executable with `wslpath -w` paths from a git-ignored local config.
- No LEGO, SPIKE or micro:bit marks on models. No CDN at runtime. No price logic in the scene.
- `.blend` and GLB are git-ignored until binary storage is chosen; manifests carry their hashes.
- Do not touch the `cotizador` repo. M6 is out of scope for this plan.

## Review Focus

- Removing a level or program from the quote: only that module leaves and the others keep their positions. Task 11 pins it.
- Empty or malformed quote input, or no levels: a valid one-room example appears and nothing throws. Task 11 pins it.
- Rapid repeated scope changes: the scene converges on the latest state without a queue or leaked geometry. Task 13 pins it.
- A GLB fails to load or WebGL is unavailable: an error is reported and the host's manual flow continues. Task 10 pins it.
- Reduced motion: additions appear at once and render stops at rest. Task 13 pins it.

---

## File Map

| Path | Responsibility |
|---|---|
| `world/constants.json`, `world/materials.json` | Shared dimensions and PBR values |
| `scripts/world.py` | CLI: `build`, `preview`, `validate`, `doctor` |
| `scripts/blender/gg/{geometry,materials,export,preview,sockets}.py` | Blender library |
| `scripts/blender/assets/{furniture,vegetation,architecture,equipment,characters}.py` | Generators registered by asset ID |
| `scripts/blender/entry.py` | Headless entry point run inside Blender |
| `scripts/asset-validation/glb.py` | Dependency-free GLB reader and checks |
| `tests/` | Python tests |
| `web/src/layout/{normalize,plan}.js` | Pure layout engine |
| `web/src/world/{materials,assets,entities,create-world}.js` | Runtime |
| `web/src/app/` | Preview shell |
| `assets/manifests/<id>.json` | Per-asset record |

## M1 Foundation

### Task 1: Contracts and CLI

**Files:** Create `world/constants.json`, `world/materials.json`, `scripts/world.py`, `.local/config.example.json`, `tests/test_contracts.py`, `docs/STYLE_BIBLE.md`, `docs/PRODUCTION_PIPELINE.md`.

**Interfaces:** Produces `load_contract() -> dict` in `scripts/world.py`; `world.py doctor` printing Blender version and GPU device.

- [ ] Write `tests/test_contracts.py`: the ten required `GG_*` materials exist with the brief's roughness (0.48, 0.42, 0.40, 0.62, 0.80, 0.68, 0.72) and metallic 0; canonical palette hex values match the brief; `bay == [6.0, 5.0]`, `floor == 3.2`.
- [ ] Run `python3 -m unittest tests.test_contracts`; expect FAIL.
- [ ] Add the JSON files, `load_contract`, and `doctor`; document naming and scale in the docs.
- [ ] Run tests and `python3 scripts/world.py doctor`; expect PASS and `5.2.3`.
- [ ] Commit.

### Task 2: Blender library

**Files:** Create `scripts/blender/gg/geometry.py`, `materials.py`, `sockets.py`, `scripts/blender/entry.py`; test `tests/test_blender_lib.py` (runs Blender).

**Interfaces:** Consumes contracts. Produces `Build(asset_id)`, `box`, `cyl`, `ball`, `limb`, `arch`, `At` as in the spike; `gg_material(name)`; `add_socket(build, name, loc)`; `register(asset_id, budget=None)` decorator.

- [ ] Write a test running `entry.py --check`: every material is a single Principled BSDF whose values equal the JSON, and a `box` with 2 bevel segments has no degenerate faces.
- [ ] Run; expect FAIL.
- [ ] Port helpers from `poc_world.py`, replacing palette literals with the JSON.
- [ ] Run; expect PASS.
- [ ] Commit.

### Task 3: Export, validation and previews

**Files:** Create `scripts/blender/gg/export.py`, `preview.py`, `scripts/asset-validation/glb.py`; test `tests/test_glb.py`.

**Interfaces:** Produces `world.py build <id> --run <dir>`, writing `<id>.glb`, `<id>.blend`, `assets/manifests/<id>.json` (ID, triangles, materials, size, sockets, sha256, Blender version, budget, verdict fields) and views `front right left back top three-quarter neutral final`. Produces `validate_glb(path) -> dict`.

- [ ] Write `tests/test_glb.py` with a small fixture: `validate_glb` reports triangles, material names, node names and bounds; rejects non-GLB bytes.
- [ ] Run; expect FAIL.
- [ ] Implement export, manifest, views and validator, with neutral view overriding all materials to a grey.
- [ ] Build a throwaway asset, then assert the manifest triangles equal the GLB's and all eight PNGs exist.
- [ ] Commit.

### Task 4: Web foundation and material match

**Files:** Create `web/package.json` (`three` 0.186.1 exact), `web/vite.config.js`, `web/src/world/materials.js`, `web/src/app/compare.html`, `web/test/materials.test.js`, `docs/MATERIALS.md`.

**Interfaces:** Produces `materialFor(name) -> THREE.Material`, returning one shared instance per name.

- [ ] Write a Vitest test: same name returns the same instance; `GG_GlassSoft` is transparent and not transmissive; colours equal `world/materials.json`.
- [ ] Run; expect FAIL.
- [ ] Implement the factory and a compare page rendering one GLB with neutral tone mapping.
- [ ] Render the chair in Blender and Three.js, open both, record the visual verdict in `docs/MATERIALS.md`.
- [ ] Commit.

## M2 Vertical Slice

### Task 5: Chair, desk, tree

**Files:** Create `scripts/blender/assets/furniture.py`, `vegetation.py`, `tests/test_slice_assets.py`.

**Interfaces:** Asset IDs `furn-chair-orange`, `furn-chair-turquoise`, `furn-table-four`, `veg-tree-large`. `tree(seed, scale)`.

- [ ] Write tests: chair ≤ 1,000 triangles, tree ≤ 1,500, same tree seed gives the same hash, different seed differs.
- [ ] Run; expect FAIL.
- [ ] Implement; `furn-table-four` is the table only, with chairs placed by the scene.
- [ ] Run tests, open the views, record verdicts in the manifests.
- [ ] Commit.

### Task 6: Classroom, entrance, roof

**Files:** Create `scripts/blender/assets/architecture.py`, test `tests/test_sockets.py`; create `docs/ASSEMBLY_SYSTEM.md`.

**Interfaces:** IDs `arch-classroom-standard`, `arch-entrance`, `arch-roof`. Sockets `socket_east`, `socket_west`, `socket_floor_above`, `socket_floor_below`. `check_pair(a, sa, b, sb) -> gap_m` measured from GLB nodes.

- [ ] Write tests: classroom east to classroom west gap ≤ 0.001 m, floor_above to floor_below gap ≤ 0.001 m, sockets at the bay's real edges, and the classroom shell excludes furniture.
- [ ] Run; expect FAIL.
- [ ] Implement, carrying real wall openings over from the spike, and fix the POC's grey glass.
- [ ] Run tests, open views, record verdicts.
- [ ] Commit.

### Task 7: Procedural rover

**Files:** Create `scripts/blender/assets/equipment.py`; test in `tests/test_slice_assets.py`.

**Interfaces:** ID `equip-rover-spike` with separate nodes `wheel_l`, `wheel_r`, `head`, each pivoted at its axis.

- [ ] Add tests: 2,000–5,000 triangles; wheel nodes exist with origin at the axle (within 1 mm of the wheel's bounds centre).
- [ ] Run; expect FAIL.
- [ ] Model against `rover-crop.png`: white hub, raised sensor head, turquoise wheels, yellow beams, bundled white cables; no marks.
- [ ] Run tests, open views, compare with reference, record verdict.
- [ ] Commit.

### Task 8: Student reduction and clips

**Files:** Create `scripts/blender/assets/characters.py`; test `tests/test_student.py`; append to `assets/sources/meshy/poc/PROVENANCE.json` only as a new file `assets/sources/meshy/student-v1/PROVENANCE.json`.

**Interfaces:** ID `char-student-primary`, skinned, height 1.35 ± 0.01 m at rest, clips `idle walk sit interact`.

- [ ] Write tests: ≤ 6,000 triangles, height within tolerance, four named clips, a single skeleton.
- [ ] Run; expect FAIL.
- [ ] Decimate in Blender keeping weights and the texture at ≤ 1024 px; author `idle`, `sit`, `interact` locally on the Meshy skeleton, keeping the Meshy `walk`. Use paid Meshy actions only if local clips fail, after announcing credits.
- [ ] Render silhouette and walk comparison against the 20k model, and inspect shoulders, elbows, hips, knees, skirt and backpack in each clip.
- [ ] If reduction fails visually, record `FAIL` and stop to report rather than loosening the budget.
- [ ] Commit.

### Task 9: Interactive slice scene

**Files:** Create `web/src/world/assets.js`, `web/src/world/create-world.js`, `web/src/app/slice.html`, `web/test/slice.browser.mjs`.

**Interfaces:** `createWorld(container, opts)` returning `update(data)`, `resize`, `rotate`, `zoom`, `resetView`, `setPaused`, `setFocus`, `capture`, `getDiagnostics`, `dispose`, names matching `createMascot`.

- [ ] Write a Playwright test: slice page loads all seven assets, diagnostics report zero errors and nonzero triangles, and `dispose` returns geometries to baseline.
- [ ] Run; expect FAIL.
- [ ] Implement with an orthographic camera, `#F4F1F6` stage, baked or blob contact shadows, and the student walking.
- [ ] Run; capture with real GPU settings; open screenshots.
- [ ] Commit.
- [ ] **Stop for the user's visual sign-off.** Do not start M3 until it is given.

## M3 School Expansion

### Task 10: Loading failure and progressive load

**Files:** Modify `web/src/world/assets.js`; test `web/test/assets.test.js`.

**Interfaces:** `loadAsset(id) -> Promise<Asset>`; `opts.onError({kind, id})`.

- [ ] Write tests: a failed fetch rejects once, calls `onError`, and does not poison later loads; no WebGL makes `createWorld` report `{kind:'webgl'}` and return an inert handle.
- [ ] Run; expect FAIL. Implement. Run; expect PASS. Commit.

### Task 11: Layout engine

**Files:** Create `web/src/layout/normalize.js`, `plan.js`, `web/test/layout.test.js`, `web/test/fixtures/*.json`.

**Interfaces:** `normalizeWorldInput(input)`, same output shape as `normalizeCampusData`; `planWorld(normalized) -> {modules:[{key,type,x,z,floor,rot}], island:{tiles}}`. Keys `room:<level>:<n>`, `upper:<level>:<n>`, `project:<program>`, `patio:drones`, `stairs:<side>`, `bridge:<a>:<b>`.

- [ ] Write tests: fixtures copied from the cotizador's behaviour normalise identically; identical input gives deep-equal plans; adding scope never moves an existing key; removing scope removes only its dependent keys; `{}`, `null` and unknown IDs give one `room:pre:0`; no two modules overlap on a floor; `levels` at the limits fit.
- [ ] Run; expect FAIL. Implement. Run; expect PASS. Commit.

### Task 12: Full module kit

**Files:** Modify `scripts/blender/assets/architecture.py`; extend `tests/test_sockets.py`.

**Interfaces:** IDs for all 16 modules in the brief: `arch-terrain-tile`, `-classroom-standard`, `-classroom-expandable`, `-classroom-corner`, `-classroom-end`, `-classroom-upper`, `-roof`, `-support`, `-entrance`, `-corridor`, `-stairs`, `-bridge`, `-courtyard`, `arch-planter`, `-pathway`, `-balcony`.

- [ ] Write tests: every declared socket pair in `world/sockets.json` closes within 1 mm with matching elevation.
- [ ] Run; expect FAIL. Implement. Run; expect PASS.
- [ ] Open a sheet of all modules; record verdicts. Fix POC's dead-end stairs: stairs must arrive at a balcony and door. Commit.

### Task 13: Incremental growth

**Files:** Create `web/src/world/entities.js`; modify `create-world.js`; test `web/test/growth.browser.mjs`.

**Interfaces:** `diffEntities(prev, next) -> {add, remove, keep}`.

- [ ] Write tests: `update` with one added room creates one entity and leaves other entity objects identical; 50 rapid updates converge on the last state with stable geometry count; reduced motion applies at once and `framePending` is false at rest.
- [ ] Run; expect FAIL. Implement scale, translation and easing. Run; expect PASS.
- [ ] Capture one-room, multi-room and two-storey states; open images. Commit.

## M4 Full Library

Before each task, state any Meshy credit estimate and wait for approval if it exceeds a new ceiling set after sign-off.

### Task 14: Remaining equipment

**Files:** Modify `scripts/blender/assets/equipment.py`, extend tests.

**Interfaces:** IDs `equip-dino`, `equip-rover-programmable`, `equip-electronics-kit`, `equip-drone`, `equip-vr-set`, `equip-printer`, `equip-laptop`, `equip-screen`, `equip-arm`, `equip-organizer`, `equip-kit-storage`, with pivots `rotor_*`, `lid`, `joint_*` where relevant.

- [ ] Add budget and pivot tests per asset; run, FAIL; implement; run, PASS; open views; commit per family.

### Task 15: Character variants

**Files:** Modify `scripts/blender/assets/characters.py`; add new provenance per variant.

**Interfaces:** IDs `char-student-pre`, `-primary-boy`, `-basico`, `-bach`, `char-teacher`, sharing `char-student-primary`'s skeleton and clip names.

- [ ] Announce credits (about 39 each for concept and 3D plus 5 rig), then generate one at a time, inspecting before reduction; add tests as in Task 8; commit per variant.

### Task 16: Furniture and vegetation

**Files:** Modify `furniture.py`, `vegetation.py`.

**Interfaces:** IDs for shelves, whiteboard, laptop desk, equipment table, bench, planters, small tree, shrubs, flowers, lamp, tiles.

- [ ] Add budget and seed tests; run, FAIL; implement; run, PASS; open a sheet; commit. Update `docs/ASSET_CATALOG.md` from manifests by script.

## M5 Optimisation and Readiness

### Task 17: Activities and parity

**Files:** Create `web/src/world/activities.js`, modify `create-world.js`; test `web/test/parity.browser.mjs`.

**Interfaces:** Remaining `createMascot` methods `agentGesture`, `setInsets`, `setHoverVerb`, `setView`.

- [ ] Write tests for each parity item in the spec's section 10, including all six programs recognisable through `getDiagnostics().animatedPrograms`.
- [ ] Run; expect FAIL. Implement. Run; expect PASS. Commit.

### Task 18: LODs, instancing, compression, benchmark

**Files:** Create `scripts/asset-export/optimize.mjs`, `web/test/bench.browser.mjs`, `docs/PERFORMANCE.md`.

- [ ] Add LOD generation, `InstancedMesh` for repeats and meshopt with a local decoder.
- [ ] Write a test asserting visible LOD switch and draw calls ≤ 150 in the largest plan.
- [ ] Benchmark with real GPU settings; add a mid-range phone or record `BLOCKED`. Report measured numbers, revising targets only with evidence. Commit.

### Task 19: Readiness review

**Files:** Create `docs/SWAP-READINESS.md`.

- [ ] Run all tests, the browser matrix and a whole-branch review; open final renders; record verdicts per definition-of-done item; report to the user. M6 needs its own approval.
