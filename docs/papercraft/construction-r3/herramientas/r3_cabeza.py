#!/usr/bin/env python3
"""R3 recreation of P01 (head) and P06 (hair core) from the fold lines of the R2 art sheets.

Writes construction-r3/datos/P01-cabeza.json and P06-cabello-nucleo.json in the R2 schema
(units = H, +Y up, +Z front, +X anatomical left) and checks them against the R2 instances that
mount on the head (assembly.json is read, never written):

  python3 herramientas/r3_cabeza.py            # write both JSON and print the checks
  python3 herramientas/r3_cabeza.py --check    # checks only, exit 1 on failure

Standard library only. Coordinates are authored by hand from the fold map documented in
construction-r3/README.md; this script only mirrors, orients and measures them.
"""
import argparse
import json
import math
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parents[1]
R2 = HERE.parent / 'construction-r2' / 'datos'
OUT = HERE / 'datos'
H = 0.78
GAP_H = 0.004 / H  # designated layer gap (0.004 scene units) in H

# ---------------------------------------------------------------- vector helpers
sub = lambda a, b: [a[i] - b[i] for i in range(3)]
add = lambda a, b: [a[i] + b[i] for i in range(3)]
mul = lambda a, s: [x * s for x in a]
dot = lambda a, b: sum(a[i] * b[i] for i in range(3))
cross = lambda a, b: [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]]
norm = lambda a: math.sqrt(dot(a, a))
r7 = lambda v: [round(x, 7) + 0.0 for x in v]


def normal(t):
    return cross(sub(t[1], t[0]), sub(t[2], t[0]))


def centroid(t):
    return [sum(p[i] for p in t) / 3 for i in range(3)]


# ---------------------------------------------------------------- P01 head
# Face plane of R2 (eyes P04 and smile P05 sit 0.004 scene units in front of it):
# z = 0.0612 + 0.0238/0.22 · y. The R3 front keeps it on the centre crease and folds each half
# back by K per unit |x| (about 3.4°): the vertical crease of the art, eyes keep ≥ 0.004.
K = 0.06
zf = lambda y: 0.0612 + 0.0238 / 0.22 * y
zface = lambda x, y: zf(y) - K * abs(x)


def ring(points):
    """Half ring F, FC, S, BC, B (x ≥ 0) → full ring of 8: 0 F, 1 FC+, 2 S+, 3 BC+, 4 B, 5 BC−, 6 S−, 7 FC−."""
    f, fc, s, bc, b = points
    m = lambda p: [-p[0], p[1], p[2]]
    return [f, fc, s, bc, b, m(bc), m(s), m(fc)]


def head():
    U = ring([[0, .195, zface(0, .195)], [.085, .168, zface(.085, .168)], [.113, .178, -.005], [.078, .172, -.108], [0, .186, -.125]])
    L = ring([[0, .028, zface(0, .028)], [.08, .042, zface(.08, .042)], [.1, .062, -.008], [.072, .056, -.098], [0, .048, -.112]])
    T = [0, .218, -.02]          # crown point: radial creases of the Superior view
    B = [0, 0, -.01]             # chin/neck point: radial creases of the Inferior view
    V = U + L + [T, B]
    tones = {'front': '#E5AD80', 'a': '#E0AA7D', 'b': '#EAB083', 'c': '#E5AD80'}
    faces, colors = [], []
    for i in range(8):
        j = (i + 1) % 8
        tone = tones['front'] if i in (0, 7) else (tones['a'] if i % 2 else tones['b'])
        faces += [[8 + i, 8 + j, j], [8 + i, j, i]]      # belt: one flat-ish wall per sector
        colors += [tone, tone]
    for i in range(8):
        faces.append([i, (i + 1) % 8, 16])                 # top fan
        colors.append(tones['c'] if i % 2 else tones['a'])
    for i in range(8):
        faces.append([8 + (i + 1) % 8, 8 + i, 17])         # bottom fan
        colors.append(tones['a'] if i % 2 else tones['c'])
    return V, faces, colors


