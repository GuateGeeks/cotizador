"""Reusable furniture. Sized for a primary student at 1.35 m."""
from gg.geometry import ball, box, cyl
from gg.sockets import add_socket, register

def chair(color):
    box('seat', (.44, .42, .07), (0, 0, .265), color, r=.03, seg=3)
    box('back', (.42, .06, .32), (0, .2, .51), color, r=.03)
    for s in (-1, 1):
        box('upright', (.032, .032, .22), (s * .15, .19, .36), 'GG_PurplePrimary', r=.012, seg=1)
    box('back_hole', (.14, .07, .04), (0, .2, .6), 'GG_PurpleDark', r=.015)
    for x, y in ((-.17, -.16), (.17, -.16), (-.17, .16), (.17, .16)):
        cyl('leg', .027, .036, .21, (x, y, .03), 'GG_PurplePrimary', seg=8)
        cyl('foot', .04, .04, .04, (x, y, 0), 'GG_IvorySoft', seg=8, bev=0)

@register('furn-chair-orange', budget=1000)
def chair_orange():
    chair('GG_OrangeAccent')

@register('furn-chair-turquoise', budget=1000)
def chair_turquoise():
    chair('GG_TurquoiseAccent')

@register('furn-table-four', budget=1000)
def table_four():
    box('top', (1.3, 1.3, .08), (0, 0, .56), 'GG_IvorySoft', r=.035, corner=.1)
    box('inlay', (.24, .24, .012), (0, 0, .602), 'GG_PurplePrimary', r=.004, seg=1)
    for x, y in ((-.54, -.54), (.54, -.54), (-.54, .54), (.54, .54)):
        cyl('leg', .04, .05, .49, (x, y, .03), 'GG_PurplePrimary', seg=10)
        cyl('foot', .055, .055, .04, (x, y, 0), 'GG_IvorySoft', seg=10, bev=.01)

def bench_frame(W, D=.7, TOP=.75):
    """Worktop, front edge, lower shelf and legs shared by the lab benches."""
    box('top', (W, D, .05), (0, 0, TOP - .025), 'GG_IvorySoft', r=.02)
    box('edge', (W, .03, .06), (0, -D / 2 + .015, TOP - .03), 'GG_PurplePrimary', r=.012)
    box('shelf', (W - .12, D - .12, .03), (0, 0, .18), 'GG_PurplePrimary', r=.01)
    for x in (-W / 2 + .06, W / 2 - .06):
        for y in (-D / 2 + .06, D / 2 - .06):
            box('leg', (.05, .05, TOP - .05), (x, y, (TOP - .05) / 2), 'GG_PurplePrimary', r=.012)
    return W, D, TOP

@register('furn-workbench-short', budget=1200)
def workbench_short():
    """A 1.4 m station bench for the side walls: a low upstand instead of the pegboard, so windows stay clear."""
    W, D, TOP = bench_frame(1.4)
    box('upstand', (W, .03, .1), (0, D / 2 - .015, TOP + .05), 'GG_PurpleDark', r=.01)
    add_socket('top', (0, 0, TOP))

@register('furn-stool', budget=400)
def stool():
    """A lab stool whose seat top is at 0.30 m, like the classroom chairs."""
    cyl('seat', .16, .16, .05, (0, 0, .25), 'GG_TurquoiseAccent', seg=14, bev=.012)
    for x, y in ((-.1, -.1), (.1, -.1), (-.1, .1), (.1, .1)):
        cyl('leg', .016, .02, .26, (x, y, 0), 'GG_PurplePrimary', seg=6, bev=0)
    for a, b in (((-.1, -.1), (.1, -.1)), ((.1, -.1), (.1, .1)), ((.1, .1), (-.1, .1)), ((-.1, .1), (-.1, -.1))):
        box('ring', (abs(a[0] - b[0]) + .02 or .02, abs(a[1] - b[1]) + .02 or .02, .015), ((a[0] + b[0]) / 2, (a[1] + b[1]) / 2, .1), 'GG_PurpleDark', r=.004, seg=1)

