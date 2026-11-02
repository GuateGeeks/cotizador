# Cotizador swap readiness

The swap (M6) needs separate approval. **Status: not ready.**

| Definition of done | Verdict | Note |
| --- | --- | --- |
| Cohesive world | PASS | Renders opened; user accepted the slice |
| Follows the references | PASS with gaps | Island is rectangular; layout is one long row, not the reference's L shape |
| Reproducible sources | FAIL | `.blend` and GLB are git-ignored; a clone cannot restore the Meshy student |
| Blender and Three.js match | PASS | See `MATERIALS.md` |
| Modular school connects | PASS | 17 socket pairs within 1 mm |
| Programs change the scene | PASS | All six present; `tale`, `master`, `spike` differ by hero model |
| Character and device animation | PASS with gaps | Student clips work; rotors and wheels spin; other pivots unused |
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

- Character variants need Meshy credits: about 44 each for preprimary, básico, bachillerato and teacher.
  Levels currently use scaled copies of the primary student, and no adult exists.
- Student close-up quality: specks and jagged colour edges.
- Bridge back rail stands on the adjoining roof's front edge.
- Only `world.html`'s six state presets drive the demo; real quote wiring happens in M6.
- Sit and interact clips were checked as small renders only, and at campus scale in the scene.