# ---------------------------------------------------------------- P06 hair core
def hair():
    A = [0, .28, -.025]                                    # crown apex: H top (hair_top = 1.0)
    C = ring([[0, .245, .09], [.085, .251, .058], [.113, .255, -.028], [.082, .252, -.118], [0, .25, -.14]])
    E = ring([[0, .176, .12], [.09, .19, .11], [.152, .19, -.02], [.118, .165, -.152], [0, .16, -.175]])
    # Rim of the side and back walls (x ≥ 0), from the temple to the nape.
    rim = {'Tp': [.095, .146, .102], 'Q': [.13, .168, .07], 'SB': [.105, .085, .055], 'N': [.138, .135, -.014],
           'BS': [.132, .07, -.08], 'R3': [.09, .035, -.125], 'Nk': [.045, .022, -.14]}
    V = [A] + C + E
    iC = lambda i: 1 + i % 8
    iE = lambda i: 9 + i % 8
    idx = {}
    for side in (1, -1):
        for k, p in rim.items():
            idx[(k, side)] = len(V)
            V.append([side * p[0], p[1], p[2]])
    R4 = len(V)
    V.append([0, .045, -.145])                            # nape centre: V notch of the Inferior view
    tones = ['#3A2E5C', '#392D5A', '#3B2F5E']
    faces, colors = [], []

    def tri(a, b, c, tone):
        faces.append([a, b, c])
        colors.append(tones[tone])

    for i in range(8):
        tri(iC(i), iC(i + 1), 0, i % 3)                    # crown fan
    for i in range(8):                                     # crown ring → equator band
        if i in (0, 7):                                    # front: diamond of the fringe, crease C0–Ft
            if i == 0:
                tri(iE(0), iE(1), iC(0), 1); tri(iC(0), iE(1), iC(1), 2)
            else:
                tri(iE(7), iE(0), iC(0), 1); tri(iE(7), iC(0), iC(7), 2)
        else:
            tri(iE(i), iE(i + 1), iC(i + 1), (i + 1) % 3); tri(iE(i), iC(i + 1), iC(i), (i + 1) % 3)
    for side in (1, -1):
        e1, e2, e3, e4 = (iE(1), iE(2), iE(3), iE(4)) if side == 1 else (iE(7), iE(6), iE(5), iE(4))
        g = lambda k: idx[(k, side)]
        tri(e1, g('Tp'), g('Q'), 0)                        # temple point under the fringe corner
        tri(g('Tp'), g('SB'), g('Q'), 2)                   # front face of the sideburn, framing the cheek
        tri(e1, g('Q'), e2, 1)                             # front side panel
        tri(g('Q'), g('SB'), e2, 1)
        tri(g('SB'), g('N'), e2, 2)                        # sideburn lock in front of the ear
        tri(e2, g('N'), g('BS'), 0)                        # notch over the ear, lock behind it
        tri(e2, g('BS'), e3, 0)
        tri(e3, g('BS'), g('R3'), 2)                       # back side panel
        tri(e3, g('R3'), g('Nk'), 1); tri(e3, g('Nk'), e4, 1); tri(g('Nk'), R4, e4, 2)  # back half: nape point, V notch
    return V, faces, colors


# ---------------------------------------------------------------- orientation and checks
def orient(V, faces, centre):
    """Wind every face so its normal points away from `centre` (both pieces are star-shaped from it)."""
    out = []
    for f in faces:
        t = [V[k] for k in f]
        out.append(f if dot(normal(t), sub(centroid(t), centre)) > 0 else [f[0], f[2], f[1]])
    return out


def edge_consistency(faces):
    """Each shared edge must be used once in each direction (coherent winding); returns bad edges."""
    seen = {}
    for f in faces:
        for a, b in ((f[0], f[1]), (f[1], f[2]), (f[2], f[0])):
            seen[(a, b)] = seen.get((a, b), 0) + 1
    return [e for e, n in seen.items() if n > 1 or (e[1], e[0]) in seen and seen[(e[1], e[0])] != 1]


def closest_on_tri(p, t):
    """Closest point to p on triangle t (Ericson, Real-Time Collision Detection 5.1.5)."""
    a, b, c = t
    ab, ac, ap = sub(b, a), sub(c, a), sub(p, a)
    d1, d2 = dot(ab, ap), dot(ac, ap)
    if d1 <= 0 and d2 <= 0: return a
    bp = sub(p, b); d3, d4 = dot(ab, bp), dot(ac, bp)
    if d3 >= 0 and d4 <= d3: return b
    vc = d1 * d4 - d3 * d2
    if vc <= 0 and d1 >= 0 and d3 <= 0: return add(a, mul(ab, d1 / (d1 - d3)))
    cp = sub(p, c); d5, d6 = dot(ab, cp), dot(ac, cp)
    if d6 >= 0 and d5 <= d6: return c
    vb = d5 * d2 - d1 * d6
    if vb <= 0 and d2 >= 0 and d6 <= 0: return add(a, mul(ac, d2 / (d2 - d6)))
    va = d3 * d6 - d5 * d4
    if va <= 0 and d4 - d3 >= 0 and d5 - d6 >= 0: return add(b, mul(sub(c, b), (d4 - d3) / ((d4 - d3) + (d5 - d6))))
    den = 1 / (va + vb + vc)
    return add(a, add(mul(ab, vb * den), mul(ac, vc * den)))


