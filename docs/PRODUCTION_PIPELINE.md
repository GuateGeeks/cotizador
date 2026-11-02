# Production pipeline

1. Copy `config.example.json` to `.local/config.json` and set your Blender path.
2. `python3 scripts/world.py doctor` confirms Blender and the contract.
3. `python3 scripts/world.py build <id> --run runs/<new-name>` writes the GLB, `.blend`, previews and
   manifest. Use a new run directory for every result.
4. Open the previews, then record the verdicts in `assets/manifests/<id>.json`. An export is not
   an approval. Technical, visual, content and provenance verdicts are separate:
   `PASS`, `FAIL`, `BLOCKED` or `NOT_RUN`.

Meshy work keeps its input images, parameters and task IDs in a `PROVENANCE.json` beside the source.

## Shareable page

`npm run share` (in `web/`) builds `web/share-dist/`: the page from `web/share/`, one bundled script and
every published model packed as base64 GLB text. The artifact frame refuses `.glb` files and blocks
`fetch()` of `data:` and `blob:` URLs, so models are parsed in memory and textures load through images.
`npm run test:share` serves the build under those rules and fails if any model or character is missing.
Publishing the page outside this machine is a separate, explicit step.

## Iterating on models and compositions

1. Change the asset in `scripts/blender/assets/` (or the layout in `web/src/layout/`), with its test first.
2. `python3 scripts/world.py build <ids> --run runs/<new-run>`, open the previews, then `publish --run`.
3. With `npm run dev` running: `npm run review -- ../runs/<new-run>` captures every model as the scene
   loads it, the six growth states and the x-ray view, with `models-sheet.png` and
   `compositions-sheet.png`. Pass model IDs after the run to capture only those models. It refuses a
   non-empty directory, so each result keeps its own run.
4. Compare with the previous review run (baseline: `runs/iter-00-baseline-2`), then run the growth
   and parity suites before committing. One model at a time: `web/src/app/model.html?id=<asset>`.
