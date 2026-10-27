// Keyframed clips retouched in Blender (3d-assets procedural-web) over the pose functions.
const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const load = rel => import(pathToFileURL(path.join(__dirname, rel)).href);

test('un clip sustituye la pose con los argumentos muestreados y la función sigue para los demás', async () => {
  const { withClips, POSE_FUNCTIONS, pose } = await load('../lab/campus-people.js');
  const frame = z => ({ ...pose(), armR: [0, 0, z] });
  const table = withClips(POSE_FUNCTIONS, {
    wave: [{ name: 'wave', args: ['$t'], time: { arg: 0, scale: 1 }, offset: null, duration: 1, fps: 2, frames: [frame(-1), frame(-2)] }],
    highFive: [{ name: 'highFive', args: ['L'], time: null, offset: null, duration: 0, fps: 0, frames: [frame(.5)] }],
    talk: [{ name: 'talk', args: ['$t', 0], time: { arg: 0, scale: 1 }, offset: { arg: 1 }, duration: 2, fps: 1, frames: [frame(0), frame(1)] }]
  });
  assert.equal(table.wave(0).armR[2], -1);
  assert.equal(table.wave(.25).armR[2], -1.5, 'interpolación lineal entre fotogramas');
  assert.equal(table.wave(1.25).armR[2], -1.5, 'el clip se repite cada `duration`');
  assert.equal(table.wave(.75).armR[2], -1.5, 'del último fotograma vuelve al primero');
  assert.equal(table.highFive('L').armR[2], .5);
  assert.deepEqual(table.highFive('R'), POSE_FUNCTIONS.highFive('R'), 'otro argumento: la función original');
  assert.equal(table.talk(0, 1).armR[2], 1, 'el desfase k se suma al tiempo');
  assert.deepEqual(table.stand(), POSE_FUNCTIONS.stand(), 'sin clip, la función');
});

test('sin retoques no hay clips: el campus usa las funciones de pose', async () => {
  const { CLIPS, SOURCE } = await load('../lab/paper/pose-clips-data.js');
  const { POSES, POSE_FUNCTIONS } = await load('../lab/campus-people.js');
  if (Object.keys(CLIPS).length) { assert.ok(SOURCE && /^[0-9a-f]{64}$/.test(SOURCE.sha256), 'clips con procedencia'); return; }
  for (const name of Object.keys(POSE_FUNCTIONS)) assert.equal(POSES[name], POSE_FUNCTIONS[name], name);
});
