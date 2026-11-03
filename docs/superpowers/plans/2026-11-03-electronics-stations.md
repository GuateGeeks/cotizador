# Electronics Room Stations Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn the Electronics room into three workbench stations in a U (3D printing, robotic arm, circuits) with four students and no classroom tables.

**Architecture:**
- Blender adds a short workbench, a stool, a spool rack and a tray of printed parts.
- A pure `STATIONS` list in `electronics-room.js` places every bench, prop, machine and student.
- `create-world.js` furnishes and seats the Electronics room from that list instead of the generic tables. The existing machine sway stays.

**Tech Stack:** Blender 5.2.3 headless (`scripts/world.py`), Python `unittest`, three.js, vitest, Playwright browser tests.

**Spec:** `docs/superpowers/specs/2026-11-03-electronics-stations-design.md`

## Global Constraints

- **The room:** room-local metres, open front at +z.
  - The side walls' inner faces are at x ±2.75, the back wall's inner face at z −2.25.
  - `furn-shelves` stays at (2.1, −1.95) and `equip-kit-storage` at (−2.1, −1.95), in `entity.extra`.
- **Benches:**
  - A workbench's front (where people stand) is glTF +Z: rotation 0 faces the room front, +π/2 faces +x, −π/2 faces −x.
  - Both benches' worktops are at 0.75 m (`socket_top`).
  - `furn-workbench-short`: 1.4 × 0.7 m, with a back upstand of about 0.1 m instead of a pegboard, at most 1,200 triangles.
- **Props:**
  - `furn-stool`: seat top at 0.30 m, at most 400 triangles.
  - `equip-spool-rack`: at most 700 triangles.
  - `equip-printed-parts`: at most 500 triangles.
- **People:** Electronics population 4. If performance fails, use 3 by dropping the second circuits student.
- **Removed:** the room's two `furn-table-four`, their chairs, the seat chair, and `PROGRAM_SETUP.electronics`.
- **Detail at distance:** benches, stools, props, laptop and kits merge with the room at every distance. The printer and arm stay close-view detail and keep swaying.
- **Performance:** the campus view at 142 draw calls or fewer with the parity test passing. The focused Electronics close view (x-ray open) at most 215 draw calls and 1,080,000 triangles at 60 fps.
- **Evidence:** a new run directory per result (`runs/lab-NN-*`). Never declare a visual verdict without opening the render.
- **Manifests:** Windows Blender writes CRLF. After the Python suite, `git checkout -- assets/manifests docs/ASSET_CATALOG.md`.
- **Node:** `unset -f node npm npx; export PATH=/home/adawolfs/.nvm/versions/node/v22.23.4/bin:$PATH` from `web/`. Dev server on 127.0.0.1:4410; restart it after any `git stash`/`checkout` of sources.
- **Commits:** messages end with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

## Review Focus

1. Focusing the Electronics room opens it with the x-ray, and the stations stay readable from the default camera and when turned. Checked in Task 4's opened renders with the x-ray open.
2. A school without the Electronics program loads none of the new assets. Pinned in Task 3: the growth test's early states never request `furn-workbench-short`.
3. The arm's and printer's sway still runs on the new benches, and reduced motion leaves them at rest. Pinned in Task 3 through `electronics.swaying` and the existing diagnostics.
4. A student spot never overlaps a stool that is not theirs or another student. Pinned in Task 2's spacing test.
5. Changing the Electronics room's population in `plan.js` to 4 must not change other program rooms. Pinned in Task 2's layout test.

---

### Task 1: Short bench, stool, spool rack and printed parts

**Files:**
- Modify: `scripts/blender/assets/furniture.py` (`furn-workbench-short`, `furn-stool`)
- Modify: `scripts/blender/assets/equipment.py` (`equip-spool-rack`, `equip-printed-parts`)
- Test: `tests/test_slice_assets.py` (class `LabStations`)

**Interfaces:**
- Produces: the four assets above with the sizes and budgets in Global Constraints. `furn-workbench-short` records `socket_top` at 0.75. Each is one island.

- [ ] **Step 0: Baseline.** Run (dev server on): `node tools/focus-bench.mjs ../runs/lab-00-baseline electronics` (GPU env), and `node tools/review-sheet.mjs ../runs/lab-01-baseline furn-workbench`. Open `focus-electronics.png` and `compositions-sheet.png`.
- [ ] **Step 1: Write the failing test.**

