"""Educational equipment, modelled in Blender so moving parts stay separate and pivoted."""
import math

import bmesh

from gg import geometry
from gg.geometry import At, ball, box, cyl, limb
from gg.sockets import register

def wheel(name, x, y, z):
    tyre = cyl(name, .062, .062, .036, (x, y, z), 'GG_TurquoiseAccent', seg=32, bev=.012, bev_seg=2, rot=(0, math.pi / 2, 0), centred=True)
    for part, r, h, mat in (('rim', .038, .04, 'GG_PurpleDark'), ('cap', .014, .05, 'GG_YellowAccent')):
        cyl(part, r, r, h, (0, 0, 0), mat, seg=20, bev=.004, centred=True).parent = tyre

def ribbon(a, b, c, steps=6):
    """Quadratic curve; segments overlap so the cable reads as one piece."""
    def at(t):
        return tuple((1 - t) ** 2 * p + 2 * t * (1 - t) * q + t ** 2 * r for p, q, r in zip(a, b, c))
    for i in range(steps):
        limb('cable', at(max(i - .1, 0) / steps), at(min(i + 1.1, steps) / steps), .007, 'GG_ShirtWhite', seg=6, round_ends=.1)

@register('equip-rover-spike', budget=5000)
def rover():
    # Everything connects: rails carry the bumper, an axle carries the wheels, struts carry the hub.
    for s in (-1, 1):
        box('rail', (.016, .27, .022), (s * .07, .0, .07), 'GG_TurquoiseAccent', r=.006)
        box('strut', (.018, .03, .15), (s * .072, -.012, .135), 'GG_PurpleDark', r=.006, rot=(-.42, 0, 0))
        box('bumper_side', (.018, .07, .018), (s * .137, -.105, .06), 'GG_YellowAccent', r=.006)
        ball('stud', (.008, .004, .008), (s * .1, -.144, .06), 'GG_PurpleDark', sub=2)
    box('bumper', (.292, .018, .018), (0, -.135, .06), 'GG_YellowAccent', r=.006)
    box('axle', (.25, .014, .014), (0, .02, .062), 'GG_PurpleDark', r=.005)
    box('beam', (.15, .018, .02), (0, .06, .075), 'GG_TurquoiseAccent', r=.006)
    box('sensor', (.05, .03, .03), (0, -.145, .04), 'GG_PurpleDark', r=.007)
    for s in (-1, 1):
        box('sensor_light', (.016, .004, .009), (s * .012, -.161, .042), 'GG_LightWarm', r=.002, seg=1)
    wheel('wheel_l', -.125, .02, .062)
    wheel('wheel_r', .125, .02, .062)
    with At((0, .03, .17), rx=-.42):
        box('block', (.1, .05, .11), (0, .04, 0), 'GG_YellowAccent', r=.012)
        box('hub', (.125, .035, .135), (0, 0, 0), 'GG_IvorySoft', r=.012)
        box('display', (.074, .004, .074), (0, -.0185, -.01), 'GG_PurpleDark', r=.003, seg=1)
        box('button', (.018, .006, .018), (.038, -.02, .05), 'GG_PurplePrimary', r=.004, seg=1)
        for i in range(3):
            for j in range(3):
                box('led', (.014, .003, .014), (-.02 + i * .02, -.0205, -.03 + j * .02), 'GG_LightWarm', r=0)
    # The head sits on its own node so it can pan; its neck reaches down into the hub.
    b = geometry.current()
    head = b.empty('head', b.root, (0, .09, .195))
    parts = [box('neck', (.012, .012, .085), (s * .018, .0, .04), 'GG_PurpleDark', r=.004) for s in (-1, 1)]
    parts.append(box('sensor_body', (.13, .05, .058), (0, -.01, .1), 'GG_IvorySoft', r=.018, seg=3))
    parts.append(box('sensor_back', (.13, .02, .05), (0, .022, .1), 'GG_PurpleDark', r=.012))
    parts.append(box('visor', (.1, .012, .03), (0, -.034, .1), 'GG_PurpleDark', r=.01))
    for s in (-1, 1):
        parts.append(ball('eye', (.012, .004, .012), (s * .028, -.041, .1), 'GG_LightWarm', sub=2))
    for part in parts:
        part.parent = head
    # Bundled white cables, the concept's most distinctive detail, from hub to chassis.
    ribbon((.065, -.005, .2), (.135, -.06, .15), (.075, -.03, .08))
    ribbon((.065, .02, .22), (.15, -.02, .16), (.075, .01, .08))
    ribbon((-.065, -.005, .2), (-.14, -.08, .13), (-.05, -.13, .07))

