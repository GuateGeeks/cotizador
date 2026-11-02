"""Modular school kit. Every dimension comes from the shared contract."""
import json, math, pathlib

import bmesh
import bpy

from gg import geometry
from gg.geometry import arch, ball, box, cyl
from gg.sockets import add_socket, register

ROOT = pathlib.Path(__file__).resolve().parents[3]
C = json.loads((ROOT / 'world/constants.json').read_text())
W, D = C['bay']
BASE, H, T = C['base'], C['wall'], C['wallThickness']
TOP = BASE + H

def window(x, y, w, h, z):
    box('frame', (.1, w + .16, h + .16), (x, y, z), 'GG_PurplePrimary', r=.04)
    box('glass', (.14, w, h), (x, y, z), 'GG_GlassSoft', r=.01, seg=1)

def side_wall(x, solid=False):
    if solid:
        box('wall', (T, D - .3, H), (x, .15, BASE + H / 2), 'GG_IvorySoft', r=.04)
        return
    sill, head = 1.0, 2.5  # A real opening: the wall stops around the window.
    # Side walls stop behind the front pier, so the two never overlap.
    box('wall_low', (T, D - .3, sill), (x, .15, BASE + sill / 2), 'GG_IvorySoft', r=.04)
    box('wall_high', (T, D - .3, H - head), (x, .15, BASE + (H + head) / 2), 'GG_IvorySoft', r=.04)
    for y in (-1.8, 2.05):
        box('wall_pier', (T, .9 - (y < 0) * .4 + .0, head - sill), (x, y + (y < 0) * -.05, BASE + (sill + head) / 2), 'GG_IvorySoft', r=.02)
    for y in (-.53, .53):
        window(x, y, 1.0, head - sill, BASE + (sill + head) / 2)

def classroom_shell(left_open=True, right_open=True, accent='GG_PurplePrimary', inlay=None):
    box('slab', (W, D, BASE), (0, 0, BASE / 2), 'GG_PurplePrimary', r=.06, corner=.14)
    box('floor', (W - .3, D - .3, .03), (0, 0, BASE + .01), 'GG_WarmInterior', r=.01, seg=1)
    if inlay:
        box('inlay', (W - 2, D - 2.4, .012), (0, -.1, BASE + .03), inlay, r=.004, seg=1)
    box('wall_back', (W, T, H), (0, D / 2 - T / 2, BASE + H / 2), 'GG_IvorySoft', r=.04)
    box('accent_back', (W - .5, .03, 1.2), (0, D / 2 - T - .015, BASE + 2.2), accent, r=.01, seg=1)
    box('inner_back', (W - .5, .03, 1.6), (0, D / 2 - T - .015, BASE + .8), 'GG_WarmInterior', r=.01, seg=1)
    side_wall(-W / 2 + T / 2, not left_open)
    side_wall(W / 2 - T / 2, not right_open)
    for s in (-1, 1):  # Cutaway front: piers and header keep the room visible from above.
        box('pier_front', (.5, .3, H - .42), (s * (W / 2 - .25), -D / 2 + .15, BASE + (H - .42) / 2), 'GG_IvorySoft', r=.04)
    box('header', (W, .3, .42), (0, -D / 2 + .15, TOP - .21), 'GG_IvorySoft', r=.06)
    box('sill', (W - 1, .22, .38), (0, -D / 2 + .13, BASE + .19), 'GG_IvorySoft', r=.05)
    box('wall_light', (W - 1.4, .1, .06), (0, D / 2 - T - .05, TOP - .22), 'GG_LightWarm', r=.02, seg=1)
    box('screen_frame', (1.8, .07, 1.05), (0, D / 2 - T - .05, BASE + 1.85), 'GG_PurpleDark', r=.03)
    box('screen', (1.6, .04, .86), (0, D / 2 - T - .09, BASE + 1.85), 'GG_ScreenEmissive', r=.008, seg=1)
    add_socket('east', (W / 2, 0, 0))
    add_socket('west', (-W / 2, 0, 0))
    add_socket('floor_above', (0, 0, TOP))
    add_socket('floor_below', (0, 0, 0))

