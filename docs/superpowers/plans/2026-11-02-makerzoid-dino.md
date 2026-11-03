# Makerzoid Robot Dinosaur Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild the Makerzoid room's dinosaur as a block-and-motor kit robot that walks a loop through the room with a `walk` clip, driven by a student with a tablet while two others watch.

**Architecture:** Blender builds `equip-dino` as rigid kit parts joined into one vertex-coloured mesh skinned to a small armature, with a looping `walk` action and its stride recorded in the manifest. A pure module in the app defines the loop and the students' spots. `create-world.js` plays the clip, moves the dinosaur along the loop with the clip speed matched to travel, and turns the students to face it. The driver wears a new `equip-tablet` on the grip point added for the VR gear.

**Tech Stack:** Blender 5.2.3 headless (`scripts/world.py`), Python `unittest`, three.js, vitest, Playwright browser tests.

**Spec:** `docs/superpowers/specs/2026-11-02-makerzoid-dino-design.md`

## Global Constraints

- Only the Makerzoid room (`programId: 'master'`) changes; other rooms, walkers and the VR room stay as they are.
- No Meshy, no credits, no character rebuild. If the `interact` pose does not read as holding the tablet after adjusting the tablet, stop and ask the owner.
- `equip-dino` keeps its id and its 5,000-triangle budget, and is one mesh with one material.
- Shown at `DINO_SCALE = 1.5`. If the end-turn slip shows clearly in opened close-view frames, lower the scale (down to 1.2) before anything else.
- Students: a driver and two watchers replace the room's two current students. If performance fails, drop to one watcher.
- Performance on the largest campus: at most 150 draw calls and 500,000 triangles including the shadow pass, and `test/parity.browser.mjs` passing; 59-60 fps is within noise of the 60 fps target.
- A new run directory per result (`runs/dino-NN-*`). Never declare a visual verdict without opening the render.
- Manifests are written by Windows Blender with CRLF line endings; after the Python suite, restore with `git checkout -- assets/manifests docs/ASSET_CATALOG.md`.
- Shell is zsh: list asset ids explicitly.
- Node: `unset -f node npm npx; export PATH=/home/adawolfs/.nvm/versions/node/v22.23.4/bin:$PATH`, run from `web/`. The dev server on 127.0.0.1:4410 must be running for browser tests and review captures.
- Commit messages end with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

## Review Focus

1. Reduced motion (`reduceMotion`): the dinosaur must stand still at a valid spot on the loop, not at the room origin or inside a table. Test in Task 4 (`loopPoint(0)` is inside the strip) and checked in Task 6's reduced-motion capture.
2. Switching between close view and campus view must not freeze or teleport the dinosaur: it stays visible at every distance, and its clip keeps updating. Pinned by the browser diagnostic in Task 5.
3. Rebuilding the Makerzoid room on a state change must not leave a second dinosaur or a stale mixer running. Pinned in Task 5 by counting dinosaurs after the growth test's rapid updates.
4. A character GLB without grip points must not throw: the driver goes without a tablet. Test in Task 3.
5. Campuses without the Makerzoid program must not load the dinosaur or the tablet. Pinned by the browser diagnostic in Task 5.

---

### Task 1: Vertex-colour material in the contract

**Files:**
- Modify: `world/materials.json` (new entry `GG_KitVertex`)
- Modify: `scripts/blender/gg/materials.py` (`gg_material` handles `vertexColors`)
- Modify: `web/src/world/materials.js` (`materialFor` sets `vertexColors`)
- Test: `web/test/materials.test.js`, `tests/test_contracts.py`

**Interfaces:**
- Produces: material name `GG_KitVertex`: `{"color": "#FFFFFF", "roughness": 0.5, "vertexColors": true}`. In Blender its Base Color comes from the mesh's active color attribute (Color Attribute node), so the glTF export writes `COLOR_0`. In the app `materialFor('GG_KitVertex').vertexColors === true`.

- [ ] **Step 0: Capture the baseline before any change**

Run (from `web/`, dev server running): `node tools/review-sheet.mjs ../runs/dino-00-baseline equip-dino`
Expected: `1 models, 7 compositions`. Open `compositions-sheet.png`.

- [ ] **Step 1: Write the failing tests**

