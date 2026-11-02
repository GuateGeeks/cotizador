"""THROWAWAY SPIKE: local Blender only, no Meshy. Proves the rounded GG look, sockets and export.

Run: blender.exe -b --factory-startup -P poc_world.py -- <windows-output-dir>
Blender: Z up, 1 unit = 1 m, front = -Y. Floor-standing origins sit at the ground contact.
"""
import bmesh, bpy, hashlib, json, math, os, random, sys
from mathutils import Matrix, Vector

OUT = sys.argv[sys.argv.index('--') + 1]
os.makedirs(OUT, exist_ok=True)

# --- materials ---------------------------------------------------------------
def linear(hexa):
    rgb = [int(hexa[i:i + 2], 16) / 255 for i in (1, 3, 5)]
    return [c / 12.92 if c <= .04045 else ((c + .055) / 1.055) ** 2.4 for c in rgb] + [1]

def material(name, hexa, rough, coat=0, emit=0, alpha=None):
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    p = next(n for n in m.node_tree.nodes if n.type == 'BSDF_PRINCIPLED')
    p.inputs['Base Color'].default_value = linear(hexa)
    p.inputs['Roughness'].default_value = rough
    p.inputs['Metallic'].default_value = 0
    p.inputs['Coat Weight'].default_value = coat
    p.inputs['Coat Roughness'].default_value = .35
    if emit:
        p.inputs['Emission Color'].default_value = linear(hexa)
        p.inputs['Emission Strength'].default_value = emit
    if alpha is not None:
        p.inputs['Alpha'].default_value = alpha
        m.surface_render_method = 'BLENDED'
    return m

M = {k: material(k, *v[:2], **v[2]) for k, v in {
    'GG_PurplePrimary': ('#6942A1', .48, {'coat': .15}), 'GG_PurpleDark': ('#321853', .50, {}),
    'GG_OrangeAccent': ('#FF9D38', .42, {'coat': .15}), 'GG_TurquoiseAccent': ('#25C2C6', .40, {'coat': .15}),
    'GG_IvorySoft': ('#FFF8EC', .62, {}), 'GG_NavyFabric': ('#33438A', .80, {}),
    'GG_GreenFoliage': ('#7CCB6B', .72, {}), 'GG_GreenDark': ('#3E9A5E', .72, {}),
    'GG_WarmSkin': ('#E9B48C', .68, {}), 'GG_GlassSoft': ('#9FE6E4', .15, {'alpha': .28}),
    'GG_ScreenEmissive': ('#25C2C6', .4, {'emit': 1.2}), 'GG_YellowAccent': ('#FFC93C', .42, {'coat': .15}),
    'GG_Wood': ('#9A6548', .7, {}), 'GG_WarmInterior': ('#FFD9A8', .7, {}),
    'GG_LightWarm': ('#FFF0C8', .5, {'emit': 3.5}), 'GG_ShirtWhite': ('#FFFFFF', .7, {}),
    'GG_BackgroundLilac': ('#F4F1F6', .9, {}),
}.items()}

# --- build context -----------------------------------------------------------
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

def finish(bm, name, mat, loc, rot=(0, 0, 0), weighted=True):
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    me = bpy.data.meshes.new(name)
    bm.to_mesh(me)
    bm.free()
    for poly in me.polygons:
        poly.use_smooth = True
    me.materials.append(M[mat])
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

def cyl(name, r1, r2, h, loc, mat, seg=20, bev=.015, rot=(0, 0, 0)):
    """Rounded cylinder whose base centre is at loc."""
    bm = bmesh.new()
    bmesh.ops.create_cone(bm, cap_ends=True, cap_tris=False, segments=seg, radius1=r1, radius2=r2, depth=h)
    bmesh.ops.translate(bm, vec=(0, 0, h / 2), verts=bm.verts)
    bevel(bm, [e for e in bm.edges if abs(e.verts[0].co.z - e.verts[1].co.z) < 1e-6], bev, 1)
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

