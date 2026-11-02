"""One neutral stage for every asset, so views stay comparable."""
import math, os

import bpy
from mathutils import Vector

from .materials import linear

STAGE = '#F4F1F6'
VIEWS = {'front': (0, -1, .03), 'right': (1, 0, .03), 'left': (-1, 0, .03), 'back': (0, 1, .03),
         'top': (0, -.02, 1), 'three-quarter': (-.6, -1, .72)}

def setup():
    scene = bpy.context.scene
    scene.render.engine = 'CYCLES'
    prefs = bpy.context.preferences.addons['cycles'].preferences
    prefs.compute_device_type = 'OPTIX'
    prefs.get_devices()
    optix = [d for d in prefs.devices if d.type == 'OPTIX']
    for d in prefs.devices:
        d.use = d.type == 'OPTIX'
    scene.cycles.device = 'GPU' if optix else 'CPU'
    scene.cycles.use_denoising = True
    scene.view_settings.view_transform, scene.view_settings.look = 'Standard', 'None'
    world = bpy.data.worlds.new('stage')
    world.use_nodes = True
    node = world.node_tree.nodes['Background']
    node.inputs[0].default_value = linear(STAGE)
    node.inputs[1].default_value = .85
    scene.world = world
    data = bpy.data.lights.new('sun', 'SUN')
    data.energy, data.angle, data.color = 1.7, math.radians(32), (1, .96, .9)
    sun = bpy.data.objects.new('sun', data)
    scene.collection.objects.link(sun)
    sun.rotation_euler = (math.radians(50), 0, math.radians(-35))
    floor = bpy.data.materials.new('stage_floor')
    floor.use_nodes = True
    next(n for n in floor.node_tree.nodes if n.type == 'BSDF_PRINCIPLED').inputs['Base Color'].default_value = linear(STAGE)
    mesh = bpy.data.meshes.new('ground')
    mesh.from_pydata([(-200, -200, 0), (200, -200, 0), (200, 200, 0), (-200, 200, 0)], [], [(0, 1, 2, 3)])
    mesh.materials.append(floor)
    scene.collection.objects.link(bpy.data.objects.new('ground', mesh))
    cam_data = bpy.data.cameras.new('cam')
    cam_data.type, cam_data.clip_end = 'ORTHO', 2000
    cam = bpy.data.objects.new('cam', cam_data)
    cam.rotation_mode = 'QUATERNION'
    scene.collection.objects.link(cam)
    scene.camera = cam
    return cam

def shoot(cam, objs, direction, path, size=640, samples=32, margin=1.14):
    scene = bpy.context.scene
    bpy.context.view_layer.update()
    pts = [o.matrix_world @ Vector(c) for o in objs if o.type == 'MESH' for c in o.bound_box]
    centre = sum(pts, Vector()) / len(pts)
    d = Vector(direction).normalized()
    cam.rotation_quaternion = d.to_track_quat('Z', 'Y')
    cam.location = centre + d * 500
    bpy.context.view_layer.update()
    inv = cam.matrix_world.inverted()
    local = [inv @ p for p in pts]
    xs, ys = [p.x for p in local], [p.y for p in local]
    cam.location = cam.matrix_world @ Vector(((min(xs) + max(xs)) / 2, (min(ys) + max(ys)) / 2, 0))
    cam.data.ortho_scale = max(max(xs) - min(xs), max(ys) - min(ys)) * margin
    scene.render.resolution_x = scene.render.resolution_y = size
    scene.cycles.samples = samples
    scene.render.filepath = path
    bpy.ops.render.render(write_still=True)

def views(cam, objs, out):
    layer = bpy.context.view_layer
    for name, direction in VIEWS.items():
        shoot(cam, objs, direction, os.path.join(out, f'{name}.png'))
    neutral = bpy.data.materials.new('neutral')
    neutral.use_nodes = True
    layer.material_override = neutral
    shoot(cam, objs, VIEWS['three-quarter'], os.path.join(out, 'neutral.png'))
    layer.material_override = None
    shoot(cam, objs, VIEWS['three-quarter'], os.path.join(out, 'final.png'), size=1024, samples=64)

def clips(cam, arm, objs, names, out):
    """Two frames of each clip from the side and the front, for deformation review."""
    bpy.context.scene.frame_start = 0
    for name in names:
        action = bpy.data.actions[name]
        arm.animation_data.action = action
        if arm.animation_data.action_slot is None and action.slots:
            arm.animation_data.action_slot = action.slots[0]
        start, end = (int(v) for v in action.frame_range)
        for t, frame in enumerate((start, (start + end) // 2)):
            bpy.context.scene.frame_set(frame)
            for view, direction in (('side', VIEWS['right']), ('front', VIEWS['front'])):
                shoot(cam, objs, direction, os.path.join(out, f'clip-{name}-{t}-{view}.png'), size=420, margin=1.05)
