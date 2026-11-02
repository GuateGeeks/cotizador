# Materials

`world/materials.json` is the only source. Blender builds Principled materials from it
(`scripts/blender/gg/materials.py`) and the web builds one shared `MeshStandardMaterial` per name
(`web/src/world/materials.js`), so values cannot drift. Glass is alpha-blended and has no transmission.

## Blender and Three.js comparison

Evidence: `runs/m2-03` and `runs/web-slice-02`. Verdict: `PASS` for palette and material reading.
The web version is a little more saturated on orange and purple, and ivory walls read slightly
darker because lighting is approximated. Soft bounce light from Cycles is not reproduced.
