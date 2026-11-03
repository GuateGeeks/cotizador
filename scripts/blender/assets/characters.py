"""Characters: reduced Meshy meshes on a shared skeleton, with locally authored clips."""
import json, math, pathlib

import bmesh
import bpy
import numpy
from mathutils import Matrix, Vector, interpolate
from mathutils.bvhtree import BVHTree

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
    # Using VR: controllers held in front, the head looks around while one hand and then the other reaches,
    # then both arms sweep out. Arms stay below the shoulders so the controllers never cross the headset.
    # Both hands in front of the chest, palms up round something flat; the roll is split between forearm and hand so
    # the wrist does not pinch. The hands tap in turn, as thumbs on a remote would.
    level = {'LeftArm': [(X, -40), (Z, -30)], 'RightArm': [(X, -40), (Z, 30)],
             'LeftForeArm': [(X, -100), (Y, 45), (Z, -85)], 'RightForeArm': [(X, -100), (Y, -45), (Z, 85)],
             'LeftHand': [(Y, 45), (X, 30)], 'RightHand': [(Y, -45), (X, 30)]}
    cupped = merged(ARMS_DOWN, level)
    clip(arm, 'hold', [(1, cupped, 0), (13, merged(cupped, {'LeftHand': [(X, 8)]}), 0), (25, cupped, 0),
                       (37, merged(cupped, {'RightHand': [(X, 8)]}), 0), (49, cupped, 0)])
    holding = merged(ARMS_DOWN, {'LeftForeArm': [(X, -60)], 'RightForeArm': [(X, -60)]})
    clip(arm, 'vr', [(1, holding, 0),
                     (19, merged(holding, {'Head': [(Z, 35)], 'RightArm': [(X, -40)]}), 0),
                     (37, merged(holding, {'Head': [(Z, -35), (X, 8)], 'LeftArm': [(X, -40)]}), 0),
                     (55, merged(holding, {'Head': [(X, -6)], 'LeftArm': [(Y, -35)], 'RightArm': [(Y, 35)]}), -.3),
                     (73, holding, 0)])

def rest_vertices(arm, mesh, groups):
    """World positions at rest of the vertices whose strongest weight is one of the named bones."""
    arm.data.pose_position = 'REST'
    bpy.context.view_layer.update()
    index = {g.index for g in mesh.vertex_groups if g.name in groups}
    evaluated = mesh.evaluated_get(bpy.context.evaluated_depsgraph_get())
    data = evaluated.to_mesh()
    points = [evaluated.matrix_world @ data.vertices[v.index].co for v in mesh.data.vertices
              if v.groups and max(v.groups, key=lambda g: g.weight).group in index]
    evaluated.to_mesh_clear()
    return points

def fitting_point(arm, bone, name, at, scale):
    """An empty riding on a bone; its world scale sizes gear authored for the reference size."""
    empty = bpy.data.objects.new(name, None)
    geometry.current().coll.objects.link(empty)
    empty.parent, empty.parent_type, empty.parent_bone = arm, 'BONE', bone
    bpy.context.view_layer.update()
    empty.matrix_world = Matrix.Translation(at) @ Matrix.Scale(scale, 4)
    return empty

def add_fitting(arm, mesh):
    """Points where VR gear goes: over the eyes, and in each palm."""
    head = rest_vertices(arm, mesh, {'Head', 'head_end', 'headfront'})
    low, high = min(p.z for p in head), max(p.z for p in head)
    eye = low + (high - low) * .45
    face = [p for p in head if abs(p.z - eye) < .02]
    centre = (min(p.x for p in head) + max(p.x for p in head)) / 2
    fitting_point(arm, 'Head', 'vr_eyes', Vector((centre, min(p.y for p in face), eye)),
                  (max(p.x for p in head) - min(p.x for p in head)) / .2 * .95)
    grips = {}
    for side, bone in (('l', 'LeftHand'), ('r', 'RightHand')):
        hand = rest_vertices(arm, mesh, {bone})
        span = max(max(p[i] for p in hand) - min(p[i] for p in hand) for i in range(3))
        grips[side] = fitting_point(arm, bone, f'vr_grip_{side}', sum(hand, Vector()) / len(hand), span / .14)
    arm.data.pose_position = 'POSE'
    bpy.context.view_layer.update()
    return grips