@register('arch-classroom-standard', budget=8000)
def classroom_standard():
    classroom_shell()

def roof_plate(color='GG_PurplePrimary'):
    box('roof', (W, D + .5, .34), (0, 0, .17), color, r=.08)
    add_socket('floor_below', (0, 0, 0))

@register('arch-roof', budget=2000)
def roof():
    roof_plate()
    box('deck', (W - .5, D - .4, .05), (0, 0, .355), 'GG_PurpleDark', r=.02, corner=.2)

@register('arch-roof-flat', budget=1500)
def roof_flat():
    roof()

def extruded(name, profile, d, z, mat, r=.07, seg=2):
    """Soft roof form: one closed XZ profile extruded along Y."""
    bm = bmesh.new()
    front = [bm.verts.new((x, -d / 2, y)) for x, y in profile]
    back = [bm.verts.new((x, d / 2, y)) for x, y in profile]
    bm.faces.new(front[::-1])
    bm.faces.new(back)
    n = len(profile)
    for i in range(n):
        bm.faces.new((front[i], front[(i + 1) % n], back[(i + 1) % n], back[i]))
    bm.edges.ensure_lookup_table()
    rims = [e for e in bm.edges if abs(e.verts[0].co.y - e.verts[1].co.y) < 1e-6]
    geometry.bevel(bm, rims, r, seg)
    return geometry.finish(bm, name, mat, (0, 0, z))

def gable(w, d, h, z, mat):
    half, soft = w / 2, h * .22
    return extruded('gable', [(-half, 0), (-half, soft), (-half * .16, h), (half * .16, h), (half, soft), (half, 0)], d, z, mat)

@register('arch-roof-pitched', budget=1500)
def roof_pitched():
    roof_plate()
    gable(W - .1, D + .2, 1.5, .3, 'GG_OrangeAccent')

@register('arch-roof-barrel', budget=1500)
def roof_barrel():
    roof_plate()
    half, rise = (W - .2) / 2, 1.3
    arc = [(half * math.cos(math.pi * i / 14), rise * math.sin(math.pi * i / 14)) for i in range(15)]
    extruded('vault', arc, D + .2, .34, 'GG_TurquoiseAccent', r=.04, seg=1)
    box('vault_base', (W - .1, D + .3, .16), (0, 0, .36), 'GG_IvorySoft', r=.05)

@register('arch-roof-tower', budget=1500)
def roof_tower():
    roof_plate()
    box('tower', (2.4, 2.4, 1.7), (0, 0, 1.15), 'GG_IvorySoft', r=.14, corner=.3)
    for s in (-1, 1):
        box('tower_window', (.7, .08, .9), (s * .55, -1.2, 1.2), 'GG_GlassSoft', r=.02, seg=1)
    box('tower_band', (2.6, 2.6, .2), (0, 0, 2.05), 'GG_PurplePrimary', r=.07, corner=.32)
    cyl('tower_cap', 1.5, .1, 1.1, (0, 0, 2.15), 'GG_OrangeAccent', seg=24, bev=.06, bev_seg=2)

def rail_ring(colour_y):
    for y in colour_y:
        box('rail_glass', (W - 1, .05, .6), (0, y, .68), 'GG_GlassSoft', r=.01, seg=1)
        box('rail', (W - .9, .08, .08), (0, y, 1.0), 'GG_IvorySoft', r=.03)

@register('arch-roof-terrace', budget=1500)
def roof_terrace():
    roof_plate()
    box('deck', (W - .4, D - .1, .06), (0, 0, .36), 'GG_WarmInterior', r=.02, corner=.2)
    rail_ring((-D / 2 + .2,))
    box('planter', (1.5, .5, .4), (-1.7, 1.7, .58), 'GG_IvorySoft', r=.04, corner=.07)
    for i in range(3):
        ball('shrub', (.2,) * 3, (-2.1 + i * .4, 1.7, .84), 'GG_GreenFoliage', sub=2, wobble=.05, seed=i)
    box('bench', (1.5, .36, .1), (1.4, 1.7, .62), 'GG_OrangeAccent', r=.03)
    for s in (-1, 1):
        box('bench_end', (.2, .36, .26), (1.4 + s * .6, 1.7, .49), 'GG_PurplePrimary', r=.04)