def limb(name, a, b, r, mat):
    a, b = Vector(a), Vector(b)
    ob = cyl(name, r, r, (b - a).length, a, mat, seg=10, bev=r * .85)
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
    def __init__(self, loc, rz=0, scale=1):
        self.m = Matrix.Translation(loc) @ Matrix.Rotation(rz, 4, 'Z') @ Matrix.Scale(scale, 4)
    def __enter__(self):
        self.before = set(G.coll.objects)
    def __exit__(self, *_):
        for ob in set(G.coll.objects) - self.before:
            if ob.parent is G.root:
                rel = bpy.data.objects.new  # keeps the name local for clarity
                ob.matrix_parent_inverse = Matrix.Identity(4)
                ob.matrix_basis = self.m @ ob.matrix_basis

# --- furniture, vegetation, people, equipment --------------------------------
def chair(color='GG_OrangeAccent'):
    box('seat', (.44, .42, .07), (0, 0, .41), color, r=.03)
    box('back', (.42, .06, .32), (0, .2, .66), color, r=.03)
    box('back_hole', (.14, .07, .04), (0, .2, .75), 'GG_PurpleDark', r=.015)
    for x, y in ((-.17, -.16), (.17, -.16), (-.17, .16), (.17, .16)):
        cyl('leg', .027, .036, .36, (x, y, .03), 'GG_PurplePrimary', seg=8)
        cyl('foot', .04, .04, .04, (x, y, 0), 'GG_IvorySoft', seg=8, bev=.01)

def table():
    box('top', (1.3, 1.3, .08), (0, 0, .68), 'GG_IvorySoft', r=.035, corner=.1)
    box('inlay', (.24, .24, .012), (0, 0, .722), 'GG_PurplePrimary', r=.004)
    for x, y in ((-.54, -.54), (.54, -.54), (-.54, .54), (.54, .54)):
        cyl('leg', .04, .05, .6, (x, y, .03), 'GG_PurplePrimary', seg=12)
        cyl('foot', .055, .055, .04, (x, y, 0), 'GG_IvorySoft', seg=12, bev=.01)

def table_set():
    table()
    colors = ('GG_OrangeAccent', 'GG_TurquoiseAccent')
    for i, (x, y, rz) in enumerate(((-.42, -.72, 0), (.42, -.72, 0), (-.42, .72, math.pi), (.42, .72, math.pi))):
        with At((x, y, 0), rz + math.pi):
            chair(colors[(i + (i > 1)) % 2])

def tree(seed=1, scale=1):
    rng = random.Random(seed)
    cyl('trunk', .24 * scale, .13 * scale, 1.9 * scale, (0, 0, 0), 'GG_Wood', bev=.03)
    blobs = [(0, 0, 3.0, .95), (-.75, .1, 2.45, .72), (.8, -.1, 2.55, .78), (.1, -.65, 2.3, .62)]
    for i, (x, y, z, r) in enumerate(blobs):
        x, y, z = (v * scale + rng.uniform(-.06, .06) for v in (x, y, z))
        limb('branch', (0, 0, 1.45 * scale), (x * .75, y * .75, z - .35 * scale), .07 * scale, 'GG_Wood')
        ball('canopy', (r * scale,) * 3, (x, y, z), 'GG_GreenDark' if i == 3 else 'GG_GreenFoliage', wobble=.07, seed=seed + i, sub=3)

def planter(w=1.6):
    box('base', (w, .62, .1), (0, 0, .05), 'GG_PurplePrimary', r=.03, corner=.08)
    box('body', (w - .04, .58, .4), (0, 0, .3), 'GG_IvorySoft', r=.04, corner=.08)
    n = max(3, int(w / .32))
    for i in range(n):
        x = (i + .5) / n * (w - .25) - (w - .25) / 2
        ball('shrub', (.2, .2, .2 + (i % 2) * .05), (x, (-1) ** i * .07, .55), 'GG_GreenFoliage' if i % 3 else 'GG_GreenDark', sub=2, wobble=.05, seed=i)

def lamp():
    cyl('base', .17, .13, .16, (0, 0, 0), 'GG_PurplePrimary', bev=.03)
    cyl('post', .045, .045, 1.5, (0, 0, .16), 'GG_PurplePrimary')
    ball('glow', (.11, .11, .12), (0, 0, 1.72), 'GG_LightWarm', sub=2)
    cyl('cap', .19, .05, .13, (0, 0, 1.8), 'GG_PurplePrimary')

