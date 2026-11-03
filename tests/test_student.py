import json, math, unittest
from tests.test_slice_assets import ROOT, build

CLIPS = ['hold', 'idle', 'interact', 'sit', 'vr', 'walk']

class Student(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.m = build('char-student-primary')

    def test_within_budget(self):
        self.assertLessEqual(self.m['triangles'], 6000)

    def test_height_is_contract_height(self):
        self.assertAlmostEqual(self.m['size_m'][1], 1.35, delta=.01)

    def test_has_all_clips_on_one_skeleton(self):
        self.assertEqual(sorted(self.m['animations']), CLIPS)
        self.assertEqual(self.m['skins'], 1)

class StudentLod(unittest.TestCase):
    def test_campus_distance_model_shares_clips_and_height(self):
        m = build('char-student-primary-lod1')
        self.assertLessEqual(m['triangles'], 1500)
        self.assertEqual(sorted(m['animations']), CLIPS)
        self.assertAlmostEqual(m['size_m'][1], 1.35, delta=.02)

class Variants(unittest.TestCase):
    HEIGHTS = {'char-student-pre': 1.1, 'char-student-primary-boy': 1.35, 'char-student-basico': 1.5, 'char-student-bach': 1.58, 'char-teacher': 1.75}

    def test_each_variant_is_in_budget_at_height_with_all_clips(self):
        for asset, height in self.HEIGHTS.items():
            for suffix, budget in (('', 6000), ('-lod1', 1500)):
                m = build(asset + suffix)
                self.assertLessEqual(m['triangles'], budget, asset + suffix)
                self.assertAlmostEqual(m['size_m'][1], height, delta=.02, msg=asset + suffix)
                self.assertEqual(sorted(m['animations']), CLIPS, asset + suffix)
                self.assertEqual(m['skins'], 1, asset + suffix)

class BakedColour(unittest.TestCase):
    def test_teacher_vest_keeps_the_colour_of_the_visible_source_surface(self):
        # Meshy left hidden shirt pieces inside the teacher's waist; the bake must not paint them onto the vest.
        # The clean students measure 0.8-1.1%; the teacher measured 6.5% before the fix and 1.6% after it.
        self.assertLess(build('char-teacher')['bake_mismatch'], .03)

    def test_distance_models_have_no_unbaked_faces(self):
        # Long thin faces in the coarse reduction used to cast their rays the wrong way and stay black.
        for asset in ('char-teacher-lod1', 'char-student-bach-lod1'):
            self.assertLess(build(asset)['bake_gaps'], .003, asset)

class VrFitting(unittest.TestCase):
    def test_each_character_carries_eyes_and_grips_for_vr_gear(self):
        for asset, height in Variants.HEIGHTS.items():
            for suffix in ('', '-lod1'):
                m = build(asset + suffix)
                pivots = m['pivots']
                for name in ('vr_eyes', 'vr_grip_l', 'vr_grip_r'):
                    self.assertIn(name, pivots, asset + suffix)
                eyes = pivots['vr_eyes']['position']
                self.assertGreater(eyes[1], height * .7, asset + suffix)  # glTF Y up
                self.assertLess(eyes[1], height * .97, asset + suffix)
                self.assertGreater(eyes[2], 0, asset + suffix)  # in front of the body (+Z)
                left, right = pivots['vr_grip_l']['position'], pivots['vr_grip_r']['position']
                self.assertGreater(abs(left[0] - right[0]), .5, asset + suffix)  # hands apart in T-pose

HEIGHTS = {**Variants.HEIGHTS, 'char-student-primary': 1.35}

class HandPoses(unittest.TestCase):
    """Grip positions and palm directions per clip, measured in the manifest (glTF axes, metres)."""
    ASSETS = ('char-student-pre', 'char-student-primary', 'char-teacher')

    @classmethod
    def setUpClass(cls):
        cls.built = {asset: build(asset) for asset in cls.ASSETS}

    def test_manifest_measures_both_hands_in_each_clip(self):
        for asset, m in self.built.items():
            for clip in ('idle', 'sit', 'interact', 'vr', 'hold'):
                samples = m['hand_poses'][clip]
                self.assertEqual([s['frame'] for s in samples], [1, 13], asset)
                for s in samples:
                    for side in ('l', 'r'):
                        self.assertAlmostEqual(sum(v * v for v in s[f'palm_{side}']), 1, delta=.01)

    def test_hold_brings_both_hands_together_in_front_palms_up(self):
        for asset, m in self.built.items():
            h = HEIGHTS[asset]
            for s in m['hand_poses']['hold']:
                l, r = s['grip_l'], s['grip_r']
                self.assertLess(math.dist(l, r), .15 * h, asset)                    # close together
                self.assertGreater(min(l[2], r[2]), .12 * h, asset)                  # in front of the body
                self.assertTrue(.5 * h < (l[1] + r[1]) / 2 < .75 * h, asset)         # waist to chest
                self.assertGreater(min(s['palm_l'][1], s['palm_r'][1]), .7, asset)   # palms up

    def test_sit_and_idle_hands_match_the_baseline(self):
        baseline = json.loads((ROOT / 'tests/fixtures/hand_baseline.json').read_text())
        for asset, m in self.built.items():
            for clip in ('idle', 'sit'):
                for now, then in zip(m['hand_poses'][clip], baseline[asset][clip], strict=True):
                    for key in ('grip_l', 'grip_r'):
                        self.assertLess(math.dist(now[key], then[key]), .01, f'{asset} {clip} {key}')
                    for key in ('palm_l', 'palm_r'):
                        self.assertGreater(sum(a * b for a, b in zip(now[key], then[key])), .99, f'{asset} {clip} {key}')

if __name__ == '__main__':
    unittest.main()