def seg_seg(p1, q1, p2, q2):
    d1, d2, r = sub(q1, p1), sub(q2, p2), sub(p1, p2)
    a, e, f = dot(d1, d1), dot(d2, d2), dot(d2, r)
    c, b = dot(d1, r), dot(d1, d2)
    den = a * e - b * b
    s = min(1, max(0, (b * f - c * e) / den)) if den > 1e-15 else 0
    t = (b * s + f) / e
    if t < 0: t, s = 0, min(1, max(0, -c / a))
    elif t > 1: t, s = 1, min(1, max(0, (b - c) / a))
    return norm(sub(add(p1, mul(d1, s)), add(p2, mul(d2, t))))


def seg_hits_tri(p, q, t, eps=1e-12):
    e1, e2 = sub(t[1], t[0]), sub(t[2], t[0])
    d = sub(q, p); h = cross(d, e2); a = dot(e1, h)
    if abs(a) < eps: return False
    f = 1 / a; s = sub(p, t[0]); u = f * dot(s, h)
    if u < 0 or u > 1: return False
    qq = cross(s, e1); v = f * dot(d, qq)
    if v < 0 or u + v > 1: return False
    w = f * dot(e2, qq)
    return 0 <= w <= 1


def tri_dist(t1, t2):
    """Distance between two triangles; 0 if they intersect."""
    for (p, q) in ((t1[0], t1[1]), (t1[1], t1[2]), (t1[2], t1[0])):
        if seg_hits_tri(p, q, t2): return 0.0
    for (p, q) in ((t2[0], t2[1]), (t2[1], t2[2]), (t2[2], t2[0])):
        if seg_hits_tri(p, q, t1): return 0.0
    d = min(norm(sub(p, closest_on_tri(p, t2))) for p in t1)
    d = min(d, min(norm(sub(p, closest_on_tri(p, t1))) for p in t2))
    E1 = ((t1[0], t1[1]), (t1[1], t1[2]), (t1[2], t1[0])); E2 = ((t2[0], t2[1]), (t2[1], t2[2]), (t2[2], t2[0]))
    return min(d, min(seg_seg(a, b, c, e) for a, b in E1 for c, e in E2))


def mesh_dist(A, B):
    return min(tri_dist(a, b) for a in A for b in B)


def inside(p, tris):
    """Ray parity (+X direction, slightly skewed) for a closed mesh."""
    q = add(p, [3, 0.0137, 0.0071])
    return sum(seg_hits_tri(p, q, t) for t in tris) % 2 == 1


def instance_point(inst, v):
    s, m = inst['scale_xyz'], (-1 if inst['mirror_x'] else 1)
    x, y, z = v[0] * s[0] * m, v[1] * s[1], v[2] * s[2]
    rx, ry, rz = (math.radians(a) for a in inst['rotation_deg_xyz'])
    y, z = y * math.cos(rx) - z * math.sin(rx), y * math.sin(rx) + z * math.cos(rx)
    x, z = x * math.cos(ry) + z * math.sin(ry), -x * math.sin(ry) + z * math.cos(ry)
    x, y = x * math.cos(rz) - y * math.sin(rz), x * math.sin(rz) + y * math.cos(rz)
    p = inst['position_H']
    return [x + p[0], y + p[1], z + p[2]]


def placed(inst, recipe):
    V = [instance_point(inst, v) for v in recipe['mesh']['vertices']]
    return [[V[k] for k in f] for f in recipe['mesh']['faces']]


# ---------------------------------------------------------------- JSON
def bounds(V):
    mn = [min(v[i] for v in V) for i in range(3)]
    mx = [max(v[i] for v in V) for i in range(3)]
    return {'min': r7(mn), 'max': r7(mx), 'size': r7([mx[i] - mn[i] for i in range(3)])}


def recipe(template, V, faces, colors, **fields):
    d = json.loads(json.dumps(template))
    d['mesh'] = {'vertices': [r7(v) for v in V], 'faces': faces, 'face_colors': colors}
    for k, v in fields.items():
        if k == 'metadata':
            d['metadata'].update(v)
        else:
            d[k] = v
    b = bounds(d['mesh']['vertices'])
    d['metadata'].update({'triangles': len(faces), 'bounds_local_H': b, 'dimensions_scene': r7([x * H for x in b['size']])})
    return d


