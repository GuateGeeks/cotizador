#!/usr/bin/env python3
"""Side-by-side comparisons: papercraft reference sheets vs the 3-D models rendered
from the inspector (tools/paper-shot.cjs). One image per reference topic.

  python3 tools/paper-compare.py <new-out-dir> --sheets artifacts/paper/<sheets-run> --states artifacts/paper/<states-run>

Needs Pillow. References are design targets; the lower half of every image is a real render.
"""
import argparse
import hashlib
import json
from pathlib import Path
from PIL import Image, ImageChops, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[1]
REF = ROOT / 'docs/papercraft/reference'
BG = (244, 241, 246)
INK = (50, 24, 83)


def font(size):
    for f in ('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf', '/usr/share/fonts/TTF/DejaVuSans-Bold.ttf'):
        try:
            return ImageFont.truetype(f, size)
        except OSError:
            pass
    return ImageFont.load_default()


def trim(im, pad=14):
    """Crop a render to its content (the inspector background is BG)."""
    im = im.convert('RGB')
    diff = ImageChops.difference(im, Image.new('RGB', im.size, BG)).convert('L').point(lambda v: 255 if v > 14 else 0)
    box = diff.getbbox()
    if not box:
        return im
    return im.crop((max(0, box[0] - pad), max(0, box[1] - pad), min(im.width, box[2] + pad), min(im.height, box[3] + pad)))


def fit(im, w=None, h=None):
    if w and (not h or im.width / im.height >= w / h):
        return im.resize((w, max(1, round(im.height * w / im.width))), Image.LANCZOS)
    return im.resize((max(1, round(im.width * h / im.height)), h), Image.LANCZOS)


def labelled(im, text, size=22, h=40):
    out = Image.new('RGB', (im.width, im.height + h), (255, 255, 255))
    out.paste(im, (0, h))
    ImageDraw.Draw(out).text((12, 8), text, fill=INK, font=font(size))
    return out


