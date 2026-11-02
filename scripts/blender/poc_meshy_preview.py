"""THROWAWAY SPIKE: inspect Meshy GLBs at contract scale beside the procedural kit.

Run: blender.exe -b --factory-startup -P poc_meshy_preview.py -- <glb-dir> <kit-dir> <output-dir>
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

VIEWS = {'front': (0, -1, .05), 'right': (1, 0, .05), 'back': (0, 1, .05), 'three-quarter': (-.6, -1, .72)}
report = {}
for asset, axis, target in (('student', 2, 1.35), ('rover', 1, .30)):
    objs = load(os.path.join(GLBS, asset + '.glb'))
    k = normalise(objs, axis, target)
    tris = sum(len(p.vertices) - 2 for o in objs if o.type == 'MESH' for p in o.data.polygons)
    lo, hi = extent(objs)
    report[asset] = {'triangles': tris, 'scale_applied': round(k, 5), 'size_m': [round(v, 3) for v in hi - lo],
                     'materials': sorted({m.name for o in objs if o.type == 'MESH' for m in o.data.materials})}
    for view, direction in VIEWS.items():
        shoot(objs, direction, f'{asset}-{view}')
    for o in objs:
        bpy.data.objects.remove(o)

# Side by side at true scale with the procedural stand-ins and kit pieces.
line = []
x = 0
for path, target in ((os.path.join(GLBS, 'student.glb'), 1.35), (os.path.join(KIT, 'char-student-primary-standin.glb'), None),
                     (os.path.join(KIT, 'furn-chair-orange.glb'), None), (os.path.join(KIT, 'furn-table-four.glb'), None),
                     (os.path.join(GLBS, 'rover.glb'), .30), (os.path.join(KIT, 'veg-planter.glb'), None)):
    objs = load(path)
    if target:
        normalise(objs, 2 if target > 1 else 1, target)
    lo, hi = extent(objs)
    for r in (o for o in objs if o.parent is None):
        r.location.x += x - lo.x
        r.location.z -= lo.z
    x += hi.x - lo.x + .3
    line += objs
shoot(line, (-.35, -1, .5), 'lineup', size=(1500, 800), margin=1.08)
with open(os.path.join(OUT, 'report.json'), 'w') as f:
    json.dump(report, f, indent=2)
print('POC_DONE')
