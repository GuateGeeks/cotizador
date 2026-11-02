"""Reusable furniture. Sized for a primary student at 1.35 m."""
from gg.geometry import ball, box, cyl
from gg.sockets import register

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
