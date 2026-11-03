import json, pathlib, shutil, unittest
from scripts.world import ROOT, native, run_blender

TMP = ROOT / 'runs' / 'test-tmp' / 'assets'

def build(asset, sub='a'):
    out = TMP / sub
    out.mkdir(parents=True, exist_ok=True)
    run_blender('build', asset, native(out), '--no-preview')
    return json.loads((ROOT / 'assets/manifests' / f'{asset}.json').read_text())

class Furniture(unittest.TestCase):
    def test_chairs_fit_the_furniture_budget(self):
        for asset in ('furn-chair-orange', 'furn-chair-turquoise'):
            self.assertLessEqual(build(asset)['triangles'], 1000)

    def test_table_excludes_chairs(self):
        manifest = build('furn-table-four')
        self.assertLessEqual(manifest['size_m'][0], 1.31)
        self.assertLessEqual(manifest['triangles'], 1000)

class Trees(unittest.TestCase):
    def test_tree_budget_and_seed_are_deterministic(self):
        first = build('veg-tree-large', 'a')
        again = build('veg-tree-large', 'b')
        other = build('veg-tree-large-alt', 'c')
        self.assertLessEqual(first['triangles'], 1500)
        self.assertEqual(first['sha256'], again['sha256'])
        self.assertNotEqual(first['sha256'], other['sha256'])

class Connected(unittest.TestCase):
    def test_no_floating_parts(self):
        for asset in ('furn-chair-orange', 'equip-rover-spike'):
            self.assertEqual(build(asset).get('islands'), 1, asset)

class Library(unittest.TestCase):
    EQUIPMENT = {'equip-rover-programmable': ('wheel_l', 'wheel_r'), 'equip-dino': (), 'equip-electronics-kit': (),
                 'equip-drone': ('rotor_1', 'rotor_2', 'rotor_3', 'rotor_4'), 'equip-vr-set': (), 'equip-printer': ('head_printer',),
                 'equip-laptop': ('lid',), 'equip-screen': (), 'equip-arm': ('joint_base', 'joint_shoulder', 'joint_elbow'),
                 'equip-organizer': (), 'equip-kit-storage': ()}

    def test_equipment_budgets_and_pivots(self):
        for asset, pivots in self.EQUIPMENT.items():
            m = build(asset, 'lib')
            self.assertLessEqual(m['triangles'], 5000, asset)
            self.assertEqual(m['islands'], 1, asset)
            for pivot in pivots:
                self.assertIn(pivot, m['pivots'], asset)

    def test_furniture_and_vegetation(self):
        budgets = {'furn-shelves': 1000, 'furn-whiteboard': 1000, 'furn-laptop-desk': 1000, 'furn-equipment-table': 1000, 'furn-bench': 1000,
                   'furn-lamp': 1000, 'furn-tile-paving': 1000, 'veg-tree-small': 1500, 'veg-shrub': 500, 'veg-flowers': 500}
        for asset, budget in budgets.items():
            m = build(asset, 'lib')
            self.assertLessEqual(m['triangles'], budget, asset)
            self.assertEqual(m['islands'], 1, asset)

class Rover(unittest.TestCase):
    def test_rover_budget_and_pivots(self):
        manifest = build('equip-rover-spike')
        self.assertGreaterEqual(manifest['triangles'], 2000)
        self.assertLessEqual(manifest['triangles'], 5000)
        pivots = manifest['pivots']
        self.assertIn('head', pivots)
        for wheel in ('wheel_l', 'wheel_r'):
            at, centre = pivots[wheel]['position'], pivots[wheel]['centre']
            self.assertLess(max(abs(a - b) for a, b in zip(at, centre)), .001)

class VrGear(unittest.TestCase):
    def test_gear_is_sized_for_the_fitting_points_and_in_budget(self):
        headset, controller = build('equip-vr-headset'), build('equip-vr-controller')
        self.assertAlmostEqual(headset['size_m'][0], .2, delta=.01)
        self.assertAlmostEqual(controller['size_m'][1], .1, delta=.01)
        for m, budget in ((headset, 800), (controller, 400)):
            self.assertLessEqual(m['triangles'], budget)
            self.assertEqual(m['islands'], 1)

    def test_room_pieces_match_what_they_replace(self):
        zone, screen, old = build('equip-vr-zone'), build('equip-screen-vr'), build('equip-screen')
        self.assertAlmostEqual(zone['size_m'][0], 1.1, delta=.02)
        self.assertLessEqual(zone['size_m'][1], .012)
        self.assertEqual([round(v, 2) for v in screen['size_m']], [round(v, 2) for v in old['size_m']])
        self.assertLessEqual(screen['triangles'], 1500)

class KitDino(unittest.TestCase):
    def test_kit_dinosaur_is_one_skinned_mesh_with_a_walk(self):
        m = build('equip-dino')
        self.assertEqual(m['materials'], ['GG_KitVertex'])
        self.assertEqual(m['skins'], 1)
        self.assertEqual(m['animations'], ['walk'])
        self.assertLessEqual(m['triangles'], 5000)
        self.assertAlmostEqual(m['size_m'][2], .77, delta=.1)  # length along glTF Z
        self.assertGreater(m['stride'], .1)
        self.assertLess(m['stride'], .5)
        self.assertGreater(m['walk_seconds'], .8)

if __name__ == '__main__':
    unittest.main()
