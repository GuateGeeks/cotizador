const {test} = require('node:test');
const assert = require('node:assert/strict');

class Element {
  constructor() { this.attrs = {}; this.children = []; this.style = {}; }
  setAttribute(k, v) { this.attrs[k] = String(v); }
  replaceChild(fresh, old) { fresh.remove(); const i = this.children.indexOf(old); this.children[i] = fresh; fresh.parent = this; old.parent = null; }
  removeAttribute(k) { delete this.attrs[k]; }
  appendChild(n) { this.children.push(n); n.parent = this; return n; }
  remove() { if (this.parent) this.parent.children = this.parent.children.filter(n => n !== this); }
  get firstChild() { return this.children[0]; }
}

test('original portrait has bounded motion, static pause and reduced motion, and complete cleanup', async () => {
  const frames = new Map(), listeners = new Map(), mediaListeners = new Set();
  let id = 0, time = 0;
  const media = {matches: false, addEventListener: (_, cb) => mediaListeners.add(cb), removeEventListener: (_, cb) => mediaListeners.delete(cb)};
  global.document = {
    hidden: false, createElementNS: () => new Element(),
    addEventListener: (name, cb) => listeners.set(name, cb), removeEventListener: name => listeners.delete(name),
  };
  global.window = {matchMedia: () => media};
  global.requestAnimationFrame = cb => {frames.set(++id, cb); return id;};
  global.cancelAnimationFrame = n => frames.delete(n);
  const tick = () => {time += 34; const callbacks = [...frames.values()]; frames.clear(); callbacks.forEach(cb => cb(time));};
  const {mountGeekyCharacter} = await import('../lab/agent-character.js');
  const host = new Element(), character = mountGeekyCharacter(host);
  assert.equal(host.children.length, 1);
  assert.equal(host.firstChild.attrs['aria-hidden'], 'true');
  assert.ok(character.getDiagnostics().renderCount >= 1, 'renders before the first RAF');
  character.react('greet');
  assert.equal(character.getDiagnostics().action, 'waving');
  for (let i = 0; i < 400; i++) tick();
  assert.equal(frames.size, 0, 'idle settles without a permanent RAF');
  for (const state of ['connecting', 'listening', 'thinking', 'speaking', 'acting', 'error']) {
    character.setState(state);
    assert.equal(character.getDiagnostics().state, state);
    tick();
  }
  for (let i = 0; i < 300; i++) tick();
  assert.equal(frames.size, 0, 'active activity settles after its bounded window');
  character.setState('thinking');
  character.setPaused(true);
  assert.equal(frames.size, 0);
  const count = character.getDiagnostics().renderCount;
  tick();
  assert.equal(character.getDiagnostics().renderCount, count);
  character.setPaused(false);
  assert.ok(frames.size > 0);
  document.hidden = true; listeners.get('visibilitychange')();
  assert.equal(frames.size, 0);
  document.hidden = false; listeners.get('visibilitychange')();
  assert.ok(frames.size > 0);
  character.setVisible(false);
  assert.equal(frames.size, 0);
  character.setVisible(true);
  media.matches = true; [...mediaListeners].forEach(cb => cb());
  assert.equal(frames.size, 0, 'reduced motion is static');
  character.react('success');
  assert.equal(frames.size, 0);
  assert.equal(character.getDiagnostics().action, 'nod');
  character.dispose(); character.dispose(); character.setState('thinking'); character.react('greet');
  assert.equal(host.children.length, 0);
  assert.equal(listeners.size, 0); assert.equal(mediaListeners.size, 0); assert.equal(frames.size, 0);
});
