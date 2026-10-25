#!/usr/bin/env python3
"""Before/after sheets per room kind from two tools/campus-rooms.cjs runs.

Each sheet puts the focused room and the close zoom side by side (before left, after right) with the
device visibility numbers of tools/paper-activity-check.mjs when the reports are given.

    python3 -I tools/campus-rooms-compare.py <out> --before <rooms run> --after <rooms run>
        [--before-check <activity report.json>] [--after-check <activity report.json>]
"""
import argparse
import json
import os
import sys

from PIL import Image, ImageDraw, ImageFont

KINDS = [
    ('aula-pre', 'Aula de nivel: preprimaria (con seguimiento)', None),
    ('aula-prim', 'Aula de nivel: primaria', None),
    ('aula-bas', 'Aula de nivel: básico', None),
    ('aula-bach', 'Aula de nivel: bachillerato', None),
    ('tale', 'Tale-Bot (preprimaria)', 'project:tale'),
    ('master', 'Robot Master (primaria)', 'project:master'),
    ('spike', 'SPIKE', 'project:spike'),
    ('electronics', 'Electrónica (con formación docente)', 'project:electronics'),
    ('immersive', 'Realidad virtual', 'project:immersive'),
    ('drones', 'Drones', 'patio:drones'),
]


def font(size):
    for path in ('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf', '/usr/share/fonts/TTF/DejaVuSans.ttf'):
        if os.path.exists(path):
            return ImageFont.truetype(path, size)
    return ImageFont.load_default()


def device_numbers(report, room):
    if not report or not room:
        return ''
    state = next((s for s in report['states'] if s['n'] == 6), None)
    rows = [v for v in (state or {}).get('visibility', []) if v['room'] == room]
    return '  '.join(f"{v['name'].split('.', 1)[1]}: general {v['overview']['visible']} px², foco {v['focus']['visible']} px²" for v in rows)


def people(report, room):
    state = next((s for s in (report or {}).get('states', []) if s['n'] == 6), None)
    return (state or {}).get('peopleRooms', {}).get(room) if room else None


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('out')
    ap.add_argument('--before', required=True)
    ap.add_argument('--after', required=True)
    ap.add_argument('--before-check')
    ap.add_argument('--after-check')
    a = ap.parse_args()
    if os.path.exists(a.out) and os.listdir(a.out):
        sys.exit(f'{a.out} ya tiene evidencia: usa una carpeta nueva.')
    os.makedirs(a.out, exist_ok=True)
    load = lambda p: json.load(open(p)) if p else None
    rb, ra = load(a.before_check), load(a.after_check)
    title, small = font(30), font(20)
    tile = (720, 652)
    made = []
    for key, label, room in KINDS + [('vista-general', 'Vista general (estado 6)', None)]:
        pairs = [('vista-general.png',)] if key == 'vista-general' else [(f'{key}-foco.png',), (f'{key}-cerca.png',)]
        rows = []
        for (name,) in pairs:
            imgs = []
            for folder in (a.before, a.after):
                path = os.path.join(folder, name)
                imgs.append(Image.open(path).convert('RGB').resize(tile) if os.path.exists(path) else Image.new('RGB', tile, (230, 230, 230)))
            rows.append(imgs)
        W, H = tile[0] * 2 + 30, 110 + len(rows) * (tile[1] + 10)
        sheet = Image.new('RGB', (W, H), (244, 241, 246))
        d = ImageDraw.Draw(sheet)
        d.text((10, 8), label, fill=(50, 24, 83), font=title)
        d.text((10, 48), 'Antes: ' + (device_numbers(rb, room) or '-') + (f'  · personas {people(rb, room)}' if people(rb, room) is not None else ''), fill=(90, 60, 120), font=small)
        d.text((10, 74), 'Después: ' + (device_numbers(ra, room) or '-') + (f'  · personas {people(ra, room)}' if people(ra, room) is not None else ''), fill=(90, 60, 120), font=small)
        for r, (before, after) in enumerate(rows):
            y = 110 + r * (tile[1] + 10)
            sheet.paste(before, (10, y))
            sheet.paste(after, (20 + tile[0], y))
            d.text((18, y + 6), 'ANTES', fill=(200, 40, 40), font=small)
            d.text((28 + tile[0], y + 6), 'DESPUÉS', fill=(20, 140, 60), font=small)
        target = os.path.join(a.out, f'{key}.png')
        sheet.save(target)
        made.append(target)
    print(json.dumps({'out': a.out, 'sheets': made}, ensure_ascii=False))


if __name__ == '__main__':
    main()
