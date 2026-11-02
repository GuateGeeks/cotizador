"""Modular school kit. Every dimension comes from the shared contract."""
import json, math, pathlib

import bpy

from gg import geometry
from gg.geometry import arch, box
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

def classroom_shell(left_open=True, right_open=True):
    box('slab', (W, D, BASE), (0, 0, BASE / 2), 'GG_PurplePrimary', r=.06, corner=.14)
    box('floor', (W - .3, D - .3, .03), (0, 0, BASE + .01), 'GG_WarmInterior', r=.01, seg=1)
    box('wall_back', (W, T, H), (0, D / 2 - T / 2, BASE + H / 2), 'GG_IvorySoft', r=.04)
    box('accent_back', (W - .5, .03, 1.2), (0, D / 2 - T - .015, BASE + 2.2), 'GG_PurplePrimary', r=.01, seg=1)
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

@register('arch-roof', budget=2000)
def roof():
    box('roof', (W, D + .5, .34), (0, 0, .17), 'GG_PurplePrimary', r=.08)
    box('deck', (W - .5, D - .4, .05), (0, 0, .355), 'GG_PurpleDark', r=.02, corner=.2)
    add_socket('floor_below', (0, 0, 0))

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
