# Campus Shape and Skyline Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the horizontal bar with a stepped V-shaped campus with varied rooflines and neighbour-driven details, without moving existing rooms or slowing the campus.

**Architecture:** `planWorld` gains the new slot map. A new pure `applyNeighbours` step adds roofs and details, which become ordinary entities. New Blender modules supply the roof family and circulation.

**Tech Stack:** Blender 5.2.3 Python, Python `unittest`, Vitest, Playwright, `three` 0.186.1.

**Spec:** `docs/superpowers/specs/2026-11-02-campus-shape-design.md`

## Global Constraints

- Same scope gives the same result, always. No `Math.random`; variety comes from a stable hash of the module key.
- Adding scope never moves a room key. Only roofs and details may change.
- Columns 6 m wide, rows at z 0, -2.5, -5, up to three floors at 3.2 m each.
- Every upper room has a visible route to the ground; no stairs end at a wall.
- Roofs at most 1,500 triangles each, connected, with sockets checked where they join.
- Largest campus at rest: at most 150 draw calls, at most 500,000 triangles, 60 fps on the RTX 3060 Ti. Targets are not relaxed.
- No Meshy credits. No cotizador changes.
- New run directory per result. At most two correction rounds per asset before reporting. Open renders before any visual verdict.

## Review Focus

- Only upper-floor scope, such as `spike` with no `prim`: supports fill the column and the room still has a route. Task 1 pins it.
- Scope removed so the tallest stack changes: the tower cap moves to the new tallest stack and the old roof is replaced. Task 2 pins it.
- Rapid changes across roof variants: the scene converges with no leftover details. Task 5 pins it.
- Empty input: a single example room with a roof and no broken details. Task 2 pins it.
- X-ray view with the new roofs: every roof variant hides. Task 5 pins it.

---

## File Map

| Path | Responsibility |
|---|---|
| `web/src/layout/plan.js` | Slot map and circulation |
| `web/src/layout/neighbours.js` | Pure roof and detail rules |
| `web/test/neighbours.test.js` | Rule tests |
| `scripts/blender/assets/architecture.py` | New roofs and details |
| `web/src/world/create-world.js` | Rendering new module types, savings |

### Task 1: New slot map and circulation

**Files:** Modify `web/src/layout/plan.js`, `web/test/layout.test.js`.

**Interfaces:** Produces modules with `row` (0, 1 or 2) and `z = -2.5 * row`. Column table: `pre [0,0]`, `prim [1,1]`, `tale [2,2]`, `bas [3,1]`, `bach [4,0]`; floor 1 uppers above their level, `master` above `tale`; floor 2 `spike` column 1, `immersive` column 2, `electronics` column 3. Types added: `stairs:upper`, `gallery:<column>:<floor>`.

- [ ] Update tests: width at most five columns; `never moves` across the existing scope sequence; `spike` alone yields supports at floors 0 and 1 of column 1; every module on floor 1 or 2 reaches `stairs:front` through contiguous `gallery` or `balcony` keys; no overlaps.
- [ ] Run `npx vitest run test/layout`; expect FAIL.
- [ ] Implement. Remove the second-floor limit, and support any floor below a built floor. Move the entrance, island and walk path to fit the V, with the courtyard in front.
- [ ] Run; expect PASS. Commit.

### Task 2: Neighbour rules

**Files:** Create `web/src/layout/neighbours.js`, `web/test/neighbours.test.js`; modify `plan.js`.

**Interfaces:** `applyNeighbours(modules) -> modules`. Replaces each `roof` with `{ key: 'roof:<column>:<floor>:<variant>', variant }`, variant one of `flat pitched barrel tower terrace garden`; adds `detail` modules keyed `archway:<column>`, `pocket:<column>`, `trim:<column>`, `courtyard:tree`, `courtyard:bench`. `hashKey(key) -> integer`, FNV-1a.

- [ ] Write one test per row of the spec's section 6 table, plus: tower cap moves when the tallest stack changes; same input is deep-equal; a detail appears when its neighbour arrives and leaves when removed; empty input gives one room, one roof, no details; room keys and positions are identical before and after the step.
- [ ] Run `npx vitest run test/neighbours`; expect FAIL.
- [ ] Implement, called as the last step of `planWorld`.
- [ ] Run all Vitest; expect PASS. Commit.

### Task 3: Roof family and details

**Files:** Modify `scripts/blender/assets/architecture.py`, `tests/test_sockets.py`, `world/sockets.json`.

**Interfaces:** IDs `arch-roof-flat`, `-pitched`, `-barrel`, `-tower`, `-terrace`, `-garden`, `arch-archway`, `arch-pocket-garden`, `arch-roof-trim`, `arch-gallery`, `arch-stairs-upper`, `arch-courtyard-tree`.

- [ ] Add tests: each roof at most 1,500 triangles, one island, exactly bay width, sits on `socket_floor_above`; `arch-gallery` closes against `arch-balcony`; `arch-stairs-upper` reaches 3.2 m and lands on a gallery.
- [ ] Run `python3 -m unittest tests.test_sockets`; expect FAIL.
- [ ] Model them with the soft bevels and shared materials. Run tests; expect PASS.
- [ ] Render a new run, open the sheet, record verdicts. Commit.

### Task 4: Savings

**Files:** Modify `web/src/world/create-world.js`, `web/test/parity.browser.mjs`.

**Interfaces:** `ROOM_DETAIL` constant; `getDiagnostics().roomDetail`.

- [ ] Add to the parity test: frame rate at least 58 fps measured over 4 s (60 fps display noise allowed, recorded as measured), plus the existing draw-call check and at most 500,000 triangles.
- [ ] Measure before changes in a new run and record it.
- [ ] Implement lighter room contents: tables and chairs are dropped from rooms hidden behind the upper floors' balconies at campus distance, and shelves and storage are merged out. Restore them at close view.
- [ ] Run; expect PASS. Commit.

### Task 5: Scene integration

**Files:** Modify `web/src/world/create-world.js`, `web/test/growth.browser.mjs`.

**Interfaces:** Roof and detail modules render as entities; `setView('xray')` hides any key starting `roof:`.

- [ ] Extend tests: room entity IDs stay identical when a neighbour changes a roof; 51 rapid updates across states end with exactly the final plan's keys; x-ray hides every roof variant; terrace students appear only when the taller room exists.
- [ ] Run; expect FAIL. Implement. Run; expect PASS.
- [ ] Rebuild and publish models, then run parity and growth with real GPU settings. Commit.

### Task 6: Visual review and evidence

**Files:** Modify `docs/PERFORMANCE.md`, `docs/ASSEMBLY_SYSTEM.md`, `docs/SWAP-READINESS.md`, `docs/ASSET_CATALOG.md`.

- [ ] Capture small, medium and large growth states; open them and compare with `runs/web-growth-09`.
- [ ] Use up to two correction rounds on rules or roofs if the skyline still reads flat.
- [ ] Update docs with measured results and known defects. Run every suite. Commit.