```python
class LabStations(unittest.TestCase):
    def test_short_bench_matches_the_long_one_without_a_pegboard(self):
        m = build('furn-workbench-short')
        self.assertAlmostEqual(m['size_m'][0], 1.4, delta=.05)
        self.assertAlmostEqual(m['size_m'][2], .7, delta=.05)
        self.assertLess(m['size_m'][1], .9)  # no pegboard above the worktop
        self.assertAlmostEqual(m['sockets']['socket_top'][1], .75, places=3)
        self.assertLessEqual(m['triangles'], 1200)
        self.assertEqual(m['islands'], 1)

    def test_stool_seats_at_chair_height(self):
        m = build('furn-stool')
        self.assertAlmostEqual(m['size_m'][1], .30, delta=.02)
        self.assertLessEqual(m['triangles'], 400)
        self.assertEqual(m['islands'], 1)

    def test_printing_props_are_small_and_whole(self):
        for asset, budget in (('equip-spool-rack', 700), ('equip-printed-parts', 500)):
            m = build(asset)
            self.assertLessEqual(m['triangles'], budget, asset)
            self.assertLessEqual(max(m['size_m']), .45, asset)
            self.assertEqual(m['islands'], 1, asset)
```

- [ ] **Step 2: Run to verify it fails.** Run `python3 -m unittest tests.test_slice_assets.LabStations`. Expected: `KeyError` for the unregistered assets.
- [ ] **Step 3: Implement.**
  - `furn-workbench-short`: `workbench()`'s design at `W = 1.4`, with a `GG_PurpleDark` upstand (1.4 × 0.03 × 0.1) along the back edge instead of the pegboard and tools, and `add_socket('top', (0, 0, .75))`.
  - `furn-stool`: a round `GG_TurquoiseAccent` seat with its top at 0.30 m on four `GG_PurplePrimary` legs, plus a footring.
  - `equip-spool-rack`: a small stand holding two or three filament spools in accent colours.
  - `equip-printed-parts`: a shallow tray holding a few small printed shapes in accent colours.
- [ ] **Step 4: Run.** Run the same command. Expected: PASS.
- [ ] **Step 5: Build, publish and look.** Run `python3 scripts/world.py build furn-workbench-short furn-stool equip-spool-rack equip-printed-parts --run runs/lab-02-assets`, then `publish`. Open each `three-quarter.png`.
- [ ] **Step 6: Commit.**

```bash
git add scripts/blender/assets/furniture.py scripts/blender/assets/equipment.py tests/test_slice_assets.py assets/manifests/furn-workbench-short.json assets/manifests/furn-stool.json assets/manifests/equip-spool-rack.json assets/manifests/equip-printed-parts.json
git commit -m "feat: short workbench, stool, spool rack and printed parts"
```

---

### Task 2: The station layout

**Files:**
- Modify: `web/src/world/electronics-room.js` (replace `BENCH`, `BENCH_ITEMS`, `ELECTRONICS_SPOTS` with `STATIONS`, `ELECTRONICS_TEACHER`, `LAB_ASSETS`; keep `SWAY_PERIOD`, `swayPose`)
- Modify: `web/src/layout/plan.js` (Electronics population 4)
- Test: `web/test/electronics-room.test.js`, `web/test/layout.test.js`

**Interfaces:**
- Produces:
  - `STATIONS`: an array of `{ id, bench: { asset, x, z, rot }, items: [asset, x, z, rot][], students: { x, z, rot, clip, stool: boolean }[] }`. Items sit at `BASE + 0.75`; every value is room-local.
    - **`printing`:**
      - bench `furn-workbench-short` at (−2.38, −0.3), rot π/2
      - items:
        - `equip-printer` (−2.38, −0.65, π/2)
        - `equip-spool-rack` (−2.38, −0.05, π/2)
        - `equip-printed-parts` (−2.38, 0.25, π/2)
      - students: (−1.6, −0.3, −π/2, `idle`, no stool)
    - **`arm`:**
      - bench `furn-workbench-short` at (2.38, −0.3), rot −π/2
      - items:
        - `equip-arm` (2.38, −0.55, −π/2)
        - `equip-laptop` (2.38, 0.1, −π/2)
      - students: (1.6, −0.3, π/2, `interact`, no stool)
    - **`circuits`:**
      - bench `furn-workbench` at (0, −1.88), rot 0
      - items:
        - `equip-electronics-kit` (−0.5, −1.85, 0.2)
        - `equip-electronics-kit` (0.5, −1.85, −0.2)
      - students:
        - (−0.45, −1.2, π, `sit`, stool)
        - (0.45, −1.2, π, `sit`, stool)
  - `ELECTRONICS_TEACHER = [0, 0.5, Math.PI]`.
  - `LAB_ASSETS`: every asset the room needs (benches, items, `furn-stool`).
  - `footprint(bench) -> { minX, maxX, minZ, maxZ }`: 1.4 or 2.0 long, 0.7 deep, turned by `rot`.
  - The machines are the `equip-printer` and `equip-arm` items; `create-world` sways them as today.