def attach(node, parts):
    """Parents already-local parts to a pivot node."""
    for part in parts:
        part.parent = node
    return node

def pivot(name, parent, loc):
    return geometry.current().empty(name, parent, loc)

@register('equip-rover-programmable', budget=5000)
def rover_programmable():
    box('body', (.2, .3, .09), (0, 0, .1), 'GG_OrangeAccent', r=.03, seg=3)
    box('cab', (.16, .14, .08), (0, .03, .18), 'GG_IvorySoft', r=.03, seg=3)
    box('visor', (.12, .01, .04), (0, -.04, .18), 'GG_PurpleDark', r=.008)
    for s in (-1, 1):
        ball('eye', (.014, .004, .014), (s * .03, -.047, .18), 'GG_LightWarm', sub=2)
    box('axle', (.3, .016, .016), (0, -.09, .06), 'GG_PurpleDark', r=.005)
    box('axle_rear', (.3, .016, .016), (0, .09, .06), 'GG_PurpleDark', r=.005)
    wheel('wheel_l', -.14, -.09, .062)
    wheel('wheel_r', .14, -.09, .062)
    wheel('wheel_rl', -.14, .09, .062)
    wheel('wheel_rr', .14, .09, .062)

@register('equip-electronics-kit', budget=5000)
def electronics_kit():
    box('board', (.36, .26, .02), (0, 0, .01), 'GG_IvorySoft', r=.012, corner=.02)
    box('chip', (.11, .09, .012), (0, 0, .026), 'GG_PurpleDark', r=.004)
    for i in range(3):
        for j in range(3):
            box('led', (.008, .008, .003), (-.018 + i * .018, -.018 + j * .018, .033), 'GG_LightWarm', r=0)
    for x, y, mat in ((-.13, .08, 'GG_TurquoiseAccent'), (.13, .08, 'GG_YellowAccent'), (.13, -.08, 'GG_OrangeAccent')):
        box('module', (.06, .06, .03), (x, y, .033), mat, r=.012, seg=3)
    limb('wire', (-.1, .08, .03), (-.05, .03, .03), .004, 'GG_OrangeAccent', seg=6)
    limb('wire', (.1, .08, .03), (.05, .03, .03), .004, 'GG_TurquoiseAccent', seg=6)
    cyl('knob', .025, .02, .03, (-.13, -.08, .02), 'GG_PurplePrimary', seg=14)

@register('equip-drone', budget=5000)
def drone():
    box('body', (.14, .22, .06), (0, 0, .1), 'GG_IvorySoft', r=.025, seg=3)
    box('top', (.06, .1, .012), (0, 0, .135), 'GG_YellowAccent', r=.005)
    box('visor', (.1, .012, .02), (0, -.11, .1), 'GG_ScreenEmissive', r=.006)
    cyl('camera', .025, .025, .03, (0, -.05, .05), 'GG_PurpleDark', seg=14)
    root = geometry.current().root
    for i, (x, y) in enumerate(((-.19, -.17), (.19, -.17), (-.19, .17), (.19, .17)), 1):
        limb('arm', (x * .2, y * .2, .1), (x, y, .1), .012, 'GG_IvorySoft', seg=8)
        cyl('ring', .1, .1, .018, (x, y, .092), 'GG_TurquoiseAccent', seg=24, bev=.006)
        cyl('motor', .018, .018, .05, (x, y, .08), 'GG_PurpleDark', seg=10)
        rotor = pivot(f'rotor_{i}', root, (x, y, .13))
        attach(rotor, [box('blade', (.17, .024, .006), (0, 0, 0), 'GG_YellowAccent', r=.002, seg=1)])

@register('equip-vr-set', budget=5000)
def vr_set():
    box('tray', (.5, .3, .012), (0, -.02, .006), 'GG_PurpleDark', r=.004, seg=1)
    box('stand', (.08, .08, .03), (0, 0, .025), 'GG_PurplePrimary', r=.01)
    box('visor', (.2, .1, .11), (0, 0, .08), 'GG_IvorySoft', r=.04, seg=3)
    box('lens', (.16, .012, .07), (0, -.05, .08), 'GG_PurpleDark', r=.015, seg=3)
    box('strap', (.015, .12, .03), (-.095, .08, .09), 'GG_PurplePrimary', r=.008)
    box('strap', (.015, .12, .03), (.095, .08, .09), 'GG_PurplePrimary', r=.008)
    box('strap_back', (.205, .015, .03), (0, .135, .09), 'GG_PurplePrimary', r=.006)
    for s in (-1, 1):
        box('grip', (.05, .05, .1), (s * .17, -.04, .05), 'GG_IvorySoft', r=.02, seg=3)
        cyl('ring', .06, .06, .014, (s * .17, -.04, .1), 'GG_TurquoiseAccent', seg=20, bev=.005)