def student(pack='GG_OrangeAccent', skin='GG_WarmSkin', seated=False):
    """Primitive stand-in for the future approved base character; 1.35 m tall."""
    for s in (-1, 1):
        box('shoe', (.14, .22, .09), (s * .1, -.02, .05), 'GG_IvorySoft', r=.04)
        limb('leg', (s * .1, 0, .12), (s * .1, 0, .48), .075, 'GG_NavyFabric')
        limb('arm', (s * .21, 0, .84), (s * .29, -.03, .56), .055, 'GG_ShirtWhite')
        ball('hand', (.058,) * 3, (s * .295, -.035, .5), skin, sub=2)
        ball('eye', (.03, .018, .038), (s * .085, -.235, 1.1), 'GG_PurpleDark', sub=2)
    box('pants', (.34, .24, .14), (0, 0, .49), 'GG_NavyFabric', r=.06)
    box('vest', (.4, .29, .42), (0, 0, .72), 'GG_PurplePrimary', r=.12)
    ball('collar', (.13, .1, .05), (0, -.03, .93), 'GG_ShirtWhite', sub=2)
    ball('head', (.255, .24, .235), (0, 0, 1.12), skin)
    ball('hair', (.272, .25, .19), (0, .05, 1.22), 'GG_PurpleDark', wobble=.03, seed=4)
    box('pack', (.3, .14, .36), (0, .2, .73), pack, r=.06)

def rover():
    """SPIKE-inspired stand-in, about 0.3 m long, with separate wheels for later pivots."""
    box('chassis', (.14, .26, .05), (0, 0, .055), 'GG_TurquoiseAccent', r=.015)
    box('hub', (.11, .08, .14), (0, .01, .15), 'GG_IvorySoft', r=.018)
    for i in range(3):
        for j in range(3):
            box('led', (.014, .004, .014), (-.022 + i * .022, -.031, .135 + j * .022), 'GG_LightWarm', r=.002, seg=1)
    box('neck', (.016, .016, .08), (0, .02, .25), 'GG_PurpleDark', r=.005)
    box('head', (.12, .05, .05), (0, .01, .305), 'GG_IvorySoft', r=.018)
    for s in (-1, 1):
        ball('eye', (.016, .006, .016), (s * .032, -.016, .305), 'GG_PurpleDark', sub=2)
        wheel = cyl('wheel', .056, .056, .03, (s * .085 - .015, -.07, .056), 'GG_TurquoiseAccent', seg=24, bev=.008, rot=(0, math.pi / 2, 0))
        cyl('hubcap', .024, .024, .034, (s * .085 - .017, -.07, .056), 'GG_PurpleDark', seg=16, bev=.004, rot=(0, math.pi / 2, 0))
        box('beam', (.014, .27, .018), (s * .07, .0, .09), 'GG_YellowAccent', r=.006)
    box('bumper', (.2, .018, .018), (0, -.135, .05), 'GG_YellowAccent', r=.006)

# --- architecture (modules with sockets) -------------------------------------
W, D, H, BASE = 6.0, 5.0, 3.0, .2
TOP = BASE + H

def window(x, y, w, h, z, along='y'):
    size = (.1, w, h) if along == 'y' else (w, .1, h)
    box('frame', tuple(s + (.16 if s != .1 else 0) for s in size), (x, y, z), 'GG_PurplePrimary', r=.04)
    box('glass', (.14, w, h) if along == 'y' else (w, .14, h), (x, y, z), 'GG_GlassSoft', r=.01, seg=1)

