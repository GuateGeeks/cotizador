import json, pathlib, sys, unittest
sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent.parent / 'scripts/asset-validation'))
from sockets import check_pair
from scripts.world import ROOT
from tests.test_slice_assets import build

class Sockets(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.room = build('arch-classroom-standard')
        cls.entry = build('arch-entrance')
        cls.roof = build('arch-roof')

    def test_rooms_meet_side_by_side(self):
        self.assertLessEqual(check_pair(self.room, 'socket_east', self.room, 'socket_west'), .001)

    def test_entrance_meets_room(self):
        self.assertLessEqual(check_pair(self.entry, 'socket_east', self.room, 'socket_west'), .001)

    def test_upper_floor_stacks_on_room(self):
        self.assertLessEqual(check_pair(self.room, 'socket_floor_above', self.room, 'socket_floor_below'), .001)

    def test_roof_sits_on_room_without_crossing_the_bay(self):
        self.assertLessEqual(check_pair(self.room, 'socket_floor_above', self.roof, 'socket_floor_below'), .001)
        self.assertLessEqual(self.roof['size_m'][0], 6.0)

    def test_shell_excludes_furniture_and_fits_budget(self):
        self.assertEqual(self.room['size_m'], [6.0, 3.2, 5.0])
        self.assertLessEqual(self.room['triangles'], 8000)

class FullKit(unittest.TestCase):
    MODULES = ('terrain-tile', 'classroom-standard', 'classroom-expandable', 'classroom-corner', 'classroom-end', 'classroom-upper',
               'roof', 'support', 'entrance', 'corridor', 'stairs', 'bridge', 'courtyard', 'planter', 'pathway', 'balcony')

    @classmethod
    def setUpClass(cls):
        cls.kit = {f'arch-{m}': build(f'arch-{m}', 'kit') for m in cls.MODULES}

    def test_every_declared_pair_closes(self):
        pairs = json.loads((ROOT / 'world/sockets.json').read_text())['pairs']
        self.assertGreaterEqual(len(pairs), 15)
        for a, sa, b, sb in pairs:
            self.assertLessEqual(check_pair(self.kit[a], sa, self.kit[b], sb), .001, f'{a} {sa} -> {b} {sb}')

    def test_every_module_stays_in_budget_and_connected(self):
        for asset, manifest in self.kit.items():
            self.assertLessEqual(manifest['triangles'], 8000, asset)
            self.assertEqual(manifest['islands'], 1, asset)

    def test_stairs_reach_exactly_one_floor(self):
        self.assertAlmostEqual(self.kit['arch-stairs']['sockets']['socket_floor_above'][1], 3.2, places=3)

class Skyline(unittest.TestCase):
    ROOFS = ('flat', 'pitched', 'barrel', 'tower', 'terrace', 'garden')

    @classmethod
    def setUpClass(cls):
        cls.room = build('arch-classroom-standard', 'sky')
        cls.parts = {name: build(f'arch-{name}', 'sky') for name in [f'roof-{r}' for r in cls.ROOFS] + ['archway', 'pocket-garden', 'roof-trim', 'gallery', 'stairs-upper', 'courtyard-tree']}

    def test_roofs_fit_the_bay_budget_and_sit_on_the_room(self):
        for roof in self.ROOFS:
            m = self.parts[f'roof-{roof}']
            self.assertLessEqual(m['triangles'], 1500, roof)
            self.assertEqual(m['islands'], 1, roof)
            self.assertLessEqual(m['size_m'][0], 6.0, roof)
            self.assertLessEqual(check_pair(self.room, 'socket_floor_above', m, 'socket_floor_below'), .001, roof)

    def test_details_are_connected_and_light(self):
        for name in ('archway', 'pocket-garden', 'roof-trim', 'gallery', 'stairs-upper', 'courtyard-tree'):
            self.assertLessEqual(self.parts[name]['triangles'], 2000, name)
            self.assertEqual(self.parts[name]['islands'], 1, name)

    def test_gallery_spans_the_stagger(self):
        self.assertAlmostEqual(self.parts['gallery']['size_m'][2], 3.9, places=2)

    def test_upper_stairs_rise_one_floor(self):
        self.assertAlmostEqual(self.parts['stairs-upper']['sockets']['socket_floor_above'][1], 3.2, places=3)

if __name__ == '__main__':
    unittest.main()