HAND_CLIPS = ('idle', 'sit', 'interact', 'vr', 'hold')

def gltf(v):
    return [round(v.x, 4), round(v.z, 4), round(-v.y, 4)]

def palm_axes(arm, mesh):
    """Each palm's normal and thumb side in its hand bone's frame. A hand is flat, so the normal is the direction its
    rest vertices spread least along; the T-pose has the palms down, which picks the sign. The bone's own roll does
    not follow the palm on these rigs."""
    axes = {}
    for bone in ('LeftHand', 'RightHand'):
        points = numpy.array([tuple(p) for p in rest_vertices(arm, mesh, {bone})])
        flat = numpy.linalg.eigh(numpy.cov((points - points.mean(0)).T))[1][:, 0]
        normal = Vector(flat).normalized()
        if normal.z > 0:
            normal = -normal
        if normal.z > -.8:
            raise RuntimeError(f'{bone}: the palm is not facing down at rest: {tuple(normal)}')
        frame = (arm.matrix_world @ arm.data.bones[bone].matrix_local).to_3x3()
        # The thumb side: across the palm and the fingers, forward (-y) in the T-pose. An upright handle in a fist
        # runs along it.
        thumb = normal.cross((frame @ Vector((0, 1, 0))).normalized()).normalized()
        if thumb.y > 0:
            thumb = -thumb
        axes[bone] = {'palm': (frame.inverted() @ normal).normalized(), 'thumb': (frame.inverted() @ thumb).normalized()}
    return axes

def hand_poses(arm, mesh, grips, clips=HAND_CLIPS, frames=(1, 13)):
    """Where both grips are and which way the palms and thumbs face, per clip, in glTF axes."""
    axes, scene, keep = palm_axes(arm, mesh), bpy.context.scene, arm.animation_data.action
    arm.data.pose_position = 'POSE'
    out = {}
    for name in clips:
        action = bpy.data.actions[name]
        arm.animation_data.action = action
        if arm.animation_data.action_slot is None and action.slots:
            arm.animation_data.action_slot = action.slots[0]
        out[name] = []
        for frame in frames:
            scene.frame_set(frame)
            bpy.context.view_layer.update()
            sample = {'frame': frame}
            for side, bone in (('l', 'LeftHand'), ('r', 'RightHand')):
                sample[f'grip_{side}'] = gltf(grips[side].matrix_world.translation)
                posed = (arm.matrix_world @ arm.pose.bones[bone].matrix).to_3x3()
                for key, axis in axes[bone].items():
                    sample[f'{key}_{side}'] = gltf((posed @ axis).normalized())
            out[name].append(sample)
    arm.animation_data.action = keep
    if arm.animation_data.action_slot is None and keep.slots:
        arm.animation_data.action_slot = keep.slots[0]
    scene.frame_set(1)
    return out

def height_at_rest(arm, mesh):
    arm.data.pose_position = 'REST'
    bpy.context.view_layer.update()
    evaluated = mesh.evaluated_get(bpy.context.evaluated_depsgraph_get())
    data = evaluated.to_mesh()
    heights = [(evaluated.matrix_world @ v.co).z for v in data.vertices]
    evaluated.to_mesh_clear()
    arm.data.pose_position = 'POSE'
    return max(heights) - min(heights), min(heights)

def weld(bm):
    # Meshy splits vertices along UV seams; welding first stops reduction opening them as cracks.
    extent = max(v.co.z for v in bm.verts) - min(v.co.z for v in bm.verts)
    bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=extent * .0004)

def loose_parts(bm):
    """Faces grouped into loose parts, largest first."""
    bm.faces.ensure_lookup_table()
    seen, parts = set(), []
    for face in bm.faces:
        if face.index in seen:
            continue
        seen.add(face.index)
        part, stack = [], [face]
        while stack:
            f = stack.pop()
            part.append(f)
            for e in f.edges:
                for g in e.link_faces:
                    if g.index not in seen:
                        seen.add(g.index)
                        stack.append(g)
        parts.append(part)
    return sorted(parts, key=len, reverse=True)