- [ ] **Step 1: Write the failing tests.** Replace the old bench tests:

```js
const SHELVES = { minX: 1.575, maxX: 2.625, minZ: -2.115, maxZ: -1.79 }, STORAGE = { minX: -2.5, maxX: -1.7, minZ: -2.15, maxZ: -1.73 };
const overlap = (a, b) => a.minX < b.maxX && b.minX < a.maxX && a.minZ < b.maxZ && b.minZ < a.maxZ;
it('keeps every bench inside the walls and clear of the shelves, the storage and each other', () => {
  const boxes = STATIONS.map(s => footprint(s.bench));
  for (const b of boxes) {
    expect(b.minX).toBeGreaterThanOrEqual(-2.75); expect(b.maxX).toBeLessThanOrEqual(2.75);
    expect(b.minZ).toBeGreaterThanOrEqual(-2.25); expect(b.maxZ).toBeLessThanOrEqual(2.25);
    expect(overlap(b, SHELVES) || overlap(b, STORAGE)).toBe(false);
  }
  for (const [i, a] of boxes.entries()) for (const b of boxes.slice(i + 1)) expect(overlap(a, b)).toBe(false);
});
it('puts every student outside every bench and apart from each other', () => {
  const people = STATIONS.flatMap(s => s.students).concat([{ x: ELECTRONICS_TEACHER[0], z: ELECTRONICS_TEACHER[1] }]);
  for (const p of people) for (const s of STATIONS) {
    const b = footprint(s.bench);
    expect(p.x > b.minX - .15 && p.x < b.maxX + .15 && p.z > b.minZ - .15 && p.z < b.maxZ + .15, `${p.x},${p.z} inside ${s.id}`).toBe(false);
  }
  for (const [i, p] of people.entries()) for (const q of people.slice(i + 1)) expect(Math.hypot(p.x - q.x, p.z - q.z)).toBeGreaterThanOrEqual(.6);
});
it('puts every item on its bench top and faces students toward their bench', () => {
  for (const s of STATIONS) {
    const b = footprint(s.bench);
    for (const [, x, z] of s.items) expect(x >= b.minX && x <= b.maxX && z >= b.minZ && z <= b.maxZ, `${s.id} item off its bench`).toBe(true);
    for (const p of s.students) {
      const cx = (b.minX + b.maxX) / 2, cz = (b.minZ + b.maxZ) / 2;
      expect(Math.cos(Math.atan2(cx - p.x, cz - p.z) - p.rot)).toBeGreaterThan(.7);
    }
  }
});
it('has a printing, an arm and a circuits station with four students', () => {
  expect(STATIONS.map(s => s.id).sort()).toEqual(['arm', 'circuits', 'printing']);
  expect(STATIONS.flatMap(s => s.students)).toHaveLength(4);
});
```
Keep the existing sway tests. In `layout.test.js`, the program-room population test expects 4 for `electronics`, 3 for `immersive` and `master`, and 2 for the rest.

- [ ] **Step 2: Run to verify they fail.** Run `npx vitest run`. Expected: FAIL (`STATIONS` undefined; population 2).
- [ ] **Step 3: Implement** `STATIONS`, `footprint`, `ELECTRONICS_TEACHER`, `LAB_ASSETS`, and the population change.
- [ ] **Step 4: Run.** Run `npx vitest run`. Expected: all pass.
- [ ] **Step 5: Commit.**

```bash
git add web/src/world/electronics-room.js web/src/layout/plan.js web/test/electronics-room.test.js web/test/layout.test.js
git commit -m "feat: Electronics station layout"
```

---

### Task 3: The room from the stations

**Files:**
- Modify: `web/src/world/create-world.js` (`PROGRAM_SETUP.electronics` removed; the electronics branch of `furnish`, `placeBench` → `placeStations`, `seatElectronics`, `needs`, `electronicsDiagnostics`)
- Modify: `web/test/growth.browser.mjs`

