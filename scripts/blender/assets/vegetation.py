"""Seeded vegetation: the same seed always yields the same geometry."""
import random

from gg.geometry import ball, cyl, limb
from gg.sockets import register

def tree(seed, scale=1.0):
    rng = random.Random(seed)
    cyl('trunk', .24 * scale, .13 * scale, 1.9 * scale, (0, 0, 0), 'GG_Wood', seg=10, bev=.03)
    blobs = ((0, 0, 3.0, .95), (-.75, .1, 2.45, .72), (.8, -.1, 2.55, .78), (.1, -.65, 2.3, .62))
    for i, (x, y, z, r) in enumerate(blobs):
        x, y, z = (v * scale + rng.uniform(-.14, .14) for v in (x, y, z))
        r *= rng.uniform(.92, 1.08)
        if i:
            limb('branch', (0, 0, 1.45 * scale), (x * .75, y * .75, z - .35 * scale), .07 * scale, 'GG_Wood', seg=6)
        ball('canopy', (r * scale,) * 3, (x, y, z), 'GG_GreenDark' if i == 3 else 'GG_GreenFoliage', wobble=.07, seed=seed + i)

@register('veg-tree-large', budget=1500)
def tree_large():
    tree(3)

@register('veg-tree-large-alt', budget=1500)
def tree_large_alt():
    tree(7)