```js
it('gives kit robots one material coloured per vertex', () => {
  const kit = materialFor('GG_KitVertex');
  expect(kit.vertexColors).toBe(true);
  expect(materialFor('GG_IvorySoft').vertexColors).toBe(false);
});
```
```python
def test_kit_robots_have_a_vertex_colour_material(self):
    self.assertTrue(self.c['materials']['GG_KitVertex']['vertexColors'])
```

- [ ] **Step 2: Run to verify they fail**

Run: `npx vitest run test/materials.test.js` and `python3 -m unittest tests.test_contracts`
Expected: FAIL (`kit` is null; `KeyError: 'GG_KitVertex'`).

- [ ] **Step 3: Implement the three changes**, in the style of the existing `alpha` and `emissive` handling.

- [ ] **Step 4: Run the tests**

Run: the same two commands plus `python3 -m unittest tests.test_blender_lib`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add world/materials.json scripts/blender/gg/materials.py web/src/world/materials.js web/test/materials.test.js tests/test_contracts.py
git commit -m "feat: vertex-colour material for kit robots"
```

---

### Task 2: The kit dinosaur with its walk clip

**Files:**
- Create: `scripts/blender/assets/robot_dino.py` (`@register('equip-dino', budget=5000)`)
- Modify: `scripts/blender/assets/equipment.py` (remove the old `dino()` builder)
- Test: `tests/test_slice_assets.py`

**Interfaces:**
- Consumes: `GG_KitVertex` (Task 1).
- Produces:
  - `equip-dino.glb`: one skinned mesh with material `GG_KitVertex`; bones `body`, `leg_fl`, `leg_fr`, `leg_bl`, `leg_br`, `neck`, `head`, `tail`; animation `walk`.
  - Facing -Y in Blender / +Z in glTF. Length about 0.77 m and height about 0.5 m at scale 1, like today.
  - The manifest gains `stride` (metres travelled per loop of `walk` at scale 1) and `walk_seconds` (clip length).

- [ ] **Step 1: Write the failing test** (replace `'equip-dino'` in `Library.EQUIPMENT`, whose pivots no longer exist, and add):

```python
class KitDino(unittest.TestCase):
    def test_kit_dinosaur_is_one_skinned_mesh_with_a_walk(self):
        m = build('equip-dino')
        self.assertEqual(m['materials'], ['GG_KitVertex'])
        self.assertEqual(m['skins'], 1)
        self.assertEqual(m['animations'], ['walk'])
        self.assertLessEqual(m['triangles'], 5000)
        self.assertAlmostEqual(m['size_m'][2], .77, delta=.1)  # length along glTF Z
        self.assertGreater(m['stride'], .1)
        self.assertLess(m['stride'], .5)
        self.assertGreater(m['walk_seconds'], .8)
