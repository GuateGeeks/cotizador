import json, pathlib, struct, tempfile, unittest, sys
sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent.parent / 'scripts/asset-validation'))
from glb import validate_glb

def fixture(path, skinned=False):
    doc = {'asset': {'version': '2.0'}, 'scenes': [{'nodes': [0, 1]}], 'scene': 0,
           'nodes': [{'name': 'body', 'mesh': 0, 'translation': [1, 0, 0]}, {'name': 'socket_east', 'translation': [3, 0, 0]}],
           'meshes': [{'primitives': [{'attributes': {'POSITION': 0}, 'indices': 1, 'material': 0}]}],
           'materials': [{'name': 'GG_IvorySoft'}],
           'accessors': [{'componentType': 5126, 'count': 3, 'type': 'VEC3', 'min': [0, 0, 0], 'max': [2, 1, 1]},
                         {'componentType': 5123, 'count': 6, 'type': 'SCALAR'}]}
    if skinned:
        doc['nodes'][0]['skin'] = 0
        doc['skins'] = [{'joints': []}]
    js = json.dumps(doc).encode()
    js += b' ' * (-len(js) % 4)
    path.write_bytes(struct.pack('<4sII', b'glTF', 2, 12 + 8 + len(js)) + struct.pack('<I4s', len(js), b'JSON') + js)

class Glb(unittest.TestCase):
    def setUp(self):
        self.dir = tempfile.TemporaryDirectory()
        self.path = pathlib.Path(self.dir.name) / 'a.glb'

    def tearDown(self):
        self.dir.cleanup()

    def test_reports_triangles_materials_nodes_and_world_bounds(self):
        fixture(self.path)
        r = validate_glb(self.path)
        self.assertEqual(r['triangles'], 2)
        self.assertEqual(r['materials'], ['GG_IvorySoft'])
        self.assertEqual(r['sockets'], {'socket_east': [3.0, 0.0, 0.0]})
        self.assertEqual(r['bounds'], {'min': [1.0, 0.0, 0.0], 'max': [3.0, 1.0, 1.0]})

    def test_skinned_mesh_ignores_its_node_transform(self):
        fixture(self.path, skinned=True)
        self.assertEqual(validate_glb(self.path)['bounds'], {'min': [0.0, 0.0, 0.0], 'max': [2.0, 1.0, 1.0]})

    def test_rejects_other_files(self):
        self.path.write_bytes(b'not a glb file at all')
        with self.assertRaises(ValueError):
            validate_glb(self.path)

if __name__ == '__main__':
    unittest.main()
