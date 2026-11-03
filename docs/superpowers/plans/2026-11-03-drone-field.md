# Drone Field Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Two merged drones race through two gates and two hoops around the Drones field, flown by two pilots holding remotes while two students watch.

**Architecture:**
- **Blender assets:** a gate, a hoop, a hoop post, a race flag and a drone remote.
- **Course module:** a pure `drone-course.js` places the obstacles, builds two staggered lanes as closed smooth curves through them, and gives each drone's pose at any time.
- **Field wiring:** `create-world.js` replaces the single hovering drone with two drones, each merged into one vertex-coloured body plus four spinning rotors. It places the course, pilots and watchers, and moves everything each frame.

**Tech Stack:** Blender 5.2.3 headless (`scripts/world.py`), Python `unittest`, three.js (`CatmullRomCurve3`), vitest, Playwright browser tests.

**Spec:** `docs/superpowers/specs/2026-11-03-drone-field-design.md`

## Global Constraints

- **The field:** field-local, three.js axes, open front at +z.
  - The pad spans x −4..4 and z −2.5..2.5, with its top at 0.05 m.
  - The landing ring is centred at (0, 0) with radius 1.7.
  - The planters cover x ±2.5..±3.9 and z −2.0..−1.4, about 0.8 m tall with shrubs.
- **Drones:** scale 1.2 (0.70 m across, 0.11 m tall). For clearances, a drone is a disc of radius 0.35 m and half-height 0.06 m.
- **Clearances:** drones stay at least 0.15 m apart, and at least 0.12 m from every obstacle frame, measured from their outer edges.
- **Lanes:** each lane is offset from the course centre line by ±0.3 m sideways and ±0.2 m in height. Lane A is right and high; lane B is left and low.
- **Obstacles:** gate opening 1.8 m wide × 1.4 m tall, hoop opening 1.8 m across.
- **People:**
  - Two pilots in `interact`, each holding an `equip-drone-remote` on `vr_grip_l` (close model only), turning to face their own drone.
  - Two watchers in `idle`, turning to follow the leading drone.
- **Reduced motion:** both drones rest on the landing ring, rotors still.
- **Performance:**
  - Each drone is one vertex-coloured body mesh (casting shadow) plus four rotor meshes (no shadow).
  - Gates, hoops, posts and the flag merge with the field.
  - Campus view at most 150 draw calls, with the parity test passing. If it fails, drop to one watcher.
- **Evidence:** a new run directory per result (`runs/drone-NN-*`). Never declare a visual verdict without opening the render.
- **Manifests:** Windows Blender writes CRLF. After the Python suite, `git checkout -- assets/manifests docs/ASSET_CATALOG.md`.
- **Node:** `unset -f node npm npx; export PATH=/home/adawolfs/.nvm/versions/node/v22.23.4/bin:$PATH` from `web/`. Dev server on 127.0.0.1:4410.
- **Stale dev server:** it goes stale after `git stash`/`checkout` or a `cp` restore of a source file. Before trusting a browser result after one, fetch the served `create-world` module from a page and check it matches the file. Restart only the 4410 process whose working directory is `guategeeks-world/web`.
- **Commits:** messages end with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

## Review Focus

1. A school without the Drones program loads none of the new assets and gets no field. Pinned in Task 4 by the growth test's request-URL check over the early states.
2. Rebuilding the field on a state change leaves exactly two drones and four students, with no leftover rotors spinning on a released drone. Pinned in Task 4: `drones.count === 2` after the rapid-update stage.
3. The classroom table drone (`classroom-kits`) is unaffected by the merged-drone change: it still merges with its room. Pinned in Task 3: `vertexMerge` is only called from the patio path, and the existing classroom-kit tests still pass.
4. Focusing the field (a non-room) does not open the x-ray, and clearing focus restores nothing it shouldn't. Pinned by the existing x-ray browser test still passing (it focuses `patio:drones`).
5. A drone never flies into the walkers' path in front of the field or the courtyard tree and bench. Pinned in Task 2: all lane points stay within |x| ≤ 3.6 and z ≤ 2.5.

---

### Task 1: Gate, hoop, post, flag and remote

**Files:**
- Modify: `scripts/blender/assets/equipment.py` (five `@register` builders)
- Test: `tests/test_slice_assets.py` (class `DroneCourse`)

