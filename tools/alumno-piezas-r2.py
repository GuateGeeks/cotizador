#!/usr/bin/env python3
"""One comparison sheet per R2 recipe: the package art sheet (imagenes/Pxx-*.png, seven views
plus "Ubicación") on top, and the integrated piece rendered by tools/alumno-piezas-r2.cjs below,
in the same eight cells and order.

  python3 tools/alumno-piezas-r2.py <new-out-dir> --shots artifacts/paper/<alumno-piezas-r2 run>

Needs Pillow. The art is design intent; the lower half is a real render of the emitted geometry.
"""
import argparse
import hashlib
import json
from pathlib import Path
from PIL import Image, ImageChops, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[1]
ART = ROOT / 'docs/papercraft/construction-r2/imagenes'
BG = (244, 241, 246)
INK = (50, 24, 83)
CELLS = [('part-front', 'Frente'), ('part-back', 'Espalda'), ('part-left', 'Izquierda'), ('part-right', 'Derecha'),
         ('part-top', 'Superior'), ('part-bottom', 'Inferior'), ('part-34', 'Tres cuartos'), (None, 'Ubicación')]


def font(size):
    for f in ('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf', '/usr/share/fonts/TTF/DejaVuSans-Bold.ttf'):
        try:
            return ImageFont.truetype(f, size)
        except OSError:
            pass
    return ImageFont.load_default()


def content_box(im, pad=16):
    diff = ImageChops.difference(im.convert('RGB'), Image.new('RGB', im.size, BG)).convert('L').point(lambda v: 255 if v > 12 else 0)
    box = diff.getbbox()
    if not box:
        return (0, 0, im.width, im.height)
    return (max(0, box[0] - pad), max(0, box[1] - pad), min(im.width, box[2] + pad), min(im.height, box[3] + pad))


def fit(im, w, h):
    k = min(w / im.width, h / im.height)
    return im.resize((max(1, round(im.width * k)), max(1, round(im.height * k))), Image.LANCZOS)


def placement(shots, instance):
    """Whole student faded, the instance at full colour on top (same fixed frame and view), cropped
    around the instance like the sheet's close-up."""
    full = Image.open(shots / 'ubicacion-completo.png').convert('RGB')
    part = Image.open(shots / f'{instance}-ubicacion.png').convert('RGB')
    faded = Image.blend(full, Image.new('RGB', full.size, (255, 255, 255)), .62)
    # A high threshold keeps the piece and drops its soft shadow on the ground.
    mask = ImageChops.difference(part, Image.new('RGB', part.size, BG)).convert('L').point(lambda v: 255 if v > 45 else 0)
    faded.paste(part, (0, 0), mask)
    box = mask.getbbox()
    if not box:
        return faded.crop(content_box(full, 24))
    cx, cy = (box[0] + box[2]) / 2, (box[1] + box[3]) / 2
    side = max(box[2] - box[0], box[3] - box[1]) * 2.6
    fb = content_box(full, 8)
    side = max(side, (fb[3] - fb[1]) * .32)
    w, h = round(side), round(side * .78)
    tile = Image.new('RGB', (w, h), BG)
    x0, y0 = round(cx - w / 2), round(cy - h / 2)
    tile.paste(faded, (-x0, -y0))  # outside the render stays background, never black
    return tile


def ours_grid(shots, instance, width):
    cols, gap, label_h = 4, 12, 34
    cell_w = (width - (cols - 1) * gap) // cols
    cell_h = round(cell_w * .78)
    out = Image.new('RGB', (width, 2 * (cell_h + label_h) + gap), BG)
    draw = ImageDraw.Draw(out)
    # The seven views were rendered in one cube frame: crop each to its content and resize all with the
    # same factor, so their relative size is kept (the largest view fills its cell).
    views = {v: Image.open(shots / f'{instance}-{v}.png').convert('RGB') for v, _ in CELLS if v}
    crops = {v: im.crop(content_box(im)) for v, im in views.items()}
    k = min(min((cell_w - 16) / c.width, (cell_h - 16) / c.height) for c in crops.values())
    for i, (view, label) in enumerate(CELLS):
        x, y = (i % cols) * (cell_w + gap), (i // cols) * (cell_h + label_h + gap)
        tile = Image.new('RGB', (cell_w, cell_h), BG)
        if view is None:
            im = fit(placement(shots, instance), cell_w - 16, cell_h - 16)
        else:
            c = crops[view]
            im = c.resize((max(1, round(c.width * k)), max(1, round(c.height * k))), Image.LANCZOS)
        tile.paste(im, ((cell_w - im.width) // 2, (cell_h - im.height) // 2))
        out.paste(tile, (x, y))
        w = draw.textlength(label, font=font(22))
        draw.text((x + (cell_w - w) / 2, y + cell_h + 5), label, fill=INK, font=font(22))
    return out


def main():
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument('out')
    ap.add_argument('--shots', required=True)
    a = ap.parse_args()
    out, shots = Path(a.out), Path(a.shots)
    if out.exists() and any(out.iterdir()):
        raise SystemExit(f'{out} ya tiene evidencia: usa una carpeta nueva.')
    out.mkdir(parents=True, exist_ok=True)
    report = json.loads((shots / 'report.json').read_text())
    by_recipe = {}
    for c in report['instances']:
        by_recipe.setdefault(c['id'][:3], []).append(c)
    made = []
    W = 1500
    for recipe in sorted(by_recipe):
        arts = sorted(ART.glob(f'{recipe}-*.png'))
        if not arts:
            continue
        art = arts[0]
        group = by_recipe[recipe]
        # A paired or repeated recipe is shown through one instance (left, or the first).
        inst = next((c for c in group if c['id'].endswith('-L')), group[0])
        tris = sum(c['triangles'] for c in group)
        bones = sorted({str(c.get('bone')) for c in group})
        top = fit(Image.open(art).convert('RGB'), W, 10000)
        grid = ours_grid(shots, inst['id'], W)
        title = f'{art.stem} · lámina R2 vs pieza integrada'
        sub = (f'Arriba: imagenes/{art.name} (arte conceptual). Abajo: instancia {inst["id"]} renderizada del cotizador.\n'
               f'{inst["triangles"]} triángulos por instancia · {len(group)} instancia(s) · {tris} en el alumno · hueso {", ".join(bones)}')
        sheet = Image.new('RGB', (W + 48, top.height + grid.height + 202), BG)
        d = ImageDraw.Draw(sheet)
        d.text((24, 20), title, fill=INK, font=font(36))
        d.multiline_text((24, 66), sub, fill=INK, font=font(17), spacing=6)
        sheet.paste(top, (24, 116))
        d.text((24, 116 + top.height + 14), 'Modelo 3D integrado (mismas siete vistas y ubicación)', fill=INK, font=font(24))
        sheet.paste(grid, (24, 116 + top.height + 54))
        name = f'{art.stem}.png'
        sheet.save(out / name)
        made.append({'file': name, 'art': f'imagenes/{art.name}', 'instance': inst['id'], 'instances': [c['id'] for c in group],
                     'triangles': tris, 'sha256': hashlib.sha256((out / name).read_bytes()).hexdigest()})
    (out / 'index.json').write_text(json.dumps({'shots': str(shots), 'sheets': made}, indent=2, ensure_ascii=False))
    print(json.dumps({'out': str(out), 'sheets': len(made)}))


if __name__ == '__main__':
    main()