def side_wall(x, solid=False):
    if solid:
        box('wall', (.25, D, H), (x, 0, BASE + H / 2), 'GG_IvorySoft', r=.04)
        return
    # Wall built around a real opening; the window is not painted on.
    sill, head = 1.0, 2.5
    box('wall_low', (.25, D, sill), (x, 0, BASE + sill / 2), 'GG_IvorySoft', r=.04)
    box('wall_high', (.25, D, H - head), (x, 0, BASE + (H + head) / 2), 'GG_IvorySoft', r=.04)
    for y in (-2.05, 2.05):
        box('wall_pier', (.25, .9, head - sill), (x, y, BASE + (sill + head) / 2), 'GG_IvorySoft', r=.02)
    for y in (-.53, .53):
        window(x, y, 1.0, head - sill, BASE + (sill + head) / 2)

def classroom(left_open=True, right_open=True, furnish=True, pack='GG_OrangeAccent'):
    box('slab', (W, D, BASE), (0, 0, BASE / 2), 'GG_PurplePrimary', r=.06, corner=.14)
    box('floor', (W - .3, D - .3, .03), (0, 0, BASE + .01), 'GG_WarmInterior', r=.01)
    box('wall_back', (W, .25, H), (0, D / 2 - .125, BASE + H / 2), 'GG_IvorySoft', r=.04)
    box('accent_back', (W - .5, .03, 1.2), (0, D / 2 - .265, BASE + 2.2), 'GG_PurplePrimary', r=.01)
    box('inner_back', (W - .5, .03, 1.6), (0, D / 2 - .265, BASE + .8), 'GG_WarmInterior', r=.01)
    side_wall(-W / 2 + .125, not left_open)
    side_wall(W / 2 - .125, not right_open)
    for s in (-1, 1):  # cutaway front: corner piers and header keep the room visible
        box('pier_front', (.5, .3, H), (s * (W / 2 - .25), -D / 2 + .15, BASE + H / 2), 'GG_IvorySoft', r=.06)
    box('header', (W, .3, .42), (0, -D / 2 + .15, TOP - .21), 'GG_IvorySoft', r=.06)
    box('sill', (W - 1, .22, .38), (0, -D / 2 + .13, BASE + .19), 'GG_IvorySoft', r=.05)
    box('light_panel', (2.4, .4, .05), (0, .3, TOP - .05), 'GG_LightWarm', r=.015)
    box('screen_frame', (1.8, .07, 1.05), (0, D / 2 - .3, BASE + 1.85), 'GG_PurpleDark', r=.03)
    box('screen', (1.6, .04, .86), (0, D / 2 - .34, BASE + 1.85), 'GG_ScreenEmissive', r=.008)
    if furnish:
        box('shelf', (.9, .34, 1.4), (2.2, D / 2 - .45, BASE + .7), 'GG_Wood', r=.03)
        with At((-1.25, .35, BASE)):
            table_set()
        with At((1.05, -.2, BASE)):
            table_set()
        with At((-1.25, .35, BASE + .73), scale=.9):
            rover()
        with At((-2.3, -1.3, BASE), rz=.6):
            student(pack)
        with At((2.4, -1.4, BASE), rz=-.5):
            student('GG_TurquoiseAccent')
    light = bpy.data.lights.new('room', 'POINT')
    light.energy, light.color, light.shadow_soft_size = 180, (1, .84, .62), .8
    ob = bpy.data.objects.new('room_light', light)
    G.coll.objects.link(ob)
    ob.parent = G.root
    ob.location = (0, 0, TOP - .7)
    G.socket('east', (W / 2, 0, 0)); G.socket('west', (-W / 2, 0, 0))
    G.socket('floor_above', (0, 0, TOP)); G.socket('floor_below', (0, 0, 0))

def roof(w=W):
    box('roof', (w + .5, D + .5, .34), (0, 0, .17), 'GG_PurplePrimary', r=.1, corner=.32)
    box('deck', (w - .4, D - .4, .05), (0, 0, .35), 'GG_PurpleDark', r=.02, corner=.2)
    G.socket('floor_below', (0, 0, 0))