**Interfaces:**
- Produces (glTF axes, x across, y up, z depth). Each asset is one island.

  | Asset | Size (x × y × z) | Budget | Notes |
  | --- | --- | --- | --- |
  | `equip-drone-gate` | 2.0 × 1.6 × 0.12 m | 600 | opening 1.8 × 1.4, centred at y 0.9, standing on the ground |
  | `equip-drone-hoop` | 2.0 × 2.0 × 0.1 m | 600 | ring with a 1.8 m opening, centred at the origin, no post |
  | `equip-drone-post` | 0.08 × 1.0 × 0.08 m | 150 | a post 1 m tall standing at the origin, scaled in y at placement |
  | `equip-race-flag` | 0.6 wide × 1.4 tall | 400 | checkered flag on a pole |
  | `equip-drone-remote` | 0.18 × 0.03 × 0.11 m | 300 | centred at the origin, held flat |

- [ ] **Step 0: Baseline.** Run `node tools/review-sheet.mjs ../runs/drone-01-baseline equip-drone` and the GPU parity test into `runs/drone-02-parity`. Open `compositions-sheet.png`. Record the campus draw calls.
- [ ] **Step 1: Write the failing test.**

```python
class DroneCourse(unittest.TestCase):
    SIZES = {'equip-drone-gate': ((2.0, 1.6, .12), 600), 'equip-drone-hoop': ((2.0, 2.0, .1), 600), 'equip-drone-post': ((.08, 1.0, .08), 150),
             'equip-race-flag': ((None, 1.4, None), 400), 'equip-drone-remote': ((.18, .03, .11), 300)}

    def test_course_pieces_have_their_sizes_and_budgets(self):
        for asset, (size, budget) in self.SIZES.items():
            m = build(asset)
            for axis, want in enumerate(size):
                if want is not None:
                    self.assertAlmostEqual(m['size_m'][axis], want, delta=.03, msg=asset)
            self.assertLessEqual(m['triangles'], budget, asset)
            self.assertEqual(m['islands'], 1, asset)
```

- [ ] **Step 2: Run to verify it fails.** Run `python3 -m unittest tests.test_slice_assets.DroneCourse`. Expected: `KeyError`.
- [ ] **Step 3: Implement** the five builders in GG materials.
  - **Gate:** turquoise posts and top bar with orange stripes.
  - **Hoop:** a turquoise ring with orange bands.
  - **Post:** purple.
  - **Flag:** an ivory and dark-purple checkered panel on a purple pole.
  - **Remote:** a purple body, two dark sticks and a turquoise screen.
- [ ] **Step 4: Run.** Expected: PASS.
- [ ] **Step 5: Build, publish and look.** Run `python3 scripts/world.py build equip-drone-gate equip-drone-hoop equip-drone-post equip-race-flag equip-drone-remote --run runs/drone-03-assets`, then `publish`. Open each `three-quarter.png`.
- [ ] **Step 6: Commit.**

```bash
git add scripts/blender/assets/equipment.py tests/test_slice_assets.py assets/manifests/equip-drone-gate.json assets/manifests/equip-drone-hoop.json assets/manifests/equip-drone-post.json assets/manifests/equip-race-flag.json assets/manifests/equip-drone-remote.json
git commit -m "feat: drone course gate, hoop, post, flag and remote"
```

---

### Task 2: The course module

**Files:**
- Create: `web/src/world/drone-course.js`
- Test: `web/test/drone-course.test.js`

**Interfaces:**
- **Constants:**
  - `DRONE_SCALE = 1.2`
  - `DRONE_RADIUS = 0.35`
  - `DRONE_HALF_HEIGHT = 0.06`
  - `SPEED = 1.2` (m/s average along a lane)
