# Classroom Kits and Electronics Workbench Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Classrooms show the kits of the programs their grades actually use, and the Electronics room's printer and arm move off the floor onto a new workbench where they move.

**Architecture:**
- A pure layout function works out each level's programs from the school's equipment choices, falling back to each program's usual level when it has no groups.
- `planWorld` puts the result on classroom modules and their signatures.
- A pure kit module maps programs to table kits, and `furnish()` places them.
- Blender builds `furn-workbench`. The Electronics room stands the printer and arm on it, and the app sways their existing pivots.

**Tech Stack:** Blender 5.2.3 headless (`scripts/world.py`), Python `unittest`, three.js, vitest, Playwright browser tests.

**Spec:** `docs/superpowers/specs/2026-11-03-classroom-kits-design.md`

## Global Constraints

- **Scope:** only ordinary classrooms (`room:<level>:0`, `upper:<level>:0`) and the Electronics program room change. The Tale-Bot, Makerzoid, SPIKE, Drones and VR rooms, walkers and terraces stay as they are.
- **No external work:** no Meshy, no credits, no cotizador change.
- **Which programs a classroom shows:** a program counts for a level when one of its `equipment[program].groupIds` is an enrollment row of that level. A program with no `groupIds` counts for its usual levels:

  | Program | Usual levels |
  | --- | --- |
  | `tale` | pre |
  | `master` | prim |
  | `electronics` | prim |
  | `drones` | bas |
  | `spike` | bas, bach |
  | `immersive` | bach |

  Only programs in `programs` count. Order follows `PROGRAM_IDS`.
- **Which programs a table gets:** the ground classroom shows programs 1-2. The upper classroom shows programs 3-4, or 1-2 again when there are no more. One program goes on both tables; none keeps `LEVEL_TABLE_ITEM`.
- **The workbench:** `furn-workbench` is about 2.0 x 0.7 m and 0.75 m tall, has a pegboard back, and has a 1,500-triangle budget. The printer and arm stand on it at scale 1.
- **Performance:** at most 150 draw calls and 500,000 triangles, and the parity test passing. If it fails, apply these in order, measuring after each:
  1. Kits move to `entity.extra`.
  2. Kits stop casting shadows.
  3. The classroom `master` kit becomes an unskinned stand-in.
- **Evidence:** a new run directory per result (`runs/kits-NN-*`). Never declare a visual verdict without opening the render.
- **Manifests:** Windows Blender writes them with CRLF line endings. After the Python suite, restore with `git checkout -- assets/manifests docs/ASSET_CATALOG.md`.
- **Shell:** zsh; list asset ids explicitly.
- **Node:** run `unset -f node npm npx; export PATH=/home/adawolfs/.nvm/versions/node/v22.23.4/bin:$PATH` from `web/`. The dev server on 127.0.0.1:4410 must be running for browser tests and captures.
- **Commits:** messages end with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

## Review Focus

1. Changing one grade's programs must rebuild only the classrooms of that level, not every classroom. Test in Task 1 (signatures of the other levels' modules unchanged).
2. A program listed in `equipment` but not in `programs` (deselected) must not appear on any table. Test in Task 1.
3. Enrollment rows of a level with zero students still count as that level's groups, or a classroom would silently lose its kits. Test in Task 1 pins the rule: rows count whatever their student number.
4. Reduced motion leaves the arm and printer in their neutral pose, not frozen mid-swing at a random angle. Test in Task 4 (`swayPose(0)` is the neutral pose, and the room is posed once at build).
5. A classroom kit whose model failed to load must not take the classroom down with it. Pinned in Task 3: `needs()` lists kits, so the room waits or drops exactly like any room missing an asset; checked by the existing growth test's broken-asset stage still passing.

---

### Task 1: Each classroom's programs

**Files:**
- Create: `web/src/layout/classroom-programs.js`
- Modify: `web/src/layout/plan.js` (classroom modules get `programs`), `web/src/world/entities.js` (`signatureOf` includes `programs`)
- Test: `web/test/classroom-programs.test.js`, `web/test/entities.test.js`

