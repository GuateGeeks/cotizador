'use strict';

// Standalone smoke test. Start the static site before running this file.
// PLAYWRIGHT_MODULE may point to an installed Playwright package or its entry file.
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');

const baseURL = process.env.COTIZADOR_URL || 'http://127.0.0.1:8087/asesor/index.html';
const channel = process.env.BROWSER_CHANNEL || 'msedge';
// Optional extra flags, e.g. software WebGL on CI/WSL: --use-angle=swiftshader --enable-unsafe-swiftshader
const browserArgs = (process.env.BROWSER_ARGS || '').split(/\s+/).filter(Boolean);
const output = path.resolve(__dirname, '../../artifacts/campus');
const exampleURL = new URL(baseURL);
exampleURL.hash = 'ejemplo';
const summary = { baseURL, channel, startedAt: new Date().toISOString(), scenarios: [], passed: false };

async function snapshot(page) {
  return page.evaluate(() => ({
    data: mascotData(),
    scene: mascot && typeof mascot.getDiagnostics === 'function' ? mascot.getDiagnostics() : null,
    canvasCount: document.querySelectorAll('.campus-stage canvas').length,
    studentsLabel: document.querySelector('[data-campus-students]')?.textContent,
    equipmentLabel: document.querySelector('[data-campus-equipment]')?.textContent,
    feedback: {
      kind: document.querySelector('[data-campus-feedback]')?.dataset.kind,
      diagram: document.querySelector('[data-campus-feedback]')?.dataset.diagram,
      program: document.querySelector('[data-campus-feedback]')?.dataset.program,
      title: document.querySelector('[data-campus-feedback]')?.dataset.title,
      text: document.querySelector('[data-campus-feedback]')?.dataset.text,
      items: Number(document.querySelector('[data-campus-feedback]')?.dataset.items || 0)
    },
    paused: animPaused,
    step: state.step
  }));
}

async function settled(page) {
  await page.locator('.campus-stage').scrollIntoViewIfNeeded();
  await page.waitForFunction(() => {
    const canvas = document.querySelector('.campus-stage canvas');
    const rect = document.querySelector('.campus-stage').getBoundingClientRect();
    const ratio = Math.min(devicePixelRatio || 1, 1.75);
    const sized = !canvas || (Math.abs(canvas.width - rect.width * ratio) < 2 && Math.abs(canvas.height - rect.height * ratio) < 2);
    const diagnostics = mascot && typeof mascot.getDiagnostics === 'function' ? mascot.getDiagnostics() : null;
    // A living campus keeps rendering after construction finishes. Wait only for
    // construction/camera transitions, not for its animation loop to stop.
    const transitionsDone = !diagnostics || (Number.isFinite(diagnostics.transitionsActive)
      ? diagnostics.transitionsActive === 0 : !diagnostics.framePending);
    return sized && transitionsDone;
  });
  // Older scene builds have no diagnostics. Allow one short visual settling period.
  if (!(await snapshot(page)).scene) await page.waitForTimeout(400);
}

async function verifyCounts(page, students) {
  await page.waitForFunction(expected => mascotData().students === expected, students);
  const result = await snapshot(page);
  const equipment = result.data.equipment.reduce((total, item) => total + (item.units || 0), 0);
  assert.equal(result.studentsLabel, students.toLocaleString('es-GT'), 'Visible enrollment follows the committed input');
  assert.equal(result.equipmentLabel, equipment.toLocaleString('es-GT'), 'Visible equipment comes from the calculation engine');
  if (result.scene) {
    assert.equal(result.scene.students, students, 'The scene receives live enrollment');
    assert.equal(result.scene.equipmentUnits, equipment, 'The scene receives live equipment');
  }
  return result;
}

async function verifyViewport(page) {
  const dimensions = await page.evaluate(() => {
    const stage = document.querySelector('.campus-stage'), panel = stage.getBoundingClientRect();
    const canvas = stage.querySelector('canvas')?.getBoundingClientRect();
    return {
      left: panel.left, right: panel.right, width: innerWidth, height: panel.height,
      editing: document.body.classList.contains('campus-input-active'),
      overflow: document.documentElement.scrollWidth - innerWidth,
      panelOverflow: Math.max(...['.campus-panel', '.campus-preview', '.campus-stage', '.campus-proposal-body'].map(selector => {
        const element = document.querySelector(selector); return element ? element.scrollWidth - element.clientWidth : 0;
      })),
      canvasInset: canvas ? Math.max(Math.abs(canvas.left - panel.left), Math.abs(canvas.right - panel.right)) : 0,
      canvasCount: stage.querySelectorAll('canvas').length
    };
  });
  assert.ok(dimensions.height >= (dimensions.editing ? 120 : 180), 'The campus has a usable viewport, including its compact editing mode');
  assert.ok(dimensions.left >= -1 && dimensions.right <= dimensions.width + 1, 'The campus fits the viewport');
  assert.ok(dimensions.overflow <= 1, 'The page has no horizontal overflow');
  assert.ok(dimensions.panelOverflow <= 1, 'The campus panel and its content have no horizontal overflow');
  assert.ok(dimensions.canvasInset <= 1, 'The model canvas occupies the full stage width');
  assert.ok(dimensions.canvasCount <= 1, 'Responsive layout never duplicates the campus canvas');
}

