# Look inside a focused room design

Date: 2026-11-03. Branch: `feat/iterate-models`.

## Intent

When a room is in focus, the visitor should see inside it: its students, kits and equipment. Focus can come
from the visitor clicking it, or from a cotizador step focusing a level or program. Today focusing only moves
the camera. Roofs, the floors above, walkways and the room's own front wall block the view, which is why
furniture and actors have been squeezed into each room's "visible front strip".

The cotizador's paper campus already does this (`asesor/lab/campus-scene.js`, "x-ray of a focused
classroom"). The 3D world, which will replace it, must behave the same way.

## Goals

- Whenever a room is in focus, the things between the camera and the room become see-through, as in the
  cotizador. This covers a click (`pick` → `setFocus({ key })`) and a host call (`setFocus({ kind: 'level' |
  'program', id })`). (user)
- Built by swapping materials on the blockers and showing an unmerged copy of the focused room's shell
  whose camera-facing walls veil. (user chose this approach)

## Non-goals

- No change to the whole-campus x-ray mode (`setView('xray')`, which hides every roof); it stays as it is.
- No automatic x-ray when zooming close without a focus (the cotizador does this; left out for now so nothing
  turns see-through while someone is only looking around).
- No change to which room a level or program focuses, or to the camera framing of a focus.
- No cotizador change.

## Anti-goals

- Veils stacked several deep so the room reads as mud.
- A focused room whose view is still blocked from the default camera or after the visitor turns the camera.
- Leaving any part see-through, hidden or unbatched after the focus clears.
- Breaking the performance targets in `docs/PERFORMANCE.md` (150 draw calls, 500,000 triangles, parity test
  passing; last measured 142 draw calls at campus distance).

## Constraints

- **Module types** (`web/src/layout/plan.js`): `room` (classrooms `room:<level>:0`,
  `upper:<level>:0`, and program rooms `project:<program>`), `patio`, `roof`, `balcony`, `gallery`, `stairs`,
  `landing`, `entrance`, `pathway`, `garden`, `tree`, `detail`.
  - Each module has `x`, `y`, `z` (world metres), `column` and `floor`.
  - Rooms are 6 x 5 m bays. Floors are 3.2 m apart. Rows step back 2.5 m per column.
- **Entities** (`web/src/world/create-world.js`):
  - Each module is an entity with `group`. `inside` and `extra` hold furniture: `extra` is dropped at campus
    distance. Characters (`pairs`), dinosaur, swayers and gear live in the entity too.
  - `mergeStatic` merges each entity's static meshes per material, so a classroom's walls are one mesh per
    colour and individual walls cannot be told apart once merged. Settled entities are batched into one mesh
    per material (`buildBatch`, `staticMeshes`, `extraMeshes`); `unbatch`/`scheduleBatch` rebuild it.
- **Classroom shells** (`scripts/blender/assets/architecture.py`, `classroom_shell`) are built from named
  parts:
  - `slab`, `floor`, `inlay`
  - `wall_back`, `accent_back`, `inner_back`
  - `pier_front`, `sill`, `header`
  - side walls `wall`/`wall_low`
  - `screen`, `screen_frame`, `wall_light`, `roof`

  Program rooms use the same shell (`arch-classroom-expandable`, `arch-classroom-corner`). The glTF keeps those
  node names, so an unmerged clone of the room's asset still has them. Both side walls share names (`wall`,
  `wall_low`, `wall_high`, `wall_pier`, plus `frame`/`glass`), so left and right are told apart by x
  position. The shell has no roof part: its roof is the separate `roof` module.
- **Camera:** yaw and pitch are in `view`/`goal`. The front of a room faces +Z (the open side).
- **Materials:** come from the shared factory (`materialFor`). A veil must be one shared translucent material,
  not a per-mesh clone.

## Approaches

1. **Swap materials on the blockers; show the focused room unmerged (chosen).** At focus time:
   - Entities in the way swap their merged meshes to one shared translucent material, or hide whole.
   - Rooms above hide their furniture and people.
   - The focused room shows a fresh unmerged clone of its shell asset, whose camera-facing walls take the veil
     material.

   The batch is rebuilt without the affected entities while the focus lasts, and restored when it clears.
   Extra cost exists only while a room is open.
2. **The cotizador's index-range technique:** record each named part's index range during merging, and split
   opaque and translucent twins at focus time. No extra geometry, but every merge must track part ranges.
   Intricate.
