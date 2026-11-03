# Assembly system

Modules connect through `socket_*` empties exported as GLB nodes. `scripts/asset-validation/sockets.py`
checks each pair against measured bounds, so a socket cannot agree with itself while the geometry
disagrees. Current pairs close within 1 mm: room to room, entrance to room, floor above to floor below,
and roof to room.

Roofs are exactly one bay wide so neighbours do not overlap. Rounded end caps come with the M3 kit.

## Skyline

`web/src/layout/plan.js` places five columns in a V, stepped back 2.5 m per row, up to three floors.
`web/src/layout/neighbours.js` then picks each roof from its neighbours: tower on the tallest stack,
terrace below a taller neighbour, barrel on project stacks, and pitched, flat or garden by key hash.
It adds archways under spans, pocket gardens in gaps, trims between equal stacks and a courtyard
tree and bench from three ground rooms. Rooms are never moved or rebuilt by these rules.

The Drones field (`web/src/world/drone-course.js`) is a closed course of two gates and two hoops on the field's
sides, joined by waypoints so each side is a straight run. Two lanes offset ±0.3 m sideways and ±0.25 m in height
keep the drones apart; their speeds follow different slow rhythms, so the lead changes. Each drone is merged by
`vertexMerge` into one body, leaving its `rotor_*` parts to spin. Pilots play the `hold` clip with
`equip-drone-remote` on `vr_grip_l` and face their drone; watchers face the leader. Under reduced motion both drones rest on the ring.

A focused room opens like the cotizador's (`web/src/world/room-xray.js`, `applyXray` in `create-world.js`).
Modules above it veil, and rooms and roofs above keep only their shell. Buildings between it and the camera
hide, and thin links veil. The room swaps its merged `entity.shell` for an unmerged copy of its asset whose
camera-facing walls veil, merged per material once veiled. Veils share `veilMaterial()` and batch into one draw;
anything under a hidden part stays out of the batch. Picking skips hidden parts and veils. It rebuilds only when the walls
facing the camera or the blockers change (`xrayKey`), reapplies when the view distance changes, reopens after updates, and clears on `resetView` or a non-room focus.

Classrooms show the programs their grades use (`web/src/layout/classroom-programs.js`): a program counts
for a level when one of its equipment `groupIds` is an enrollment row of that level, and a program with no
groups (the cotizador's landing showcase) counts for its usual levels (`HOME_LEVELS`). The ground classroom
shows programs 1-2 and the upper one 3-4 (or 1-2 again); the list is part of the module's signature, so a
change rebuilds only the affected classrooms. `web/src/world/classroom-kits.js` maps each program to table
kits, shown at `KIT_SCALE` 1.5 on the front half of each table as close-view detail; with no programs the
tables keep `LEVEL_TABLE_ITEM`. The Electronics room is three workbench stations in a U (`STATIONS` in `web/src/world/electronics-room.js`):
3D printing on the left wall (`furn-workbench-short`, printer, spool rack, printed parts), the robotic arm on
the right (arm, laptop) and circuits along the back (`furn-workbench`, kits, two students on `furn-stool`s), with
the teacher in the open middle. Benches and stools merge with the room; the printer and arm sway (`swayPose`)
and are close-view detail.

The Makerzoid program room keeps its tables; its dinosaur (`equip-dino`) is a kit robot of rigid parts
joined into one mesh skinned to a small armature and coloured per vertex (`GG_KitVertex`), so it is one draw
call. It walks a stadium loop in the room's visible right half (`web/src/world/dino-room.js`); the app plays
its `walk` clip at the time scale that matches the manifest's `stride` to its travel. A driver plays `hold`
with `equip-tablet` on the `vr_grip_l` point and two watchers turn each frame to face the dinosaur.

The immersive program room is a VR space (`web/src/world/vr-room.js`): no tables, three play zones
(`equip-vr-zone`) in the room's front strip, where the roof and front beam leave students in view, spare
`equip-vr-set`s on the shelf, `equip-screen-vr` and the teacher at the back. Its students play the `vr`
clip and wear gear (`web/src/world/gear.js`): every character carries the empties `vr_eyes`, `vr_grip_l`
and `vr_grip_r`, placed per character at build time with a world scale that sizes gear authored at the
reference size (headset 0.2 m wide, controller 0.1 m tall). A grip point turns with its hand from the
T-pose, so `GRIPS` in `gear.js` gives each held item a resting position and rotation on its point: the
remote and tablet lie flat across both palms in `hold`, the controllers stand upright in each fist in `vr`
(one grip per side). The values are solved from the manifests' `hand_poses` (grip positions, palm and thumb
directions per clip, glTF axes) and checked in the browser through `getDiagnostics().hands` (distance from
the middle of both hands, height above them, and how upright each item stands). Hands are posed with wrist
angles only: `hold` (palms up together in front of the chest), `vr` (fists forward, thumbs up, the reaching
wrist turning back as the arm lifts) and `interact` (palms down); `sit` and `idle` keep their hands.
Gear meshes are marked `userData.separate` so room merging leaves them on the body.

Floor 2 is reached by `stairs:upper`: a floor-1 landing (`arch-stair-landing`) at the open west end
of the column-0 walkway, a flight running east just in front of that walkway, and a top platform on
posts that meets `gallery:0:2`. The walkway itself stays clear.