function verifyBudgets(scene, label) {
  if (!scene) return;
  for (const field of ['geometries', 'triangles', 'drawCalls', 'materials', 'entities']) {
    assert.ok(Number.isFinite(scene[field]) && scene[field] >= 0, `${label}: ${field} is a finite nonnegative count`);
  }
  for (const field of ['rooms', 'workshops', 'people']) {
    if (field in scene) assert.ok(Number.isFinite(scene[field]) && scene[field] >= 0, `${label}: ${field} is bounded data`);
  }
  // Budget revised with measurements in docs/campus-3d.md: more triangles, far fewer draw calls and materials.
  for (const [field, limit] of Object.entries({ triangles: 40000, drawCalls: 150, materials: 10 })) {
    assert.ok(scene[field] <= Math.min(limit, scene.limits?.[field] ?? limit), `${label}: ${field} stays within the rendering budget`);
  }
  assert.equal(scene.camera, 'orthographic');
}

async function sourceQuote(page) {
  return page.evaluate(() => JSON.stringify({
    levels: state.levels, enroll: state.enroll, selected: state.selected,
    totals: M.proposalTotals(state.selected, PROGRAMS, groups(), TARIFFS, FISCAL)
  }));
}

async function stageScreenshot(page, result, name) {
  await settled(page);
  const screenshot = path.join(output, `${name}.png`);
  await page.locator('.campus-stage').screenshot({ path: screenshot });
  (result.stageScreenshots ||= []).push(screenshot);
}

async function verifyStoryboardStart(page, result) {
  await page.locator('.campus-preview.campus-ready').waitFor({ state: 'visible' });
  await stageScreenshot(page, result, 'stage-1-empty');
  await page.locator('.chooser .option').filter({ hasText: 'Preprimaria' }).click();
  await verifyFeedback(page, 'level', 'levels', '');
  await page.locator('.foot').getByRole('button', { name: /Continuar/ }).click();
  await page.locator('#qty-pk-1').fill('48');
  await verifyCounts(page, 48);
  await verifyFeedback(page, 'enrollment', 'enrollment', '');
  await stageScreenshot(page, result, 'stage-2-enrollment');
  await page.locator('.foot').getByRole('button', { name: /Ver programas/ }).click();
  await page.locator('.prog').filter({ has: page.getByRole('heading', { name: 'Robótica para pequeños', exact: true }) })
    .getByRole('button', { name: /Agregar a mi propuesta/ }).click();
  assert.deepEqual((await snapshot(page)).data.programs, ['tale']);
  await verifyFeedback(page, 'program', 'program');
  await stageScreenshot(page, result, 'stage-3-programs');
  result.checks.push('Storyboard through real controls: empty classroom, enrollment, first program');
}

async function verifyLiveEnrollment(page, result) {
  // The real step button invokes step(2); typing exercises writeQty without a full render.
  await page.getByRole('button', { name: 'Paso 2: Estudiantes', exact: true }).click();
  const input = page.locator('#qty-pk-1');
  await input.waitFor({ state: 'visible' });
  const baseline = await snapshot(page);
  const previousValue = Number(await input.inputValue());
  await input.fill('48');
  await verifyCounts(page, baseline.data.students - previousValue + 48);
  assert.equal(await input.evaluate(element => element === document.activeElement), true, 'Typing preserves input focus');
  assert.equal(await input.getAttribute('aria-invalid'), 'false');
  const valid = await snapshot(page);
  assert.ok(valid.data.equipment.some((item, index) => item.units !== baseline.data.equipment[index]?.units), 'Enrollment recalculates equipment in the campus');

  for (const invalid of ['1001', '12x', '-1']) {
    await input.fill(invalid);
    assert.equal(await input.getAttribute('aria-invalid'), 'true', `Rejects ${invalid}`);
    assert.equal(await input.evaluate(element => element === document.activeElement), true, 'Validation preserves typing focus');
    await verifyCounts(page, valid.data.students);
    assert.deepEqual((await snapshot(page)).data.equipment, valid.data.equipment, 'Invalid values leave equipment unchanged');
  }
  await input.fill('');
  await verifyCounts(page, baseline.data.students - previousValue);
  assert.equal(await page.evaluate(() => state.enroll.pk.sections[0].students), null, 'Blank means unconfirmed');
  assert.match((await snapshot(page)).feedback.text, /matrícula por confirmar/);
  assert.equal(await input.evaluate(element => element === document.activeElement), true, 'Blank value preserves typing focus');
  await input.fill('0');
  await verifyCounts(page, baseline.data.students - previousValue);
  assert.equal(await page.evaluate(() => state.enroll.pk.sections[0].students), 0, 'Zero remains a confirmed count');
  assert.match((await snapshot(page)).feedback.text, /0 estudiantes registrados/);
  await input.fill('48');
  await verifyCounts(page, valid.data.students);
  assert.equal(await page.evaluate(() => JSON.parse(localStorage.getItem('gg_asesor_v1')).enroll.pk.sections[0].students), 48, 'Live changes are persisted');
  result.checks.push('Live enrollment, engine equipment, input focus, invalid/blank/zero values, local draft');
}