@register('arch-roof-garden', budget=1500)
def roof_garden():
    roof_plate()
    box('soil', (W - .4, D - .1, .08), (0, 0, .37), 'GG_GreenFoliage', r=.03, corner=.25)
    for i, (x, y, r) in enumerate(((-1.9, 1.2, .46), (1.8, -1.1, .4), (-.5, -1.3, .3), (1.1, 1.3, .34))):
        ball('bush', (r, r, r * .85), (x, y, .36 + r * .7), 'GG_GreenDark' if i % 2 else 'GG_GreenFoliage', sub=2, wobble=.05, seed=i)

@register('arch-archway', budget=2000)
def archway():
    arch('arch', 4.6, 2.9, .5, .45, .9, (0, 0, 0), 'GG_IvorySoft')

@register('arch-pocket-garden', budget=2000)
def pocket_garden():
    box('pad', (3.4, 1.7, .12), (0, 0, .06), 'GG_GreenFoliage', r=.04, corner=.3)
    box('edge', (3.5, 1.8, .06), (0, 0, .03), 'GG_IvorySoft', r=.02, corner=.32)
    for i, (x, y, r) in enumerate(((-1.1, .1, .36), (.9, -.2, .3), (0, .3, .24))):
        ball('bush', (r, r, r), (x, y, .12 + r * .8), 'GG_GreenDark' if i == 1 else 'GG_GreenFoliage', sub=2, wobble=.05, seed=i)

@register('arch-roof-trim', budget=2000)
def roof_trim():
    box('trim', (.3, D + 2.9, .46), (0, 0, .2), 'GG_TurquoiseAccent', r=.08)

@register('arch-gallery', budget=2000)
def gallery():
    length = 3.9
    box('deck', (1.4, length, BASE - .01), (0, 0, (BASE - .01) / 2), 'GG_IvorySoft', r=.03)
    box('walk', (1.3, length - .1, .02), (0, 0, BASE - .015), 'GG_TurquoiseAccent', r=.005, seg=1)
    for s in (-1, 1):
        box('post', (.2, .2, FLOOR), (s * .55, -length / 2 + .2, -FLOOR / 2 + .02), 'GG_PurplePrimary', r=.04)

@register('arch-stairs-upper', budget=2000)
def stairs_upper():
    # Open treads on two stringers, running just in front of the floor-1 walkway so its cutaway stays visible.
    width, steps, run = .8, 14, .32
    rise = TOP / steps
    length = steps * run
    tilt = math.atan2(TOP, length)
    slope = length / math.cos(tilt)
    for i in range(steps):
        box('tread', (width, run * .92, .07), (0, i * run + run / 2, rise * (i + 1) - .035), 'GG_TurquoiseAccent', r=.015, seg=1)
    for s in (-1, 1):
        box('stringer', (.08, slope, .16), (s * (width / 2 + .04), length / 2, TOP / 2), 'GG_PurplePrimary', r=.03, rot=(tilt, 0, 0))
        box('rail', (.06, slope, .06), (s * (width / 2 + .04), length / 2, TOP / 2 + .8), 'GG_IvorySoft', r=.025, rot=(tilt, 0, 0))
        box('rail_post', (.05, .05, .8), (s * (width / 2 + .04), length - .2, TOP + .4 - .1), 'GG_IvorySoft', r=.02)
        box('rail_post', (.05, .05, .8), (s * (width / 2 + .04), .3, .5), 'GG_IvorySoft', r=.02)
    # Top platform: carries the flight past the front stairs to the floor-2 gallery, on posts to the ground.
    deck, span = width + .1, 1.52
    box('platform', (deck, span, BASE), (0, length + span / 2, TOP + BASE / 2), 'GG_IvorySoft', r=.03, seg=1)
    box('platform_walk', (deck - .1, span - .1, .02), (0, length + span / 2, TOP + BASE + .005), 'GG_TurquoiseAccent', r=.005, seg=1)
    box('platform_rail', (.06, span, .06), (deck / 2 - .04, length + span / 2, TOP + BASE + .85), 'GG_IvorySoft', r=.025, seg=1)
    box('platform_rail', (deck, .06, .06), (0, length + span - .04, TOP + BASE + .85), 'GG_IvorySoft', r=.025, seg=1)
    box('platform_rail_post', (.05, .05, .85), (deck / 2 - .04, length + .1, TOP + BASE + .42), 'GG_IvorySoft', r=.02, seg=1)
    for s in (-1, 1):
        box('platform_post', (.18, .18, TOP + FLOOR + .1), (s * (deck / 2 - .1), length + span - .1, (TOP + .1 - FLOOR) / 2), 'GG_PurplePrimary', r=.04, seg=1)
    add_socket('floor_above', (0, length, TOP))
    add_socket('platform_end', (0, length + span, TOP + BASE))

