import {GeekyBrain} from './geeky/live/brain.mjs';
import {ACTIONS} from './geeky/live/actions.mjs';
import {SvgRenderer} from './geeky/live/svg-renderer.mjs';

// All choreography comes from GuateGeeks' unchanged original action library.
// No autonomous fidgets: each real activity receives a short animation window.
const STATES = Object.freeze({
  idle: 'idle', connecting: 'thinking', listening: 'listen',
  thinking: 'thinking', speaking: 'reading', acting: 'writing', error: 'confused',
});
const REACTIONS = Object.freeze({greet: 'waving', success: 'nod'});
const FRAME_MS = 1000 / 30;
const ACTIVE_SECONDS = 8;

/** Mount one SVG portrait. Move its host between launcher and panel to reuse it.
 * The SVG is decorative by default; the containing UI owns state announcements.
 */
export function mountGeekyCharacter(host, {decorative = true, label = 'Geeky'} = {}) {
  const brain = new GeekyBrain({autonomous: false, seed: 20261028});
  const renderer = new SvgRenderer(host, {label, zoom: 1});
  const media = window.matchMedia?.('(prefers-reduced-motion: reduce)');
  renderer.svg.setAttribute('focusable', 'false');
  if (decorative) {
    renderer.svg.setAttribute('aria-hidden', 'true');
    renderer.svg.removeAttribute('aria-label');
  }

  let state = 'idle', action = STATES.idle, visible = true, paused = false, disposed = false;
  let raf = null, lastFrame = null, elapsed = 0, budget = 0, reactionRemaining = 0, renderCount = 0;
  const canAnimate = () => !disposed && visible && !paused && !document.hidden && !media?.matches && elapsed < budget;
  const cancel = () => {
    if (raf !== null) cancelAnimationFrame(raf);
    raf = null; lastFrame = null;
  };
  const render = (dt = 0, still = false) => {
    brain.reduced = still;
    renderer.render(brain.update(dt), still ? [] : brain.fx());
    renderCount++;
  };
  const staticPose = () => {
    // Non-looping actions may have returned to idle inside the original brain.
    // Restore the current activity before choosing its original static pose.
    if (brain.act.id !== action) brain.play(action, {blend: 0, restart: true});
    render(0, true);
  };
  const schedule = () => {
    if (canAnimate() && raf === null) raf = requestAnimationFrame(frame);
  };
  function frame(now) {
    raf = null;
    if (!canAnimate()) return;
    if (lastFrame !== null && now - lastFrame < FRAME_MS) {schedule(); return;}
    const dt = lastFrame === null ? 1 / 30 : Math.min((now - lastFrame) / 1000, .1);
    lastFrame = now; elapsed += dt;
    if (reactionRemaining > 0) {
      reactionRemaining -= dt;
      if (reactionRemaining <= 0) {
        action = STATES[state];
        brain.play(action, {loop: ACTIONS[action].loop, blend: .2, restart: true});
      }
    }
    if (elapsed >= budget) {staticPose(); lastFrame = null; return;}
    render(dt);
    schedule();
  }
  const syncMotion = () => {
    cancel();
    if (canAnimate()) {brain.reduced = false; schedule();}
    else if (!disposed) staticPose();
  };
  const play = (nextAction, duration, reaction = false) => {
    cancel();
    action = nextAction;
    brain.reduced = !!media?.matches || paused;
    brain.play(action, {loop: ACTIONS[action].loop, blend: .2, restart: true});
    elapsed = 0;
    reactionRemaining = reaction ? ACTIONS[action].dur + .35 : 0;
    budget = duration;
    // Initial paint and state changes remain visible even without a RAF.
    staticPose();
    syncMotion();
  };
  const onVisibility = () => syncMotion();
  const onMotion = () => syncMotion();
  document.addEventListener('visibilitychange', onVisibility);
  media?.addEventListener('change', onMotion);
  staticPose();

  return {
    setState(next) {
      if (disposed || !Object.hasOwn(STATES, next) || next === state) return;
      state = next;
      play(STATES[state], state === 'idle' ? .7 : ACTIVE_SECONDS);
    },
    react(name) {
      if (disposed || !Object.hasOwn(REACTIONS, name)) return;
      const next = REACTIONS[name];
      play(next, ACTIONS[next].dur + (state === 'idle' ? .7 : ACTIVE_SECONDS), true);
    },
    setVisible(value) {
      if (disposed || visible === !!value) return;
      visible = !!value; syncMotion();
    },
    setPaused(value) {
      if (disposed || paused === !!value) return;
      paused = !!value; syncMotion();
    },
    dispose() {
      if (disposed) return;
      disposed = true; cancel();
      document.removeEventListener('visibilitychange', onVisibility);
      media?.removeEventListener('change', onMotion);
      brain.listeners.clear(); brain.particles.length = 0;
      renderer.destroy();
    },
    getDiagnostics() {
      return {renderer: 'svg', state, action, visible, paused, reducedMotion: !!media?.matches,
        disposed, animating: raf !== null, renderCount, maxFps: 30};
    },
  };
}