async function verifyMobileEditing(page, result) {
  const input = page.locator('#qty-pk-1');
  await page.waitForFunction(() => document.body.classList.contains('campus-input-active'));
  await page.waitForTimeout(300);
  await verifyViewport(page);
  const field = await input.boundingBox(), panel = await page.locator('.campus-panel').boundingBox();
  assert.ok(field.y >= panel.y + panel.height - 1, 'The compact sticky preview does not cover the focused field');
  assert.ok(field.y + field.height <= page.viewportSize().height, 'The focused field remains in the visible viewport');
  result.editingScreenshot = path.join(output, `${result.name}-editing.png`);
  await page.screenshot({ path: result.editingScreenshot, fullPage: false });
  await input.evaluate(element => element.blur());
  await page.waitForFunction(() => !document.body.classList.contains('campus-input-active'));
  result.checks.push('Mobile input keeps its focus and remains visible below the compact live preview; blur restores the full preview');
}

async function verifyPersistentView(page, result, originalViewport) {
  const quote = await sourceQuote(page);
  await page.locator('.campus-pause').click();
  assert.equal(await page.locator('.campus-pause').getAttribute('aria-pressed'), 'true');
  await settled(page);
  const before = await snapshot(page);
  const stageBox = await page.locator('.campus-stage').boundingBox();
  await page.mouse.move(stageBox.x + stageBox.width * .45, stageBox.y + stageBox.height * .5);
  await page.mouse.down();
  await page.mouse.move(stageBox.x + stageBox.width * .45 + 80, stageBox.y + stageBox.height * .5, { steps: 8 });
  await page.mouse.up();
  await settled(page);
  if (before.scene) assert.ok(Math.abs((await snapshot(page)).scene.yaw - before.scene.yaw) > .1, 'Dragging the actual canvas rotates the model');
  // Rotation and zoom live on the canvas: drag, wheel, pinch and keyboard.
  await page.locator('.campus-stage').focus();
  await page.keyboard.press('ArrowRight');
  await page.keyboard.press('+');
  await settled(page);
  const adjusted = await snapshot(page);
  if (adjusted.scene) {
    assert.ok(Math.abs(adjusted.scene.yaw - before.scene.yaw) > .1, 'The rotation control changes the camera');
    assert.ok(adjusted.scene.zoom > before.scene.zoom, 'The zoom control changes the camera');
    assert.equal(adjusted.scene.paused, true);
    assert.equal(adjusted.scene.framePending, false, 'Paused campus stops requesting frames');
  }
  await page.evaluate(() => { window.__campusSmokeCanvas = document.querySelector('.campus-stage canvas'); });

  await page.getByRole('button', { name: 'Paso 3: Programas', exact: true }).click();
  await settled(page);
  await page.setViewportSize(originalViewport.width > 980 ? { width: 390, height: 844 } : { width: 1440, height: 1000 });
  await settled(page);
  await verifyViewport(page);
  const after = await snapshot(page);
  assert.equal(after.canvasCount, 1, 'Only one campus canvas exists after navigation and resizing');
  assert.equal(await page.evaluate(() => document.querySelector('.campus-stage canvas') === window.__campusSmokeCanvas), true, 'Navigation and responsive layout preserve the canvas');
  assert.equal(after.paused, true, 'Pause persists through navigation and resizing');
  if (after.scene) {
    assert.ok(Math.abs(after.scene.yaw - adjusted.scene.yaw) < .001, 'Navigation and resizing preserve camera rotation');
    assert.ok(Math.abs(after.scene.zoom - adjusted.scene.zoom) < .001, 'Navigation and resizing preserve zoom');
  }
  await page.setViewportSize(originalViewport);
  await settled(page);
  await page.getByRole('button', { name: 'Restablecer vista', exact: true }).click();
  await settled(page);
  await page.locator('.campus-pause').click();
  assert.equal(await page.locator('.campus-pause').getAttribute('aria-pressed'), 'false');
  assert.equal(await sourceQuote(page), quote, 'Camera, pause, navigation and resizing never mutate source quotation');
  result.checks.push('Canvas drag, camera controls, pause, single persistent canvas across step navigation and desktop/mobile resize');
}

