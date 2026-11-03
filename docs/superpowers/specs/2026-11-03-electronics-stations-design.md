# Electronics room stations design

Date: 2026-11-03. Branch: `feat/iterate-models`.

## Intent

The Electronics program room (`project:electronics`) should read as a maker lab. Today one workbench with the 3D
printer and the robotic arm sits at the front, and the rest of the room is an ordinary classroom (two four-seat
tables with electronics kits) that does not fit with it. The room becomes a set of workbench stations, each with its
own job, arranged around the room. With the focused-room x-ray (`docs/superpowers/specs/2026-11-03-room-xray-design.md`)
the whole floor is visible when the room is in focus, so stations no longer have to crowd the front strip.

## Goals

- No regular classroom tables in the Electronics room; workbenches instead. (user)
- Each bench is its own station. (user)
- Built from bench variants and small props made in Blender, laid out by a station list in the app. (user chose this
  approach)

## Non-goals

- No hand or grip changes (hands are a separate, later item).
- No new character animations; students use existing clips (`idle`, `interact`, `sit`).
- No change to other rooms, the classroom kits, or the x-ray.
- No Meshy, no credits.

## Anti-goals

- A room that still reads as a classroom with a bench in it.
- Students standing inside benches or walls, or benches blocking each other.
- Breaking the performance targets: the campus view at 142 draw calls with the parity test passing, and the focused
  close view within the x-ray's gate (`docs/PERFORMANCE.md`).

## Constraints

- **The room:** `arch-classroom-expandable`, 6 x 5 m. Room-local x runs -3..3, and z runs -2.5..2.5 with the open
  front at +z. Floor at `BASE`.
  - Kept: `furn-shelves` at (2.1, -1.95) and `equip-kit-storage` at (-2.1, -1.95), in `entity.extra`.
- **Today's code:**
  - `web/src/world/electronics-room.js` holds `BENCH`, `BENCH_ITEMS`, `ELECTRONICS_SPOTS`, `SWAY_PERIOD` and
    `swayPose`.
  - `create-world.js` holds `placeBench`, `poseSwayers`, `seatElectronics`, the electronics branch of `furnish`,
    and `PROGRAM_SETUP.electronics`, which puts kits on the two tables.
  - Electronics rooms get the generic tables, chairs and seat chair from `furnish`, which this replaces.
  - The arm's and printer's moving parts are `userData.separate` swayers and live in `entity.extra` (dropped at
    campus distance).
- **Workbench:** `furn-workbench` is 2.0 x 0.7 m, with its top at 0.75 m (`socket_top`), a pegboard back and a
  1,500-triangle budget.
- **Population:** program rooms get `population: 2` from `plan.js`; immersive and master get 3.
- **Pipeline:** new assets are built into a new run, with a manifest, budget and verdicts, published, and their renders
  opened before any visual verdict.

## Approaches

1. **Bench variants and props from Blender, laid out by a station list (chosen).**
   - New: `furn-workbench-short` (1.4 m), `furn-stool`, `equip-spool-rack` and `equip-printed-parts`.
   - A `STATIONS` list in `electronics-room.js` names each station's bench, props, machines and student spots.
   - Benches and props merge with the room.
2. **Scale the one workbench in the app for short benches.** It saves an asset, but stretches the pegboard and tools.
3. **One finished model per station.** It gives fewer pieces, but the machines must stay separate anyway, and
   rearranging means rebuilding models.

## The room (decided with the user; details are proposals)

- **Three stations in a U around the walls; the middle stays open (proposal).** Each bench's pegboard faces the wall
  it stands against.

  | Station | Bench | Where | On it | Students |
  | --- | --- | --- | --- | --- |
  | 3D printing | `furn-workbench-short` | left wall (x about -2.45), turned to face the room, centred z about -0.3 | the printer (carriage sliding), `equip-spool-rack`, `equip-printed-parts` | one student watching the print (`idle`), facing the bench |
  | Robotic arm | `furn-workbench-short` | right wall (x about 2.45), mirrored | the arm (reaching), a laptop | one student driving the arm from the laptop (`interact`) |
  | Circuits | `furn-workbench` (2.0 m) | back wall, centred x 0, z about -1.95, between the shelves and kit storage | two or three `equip-electronics-kit` | two students on `furn-stool`s building (`sit`) |

- **The teacher (proposal):** stands in the middle of the room, facing the circuits bench.
- **Population (proposal):** four students (`population: 4` for electronics). If the performance check fails, drop
  the second circuits student.
- **Removed (user):** the two four-seat tables, their chairs and the seat chair, and `PROGRAM_SETUP.electronics`' table
  kits.
- **Props (proposals):**
  - `furn-workbench-short`: the workbench's design at 1.4 m and the same 0.75 m worktop, with a low back upstand
    (about 0.1 m) instead of the pegboard, about 1,000 triangles. **Call:** the side benches stand in front of
    the side windows (open from 1.0 to 2.5 m), and a pegboard would cover their lower part; the long back bench
    keeps the pegboard.
  - `furn-stool`: a lab stool whose seat top is at 0.30 m, like today's chairs, so the `sit` clip and the
    `BASE + 0.02` placement fit unchanged, about 300 triangles. **Call:** the long bench's lower shelf stays, so
    seated students sit just back from the worktop's front edge, as children at a high bench do.
  - `equip-spool-rack`: a small stand with two or three filament spools in accent colours, about 600 triangles.
  - `equip-printed-parts`: a tray with a few small printed shapes, about 400 triangles.
- **Campus distance (call):** benches, stools, props, the laptop and the circuit kits merge with the room and show
  at every distance, like the Electronics kits today. The machines stay close-view detail as today.
- **Walls (call):** the walls are 0.25 m thick, so bench positions sit clear of them (side benches about x ±2.4
  minus half their depth; the back bench about z -1.9 plus half its depth). Exact values are the builder's.

## Done means

- In close view with the room focused (x-ray open), the three stations read clearly from the default camera and when
  turned. No student stands inside a bench, wall or another student, and nothing floats. Checked on opened renders.
- Tests pin:
  - every station's bench footprint stays inside the room and clear of the shelves, the kit storage and the other
    benches
  - every student spot is clear of every bench footprint
  - the printer and arm sit on their benches' tops
  - electronics population is 4 (`web/test/layout.test.js` updated from 2)
  - the room has no `furn-table-four`
  - the new assets' sizes and budgets
- **Performance (call):** the campus view at 142 draw calls or fewer with the parity test passing. The focused
  close view of Electronics (x-ray open) at most 215 draw calls and 1,080,000 triangles at 60 fps. That is the
  current 200 calls and 1,059,892 triangles (`runs/xray-27-perf`) plus room for two more close-view students
  (5,799 triangles each). If it fails, drop the second circuits student; three students is the floor.
- Full Python and web suites, the browser growth, x-ray and share tests pass.

## Left to the builder

- Exact bench positions and rotations, and prop placement on each worktop.
- The props' detailed shapes within the budgets.