def build():
    p01_r2 = json.loads((R2 / 'P01-cabeza.json').read_text())
    p06_r2 = json.loads((R2 / 'P06-cabello-nucleo.json').read_text())
    hv, hf, hc = head()
    hf = orient(hv, hf, [0, .11, -.02])
    gv, gf, gc = hair()
    gf = orient(gv, gf, [0, .12, -.02])
    prov = {'revision': 'R3', 'replaces': 'construction-r2/datos/{}', 'source': 'Pliegues de imagenes/{}.png; ver construction-r3/README.md',
            'generator': 'construction-r3/herramientas/r3_cabeza.py'}
    p01 = recipe(p01_r2, hv, hf, hc,
                 purpose='Volumen facial facetado y redondeado, con frente plano para ojos y sonrisa.',
                 construction='Prisma octogonal achaflanado: anillos de 8 vértices arriba y abajo (16 triángulos de pared), abanico superior de 8 hacia la coronilla y abanico inferior de 8 hacia el mentón. Pliegue vertical central en el frente; cada mitad conserva el plano facial R2 en el eje.',
                 metadata={'limitations': ['Forma de apoyo facetada; el cabello oculta el cierre superior. No incluye nariz saliente.',
                                           'Cada mitad frontal se inclina 3.4° respecto al plano R2: ojos y sonrisa conservan ≥ 0.004 de separación normal; los ojos quedan algo más separados en su borde exterior.'],
                           'provenance': {**prov, 'replaces': prov['replaces'].format('P01-cabeza.json'), 'source': prov['source'].format('P01-cabeza')}})
    p06 = recipe(p06_r2, gv, gf, gc,
                 purpose='Casquete facetado con coronilla, flequillo frontal, patillas y nuca; deja la cara visible.',
                 construction='Ápice de coronilla con abanico de 8, banda de 8 a 8 hasta el ecuador (16, con el rombo frontal del flequillo), y paredes laterales y traseras de 11 triángulos por lado: punta de sien, patilla delante de la oreja, muesca sobre la oreja, mechón detrás, punta de nuca y muesca central.',
                 metadata={'limitations': ['Superficie abierta: abertura inferior intencional sobre la cabeza y la cara. No es un sólido imprimible.',
                                           'El flequillo del núcleo termina sobre las raíces de los tres P07; las puntas del flequillo las aportan los P07.'],
                           'provenance': {**prov, 'replaces': prov['replaces'].format('P06-cabello-nucleo.json'), 'source': prov['source'].format('P06-cabello-nucleo')}})
    return p01, p06


