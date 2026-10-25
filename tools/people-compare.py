#!/usr/bin/env python3
"""Side-by-side comparisons of the papercraft people against the construction package R1
(docs/papercraft/construction/reference/01–05) and the kit sheets 07 and 13, plus the
readability ladder (40/60/80/120/600 px CSS, DPR 1 and 2).

  python3 tools/people-compare.py <new-out-dir> --shots artifacts/paper/<run>

<run> holds the three folders written by tools/people-shot.cjs: ladder/, levels/, poses/.
Needs Pillow. References are design targets; every lower half is a real render.
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
VIEW = {'front': 'Frente', '34': 'Tres cuartos', 'side': 'Lateral', 'back': 'Espalda', 'top': 'Vista superior'}


def main():
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument('out')
    ap.add_argument('--shots', required=True)
    a = ap.parse_args()
    out, S = Path(a.out), Path(a.shots)
    if out.exists() and any(out.iterdir()):
        raise SystemExit(f'{out} ya tiene evidencia: usa una carpeta nueva.')
    out.mkdir(parents=True, exist_ok=True)
    img = lambda folder, piece, view, size, dpr=1: pc.trim(Image.open(S / folder / f'{piece}-{view}-{size}px-dpr{dpr}.png'))
    head = lambda im, k=.36: im.crop((0, 0, im.width, int(im.height * k)))
    torso = lambda im: im.crop((0, int(im.height * .24), im.width, int(im.height * .62)))
    made = []

    def save(name, title, ref, ref_cap, ours, ours_cap):
        pc.sheet(title, ref, ref_cap, ours, ours_cap).save(out / f'{name}.png')
        made.append(name)

    views = ['front', 'side', 'back', '34', 'top']
    save('01-personaje-maestro', 'Personaje maestro: estudiante de primaria', Image.open(CONS / '01-personaje-maestro.png').convert('RGB'), 'lámina 01 (R1)',
         pc.grid([(img('levels', 'person-prim', v, 600), VIEW[v]) for v in views], 5, 360, 620), 'person-prim, 600 px CSS, DPR 1')
    save('02-despiece', 'Despiece: piezas y capas del personaje', Image.open(CONS / '02-despiece-personaje.png').convert('RGB'), 'lámina 02 (R1)',
         pc.grid([(img('levels', 'person-prim', '34', 600), 'Armado (tres cuartos)'), (head(img('levels', 'person-prim', 'front', 600)), 'Cabeza y cabello'),
                  (torso(img('levels', 'person-prim', 'front', 600)), 'Torso, V, tirantes y mangas'), (img('levels', 'person-prim', 'back', 600), 'Mochila')], 4, 440, 620),
         'person-prim (cada pieza es una parte del manifiesto)')
    save('03-cabello', 'Cabello: núcleo de 32 triángulos y mechones plegados', Image.open(CONS / '03-cabello-construccion.png').convert('RGB'), 'lámina 03 (R1)',
         pc.grid([(head(img('levels', 'person-prim', v, 600), .4 if v != 'top' else 1), VIEW[v]) for v in ['front', 'side', 'back', 'top']] +
                 [(head(img('levels', p, '34', 600)), lbl) for p, lbl in [('person-bas', 'Melena (60)'), ('person-bach', 'Cola (56)'), ('person-pre', 'Gorra con coletas (60)'), ('person-teacher', 'Docente, pelo corto (48)')]], 4, 440, 360),
         'pelo corto 48 y variantes, 600 px CSS')
    save('04-mangas', 'Mangas: dos secciones y cuatro paneles', Image.open(CONS / '04-mangas-construccion.png').convert('RGB'), 'lámina 04 (R1)',
         pc.grid([(torso(img('levels', 'person-prim', 'front', 600)), 'Vista frontal'), (torso(img('levels', 'person-prim', 'side', 600)), 'Vista lateral'),
                  (torso(img('poses', 'pose-hand', '34', 600)), 'Mano levantada'), (torso(img('poses', 'pose-point', '34', 600)), 'Docente señalando')], 4, 440, 360),
         '8 triángulos por manga, extremos abiertos')
    save('05-falda', 'Falda: dos mitades de seis paneles', Image.open(CONS / '05-falda-construccion.png').convert('RGB'), 'lámina 05 (R1)',
         pc.grid([(img('ladder', 'person-prim-skirt', v, 600), VIEW[v]) for v in ['front', 'side', 'back']] +
                 [(img('poses', 'pose-sit', '34', 600), 'Sentada'), (img('poses', 'pose-work', 'side', 600), 'Tecleando')], 5, 360, 620),
         'person-prim-skirt y poses sentadas (falda sobre legL/legR)')
    lineup = [(img('levels', p, '34', 600), lbl) for p, lbl in [('person-pre', 'Preprimaria'), ('person-prim', 'Primaria'), ('person-bas', 'Básico'), ('person-bach', 'Bachillerato'), ('person-teacher', 'Docente')]]
    save('07-personajes', 'Personajes por nivel', Image.open(KIT / '07-personajes.png').convert('RGB'), 'lámina 07 (kit)', pc.grid(lineup, 5, 360, 620), 'perfiles de nivel, 600 px CSS')
    poses = [(img('poses', p, '34', 600), lbl) for p, lbl in [('pose-walk', 'Caminar'), ('pose-sit', 'Sentarse'), ('pose-work', 'Teclear'), ('pose-point', 'Señalar'), ('pose-hand', 'Mano levantada'), ('pose-headset', 'Con visor')]]
    save('08-poses', 'Poses admitidas', Image.open(KIT / '08-actividades.png').convert('RGB'), 'lámina 08 (kit)', pc.grid(poses, 6, 300, 520), 'tres cuartos, 600 px CSS')
    save('13-acercamientos', 'Acercamientos a 600 px', Image.open(KIT / '13-acercamientos.png').convert('RGB'), 'lámina 13 (kit)',
         pc.grid([(head(img('ladder', 'person-prim', '34', 600, 2)), 'Cabeza, DPR 2'), (torso(img('ladder', 'person-prim-skirt', '34', 600, 2)), 'Torso y mangas, DPR 2'),
                  (img('poses', 'pose-work', '34', 600), 'Sentada tecleando')], 3, 600, 600), 'juntas y capas')

    # Readability ladder: same camera and light, native pixels (no rescaling of the small renders).
    for dpr in (1, 2):
        rows = []
        for piece in ('person-prim', 'person-prim-skirt'):
            for view in ('front', '34', 'side', 'back'):
                rows.append([Image.open(S / 'ladder' / f'{piece}-{view}-{s}px-dpr{dpr}.png').convert('RGB') for s in (40, 60, 80, 120)])
        cw = max(im.width for r in rows for im in r) + 12
        ch = max(im.height for r in rows for im in r) + 12
        sheet = Image.new('RGB', (max(cw * 4 + 24, 1120), ch * len(rows) + 90), pc.BG)
        d = ImageDraw.Draw(sheet)
        d.text((12, 12), f'Lectura a 40 / 60 / 80 / 120 px CSS · DPR {dpr} · píxeles nativos', fill=pc.INK, font=pc.font(28))
        for c, s in enumerate((40, 60, 80, 120)):
            d.text((12 + c * cw, 52), f'{s} px', fill=pc.INK, font=pc.font(20))
        for r, row in enumerate(rows):
            for c, im in enumerate(row):
                sheet.paste(im, (12 + c * cw, 84 + r * ch))
        sheet.save(out / f'lectura-dpr{dpr}.png')
        made.append(f'lectura-dpr{dpr}')

    index = {'shots': str(S), 'images': [{'file': f'{m}.png', 'sha256': hashlib.sha256((out / f'{m}.png').read_bytes()).hexdigest()} for m in made]}
    (out / 'index.json').write_text(json.dumps(index, indent=2, ensure_ascii=False))
    print(json.dumps({'out': str(out), 'images': len(made)}))


if __name__ == '__main__':
    main()