async function verifyLivingCampus(page, result, reducedMotion) {
  await settled(page);
  const initial = await snapshot(page);
  assert.ok(Number.isFinite(initial.scene.activityTicks), 'The scene exposes actual animation ticks');
  await page.waitForTimeout(450);
  const moving = await snapshot(page);
  if (reducedMotion) {
    assert.equal(moving.scene.activityTicks, initial.scene.activityTicks, 'Reduced motion does not run ambient animation');
    assert.equal(moving.scene.framePending, false, 'Reduced motion does not schedule idle frames');
  } else {
    assert.ok(moving.scene.activityTicks > initial.scene.activityTicks, 'Visible campus keeps its characters and workshops moving');
    assert.ok(moving.scene.animationTime > initial.scene.animationTime, 'Ambient animation time advances');
  }
  await page.locator('.campus-pause').click();
  await settled(page);
  const paused = await snapshot(page);
  await page.waitForTimeout(450);
  const still = await snapshot(page);
  assert.equal(still.scene.activityTicks, paused.scene.activityTicks, 'Pause freezes all ambient animation');
  assert.equal(still.scene.animationTime, paused.scene.animationTime, 'Pause freezes animation time');
  assert.equal(still.scene.framePending, false, 'Pause stops the animation scheduler');
  await page.locator('.campus-pause').click();
  await settled(page);
  if (!reducedMotion) {
    // Exercise the real IntersectionObserver using a reversible offscreen stage.
    // A desktop side panel can be sticky, so scrolling would not reliably hide it.
    await page.locator('.campus-stage').evaluate(stage => { stage.style.transform = 'translateX(-200vw)'; });
    await page.waitForFunction(() => !mascot.getDiagnostics().visible);
    const hidden = await snapshot(page);
    await page.waitForTimeout(450);
    const hiddenAfter = await snapshot(page);
    assert.equal(hiddenAfter.scene.activityTicks, hidden.scene.activityTicks, 'Offscreen campus suspends ambient animation');
    assert.equal(hiddenAfter.scene.framePending, false, 'Offscreen campus stops requesting frames');
    await page.locator('.campus-stage').evaluate(stage => { stage.style.transform = ''; });
    await page.waitForFunction(() => mascot.getDiagnostics().visible);
    await page.waitForFunction(previous => mascot.getDiagnostics().activityTicks > previous, hidden.scene.activityTicks);
  }
  result.motion = { initialTicks: initial.scene.activityTicks, movingTicks: moving.scene.activityTicks, pausedTicks: paused.scene.activityTicks };
  result.checks.push(reducedMotion ? 'Reduced motion and explicit pause freeze ambient animation' : 'Visible scene animates continuously, pause/offscreen suspend it, visibility resumes it');
}

async function verifyFeedback(page, kind, diagram, program = 'tale') {
  await page.waitForFunction(expected => {
    const box = document.querySelector('[data-campus-feedback]');
    return box?.dataset.kind === expected.kind && box?.dataset.diagram === expected.diagram && box?.dataset.program === expected.program;
  }, { kind, diagram, program });
  const result = await snapshot(page);
  assert.ok(result.feedback.title.length > 4 && result.feedback.text.length > 12, 'Every action has a specific explanation');
  if (result.scene) {
    assert.equal(result.scene.focus?.kind, kind, 'The 3D focus follows the same semantic action as the interface');
    assert.equal(result.scene.focusedProgram || '', program, 'The corresponding program is focused in the 3D scene');
  }
  return result;
}

async function verifyCanvasSelection(page, result) {
  await settled(page);
  const before = await snapshot(page), quote = await sourceQuote(page);
  const bounds = await page.locator('.campus-stage').boundingBox();
  const target = before.scene.selectTargets.find(item => item.kind === 'program'
    && item.x >= bounds.x && item.x <= bounds.x + bounds.width
    && item.y >= bounds.y && item.y <= bounds.y + bounds.height);
  assert.ok(target, 'At least one visible workshop can be selected directly');
  await page.mouse.click(target.x, target.y);
  // Clicking a workshop opens its configuration (step 4) without changing the quote.
  await page.waitForFunction(id => state.step === 4 && state.selected[state.selectedIndex]?.programId === id, target.id);
  await page.waitForFunction(id => mascot.getDiagnostics().focusedProgram === id, target.id);
  assert.equal(await sourceQuote(page), quote, 'Opening a workshop from the model does not alter the quote');
  result.checks.push('Clicking an actual 3D workshop opens its configuration and frames it without changing the quotation');
}