def checks(p01, p06):
    asm = json.loads((R2 / 'assembly.json').read_text())
    recipes = {p.stem[:3]: json.loads(p.read_text()) for p in R2.glob('P*.json')}
    recipes['P01'], recipes['P06'] = p01, p06
    inst = {i['id']: i for i in asm['instances']}
    res, ok = {}, True

    def put(name, value, passed):
        nonlocal ok
        res[name] = {'value': value, 'pass': passed}
        ok = ok and passed

    for d in (p01, p06):
        V, F = d['mesh']['vertices'], d['mesh']['faces']
        T = [[V[k] for k in f] for f in F]
        put(f"{d['id']} triángulos", len(F), len(F) <= (32 if d['id'] == 'P01' else 56))
        put(f"{d['id']} área mínima (H²)", round(min(norm(normal(t)) / 2 for t in T), 7), min(norm(normal(t)) / 2 for t in T) > 1e-6)
        put(f"{d['id']} aristas incoherentes", len(edge_consistency(F)), not edge_consistency(F))
        put(f"{d['id']} caras duplicadas", len(F) - len({tuple(sorted(f)) for f in F}), len({tuple(sorted(f)) for f in F}) == len(F))
    # closed head: every edge shared by exactly two faces, positive volume
    F = p01['mesh']['faces']; V = p01['mesh']['vertices']
    edges = {}
    for f in F:
        for a, b in ((f[0], f[1]), (f[1], f[2]), (f[2], f[0])):
            edges[tuple(sorted((a, b)))] = edges.get(tuple(sorted((a, b))), 0) + 1
    vol = sum(dot(V[f[0]], cross(V[f[1]], V[f[2]])) for f in F) / 6
    put('P01 cerrada (aristas con 2 caras)', all(n == 2 for n in edges.values()), all(n == 2 for n in edges.values()))
    put('P01 volumen (H³)', round(vol, 6), vol > 0)
    put('P06 cima (y local, cabello = 1.0 H en raíz)', max(v[1] for v in p06['mesh']['vertices']), abs(max(v[1] for v in p06['mesh']['vertices']) - .28) < 1e-9)
    # sockets used by other instances keep their R2 position
    for rid, d in (('P01', p01), ('P06', p06)):
        r2 = json.loads((R2 / ('P01-cabeza.json' if rid == 'P01' else 'P06-cabello-nucleo.json')).read_text())
        same = all(d['sockets'][k]['position_local_H'] == s['position_local_H'] for k, s in r2['sockets'].items())
        put(f'{rid} sockets R2 conservados', len(r2['sockets']), same and set(d['sockets']) == set(r2['sockets']))
    head = placed(inst['P01'], p01); hair = placed(inst['P06'], p06)
    dh = mesh_dist(head, hair)
    put('P06–P01 separación mínima (H)', round(dh, 5), dh >= GAP_H)
    # hair encloses the head: every head vertex is under the hair (vertical ray up hits the core)
    hv = [instance_point(inst['P01'], v) for v in p01['mesh']['vertices']]
    covered = [p for p in hv if p[1] > .72 + .15 and not any(seg_hits_tri(p, add(p, [0, 1, 0]), t) for t in hair)]
    put('P01 por encima de 0.15 H cubierta por P06', len(covered), not covered)
    for iid in ('P04-L', 'P04-R', 'P05'):
        app = placed(inst[iid], recipes[inst[iid]['part_id']])
        g = min(norm(sub(p, closest_on_tri(p, t))) for a in app for p in a for t in head)
        put(f'{iid} separación normal a P01 (H)', round(g, 5), g >= GAP_H - 1e-6)
        # visible from the front and from the campus camera (34° above the horizon)
        for name, dirv in (('frente', [0, 0, 1]), ('campus 34°', [0, math.sin(math.radians(34)), math.cos(math.radians(34))])):
            hidden = sum(any(seg_hits_tri(p, add(p, mul(dirv, 2)), t) for t in hair) for a in app for p in a)
            put(f'{iid} visible desde {name} (vértices tapados por P06)', hidden, hidden == 0)
    for iid in ('P03-L', 'P03-R'):
        ear = placed(inst[iid], recipes['P03'])
        de = mesh_dist(ear, hair)
        put(f'{iid} separación a P06 (H)', round(de, 5), de > 0)
    neck = [instance_point(inst['P02'], v) for v in recipes['P02']['mesh']['vertices'] if v[1] > 0]
    put('P02 tapa superior dentro de P01', sum(inside(p, head) for p in neck), all(inside(p, head) for p in neck))
    for iid in ('P07-L', 'P07-C', 'P07-R'):
        lock = placed(inst[iid], recipes['P07'])
        roots = [instance_point(inst[iid], v) for v in recipes['P07']['mesh']['vertices'] if v[1] >= 0]
        tucked = sum(any(seg_hits_tri(p, add(p, [0, 0, 1]), t) for t in hair) for p in roots)
        tips = [instance_point(inst[iid], v) for v in recipes['P07']['mesh']['vertices'] if v[1] < -0.05]
        free = sum(not any(seg_hits_tri(p, add(p, [0, 0, 1]), t) for t in hair) for p in tips)
        put(f'{iid} raíces bajo P06 / puntas visibles', f'{tucked}/{len(roots)} · {free}/{len(tips)}', tucked == len(roots) and free == len(tips))
        put(f'{iid} distancia a P01 (H)', round(mesh_dist(lock, head), 5), mesh_dist(lock, head) >= GAP_H)
    return ok, res


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--check', action='store_true')
    a = ap.parse_args()
    p01, p06 = build()
    if not a.check:
        OUT.mkdir(parents=True, exist_ok=True)
        (OUT / 'P01-cabeza.json').write_text(json.dumps(p01, ensure_ascii=False, indent=2) + '\n')
        (OUT / 'P06-cabello-nucleo.json').write_text(json.dumps(p06, ensure_ascii=False, indent=2) + '\n')
    ok, res = checks(p01, p06)
    for k, v in res.items():
        print(f"{'PASS' if v['pass'] else 'FAIL'}  {k}: {v['value']}")
    sys.exit(0 if ok else 1)


if __name__ == '__main__':
    main()
