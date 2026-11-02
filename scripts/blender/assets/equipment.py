"""Educational equipment, modelled in Blender so moving parts stay separate and pivoted."""
import math

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
