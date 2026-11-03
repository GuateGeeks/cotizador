# Hands holding things design (short)

Date: 2026-11-03. Branch: `feat/iterate-models`.

## Intent

Hands have fixed angles in every pose, so held things look wrong:
- VR controllers hang at the students' sides, sticking out sideways.
- The drone pilots and the Makerzoid driver hold their remote or tablet in one hand, out to the side and tipped on
  edge.

The fix uses the existing skeleton (no finger bones, no new rigs).

## Goals (user)
- Improve how hands hold controllers, tablets, remotes and laptops using wrist angles and poses only, no new rigs.
- Built in the Blender character animations, with a one-time rebuild of all 12 characters. (user chose this
  approach over live bone overrides in the app)

## Non-goals
- No finger animation, no Meshy, no credits.
- No change to idle, walk or sit, or to where any character stands.

## Approaches
1. **Author poses in Blender's character animations (chosen).** All 12 characters are rebuilt once, and poses are
   checked in the clip review renders.
2. **Override hand bones live in the app.** No rebuild, but it fights the animations and cannot be reviewed in
   renders.

## The change (proposals, accepted by the user)
- **A new `hold` clip:**
  - Both forearms come in front of the chest, hands close together, palms up, holding something flat.
  - The thumbs (whole hands, since there are no fingers) tap now and then so it isn't frozen.
- **Who uses `hold`:** the drone pilots and the Makerzoid driver. Their remote or tablet sits between both hands,
  lying flat.
- **`vr` clip:** the wrists turn so the controllers stand upright with the ring on top, held a little forward of
  the body.
- **`interact` clip:** the palms turn down, as if typing or building.
- **Grip angle per held item:** `wearItem` gains an optional rotation, so each item (headset, controller, remote,
  tablet) gets its own resting angle on the fitting point and nothing pokes through a hand.

## Constraints
- Clips are authored in `scripts/blender/assets/characters.py` (`author_clips`, `clip()` with world-axis turns).
  Every character carries every clip, and the tests in `tests/test_student.py` pin the clip list.
- Gear is parented to `vr_grip_l` / `vr_grip_r` (a world-scaled empty per character), so held items follow the
  hand bone.
- **Rebuild:** all 12 characters are rebuilt and published once in a new run. Bake checks stay as today
  (`bake_gaps` 0, `bake_mismatch` within its test limits).

## Done means
- Tests pin:
  - every character has the `hold` clip
  - the pilots and the driver play `hold`
  - each held item has its grip rotation
- **Opened renders:** clip previews of `hold`, `vr` and `interact`, plus close views of the VR room, the drone
  pilots, the Makerzoid driver and the Electronics laptop student. Items sit in the hands, upright or flat as
  intended, not through them.
- Campus view still within 150 draw calls (only clips change, so draws should not move). All suites pass.

## Left to the builder
- Exact angles and timing, the item offsets on the fitting points, and whether `interact`'s palm turn needs a small
  forearm tweak.
