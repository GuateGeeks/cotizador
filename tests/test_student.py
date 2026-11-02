import unittest
from tests.test_slice_assets import build

class Student(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.m = build('char-student-primary')

    def test_within_budget(self):
        self.assertLessEqual(self.m['triangles'], 6000)

    def test_height_is_contract_height(self):
        self.assertAlmostEqual(self.m['size_m'][1], 1.35, delta=.01)

    def test_has_all_clips_on_one_skeleton(self):
        self.assertEqual(sorted(self.m['animations']), ['idle', 'interact', 'sit', 'walk'])
        self.assertEqual(self.m['skins'], 1)

if __name__ == '__main__':
    unittest.main()