@register('furn-workbench', budget=1500)
def workbench():
    """The Electronics lab bench: worktop at 0.75 m, a pegboard back with tools, a shelf below."""
    W, D, TOP = bench_frame(2.0)
    board_h = .58
    box('pegboard', (W, .03, board_h), (0, D / 2 - .015, TOP + board_h / 2), 'GG_PurpleDark', r=.015)
    for i in range(6):
        for j in range(2):
            box('peg', (.016, .006, .016), (-W / 2 + .25 + i * .3, D / 2 - .033, TOP + .16 + j * .3), 'GG_IvorySoft', r=0, seg=1)
    # Tools hanging on the board: a wrench, pliers handles and a coil of wire.
    box('wrench', (.03, .015, .2), (-.6, D / 2 - .04, TOP + .32), 'GG_OrangeAccent', r=.008)
    for s in (-1, 1):
        box('pliers', (.022, .015, .16), (.05 + s * .02, D / 2 - .04, TOP + .3), 'GG_TurquoiseAccent', r=.008, rot=(0, s * .15, 0))
    cyl('wire', .07, .07, .03, (.65, D / 2 - .045, TOP + .33), 'GG_YellowAccent', seg=16, bev=.008, rot=(1.5708, 0, 0), centred=True)
    add_socket('top', (0, 0, TOP))

@register('furn-shelves', budget=1000)
def shelves():
    box('back', (1, .05, 1.2), (0, .14, .6), 'GG_Wood', r=.02)
    for z in (.05, .42, .79, 1.16):
        box('board', (1, .32, .04), (0, 0, z), 'GG_IvorySoft', r=.012, seg=1)
    for s in (-1, 1):
        box('side', (.05, .32, 1.2), (s * .5, 0, .6), 'GG_IvorySoft', r=.015)
    for z, x, mat in ((.13, -.2, 'GG_OrangeAccent'), (.5, .2, 'GG_TurquoiseAccent'), (.87, -.1, 'GG_PurplePrimary')):
        box('bin', (.4, .22, .14), (x, -.02, z), mat, r=.02)

@register('furn-whiteboard', budget=1000)
def whiteboard():
    box('board', (1.2, .05, .8), (0, 0, 1), 'GG_IvorySoft', r=.02)
    box('frame', (1.26, .03, .86), (0, .015, 1), 'GG_PurplePrimary', r=.012)
    box('tray', (.5, .06, .025), (0, -.03, .59), 'GG_YellowAccent', r=.01)
    for s in (-1, 1):
        box('leg', (.05, .05, .62), (s * .45, 0, .32), 'GG_PurplePrimary', r=.015)
        box('foot', (.06, .36, .04), (s * .45, 0, .04), 'GG_PurplePrimary', r=.015)

@register('furn-laptop-desk', budget=1000)
def laptop_desk():
    box('top', (1.2, .55, .06), (0, 0, .57), 'GG_IvorySoft', r=.025, corner=.05)
    for s in (-1, 1):
        box('side', (.06, .5, .54), (s * .54, 0, .27), 'GG_PurplePrimary', r=.02)

@register('furn-equipment-table', budget=1000)
def equipment_table():
    box('top', (1.6, .8, .07), (0, 0, .57), 'GG_IvorySoft', r=.025, corner=.06)
    box('shelf', (1.4, .6, .04), (0, 0, .2), 'GG_TurquoiseAccent', r=.015)
    for x, y in ((-.7, -.32), (.7, -.32), (-.7, .32), (.7, .32)):
        cyl('leg', .035, .04, .54, (x, y, 0), 'GG_PurplePrimary', seg=10)

@register('furn-bench', budget=1000)
def bench():
    box('seat', (1.5, .4, .1), (0, 0, .38), 'GG_OrangeAccent', r=.03, seg=3)
    for s in (-1, 1):
        box('end', (.26, .44, .34), (s * .62, 0, .17), 'GG_PurplePrimary', r=.05, seg=3)

@register('furn-lamp', budget=1000)
def lamp():
    cyl('base', .17, .13, .16, (0, 0, 0), 'GG_PurplePrimary', bev=.03)
    cyl('post', .045, .045, 1.56, (0, 0, .16), 'GG_PurplePrimary')
    ball('glow', (.11, .11, .12), (0, 0, 1.72), 'GG_LightWarm', sub=2)
    cyl('cap', .19, .05, .13, (0, 0, 1.8), 'GG_PurplePrimary')

@register('furn-tile-paving', budget=1000)
def tile_paving():
    box('rim', (2, 2, .1), (0, 0, .05), 'GG_PurplePrimary', r=.03, corner=.28)
    box('stone', (1.78, 1.78, .03), (0, 0, .1), 'GG_IvorySoft', r=.01, corner=.2)
