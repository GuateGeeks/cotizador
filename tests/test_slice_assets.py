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
    EQUIPMENT = {'equip-rover-programmable': ('wheel_l', 'wheel_r'), 'equip-dino': ('joint_neck', 'joint_tail'), 'equip-electronics-kit': (),
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

if __name__ == '__main__':
    unittest.main()