**Interfaces:**
- Produces:
  - `HOME_LEVELS`: `{ tale: ['pre'], master: ['prim'], electronics: ['prim'], drones: ['bas'], spike: ['bas', 'bach'], immersive: ['bach'] }`.
  - `levelPrograms(data) -> Record<levelId, programId[]>`: `data` is `normalizeWorldInput`'s output. It returns every level in `data.levels`, with programs in `PROGRAM_IDS` order.
  - `tablePrograms(programs: string[], upper: boolean) -> string[]`, of length 0-2:
    - ground: the first two programs
    - upper: programs 3-4 if there are any, else the first two
  - Classroom modules (`room:<level>:0`, `upper:<level>:0`) carry `programs: tablePrograms(...)`.
  - `signatureOf` appends `(module.programs || []).join(',')`.

- [ ] **Step 0: Capture the baseline before any change**

Run (from `web/`, dev server running): `node tools/review-sheet.mjs ../runs/kits-03-baseline furn-table-four`
Expected: `1 models, 7 compositions`. Open `compositions-sheet.png`.

- [ ] **Step 1: Write the failing tests**

```js
// helpers build normalizeWorldInput-shaped data: rows of { id, levelId, students }, equipment by program
it('takes the programs whose groups include a row of the level, in program order', () => {
  expect(levelPrograms(data({ prim: ['p1-1'], bas: ['b1-1'] }, { electronics: ['p1-1'], master: ['p1-1'], drones: ['b1-1'] }))).toEqual({ prim: ['master', 'electronics'], bas: ['drones'] });
});
it('ignores groups of another level', () => { /* spike groups only bas rows -> bach gets nothing from spike */ });
it('ignores a program the school deselected', () => { /* equipment.spike present, 'spike' not in programs -> absent */ });
it('counts rows with no students', () => { /* row students: 0 still matches */ });
it('puts a program with no groups at its usual levels (the landing showcase)', () => {
  // showcase: all six programs, enrollment [], every groupIds []
  expect(levelPrograms(showcase)).toEqual({ pre: ['tale'], prim: ['master', 'electronics'], bas: ['spike', 'drones'], bach: ['spike', 'immersive'] });
});
it('gives the upper classroom the next two programs, or repeats', () => {
  expect(tablePrograms(['tale', 'master', 'spike'], false)).toEqual(['tale', 'master']);
  expect(tablePrograms(['tale', 'master', 'spike'], true)).toEqual(['spike']);
  expect(tablePrograms(['master'], true)).toEqual(['master']);
  expect(tablePrograms([], false)).toEqual([]);
});
```
In `entities.test.js`:
```js
it('rebuilds a classroom when its programs change, and only then', () => {
  const room = { key: 'room:prim:0', asset: 'arch-classroom-standard', x: 0, y: 0, z: 0, rot: 0, population: 2, programs: ['master'] };
  expect(signatureOf(room)).not.toBe(signatureOf({ ...room, programs: ['master', 'electronics'] }));
  expect(signatureOf(room)).toBe(signatureOf({ ...room, programs: ['master'] }));
});
```
And in the same file, an integration case with `planWorld`: changing only bas's equipment leaves every `room:prim:*`/`room:pre:*` signature unchanged.

- [ ] **Step 2: Run to verify they fail**

Run: `npx vitest run`
Expected: FAIL (module not found; signatures equal).

- [ ] **Step 3: Implement** the module, the two lines in `plan.js` where classrooms are built, and `signatureOf`.

- [ ] **Step 4: Run the tests**

Run: `npx vitest run`
Expected: all pass.

- [ ] **Step 5: Commit**

```bash
git add web/src/layout/classroom-programs.js web/src/layout/plan.js web/src/world/entities.js web/test/classroom-programs.test.js web/test/entities.test.js
git commit -m "feat: each classroom knows the programs its grades use"
```

---

### Task 2: The workbench

**Files:**
- Modify: `scripts/blender/assets/furniture.py` (new `@register('furn-workbench', budget=1500)`)
- Test: `tests/test_slice_assets.py`

**Interfaces:**
- Produces: `furn-workbench`, which is:
  - 2.0 m long (x), 0.75 m to the worktop, 0.7 m deep (front at -Y in Blender / +Z in glTF)
  - built with a pegboard back panel rising to about 1.3 m, with a few hanging tools
  - one island, with its top surface at exactly 0.75 m
  - recording a `socket_top` at the worktop centre, which the manifest reports

- [ ] **Step 1: Write the failing test**

