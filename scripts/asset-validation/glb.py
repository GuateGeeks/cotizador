"""Dependency-free GLB reader, usable both from the CLI and inside Blender's Python."""
import json, pathlib, struct

PIVOT_PREFIXES = ('wheel_', 'rotor_', 'joint_', 'head', 'lid', 'vr_')
IDENTITY = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]

def multiply(a, b):
    return [sum(a[c * 4 + k] * b[r * 4 + c] for c in range(4)) for r in range(4) for k in range(4)]

def local_matrix(node):
    """Column-major matrix, as glTF stores it."""
    if 'matrix' in node:
        return list(node['matrix'])
    x, y, z, w = node.get('rotation', [0, 0, 0, 1])
    sx, sy, sz = node.get('scale', [1, 1, 1])
    tx, ty, tz = node.get('translation', [0, 0, 0])
    return [(1 - 2 * (y * y + z * z)) * sx, 2 * (x * y + z * w) * sx, 2 * (x * z - y * w) * sx, 0,
            2 * (x * y - z * w) * sy, (1 - 2 * (x * x + z * z)) * sy, 2 * (y * z + x * w) * sy, 0,
            2 * (x * z + y * w) * sz, 2 * (y * z - x * w) * sz, (1 - 2 * (x * x + y * y)) * sz, 0,
            tx, ty, tz, 1]

def transform(m, p):
    return [m[0] * p[0] + m[4] * p[1] + m[8] * p[2] + m[12],
            m[1] * p[0] + m[5] * p[1] + m[9] * p[2] + m[13],
            m[2] * p[0] + m[6] * p[1] + m[10] * p[2] + m[14]]

def read_json(path):
    data = pathlib.Path(path).read_bytes()
    if len(data) < 20 or data[:4] != b'glTF':
        raise ValueError(f'{path} is not a GLB file')
    length, kind = struct.unpack('<I4s', data[12:20])
    if kind != b'JSON':
        raise ValueError(f'{path} has no JSON chunk')
    return json.loads(data[20:20 + length])

def validate_glb(path):
    doc = read_json(path)
    nodes, meshes, accessors = doc.get('nodes', []), doc.get('meshes', []), doc.get('accessors', [])
    triangles, sockets, names, corners, pivots = 0, {}, [], [], {}

    def visit(index, parent):
        nonlocal triangles
        node = nodes[index]
        world = multiply(parent, local_matrix(node))
        name = node.get('name', '')
        names.append(name)
        pivot = name.startswith(PIVOT_PREFIXES)
        if pivot:
            pivots[name] = {'position': [round(v, 6) for v in world[12:15]]}
        if name.startswith('socket_'):
            sockets[name] = [round(v, 6) for v in world[12:15]]
        if 'mesh' in node:
            for primitive in meshes[node['mesh']]['primitives']:
                position = accessors[primitive['attributes']['POSITION']]
                counted = accessors[primitive['indices']] if 'indices' in primitive else position
                triangles += counted['count'] // 3
                lo, hi = position['min'], position['max']
                box = [transform(IDENTITY if 'skin' in node else world, (x, y, z)) for x in (lo[0], hi[0]) for y in (lo[1], hi[1]) for z in (lo[2], hi[2])]
                corners.extend(box)
                if pivot:
                    pivots[name]['centre'] = [round(sum(c[i] for c in box) / 8, 6) for i in range(3)]
        for child in node.get('children', []):
            visit(child, world)

    for root in doc['scenes'][doc.get('scene', 0)]['nodes']:
        visit(root, IDENTITY)
    bounds = None
    if corners:
        bounds = {'min': [round(min(c[i] for c in corners), 6) for i in range(3)],
                  'max': [round(max(c[i] for c in corners), 6) for i in range(3)]}
    return {'triangles': triangles, 'materials': sorted(m.get('name', '') for m in doc.get('materials', [])),
            'sockets': sockets, 'nodes': names, 'pivots': pivots, 'skins': len(doc.get('skins', [])), 'bounds': bounds, 'animations': sorted(a.get('name', '') for a in doc.get('animations', []))}