def grid(items, cols, cell_w, cell_h, gap=14):
    rows = (len(items) + cols - 1) // cols
    out = Image.new('RGB', (cols * cell_w + (cols - 1) * gap, rows * (cell_h + 40) + (rows - 1) * gap), BG)
    for i, (im, text) in enumerate(items):
        tile = labelled(fit(im, cell_w, cell_h), text)
        canvas = Image.new('RGB', (cell_w, cell_h + 40), (255, 255, 255))
        canvas.paste(tile, ((cell_w - tile.width) // 2, 0))
        out.paste(canvas, ((i % cols) * (cell_w + gap), (i // cols) * (cell_h + 40 + gap)))
    return out


def sheet(title, ref_img, ref_caption, ours_img, ours_caption, width=1800):
    top = labelled(fit(ref_img, width), 'Referencia · ' + ref_caption, 26, 48)
    bottom = labelled(fit(ours_img, width), 'Modelos 3D creados · ' + ours_caption, 26, 48)
    out = Image.new('RGB', (width + 48, top.height + bottom.height + 150), BG)
    ImageDraw.Draw(out).text((24, 22), title, fill=INK, font=font(38))
    out.paste(top, (24, 84))
    out.paste(bottom, (24, 84 + top.height + 30))
    return out


def main():
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument('out')
    ap.add_argument('--sheets', required=True)
    ap.add_argument('--states', required=True)
    a = ap.parse_args()
    out, S, T = Path(a.out), Path(a.sheets), Path(a.states)
    if out.exists() and any(out.iterdir()):
        raise SystemExit(f'{out} ya tiene evidencia: usa una carpeta nueva.')
    out.mkdir(parents=True, exist_ok=True)
    pieces = {p['id']: p for p in json.loads((S / 'report.json').read_text())['pieces']}
    shot = lambda pid, view='34': trim(Image.open(S / f'{pid}-{view}.png'))
    group_sheet = lambda g: trim(Image.open(S / f'{g}-sheet.png'), 30)
    ref = lambda name: Image.open(REF / name).convert('RGB')
    made = []

    def piece_grid(ids, cols, view='34', h=420):
        return grid([(shot(i, view), pieces[i]['label']) for i in ids if i in pieces], cols, 420, h)

    topics = [
        ('01-materiales', 'Materiales y construcción del papel', '01-materiales.png', 'lámina 01',
         piece_grid(['kit-sheet', 'kit-edge', 'kit-valley', 'kit-mountain', 'kit-tab', 'kit-frame', 'kit-roof', 'kit-prism', 'kit-contact'], 3, 'close'), 'kit (acercamientos)'),
        ('02-aulas', 'Biblioteca arquitectónica A: aulas', '02-modulos-aulas.png', 'lámina 02',
         piece_grid(['pedestal', 'room-initial', 'room-extendable', 'room-corner', 'room-end', 'room-upper', 'roof', 'columns'], 4), 'grupo rooms (vista 34)'),
        ('03-conexiones', 'Biblioteca arquitectónica B: conexiones', '03-modulos-conexiones.png', 'lámina 03',
         piece_grid(['entrance', 'corridor', 'stairs', 'bridge', 'patio', 'gallery', 'path', 'steps'], 4), 'grupo links (vista 34)'),
        ('04-vegetacion', 'Vegetación', '04-vegetacion.png', 'lámina 04',
         piece_grid(['tree-large', 'tree-small', 'tree-cards', 'bush', 'plant-rhombus', 'flowers', 'pot', 'planter', 'bench'], 3), 'grupo nature (vista 34)'),
        ('05-mobiliario', 'Mobiliario y recursos de aula', '05-mobiliario.png', 'lámina 05',
         piece_grid(['table', 'chair-orange', 'chair-turquoise', 'laptop', 'screen', 'resources', 'shelf', 'whiteboard'], 4), 'grupo furniture (vista 34)'),
        ('06-tecnologias', 'Tecnologías educativas', '06-tecnologias.png', 'lámina 06',
         piece_grid(['robot-tale', 'robot-dino', 'kit-spike', 'electronics', 'drone', 'vr-headset'], 3, 'close'), 'grupo tech (acercamientos)'),
        ('07-personajes', 'Personajes', '07-personajes.png', 'lámina 07',
         piece_grid(['person-pre', 'person-prim', 'person-bas', 'person-bach', 'person-teacher'], 5, '34', 520), 'grupo people (vista 34)'),
        ('08-actividades', 'Actividades y poses', '08-actividades.png', 'lámina 08',
         piece_grid(['pose-walk', 'pose-sit', 'pose-work', 'pose-point', 'pose-headset'], 5, '34', 460), 'poses del grupo people'),
    ]
    for key, title, ref_name, ref_cap, ours, ours_cap in topics:
        sheet(title, ref(ref_name), ref_cap, ours, ours_cap).save(out / f'{key}.png')
        made.append(key)

    names = ['Escuela inicial', 'Comunidad educativa', 'Robótica', 'Programación y ampliación', 'Entorno y conexiones', 'Campus consolidado']
    states = grid([(Image.open(T / f'estado-{n}.png').convert('RGB'), f'{n}. {names[n - 1]}') for n in range(1, 7)], 3, 600, 400)
    sheet('Seis estados de crecimiento (misma cámara)', ref('09-crecimiento-v3.png'), 'lámina 09', states, 'campus compuesto por el planificador').save(out / '09-crecimiento.png')
    made.append('09-crecimiento')

    frames = sorted(T.glob('ensamblaje-*.png'), key=lambda p: float('0.' + p.stem.split('-')[1][1:]) if p.stem.split('-')[1] != '1' else 1.0)
    asm = grid([(trim(Image.open(f)), f'Paso {i + 1}') for i, f in enumerate(frames)], 3, 600, 400)
    sheet('Secuencia de ensamblaje', ref('10-ensamblaje.png'), 'lámina 10', asm, 'escuela inicial ensamblándose').save(out / '10-ensamblaje.png')
    made.append('10-ensamblaje')

    close = grid([(shot('room-initial', 'close'), 'Esquina de aula'), (shot('person-bas', 'close'), 'Persona'),
                  (shot('tree-large', 'close'), 'Árbol'), (shot('planter', 'close'), 'Jardinera'), (shot('robot-tale', 'close'), 'Robot sobre mesa'),
                  (shot('chair-orange', 'close'), 'Silla')], 3, 600, 420)
    sheet('Acercamientos de control de calidad', ref('13-acercamientos.png'), 'lámina 13', close, 'acercamientos del inspector').save(out / '13-acercamientos.png')
    made.append('13-acercamientos')

    views = grid([(Image.open(T / f'{v}.png').convert('RGB'), c) for v, c in
                  [('vista-general', 'Vista general'), ('vista-frontal', 'Vista frontal'), ('patio-y-aulas', 'Patio y aulas'), ('personajes-y-equipo', 'Personajes y equipo')]], 2, 900, 600)
    sheet('Cuatro vistas de referencia', ref('papercraft-reference.png'), 'GuateGeeks Papercraft', views, 'campus consolidado (estado 6)').save(out / '00-vistas.png')
    made.insert(0, '00-vistas')

    index = {'sheets': str(S), 'states': str(T), 'images': [
        {'file': f'{m}.png', 'sha256': hashlib.sha256((out / f'{m}.png').read_bytes()).hexdigest()} for m in made]}
    (out / 'index.json').write_text(json.dumps(index, indent=2, ensure_ascii=False))
    print(json.dumps({'out': str(out), 'images': len(made)}))


if __name__ == '__main__':
    main()
