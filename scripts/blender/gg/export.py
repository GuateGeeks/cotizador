"""Export, reimport and record one asset. Metrics are read back from the written GLB."""
import hashlib, json, os, pathlib, sys

import bpy
from mathutils import Vector

ROOT = pathlib.Path(__file__).resolve().parents[3]
sys.path.insert(0, str(ROOT / 'scripts/asset-validation'))
from glb import validate_glb

def sha256(path):
    with open(path, 'rb') as f:
        return hashlib.sha256(f.read()).hexdigest()

def write_manifest(asset, glb, budget, extra=None):
    path = ROOT / 'assets/manifests' / f'{asset}.json'
    path.parent.mkdir(parents=True, exist_ok=True)
    verdicts = {'technical': 'NOT_RUN', 'visual': 'NOT_RUN', 'content': 'NOT_RUN', 'provenance': 'NOT_RUN'}
    if path.exists():
        verdicts.update(json.loads(path.read_text()).get('verdicts', {}))
    metrics = validate_glb(glb)
    within = budget is None or metrics['triangles'] <= budget
    verdicts['technical'] = 'PASS' if within else 'FAIL'
    lo, hi = metrics['bounds']['min'], metrics['bounds']['max']
    manifest = {'id': asset, 'triangles': metrics['triangles'], 'budget': budget, 'materials': metrics['materials'],
                'size_m': [round(hi[i] - lo[i], 4) for i in range(3)], 'bounds': metrics['bounds'],
                'sockets': metrics['sockets'], 'pivots': metrics['pivots'], 'animations': metrics['animations'], 'bytes': os.path.getsize(glb),
                'sha256': sha256(glb), 'blender': bpy.app.version_string, 'verdicts': verdicts, **(extra or {})}
    path.write_text(json.dumps(manifest, indent=2) + '\n')
    return manifest

def islands(objs):
    """Groups of parts whose world bounds touch: more than one means something floats."""
    meshes = [o for o in objs if o.type == 'MESH']
    boxes = []
    for o in meshes:
        pts = [o.matrix_world @ Vector(c) for c in o.bound_box]
        boxes.append(([min(p[i] for p in pts) - .002 for i in range(3)], [max(p[i] for p in pts) + .002 for i in range(3)]))
    parent = list(range(len(boxes)))
    def find(i):
        while parent[i] != i:
            parent[i] = parent[parent[i]]
            i = parent[i]
        return i
    for i, (alo, ahi) in enumerate(boxes):
        for j, (blo, bhi) in enumerate(boxes[:i]):
            if all(alo[k] <= bhi[k] and blo[k] <= ahi[k] for k in range(3)):
                parent[find(i)] = find(j)
    groups = {}
    for i, o in enumerate(meshes):
        groups.setdefault(find(i), []).append(o.name)
    if len(groups) > 1:
        print('ISLANDS', sorted(groups.values(), key=len)[:-1])
    return len(groups)

def export_glb(objs, path):
    bpy.ops.object.select_all(action='DESELECT')
    for o in objs:
        o.select_set(True)
    bpy.ops.export_scene.gltf(filepath=path, export_format='GLB', use_selection=True, export_apply=True, export_yup=True)