async function verifyConfigurationReactions(page, result) {
  const saved = await page.evaluate(() => ({ state: structuredClone(state), ui: structuredClone(ui) }));
  const quote = await sourceQuote(page);
  const reactions = [];
  // Keyboard tour on the canvas: arrows explore, Enter opens the edition.
  await page.locator('.campus-stage').focus();
  for (let i = 0; i < 8 && !(await page.evaluate(() => campusFeedback?.focus?.programId === 'tale' && campusFeedback.focus.kind === 'program')); i++) await page.keyboard.press('ArrowDown');
  reactions.push((await verifyFeedback(page, 'program', 'program')).feedback);
  assert.equal(await sourceQuote(page), quote, 'Exploring a workshop does not alter the quote');
  await page.keyboard.press('Enter');
  await page.waitForFunction(() => state.step === 4 && state.selected[state.selectedIndex]?.programId === 'tale');
  await page.evaluate(() => jumpTo('groups'));
  await page.locator('.main-panel .chips.big .chip').first().click();
  const groups = await verifyFeedback(page, 'groups', 'groups');
  assert.equal(groups.feedback.title, `${groups.data.equipment[0].participants} estudiantes participan`);
  reactions.push(groups.feedback);
  await page.evaluate(() => jumpTo('sharing'));
  await page.locator('.radio').filter({ hasText: 'Algunos grupos trabajan al mismo tiempo' }).click();
  for (const index of [0, 1]) await page.locator('.sub-pick .chips .chip').nth(index).click();
  reactions.push((await verifyFeedback(page, 'sharing', 'parallel')).feedback);
  assert.equal((await snapshot(page)).data.equipment[0].simIds.length, 2);
  await page.locator('.radio').filter({ hasText: 'Todavía no lo sé' }).click();
  reactions.push((await verifyFeedback(page, 'sharing', 'pending')).feedback);
  await page.locator('.radio').filter({ hasText: 'Sí, en horarios distintos' }).click();
  reactions.push((await verifyFeedback(page, 'sharing', 'turns')).feedback);

  await page.evaluate(() => jumpTo('quantity'));
  const beforeUnits = (await snapshot(page)).data.equipment[0].units;
  await page.getByRole('button', { name: 'Aumentar equipos', exact: true }).click();
  const equipment = await verifyFeedback(page, 'equipment', 'equipment');
  assert.equal(equipment.data.equipment[0].units, beforeUnits + 1);
  assert.match(equipment.feedback.title, new RegExp(String(beforeUnits + 1)));
  reactions.push(equipment.feedback);
  // Starting at recommended capacity, two decrements from +1 make stations useful.
  await page.getByRole('button', { name: 'Reducir equipos', exact: true }).click();
  await page.getByRole('button', { name: 'Reducir equipos', exact: true }).click();
  await page.getByRole('button', { name: /Trabajar por estaciones con/ }).click();
  const stations = await verifyFeedback(page, 'stations', 'stations');
  assert.equal(stations.data.equipment[0].stations, true);
  assert.match(stations.feedback.text, new RegExp(String(stations.data.equipment[0].capacity)));
  reactions.push(stations.feedback);
  await stageScreenshot(page, result, 'stage-stations');

  await page.evaluate(() => jumpTo('plan'));
  await page.locator('.plan-card').filter({ hasText: 'Comprar el equipo' }).click();
  let plan = await verifyFeedback(page, 'plan', 'plan');
  assert.match(plan.feedback.title, /es de tu colegio/);
  reactions.push(plan.feedback);
  await page.locator('.plan-card').filter({ hasText: 'Rentar por bimestres' }).click();
  await page.locator('#flexb').selectOption('4');
  plan = await verifyFeedback(page, 'plan', 'plan');
  assert.equal(plan.feedback.title, '4 bimestres de exploración');
  assert.equal(plan.feedback.items, 4, 'Four rental bimesters are described');
  reactions.push(plan.feedback);
  await page.locator('.plan-card').filter({ hasText: 'Pagar en cuotas para adquirir' }).click();
  await page.getByRole('radio', { name: /Evoluciona 16/ }).click();
  plan = await verifyFeedback(page, 'plan', 'plan');
  assert.match(plan.feedback.title, /16 meses/);
  assert.equal(plan.feedback.items, 16, 'Sixteen instalments are described');
  reactions.push(plan.feedback);
  await stageScreenshot(page, result, 'stage-plan');
  result.reactions = reactions;
  result.checks.push('Keyboard workshop exploration/edit, groups, sharing/simultaneous groups, equipment, stations, ownership and rental durations update matching scene focus and explanation');
  await page.evaluate(saved => { state = saved.state; Object.assign(ui, saved.ui); campusInspection = null; render(); }, saved);
  await settled(page);
  assert.equal(await sourceQuote(page), quote, 'Interaction fixture restores the original quote');
}

async function verifyRepeatedUpdates(page, result) {
  await settled(page);
  const before = await snapshot(page);
  if (!before.scene) return;
  const quote = await sourceQuote(page);
  const samples = [];
  for (let cycle = 0; cycle < 3; cycle++) {
    for (const students of ['1', '1000', '48']) {
      await page.locator('#qty-pk-1').fill(students);
      await settled(page);
      const current = await snapshot(page);
      verifyBudgets(current.scene, `Enrollment cycle ${cycle + 1}`);
      samples.push({ students: current.data.students, geometries: current.scene.geometries });
    }
  }
  const after = await snapshot(page);
  assert.ok(after.scene.geometries <= before.scene.geometries + 2, 'Repeated growth/shrink returns to bounded geometry allocation');
  assert.equal(after.scene.materials, before.scene.materials, 'Repeated updates reuse materials');
  assert.equal(after.canvasCount, 1);
  assert.equal(await sourceQuote(page), quote, 'Returning enrollment to its original value restores the same quotation');
  result.geometryCycles = samples;
  result.checks.push('Repeated real enrollment updates grow/shrink without accumulating geometries or materials');
}