def drop_hidden_parts(bm):
    """Delete loose parts enclosed by the main surface and return how many there were.

    Meshy can leave fragments of an inner layer (the teacher's shirt under the vest); nothing sees them,
    but the bake's rays hit them and paint their colour onto the surface above.
    """
    parts = loose_parts(bm)
    tree = BVHTree.FromPolygons([v.co for v in bm.verts], [[v.index for v in f.verts] for f in parts[0]])
    ray = Vector((1, .013, .007)).normalized()
    def inside(part):
        at, crossings = sum((f.calc_center_median() for f in part), Vector()) / len(part), 0
        while (hit := tree.ray_cast(at, ray))[0] is not None:
            crossings, at = crossings + 1, hit[0] + ray * 1e-5
        return crossings % 2 == 1
    hidden = [part for part in parts[1:] if inside(part)]
    bmesh.ops.delete(bm, geom=[f for part in hidden for f in part], context='FACES')
    return len(hidden)

def shell_bmesh(ob):
    """The object's welded surface in world space, split into its loose parts, largest first."""
    bm = bmesh.new()
    bm.from_mesh(ob.evaluated_get(bpy.context.evaluated_depsgraph_get()).to_mesh())
    bm.transform(ob.matrix_world)
    weld(bm)
    return bm, loose_parts(bm)

def pixels(image):
    values = numpy.empty(image.size[0] * image.size[1] * 4, numpy.float32)
    image.pixels.foreach_get(values)
    return values.reshape(image.size[1], image.size[0], 4)

def sample(texels, uv):
    h, w = texels.shape[:2]
    return texels[min(int(uv.y % 1 * h), h - 1), min(int(uv.x % 1 * w), w - 1), :3]

class Surface:
    """The visible source surface: the colour of its nearest point to any position."""

    def __init__(self, high, source):
        self.bm, parts = shell_bmesh(high)
        self.faces = parts[0]
        self.uv = self.bm.loops.layers.uv.active
        self.tree = BVHTree.FromPolygons([v.co for v in self.bm.verts], [[v.index for v in f.verts] for f in self.faces])
        self.texels = pixels(source)

    def colour(self, point):
        face = self.faces[self.tree.find_nearest(point)[2]]
        weights = interpolate.poly_3d_calc([v.co for v in face.verts], point)
        return sample(self.texels, sum((l[self.uv].uv * w for l, w in zip(face.loops, weights)), Vector((0, 0))))

def reduced_mesh(mesh):
    low = mesh.evaluated_get(bpy.context.evaluated_depsgraph_get()).to_mesh()
    return low, low.uv_layers['baked'].data

def bake_mismatch(mesh, image, surface):
    """Share of the reduced surface whose baked colour matches no visible source colour under it.

    A face is checked against the source at its centre and its corners, so one that straddles a colour
    border may take either colour; what counts is colour that appears nowhere nearby.
    """
    baked = pixels(image)
    low, uv = reduced_mesh(mesh)
    wrong = 0
    for p in low.polygons:
        at = sum((uv[i].uv for i in p.loop_indices), Vector((0, 0))) / p.loop_total
        points = [mesh.matrix_world @ p.center] + [mesh.matrix_world @ low.vertices[i].co for i in p.vertices]
        colour = sample(baked, at)
        wrong += min(numpy.abs(colour - surface.colour(q)).max() for q in points) > .2
    return round(wrong / len(low.polygons), 4)

def edge_distance(corners, points):
    """Distance from each point to the nearest edge of a 2D triangle."""
    best = numpy.full(len(points), numpy.inf)
    for a, b in ((corners[0], corners[1]), (corners[1], corners[2]), (corners[2], corners[0])):
        t = numpy.clip(((points - a) @ (b - a)) / max((b - a) @ (b - a), 1e-12), 0, 1)
        best = numpy.minimum(best, numpy.linalg.norm(points - (a + t[:, None] * (b - a)), axis=1))
    return best

def pad(texels, steps):
    """Spread colour into uncoloured texels around it, as the bake's margin does, so filtering never reaches black."""
    for _ in range(steps):
        empty = texels[..., 3] < .5
        if not empty.any():
            return
        total, count = numpy.zeros(texels.shape[:2] + (3,), numpy.float32), numpy.zeros(texels.shape[:2], numpy.float32)
        for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            shifted = numpy.roll(texels, (dy, dx), (0, 1))
            have = shifted[..., 3] >= .5
            total += shifted[..., :3] * have[..., None]
            count += have
        grow = empty & (count > 0)
        texels[grow, :3] = total[grow] / count[grow, None]
        texels[grow, 3] = 1