@register('equip-vr-headset', budget=800)
def vr_headset():
    """Worn on the `vr_eyes` fitting point: eyes at the origin, 0.2 m wide, strap around the head."""
    box('visor', (.2, .09, .1), (0, -.065, 0), 'GG_IvorySoft', r=.035, seg=3)
    box('lens', (.17, .012, .07), (0, -.112, 0), 'GG_PurpleDark', r=.015, seg=3)
    for s in (-1, 1):
        box('strap', (.014, .2, .03), (s * .093, .02, .005), 'GG_PurplePrimary', r=.006)
    box('strap_back', (.2, .014, .03), (0, .117, .005), 'GG_PurplePrimary', r=.006)

@register('equip-vr-controller', budget=400)
def vr_controller():
    """Held at the `vr_grip_*` fitting points: the grip centred on the origin, 0.1 m tall."""
    box('grip', (.032, .032, .086), (0, 0, 0), 'GG_IvorySoft', r=.012, seg=3)
    cyl('ring', .036, .036, .014, (0, 0, .043), 'GG_TurquoiseAccent', seg=16, bev=.004)

@register('equip-vr-zone', budget=300)
def vr_zone():
    """A play zone marked on the floor: a flat turquoise ring 1.1 m across."""
    bm = bmesh.new()
    outer, inner = .55, .47
    ring = [(bm.verts.new((math.cos(a) * outer, math.sin(a) * outer, .006)), bm.verts.new((math.cos(a) * inner, math.sin(a) * inner, .006)))
            for a in (i * math.tau / 48 for i in range(48))]
    for (a, b), (c, d) in zip(ring, ring[1:] + ring[:1]):
        bm.faces.new((a, c, d, b))
    geometry.finish(bm, 'zone', 'GG_TurquoiseAccent', (0, 0, 0))

@register('equip-printer', budget=5000)
def printer():
    box('base', (.42, .4, .07), (0, 0, .035), 'GG_PurplePrimary', r=.02, corner=.04)
    box('back', (.42, .05, .36), (0, .175, .25), 'GG_IvorySoft', r=.02)
    for s in (-1, 1):
        box('side', (.05, .4, .36), (s * .185, 0, .25), 'GG_IvorySoft', r=.02)
    box('top', (.42, .4, .06), (0, 0, .46), 'GG_IvorySoft', r=.025)
    box('bed', (.26, .24, .02), (0, -.02, .1), 'GG_TurquoiseAccent', r=.008)
    cyl('bed_post', .03, .03, .04, (0, -.02, .06), 'GG_PurpleDark', seg=10)
    root = geometry.current().root
    head = pivot('head_printer', root, (0, 0, .34))
    attach(head, [box('rail', (.34, .018, .018), (0, 0, 0), 'GG_PurpleDark', r=.006), box('carriage', (.07, .05, .06), (0, 0, -.02), 'GG_PurplePrimary', r=.012),
                  cyl('nozzle', .012, .004, .03, (0, 0, -.08), 'GG_YellowAccent', seg=8, rot=(0, 0, 0))])
    cyl('spool', .1, .1, .05, (-.24, 0, .25), 'GG_OrangeAccent', seg=20, bev=.008, rot=(0, math.pi / 2, 0))

@register('equip-laptop', budget=5000)
def laptop():
    box('base', (.34, .24, .018), (0, 0, .009), 'GG_PurplePrimary', r=.008, corner=.012)
    box('keys', (.28, .1, .004), (0, .03, .019), 'GG_IvorySoft', r=.001, seg=1)
    box('pad', (.08, .05, .003), (0, -.07, .019), 'GG_TurquoiseAccent', r=.001, seg=1)
    root = geometry.current().root
    lid = pivot('lid', root, (0, .12, .018))
    attach(lid, [box('shell', (.34, .012, .23), (0, 0, .11), 'GG_PurplePrimary', r=.006, rot=(.2, 0, 0)),
                 box('display', (.3, .004, .19), (.0, -.0085, .11), 'GG_ScreenEmissive', r=.002, seg=1, rot=(.2, 0, 0))])

