"""Characters: reduced Meshy meshes on a shared skeleton, with locally authored clips."""
import json, math, pathlib

import bmesh
import bpy
from mathutils import Matrix, Vector

from gg import geometry
from gg.sockets import register

ROOT = pathlib.Path(__file__).resolve().parents[3]
C = json.loads((ROOT / 'world/constants.json').read_text())
TARGET_TRIANGLES = 5800
X, Y, Z = Vector((1, 0, 0)), Vector((0, 1, 0)), Vector((0, 0, 1))
PARENTS_FIRST = ('Hips', 'Spine02', 'Spine01', 'Spine', 'neck', 'Head', 'LeftArm', 'LeftForeArm', 'LeftHand', 'RightArm',
                 'RightForeArm', 'RightHand', 'LeftUpLeg', 'LeftLeg', 'LeftFoot', 'RightUpLeg', 'RightLeg', 'RightFoot')
ARMS_DOWN = {'LeftArm': [(Y, 74)], 'RightArm': [(Y, -74)]}

def pose(arm, turns, lift=0):
    """Pose from world-axis turns in degrees, so clips do not depend on each bone's roll."""
    for bone in arm.pose.bones:
        bone.rotation_mode = 'QUATERNION'
        bone.rotation_quaternion = (1, 0, 0, 0)
        bone.location = (0, 0, 0)
    bpy.context.view_layer.update()
    hips = arm.pose.bones['Hips']
    if lift:
        hips.matrix = Matrix.Translation((0, 0, lift)) @ hips.matrix
        bpy.context.view_layer.update()
    for name in PARENTS_FIRST:
        for axis, degrees in turns.get(name, ()):
            bone = arm.pose.bones[name]
            at = Matrix.Translation(bone.matrix.translation)
            bone.matrix = at @ Matrix.Rotation(math.radians(degrees), 4, axis) @ at.inverted() @ bone.matrix
            bpy.context.view_layer.update()

def clip(arm, name, keys):
    action = bpy.data.actions.new(name)
    arm.animation_data.action = action
    for frame, turns, lift in keys:
        pose(arm, turns, lift)
        for bone in arm.pose.bones:
            if bone.name in PARENTS_FIRST:
                bone.keyframe_insert('rotation_quaternion', frame=frame)
            if bone.name == 'Hips':
                bone.keyframe_insert('location', frame=frame)
    return action

def merged(*poses):
    out = {}
    for p in poses:
        for k, v in p.items():
            out.setdefault(k, []).extend(v)
    return out

SIT_LEGS = {f'{s}UpLeg': [(X, -45)] for s in ('Left', 'Right')} | {f'{s}Leg': [(X, 24)] for s in ('Left', 'Right')} | {f'{s}Foot': [(X, 21)] for s in ('Left', 'Right')}
FOREARMS = {'LeftForeArm': [(X, -78)], 'RightForeArm': [(X, -78)]}

def author_clips(arm):
    clip(arm, 'idle', [(1, merged(ARMS_DOWN, {'Spine': [(X, 0)]}), 0), (25, merged(ARMS_DOWN, {'Spine': [(X, 2)], 'Head': [(X, -2)]}), -.3), (49, merged(ARMS_DOWN, {'Spine': [(X, 0)]}), 0)])
    tap_a = {'LeftHand': [(X, 10)], 'RightHand': [(X, -8)], 'Head': [(X, 6)]}
    tap_b = {'LeftHand': [(X, -8)], 'RightHand': [(X, 10)], 'Head': [(X, 4)]}
    clip(arm, 'interact', [(1, merged(ARMS_DOWN, FOREARMS, tap_a), 0), (13, merged(ARMS_DOWN, FOREARMS, tap_b), 0), (25, merged(ARMS_DOWN, FOREARMS, tap_a), 0)])
    seated = merged(ARMS_DOWN, FOREARMS, SIT_LEGS, tap_a)
    clip(arm, 'sit', [(1, seated, -9), (25, merged(ARMS_DOWN, FOREARMS, SIT_LEGS, tap_b), -9), (49, seated, -9)])

def height_at_rest(arm, mesh):
    arm.data.pose_position = 'REST'
    bpy.context.view_layer.update()
    evaluated = mesh.evaluated_get(bpy.context.evaluated_depsgraph_get())
    data = evaluated.to_mesh()
    heights = [(evaluated.matrix_world @ v.co).z for v in data.vertices]
    evaluated.to_mesh_clear()
    arm.data.pose_position = 'POSE'
    return max(heights) - min(heights), min(heights)

