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

- Teacher vest keeps pale marks at the waist after baking; the other five are clean at close view.
- Only the primary student's walk has had a full-size check; other clips were reviewed as small renders.
- Frame rate is 57 fps with no spare draw-call or triangle margin; adding detail needs new savings.
- Character GLBs depend on Meshy downloads that are git-ignored.
- Bridge back rail stands on the adjoining roof's front edge.
- Only `world.html`'s six state presets drive the demo; real quote wiring happens in M6.
- Sit and interact clips were checked as small renders only, and at campus scale in the scene.