def entrance():
    w = 3.2
    box('slab', (w, D, BASE), (0, 0, BASE / 2), 'GG_PurplePrimary', r=.06, corner=.14)
    box('hall', (w - .3, D - 1, H), (0, .5, BASE + H / 2), 'GG_IvorySoft', r=.05)
    arch('portal', w + .1, 3.5, 1.1, .5, .75, (0, -D / 2 + .55, BASE), 'GG_OrangeAccent')
    box('door_frame', (w - .95, .1, 2.65), (0, -D / 2 + .98, BASE + 1.32), 'GG_PurplePrimary', r=.03)
    for s in (-1, 1):
        box('door', (.95, .12, 2.45), (s * .5, -D / 2 + .98, BASE + 1.23), 'GG_GlassSoft', r=.02, seg=1)
        box('door_glow', (.9, .02, 2.4), (s * .5, -D / 2 + .99, BASE + 1.2), 'GG_LightWarm', r=.005, seg=1)
        box('handle', (.03, .03, .55), (s * .07, -D / 2 + .9, BASE + 1.2), 'GG_IvorySoft', r=.012)
    box('step_1', (w - .5, .55, .1), (0, -D / 2 - .25, .05), 'GG_IvorySoft', r=.03)
    box('roof', (w + .5, D - .5, .34), (0, .5, TOP + .17), 'GG_PurplePrimary', r=.1, corner=.32)
    G.socket('east', (w / 2, 0, 0))

def stairs(steps=14):
    run, rise = .32, TOP / 14
    for i in range(steps):
        h = rise * (i + 1)
        box('step', (1.5, run + .01, h), (0, i * run, h / 2), 'GG_TurquoiseAccent', r=.02, seg=1)
    length = steps * run
    tilt = math.atan2(TOP, length)
    for s in (-1, 1):
        box('rail_glass', (.05, length / math.cos(tilt) * .96, .72), (s * .75, length / 2 - .1, TOP / 2 + .48), 'GG_GlassSoft', r=.01, seg=1, rot=(tilt, 0, 0))
        box('rail', (.1, length / math.cos(tilt), .08), (s * .75, length / 2 - .1, TOP / 2 + .86), 'GG_IvorySoft', r=.035, rot=(tilt, 0, 0))
    G.socket('floor_above', (0, length, TOP))

def island(w, d, h=1.3):
    box('island', (w, d, h), (0, 0, -h / 2 - .12), 'GG_PurplePrimary', r=.35, corner=min(w, d) * .2, seg=5, cseg=20)
    box('top', (w - .55, d - .55, .13), (0, 0, -.065), 'GG_IvorySoft', r=.05, corner=min(w, d) * .18, cseg=20)

# --- scene assembly and render ------------------------------------------------
scene = bpy.context.scene
for ob in list(bpy.data.objects):
    bpy.data.objects.remove(ob)

scene.render.engine = 'CYCLES'
try:
    prefs = bpy.context.preferences.addons['cycles'].preferences
    prefs.compute_device_type = 'OPTIX'
    prefs.get_devices()
    enabled = [d for d in prefs.devices if d.type == 'OPTIX']
    for d in prefs.devices:
        d.use = d.type == 'OPTIX'
    scene.cycles.device = 'GPU' if enabled else 'CPU'
except Exception as exc:
    print('GPU unavailable', exc)
    scene.cycles.device = 'CPU'
scene.cycles.use_denoising = True
scene.view_settings.view_transform = 'Standard'
scene.view_settings.look = 'None'
scene.render.image_settings.file_format = 'PNG'

world = bpy.data.worlds.new('world')
world.use_nodes = True
background = world.node_tree.nodes['Background']
background.inputs[0].default_value = linear('#F4F1F6')
background.inputs[1].default_value = .85
scene.world = world

sun_data = bpy.data.lights.new('sun', 'SUN')
sun_data.energy, sun_data.angle, sun_data.color = 1.7, math.radians(32), (1, .96, .9)
sun = bpy.data.objects.new('sun', sun_data)
scene.collection.objects.link(sun)
sun.rotation_euler = (math.radians(50), 0, math.radians(-35))

bpy.ops.mesh.primitive_plane_add(size=400)
ground = bpy.context.object
ground.name = 'ground'
ground.data.materials.append(M['GG_BackgroundLilac'])

cam_data = bpy.data.cameras.new('cam')
cam_data.type = 'ORTHO'
cam = bpy.data.objects.new('cam', cam_data)
scene.collection.objects.link(cam)
scene.camera = cam

