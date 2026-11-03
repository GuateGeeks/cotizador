"""Materials generated from world/materials.json, so Blender and the web cannot drift."""
import json, pathlib

import bpy

ROOT = pathlib.Path(__file__).resolve().parents[3]
SPEC = json.loads((ROOT / 'world/materials.json').read_text())

def linear(hexa):
    rgb = [int(hexa[i:i + 2], 16) / 255 for i in (1, 3, 5)]
    return [c / 12.92 if c <= .04045 else ((c + .055) / 1.055) ** 2.4 for c in rgb] + [1]

def gg_material(name):
    found = bpy.data.materials.get(name)
    if found:
        return found
    spec = SPEC[name]
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    p = next(n for n in m.node_tree.nodes if n.type == 'BSDF_PRINCIPLED')
    p.inputs['Base Color'].default_value = linear(spec['color'])
    p.inputs['Roughness'].default_value = spec['roughness']
    p.inputs['Metallic'].default_value = 0
    p.inputs['Coat Weight'].default_value = spec.get('coat', 0)
    p.inputs['Coat Roughness'].default_value = .35
    if 'emissive' in spec:
        p.inputs['Emission Color'].default_value = linear(spec['color'])
        p.inputs['Emission Strength'].default_value = spec['emissive']
    if spec.get('vertexColors'):
        # Kit robots: one material, each part's colour carried by the mesh's colour attribute.
        colours = m.node_tree.nodes.new('ShaderNodeVertexColor')
        m.node_tree.links.new(colours.outputs['Color'], p.inputs['Base Color'])
    if 'alpha' in spec:
        p.inputs['Alpha'].default_value = spec['alpha']
        m.surface_render_method = 'BLENDED'
    return m
