"""Headless entry point: blender -b --factory-startup -P entry.py -- <command> ..."""
import json, os, sys

import bpy

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
sys.dont_write_bytecode = True
from gg import export, geometry, materials, preview
from gg.sockets import ASSETS
import assets  # noqa: F401  registers generators

def clear():
    for ob in list(bpy.data.objects):
        bpy.data.objects.remove(ob)

def check(path):
    report = {'materials': {}}
    for name in materials.SPEC:
        m = materials.gg_material(name)
        shaders = [n for n in m.node_tree.nodes if n.type == 'BSDF_PRINCIPLED']
        report['materials'][name] = {'nodes': len(shaders), 'roughness': shaders[0].inputs['Roughness'].default_value,
                                     'metallic': shaders[0].inputs['Metallic'].default_value}
    b = geometry.begin('check')
    ob = geometry.box('part', (1, 1, 1), (0, 0, 0), 'GG_IvorySoft')
    report['degenerate'] = sum(1 for p in ob.data.polygons if p.area < 1e-9)
    ob.data.calc_loop_triangles()
    report['box_triangles'] = len(ob.data.loop_triangles)
    with open(path, 'w') as f:
        json.dump(report, f)

def build(asset, out, render=True):
    builder, budget = ASSETS[asset]
    clear()
    cam = preview.setup() if render else None
    b = geometry.begin(asset)
    extra = builder() or {}
    bpy.context.view_layer.update()
    objs = [o for o in b.coll.objects if o.type in ('MESH', 'EMPTY', 'ARMATURE')]
    os.makedirs(out, exist_ok=True)
    glb = os.path.join(out, f'{asset}.glb')
    export.export_glb(objs, glb)
    bpy.ops.wm.save_as_mainfile(filepath=os.path.join(out, f'{asset}.blend'))
    extra['islands'] = export.islands(objs)
    manifest = export.write_manifest(asset, glb, budget, extra)
    if render:
        previews = os.path.join(out, asset)
        os.makedirs(previews, exist_ok=True)
        preview.views(cam, objs, previews)
    print(asset, manifest['triangles'], manifest['size_m'])

args = sys.argv[sys.argv.index('--') + 1:]
if args[0] == 'check':
    check(args[1])
elif args[0] == 'build':
    build(args[1], args[2], '--no-preview' not in args)
print('GG_DONE')
