# Style bible

The GG world is rounded, compact and toy-like, with soft matte-to-satin surfaces. Forms are simple,
parts stay clearly separated, and silhouettes read at campus distance. Interiors are warm.
Avoid photorealism, paper folds, facets, noise, heavy outlines and strong metal.

- **Colour:** `world/constants.json` holds the canonical palette; nothing else defines it.
- **Materials:** `world/materials.json` is the only source of PBR values.
- **Shape:** bevel every visible edge; prefer large soft radii on big forms.
- **Faces:** two dark eyes, a small smile and no more.
- **References:** `assets/references/brief-20261101/`. Designs are original; no third-party marks.

## Naming

Asset IDs are kebab-case with a family prefix: `arch-`, `equip-`, `char-`, `furn-`, `veg-`.
Moving nodes use `wheel_l`, `rotor_1`, `joint_1`, `lid`. Sockets use `socket_<name>`.

## Scale and axes

Blender: 1 unit = 1 m, Z up, front −Y. glTF and Three.js: Y up, front +Z. The exporter performs
the only conversion; the runtime applies no scale. Floor-standing origins sit at the centre of
the ground contact.