```python
class Workbench(unittest.TestCase):
    def test_workbench_is_a_lab_bench_at_working_height(self):
        m = build('furn-workbench')
        self.assertAlmostEqual(m['size_m'][0], 2.0, delta=.05)
        self.assertAlmostEqual(m['size_m'][2], .7, delta=.05)
        self.assertGreater(m['size_m'][1], 1.1)                       # pegboard rises above the top
        self.assertAlmostEqual(m['sockets']['socket_top'][1], .75, places=3)
        self.assertLessEqual(m['triangles'], 1500)
        self.assertEqual(m['islands'], 1)
```

- [ ] **Step 2: Run to verify it fails**

Run: `python3 -m unittest tests.test_slice_assets.Workbench`
Expected: FAIL with `KeyError: 'furn-workbench'`.

- [ ] **Step 3: Implement** in the style of `furn-table-four`, with:
  - a worktop of `GG_IvorySoft` edged in `GG_PurplePrimary`
  - legs and a lower shelf in `GG_PurplePrimary`
  - a `GG_PurpleDark` pegboard dotted with `GG_IvorySoft` peg holes
  - two or three tools hanging on it in accent colours
  - `add_socket('top', ...)` (see `gg.sockets`) at the worktop

- [ ] **Step 4: Run the test**

Run: `python3 -m unittest tests.test_slice_assets.Workbench`
Expected: PASS.

- [ ] **Step 5: Build, publish and look**

Run: `python3 scripts/world.py build furn-workbench --run runs/kits-04-workbench`, then `publish`. Open `three-quarter.png` and `front.png`.
Expected: reads as a lab bench, not a table.

- [ ] **Step 6: Commit**

```bash
git add scripts/blender/assets/furniture.py tests/test_slice_assets.py assets/manifests/furn-workbench.json
git commit -m "feat: Electronics workbench with a pegboard"
```

---

### Task 3: Kits on the classroom tables

**Files:**
- Create: `web/src/world/classroom-kits.js`
- Modify: `web/src/world/create-world.js` (`furnish`, `needs`, `getDiagnostics`)
- Modify: `web/test/growth.browser.mjs`
- Test: `web/test/classroom-kits.test.js`

**Interfaces:**
- Consumes: `module.programs` (Task 1).
- Produces:
  - `TABLE_KITS`: maps each id in `PROGRAM_IDS` to a list of table items `[asset, dx, dz, scale, rotation]`, offsets from the table centre. Values:
    - `tale`: `equip-rover-programmable` at 1.
    - `master`: `equip-dino` at .45.
    - `electronics`: `equip-electronics-kit` at 1.
    - `spike`: `equip-rover-spike` at 1, plus `equip-laptop` at 1, the two side by side.
    - `drones`: `equip-drone` at .7.
    - `immersive`: `equip-vr-set` at 1.
  - `tableKits(programs: string[], fallback: string|null) -> Array<Array<[asset, dx, dz, scale, rotation]>>`, one list per table (2 tables):
    - two programs: one each
    - one program: on both
    - none: `[[fallback, 0, 0, 1, 0]]` per table, or empty lists when there is no fallback
  - `KIT_ASSETS(programs) -> string[]`: every asset those tables need.
  - Diagnostics: `getDiagnostics().tableKits` maps each classroom key to the asset ids on its tables, in table order.

- [ ] **Step 1: Write the failing tests**

```js
it('has a kit for every program, each small enough for a table top', () => {
  for (const id of PROGRAM_IDS) expect(TABLE_KITS[id]?.length, id).toBeGreaterThan(0);
  for (const items of Object.values(TABLE_KITS)) for (const [, dx, dz] of items) expect(Math.abs(dx) <= .45 && Math.abs(dz) <= .45).toBe(true);
});
it('splits two programs over the tables, repeats one, and falls back with none', () => {
  expect(tableKits(['master', 'electronics'], 'equip-organizer').map(t => t.map(i => i[0]))).toEqual([['equip-dino'], ['equip-electronics-kit']]);
  expect(tableKits(['drones'], 'equip-laptop').map(t => t.map(i => i[0]))).toEqual([['equip-drone'], ['equip-drone']]);
  expect(tableKits([], 'equip-laptop').map(t => t.map(i => i[0]))).toEqual([['equip-laptop'], ['equip-laptop']]);
});
```
In `growth.browser.mjs`, on the final state, fail unless all of these hold:
- `tableKits['room:prim:0']` is `[['equip-dino'], ['equip-electronics-kit']]`
- `tableKits['room:bas:0']` has the drone on one table and the SPIKE rover and laptop on the other
- `tableKits['room:pre:0']` is two rovers