- **`OBSTACLES`:** `{ id, kind: 'gate' | 'hoop', x, z, y, yaw }[]`, in course order. `y` is the opening's centre height; `yaw` is the opening's facing (three.js Y rotation; the opening's normal is the course direction there).

  | id | kind | x | z | y | yaw |
  | --- | --- | --- | --- | --- | --- |
  | `gate-front` | gate | 0 | 1.8 | 0.9 | π/2 |
  | `hoop-right` | hoop | 2.9 | −0.1 | 1.6 | π |
  | `gate-back` | gate | 0 | −2.0 | 0.9 | −π/2 |
  | `hoop-left` | hoop | −2.9 | −0.1 | 1.2 | 0 |

  The course runs counter-clockwise seen from above: front, right, back, left. Fix the yaw signs so each opening faces along the course direction there; the test pins it.
- **`centreLine()`:** a closed centripetal `CatmullRomCurve3` through the four obstacle centres (at their `y`).
- **`lane(id: 'A' | 'B')`:** the centre line offset per sample by ±0.3 m along its horizontal left normal and ±0.2 m in height. Lane A is right and high, lane B left and low. Each lane is a closed curve, sampled by arc length.
- **`distanceAt(id, t) -> number`:** the distance along the lane at time t.
  - A: `SPEED * t + 0.6 * sin(0.37 t)`.
  - B: `SPEED * t + 0.6 * sin(0.23 t + 1.7)`.
  - Both wrap by lane length.
- **`dronePose(id, t) -> { x, y, z, yaw, pitch, bank }`:**
  - `yaw` faces along travel.
  - `pitch` comes from the climb.
  - `bank` is −0.6 × (horizontal curvature × speed), clamped to ±0.35 rad.
- **`REST`:** `{ A: [0.45, 0.06, 0], B: [-0.45, 0.06, 0] }`, positions on the ring for reduced motion.
- **People:**
  - `PILOTS = [{ lane: 'A', x: 0.7, z: 3.0 }, { lane: 'B', x: 1.5, z: 3.0 }]`
  - `WATCHERS = [{ x: -1.6, z: 3.0 }, { x: -2.3, z: 3.1 }]`
  - The flag stands at `FLAG = { x: -1.3, z: 2.1 }`.
- **`COURSE_ASSETS`:** the five Task 1 assets plus `equip-drone`.

- [ ] **Step 1: Write the failing tests.**

```js
const samples = id => { const L = laneLength(id); return Array.from({ length: 400 }, (_, i) => dronePose(id, i / 400 * L / SPEED)); };
it('stands every obstacle on the pad, clear of the ring and the planters', () => { /* each obstacle's frame ends (|x|,|z| from its centre ± 1.0 along its width) lie inside the pad, at least 1.75 from (0,0), outside both planter boxes */ });
it('flies each lane through every obstacle opening with edge clearance', () => {
  for (const id of ['A', 'B']) for (const o of OBSTACLES) {
    const p = closestPoint(id, o); // lane point nearest the obstacle centre
    const lateral = Math.abs((p.x - o.x) * Math.cos(o.yaw) - (p.z - o.z) * Math.sin(o.yaw)), vertical = Math.abs(p.y - o.y);
    if (o.kind === 'gate') { expect(lateral + DRONE_RADIUS + .12).toBeLessThanOrEqual(.9); expect(vertical + DRONE_HALF_HEIGHT + .12).toBeLessThanOrEqual(.7); }
    else expect(Math.hypot(lateral, vertical) + DRONE_RADIUS + .12).toBeLessThanOrEqual(.9);
  }
});
it('keeps the two drones apart at every moment', () => {
  for (let t = 0; t < 60; t += .05) {
    const a = dronePose('A', t), b = dronePose('B', t);
    const apart = Math.abs(a.y - b.y) - 2 * DRONE_HALF_HEIGHT >= .15 || Math.hypot(a.x - b.x, a.z - b.z) - 2 * DRONE_RADIUS >= .15;
    expect(apart).toBe(true);
  }
});
it('stays over the pad, clear of the walkers, below a ceiling and above the planters', () => {
  for (const id of ['A', 'B']) for (const p of samples(id)) {
    expect(Math.abs(p.x)).toBeLessThanOrEqual(3.6); expect(p.z).toBeLessThanOrEqual(2.5); expect(p.z).toBeGreaterThanOrEqual(-2.5);
    expect(p.y).toBeGreaterThanOrEqual(.6); expect(p.y).toBeLessThanOrEqual(2.4);
  }
});
it('changes the lead at least once a lap', () => {
  const lap = laneLength('A') / SPEED;
  for (let start = 0; start < 4 * lap; start += lap) {
    let changes = 0, last = Math.sign(distanceAt('A', start) - distanceAt('B', start));
    for (let t = start; t < start + lap; t += .05) { const s = Math.sign(distanceAt('A', t) - distanceAt('B', t)); if (s && s !== last) { changes += 1; last = s; } }
    expect(changes).toBeGreaterThanOrEqual(1);
  }
});
it('keeps every person clear of the lanes and obstacles, and rests both drones on the ring', () => { /* each pilot/watcher ≥ 0.3 + DRONE_RADIUS from every lane sample, ≥ 0.5 from each obstacle; REST points within ring radius 1.7 and ≥ 0.15 + 2·DRONE_RADIUS apart */ });
```

- [ ] **Step 2: Run to verify they fail.** Run `npx vitest run`. Expected: FAIL, module not found.
- [ ] **Step 3: Implement** the module. Export `laneLength` and `closestPoint` for the tests. Adjust obstacle values within the table only if a test shows a clearance miss, and ledger each change.
- [ ] **Step 4: Run.** Run `npx vitest run`. Expected: all pass.
- [ ] **Step 5: Commit.**

```bash
git add web/src/world/drone-course.js web/test/drone-course.test.js
git commit -m "feat: drone course with two staggered racing lanes"
```

---

### Task 3: A merged, spinning drone

**Files:**
- Modify: `web/src/world/gear.js` (export `vertexMerge`)
- Test: `web/test/gear.test.js`

**Interfaces:**
- **`vertexMerge(root: Object3D, skip: (node) => boolean) -> Mesh`:**
  - Merges every mesh under `root`, except those under a node `skip` returns true for, into one vertex-coloured mesh in the root's space.
  - It uses the shared vertex-colour material from `gearMesh` and `castShadow = true`.
  - The returned mesh is not added to the scene.
  - `gearMesh` keeps its behaviour, built on the same merge.
- Callers keep the rotor subtrees (`/^rotor_/`) of a cloned drone as they are, and add the merged body beside them.

- [ ] **Step 1: Write the failing test**

```js
it('merges a drone body into one mesh and leaves its rotors to spin', () => {
  const root = new Group(); root.add(new Mesh(new BoxGeometry(1, 1, 1), red));
  const rotor = Object.assign(new Group(), { name: 'rotor_1' }); rotor.add(new Mesh(new BoxGeometry(.2, .02, .2), blue)); root.add(rotor);
  const body = vertexMerge(root, node => /^rotor_/.test(node.name));
  expect(body.material.vertexColors).toBe(true);
  expect(body.geometry.getAttribute('position').count).toBe(new BoxGeometry(1, 1, 1).toNonIndexed().getAttribute('position').count);
  expect(rotor.children[0].isMesh).toBe(true);
});
```

- [ ] **Step 2: Run to verify it fails.** Expected: FAIL, `vertexMerge` is not a function.
- [ ] **Step 3: Implement** by generalising `merged()` in `gear.js`.
- [ ] **Step 4: Run.** Run `npx vitest run`. Expected: all pass, including the existing gear and classroom-kit tests.
- [ ] **Step 5: Commit.**

```bash
git add web/src/world/gear.js web/test/gear.test.js
git commit -m "feat: merge a model into one vertex-coloured mesh, leaving chosen parts free"
```

---

### Task 4: The race on the field

**Files:**
- Modify: `web/src/world/create-world.js` (the `patio` branch of `build`, `seat`/patio seating, `needs`, `tick`, `getDiagnostics`)
- Modify: `web/test/growth.browser.mjs`

**Interfaces:**
- Consumes:
  - Task 2: `OBSTACLES`, `dronePose`, `REST`, `PILOTS`, `WATCHERS`, `FLAG`, `DRONE_SCALE`, `COURSE_ASSETS`, `distanceAt`.
  - Task 3: `vertexMerge`.
  - `wearItem` for the remote.
- Produces: `getDiagnostics().drones`:

  ```js
  { count, moving, pilots, remotes, watchers, obstacles, unbatchedMeshes }
  ```

  - `null` when there is no field.
  - `moving` is true when a drone has moved since the previous frame.
  - `unbatchedMeshes` counts the visible unbatched meshes in the patio entity.

- [ ] **Step 1: Write the failing browser checks** in `growth.browser.mjs`:
  - **Early states without `drones`:** `drones === null`, and no `equip-drone-gate`, `equip-drone-hoop`, `equip-drone-post`, `equip-race-flag` or `equip-drone-remote` request has been made. Use the request log the Electronics checks already keep.
  - **States with `drones`:** all of these hold:
    - `count === 2`, `obstacles === 4`, `pilots === 2`, `watchers === 2`, `remotes === 2`
    - `unbatchedMeshes <= 10` (two bodies plus eight rotors)
    - two readings 1 s of world time apart (wait on a `distance` field, as the Makerzoid check does) show both drones moved
  - **After the rapid-update stage:** `drones.count === 2`.
  - **Reduced-motion stage:** on `states[5]`, `drones.moving === false`, and both drones are within 1.7 m of the field centre.
- [ ] **Step 2: Run to verify it fails.** Run `node test/growth.browser.mjs ../runs/drone-04-growth`. Expected: FAIL (`drones` undefined).
- [ ] **Step 3: Implement.**
  - **The patio branch:**
    - Remove the single hover drone.
    - Place each obstacle in `entity.inside`: gates at `y 0`; hoops at `y`; a post under each hoop, scaled in y to reach the ring bottom (`y - 0.9`).
    - Place the flag at `FLAG`.
    - For lanes A and B: clone `equip-drone` into `entity.group`, keep its rotor subtrees, and replace the rest with `vertexMerge(clone, rotor)`. Scale it `DRONE_SCALE`, push its rotors to `entity.spinners` with `castShadow` off, and record `entity.flyers = [{ id, object }]`.
  - **People:** pilots in `interact` at `PILOTS`, each with `wearItem(pair.high, kit, 'vr_grip_l', 'equip-drone-remote')`. Watchers in `idle` at `WATCHERS`. Use the patio module's roster.
  - **`tick` (inside `animate()`):** pose each flyer from `dronePose(id, elapsed)`. Turn each pilot pair to face its lane's drone, and each watcher pair to face the leader (larger `distanceAt`).
  - **Reduced motion:** at build, pose the flyers at `REST`, face the people to them, and register no spinner motion (the spinners still exist; `animate()` gates them).
  - **`needs`:** patio modules add `COURSE_ASSETS`.
  - **Diagnostics:** as in Interfaces.
- [ ] **Step 4: Run.** Run `npx vitest run`, `node test/growth.browser.mjs ../runs/drone-05-growth` and `node test/xray.browser.mjs ../runs/drone-06-xray`. Expected: all pass.
- [ ] **Step 5: Commit.**

```bash
git add web/src/world/create-world.js web/test/growth.browser.mjs
git commit -m "feat: two drones race the course while pilots fly them and classmates watch"
```

---

### Task 5: Performance, visual review and docs

**Files:**
- Modify: `docs/PERFORMANCE.md`, `docs/ASSEMBLY_SYSTEM.md`, `docs/SWAP-READINESS.md`, `docs/ASSET_CATALOG.md` (generated), and `verdicts.visual` of the five new assets.

- [ ] **Step 1: Measure.** Run (GPU env) `node test/parity.browser.mjs ../runs/drone-07-parity`. Then focus `patio:drones` with a variant of `tools/focus-bench.mjs` that accepts `--key patio:drones`, into `runs/drone-08-perf`.
  - Expected: campus at most 150 draw calls with parity PASS, and the focused field recorded.
  - If the campus is over 150, drop one watcher (update the `WATCHERS` test and growth check) and remeasure.
- [ ] **Step 2: Review renders.** Capture the following and open them all:
  - the campus overview at three moments 2 s of world time apart
  - the field focused at three moments, including both drones inside a gate and inside a hoop
  - the field from `rotate(1.2)`
  - reduced motion
  - `node tools/review-sheet.mjs ../runs/drone-10-review equip-drone-gate equip-drone-hoop equip-drone-post equip-race-flag equip-drone-remote`

  Expected:
  - two drones visibly racing through the obstacles
  - pilots holding remotes and facing their drones
  - watchers facing the leader
  - nothing floating or intersecting
  - drones at rest on the ring under reduced motion

  Set the assets' `verdicts.visual` from what you saw.
- [ ] **Step 3: Suites.** Run:
  - `python3 -m unittest`, then restore manifests
  - `npx vitest run`
  - the growth and x-ray browser tests
  - `npm run share`, then `node test/share.browser.mjs ../runs/drone-11-share`

  Expected: all OK / PASS.
- [ ] **Step 4: Docs.**
  - `PERFORMANCE.md`: the measurement, with a verdict line.
  - `ASSEMBLY_SYSTEM.md`: a paragraph on the course module, lanes, merged drones and followers.
  - `SWAP-READINESS.md`: the Drones line.
  - Run `python3 scripts/world.py catalog`.
- [ ] **Step 5: Commit.**

```bash
git add docs assets/manifests web/tools
git commit -m "docs: drone field performance, review and assembly notes"
```