def bounds(objs):
    pts = [o.matrix_world @ Vector(c) for o in objs if o.type == 'MESH' for c in o.bound_box]
    return pts

def frame(objs, margin=1.12):
    bpy.context.view_layer.update()
    pts = bounds(objs)
    centre = sum(pts, Vector()) / len(pts)
    direction = Vector((-.6, -1, .72)).normalized()
    cam.rotation_mode = 'QUATERNION'
    cam.rotation_quaternion = direction.to_track_quat('Z', 'Y')
    cam.location = centre + direction * 300
    cam_data.clip_end = 1000
    bpy.context.view_layer.update()
    inv = cam.matrix_world.inverted()
    local = [inv @ p for p in pts]
    xs, ys = [p.x for p in local], [p.y for p in local]
    cam.location = cam.matrix_world @ Vector(((min(xs) + max(xs)) / 2, (min(ys) + max(ys)) / 2, 0))
    aspect = scene.render.resolution_x / scene.render.resolution_y
    cam_data.ortho_scale = max(max(xs) - min(xs), (max(ys) - min(ys)) * aspect) * margin

def render(path, x, y, samples):
    scene.render.resolution_x, scene.render.resolution_y = x, y
    scene.cycles.samples = samples
    scene.render.filepath = path
    bpy.ops.render.render(write_still=True)

def clear(collection):
    for ob in list(collection.objects):
        bpy.data.objects.remove(ob)
    bpy.data.collections.remove(collection)

ASSETS = {
    'furn-chair-orange': (chair, 700), 'furn-chair-turquoise': (lambda: chair('GG_TurquoiseAccent'), 700),
    'furn-table-four': (table_set, None), 'veg-tree-large': (lambda: tree(3), 1500), 'veg-planter': (planter, 1000),
    'furn-lamp': (lamp, 1000), 'char-student-primary-standin': (student, 6000), 'equip-rover-standin': (rover, 5000),
    'arch-classroom-standard': (classroom, None), 'arch-entrance': (entrance, None), 'arch-stairs': (stairs, None),
    'arch-roof': (roof, None),
}

report = {'blender': bpy.app.version_string, 'device': scene.cycles.device, 'spike': True, 'assets': {}, 'snaps': {}}
for asset, (builder, budget) in ASSETS.items():
    G = Build(asset)
    builder()
    bpy.context.view_layer.update()
    export = [o for o in G.coll.objects if o.type in ('MESH', 'EMPTY')]
    depsgraph = bpy.context.evaluated_depsgraph_get()
    tris = 0
    for o in export:
        if o.type == 'MESH':
            mesh = o.evaluated_get(depsgraph).to_mesh()
            mesh.calc_loop_triangles()
            tris += len(mesh.loop_triangles)
            o.evaluated_get(depsgraph).to_mesh_clear()
    pts = bounds(export)
    size = [round(max(p[i] for p in pts) - min(p[i] for p in pts), 3) for i in range(3)]
    bpy.ops.object.select_all(action='DESELECT')
    for o in export:
        o.select_set(True)
    path = os.path.join(OUT, f'{asset}.glb')
    bpy.ops.export_scene.gltf(filepath=path, export_format='GLB', use_selection=True, export_apply=True, export_yup=True)
    with open(path, 'rb') as f:
        digest = hashlib.sha256(f.read()).hexdigest()
    frame(export)
    render(os.path.join(OUT, f'preview-{asset}.png'), 640, 640, 48)
    clear(G.coll)
    # Reimport the file that was actually written; its triangles must match the source.
    before = set(bpy.data.objects)
    bpy.ops.import_scene.gltf(filepath=path)
    imported = set(bpy.data.objects) - before
    back = sum(len(p.vertices) - 2 for o in imported if o.type == 'MESH' for p in o.data.polygons)
    nodes = sorted(o.name for o in imported if o.name.startswith('socket_'))
    for o in imported:
        bpy.data.objects.remove(o)
    report['assets'][asset] = {'triangles': tris, 'reimported_triangles': back, 'budget': budget,
        'within_budget': None if budget is None else tris <= budget, 'size_m': size, 'sockets': nodes,
        'bytes': os.path.getsize(path), 'sha256': digest}

