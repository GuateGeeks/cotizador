"""Modelling primitives. Every part is a rounded mesh parented to the current Build root."""
import bmesh, bpy, math, random
from mathutils import Matrix, Vector

from .materials import gg_material

class Build:
    def __init__(self, name):
        self.coll = bpy.data.collections.new(name)
        bpy.context.scene.collection.children.link(self.coll)
        self.root = self.empty(name, None)
        self.sockets = {}
    def empty(self, name, parent, loc=(0, 0, 0)):
        e = bpy.data.objects.new(name, None)
        e.location = loc
        e.parent = parent
        self.coll.objects.link(e)
        return e
    def socket(self, name, loc):
        self.sockets[name] = self.empty(f'socket_{name}', self.root, loc)

G = None

def begin(name):
    global G
    G = Build(name)
    return G

def current():
    return G

def finish(bm, name, mat, loc, rot=(0, 0, 0), weighted=True):
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    me = bpy.data.meshes.new(name)
    bm.to_mesh(me)
    bm.free()
    for poly in me.polygons:
        poly.use_smooth = True
    me.materials.append(gg_material(mat))
    ob = bpy.data.objects.new(name, me)
    G.coll.objects.link(ob)
    ob.parent = G.root
    ob.location = loc
    ob.rotation_euler = rot
    if weighted:  # keeps flat faces flat while the bevels stay soft
        ob.modifiers.new('wn', 'WEIGHTED_NORMAL').keep_sharp = False
    return ob

def bevel(bm, edges, r, seg):
    if edges and r > 0:
        bmesh.ops.bevel(bm, geom=edges, offset=r, offset_type='OFFSET', segments=seg, profile=.5, affect='EDGES', clamp_overlap=True)

def box(name, size, loc, mat, r=.05, corner=0, seg=2, rot=(0, 0, 0), cseg=5):
    """Rounded box centred on loc; corner rounds the vertical edges more strongly."""
    bm = bmesh.new()
    bmesh.ops.create_cube(bm, size=1)
    bmesh.ops.scale(bm, vec=size, verts=bm.verts)
    if corner:
        bevel(bm, [e for e in bm.edges if abs(e.verts[0].co.z - e.verts[1].co.z) > 1e-6], corner, cseg)
        bevel(bm, [e for e in bm.edges if abs(e.verts[0].co.z - e.verts[1].co.z) < 1e-6], r, seg)
    else:
        bevel(bm, list(bm.edges), r, seg)
    return finish(bm, name, mat, loc, rot)

def cyl(name, r1, r2, h, loc, mat, seg=20, bev=.015, rot=(0, 0, 0), centred=False, bev_seg=1):
    """Rounded cylinder with its base centre, or with centred=True its middle, at loc."""
    bm = bmesh.new()
    bmesh.ops.create_cone(bm, cap_ends=True, cap_tris=False, segments=seg, radius1=r1, radius2=r2, depth=h)
    if not centred:
        bmesh.ops.translate(bm, vec=(0, 0, h / 2), verts=bm.verts)
    bevel(bm, [e for e in bm.edges if abs(e.verts[0].co.z - e.verts[1].co.z) < 1e-6], bev, bev_seg)
    return finish(bm, name, mat, loc, rot)

def ball(name, radii, loc, mat, sub=3, wobble=0, seed=0):
    bm = bmesh.new()
    bmesh.ops.create_icosphere(bm, subdivisions=sub, radius=1)
    rng = random.Random(seed)
    phase = [rng.uniform(0, 6.3) for _ in range(3)]
    for v in bm.verts:
        d = v.co.normalized()
        k = 1 + wobble * (math.sin(2.1 * d.x + phase[0]) + math.sin(2.6 * d.y + phase[1]) + math.sin(2.3 * d.z + phase[2])) / 3
        v.co = Vector((d.x * radii[0], d.y * radii[1], d.z * radii[2])) * k
    return finish(bm, name, mat, loc, weighted=False)

def limb(name, a, b, r, mat, seg=10, round_ends=.85):
    a, b = Vector(a), Vector(b)
    ob = cyl(name, r, r, (b - a).length, a, mat, seg=seg, bev=r * round_ends)
    ob.rotation_mode = 'QUATERNION'
    ob.rotation_quaternion = (b - a).to_track_quat('Z', 'Y')
    return ob

def arch(name, w, h, depth, thick, r, loc, mat):
    """Rounded portal: one continuous extruded profile, so no seams at its corners."""
    def corner_pts(radius, half, top):
        pts = []
        for cx, a0 in ((-half + radius, 180), (half - radius, 90)):
            for i in range(9):
                a = math.radians(a0 - i * 90 / 8)
                pts.append((cx + radius * math.cos(a), top - radius + radius * math.sin(a)))
        return pts
    outer = [(-w / 2, 0)] + corner_pts(r, w / 2, h) + [(w / 2, 0)]
    inner = [(w / 2 - thick, 0)] + corner_pts(r - thick, w / 2 - thick, h - thick)[::-1] + [(-w / 2 + thick, 0)]
    # Quad strip between the two profiles: a concave n-gon cap smears the smooth shading.
    bm = bmesh.new()
    n = len(outer)
    def layer(y):
        return [bm.verts.new((x, y, z)) for x, z in outer], [bm.verts.new((x, y, z)) for x, z in inner[::-1]]
    front_o, front_i = layer(-depth / 2)
    back_o, back_i = layer(depth / 2)
    for i in range(n - 1):
        bm.faces.new((front_o[i], front_o[i + 1], front_i[i + 1], front_i[i]))
        bm.faces.new((back_o[i + 1], back_o[i], back_i[i], back_i[i + 1]))
        bm.faces.new((front_o[i + 1], front_o[i], back_o[i], back_o[i + 1]))
        bm.faces.new((front_i[i], front_i[i + 1], back_i[i + 1], back_i[i]))
    for ends in ((front_o[0], front_i[0], back_i[0], back_o[0]), (front_i[-1], front_o[-1], back_o[-1], back_i[-1])):
        bm.faces.new(ends)
    rims = [bm.edges.get((ring[i], ring[i + 1])) for ring in (front_o, front_i, back_o, back_i) for i in range(n - 1)]
    bevel(bm, rims, .08, 3)
    return finish(bm, name, mat, loc)

class At:
    """Temporarily offsets (and scales) everything a part builder creates."""
    def __init__(self, loc, rz=0, scale=1, rx=0):
        self.m = Matrix.Translation(loc) @ Matrix.Rotation(rz, 4, 'Z') @ Matrix.Rotation(rx, 4, 'X') @ Matrix.Scale(scale, 4)
    def __enter__(self):
        self.before = set(G.coll.objects)
    def __exit__(self, *_):
        for ob in set(G.coll.objects) - self.before:
            if ob.parent is G.root:
                ob.matrix_parent_inverse = Matrix.Identity(4)
                ob.matrix_basis = self.m @ ob.matrix_basis