On state 2 (no programs), fail unless every classroom shows its `LEVEL_TABLE_ITEM`.

- [ ] **Step 2: Run to verify they fail**

Run: `npx vitest run`, then `node test/growth.browser.mjs ../runs/kits-05-growth`
Expected: FAIL (module missing; `tableKits` undefined).

- [ ] **Step 3: Implement**
- **Module:** write `classroom-kits.js` as specified.
- **`furnish`:** for classroom modules (`levelId` set, no `programId`), replace the `LEVEL_TABLE_ITEM` loop with `tableKits(module.programs, LEVEL_TABLE_ITEM[module.levelId])`. Place each item at `TOP` on the table at x -1.05 / 1.35, z -0.2.
  - Rename wheels and rotors to `still_` (as `PROGRAM_SETUP` does for wheels), so parked rovers and drones merge with the room.
  - Clone `equip-dino` with `cloneSkinned`, with no mixer.
  - Record the ids in `entity.tableKits`.
- **`needs`:** add `KIT_ASSETS(module.programs)` for those modules.
- **Diagnostics:** fill `tableKits` from the entities.

- [ ] **Step 4: Run the tests**

Run: `npx vitest run`, then `node test/growth.browser.mjs ../runs/kits-06-growth`
Expected: all pass, `PASS`.

- [ ] **Step 5: Commit**

```bash
git add web/src/world/classroom-kits.js web/src/world/create-world.js web/test/classroom-kits.test.js web/test/growth.browser.mjs
git commit -m "feat: classroom tables show the kits of the programs their grades use"
```

---

### Task 4: The Electronics workbench room

**Files:**
- Create: `web/src/world/electronics-room.js`
- Modify: `web/src/world/create-world.js` (`PROGRAM_SETUP.electronics`, `furnish`, `seat`, `needs`, `tick`, `getDiagnostics`)
- Test: `web/test/electronics-room.test.js`, `web/test/growth.browser.mjs`

