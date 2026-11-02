"""THROWAWAY SPIKE: inspect Meshy GLBs at contract scale beside the procedural kit.

Run: blender.exe -b --factory-startup -P poc_meshy_walk.py -- <glb-dir> <kit-dir> <output-dir>
"""
import bpy, json, math, os, sys
from mathutils import Vector

GLBS, KIT, OUT = sys.argv[sys.argv.index('--') + 1:][:3]
os.makedirs(OUT, exist_ok=True)
scene = bpy.context.scene
for ob in list(bpy.data.objects):
    bpy.data.objects.remove(ob)

def linear(c):
    return c / 12.92 if c <= .04045 else ((c + .055) / 1.055) ** 2.4

scene.render.engine = 'CYCLES'
prefs = bpy.context.preferences.addons['cycles'].preferences
prefs.compute_device_type = 'OPTIX'
prefs.get_devices()
for d in prefs.devices:
    d.use = d.type == 'OPTIX'
scene.cycles.device = 'GPU'
scene.cycles.samples, scene.cycles.use_denoising = 64, True
scene.view_settings.view_transform, scene.view_settings.look = 'Standard', 'None'
world = bpy.data.worlds.new('w')
world.use_nodes = True
bg = world.node_tree.nodes['Background']
bg.inputs[0].default_value = [linear(v / 255) for v in (0xF4, 0xF1, 0xF6)] + [1]
bg.inputs[1].default_value = .85
scene.world = world
sun_data = bpy.data.lights.new('sun', 'SUN')
sun_data.energy, sun_data.angle = 1.7, math.radians(32)
sun = bpy.data.objects.new('sun', sun_data)
scene.collection.objects.link(sun)
sun.rotation_euler = (math.radians(50), 0, math.radians(-35))
ground_mat = bpy.data.materials.new('ground')
ground_mat.use_nodes = True
next(n for n in ground_mat.node_tree.nodes if n.type == 'BSDF_PRINCIPLED').inputs['Base Color'].default_value = [linear(v / 255) for v in (0xF4, 0xF1, 0xF6)] + [1]
bpy.ops.mesh.primitive_plane_add(size=100)
bpy.context.object.data.materials.append(ground_mat)
cam_data = bpy.data.cameras.new('cam')
cam_data.type = 'ORTHO'
cam_data.clip_end = 1000
cam = bpy.data.objects.new('cam', cam_data)
cam.rotation_mode = 'QUATERNION'
scene.collection.objects.link(cam)
scene.camera = cam

def load(path):
    before = set(bpy.data.objects)
    bpy.ops.import_scene.gltf(filepath=path)
    return list(set(bpy.data.objects) - before)

def extent(objs):
    bpy.context.view_layer.update()
    pts = [o.matrix_world @ Vector(c) for o in objs if o.type == 'MESH' for c in o.bound_box]
    lo = Vector(min(p[i] for p in pts) for i in range(3))
    hi = Vector(max(p[i] for p in pts) for i in range(3))
    return lo, hi

def normalise(objs, axis, target):
    """Scale to the metric contract and put the ground contact at the origin."""
    roots = [o for o in objs if o.parent is None]
    lo, hi = extent(objs)
    k = target / (hi[axis] - lo[axis])
    for r in roots:
        r.scale = r.scale * k
    lo, hi = extent(objs)
    shift = Vector(((lo.x + hi.x) / -2, (lo.y + hi.y) / -2, -lo.z))
    for r in roots:
        r.location += shift
    return k

def shoot(objs, direction, name, size=(900, 900), margin=1.15):
    scene.render.resolution_x, scene.render.resolution_y = size
    lo, hi = extent(objs)
    centre = (lo + hi) / 2
    d = Vector(direction).normalized()
    cam.rotation_quaternion = d.to_track_quat('Z', 'Y')
    cam.location = centre + d * 50
    bpy.context.view_layer.update()
    inv = cam.matrix_world.inverted()
    corners = [inv @ Vector((x, y, z)) for x in (lo.x, hi.x) for y in (lo.y, hi.y) for z in (lo.z, hi.z)]
    w = max(c.x for c in corners) - min(c.x for c in corners)
    h = max(c.y for c in corners) - min(c.y for c in corners)
    cam_data.ortho_scale = max(w, h * size[0] / size[1]) * margin
    scene.render.filepath = os.path.join(OUT, name + '.png')
    bpy.ops.render.render(write_still=True)

objs = load(os.path.join(GLBS, 'student-walk.glb'))
arm = next(o for o in objs if o.type == 'ARMATURE')
action = arm.animation_data.action
start, end = [int(v) for v in action.frame_range]
print('CLIP', action.name, start, end, len(arm.data.bones), scene.render.fps)
frames = [start + round((end - start) * t) for t in (0, .25, .5, .75)]
pts = None
for f in frames:
    scene.frame_set(f)
    bpy.context.view_layer.update()
    deps = bpy.context.evaluated_depsgraph_get()
    mesh = max((o for o in objs if o.type == 'MESH'), key=lambda o: len(o.data.vertices))
    ev = mesh.evaluated_get(deps)
    tmp = ev.to_mesh()
    wp = [ev.matrix_world @ v.co for v in tmp.vertices]
    ev.to_mesh_clear()
    lo = Vector(min(p[i] for p in wp) for i in range(3))
    hi = Vector(max(p[i] for p in wp) for i in range(3))
    print('FRAME', f, [round(v, 3) for v in lo], [round(v, 3) for v in hi])
    size = (700, 700)
    scene.render.resolution_x, scene.render.resolution_y = size
    centre = (lo + hi) / 2
    for view, d in (('side', (1, 0, .05)), ('front', (0, -1, .05))):
        d = Vector(d).normalized()
        cam.rotation_quaternion = d.to_track_quat('Z', 'Y')
        cam.location = centre + d * 50
        cam_data.ortho_scale = (hi - lo).length * .95
        scene.render.filepath = os.path.join(OUT, f'walk-{view}-{f:03d}.png')
        bpy.ops.render.render(write_still=True)
print('POC_DONE')