```

- [ ] **Step 2: Run to verify it fails**

Run: `python3 -m unittest tests.test_slice_assets.KitDino`
Expected: FAIL (materials are the old GG list, no skin).

- [ ] **Step 3: Implement `kit_dino()`**
- **Parts:** built with `box`/`cyl`/`ball` in GG materials:
  - purple beams with `GG_PurpleDark` peg-hole discs on their faces for the frame, legs and neck
  - green body and head panels
  - an ivory controller brick on the back with a turquoise light
  - motor housings (`GG_PurpleDark`, `GG_OrangeAccent` cap) at the four hips, the neck base and the tail base
  - ivory feet
- **Skeleton:** each part is assigned to one bone of a new armature by name.
- **Merging into one mesh:**
  - Write each part's material colour into a face-corner color attribute.
  - Join the parts into one mesh. Each vertex group gets weight 1 for its bone.
  - Add an armature modifier and parent the mesh to the armature.
  - Replace all materials with `gg_material('GG_KitVertex')`.
- **`walk` action:** 33 frames, looping, authored with world-axis bone rotations like `characters.py`:
  - diagonal pairs (`leg_fl` + `leg_br`, then `leg_fr` + `leg_bl`) swing ±25° about X
  - `head` bobs ±6°
  - `tail` swings ±15° about Z
  - `body` rises 1 cm at mid-stride
- **Return:** `{'clips': ['walk'], 'armature': arm.name, 'stride': stride, 'walk_seconds': 33 / 24}`, where stride = 2 × 2 × hip height × sin(25°) for the leg length measured from the build.
- **Remove** the old `dino()` from `equipment.py`.

- [ ] **Step 4: Run the test**

Run: `python3 -m unittest tests.test_slice_assets.KitDino tests.test_slice_assets.Library`
Expected: PASS.

- [ ] **Step 5: Build, publish and look**

Run: `python3 scripts/world.py build equip-dino --run runs/dino-01-kit` then `publish --run runs/dino-01-kit`.
Open `three-quarter.png`, `front.png`, `clip-walk-0-side.png` and `clip-walk-1-side.png`.
Expected: reads as a built robot (beams, holes, motors, controller), legs alternate, nothing detaches.

- [ ] **Step 6: Commit**

```bash
git add scripts/blender/assets/robot_dino.py scripts/blender/assets/equipment.py tests/test_slice_assets.py assets/manifests/equip-dino.json
git commit -m "feat: Makerzoid dinosaur rebuilt as a kit robot with a walk clip"
```

---

### Task 3: Tablet asset and wearing an item on a grip

**Files:**
- Modify: `scripts/blender/assets/equipment.py` (new `@register('equip-tablet', budget=300)`)
- Modify: `web/src/world/gear.js` (new `wearItem`; `wearGear` uses it)
- Test: `tests/test_slice_assets.py`, `web/test/gear.test.js`

**Interfaces:**
- Produces:
  - `equip-tablet`: 0.24 × 0.016 × 0.17 m (glTF x, y, z): a purple case with a turquoise screen facing up.
    - It is held at a grip point, so its centre is at the origin.
    - At the reference controller size, a 0.14 m hand length gives scale 1.
  - `wearItem(character: Object3D, kit: Map, point: string, id: string) -> boolean`:
    - parents a `gearMesh` of `id` to the named empty with an identity transform
    - returns false and does nothing if the empty or the asset is missing
    - `wearGear` keeps its signature and its return count, built on `wearItem`.

- [ ] **Step 1: Write the failing tests**

```python
class Tablet(unittest.TestCase):
    def test_tablet_is_small_flat_and_one_piece(self):
        m = build('equip-tablet')
        self.assertAlmostEqual(m['size_m'][0], .24, delta=.01)
        self.assertLess(m['size_m'][1], .03)
        self.assertEqual(m['islands'], 1)
```
```js
it('puts one item on a named grip, and skips a character without it', () => {
  const tabletKit = new Map([['equip-tablet', asset('equip-tablet', [[0, red]])]]);
  expect(wearItem(rig(['vr_grip_l']), tabletKit, 'vr_grip_l', 'equip-tablet')).toBe(true);
  expect(wearItem(rig([]), tabletKit, 'vr_grip_l', 'equip-tablet')).toBe(false);
});
```

- [ ] **Step 2: Run to verify they fail**

Run: `python3 -m unittest tests.test_slice_assets.Tablet`; `npx vitest run test/gear.test.js`
Expected: FAIL (`KeyError`; `wearItem` is not a function).

- [ ] **Step 3: Implement both**

- [ ] **Step 4: Run the tests**

Run: the same commands, then the full `npx vitest run`
Expected: PASS.

- [ ] **Step 5: Build and publish**

Run: `python3 scripts/world.py build equip-tablet --run runs/dino-02-tablet` then `publish`. Open `three-quarter.png`.

- [ ] **Step 6: Commit**

```bash
git add scripts/blender/assets/equipment.py tests/test_slice_assets.py assets/manifests/equip-tablet.json web/src/world/gear.js web/test/gear.test.js
git commit -m "feat: tablet asset and wearing one item on a grip point"
```

---

### Task 4: The loop and the room layout

**Files:**
- Create: `web/src/world/dino-room.js`
- Modify: `web/src/layout/plan.js` (master population 3)
- Test: `web/test/dino-room.test.js`, `web/test/layout.test.js`

**Interfaces:**
- Produces (room-local metres):
  - `DINO_SCALE = 1.5`, `DINO_SPEED = .35` (m/s along the loop).
  - `DINO_LOOP = { x: -.2, z: 1.25, half: 1.0, radius: .45 }`: a stadium whose two straights run along x at z 0.8 and 1.7, joined by half circles.
  - `loopLength() -> number`.
  - `loopPoint(distance: number) -> { x, z, heading }`: distance wraps modulo `loopLength()`; `heading` is the yaw (radians, three.js Y rotation) facing along travel.
  - `MASTER_SPOTS`: `{ driver: [2.1, 1.25], watchers: [[-2.3, .95], [-2.3, 1.6]] }`.
  - `MASTER_ASSETS`: `['equip-dino', 'equip-tablet', 'equip-laptop']`.

- [ ] **Step 1: Write the failing tests**

```js
const TABLES = [[-1.05, -.2], [1.35, -.2]]; // 1.3 x 1.3 m
const nearTable = (x, z, margin) => TABLES.some(([tx, tz]) => Math.abs(x - tx) < .65 + margin && Math.abs(z - tz) < .65 + margin);
const samples = Array.from({ length: 200 }, (_, i) => loopPoint(i / 200 * loopLength()));