async function verifyContextRecovery(page, result) {
  const before = await snapshot(page);
  if (!before.scene) return;
  const quote = await sourceQuote(page);
  const supported = await page.evaluate(() => {
    const canvas = document.querySelector('.campus-stage canvas');
    const context = canvas.getContext('webgl2') || canvas.getContext('webgl');
    const extension = context?.getExtension('WEBGL_lose_context');
    if (!extension) return false;
    window.__campusSmokeContext = extension;
    window.__campusSmokeRecoveryCanvas = canvas;
    extension.loseContext();
    return true;
  });
  if (!supported) { result.contextRecovery = 'Not exercised: WEBGL_lose_context unavailable'; return; }
  await page.waitForFunction(() => mascot.getDiagnostics().contextLost);
  assert.equal(await page.locator('.campus-status').textContent(), 'Vista sin 3D');
  assert.equal(await page.getByRole('button', { name: 'Restablecer vista', exact: true }).isDisabled(), true);
  await verifyCounts(page, before.data.students);
  await page.evaluate(() => window.__campusSmokeContext.restoreContext());
  await page.locator('.campus-preview.campus-ready').waitFor({ state: 'visible' });
  await settled(page);
  assert.equal(await page.locator('.campus-status').textContent(), 'En vivo');
  const after = await snapshot(page);
  assert.equal(after.scene.contextLost, false);
  assert.equal(after.canvasCount, 1);
  assert.equal(await page.evaluate(() => document.querySelector('.campus-stage canvas') === window.__campusSmokeRecoveryCanvas), true);
  assert.equal(await sourceQuote(page), quote, 'WebGL recovery preserves the source quotation');
  assert.ok(Math.abs(after.scene.yaw - before.scene.yaw) < .001, 'Context recovery preserves camera rotation');
  assert.ok(Math.abs(after.scene.zoom - before.scene.zoom) < .001, 'Context recovery preserves camera zoom');
  verifyBudgets(after.scene, 'Recovered scene');
  result.contextRecovery = 'passed';
  result.checks.push('Real WebGL context loss/recovery restores the existing canvas and preserves quotation/camera');
}

async function verifyMaximumCampus(page, result) {
  // A valid quote fixture derived from the real catalog and motor. Each grade has
  // one section at the largest supported enrollment; every program is selected.
  // The integration still goes through render() and mascotData(), never scene.update().
  const expected = await page.evaluate(async () => {
    const { CAMPUS_LIMITS } = await import(new URL('lab/campus-layout.js', location.href).href);
    state = initial();
    state.levels = LEVELS.map(level => level.id);
    for (const level of LEVELS) {
      for (const [gradeId] of level.grades) {
        state.enroll[gradeId] = { confirmed: true, sections: [{ id: `${gradeId}-1`, name: 'A', students: 1000 }] };
      }
    }
    const allGroups = groups();
    const plans = ['INTEGRA', 'FLEX', 'EV8', 'EV16'];
    state.selected = PROGRAMS.map((program, index) => ({
      id: `${program.id}@maximum`, programId: program.id,
      groupIds: allGroups.filter(group => program.grades.includes(group.gradeId)).map(group => group.id),
      sharing: 'separate', simIds: [], units: null, stations: false,
      plan: plans[index % plans.length], flexBimestres: 4, confirmed: true, calc: null
    }));
    state.selected.forEach(commit);
    state.step = 5;
    render();
    const totals = M.proposalTotals(state.selected, PROGRAMS, groups(), TARIFFS, FISCAL);
    return {
      students: allGroups.reduce((total, group) => total + group.students, 0),
      levels: LEVELS.length, programs: PROGRAMS.map(program => program.id),
      equipment: totals.rows.reduce((total, row) => total + (row.units || 0), 0),
      layoutLimits: CAMPUS_LIMITS || {}
    };
  });
  await settled(page);
  const maximum = await verifyCounts(page, expected.students);
  assert.deepEqual(maximum.data.programs.slice().sort(), expected.programs.slice().sort(), 'All six catalog programs reach the scene adapter');
  assert.equal(maximum.data.levels.length, expected.levels);
  assert.equal(maximum.canvasCount, 1);
  if (maximum.scene) {
    assert.equal(maximum.scene.programs, 6);
    assert.equal(maximum.scene.levels, 4);
    const limits = expected.layoutLimits;
    if (Number.isFinite(limits.roomsPerLevel) && Number.isFinite(maximum.scene.rooms)) {
      assert.ok(maximum.scene.rooms <= expected.levels * limits.roomsPerLevel, 'Classrooms follow the declared layout limit');
    }
    if (Number.isFinite(limits.workshopFloors) && Number.isFinite(maximum.scene.workshops)) {
      assert.ok(maximum.scene.workshops <= expected.programs.length * limits.workshopFloors, 'Workshops follow the declared layout limit');
    }
    if (Number.isFinite(limits.people) && Number.isFinite(maximum.scene.people)) {
      assert.ok(maximum.scene.people <= limits.people, 'Population follows the declared layout limit');
    }
    assert.equal(maximum.scene.equipmentUnits, expected.equipment, 'Maximal scene equipment agrees with proposal totals');
    verifyBudgets(maximum.scene, 'Maximal scene');
  }
  result.maximum = maximum;
  result.maximumScreenshots = [];
  result.focusedScreenshots = [];
  for (const [label, viewport] of [['desktop', { width: 1440, height: 1000 }], ['mobile', { width: 390, height: 844 }]]) {
    await page.setViewportSize(viewport);
    await settled(page);
    await verifyViewport(page);
    const screenshot = path.join(output, `maximum-${label}.png`);
    await page.screenshot({ path: screenshot, fullPage: false });
    result.maximumScreenshots.push(screenshot);
    await stageScreenshot(page, result, `stage-maximum-${label}`);
    for (const program of ['tale', 'drones', 'immersive']) {
      await page.evaluate(id => inspectCampus('program', id), program);
      await settled(page);
      const focused = path.join(output, `focused-${program}-${label}.png`);
      await page.screenshot({ path: focused, fullPage: false });
      result.focusedScreenshots.push(focused);
      if (program === 'drones' && label === 'desktop') {
        for (let frame = 0; frame < 3; frame++) {
          await page.locator('.campus-stage').screenshot({ path: path.join(output, `motion-drone-frame-${frame}.png`) });
          await page.waitForTimeout(400);
        }
      }
    }
  }
  result.checks.push('All four levels and six programs, valid maximal enrollment, motor totals, bounded population and rendering budgets');
}

