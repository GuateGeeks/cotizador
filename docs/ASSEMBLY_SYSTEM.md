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
