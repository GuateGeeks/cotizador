# Assembly system

Modules connect through `socket_*` empties exported as GLB nodes. `scripts/asset-validation/sockets.py`
checks each pair against measured bounds, so a socket cannot agree with itself while the geometry
disagrees. Current pairs close within 1 mm: room to room, entrance to room, floor above to floor below,
and roof to room.

Roofs are exactly one bay wide so neighbours do not overlap. Rounded end caps come with the M3 kit.
