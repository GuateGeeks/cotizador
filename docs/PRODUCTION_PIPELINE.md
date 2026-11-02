# Production pipeline

1. Copy `config.example.json` to `.local/config.json` and set your Blender path.
2. `python3 scripts/world.py doctor` confirms Blender and the contract.
3. `python3 scripts/world.py build <id> --run runs/<new-name>` writes the GLB, `.blend`, previews and
   manifest. Use a new run directory for every result.
4. Open the previews, then record the verdicts in `assets/manifests/<id>.json`. An export is not
   an approval. Technical, visual, content and provenance verdicts are separate:
   `PASS`, `FAIL`, `BLOCKED` or `NOT_RUN`.

Meshy work keeps its input images, parameters and task IDs in a `PROVENANCE.json` beside the source.
