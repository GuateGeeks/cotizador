import pathlib, sys, unittest
sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent.parent / 'scripts/asset-validation'))
from sockets import check_pair
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

if __name__ == '__main__':
    unittest.main()
