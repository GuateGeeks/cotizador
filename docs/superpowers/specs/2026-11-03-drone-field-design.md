# Drone field design

Date: 2026-11-03. Branch: `feat/iterate-models`.

## Intent

The Drones program's outdoor field should read as a drone class in action. Today one drone, enlarged 3x, floats about
2.4 m above the courtyard and bobs in place with its rotors spinning; no student is on the field. It should become a
small race: two drones flying a course through gates and hoops, flown by two pilots while other kids watch. The field
is outdoors with nothing above it, so it is one of the first things a visitor sees from the campus view.

## Goals

- The drones fly through gates and hoops along a course. (user)
- Two drones race, flown by two pilots, with some kids watching. (user)
- Built as a course module in the app with obstacle models from Blender. The app moves the drones along a smooth
  path through the obstacles, as the Makerzoid dinosaur follows its loop. (user chose this approach)

## Non-goals

- No change to other rooms, the walkers, the x-ray or the courtyard tree and bench details.
- No new character animations or hand changes (hands are a later item); pilots use an existing clip.
- No race logic (laps, winners, timing); the race is a looping show.
- No Meshy, no credits.

## Anti-goals

- Drones touching each other, an obstacle, a student, the planters or the building.
- Drones that miss the gates and hoops they are meant to fly through.
- A field that still reads as one drone hanging in the air.
- Breaking the performance budget: campus view at most 150 draw calls (currently 144) and the parity test passing.

## Constraints

- **The field:** the module `patio:drones` (`type: 'patio'`, asset `arch-courtyard`) sits at world (12, 0, 4.4) from
  `plan.js`.
  - Field-local, three.js axes, the open front at +z: the sand pad is 8 × 5 m (x −4..4, z −2.5..2.5), with its top at
    0.05 m.
  - The turquoise landing ring is centred at (0, 0) with a 1.7 m radius.
  - Two planters stand at (±3.2, −1.7), 1.4 × 0.6 m.
  - Outside the pad: the `courtyard:tree` detail at world x 7 and the `courtyard:bench` at world x 17 (z 3). The
    building's columns stand behind the back edge.
- **Today's drone:** `create-world.js` `build()` places it for `patio` modules.
  - `equip-drone` is placed at y 2.4, scale 3, in `entity.hovers`, with its four `rotor_*` nodes pushed to
    `entity.spinners` (speed 16).
  - `equip-drone` is 0.58 × 0.09 × 0.54 m, with rotors `rotor_1..4`, and is unskinned.
  - Moving nodes named `rotor_` are skipped by `mergeStatic`.
- **Patio students:** none today. `rosterFor` of a module with a `programId` and no `levelId` gives
  `char-student-basico` and `char-student-bach`.
- **Hands:** characters have `vr_grip_l` / `vr_grip_r` fitting points. `wearItem(character, kit, point, id)` in
  `web/src/world/gear.js` parents a vertex-coloured gear mesh there.
- **Following:** the Makerzoid room turns its students each frame to face the dinosaur (`poseDino` trackers in
  `create-world.js`), and stands the dinosaur still at a visible spot under reduced motion.
- **Performance:** campus view measured 144 draw calls (`runs/lab-08-parity`). Each added character costs one draw
  at campus distance.
- **Pipeline:** new assets are built into a new run, with a manifest, budget and verdicts, published, and their
  renders opened before any visual verdict.

## Approaches

1. **Course module in the app; obstacle models from Blender (chosen).**
   - Blender builds `equip-drone-gate`, `equip-drone-hoop`, `equip-race-flag` and `equip-drone-remote`.
   - A pure module lists the obstacles and builds each drone's lane as a smooth closed curve through them.
   - The app moves and banks the drones along their lanes with varying speed, spins rotors as today, and turns
     pilots and watchers to follow.
   - Cost: the flight shows only in the browser.
2. **Flight paths animated in Blender.** Reviewable in renders, but the drones would need a skeleton, and the course
   would be baked into the animation.
3. **Self-steering drones.** Flights would not repeat, but they are hard to keep apart and hard to test.

## The field (decided with the user; details are proposals)

- **The course (proposal):** one closed loop around the pad, starting and finishing over the landing ring.
  - **Obstacles, in course order:**
    1. a square gate standing on the ground
    2. a hoop on a post, raised high
    3. a second ground gate
    4. a second hoop, at a lower height
  - The drones climb and dip between them.
  - A checkered `equip-race-flag` marks the start/finish beside the ring.
  - Every obstacle is wide enough for both lanes side by side: gates about 1.6 m wide and 1.2 m tall, hoops about
    1.4 m across.
- **The race (user + proposal):**
  - **Lanes:** two drones fly the same loop in two lanes about 0.45 m apart (left and right of the centre line,
    both inside each obstacle opening).
  - **Speed:** each drone's speed along its lane rises and falls on a different slow rhythm, so the lead changes
    hands now and then. They never touch, since they keep their lanes.
  - **Motion:** the drones bank into turns and pitch with climbs. Rotors spin as today.
  - **Scale:** 1.6× (about 0.9 m across), down from 3×.
- **Pilots (user + proposal):**
  - Two students stand at the front edge of the field, outside the course, facing it.
  - Each holds an `equip-drone-remote` (a small handheld controller with two sticks) on `vr_grip_l`, in the
    `interact` pose.
  - Each turns each frame to face their own drone.
- **Watchers (user + proposal):** two students stand beside the start line, outside the course, in `idle`, turning
  to follow the leading drone.
- **Reduced motion (proposal):** both drones rest on the landing ring, side by side, with rotors still. Pilots and
  watchers face them.
- **Campus distance (proposal):** gates, hoops and the flag merge with the field at every distance. The drones, being
  in motion, stay unmerged as today. The remote is close-view only (gear on the close model, as the VR controllers
  are).
- **Performance (proposal):** four added students and one more drone should land near 148 campus draw calls. If the
  campus goes over 150, drop to one watcher.

## Done means

- From the campus view and with the field focused, two drones visibly race through the gates and hoops while the
  pilots and watchers follow them. Checked on opened renders at several moments, and under reduced motion.
- Tests pin:
  - every obstacle stands on the pad, clear of the ring, the planters, the pilots and the watchers
  - each lane passes through every obstacle opening with clearance for a 0.9 m drone
  - the lanes never come within 0.35 m of each other or of any obstacle frame
  - the paths stay inside the pad and below a sensible ceiling
  - the drones' order changes at least once per lap
  - reduced motion rests both drones on the ring
  - the new assets' sizes and budgets
- Browser checks pin:
  - two drones moving
  - four students on the field
  - the pilots holding remotes
  - no drone assets loaded without the Drones program
- Performance: campus view at most 150 draw calls with the parity test passing. Focused view of the field
  measured and recorded.
- Full Python and web suites, the browser growth, x-ray and share tests pass.

## Left to the builder

- Exact obstacle positions, heights and rotations within the field, and the curve type.
- Speed rhythms, banking amounts and student spots.
- The models' detailed shapes within their budgets.