@register('arch-stair-landing', budget=2000)
def stair_landing():
    # Floor-1 landing at the walkway's open west end; the upper flight starts from its east edge.
    w, d = 1.4, 1.0
    box('deck', (w, d, BASE), (0, 0, BASE / 2), 'GG_IvorySoft', r=.03, seg=1)
    box('walk', (w - .1, d - .1, .02), (0, 0, BASE + .005), 'GG_TurquoiseAccent', r=.005, seg=1)
    box('rail_glass', (.05, d - .12, .78), (-w / 2 + .06, 0, BASE + .4), 'GG_GlassSoft', r=.01, seg=1)
    box('rail', (.09, d - .04, .08), (-w / 2 + .06, 0, BASE + .82), 'GG_IvorySoft', r=.035, seg=1)
    box('rail_glass', (w - .12, .05, .78), (0, -d / 2 + .06, BASE + .4), 'GG_GlassSoft', r=.01, seg=1)
    box('rail', (w - .04, .09, .08), (0, -d / 2 + .06, BASE + .82), 'GG_IvorySoft', r=.035, seg=1)
    for x in (-w / 2 + .12, w / 2 - .12):
        box('post', (.2, .2, FLOOR + .1), (x, -d / 2 + .12, -FLOOR / 2 + .05), 'GG_PurplePrimary', r=.04, seg=1)
    add_socket('deck', (0, 0, BASE))

@register('arch-courtyard-tree', budget=2000)
def courtyard_tree():
    cyl('bed', 1, 1.1, .3, (0, 0, 0), 'GG_IvorySoft', seg=24, bev=.05)
    cyl('soil', .85, .85, .32, (0, 0, .02), 'GG_GreenFoliage', seg=20, bev=.02)
    cyl('trunk', .16, .1, 1.5, (0, 0, .3), 'GG_Wood', seg=10, bev=.02)
    ball('crown', (.95, .95, .85), (0, 0, 2.3), 'GG_GreenFoliage', sub=3, wobble=.06, seed=4)

@register('arch-entrance', budget=8000)
def entrance():
    w = 3.2
    box('slab', (w, D, BASE), (0, 0, BASE / 2), 'GG_PurplePrimary', r=.06, corner=.14)
    box('hall', (w - .3, D - 1, H), (0, .5, BASE + H / 2), 'GG_IvorySoft', r=.05)
    arch('portal', w, 3.5, 1.1, .5, .75, (0, -D / 2 + .55, BASE), 'GG_OrangeAccent')
    box('door_frame', (w - .95, .06, 2.65), (0, -D / 2 + 1.03, BASE + 1.32), 'GG_PurplePrimary', r=.02)
    for s in (-1, 1):
        box('door', (.95, .06, 2.45), (s * .5, -D / 2 + .96, BASE + 1.23), 'GG_GlassSoft', r=.02, seg=1)
        box('door_glow', (.9, .01, 2.4), (s * .5, -D / 2 + .98, BASE + 1.2), 'GG_LightWarm', r=.005, seg=1)
        box('handle', (.03, .03, .55), (s * .07, -D / 2 + .9, BASE + 1.2), 'GG_IvorySoft', r=.012)
    box('step', (w - .5, .55, .1), (0, -D / 2 - .25, .05), 'GG_IvorySoft', r=.03)
    box('roof', (w, D - .5, .34), (0, .5, TOP + .17), 'GG_PurplePrimary', r=.08)
    add_socket('east', (w / 2, 0, 0))

