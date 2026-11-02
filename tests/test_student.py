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

class StudentLod(unittest.TestCase):
    def test_campus_distance_model_shares_clips_and_height(self):
        m = build('char-student-primary-lod1')
        self.assertLessEqual(m['triangles'], 1500)
        self.assertEqual(sorted(m['animations']), ['idle', 'interact', 'sit', 'walk'])
        self.assertAlmostEqual(m['size_m'][1], 1.35, delta=.02)

class Variants(unittest.TestCase):
    HEIGHTS = {'char-student-pre': 1.1, 'char-student-primary-boy': 1.35, 'char-student-basico': 1.5, 'char-student-bach': 1.58, 'char-teacher': 1.75}

    def test_each_variant_is_in_budget_at_height_with_all_clips(self):
        for asset, height in self.HEIGHTS.items():
            for suffix, budget in (('', 6000), ('-lod1', 1500)):
                m = build(asset + suffix)
                self.assertLessEqual(m['triangles'], budget, asset + suffix)
                self.assertAlmostEqual(m['size_m'][1], height, delta=.02, msg=asset + suffix)
                self.assertEqual(sorted(m['animations']), ['idle', 'interact', 'sit', 'walk'], asset + suffix)
                self.assertEqual(m['skins'], 1, asset + suffix)

if __name__ == '__main__':
    unittest.main()