**Interfaces:**
- Consumes: `STATIONS`, `ELECTRONICS_TEACHER`, `LAB_ASSETS`, `swayPose` (Task 2), and the assets (Task 1).
- Produces: `getDiagnostics().electronics`:

  ```js
  { onBench: string[], floorMachines: number, swaying: boolean, tables: number, stations: string[], students: number }
  ```

  - `tables` counts `furn-table-four` objects in the room.
  - `students` counts the room's student characters.

- [ ] **Step 1: Write the failing browser checks.**
  - **Final state:** fail unless all of these hold:
    - `electronics.tables === 0`
    - `electronics.stations` equals `['printing', 'arm', 'circuits']` in order
    - `electronics.students === 4`
    - `onBench` includes the printer and the arm
    - `floorMachines === 0`
    - `swaying === true`
  - **Earlier states without Electronics:** fail if `electronics` is non-null.
- [ ] **Step 2: Run to verify it fails.** Run `node test/growth.browser.mjs ../runs/lab-03-growth`. Expected: FAIL (`tables` 2, `stations` undefined).
- [ ] **Step 3: Implement.**
  - **`furnish`:** the Electronics room skips the generic tables, chairs and seat chair, and calls `placeStations`.
  - **`placeStations`:**
    - Each bench and non-machine item goes into `entity.inside`, merged.
    - Each stool goes in at its student spot.
    - Machines go into `entity.extra` at `BASE + 0.75`, with their sway pivots marked `userData.separate` and pushed to `entity.swayers`, as `placeBench` did.
  - **`seatElectronics`:** places each station's students with their clips (`sit` at `BASE + 0.02`), then the teacher at `ELECTRONICS_TEACHER` in `interact`.
  - **`needs`:** includes `LAB_ASSETS`.
  - **Diagnostics:** fill as specified, tagging stations by id.
- [ ] **Step 4: Run.** Run `npx vitest run`, `node test/growth.browser.mjs ../runs/lab-04-growth` and `node test/xray.browser.mjs ../runs/lab-05-xray`. Expected: all pass.
- [ ] **Step 5: Commit.**

```bash
git add web/src/world/create-world.js web/test/growth.browser.mjs
git commit -m "feat: the Electronics room is three workbench stations"
```

---

### Task 4: Performance, visual review and docs

**Files:**
- Modify: `docs/PERFORMANCE.md`, `docs/ASSEMBLY_SYSTEM.md`, `docs/SWAP-READINESS.md`, `docs/ASSET_CATALOG.md` (generated), and `verdicts.visual` of the four new assets.

- [ ] **Step 1: Measure.**
  - Run (GPU env) `node tools/focus-bench.mjs ../runs/lab-06-perf electronics` and `node test/parity.browser.mjs ../runs/lab-07-parity`.
  - Expected: Electronics focused at most 215 draw calls and 1,080,000 triangles at 60 fps; campus at most 142 draw calls, parity PASS.
  - If not, remove the second circuits student (and its stool), update the Task 2 and Task 3 tests to 3 students, and remeasure.
- [ ] **Step 2: Review renders.**
  - Capture the Electronics room focused from the default camera, `rotate(1.2)` and `rotate(-1.2)`, and with `reducedMotion`. Then `node tools/review-sheet.mjs ../runs/lab-09-review furn-workbench-short furn-stool equip-spool-rack equip-printed-parts`.
  - Open them all.
  - Expected:
    - three distinct stations around an open middle
    - students at their benches, seated students on stools
    - machines on the benches and moving
    - nothing inside walls or floating
  - Set the four assets' `verdicts.visual` from what you saw.
- [ ] **Step 3: Suites.**
  - Run `python3 -m unittest` (then restore manifests), `npx vitest run`, `node test/xray.browser.mjs ../runs/lab-10-xray`, and `npm run share` then `node test/share.browser.mjs ../runs/lab-11-share`.
  - Expected: all OK / PASS.
- [ ] **Step 4: Docs.**
  - `PERFORMANCE.md`: the measurement.
  - `ASSEMBLY_SYSTEM.md`: replace the bench paragraph with the stations.
  - `SWAP-READINESS.md`: the Electronics line.
  - Run `python3 scripts/world.py catalog`.
- [ ] **Step 5: Commit.**

```bash
git add docs assets/manifests
git commit -m "docs: Electronics stations performance, review and assembly notes"
```
