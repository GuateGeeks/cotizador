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

The Makerzoid program room keeps its tables; its dinosaur (`equip-dino`) is a kit robot of rigid parts
joined into one mesh skinned to a small armature and coloured per vertex (`GG_KitVertex`), so it is one draw
call. It walks a stadium loop in the room's visible right half (`web/src/world/dino-room.js`); the app plays
its `walk` clip at the time scale that matches the manifest's `stride` to its travel. A driver holds
`equip-tablet` on the `vr_grip_l` point and two watchers turn each frame to face the dinosaur.

The immersive program room is a VR space (`web/src/world/vr-room.js`): no tables, three play zones
(`equip-vr-zone`) in the room's front strip, where the roof and front beam leave students in view, spare
`equip-vr-set`s on the shelf, `equip-screen-vr` and the teacher at the back. Its students play the `vr`
clip and wear gear (`web/src/world/gear.js`): every character carries the empties `vr_eyes`, `vr_grip_l`
and `vr_grip_r`, placed per character at build time with a world scale that sizes gear authored at the
reference size (headset 0.2 m wide, controller 0.1 m tall), so gear is parented with an identity
transform. Gear meshes are marked `userData.separate` so room merging leaves them on the body.

Floor 2 is reached by `stairs:upper`: a floor-1 landing (`arch-stair-landing`) at the open west end
of the column-0 walkway, a flight running east just in front of that walkway, and a top platform on
posts that meets `gallery:0:2`. The walkway itself stays clear.