@register('arch-island-slice', budget=8000)
def island_slice():
    w, d, h = 17.0, 12.5, 1.3
    box('island', (w, d, h), (0, 0, -h / 2 - .12), 'GG_PurplePrimary', r=.35, corner=d * .2, seg=5, cseg=20)
    box('top', (w - .55, d - .55, .13), (0, 0, -.065), 'GG_IvorySoft', r=.05, corner=d * .18, cseg=20)

def bay_sockets(top=TOP):
    add_socket('east', (W / 2, 0, 0))
    add_socket('west', (-W / 2, 0, 0))
    add_socket('floor_above', (0, 0, top))
    add_socket('floor_below', (0, 0, 0))

@register('arch-classroom-upper', budget=8000)
def classroom_upper():
    classroom_shell(accent='GG_NavyFabric')

@register('arch-classroom-expandable', budget=8000)
def classroom_expandable():
    classroom_shell(accent='GG_TurquoiseAccent', inlay='GG_TurquoiseAccent')

@register('arch-classroom-end', budget=8000)
def classroom_end():
    classroom_shell(right_open=False)

@register('arch-classroom-corner', budget=8000)
def classroom_corner():
    classroom_shell(right_open=False, accent='GG_OrangeAccent', inlay='GG_OrangeAccent')

@register('arch-support', budget=8000)
def support():
    box('slab', (W, D, BASE), (0, 0, BASE / 2), 'GG_PurplePrimary', r=.06, corner=.14)
    box('beam_front', (W, .4, .4), (0, -D / 2 + .2, TOP - .2), 'GG_IvorySoft', r=.06)
    box('beam_back', (W, .4, .4), (0, D / 2 - .2, TOP - .2), 'GG_IvorySoft', r=.06)
    for x in (-W / 2 + .3, W / 2 - .3):
        box('tie', (.4, D - .8, .3), (x, 0, TOP - .15), 'GG_IvorySoft', r=.05)
        for y in (-D / 2 + .3, D / 2 - .3):
            box('column', (.6, .6, H - .4), (x, y, BASE + (H - .4) / 2), 'GG_PurplePrimary', r=.08, corner=.12)
    bay_sockets()

@register('arch-corridor', budget=8000)
def corridor():
    box('slab', (W, D, BASE), (0, 0, BASE / 2), 'GG_PurplePrimary', r=.06, corner=.14)
    box('walk', (W - .3, D - .3, .03), (0, 0, BASE + .01), 'GG_TurquoiseAccent', r=.01, seg=1)
    box('wall_back', (W, T, H), (0, D / 2 - T / 2, BASE + H / 2), 'GG_IvorySoft', r=.04)
    box('header', (W, .3, .42), (0, -D / 2 + .15, TOP - .21), 'GG_IvorySoft', r=.06)
    for x in (-W / 2 + .2, W / 2 - .2):
        box('tie', (.4, D - .55, .3), (x, -.03, TOP - .15), 'GG_IvorySoft', r=.05)
        box('post', (.4, .3, H - .42), (x, -D / 2 + .15, BASE + (H - .42) / 2), 'GG_PurplePrimary', r=.06)
    for x in (-1.5, 1.5):
        box('pane', (1.8, .08, H - .42), (x, -D / 2 + .15, BASE + (H - .42) / 2), 'GG_GlassSoft', r=.01, seg=1)
    bay_sockets()