it('keeps the whole loop in the open front strip, clear of the tables', () => {
  for (const { x, z } of samples) {
    expect(z).toBeGreaterThanOrEqual(.55);
    expect(z).toBeLessThanOrEqual(1.95);
    expect(Math.abs(x)).toBeLessThanOrEqual(2.6);
    expect(nearTable(x, z, .3)).toBe(false);
  }
});
it('keeps every student clear of the dinosaur', () => {
  for (const [sx, sz] of [MASTER_SPOTS.driver, ...MASTER_SPOTS.watchers]) for (const { x, z } of samples) expect(Math.hypot(x - sx, z - sz)).toBeGreaterThanOrEqual(.6);
});
it('closes the loop and faces along travel', () => {
  const a = loopPoint(0), b = loopPoint(loopLength());
  expect(a.x).toBeCloseTo(b.x); expect(a.z).toBeCloseTo(b.z);
  const c = loopPoint(.01);
  expect(Math.sin(a.heading)).toBeCloseTo((c.x - a.x) / .01, 1);
  expect(Math.cos(a.heading)).toBeCloseTo((c.z - a.z) / .01, 1);
});
```
In `layout.test.js`, update the program-room population test to expect `3` for `immersive` and `master`, `2` for the rest.

- [ ] **Step 2: Run to verify they fail**

Run: `npx vitest run`
Expected: FAIL (`dino-room.js` not found; master population 2).

- [ ] **Step 3: Implement `dino-room.js` and the population change**

- [ ] **Step 4: Run the tests**

Run: `npx vitest run`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add web/src/world/dino-room.js web/src/layout/plan.js web/test/dino-room.test.js web/test/layout.test.js
git commit -m "feat: Makerzoid room loop and student spots"
```

---

### Task 5: The dinosaur walks the room

**Files:**
- Modify: `web/src/world/create-world.js` (`PROGRAM_SETUP.master`, `furnish`, `seat`, `needs`, `tick`, `getDiagnostics`)
- Modify: `web/test/growth.browser.mjs`

**Interfaces:**
- Consumes: Task 2's `equip-dino` with `walk` and manifest `stride`/`walk_seconds`. Read them from `assets/manifests/equip-dino.json`, imported in the app like `constants.json`. Also Task 3's `wearItem`, and Task 4's module.
- Produces:
  - `getDiagnostics().dino = { count, x, z, timeScale, students, tablet }` for the `project:master` entity.
  - `count` is the number of dinosaurs in the room.
  - `x` and `z` are its room-local position.
  - `students` counts the driver and watchers.
  - `tablet` is whether the driver's close model holds one.

- [ ] **Step 1: Write the failing browser checks** in `growth.browser.mjs`:
  - **Every state without `master`:** fail unless `dino.count === 0`.
  - **Final state:** fail unless
    - `dino.count === 1`, `dino.students === 3` and `dino.tablet === true`
    - two readings 1 s apart differ in `x` or `z` by at least 0.2 m
    - `dino.timeScale` equals `DINO_SPEED * walk_seconds / (stride * DINO_SCALE)` to 2 decimals
  - **After the rapid-update stage:** fail unless `dino.count === 1`.
  - **Close view:** after the existing close/campus switch, focus `{ kind: 'program', id: 'master' }`, wait for `lod === 'close'`, and fail unless the position still changes over 1 s.

