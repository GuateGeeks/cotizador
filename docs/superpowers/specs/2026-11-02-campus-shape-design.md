# Campus shape and skyline: design

Status: awaiting approval. Date: 2026-11-02.
Extends `2026-11-01-guategeeks-world-design.md`; its world contract and verdict rules still apply.

## 1. Intent

The campus reads as one long horizontal bar, which the user finds boring. It should become a
place with a varied skyline, still clearly the rounded GuateGeeks world, where small surprises
appear as a school evolves. Townscaper is the reference for how details emerge from neighbours.

## 2. Goals, non-goals, anti-goals

**Goals**
- Varied heights and rooflines across every school size, from a few rooms upward.
- One consistent style: same palette, materials, soft bevels and bay module.
- Surprises that appear when neighbours change, not only at the largest size.

**Non-goals**
- A crooked or irregular grid. The user ranked heights and surprises above the organic outline.
- A tile or constraint solver.
- Any cotizador change, and the swap blockers such as Geeky and program activities.

**Anti-goals**
- A random-looking campus, or one that differs between two runs of the same quote.
- Existing rooms that move or change floor when scope is added.
- Roof variety that reads as a different art style.
- Visual richness paid for with a slower campus.

## 3. Approaches

1. **Chosen by the user:** a fixed stepped courtyard map plus a neighbour rule layer. It extends
   the current engine and stays deterministic; variety is limited by the rules written.
2. Hand-designed growth stages. Strong art direction, but too many level and program combinations
   to cover, and additions jump between layouts.
3. Tile-solver generation. Most emergent, but needs a much larger kit, and changes can ripple
   across the campus, which fights stable rooms.

## 4. Decided by the user

- Option 1.
- Varied heights and rooflines, consistent with the style.
- Surprises that appear as the school evolves.

The proposals in the earlier playback were accepted with "go ahead": up to three levels, a small
roof family, straight 6 × 5 m bays stepped around a courtyard, neighbour-driven details, and no
movement of existing rooms.

## 5. New slot map

All values below are the author's calls and may be tuned during blockout, as long as sections 2
and 7 hold. Columns stay 6 m wide. Rows step back 2.5 m, half a bay, so neighbours still share wall.

| Column | Row z | Floor 0 | Floor 1 | Floor 2 |
| --- | ---: | --- | --- | --- |
| 0 | 0 | pre | upper pre | - |
| 1 | -2.5 | prim | upper prim | spike |
| 2 | -5 | tale | master | immersive |
| 3 | -2.5 | bas | upper bas | electronics |
| 4 | 0 | bach | upper bach | - |

- This forms a V open to the camera, with the tallest stack at the centre and every cutaway front
  still visible from the default view.
- The entrance stays west of column 0. The courtyard and drone patio fill the front of the V.
- Maximum width falls from seven columns to five, so large campuses frame better.
- Existing rules stay: upper rooms at 90 students or 4 sections, and `support` under any floor
  without a room. Key formats do not change.

## 6. Roof family and neighbour rules

A new pure step, `applyNeighbours(modules)`, runs after `planWorld` lays out rooms. It has no
randomness: choices come only from the plan and a stable hash of the module key.

**Roof family:** flat terrace, gentle pitched, rounded barrel, small tower cap, rooftop garden.

| Condition | Result |
| --- | --- |
| Top of a level stack | Pitched or flat, chosen by key hash |
| Top of a project stack | Barrel |
| Tallest stack in the school | Tower cap |
| Roof lower than a neighbouring room | Terrace with rail and planter, plus students when the taller room is occupied |
| Gap between two built columns | Pocket garden, or an archway if a floor spans it |
| Three or more ground rooms | Courtyard tree and bench appear |
| Two adjacent stacks of equal height | Shared roof trim |

Roofs and details are separate entities with keys that include their variant. Only they may change
when a neighbour arrives, using the existing small pop-in. Room entities are never rebuilt for this.

## 7. Constraints

- Same scope gives the same result, always.
- Adding scope never moves a room key. Details may change.
- Every upper room has a visible route to the ground. This needs a second stair flight and short
  gallery links across the stagger, and no stairs may end at a wall.
- New modules follow the kit rules: socket checks where they join, one connected part, previews
  opened before any visual verdict. Roofs stay within 1,500 triangles each.
- Roofs may overhang only where they do not cross a neighbouring bay.
- Largest campus at rest: at most 150 draw calls and 500,000 triangles, and 60 fps on the RTX 3060 Ti.
  It is at 149, 499,315 and 57 fps today, so this work must find its own savings. Lighter room
  contents at campus distance are the first candidate. Targets are not relaxed.
- No Meshy credits are needed.

## 8. Evidence of done

- Layout tests pin determinism, no overlaps, key stability, supports and a route for every upper room.
- Rule tests pin each row of section 6, including a detail appearing and leaving as scope changes.
- Rendered growth sequence opened at small, medium and large sizes, compared with the previous bar.
- Existing growth and parity suites still pass, including rapid updates and reduced motion.

## 9. Left to the builder

Exact tuning of rows, rule thresholds, roof modelling, gallery form, island outline and framing,
and which savings to use, provided sections 2 and 7 hold.

## 10. Relation to the swap blockers

The user asked for this "on parallel". The author reads that as alongside the blockers. Both edit
`create-world.js`, so this runs first and the blockers follow, to avoid conflicting rewrites.