**Interfaces:**
- Consumes: `furn-workbench` and its `socket_top` (Task 2), read from `assets/manifests/furn-workbench.json` in the app like `equip-dino.json`.
- Produces:
  - `BENCH = { x: 1.0, z: 1.45, rot: 0 }` (room-local; its 2.0 x 0.7 m footprint spans x 0.0..2.0, z 1.1..1.8).
  - `BENCH_ITEMS`: `[asset, dx, dz, rotation]` on the worktop: `equip-printer` at dx -0.55 and `equip-arm` at dx 0.45, both dz 0, both facing the open front.
  - `ELECTRONICS_SPOTS = { bench: [2.45, 1.45, -Math.PI / 2], seat: [.47, -.2, Math.PI / 2] }`: the standing student at the bench end facing the arm in `interact`; the seated student on the seat chair in `sit`.
  - `SWAY_PERIOD = 6` (seconds per loop).
  - `swayPose(t: number) -> { joint_base, joint_shoulder, joint_elbow, head_printer }`, the rotation (radians about the pivot's Y, X, X) or offset (metres along X) at time t. Periodic, with `swayPose(0)` the neutral pose (all 0).
  - The electronics room's tables keep `equip-electronics-kit` (the two old `PROGRAM_SETUP` table entries).
  - Diagnostics: `getDiagnostics().electronics = { onBench: string[], floorMachines: number, swaying: boolean }`.

- [ ] **Step 1: Write the failing tests**

```js
it('stands the bench in the visible front strip, clear of the tables', () => {
  expect(BENCH.z - .35).toBeGreaterThanOrEqual(1.0);
  expect(BENCH.x - 1.0).toBeGreaterThanOrEqual(-1.0);           // not in the hidden left part
  const tableFront = -.2 + .65;
  expect(BENCH.z - .35 - tableFront).toBeGreaterThanOrEqual(.6);  // room to pass
});
it('puts both machines on the worktop', () => {
  for (const [, dx, dz] of BENCH_ITEMS) { expect(Math.abs(dx) + .25).toBeLessThanOrEqual(1.0); expect(Math.abs(dz) + .2).toBeLessThanOrEqual(.35); }
});
it('sways from a neutral pose and loops', () => {
  expect(Object.values(swayPose(0)).every(v => v === 0)).toBe(true);
  const period = SWAY_PERIOD;
  for (const [k, v] of Object.entries(swayPose(1.3))) expect(swayPose(1.3 + period)[k]).toBeCloseTo(v);
});
```
And a merge test in `merge.test.js`: a mesh under a node with `userData.separate` stays out of `mergeStatic` (it already does; this pins it for pivots).
In `growth.browser.mjs`, on the final state, fail unless all of these hold:
- `electronics.onBench` contains the printer and the arm
- `electronics.floorMachines === 0`
- `electronics.swaying === true`

- [ ] **Step 2: Run to verify they fail**

Run: `npx vitest run`, then `node test/growth.browser.mjs ../runs/kits-07-growth`
Expected: FAIL.

- [ ] **Step 3: Implement**
- **`PROGRAM_SETUP.electronics`:** keeps only the two table kits.
- **`furnish`:** for electronics, also place `furn-workbench` at `BENCH`, then each `BENCH_ITEMS` entry at `BASE + socket_top` height.
  - Mark the arm's `joint_base` and the printer's `head_printer` nodes `userData.separate = true` so merging leaves the moving parts whole.
  - Push `{ nodes, rest }` to `entity.swayers`.
- **`tick`:** inside `if (animate())`, apply `swayPose(elapsed)` to each swayer relative to its rest transform.
- **Reduced motion:** pose once at build with `swayPose(0)`.
- **`seat`:** for electronics, use `ELECTRONICS_SPOTS` plus the teacher as today.
- **`needs`:** includes `furn-workbench`, `equip-printer`, `equip-arm`.
- **Diagnostics:** fill `electronics`.

- [ ] **Step 4: Run the tests**

Run: `npx vitest run`, then `node test/growth.browser.mjs ../runs/kits-08-growth`
Expected: all pass, `PASS`.

- [ ] **Step 5: Commit**

```bash
git add web/src/world/electronics-room.js web/src/world/create-world.js web/test/electronics-room.test.js web/test/merge.test.js web/test/growth.browser.mjs
git commit -m "feat: Electronics printer and arm work at a bench instead of the floor"
```

---

### Task 5: Performance, visual review and docs

**Files:**
- Modify: `docs/PERFORMANCE.md`, `docs/ASSEMBLY_SYSTEM.md`, `docs/SWAP-READINESS.md`, `docs/ASSET_CATALOG.md` (generated), `verdicts.visual` in `furn-workbench`

- [ ] **Step 1: Measure performance.** Run `GALLIUM_DRIVER=d3d12 LD_LIBRARY_PATH=/usr/lib/wsl/lib GG_GPU=1 node test/parity.browser.mjs ../runs/kits-09-parity`.
  - Expected: PASS, at most 150 draw calls and 500,000 triangles.
  - A reading below 59 fps with another session active: rerun before acting.
  - Otherwise, apply the fallback ladder in Global Constraints one step at a time, with a test for each step and a new run.
- [ ] **Step 2: Review renders.** Capture the following, then open all of them and the baseline:
  - each level's classroom in close view and x-ray, on the full demo state and on a school with no programs
  - the landing showcase input (the cotizador's `showcaseData` shape: all six programs, `enrollment: []`, `groupIds: []`)
  - the Electronics room at two moments of the sway, and with `reduceMotion`
  - `node tools/review-sheet.mjs ../runs/kits-10-review furn-workbench`

  Expected:
  - kits sit on the table tops, with nothing floating or sinking
  - each classroom shows its programs
  - the bench, printer and arm are in view, and the arm and printer move
  - other rooms are unchanged

  Set the workbench's `verdicts.visual` from what you saw.
- [ ] **Step 3: Suites.** Run:
  - `python3 -m unittest`, then restore manifests
  - `npx vitest run`
  - `npm run share`, then `node test/share.browser.mjs ../runs/kits-11-share`

  Expected: all OK / PASS.
- [ ] **Step 4: Docs.** Update:
  - `PERFORMANCE.md` with the measurement
  - `ASSEMBLY_SYSTEM.md` with a paragraph on classroom programs, table kits, the bench and the swayers
  - `SWAP-READINESS.md` with a line noting that classrooms follow the school's programs, and that the landing showcase uses usual levels

  Then run `python3 scripts/world.py catalog`.
- [ ] **Step 5: Commit**

```bash
git add docs assets/manifests
git commit -m "docs: classroom kits and Electronics workbench performance, review and assembly notes"
```