- [ ] **Step 2: Run to verify they fail**

Run: `node test/growth.browser.mjs ../runs/dino-03-growth`
Expected: FAIL naming `dino` (diagnostic missing).

- [ ] **Step 3: Implement**
- **`PROGRAM_SETUP.master`:** keeps only the laptop.
- **`furnish`, for `master`:** also clone `equip-dino` with `cloneSkinned` and place it in `entity.group` (not `inside`), scaled `DINO_SCALE`.
  - Start an `AnimationMixer` on `walk` with `timeScale` as above, pushed to `entity.mixers`.
  - Record `entity.dino = { object, mixer }`.
- **`tick`:** inside `if (animate())`, for each entity with `dino`, set its position and `rotation.y` from `loopPoint(elapsed * DINO_SPEED)`.
  - Then turn each tracker pair (both models) to `Math.atan2(dino.x - x, dino.z - z)`.
- **Placing:** set the same pose once at build, so reduced motion shows the dinosaur at `loopPoint(0)`.
- **`seat`, for `master`:**
  - the driver: `roster[0]` in `interact` at `MASTER_SPOTS.driver`, with `wearItem(pair.high, kit, 'vr_grip_l', 'equip-tablet')`
  - the watchers: roster students in `idle` at the watcher spots
  - each pair is pushed to `entity.trackers`
  - the teacher as today
- **`needs`, for `master`:** includes `MASTER_ASSETS`.
- **`getDiagnostics`:** fill `dino` as specified.

- [ ] **Step 4: Run the tests**

Run: `npx vitest run`, then `node test/growth.browser.mjs ../runs/dino-04-growth`
Expected: all pass, `PASS`.

- [ ] **Step 5: Commit**

```bash
git add web/src/world/create-world.js web/test/growth.browser.mjs
git commit -m "feat: the Makerzoid dinosaur walks its loop, driven from a tablet"
```

---

### Task 6: Performance, visual review and docs

**Files:**
- Modify: `docs/PERFORMANCE.md`, `docs/ASSEMBLY_SYSTEM.md`, `docs/SWAP-READINESS.md`, `docs/ASSET_CATALOG.md` (generated), `verdicts.visual` in the `equip-dino` and `equip-tablet` manifests

- [ ] **Step 2: Measure performance.** Run `GALLIUM_DRIVER=d3d12 LD_LIBRARY_PATH=/usr/lib/wsl/lib GG_GPU=1 node test/parity.browser.mjs ../runs/dino-05-parity`.
  Expected: PASS, at most 150 draw calls and 500,000 triangles. If not, drop to one watcher (spots, population and tests), rerun, and record why.
- [ ] **Step 3: Review renders.**
  - Capture the Makerzoid room at campus view, in close view at three moments 1 s apart (one during an end turn), in x-ray, and with `reduceMotion`.
  - Capture `node tools/review-sheet.mjs ../runs/dino-06-review equip-dino equip-tablet`.
  - Open all of them, plus the baseline.
  - Expected:
    - the dinosaur reads as a built robot
    - its feet stay planted on the straights
    - the turn slip is small; if it's clear, lower `DINO_SCALE` and recapture
    - it never crosses a table, chair or student
    - the students face it
    - the tablet reads as held; if not, adjust it, and if it still doesn't read, stop and ask
    - other rooms are unchanged
  - Set `verdicts.visual` on both assets from what you saw.
- [ ] **Step 4: Suites.** Run:
  - `python3 -m unittest`, then restore manifests
  - `npx vitest run`
  - `npm run share`
  - `node test/share.browser.mjs ../runs/dino-07-share`

  Expected: all OK / PASS.
- [ ] **Step 5: Docs.**
  - `PERFORMANCE.md`: the measurement.
  - `ASSEMBLY_SYSTEM.md`: a paragraph on the kit dinosaur, its loop and the tracking students.
  - `SWAP-READINESS.md`: the Makerzoid line.
  - `python3 scripts/world.py catalog`.
- [ ] **Step 6: Commit**

```bash
git add docs assets/manifests
git commit -m "docs: Makerzoid dinosaur performance, review and assembly notes"
```