async function runScenario(browser, config) {
  const result = { name: config.name, viewport: config.viewport, checks: [], errors: [], consoleErrors: [], passed: false };
  summary.scenarios.push(result);
  const context = await browser.newContext({ viewport: config.viewport, reducedMotion: config.reducedMotion ? 'reduce' : 'no-preference', locale: 'es-GT' });
  await context.addInitScript(() => { try { localStorage.clear(); } catch (_) { /* about:blank has no storage origin */ } });
  if (config.fallback) {
    await context.addInitScript(() => {
      const getContext = HTMLCanvasElement.prototype.getContext;
      HTMLCanvasElement.prototype.getContext = function (type, ...args) {
        if (/^(webgl2?|experimental-webgl)$/i.test(type)) return null;
        return getContext.call(this, type, ...args);
      };
    });
  }
  const page = await context.newPage();
  page.setDefaultTimeout(15000);
  page.on('pageerror', error => result.errors.push(error.message));
  page.on('console', message => { if (message.type() === 'error') result.consoleErrors.push(message.text()); });
  try {
    if (config.name === 'desktop') {
      const landing = new URL(baseURL); landing.hash = '';
      await page.goto(landing.href, { waitUntil: 'domcontentloaded' });
      await page.locator('.hero-actions').getByRole('button', { name: /Crear mi propuesta/ }).click();
      await page.locator('.campus-stage').waitFor({ state: 'visible' });
      assert.equal((await snapshot(page)).data.students, 0, 'Fresh entry begins with an empty proposal');
      result.checks.push('Real landing route and create-proposal control');
      await verifyStoryboardStart(page, result);
      // Force a new document: changing only #ejemplo would not re-run startup code.
      await page.goto('about:blank');
    }
    const response = await page.goto(exampleURL.href, { waitUntil: 'domcontentloaded' });
    assert.ok(response && response.ok(), 'The real asesor route responds successfully');
    await page.locator('.campus-stage').waitFor({ state: 'visible' });
    if (config.fallback) {
      await page.waitForFunction(() => document.querySelector('.campus-fallback')?.textContent.includes('no está disponible'));
      assert.equal(await page.locator('.campus-status').textContent(), 'Vista sin 3D');
      assert.equal(await page.locator('.campus-stage canvas').count(), 0, 'No canvas is created without WebGL');
      assert.equal(await page.getByRole('button', { name: 'Restablecer vista', exact: true }).isDisabled(), true);
      result.checks.push('Unavailable WebGL keeps an informative fallback and disables camera controls');
    } else {
      await page.locator('.campus-preview.campus-ready').waitFor({ state: 'visible' });
      await settled(page);
      assert.equal(await page.locator('.campus-stage canvas').count(), 1, 'Exactly one campus canvas is mounted');
    }
    await verifyViewport(page);
    const initial = await snapshot(page);
    await verifyCounts(page, 211);
    if (initial.scene) {
      verifyBudgets(initial.scene, 'Initial scene');
      if (config.reducedMotion) assert.equal(initial.scene.framePending, false, 'Reduced motion presents a settled campus');
    }
    result.initial = initial;
    result.screenshot = path.join(output, `${config.name}.png`);
    await page.screenshot({ path: result.screenshot, fullPage: false });
    if (!config.fallback) await verifyLivingCampus(page, result, config.reducedMotion);
    if (!config.fallback) await verifyCanvasSelection(page, result);
    if (config.name === 'desktop') await verifyConfigurationReactions(page, result);
    await verifyLiveEnrollment(page, result);
    if (config.viewport.width < 980) await verifyMobileEditing(page, result);
    if (config.name === 'desktop') await verifyRepeatedUpdates(page, result);
    if (!config.fallback) await verifyPersistentView(page, result, config.viewport);
    if (config.name === 'desktop') await verifyContextRecovery(page, result);
    if (config.name === 'desktop') await verifyMaximumCampus(page, result);
    result.final = await snapshot(page);
    assert.deepEqual(result.errors, [], 'No uncaught browser errors');
    result.passed = true;
    console.log(`PASS ${config.name}: ${result.checks.join('; ')}`);
  } catch (error) {
    result.failure = error.stack || error.message;
    await page.screenshot({ path: path.join(output, `${config.name}-failure.png`), fullPage: true }).catch(() => {});
    console.error(`FAIL ${config.name}: ${error.message}`);
  } finally {
    await context.close();
  }
}