def screen_stand():
    box('frame', (1.5, .08, .9), (0, 0, 1.1), 'GG_PurplePrimary', r=.05, seg=3)
    box('tray', (.5, .04, .03), (0, -.05, .66), 'GG_IvorySoft', r=.012)
    for s in (-1, 1):
        box('leg', (.07, .07, .68), (s * .5, 0, .36), 'GG_IvorySoft', r=.02)
        box('foot', (.09, .36, .05), (s * .5, 0, .05), 'GG_IvorySoft', r=.02)
        cyl('caster', .03, .03, .03, (s * .5, 0, 0), 'GG_PurplePrimary', seg=10)

@register('equip-screen', budget=5000)
def screen():
    screen_stand()
    box('display', (1.34, .012, .74), (0, -.043, 1.1), 'GG_ScreenEmissive', r=.008, seg=1)

@register('equip-screen-vr', budget=1500)
def screen_vr():
    """The VR room's screen shows what a headset sees: a bright little world, readable from the campus."""
    screen_stand()
    box('display', (1.34, .012, .74), (0, -.043, 1.1), 'GG_TurquoiseAccent', r=.008, seg=1)
    # Three-sided discs turned to face the room, apex up; their bases hide behind the meadow.
    cyl('peak', .3, .3, .006, (-.3, -.051, 1.0), 'GG_PurplePrimary', seg=3, bev=.002, rot=(math.pi / 2, 0, 0), centred=True)
    cyl('peak', .22, .22, .006, (.05, -.05, .95), 'GG_PurpleDark', seg=3, bev=.002, rot=(math.pi / 2, 0, 0), centred=True)
    box('meadow', (1.32, .008, .16), (0, -.053, .8), 'GG_GreenFoliage', r=.006, seg=1)
    cyl('sun', .1, .1, .006, (.42, -.05, 1.27), 'GG_YellowAccent', seg=20, bev=.002, rot=(math.pi / 2, 0, 0), centred=True)

@register('equip-arm', budget=5000)
def robot_arm():
    box('base', (.3, .3, .07), (0, 0, .035), 'GG_IvorySoft', r=.025, corner=.05)
    cyl('turret', .1, .085, .05, (0, 0, .07), 'GG_TurquoiseAccent', seg=20)
    root = geometry.current().root
    base = pivot('joint_base', root, (0, 0, .12))
    shoulder = pivot('joint_shoulder', base, (0, 0, .03))
    attach(shoulder, [box('upper', (.06, .06, .22), (0, 0, .11), 'GG_YellowAccent', r=.022), cyl('hinge', .045, .045, .08, (0, 0, 0), 'GG_TurquoiseAccent', seg=16, rot=(0, math.pi / 2, 0), centred=True)])
    elbow = pivot('joint_elbow', shoulder, (0, 0, .22))
    attach(elbow, [box('fore', (.05, .2, .05), (0, -.1, 0), 'GG_YellowAccent', r=.02), cyl('hinge', .04, .04, .07, (0, 0, 0), 'GG_TurquoiseAccent', seg=16, rot=(0, math.pi / 2, 0), centred=True)])
    for s in (-1, 1):
        attach(elbow, [box('claw', (.016, .07, .022), (s * .02, -.22, 0), 'GG_OrangeAccent', r=.007, rot=(0, 0, s * .25))])

@register('equip-organizer', budget=5000)
def organizer():
    box('tray', (.6, .34, .06), (0, 0, .03), 'GG_PurplePrimary', r=.02, corner=.03)
    for i, mat in enumerate(('GG_TurquoiseAccent', 'GG_OrangeAccent', 'GG_YellowAccent')):
        box('bin', (.17, .26, .08), (-.19 + i * .19, 0, .09), mat, r=.015)

@register('equip-kit-storage', budget=5000)
def kit_storage():
    box('body', (.8, .4, .9), (0, 0, .49), 'GG_IvorySoft', r=.04, seg=3)
    for z, mat in ((.26, 'GG_OrangeAccent'), (.5, 'GG_TurquoiseAccent'), (.74, 'GG_PurplePrimary')):
        box('bin', (.66, .06, .18), (0, -.19, z), mat, r=.02)
    for s in (-1, 1):
        box('foot', (.1, .34, .05), (s * .3, 0, .025), 'GG_PurplePrimary', r=.015)
