# VR room design

Date: 2026-11-02. Branch: `feat/iterate-models`.

## Intent

The immersive program room should read as a VR class at a glance: students standing in open floor space,
wearing headsets, looking around and reaching with controllers. Today the room is an ordinary classroom
with two VR sets lying on its tables and two students doing generic idle and seated loops, so nothing
says "VR" except two small props.

## Goals

- The immersive room is a dedicated VR space: the tables and their chairs are gone. (user)
- Students stand in open floor space, wearing a headset, looking around and reaching with controllers. (user)
- The gear is separate headset and controller models attached to the character's bones in the app, and
  a new `vr` animation clip is added to every character. (user chose this approach)
- The room still reads as VR from the default campus camera, not only in close view.

## Non-goals

- No change to any other program room, to the standard classrooms, or to walkers and terrace students.
- No new character models, no Meshy generation, no credits.
- No interaction: clicking a VR student does nothing new.
- No virtual-world scene rendered on the screen; a static image or texture is enough.

## Anti-goals

- Gear that floats off the head or hands during the loop, or that clips through the face.
- Students moving in lockstep.
- Breaking the performance targets in `docs/PERFORMANCE.md` (150 draw calls, 500k triangles, 60 fps on
  the reference desktop) to get there.

## Constraints

- Characters share one skeleton: `Head`, `LeftHand`, `RightHand` and the rest listed in
  `PARENTS_FIRST` in `scripts/blender/assets/characters.py`. Clips are authored there with `clip()` and
  `pose()` from world-axis turns, so a new clip works on every character.
- The immersive room is `arch-classroom-corner` (6 x 5 m), placed by `web/src/layout/plan.js` with
  `programId: 'immersive'` and `population: 2`. It is furnished and seated by `furnish()` and `seat()` in
  `web/src/world/create-world.js`; its program props come from `PROGRAM_SETUP.immersive`.
- Its roster is `char-student-basico` and `char-student-bach`: `rosterFor` gives both for program rooms,
  which have no `levelId`.
- `mergeStatic` (`web/src/world/merge.js`) merges every non-skinned mesh under an entity into static
  geometry unless the node is named as moving or has `userData.separate`. Gear attached to a bone must
  set `userData.separate`, or it is welded into the room and stops following the body.
- Each character is a close/distance pair (`pair.high`, `pair.low`) swapped by `lod`. Gear must be
  attached to both, and follow the swap.
- Characters are different heights (1.5 m basico, 1.58 m bach), and the armature is scaled per character.
  Gear attached to bones inherits that scale, so it must be authored for the shared skeleton's
  proportions, not in metres for one character.
- New assets follow the pipeline: built by `scripts/world.py build`, a manifest with budget and verdicts,
  a new run directory per result, published with `publish`, rendered and opened before any visual verdict.
- Performance currently measures 135 draw calls including the shadow pass; the limit is 150.

## Approaches

1. **Separate gear models attached in the app (chosen).** Blender builds `equip-vr-headset` and
   `equip-vr-controller` in the style of the existing `equip-vr-set`. The `vr` clip is authored for every
   character. In the VR room the app attaches the headset to `Head` and a controller to each hand.
   Cheapest to download, reuses the characters as they are, and every character can wear the gear.
   Costs a little attachment code and per-skeleton fitting.
2. **VR variants of the characters with gear baked in.** No attachment code, but two to four more
   character files to bake and download (0.4-0.6 MB each with distance models), and every character fix
   has to be repeated on them.
3. **Meshy-generated students wearing VR.** Credits, a style that would not match, and a new rig. Ruled out.

## The room (decided with the user, details are proposals)

- Tables, chairs and the table-top VR sets are removed from the immersive room only. (user)
- Three play zones are marked on the floor as turquoise rings, spaced so reaching arms never cross.
  (proposal: three students instead of the usual two, because a half-empty VR lab reads as idle; keep
  three only if the performance check below passes, otherwise two)