async function recordMotionDemo(browser) {
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, locale: 'es-GT',
    reducedMotion: 'no-preference', recordVideo: { dir: path.join(output, 'video'), size: { width: 1440, height: 1000 } } });
  await context.addInitScript(() => { try { localStorage.clear(); } catch (_) {} });
  const page = await context.newPage();
  page.setDefaultTimeout(15000);
  const video = page.video();
  try {
    // Construction: from one illustrative classroom through real wizard controls.
    const landing = new URL(baseURL); landing.hash = '';
    await page.goto(landing.href, { waitUntil: 'domcontentloaded' });
    await page.locator('.hero-actions').getByRole('button', { name: /Crear mi propuesta/ }).click();
    await page.locator('.campus-preview.campus-ready').waitFor({ state: 'visible' });
    await page.waitForTimeout(1600);
    await page.locator('.chooser .option').filter({ hasText: 'Preprimaria' }).click();
    await page.waitForTimeout(1400);
    await page.locator('.foot').getByRole('button', { name: /Continuar/ }).click();
    await page.locator('#qty-pk-1').fill('24');
    await page.waitForTimeout(1600);
    await page.locator('.foot').getByRole('button', { name: /Ver programas/ }).click();
    await page.locator('.prog').filter({ has: page.getByRole('heading', { name: 'Robótica para pequeños', exact: true }) })
      .getByRole('button', { name: /Agregar a mi propuesta/ }).click();
    await page.waitForTimeout(2600);
    await page.evaluate(() => inspectCampus('program', 'tale'));
    await page.waitForTimeout(4200);
    await page.screenshot({ path: path.join(output, 'live-tale.png'), fullPage: false });
    // The example school grows the campus with a second level and wing.
    await page.evaluate(() => { example(); state.step = 3; campusInspection = null; render(); });
    await page.waitForTimeout(3000);
    await page.locator('.prog').filter({ has: page.getByRole('heading', { name: 'Drones educativos', exact: true }) })
      .getByRole('button', { name: /Agregar a mi propuesta/ }).click();
    await page.waitForTimeout(2200);
    await page.evaluate(() => inspectCampus('program', 'drones'));
    await settled(page);
    await page.waitForTimeout(5000);
    await page.screenshot({ path: path.join(output, 'live-drones.png'), fullPage: false });
    await page.evaluate(() => editFromCampus('program', 'drones'));
    await page.evaluate(() => jumpTo('sharing'));
    await page.locator('.radio').filter({ hasText: 'Sí, en horarios distintos' }).click();
    await page.waitForTimeout(3200);
    await page.evaluate(() => jumpTo('quantity'));
    await page.getByRole('button', { name: 'Aumentar equipos', exact: true }).click();
    await page.waitForTimeout(2200);
    await page.evaluate(() => jumpTo('plan'));
    await page.locator('.plan-card').filter({ hasText: 'Rentar por bimestres' }).click();
    await page.locator('#flexb').selectOption('4');
    await page.waitForTimeout(3600);
    await page.screenshot({ path: path.join(output, 'live-plan.png'), fullPage: false });
    await page.evaluate(() => inspectCampus('program', 'master'));
    await page.waitForTimeout(4500);
    await page.getByRole('button', { name: 'Restablecer vista', exact: true }).click();
    await page.waitForTimeout(2500);
    summary.motionDemo = { path: path.join(output, 'campus-interaction.webm'),
      actions: ['Empty classroom', 'Choose level', 'Enrollment arrives', 'Add Tale-Bot workshop', 'Explore Tale-Bot', 'Example school grows',
        'Add drone field', 'Explore drones', 'Separate schedules', 'Add equipment', 'Flex rental, four bimestres', 'Explore Robot Master', 'Overview'] };
  } finally {
    await context.close();
    if (video) await video.saveAs(path.join(output, 'campus-interaction.webm'));
  }
}

(async () => {
  await fs.mkdir(output, { recursive: true });
  let browser;
  try {
    browser = await chromium.launch({ channel, headless: true, args: browserArgs });
    for (const config of [
      { name: 'desktop', viewport: { width: 1440, height: 1000 } },
      { name: 'mobile', viewport: { width: 390, height: 844 } },
      { name: 'reduced', viewport: { width: 1440, height: 1000 }, reducedMotion: true },
      { name: 'fallback', viewport: { width: 390, height: 844 }, fallback: true }
    ]) await runScenario(browser, config);
    summary.passed = summary.scenarios.every(result => result.passed);
    // Optional because Playwright video requires its separate FFmpeg runtime.
    if (summary.passed && process.env.CAMPUS_CAPTURE_MOTION === '1') await recordMotionDemo(browser);
  } catch (error) {
    summary.passed = false;
    summary.failure = error.stack || error.message;
    console.error(error);
  } finally {
    if (browser) await browser.close();
    summary.finishedAt = new Date().toISOString();
    await fs.writeFile(path.join(output, 'summary.json'), JSON.stringify(summary, null, 2) + '\n');
    console.log(`Evidence: ${output}`);
    if (!summary.passed) process.exitCode = 1;
  }
})();
