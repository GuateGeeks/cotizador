import json, pathlib, unittest
from scripts.world import load_contract

class Contracts(unittest.TestCase):
    def setUp(self):
        self.c = load_contract()

    def test_required_materials_and_values(self):
        expected = {'GG_PurplePrimary': .48, 'GG_OrangeAccent': .42, 'GG_TurquoiseAccent': .40,
                    'GG_IvorySoft': .62, 'GG_NavyFabric': .80, 'GG_WarmSkin': .68, 'GG_GreenFoliage': .72,
                    'GG_PurpleDark': .50}
        mats = self.c['materials']
        for name, rough in expected.items():
            self.assertEqual(mats[name]['roughness'], rough, name)
        for name in ('GG_GlassSoft', 'GG_ScreenEmissive'):
            self.assertIn(name, mats)
        self.assertTrue(all(m.get('metallic', 0) == 0 for m in mats.values()))

    def test_palette_is_canonical(self):
        p = self.c['palette']
        self.assertEqual((p['primaryViolet'], p['deepViolet'], p['orange'], p['turquoise'], p['navy'], p['ivory'],
                          p['lightGreen'], p['darkGreen'], p['stage']),
                         ('#6942A1', '#321853', '#FF9D38', '#25C2C6', '#33438A', '#FFF8EC', '#7CCB6B', '#3E9A5E', '#F4F1F6'))

    def test_dimensions(self):
        self.assertEqual(self.c['bay'], [6.0, 5.0])
        self.assertEqual(self.c['floor'], 3.2)
        self.assertEqual(self.c['studentHeight'], 1.35)

if __name__ == '__main__':
    unittest.main()
