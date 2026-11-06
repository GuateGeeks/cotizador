'use strict';
// Geeky oculto para los clientes: la cotización manual sigue igual y el agente no se monta.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const vm = require('node:vm');
const { execFileSync } = require('node:child_process');
const root = path.resolve(__dirname, '../..');

function loadConfig(file) {
  const window = {};
  vm.runInNewContext(fs.readFileSync(file, 'utf8'), { window, Object });
  return window.GG_AGENT_CONFIG;
}

test('la configuración versionada deja a Geeky desactivado', () => {
  assert.equal(loadConfig(path.join(root, 'asesor/agent-config.js')).enabled, false);
});

test('la interfaz no monta botón ni panel cuando enabled es false', async () => {
  const touched = [];
  const trap = name => () => { touched.push(name); throw new Error('no debe tocar el DOM: ' + name); };
  global.document = { getElementById: () => null, createElement: trap('createElement'), body: { append: trap('append') }, querySelector: () => null };
  global.window = { GG_AGENT_CONFIG: { enabled: false } };
  const { mountGeeky } = await import(path.join(root, 'asesor/agent-ui.mjs'));
  assert.equal(mountGeeky({ config: { enabled: false } }), undefined);
  assert.deepEqual(touched, []);
  delete global.document; delete global.window;
});

test('index.html sigue cargando el adaptador pero la cotización manual no depende de Geeky', () => {
  const html = fs.readFileSync(path.join(root, 'asesor/index.html'), 'utf8');
  assert.match(html, /agent-config\.js\?v=\d+/);
  assert.ok(!/geeky-companion|geeky-launcher/.test(html), 'el botón no viene escrito en el HTML: lo crea el módulo solo si está activo');
});

test('publicar con GEEKY_AGENT_ENDPOINT definido no reactiva a Geeky', () => {
  const yml = fs.readFileSync(path.join(root, '.github/workflows/pages.yml'), 'utf8');
  const script = yml.match(/node --input-type=module <<'JS'\n([\s\S]*?)\n\s*JS\n/)[1].replace(/^ {10}/gm, '');
  const cases = [
    ['desactivado en el repositorio', 'enabled: false', false],
    ['activado en el repositorio', 'enabled: true', true]
  ];
  for (const [label, flag, expected] of cases) {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'agente-off-'));
    fs.mkdirSync(path.join(dir, 'asesor')); fs.mkdirSync(path.join(dir, '_site'));
    fs.writeFileSync(path.join(dir, 'asesor/agent-config.js'), 'window.GG_AGENT_CONFIG = Object.freeze({ ' + flag + ', endpoint: "https://x.example/session" });\n');
    execFileSync(process.execPath, ['--input-type=module', '-e', script], { cwd: dir, env: { ...process.env, GEEKY_AGENT_ENDPOINT: 'https://override.example/session' } });
    const out = loadConfig(path.join(dir, '_site/agent-config.js'));
    assert.equal(out.enabled, expected, label);
    assert.equal(out.endpoint, 'https://override.example/session', 'el override del endpoint se conserva');
  }
});