def bake_reduced(arm, mesh, triangles, target):
    """Reduce, unwrap afresh and bake colour from the original.

    Decimating alone tears the texture across UV seams, so the old UVs are never reused.
    """
    scene = bpy.context.scene
    engine, samples = scene.render.engine, scene.cycles.samples
    scene.render.engine, scene.cycles.samples = 'CYCLES', 16
    arm.data.pose_position = 'REST'
    high = mesh.copy()
    high.data = mesh.data.copy()
    mesh.users_collection[0].objects.link(high)
    view = bpy.context.view_layer
    view.objects.active = mesh
    # Meshy splits vertices along UV seams; welding first stops reduction opening them as cracks.
    sealed = bmesh.new()
    sealed.from_mesh(mesh.data)
    extent = max(v.co.z for v in sealed.verts) - min(v.co.z for v in sealed.verts)
    bmesh.ops.remove_doubles(sealed, verts=sealed.verts, dist=extent * .0004)
    sealed.to_mesh(mesh.data)
    sealed.free()
    print('WELDED', len(high.data.vertices), '->', len(mesh.data.vertices))
    for name in ('custom_normal', 'sharp_face', 'sharp_edge'):
        if name in mesh.data.attributes:
            mesh.data.attributes.remove(mesh.data.attributes[name])
    reduce = mesh.modifiers.new('reduce', 'DECIMATE')
    reduce.ratio = target / triangles
    mesh.modifiers.move(len(mesh.modifiers) - 1, 0)
    with bpy.context.temp_override(object=mesh, active_object=mesh):
        bpy.ops.object.modifier_apply(modifier='reduce')
    data = mesh.data
    data.polygons.foreach_set('use_smooth', [True] * len(data.polygons))
    data.update()
    old_uv = data.uv_layers.active.name
    data.uv_layers.active = data.uv_layers.new(name='baked')
    bpy.ops.object.select_all(action='DESELECT')
    mesh.select_set(True)
    bpy.ops.object.mode_set(mode='EDIT')
    bpy.ops.mesh.select_all(action='SELECT')
    bpy.ops.uv.smart_project(angle_limit=math.radians(60), island_margin=.015)
    bpy.ops.object.mode_set(mode='OBJECT')
    baked = bpy.data.images.new('student_base_color', 1024, 1024)
    material = data.materials[0].copy()
    data.materials[0] = material
    principled = next(n for n in material.node_tree.nodes if n.type == 'BSDF_PRINCIPLED')
    target = material.node_tree.nodes.new('ShaderNodeTexImage')
    target.image = baked
    material.node_tree.nodes.active = target
    high.select_set(True)
    mesh.select_set(True)
    view.objects.active = mesh
    bpy.ops.object.bake(type='DIFFUSE', pass_filter={'COLOR'}, use_selected_to_active=True,
                        cage_extrusion=.03, max_ray_distance=.08, margin=8)
    baked.pack()
    material.node_tree.links.new(target.outputs['Color'], principled.inputs['Base Color'])
    for node in [n for n in material.node_tree.nodes if n.type == 'TEX_IMAGE' and n.image != baked]:
        material.node_tree.nodes.remove(node)
    data.uv_layers.remove(data.uv_layers[old_uv])
    bpy.data.objects.remove(high)
    arm.data.pose_position = 'POSE'
    scene.render.engine, scene.cycles.samples = engine, samples

@register('char-student-primary', budget=6000)
def student_primary():
    return student(TARGET_TRIANGLES)

@register('char-student-primary-lod1', budget=1500)
def student_lod():
    return student(1400)

def student(target):
    source = ROOT / 'assets/sources/meshy/poc/student-walk.glb'
    before = set(bpy.data.objects)
    bpy.ops.import_scene.gltf(filepath=str(source))
    imported = set(bpy.data.objects) - before
    arm = next(o for o in imported if o.type == 'ARMATURE')
    mesh = max((o for o in imported if o.type == 'MESH'), key=lambda o: len(o.data.vertices))
    b = geometry.current()
    for o in imported:
        if o in (arm, mesh):
            for coll in list(o.users_collection):
                coll.objects.unlink(o)
            b.coll.objects.link(o)
        else:
            bpy.data.objects.remove(o)
    arm.parent = b.root
    triangles = sum(len(p.vertices) - 2 for p in mesh.data.polygons)
    bake_reduced(arm, mesh, triangles, target)
    height, floor = height_at_rest(arm, mesh)
    arm.scale = arm.scale * (C['studentHeight'] / height)
    bpy.context.view_layer.update()
    arm.location.z -= height_at_rest(arm, mesh)[1]
    walk = arm.animation_data.action
    walk.name = 'walk'
    author_clips(arm)
    arm.animation_data.action = walk
    return {'source': 'assets/sources/meshy/poc/PROVENANCE.json', 'source_triangles': triangles, 'clips': ['idle', 'walk', 'sit', 'interact'], 'armature': arm.name}