def balcony_deck(back_rail=False):
    bd = 1.4
    box('deck', (W, bd, BASE), (0, 0, BASE / 2), 'GG_IvorySoft', r=.04)
    box('walk', (W - .1, bd - .1, .02), (0, 0, BASE + .005), 'GG_TurquoiseAccent', r=.005, seg=1)
    rails = (-bd / 2 + .06, bd / 2 - .06) if back_rail else (-bd / 2 + .06,)
    for y in rails:
        box('rail_glass', (W - 1.9, .05, .78), (0, y, BASE + .4), 'GG_GlassSoft', r=.01, seg=1)
        box('rail', (W - 1.75, .09, .08), (0, y, BASE + .82), 'GG_IvorySoft', r=.035)
    for x in (-W / 2 + 1, W / 2 - 1):
        box('post', (.24, .24, FLOOR), (x, 0, -FLOOR / 2 + .02), 'GG_PurplePrimary', r=.05, corner=.05)
    add_socket('east', (W / 2, 0, 0))
    add_socket('west', (-W / 2, 0, 0))

FLOOR = TOP

@register('arch-balcony', budget=8000)
def balcony():
    balcony_deck()

@register('arch-bridge', budget=8000)
def bridge():
    balcony_deck(back_rail=True)

@register('arch-stairs', budget=8000)
def stairs():
    stairs_flight(1.5)

def stairs_flight(width, steps=14):
    run, rise = .32, TOP / steps
    for i in range(steps):
        h = rise * (i + 1)
        box('step', (width, run, h), (0, i * run + run / 2, h / 2), 'GG_TurquoiseAccent', r=.015, seg=1)
    length = steps * run
    tilt = math.atan2(TOP, length)
    slope = length / math.cos(tilt)
    for s in (-1, 1):
        box('rail_glass', (.05, slope * .95, .7), (s * (width / 2 + .03), length / 2, TOP / 2 + .46), 'GG_GlassSoft', r=.01, seg=1, rot=(tilt, 0, 0))
        box('rail', (.1, slope, .08), (s * (width / 2 + .03), length / 2, TOP / 2 + .84), 'GG_IvorySoft', r=.035, rot=(tilt, 0, 0))
    add_socket('floor_above', (0, length, TOP))

@register('arch-terrain-tile', budget=2000)
def terrain_tile():
    box('soil', (W, D, .12), (0, 0, -.06), 'GG_IvorySoft', r=.02)
    box('grass', (W - .3, D - .3, .03), (0, 0, .01), 'GG_GreenFoliage', r=.015, corner=.3)
    add_socket('east', (W / 2, 0, 0))
    add_socket('west', (-W / 2, 0, 0))

@register('arch-pathway', budget=2000)
def pathway():
    box('path', (W, 1.6, .03), (0, 0, .015), 'GG_WarmInterior', r=.01, seg=1)
    for x in range(-2, 3):
        box('paver', (1.05, 1.3, .02), (x * 1.2, 0, .035), 'GG_IvorySoft', r=.008, seg=1)
    add_socket('east', (W / 2, 0, 0))
    add_socket('west', (-W / 2, 0, 0))

@register('arch-courtyard', budget=8000)
def courtyard():
    box('pad', (W + 2, D, .05), (0, 0, .025), 'GG_WarmInterior', r=.02, corner=.5)
    cyl('ring', 1.7, 1.7, .03, (0, 0, .05), 'GG_TurquoiseAccent', seg=40, bev=.01)
    cyl('ring_in', 1.45, 1.45, .035, (0, 0, .05), 'GG_IvorySoft', seg=40, bev=.01)
    for x, y in ((-3.2, 1.7), (3.2, 1.7)):
        box('planter', (1.4, .6, .45), (x, y, .27), 'GG_IvorySoft', r=.05, corner=.08)
        for i in range(3):
            ball('shrub', (.24,) * 3, (x - .4 + i * .4, y, .56), 'GG_GreenFoliage', sub=2, wobble=.05, seed=i)

@register('arch-planter', budget=2000)
def planter():
    w = 1.6
    box('base', (w, .62, .1), (0, 0, .05), 'GG_PurplePrimary', r=.03, corner=.08)
    box('body', (w - .04, .58, .4), (0, 0, .3), 'GG_IvorySoft', r=.04, corner=.08)
    for i in range(5):
        x = (i + .5) / 5 * (w - .25) - (w - .25) / 2
        ball('shrub', (.2, .2, .2 + (i % 2) * .05), (x, (-1) ** i * .07, .55), 'GG_GreenFoliage' if i % 3 else 'GG_GreenDark', sub=2, wobble=.05, seed=i)
