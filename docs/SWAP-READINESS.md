# Cotizador swap readiness

The swap (M6) needs separate approval. **Status: not ready.**

| Definition of done | Verdict | Note |
| --- | --- | --- |
| Cohesive world | PASS | Renders opened; user accepted the slice |
| Follows the references | PASS with gaps | Stepped V with varied roofs; island is still rectangular |
| Reproducible sources | FAIL | `.blend` and GLB are git-ignored; a clone cannot restore the Meshy student |
| Blender and Three.js match | PASS | See `MATERIALS.md` |
| Modular school connects | PASS | 17 socket pairs within 1 mm |
| Programs change the scene | PASS | All six present; `tale`, `master`, `spike` differ by hero model |
| Character and device animation | PASS with gaps | Six characters share four clips; rotors and wheels spin; other pivots unused |
| Efficient campus | PASS on desktop | Phone is `BLOCKED` |
| Documented and traceable | PASS | Manifests and catalog |
| Fully interactive | PASS | Drag, zoom, keyboard, selection, focus |

## Parity gate

| Item | Verdict |
| --- | --- |
| No-WebGL and failed assets report to the host | PASS |
| Reduced motion | PASS |
| Context loss recovery | PASS |
| Selection, focus, keyboard | PASS |
| Six programs recognisable | PASS at close view; weak at campus distance |
| Program activity cycles from the cotizador | FAIL: not ported, only ambient motion |
| Geeky guidance and gestures | FAIL: character not ported; `agentGesture` only records |
| Hover labels, x-ray room view | PASS with gaps: title attribute and roof hiding only |

## Open items

- The Electronics room is three workbench stations (printing, arm, circuits) with four students and no classroom tables (`runs/lab-11-review`).
- Focusing a room (click or the cotizador's `setFocus`) opens it as the cotizador's paper campus does: what blocks it veils or steps aside (`runs/xray-17-review`). Unlike the cotizador, a veiled room above cannot be clicked through to.
- Classrooms show the kits of the programs their grades use, from the cotizador's equipment `groupIds`; on the landing showcase (no groups) each program shows at its usual level (`runs/kits-13-tables`). At the default view the front lintel and pillar still hide part of each classroom's tables.
- The Makerzoid room shows a kit robot dinosaur walking a loop, driven by a student with a tablet while two watch (`runs/dino-12-room`). The walkway above the room hides the dinosaur for part of its loop at the default close view.
- The VR room shows three bachillerato students wearing headsets and holding controllers in the `vr` loop, readable from the campus camera (`runs/vr-15-room`, `runs/vr-18-review`). Gear fit was checked on the basico and bach students only; the other characters carry fitting points but have not worn gear.
- Characters are clean at close view. The teacher vest's waist marks came from hidden shirt pieces inside the Meshy mesh; the bake now drops enclosed loose parts and records `bake_mismatch` (teacher 1.6%, students 0.8-1.1%; distance models 2.4-3.9%). The campus-distance models (`-lod1`) no longer show black bake gaps: texels the bake's rays miss (long thin faces across curves) are filled from the nearest visible source point and padded, and partly hit texels are restored to full strength (`bake_gaps` 0 for all twelve). At close view the distance models still carry small colour slips, such as navy from the shorts on the pre-school calves.
- Only the primary student's walk has had a full-size check; other clips were reviewed as small renders.
- Frame rate is 60 fps at 135 draw calls and about 384k triangles; little draw-call margin is left.
- Character GLBs depend on Meshy downloads that are git-ignored.
- Bridge back rail stands on the adjoining roof's front edge.
- The upper stair flight runs in front of the floor-1 walkway, from its own landing to a platform beside
  the floor-2 gallery. It still reads close to the preprimary terrace rail from the default camera.
- Only `world.html`'s six state presets drive the demo; real quote wiring happens in M6.
- Sit and interact clips were checked as small renders only, and at campus scale in the scene.