3. **Cutting planes:** slice away everything above the ceiling and in front of the room. Simplest, but it looks
   like a sliced model, not the asked-for translucent veil.

## Behaviour (decided with the user; details are proposals following the cotizador)

- **When (user):** whenever `setFocus` lands on a `room` module, from a click or from the host. Focusing the
  Drones patio or any non-room only moves the camera.
- **Which rooms are affected (proposal, from the cotizador's `xrayBlockers`).** The camera heading on the
  ground is `h = (sin yaw, cos yaw)`. For each other module, with `dx`, `dz` measured from the focused room:
  - **Above:** `|dx| < 3.9`, `|dz| < 3.45` (half a bay plus a margin) and `y > room.y + 0.1`. It becomes a
    **veil**; if it is a room, its furniture, characters and gear hide, leaving only its shell veiled.
  - **Between:** `along = dx·h.x + dz·h.z` is between 1.8 and 13.5 m, `lateral = |dx·h.z − dz·h.x| < 6.6`, and
    `y ≥ room.y − 0.3` (trees at any height).
    - Whole buildings (`room`, `roof`, `patio`) **hide**.
    - Thin links (`balcony`, `gallery`, `stairs`, `landing`, `entrance`, `tree`, `detail`, `support`,
      `corridor`, `planter`) become a **veil**.

  Veiled roofs also hide any terrace students on them, like rooms above (call).

  These are the cotizador's thresholds scaled from its 2 m bay to our 6 m bay.
- **The focused room's own walls (proposal):**
  - **Always veil:** `header` and `sill`; the room's roof module is covered by "above".
  - **Veil when facing the camera:**
    - `pier_front` when `h.z > 0.25` (camera in front)
    - the left side wall when `h.x < −0.25`, the right side wall when `h.x > 0.25`
    - `wall_back`, `accent_back`, `inner_back` and `screen*` only when `h.z < −0.25`
  - Floors, slabs and everything inside stay opaque.
- **The veil (proposal):** one shared `MeshStandardMaterial`, ivory, `transparent`, opacity about 0.22,
  `depthWrite: false`, no shadows, created once beside the material factory.
- **Turning the camera (proposal):** the blockers are worked out again whenever the focused room or the yaw
  (rounded to a quarter radian) changes, as the cotizador keys it.
- **Leaving (call, as the cotizador):** the focus clears on `resetView`, or when the host calls `setFocus` with
  nothing or a non-room. Every swapped material, hidden group and the unmerged shell are restored and the batch
  rebuilds. A click on empty ground does nothing, as today and as in the cotizador, so the host's selection
  never drifts from the world's.
- **Clicking while a room is open (call, as the cotizador):** the visitor picks what they actually see. Hidden
  blockers are skipped by the pick; veiled thin links are skipped too, so a click through a veiled walkway
  reaches the room behind it. A veiled room above stays clickable and moves the focus there.
- **Rebuilds while open (proposal):** if a focused room or a blocker is rebuilt by an `update`, the x-ray is
  worked out again for the new entities, and nothing points at released meshes.

## Done means

- Focusing each classroom and program room on the largest campus, from the default camera and after turning
  it left and right, shows the room's interior with students and kits visible. Checked on opened renders.
- The rules above are pure, tested functions:
  - which modules are above, between, veiled or hidden for a room and a yaw
  - which own walls veil for a yaw
- Browser checks pin these behaviours:
  - a click, a level focus and a program focus all open the room
  - turning the camera changes which own walls veil
  - clearing the focus restores every material and visibility, and the batch rebuilds
  - an `update` while open leaves no stale parts
- **Performance (call):** a focused room is seen in close view, where every room's detail and full characters
  show, and no close-view measurement exists yet.
  - First measure the close view with the Makerzoid and the Electronics rooms focused and the x-ray off. That
    is the baseline.
  - The x-ray may add at most 15 draw calls to it, with triangles at most 500,000 and the frame rate within
    noise of 60 fps.
  - If the close-view baseline itself is over 150, record it and keep the x-ray's addition within 15.
  - Campus view unchanged when nothing is in focus (still 142 draw calls, parity test passing).
- Full Python and web suites, the browser growth test and the share test pass.

## Left to the builder

- The veil's exact colour and opacity within "light ivory, about 0.22".
- How the unmerged shell is cloned and swapped in and out.
- Where the pure rules live (a new module beside `classroom-kits.js` is expected).
