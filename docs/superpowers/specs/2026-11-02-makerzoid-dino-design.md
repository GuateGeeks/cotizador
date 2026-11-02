# Makerzoid robot dinosaur design

Date: 2026-11-02. Branch: `feat/iterate-models`.

## Intent

The Makerzoid program room (`programId: 'master'`) should read as kids driving a robot they built. Today its
dinosaur (`equip-dino`) is a frozen, plush-looking statue of rounded blobs, enlarged 2.4x at the front of
the room. It should look like a real robot kit and walk around the room with its legs, head and tail
moving, driven by a student with a tablet while the others watch.

Makerzoid kits are snap-together block sets with motors and sensors, built into robots including robot
animals, and programmed with block coding from an app on a phone or tablet (retailer listings: Altronics,
CircuitMall). No specific Makerzoid dinosaur model or its colours could be confirmed, so the look follows
the kit's construction in the campus palette.

## Goals

- The dinosaur looks like a real robot kit: chunky beams and plates with peg holes, a controller brick with
  a light, motors visible at the hips, neck and tail. (user; parts are proposals)
- It walks around the room, legs stepping, head bobbing and tail swinging. (user)
- One student drives it with a tablet; the others watch. (user)
- The gait is a walk clip authored in Blender on the dinosaur's joints, played by the app while it moves the
  dinosaur along a loop with the clip speed matched to its travel. (user chose this approach)
- The room still reads as Makerzoid from the default campus camera.

## Non-goals

- No change to other rooms, the walkers, or the VR room.
- No Meshy generation and no credits.
- No interaction: clicking the dinosaur or students does nothing new.
- No obstacle avoidance or path finding: the loop is fixed.

## Anti-goals

- Feet that slide along the floor, or a dinosaur walking through tables, chairs or students.
- A dinosaur that still reads as a toy or plush rather than a built robot.
- Breaking the performance targets in `docs/PERFORMANCE.md` (150 draw calls, 500,000 triangles, 60 fps on
  the reference desktop; last measured 139 draw calls with the VR room).

## Constraints

- The room is `arch-classroom-expandable` (6 x 5 m). Its two four-seat tables (1.3 x 1.3 m) stay at x -1.05
  and 1.35, z -0.2, with their chairs, the seat chair at (0.47, -0.2), the shelves and kit storage. The
  laptop stays on a table. Open floor is the front strip, roughly z 0.5 to 2.0 in room-local metres.
- Visible students stand about 1.0-1.2 m in from the open front; the roof and front beam hide the back of
  the room at the default camera (learned on the VR room).
- `PROGRAM_SETUP.master` in `web/src/world/create-world.js` places the dinosaur today; `seat()` places the
  room's students (`population: 2` for program rooms) and the teacher.
- Static room parts are merged and batched (`mergeStatic`, `buildBatch`); anything that moves must stay out
  of both (`userData.separate`, or a skinned mesh, which `mergeStatic` skips).
- Each mesh is one draw call per material, doubled when it casts shadows.
- Characters have `vr_grip_l` / `vr_grip_r` fitting points in their palms (world scale sizes gear authored
  at the reference size) and the clips `idle`, `walk`, `sit`, `interact`, `vr`.
- New assets follow the pipeline: built by `scripts/world.py build` into a new run, manifest with budget and
  verdicts, published with `publish`, renders opened before any visual verdict.

## Approaches

1. **Walk clip authored in Blender (chosen).** The dinosaur is rigid kit parts on a small armature; a looping
   `walk` action is authored on its bones like the character clips. The app plays the clip with an
   `AnimationMixer` and moves the dinosaur along the loop, scaling the clip speed to its travel. The
   pipeline's clip previews render the gait for review.
2. **Movement coded in the app.** Pivots only; the app swings legs, head and tail every frame like rover
   wheels and drone rotors. Exact speed match, but the gait cannot be reviewed in renders.
3. **Meshy-generated dinosaur.** Credits, and a fused mesh that cannot move part by part. Ruled out.

## The dinosaur (proposals)

- Rebuilt as `equip-dino` (same id, so the room and catalog keep their reference) from kit parts: purple
  beams with dark peg holes for the frame and legs, green body and head panels, an ivory controller brick on
  the back with a small turquoise light, motor housings at the four hips, the neck and the tail base with
  orange caps, and ivory feet. Budget 5,000 triangles as today.
- **Draw calls (call):** the parts are joined into one mesh skinned to the armature with rigid weights (each
  part follows one bone), coloured with vertex colours and one material, so the whole dinosaur is one mesh:
  one draw call, two with its shadow. The material contract gains one vertex-colour material for this.
- Bones: body root, four legs, neck, head, tail. The `walk` clip steps diagonal pairs of legs, bobs the
  head and swings the tail; its stride length is recorded in the manifest so the app can match speed.
- Shown at about 1.5x (about 1.15 m long), down from 2.4x, so it fits the loop; checked from the campus
  camera.

## The room (proposals)

- **The loop:** a closed rounded path in the front strip, clear of the tables, chairs and students, which the
  dinosaur follows nose-first at a slow walk, turning at the ends.
- **Foot slide (call):** one `walk` clip, its speed matched to travel, keeps feet planted on the straights.
  In the two end turns (radius about 0.4-0.5 m) some slip is accepted: at a slow walk and campus scale it is
  a few pixels, and turn clips would double the gait work. If the opened close-view frames show the slip
  clearly, the dinosaur is shown smaller (down to about 1.2x) to open up the turns before anything else.
- **The driver:** one student at the side of the loop, holding a tablet in both hands in the `interact` pose,
  turning each frame to face the dinosaur. The tablet is a new small asset worn on the left-hand grip
  point, close model only.
- **If `interact` does not read as holding a tablet (call):** adjust the tablet's size and angle first. A
  new `drive` clip would mean rebuilding and republishing all twelve characters, which this plan does not
  schedule: if the tablet still does not read, stop and ask the owner.
- **The watchers:** two students standing back from the loop in `idle`, turning to face the dinosaur.
- **Who is in the room (call):** the driver and two watchers replace the room's current two students; the
  seated student goes (the seat chair stays, empty, like the other chairs). That is three students instead
  of two. If the performance check fails, drop to one watcher.
- **The teacher** stays where `seat()` places it today.

## Done means

- In close view the dinosaur reads as a built robot, walks its loop without sliding feet and without
  crossing furniture or students, and its legs, head and tail move. Checked on opened renders at several
  moments, plus the Blender clip previews.
- The driver holds the tablet and every student turns to follow the dinosaur.
- From the default campus camera the dinosaur is visible and moving.
- Tests pin: the dinosaur has the `walk` clip, the bones and one material; the loop stays inside the open
  strip and clear of every seat, table and chair; the room has the driver and watchers; the dinosaur mesh
  stays out of merging and batching; the app's speed matches the stride.
- Performance on the largest campus within 150 draw calls and 500,000 triangles, and the parity browser test
  passing on the reference desktop, recorded in a new run (call: the VR room measured 59 fps and passed the
  parity test; 59-60 fps counts as within measurement noise of the 60 fps target). Other rooms unchanged against a baseline captured first.
- Full Python and web suites, the browser growth test and the share test pass.

## Left to the builder

- Exact part shapes, bone placement and the gait's poses and timing.
- The loop's exact shape and speed within the constraints above.
- Exact student and tablet placement.
