# Classroom kits and the Electronics workbench design

Date: 2026-11-03. Branch: `feat/iterate-models`.

## Intent

Two things read wrong on the campus today:

- **The Electronics room** (`programId: 'electronics'`): the 3D printer and the robotic arm stand directly on
  the floor, enlarged (arm 2x at the front, printer 1.5x in the left corner, hidden at the default view). In a
  real lab they sit on a workbench at working height.
- **Ordinary classrooms all look like computer labs:** each level's classroom puts one fixed item on both
  tables (laptops for basico and bachillerato, organisers for preprimaria and primaria), whatever programs the
  school chose for those grades.

The cotizador's input already says which programs cover which grade groups (`equipment[].groupIds`, each an
enrollment row id with a `levelId`). Classrooms should show what their students actually use, so the campus
changes with the school's choices.

## Goals

- Each classroom shows the kits of the programs its grades use, and changes when the school's choices change.
  (user)
- The printer and the arm come off the floor. (user)
- The layout step works out each classroom's programs; the room code places the kits from a fixed
  program-to-kit list; a new workbench model carries the printer and arm, whose existing joints the app moves.
  (user chose this approach)

## Non-goals

- No change to the other program rooms (Tale-Bot, Makerzoid, SPIKE, Drones patio, VR), walkers or terraces.
- No Meshy, no credits, no new character work.
- No per-section detail: a classroom shows its level's programs, not which section takes which.
- Equipment quantities (`units`, `plan`, `stations`, `sharing`) do not change what is shown.

## Anti-goals

- A classroom showing a program its grades do not take, or keeping stale kits after the school changes its
  choices.
- Kits floating above, sinking into or hanging off the tables.
- Breaking the performance targets in `docs/PERFORMANCE.md` (150 draw calls, 500,000 triangles, the parity
  test passing; last measured 142 draw calls and 383,712 triangles with the dinosaur).

## Constraints

- **Classrooms:**
  - Every level has `room:<level>:0` (`arch-classroom-standard`, floor 0).
  - A busy level also has `upper:<level>:0` (`arch-classroom-upper`, floor 1), built in `web/src/layout/plan.js`.
  - Both are furnished by `furnish()` in `web/src/world/create-world.js`.
  - Each has two four-seat tables at room-local x -1.05 and 1.35, z -0.2, tops at `TOP = BASE + 0.608`.
  - `LEVEL_TABLE_ITEM` puts one item on each table today.
- **Rebuilds:** entities are rebuilt only when their signature changes (`signatureOf` in
  `web/src/world/entities.js`: asset, position, rotation, population, programId, hanging). A classroom whose
  programs change must get a new signature.
- **Input:** `normalizeWorldInput` returns `equipment[programId].groupIds` and `enrollment` rows with `levelId`.
  Only programs in `programs` count.
- **Kit models** (size in metres, triangles):

  | Model | Size | Triangles | Joints |
  | --- | --- | --- | --- |
  | `equip-rover-programmable` | 0.33 x 0.22 x 0.30 | 3,628 | |
  | `equip-rover-spike` | 0.30 x 0.32 x 0.30 | 4,696 | |
  | `equip-electronics-kit` | 0.36 x 0.05 x 0.26 | 1,260 | |
  | `equip-drone` | 0.58 x 0.09 x 0.54 | 1,984 | |
  | `equip-vr-set` | 0.50 x 0.14 x 0.31 | 1,540 | |
  | `equip-laptop` | 0.34 x 0.24 x 0.27 | 524 | |
  | `equip-dino` | 0.31 x 0.49 x 0.81 | 4,828 | skinned, `walk` clip |
  | `equip-arm` | 0.30 x 0.41 x 0.41 | 1,120 | `joint_base`, `joint_shoulder`, `joint_elbow` |
  | `equip-printer` | 0.45 x 0.49 x 0.40 | 1,332 | `head_printer` |

- **Merging:** static room parts are merged per material and batched (`mergeStatic`, `buildBatch`). Parts the
  app moves must be named so merging skips them (`MOVING` in `web/src/world/merge.js` covers `wheel_` and
  `rotor_`), or marked `userData.separate`. Wheels on parked rovers are renamed `still_` so they merge.
- **Camera:** at the default view, room backs and some left parts are hidden by roofs, walkways and the
  neighbouring building. Things that must read go in the front part of the room (learned on the VR and
  Makerzoid rooms).
- **Pipeline:** new assets follow it: built into a new run, manifest with budget and verdicts, published,
  renders opened before any visual verdict.

## Approaches

1. **The layout works out programs; the room code places kits (chosen).**
   - `planWorld` records on each classroom module the programs its level's grades use.
   - `furnish()` places kits from a fixed program-to-kit list.
   - A new `furn-workbench` model carries the printer and arm, and the app sways their existing joints like
     drone rotors spin.
   - The rule is pure, tested logic.
   - Cost: the arm and printer motion lives in code and shows only in the browser.
