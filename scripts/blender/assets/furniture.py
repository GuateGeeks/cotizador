"""Reusable furniture. Sized for a primary student at 1.35 m."""
from gg.geometry import box, cyl
from gg.sockets import register

def chair(color):
    box('seat', (.44, .42, .07), (0, 0, .41), color, r=.03, seg=3)
    box('back', (.42, .06, .32), (0, .2, .66), color, r=.03)
    for s in (-1, 1):
        box('upright', (.032, .032, .22), (s * .15, .19, .5), 'GG_PurplePrimary', r=.012, seg=1)
    box('back_hole', (.14, .07, .04), (0, .2, .75), 'GG_PurpleDark', r=.015)
    for x, y in ((-.17, -.16), (.17, -.16), (-.17, .16), (.17, .16)):
        cyl('leg', .027, .036, .36, (x, y, .03), 'GG_PurplePrimary', seg=8)
        cyl('foot', .04, .04, .04, (x, y, 0), 'GG_IvorySoft', seg=8, bev=0)

@register('furn-chair-orange', budget=1000)
def chair_orange():
    chair('GG_OrangeAccent')

@register('furn-chair-turquoise', budget=1000)
def chair_turquoise():
    chair('GG_TurquoiseAccent')

@register('furn-table-four', budget=1000)
def table_four():
    box('top', (1.3, 1.3, .08), (0, 0, .68), 'GG_IvorySoft', r=.035, corner=.1)
    box('inlay', (.24, .24, .012), (0, 0, .722), 'GG_PurplePrimary', r=.004, seg=1)
    for x, y in ((-.54, -.54), (.54, -.54), (-.54, .54), (.54, .54)):
        cyl('leg', .04, .05, .6, (x, y, .03), 'GG_PurplePrimary', seg=10)
        cyl('foot', .055, .055, .04, (x, y, 0), 'GG_IvorySoft', seg=10, bev=.01)