def fill_gaps(mesh, image, surface):
    """Colour the texels inside faces that the bake's rays never reached, from the nearest visible source.

    Where a long thin face of a coarse reduction cuts across a curve (the top of the head, the chest), its
    middle lies too far from the original for any ray to land, and those texels stayed black.
    Returns the share of faces that needed it.
    """
    texels = pixels(image)
    # Alpha is the share of a texel's rays that hit. Misses darken its colour, so a mostly hit texel is
    # divided back to full strength; the rest count as missed.
    alpha = texels[..., 3]
    partial = (alpha >= .5) & (alpha < 1)
    texels[partial, :3] /= alpha[partial, None]
    texels[partial, 3] = 1
    h, w = texels.shape[:2]
    low, uv = reduced_mesh(mesh)
    low.calc_loop_triangles()
    filled = set()
    for tri in low.loop_triangles:
        corners = numpy.array([uv[i].uv for i in tri.loops]) * (w, h)
        span = numpy.array([corners[1] - corners[0], corners[2] - corners[0]]).T
        if abs(numpy.linalg.det(span)) < 1e-9:
            continue
        (x0, y0), (x1, y1) = numpy.floor(corners.min(0)).astype(int) - 1, numpy.ceil(corners.max(0)).astype(int) + 1
        xs, ys = numpy.meshgrid(numpy.arange(max(x0, 0), min(x1, w - 1) + 1), numpy.arange(max(y0, 0), min(y1, h - 1) + 1))
        cells = numpy.stack([xs.ravel(), ys.ravel()], 1)
        centres = cells + .5
        along = numpy.linalg.solve(span, (centres - corners[0]).T).T
        weights = numpy.column_stack([1 - along.sum(1), along])
        # Blender counts a texel as the face's when the face touches it, even a face thinner than a texel;
        # so does this, by taking centres within half a texel diagonal of the face.
        near = (weights >= -1e-4).all(1) | (edge_distance(corners, centres) <= .71)
        cells, weights = cells[near], numpy.clip(weights[near], 0, None)
        weights /= weights.sum(1, keepdims=True)
        missed = texels[cells[:, 1], cells[:, 0], 3] < .5
        if not missed.any():
            continue
        points = [mesh.matrix_world @ low.vertices[v].co for v in tri.vertices]
        for (x, y), weight in zip(cells[missed], weights[missed]):
            texels[y, x, :3] = surface.colour(sum((q * float(k) for q, k in zip(points, weight)), Vector()))
            texels[y, x, 3] = 1
        filled.add(tri.polygon_index)
    if filled:
        pad(texels, 16)
    image.pixels.foreach_set(texels.ravel())
    return round(len(filled) / len(low.polygons), 4)

def bake_gaps(mesh, image):
    """Share of the reduced faces whose centre no colour reached, then mark every texel opaque."""
    texels = pixels(image)
    uv = mesh.data.uv_layers['baked'].data
    missed = sum(sample(numpy.dstack([texels[..., 3]] * 3), sum((uv[i].uv for i in p.loop_indices), Vector((0, 0))) / p.loop_total)[0] < .5
                 for p in mesh.data.polygons)
    texels[..., 3] = 1
    image.pixels.foreach_set(texels.ravel())
    return round(missed / len(mesh.data.polygons), 4)

