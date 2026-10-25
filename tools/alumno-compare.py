#!/usr/bin/env python3
"""Before/after sheets of the primaria base student, from two runs of tools/alumno-shot.cjs
taken with identical conditions (same camera, light, frame, scale and material), plus
the construction reference sheets and the isolated components.

  python3 tools/alumno-compare.py <new-out-dir> --before artifacts/paper/<antes> --after artifacts/paper/<despues>

Each run folder holds vistas/, lectura/, poses/, aristas/ (and piezas/ for the after run).
Needs Pillow.
"""
import argparse
import hashlib
import json
from pathlib import Path
from PIL import Image, ImageDraw

import importlib.util
_spec = importlib.util.spec_from_file_location('paper_compare', Path(__file__).with_name('paper-compare.py'))
pc = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(pc)

ROOT = Path(__file__).resolve().parents[1]
CONS = ROOT / 'docs/papercraft/construction/reference'
KIT = ROOT / 'docs/papercraft/reference'
VIEW = {'char-front': 'Frente', 'char-side': 'Perfil', 'char-back': 'Espalda', 'char-34': 'Tres cuartos', 'campus': 'Cámara del campus'}
POSE = {'rest': 'De pie', 'walk-1': 'Caminar', 'sit': 'Sentado', 'work': 'Trabajo en mesa', 'hand': 'Mano levantada'}


def rows_sheet(title, rows, cell, labels):
    """rows: [(row label, [images])]; images are pasted at their native size, centred in `cell`."""
    w, h = cell
    lw = 150
    out = Image.new('RGB', (lw + w * len(labels) + 24, 90 + len(rows) * (h + 12)), pc.BG)
    d = ImageDraw.Draw(out)
    d.text((14, 14), title, fill=pc.INK, font=pc.font(28))
    for c, text in enumerate(labels):
        d.text((lw + c * w + 8, 56), text, fill=pc.INK, font=pc.font(18))
    for r, (label, ims) in enumerate(rows):
        y = 84 + r * (h + 12)
        d.text((14, y + h // 2 - 12), label, fill=pc.INK, font=pc.font(22))
        for c, im in enumerate(ims):
            out.paste(im, (lw + c * w + (w - im.width) // 2, y + (h - im.height) // 2))
    return out


def crop_centre(im, w, h, dy=0):
    cx, cy = im.width // 2, im.height // 2 + dy
    return im.crop((cx - w // 2, cy - h // 2, cx + w // 2, cy + h // 2))


def main():
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument('out')
    ap.add_argument('--before', required=True)
    ap.add_argument('--after', required=True)
    a = ap.parse_args()
    out, B, A = Path(a.out), Path(a.before), Path(a.after)
    if out.exists() and any(out.iterdir()):
        raise SystemExit(f'{out} ya tiene evidencia: usa una carpeta nueva.')
    out.mkdir(parents=True, exist_ok=True)
    made = []

    def save(img, name):
        img.save(out / f'{name}.png')
        made.append(name)

    views = ['char-front', 'char-side', 'char-back', 'char-34', 'campus']
    big = lambda run, sub, pose, v: crop_centre(Image.open(run / sub / f'{pose}-{v}-600px-dpr1.png').convert('RGB'), 420, 700)
    save(rows_sheet('Alumno de primaria · antes / después (mismas condiciones, H = 600 px CSS)',
                    [('Antes', [big(B, 'vistas', 'rest', v) for v in views]), ('Después', [big(A, 'vistas', 'rest', v) for v in views])],
                    (430, 710), [VIEW[v] for v in views]), '01-antes-despues-vistas')
    save(pc.sheet('Personaje maestro: referencia y resultado', Image.open(CONS / '01-personaje-maestro.png').convert('RGB'), 'lámina 01 (R1)',
                  pc.grid([(pc.trim(Image.open(A / 'vistas' / f'rest-{v}-600px-dpr1.png')), VIEW[v]) for v in views], 5, 360, 620), 'después, 600 px CSS'), '02-referencia-01')
    for n, ref in ((3, '03-cabello-construccion.png'), (4, '04-mangas-construccion.png')):
        head = lambda run, v, k=n: crop_centre(Image.open(run / 'vistas' / f'rest-{v}-600px-dpr1.png').convert('RGB'), 340, 300, -190 if k == 3 else -100)
        sel = ['char-front', 'char-side', 'char-back', 'char-34']
        grid = rows_sheet('', [('Antes', [head(B, v) for v in sel]), ('Después', [head(A, v) for v in sel])], (350, 310), [VIEW[v] for v in sel])
        save(pc.sheet('Cabello' if n == 3 else 'Hombros, cuello y mangas', Image.open(CONS / ref).convert('RGB'), f'lámina 0{n} (R1)', grid, 'acercamiento 600 px'), f'0{n}-referencia-0{n}')
    poses = ['walk-1', 'sit', 'work', 'hand']
    for v in ('char-34', 'campus'):
        save(rows_sheet(f'Poses · {VIEW[v]} · antes / después',
                        [('Antes', [big(B, 'poses', p, v) for p in poses]), ('Después', [big(A, 'poses', p, v) for p in poses])],
                        (430, 710), [POSE[p] for p in poses]), f'05-poses-{v}')
    for dpr in (1, 2):
        rows = []
        for label, run in (('Antes', B), ('Después', A)):
            ims = []
            for v in ('char-front', 'char-34', 'campus'):
                for hpx in (80, 120):
                    im = Image.open(run / 'lectura' / f'rest-{v}-{hpx}px-dpr{dpr}.png').convert('RGB')
                    ims.append(crop_centre(im, int(hpx * 1.2 * dpr), int(hpx * 1.3 * dpr)))
            rows.append((label, ims))
        cols = [f'{VIEW[v]} {hpx}px' for v in ('char-front', 'char-34', 'campus') for hpx in (80, 120)]
        save(rows_sheet(f'Lectura a 80 y 120 px CSS · DPR {dpr} · píxeles nativos', rows, (max(170, 160 * dpr), int(160 * dpr)), cols), f'06-lectura-dpr{dpr}')
    save(rows_sheet('Aristas (wireframe) · antes / después',
                    [('Antes', [big(B, 'aristas', 'rest', v) for v in ('char-front', 'char-34')]), ('Después', [big(A, 'aristas', 'rest', v) for v in ('char-front', 'char-34')])],
                    (430, 710), ['Frente', 'Tres cuartos']), '07-aristas')
    rep = json.loads((A / 'piezas' / 'report.json').read_text())
    tiles = []
    for img in rep['images']:
        if img.get('isolated') and img['view'] == ('back' if img['isolated'] in ('backpack', 'straps', 'ears', 'P19', 'P20', 'P03') else 'char-34'):
            info = next((c for c in rep['images'][0]['components'] if c['id'] == img['isolated']), None) if rep['images'][0].get('components') else None
            bones = ', '.join(info['perBone'].keys()) if info else ''
            tiles.append((pc.trim(Image.open(A / 'piezas' / img['file'])), f"{img['isolated']} · {info['triangles'] if info else '?'} tri · {bones}"))
    save(pc.grid(tiles, 3, 620, 420), '08-piezas-aisladas')

    index = {'before': str(B), 'after': str(A), 'images': [{'file': f'{m}.png', 'sha256': hashlib.sha256((out / f'{m}.png').read_bytes()).hexdigest()} for m in made]}
    (out / 'index.json').write_text(json.dumps(index, indent=2, ensure_ascii=False))
    print(json.dumps({'out': str(out), 'images': len(made)}))


if __name__ == '__main__':
    main()
