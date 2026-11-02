import json, pathlib, tempfile, unittest
from scripts.world import load_contract, native, run_blender

ROOT = pathlib.Path(__file__).resolve().parent.parent

class BlenderLibrary(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.tmp = ROOT / 'runs' / 'test-tmp'
        cls.tmp.mkdir(parents=True, exist_ok=True)
        run_blender('check', native(cls.tmp / 'check.json'))
        cls.report = json.loads((cls.tmp / 'check.json').read_text())

    def test_materials_match_contract(self):
        for name, spec in load_contract()['materials'].items():
            got = self.report['materials'][name]
            self.assertEqual(got['nodes'], 1, name)
            self.assertAlmostEqual(got['roughness'], spec['roughness'], places=5)
            self.assertEqual(got['metallic'], 0)

    def test_box_has_no_degenerate_faces(self):
        self.assertEqual(self.report['degenerate'], 0)
        self.assertGreater(self.report['box_triangles'], 12)

if __name__ == '__main__':
    unittest.main()