def bake_reduced(arm, mesh, target):
    """Reduce, unwrap afresh and bake colour from the original.

    Decimating alone tears the texture across UV seams, so the old UVs are never reused.
    """
    scene = bpy.context.scene
    engine, samples = scene.render.engine, scene.cycles.samples
    scene.render.engine, scene.cycles.samples = 'CYCLES', 16
    arm.data.pose_position = 'REST'
    sealed = bmesh.new()
    sealed.from_mesh(mesh.data)
    before = len(sealed.verts)
    weld(sealed)
    hidden = drop_hidden_parts(sealed)
    sealed.to_mesh(mesh.data)
    sealed.free()
    print('WELDED', before, '->', len(mesh.data.vertices), 'hidden parts', hidden)
    high = mesh.copy()
    high.data = mesh.data.copy()
    mesh.users_collection[0].objects.link(high)
    view = bpy.context.view_layer
    view.objects.active = mesh
    for name in ('custom_normal', 'sharp_face', 'sharp_edge'):
        if name in mesh.data.attributes:
            mesh.data.attributes.remove(mesh.data.attributes[name])
    reduce = mesh.modifiers.new('reduce', 'DECIMATE')
    reduce.ratio = target / sum(len(p.vertices) - 2 for p in mesh.data.polygons)
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
    # Texels start transparent so the ones the bake never reaches can be counted.
    baked = bpy.data.images.new('student_base_color', 1024, 1024, alpha=True)
    baked.generated_color = (0, 0, 0, 0)
    material = data.materials[0].copy()
    data.materials[0] = material
    principled = next(n for n in material.node_tree.nodes if n.type == 'BSDF_PRINCIPLED')
    source = next(n.image for n in material.node_tree.nodes if n.type == 'TEX_IMAGE')
    target = material.node_tree.nodes.new('ShaderNodeTexImage')
    target.image = baked
    material.node_tree.nodes.active = target
    high.select_set(True)
    mesh.select_set(True)
    view.objects.active = mesh
    bpy.ops.object.bake(type='DIFFUSE', pass_filter={'COLOR'}, use_selected_to_active=True,
                        cage_extrusion=.06, max_ray_distance=.16, margin=16)
    surface = Surface(high, source)
    filled = fill_gaps(mesh, baked, surface)
    gaps = bake_gaps(mesh, baked)
    baked.pack()
    material.node_tree.links.new(target.outputs['Color'], principled.inputs['Base Color'])
    for node in [n for n in material.node_tree.nodes if n.type == 'TEX_IMAGE' and n.image != baked]:
        material.node_tree.nodes.remove(node)
    mismatch = bake_mismatch(mesh, baked, surface)
    surface.bm.free()
    data.uv_layers.remove(data.uv_layers[old_uv])
    bpy.data.objects.remove(high)
    arm.data.pose_position = 'POSE'
    scene.render.engine, scene.cycles.samples = engine, samples
    return {'bake_mismatch': mismatch, 'bake_gaps': gaps, 'bake_filled': filled, 'hidden_parts': hidden}

PRIMARY = 'assets/sources/meshy/poc/student-walk.glb'
VARIANTS = {
    'char-student-primary': (PRIMARY, C['studentHeight'], 'assets/sources/meshy/poc/PROVENANCE.json'),
    'char-student-pre': ('assets/sources/meshy/variants/pre-walk.glb', 1.1, None),
    'char-student-primary-boy': ('assets/sources/meshy/variants/boy-walk.glb', 1.35, None),
    'char-student-basico': ('assets/sources/meshy/variants/basico-walk.glb', 1.5, None),
    'char-student-bach': ('assets/sources/meshy/variants/bach-walk.glb', 1.58, None),
    'char-teacher': ('assets/sources/meshy/variants/teacher-walk.glb', 1.75, None),
}

for _asset, (_source, _height, _record) in VARIANTS.items():
    register(_asset, budget=6000)(lambda s=_source, h=_height, r=_record: student(TARGET_TRIANGLES, s, h, r))
    register(f'{_asset}-lod1', budget=1500)(lambda s=_source, h=_height, r=_record: student(1400, s, h, r))

def student(target, source, target_height, record):
    source = ROOT / source
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
    bake = bake_reduced(arm, mesh, target)
    height, floor = height_at_rest(arm, mesh)
    arm.scale = arm.scale * (target_height / height)
    bpy.context.view_layer.update()
    arm.location.z -= height_at_rest(arm, mesh)[1]
    walk = arm.animation_data.action
    walk.name = 'walk'
    author_clips(arm)
    arm.animation_data.action = walk
    grips = add_fitting(arm, mesh)
    hands = hand_poses(arm, mesh, grips)
    return {'source': record or 'assets/sources/meshy/variants/PROVENANCE.json', 'source_triangles': triangles, **bake, 'clips': ['idle', 'walk', 'sit', 'interact', 'vr', 'hold'], 'armature': arm.name, 'hand_poses': hands}