# Modules placed only through socket positions, so a wrong socket shows as a measured gap.
def place(builder, target_world=None, own_socket=None, loc=(0, 0, 0), rz=0):
    global G
    G = Build(builder.__name__ if hasattr(builder, '__name__') else 'part')
    builder()
    if target_world is not None:
        offset = Vector(target_world) - G.sockets[own_socket].location
    else:
        offset = Vector(loc)
    G.root.location = offset
    G.root.rotation_euler = (0, 0, rz)
    bpy.context.view_layer.update()
    return G

def world_socket(b, name):
    return b.root.matrix_world @ b.sockets[name].location

def decorate(items):
    global G
    made = []
    for fn, loc, rz in items:
        G = Build('deco')
        fn()
        G.root.location, G.root.rotation_euler = loc, (0, 0, rz)
        made.append(G)
    return made

def walker(pack):
    return lambda: student(pack)

STATES = ('one-room', 'two-rooms', 'two-storeys')
for index, state in enumerate(STATES):
    made = []
    room = place(classroom)
    made.append(room)
    made.append(place(entrance, world_socket(room, 'west'), 'east'))
    if index == 0:
        made.append(place(roof, world_socket(room, 'floor_above'), 'floor_below'))
        isle = (15, 11.5, -1.3, -.6)
        deco = [(lambda: tree(1), (5.2, 2.9, 0), 0), (lambda: tree(2, .75), (-6.2, 3, 0), 0), (planter, (4.2, -3.3, 0), 0),
                (walker('GG_OrangeAccent'), (-1, -4, 0), .3), (walker('GG_TurquoiseAccent'), (.2, -4.2, 0), -.3), (lamp, (-5.6, -3.7, 0), 0)]
    if index >= 1:
        second = place(classroom, world_socket(room, 'east'), 'west')
        made.append(second)
        snap = (world_socket(second, 'west') - world_socket(room, 'east')).length
        report['snaps'][f'{state}:classroom-east'] = round(snap, 6)
        isle = (22, 12.5, 1.3, -.6)
        deco = [(lambda: tree(1), (9.2, 4.6, 0), 0), (lambda: tree(2, .75), (-7.2, 3.2, 0), 0), (planter, (2, -3.5, 0), 0), (planter, (6, -3.5, 0), 0),
                (walker('GG_OrangeAccent'), (-.5, -4.3, 0), .3), (walker('GG_TurquoiseAccent'), (.6, -4.4, 0), -.3), (lamp, (-7.4, -3.8, 0), 0),
                (lambda: tree(5, .6), (6.6, -4.4, 0), 0)]
    if index == 1:
        made.append(place(roof, world_socket(room, 'floor_above'), 'floor_below'))
        made.append(place(roof, world_socket(second, 'floor_above'), 'floor_below'))
    if index == 2:
        upper = place(classroom, world_socket(second, 'floor_above'), 'floor_below')
        made.append(upper)
        report['snaps'][f'{state}:upper-floor'] = round((world_socket(upper, 'floor_below') - world_socket(second, 'floor_above')).length, 6)
        made.append(place(roof, world_socket(room, 'floor_above'), 'floor_below'))
        made.append(place(roof, world_socket(upper, 'floor_above'), 'floor_below'))
        made.append(place(stairs, loc=(W * 1.5 + .8, -2.3, 0)))
    made += decorate(deco)
    G = Build('island')
    island(isle[0], isle[1])
    G.root.location = (isle[2], isle[3], 0)
    made.append(G)
    ground.location.z = -5
    objs = [o for b in made for o in b.coll.objects if o.type == 'MESH']
    frame(objs, 1.1)
    render(os.path.join(OUT, f'state-{index + 1}-{state}.png'), 1600, 1000, 96)
    report.setdefault('states', {})[state] = {'meshes': len(objs)}
    for b in made:
        clear(b.coll)
    ground.location.z = 0

with open(os.path.join(OUT, 'report.json'), 'w') as f:
    json.dump(report, f, indent=2)
print('POC_DONE')
