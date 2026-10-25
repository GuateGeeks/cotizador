#!/usr/bin/env python3
"""R2 sheets for the primaria student: the package references (art sheet 00, technical
assembly 00 and exploded 21) against the integrated result, every recipe isolated next to
its art sheet and technical plan, and the assembly steps of MONTAJE §5 mounted on the rig.
Before/after, poses and readability sheets come from tools/alumno-compare.py.

  python3 tools/alumno-r2-compare.py <new-out-dir> --after artifacts/paper/<run>

<run> holds vistas/ and piezas/ (with --components recipes --steps …) from tools/alumno-shot.cjs.
Needs Pillow. Package images are art/technical references; every result tile is a real render.
"""
import argparse
import hashlib
import json
from pathlib import Path
from PIL import Image

import importlib.util
def _load(name, file):
    spec = importlib.util.spec_from_file_location(name, Path(__file__).with_name(file))
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod
pc = _load('paper_compare', 'paper-compare.py')
ac = _load('alumno_compare', 'alumno-compare.py')

ROOT = Path(__file__).resolve().parents[1]
R2 = ROOT / 'docs/papercraft/construction-r2'
VIEW = ac.VIEW


def main():
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument('out')
    ap.add_argument('--after', required=True)
    a = ap.parse_args()
    out, A = Path(a.out), Path(a.after)
    if out.exists() and any(out.iterdir()):
        raise SystemExit(f'{out} ya tiene evidencia: usa una carpeta nueva.')
    out.mkdir(parents=True, exist_ok=True)
    made = []

    def save(img, name):
        img.save(out / f'{name}.png')
        made.append(name)

    views = ['char-front', 'char-side', 'char-back', 'char-34', 'campus']
    result = pc.grid([(pc.trim(Image.open(A / 'vistas' / f'rest-{v}-600px-dpr1.png')), VIEW[v]) for v in views], 5, 360, 620)
    save(pc.sheet('Alumno R2: lámina artística y resultado integrado', Image.open(R2 / 'imagenes/00-personaje-completo.png').convert('RGB'), 'imagenes/00-personaje-completo',
                  result, 'cotizador, 600 px CSS'), '01-r2-arte-vs-resultado')
    save(pc.sheet('Alumno R2: montaje técnico del paquete y resultado integrado', Image.open(R2 / 'planos/00-personaje-montado.png').convert('RGB'), 'planos/00-personaje-montado (de los JSON)',
                  result, 'cotizador, 600 px CSS'), '02-r2-plano-vs-resultado')
    rep = json.loads((A / 'piezas' / 'report.json').read_text())
    steps = [img for img in rep['images'] if img.get('step')]
    names = {'A': 'A · pelvis, piernas, zapatos', 'B': 'B · torso, pechera, solapas', 'C': 'C · mangas, brazos, manos', 'D': 'D · cuello, cabeza, rostro', 'E': 'E · cabello y flequillo', 'F': 'F · mochila y tirantes'}
    grid = pc.grid([(pc.trim(Image.open(A / 'piezas' / img['file'])), f"{names[img['step']]} · {img['triangles']} tri") for img in steps if img['view'] == 'char-34'], 6, 300, 520)
    save(pc.sheet('Montaje por pasos (MONTAJE §5), piezas montadas en el rig', Image.open(R2 / 'planos/21-despiece-montaje.png').convert('RGB'), 'planos/21-despiece-montaje', grid, 'cotizador, acumulado'), '03-r2-montaje-pasos')
    # Every recipe: art sheet, technical plan, isolated render (three columns per row).
    first = rep['images'][0].get('components') or []
    rows = []
    for img in rep['images']:
        if not img.get('isolated') or img['view'] != ('back' if img['isolated'] in ('P19', 'P20', 'P03') else 'char-34'):
            continue
        rid = img['isolated']
        art = next(R2.glob(f'imagenes/{rid}-*.png'))
        plan = next(R2.glob(f'planos/{rid}-*.png'))
        inst = [c for c in first if c['id'].split('-')[0] == rid]
        tri = sum(c['triangles'] for c in inst)
        bones = ', '.join(sorted({b for c in inst for b in c['perBone']}))
        rows.append((rid, art, plan, A / 'piezas' / img['file'], f'{len(inst)} inst · {tri} tri · {bones}'))
    for page, chunk in enumerate([rows[i:i + 5] for i in range(0, len(rows), 5)], 1):
        tiles = []
        for rid, art, plan, render, caption in chunk:
            tiles += [(Image.open(art).convert('RGB'), f'{rid} · lámina'), (Image.open(plan).convert('RGB'), f'{rid} · plano'), (pc.trim(Image.open(render)), f'{rid} aislada · {caption}')]
        save(pc.grid(tiles, 3, 620, 420), f'04-r2-piezas-{page}')
    index = {'after': str(A), 'images': [{'file': f'{m}.png', 'sha256': hashlib.sha256((out / f'{m}.png').read_bytes()).hexdigest()} for m in made]}
    (out / 'index.json').write_text(json.dumps(index, indent=2, ensure_ascii=False))
    print(json.dumps({'out': str(out), 'images': len(made)}))


if __name__ == '__main__':
    main()
