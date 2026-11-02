#!/usr/bin/env python3
"""Asset pipeline CLI. Run from the repo root: python3 scripts/world.py <command>."""
import argparse, json, os, pathlib, shutil, subprocess, sys

ROOT = pathlib.Path(__file__).resolve().parent.parent

def load_contract():
    constants = json.loads((ROOT / 'world/constants.json').read_text())
    return {**constants, 'materials': json.loads((ROOT / 'world/materials.json').read_text())}

def blender_path():
    path = os.environ.get('GG_BLENDER')
    config = ROOT / '.local/config.json'
    if not path and config.exists():
        path = json.loads(config.read_text()).get('blender')
    path = path or shutil.which('blender')
    if not path:
        sys.exit('Blender not configured: copy config.example.json to .local/config.json or set GG_BLENDER')
    return path

def native(path):
    """Paths as the Blender process sees them: Windows Blender under WSL needs wslpath."""
    if blender_path().lower().endswith('.exe'):
        return subprocess.run(['wslpath', '-w', str(path)], capture_output=True, text=True, check=True).stdout.strip()
    return str(path)

def run_blender(*args, log=None):
    command = [blender_path(), '-b', '--factory-startup', '-P', native(ROOT / 'scripts/blender/entry.py'), '--', *args]
    done = subprocess.run(command, capture_output=True, text=True)
    output = done.stdout + done.stderr
    if log:
        pathlib.Path(log).write_text(output)
    if 'GG_DONE' not in output:
        sys.stderr.write(output[-3000:])
        raise SystemExit('Blender run failed')
    return output

def doctor(_):
    version = subprocess.run([blender_path(), '--version'], capture_output=True, text=True).stdout.splitlines()[0]
    print(version)
    print('contract materials:', len(load_contract()['materials']))

def build(args):
    run = ROOT / args.run
    run.mkdir(parents=True, exist_ok=True)
    extra = ['--no-preview'] if args.no_preview else []
    for asset in args.ids:
        run_blender('build', asset, native(run), *extra, log=run / f'{asset}.log')
        print('built', asset)

def publish(args):
    target = ROOT / 'web/public/models'
    target.mkdir(parents=True, exist_ok=True)
    for glb in (ROOT / args.run).glob('*.glb'):
        shutil.copy2(glb, target / glb.name)
        print('published', glb.name)

def catalog(_):
    rows = ['# Asset catalog', '', 'Generated from `assets/manifests/` by `python3 scripts/world.py catalog`.', '',
            '| Asset | Triangles | Size (m) | Bytes | Technical | Visual |', '| --- | ---: | --- | ---: | --- | --- |']
    for path in sorted((ROOT / 'assets/manifests').glob('*.json')):
        m = json.loads(path.read_text())
        size = ' x '.join(f'{v:.2f}' for v in m['size_m'])
        rows.append(f"| {m['id']} | {m['triangles']} | {size} | {m['bytes']} | {m['verdicts']['technical']} | {m['verdicts']['visual']} |")
    (ROOT / 'docs/ASSET_CATALOG.md').write_text('\n'.join(rows) + '\n')
    print('catalogued', len(rows) - 6)

def main():
    parser = argparse.ArgumentParser(description=__doc__)
    commands = parser.add_subparsers(required=True)
    commands.add_parser('doctor').set_defaults(fn=doctor)
    b = commands.add_parser('build')
    b.add_argument('ids', nargs='+')
    b.add_argument('--run', required=True, help='new run directory, relative to the repo root')
    b.add_argument('--no-preview', action='store_true')
    b.set_defaults(fn=build)
    p = commands.add_parser('publish', help='copy a run\'s GLBs into the web app')
    p.add_argument('--run', required=True)
    p.set_defaults(fn=publish)
    commands.add_parser('catalog').set_defaults(fn=catalog)
    args = parser.parse_args()
    args.fn(args)

if __name__ == '__main__':
    main()
