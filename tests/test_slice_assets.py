import json, pathlib, shutil, unittest
from scripts.world import ROOT, native, run_blender

TMP = ROOT / 'runs' / 'test-tmp' / 'assets'

def glb_json(path):
    data = pathlib.Path(path).read_bytes()
    length = int.from_bytes(data[12:16], 'little')
    return json.loads(data[20:20 + length])

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

    def test_walk_keeps_planted_feet_still_and_lifts_the_others(self):
        m = build('equip-dino')
        # Feet on the floor move with the floor while the body walks at the clip's average speed.
        self.assertLess(m['foot_slip'], .1)
        self.assertGreaterEqual(m['foot_lift'], .01)

    def test_walk_clip_lasts_exactly_one_loop(self):
        build('equip-dino')
        doc = glb_json(TMP / 'a' / 'equip-dino.glb')
        walk = next(a for a in doc['animations'] if a['name'] == 'walk')
        times = [doc['accessors'][s['input']] for s in walk['samplers']]
        self.assertAlmostEqual(min(t['min'][0] for t in times), 0, places=4)
        self.assertAlmostEqual(max(t['max'][0] for t in times), build('equip-dino')['walk_seconds'], places=3)

class Tablet(unittest.TestCase):
    def test_tablet_is_small_flat_and_one_piece(self):
        m = build('equip-tablet')
        self.assertAlmostEqual(m['size_m'][0], .24, delta=.01)
        self.assertLess(m['size_m'][1], .03)
        self.assertEqual(m['islands'], 1)

class Workbench(unittest.TestCase):
    def test_workbench_is_a_lab_bench_at_working_height(self):
        m = build('furn-workbench')
        self.assertAlmostEqual(m['size_m'][0], 2.0, delta=.05)
        self.assertAlmostEqual(m['size_m'][2], .7, delta=.05)
        self.assertGreater(m['size_m'][1], 1.1)  # pegboard rises above the top
        self.assertAlmostEqual(m['sockets']['socket_top'][1], .75, places=3)
        self.assertLessEqual(m['triangles'], 1500)
        self.assertEqual(m['islands'], 1)

class PrinterHead(unittest.TestCase):
    def test_only_the_carriage_moves_so_the_rail_stays_inside_the_case(self):
        build('equip-printer')
        doc = glb_json(TMP / 'a' / 'equip-printer.glb')
        nodes = doc['nodes']
        head = next(n for n in nodes if n.get('name') == 'head_printer')
        reach, stack = 0, [(c, 0.0) for c in head.get('children', [])]
        while stack:
            index, offset = stack.pop()
            node = nodes[index]
            x = offset + node.get('translation', [0, 0, 0])[0]
            if 'mesh' in node:
                for primitive in doc['meshes'][node['mesh']]['primitives']:
                    bounds = doc['accessors'][primitive['attributes']['POSITION']]
                    reach = max(reach, abs(x + bounds['min'][0]), abs(x + bounds['max'][0]))
            stack.extend((c, x) for c in node.get('children', []))
        self.assertLessEqual(reach, .05)  # the 0.34 m rail would reach 0.17

class LabStations(unittest.TestCase):
    def test_short_bench_matches_the_long_one_without_a_pegboard(self):
        m = build('furn-workbench-short')
        self.assertAlmostEqual(m['size_m'][0], 1.4, delta=.05)
        self.assertAlmostEqual(m['size_m'][2], .7, delta=.05)
        self.assertLess(m['size_m'][1], .9)  # no pegboard above the worktop
        self.assertAlmostEqual(m['sockets']['socket_top'][1], .75, places=3)
        self.assertLessEqual(m['triangles'], 1200)
        self.assertEqual(m['islands'], 1)

    def test_stool_seats_at_chair_height(self):
        m = build('furn-stool')
        self.assertAlmostEqual(m['size_m'][1], .30, delta=.02)
        self.assertLessEqual(m['triangles'], 400)
        self.assertEqual(m['islands'], 1)

    def test_printing_props_are_small_and_whole(self):
        for asset, budget in (('equip-spool-rack', 700), ('equip-printed-parts', 500)):
            m = build(asset)
            self.assertLessEqual(m['triangles'], budget, asset)
            self.assertLessEqual(max(m['size_m']), .45, asset)
            self.assertEqual(m['islands'], 1, asset)

if __name__ == '__main__':
    unittest.main()