- One student stands in each zone in the `vr` loop, each starting at a different time so they never move
  in sync. (proposal)
- Spare headsets sit on a charging shelf against a wall, built from the existing shelves or the existing
  VR set, replacing the trays on the tables. (proposal)
- The wall screen stays and shows a bright "virtual world" image so the room reads from outside. (proposal)
- The teacher stands by the screen. (proposal)

## Gear (proposals and builder-check calls)

- `equip-vr-headset`: a visor, strap and lens in the existing VR set's colours, sized to sit over the eyes.
- `equip-vr-controller`: a grip with the turquoise ring, held in the hand.
- **Draw calls (call):** gear on a moving bone cannot be merged or batched, and each material is a draw
  call. So each gear piece is one mesh with one material, its colours carried as vertex colours, which
  keeps the VR set's look at one draw call per piece. Gear casts no shadow, so it stays out of the shadow
  pass. In close view a student costs three gear draws; at campus distance only the headset is attached
  (controllers are a few pixels and are skipped), so three students cost three gear draws there. With the
  extra student this is about four more draws at campus view, inside the 15 of headroom; the measurement
  below decides between three students and two.
- **Fit (call):** the existing `headfront` pivot is not on the face (it sits at chest height in front of
  the body), and Meshy rigs differ in bone roll, so one offset cannot fit everyone. The character build
  adds three empties per character, parented to `Head`, `LeftHand` and `RightHand`: `vr_eyes` placed from
  that character's head mesh (front of the face at eye height), and `vr_grip_l` / `vr_grip_r` in the palms.
  They are exported in the GLB and recorded as pivots in the manifest. The app parents the gear to these
  empties, so fitting happens once per character at build time. Every character gets the empties; fit and
  render QA cover the VR roster (`char-student-basico`, `char-student-bach`) in close and distance models.
- **Seen from campus (call):** the gear is not enlarged on the distance models. From the campus camera the
  room reads as VR through the rings, the standing poses, the screen image and the bright visors; the
  headset only needs to be visible, not detailed.

## The `vr` clip (proposal)

**Rebuild (call):** the clip and the fitting empties are authored in `student()`, so all 12 character
GLBs are rebuilt, re-baked and published once, in one new run. The bake is not byte-for-byte repeatable, so
the rebuilt characters get the same QA as today's fixes: tests, `bake_gaps` and `bake_mismatch` in the
manifests, and an opened review sheet compared with `runs/iter-03-distance-final`.

A loop authored like the existing clips, about 2-3 seconds: the head turns left and right and tilts,
one arm reaches forward and closes, both arms sweep to the side, back to the start. Arms stay clear of the
head so controllers never pass through the headset. Feet stay planted.

## Done means

- In close view of the VR room, every student wears a headset over the eyes and holds a controller in
  each hand through the whole loop, with nothing floating or clipping. Checked on renders that were opened.
- From the default campus camera, the room shows standing students in rings with visible headsets.
- Other rooms are unchanged (call): there is no pixel-baseline test, and characters animate. Before any
  change, a review-sheet run captures the six compositions; after the work, a new one is captured and both
  are opened and compared side by side, and the browser growth test (entity, draw-call and geometry counts)
  still passes for every state.
- Tests pin: the immersive room has no tables or chairs; it seats the planned number of VR students in
  the `vr` clip; every character has the `vr` clip and the three fitting empties; gear is marked separate
  so merging leaves it on the body; the headset is on both the close and distance models, controllers on
  the close model.
- Performance on the largest campus stays within 150 draw calls and 500k triangles at 60 fps on the
  reference desktop, recorded in a new run.
- Full Python and web suites and the browser growth and share tests pass.

## Left to the builder

- Exact gear dimensions, offsets and rotations against the skeleton.
- Exact poses and timing of the `vr` clip within the description above.
- Ring positions, shelf and screen placement within the room.
- How the screen image is made (texture on the existing screen model or a new material).
