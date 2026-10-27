"""Contact sheets, animated GIFs and frame differences for a campus-life run.

    python3 -I tools/campus-life-sheets.py artifacts/vida/<run> [--compare artifacts/vida/<before>]

Reads <run>/life.json (tools/campus-life.cjs). Writes <run>/sheets/<target>.png
(frames in a grid, labelled with the scene's animation time), <run>/gif/<target>.gif
and <run>/sheets/motion.json: mean absolute pixel change between consecutive frames
(0-255) per target, a measure of how much the scene visibly moves. With --compare,
also <run>/sheets/compare-<target>.png (before row above after row) and the
before figures in motion.json.
"""
import json
import sys
from pathlib import Path

from PIL import Image, ImageChops, ImageDraw, ImageStat

INK = (50, 24, 83)


def load(run):
    data = json.loads((run / 'life.json').read_text())
    targets = {name: entry['frames'] for name, entry in data['targets'].items()}
    if data.get('overview'):
        targets['overview'] = data['overview']
    labels = {name: entry.get('label', name) for name, entry in data['targets'].items()}
    labels['overview'] = 'Vista general (60 s)'
    return data, targets, labels


def crop_box(image):
    # Drop the HUD bands (title above, counters below); keep the model area.
    w, h = image.size
    return (0, int(h * .08), w, int(h * .9))


def frames_of(run, frames, width):
    out = []
    for frame in frames:
        image = Image.open(run / frame['file']).convert('RGB')
        image = image.crop(crop_box(image))
        scale = width / image.width
        out.append(image.resize((width, int(image.height * scale)), Image.LANCZOS))
    return out


def motion(images):
    diffs = []
    for a, b in zip(images, images[1:]):
        diffs.append(sum(ImageStat.Stat(ImageChops.difference(a, b)).mean) / 3)
    return {'mean': sum(diffs) / len(diffs) if diffs else 0, 'max': max(diffs) if diffs else 0, 'pairs': [round(d, 3) for d in diffs]}


def sheet(images, frames, title, cols=4):
    w, h = images[0].size
    rows = (len(images) + cols - 1) // cols
    canvas = Image.new('RGB', (cols * w + (cols + 1) * 6, rows * (h + 18) + 34 + 6), (244, 241, 246))
    draw = ImageDraw.Draw(canvas)
    draw.text((8, 8), title, fill=INK)
    for i, (image, frame) in enumerate(zip(images, frames)):
        x, y = 6 + (i % cols) * (w + 6), 34 + (i // cols) * (h + 18)
        canvas.paste(image, (x, y))
        t = frame.get('animationTime')
        draw.text((x + 2, y + h + 2), f"#{i}  t={t:.1f} s" if isinstance(t, (int, float)) else f"#{i}", fill=INK)
    return canvas


def compare(before, after, title):
    w, h = after[0].size
    n = max(len(before), len(after))
    canvas = Image.new('RGB', (n * (w + 4) + 4, 2 * (h + 20) + 30), (244, 241, 246))
    draw = ImageDraw.Draw(canvas)
    draw.text((6, 6), title + '  (arriba: antes, abajo: después)', fill=INK)
    for row, images in enumerate([before, after]):
        for i, image in enumerate(images):
            canvas.paste(image.resize((w, h)), (4 + i * (w + 4), 30 + row * (h + 20)))
    return canvas


def main(argv):
    run = Path(argv[1])
    before = Path(argv[argv.index('--compare') + 1]) if '--compare' in argv else None
    data, targets, labels = load(run)
    (run / 'sheets').mkdir(exist_ok=True)
    (run / 'gif').mkdir(exist_ok=True)
    report = {}
    old = load(before) if before else None
    for name, frames in targets.items():
        small = frames_of(run, frames, 330)
        report[name] = {'after': motion(small)}
        sheet(small, frames, f"{labels[name]} · {len(frames)} cuadros").save(run / 'sheets' / f'{name}.png')
        gif = frames_of(run, frames, 640)
        duration = 500 if name != 'overview' else 400
        gif[0].save(run / 'gif' / f'{name}.gif', save_all=True, append_images=gif[1:], duration=duration, loop=0, optimize=True)
        if old and name in old[1]:
            prev = frames_of(before, old[1][name], 330)
            report[name]['before'] = motion(prev)
            strip = 6 if name != 'overview' else 7
            pick = lambda seq: seq[::max(1, len(seq) // strip)][:strip]
            compare(pick(frames_of(before, old[1][name], 260)), pick(frames_of(run, frames, 260)), labels[name]).save(run / 'sheets' / f'compare-{name}.png')
    (run / 'sheets' / 'motion.json').write_text(json.dumps(report, indent=2) + '\n')
    for name, entry in report.items():
        line = f"{name:16s} después {entry['after']['mean']:.2f}"
        if 'before' in entry:
            line += f"  antes {entry['before']['mean']:.2f}"
        print(line)


if __name__ == '__main__':
    main(sys.argv)