2. **The same, with Blender clips for the arm and printer.** The motion could be reviewed in renders, but both
   machines would have to be rebuilt as skinned meshes for a simple sway.
3. **A pre-built classroom per program combination.** Many more files. Ruled out.

## Classroom kits (decided with the user; details are proposals)

- **Which programs (user):** a classroom shows the programs whose equipment `groupIds` include at least one
  enrollment row of the classroom's level. Its upper classroom follows the same rule.
- **The landing showcase (user):** the cotizador's landing page (`showcaseData()` in its `asesor/asesor.js`)
  sends all six programs with `enrollment: []` and every `groupIds: []`, so no program matches a classroom by
  groups. When a program has no `groupIds` at all, it shows at its usual level instead:

  | Level | Programs |
  | --- | --- |
  | preprimaria | `tale` |
  | primaria | `master`, `electronics` |
  | básico | `drones`, `spike` |
  | bachillerato | `spike`, `immersive` |

  This is the demo campus's mix, defined in this repo (`HOME_LEVELS`), with no cotizador change. A program that
  has `groupIds` always follows them.
- **Order (proposal):** programs in `PROGRAM_IDS` order. The first two used go on the two tables, one each;
  with one program both tables get it; with none the tables keep today's `LEVEL_TABLE_ITEM`.
- **Three or more programs (call):** the ground classroom shows the first two. When the level also has an upper
  classroom, it shows the next two (or repeats the first two if there are no more). A level without an upper
  classroom shows only its first two programs.
- **Kit per program (proposal), placed on the table top, scale 1 unless noted:**

  | Program | Kit on the table |
  | --- | --- |
  | `tale` | `equip-rover-programmable` |
  | `master` | `equip-dino` at about 0.45x, standing still in its rest pose |
  | `electronics` | `equip-electronics-kit` |
  | `spike` | `equip-rover-spike` with `equip-laptop` beside it |
  | `drones` | `equip-drone` with rotors still |
  | `immersive` | `equip-vr-set` |

- **Signature (proposal):** the module's program list is part of its signature, so changing the school's
  choices rebuilds exactly the classrooms whose programs changed.
- **Campus distance (proposal):** kits stay with the tables in the room's kept geometry, like today's laptops,
  so classrooms read from the campus view.
- **If performance fails (call), in this order:**
  1. Kits move to the detail dropped at campus distance (`entity.extra`).
  2. Kits stop casting shadows.
  3. The classroom `master` kit becomes a static, unskinned dinosaur stand-in instead of the skinned model.

  Each step is measured before the next.
- **Rebuild (call):** a classroom whose programs change is rebuilt whole, with the same enter animation and
  brief batching pause as any other rebuilt building (a population change already does this). A kit-only diff
  path is not worth its own architecture.

## The Electronics room (decided with the user; details are proposals)

- **Bench (user + call):** the printer and arm come off the floor onto the existing, unused
  `furn-equipment-table` (1.60 x 0.80 m, 0.605 m tall, 696 triangles, visual PASS), so no new model is needed
  unless its renders show it does not read as a lab bench. It stands in the front-right part of the room the
  camera sees. The printer and arm stand on it at scale 1, since real size reads at working height.
- **Motion (proposal):** the arm's joints sway in a slow reach loop (base turns, shoulder and elbow bend). The
  printer's head moves side to side. Pivots are renamed or marked so merging leaves them free. Reduced motion
  leaves them still in a neutral pose.
- **Students (proposal):** one student stands at the bench facing the arm (`interact`); one sits at a table
  with an electronics kit. The tables keep their electronics kits. The teacher stays.

## Done means

- Every classroom shows the kits of its level's programs on the tables, at the right height. Changing the
  school's choices updates exactly the affected classrooms. Checked on opened renders for the demo states and
  for a school with no programs.
- In the Electronics room the printer and arm stand on the bench, in view from the default camera, and move;
  nothing stands on the floor that belongs on a bench.
- Tests pin:
  - the classroom-programs rule, including no programs, one program, two programs, programs whose groups belong
    to another level, and a program not in `programs`, and a program with no `groupIds` (its usual levels; the landing
    showcase input)
  - signatures change with programs
  - the kit list covers every program
  - the bench's placement and that the machines sit on its top
  - the moving joints stay out of merging
- Performance on the largest campus within 150 draw calls and 500,000 triangles, and the parity test passing,
  recorded in a new run. Other rooms unchanged against a baseline captured first.
- Full Python and web suites, the browser growth test and the share test pass.

## Left to the builder

- Exact kit positions on each table and the bench's shape and detail.
- The sway angles and speeds.
- Exact student positions in the Electronics room within the visible front part.
