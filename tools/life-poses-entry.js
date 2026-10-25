// Pose sheet of the ambient-life vocabulary (tools/life-poses.cjs bundles this file):
// the primaria base student seated at a table (hands kept above its top as in the
// campus) and standing, and a teacher standing, in every pose the activities use.
import { WebGLRenderer, Scene, OrthographicCamera, HemisphereLight, DirectionalLight, Color, Vector3, SRGBColorSpace, NeutralToneMapping } from 'three';
import { createBuilder } from '../asesor/lab/campus-kit.js';
import { paperKit, SCALE } from '../asesor/lab/paper/kit.js';
import { paperMaterials } from '../asesor/lab/paper/material.js';
import { CATALOG } from '../asesor/lab/paper/catalog.js';
import { addPaperPerson, PRIMARIA_BASE } from '../asesor/lab/paper/pieces-people.js';
import { POSES, applyPose, reach } from '../asesor/lab/campus-people.js';
import { seatAtTable } from '../asesor/lab/paper/scene-activity.js';

const T = 1.3;
export const UPPER = {
  type: () => POSES.type(T), raise: () => POSES.raise(T), talk: () => POSES.talk(T, 1), lean: () => POSES.lean(1), pointDown: () => POSES.pointDown(0),
  highFiveL: () => POSES.highFive('L'), highFiveR: () => POSES.highFive('R'), cheer: () => POSES.cheer(T), clap: () => POSES.clap(T), oops: () => POSES.oops(),
  think: () => POSES.think(), press: () => POSES.press(T), hold: () => POSES.hold(.6, .3), grab: () => POSES.grab(T, 0), visor: () => POSES.visor(.5),
  vr: () => POSES.vr(T, 0), point: () => POSES.point(.2), wave: () => POSES.wave(T), reach: () => reach(.3, 'R')
};
const byId = new Map(CATALOG.map(piece => [piece.id, piece]));

export function render(canvas, { row, view = '34', size = [1800, 520] }) {
  const rows = [row];
  // The cells line up across the screen whatever the view: along the camera's right axis.
  const yaw = view === 'side' ? Math.PI / 2 - .3 : view === 'front' ? 0 : -.45, pitch = view === 'side' ? .12 : .3;
  const right = [Math.cos(yaw), -Math.sin(yaw)], step = .62;
  const b = createBuilder(); b.base('solid');
  const p = paperKit(b);
  const people = [];
  const place = (id, key, x, z, ry) => {
    const bone = b.rig.add(key, b.rig.root, x, 0, z); bone.rotation.y = ry; bone.userData.rest.quaternion.copy(bone.quaternion);
    b.bone(bone); byId.get(id).build(b, p, { id: key, parent: bone }); b.bone(b.rig.root);
  };
  rows.forEach((row, r) => row.poses.forEach((name, c) => {
    const x = right[0] * c * step, z = right[1] * c * step, id = `p${r}.${c}`;
    // Turned table (narrow side to the neighbours), its near edge at the campus' seat distance.
    if (row.seated) { place('table', id + '.table', x, z + .165 + .45, Math.PI / 2); place('chair-orange', id + '.chair', x, z, 0); }
    b.base('soft');
    const ctrl = addPaperPerson(b, { ...(row.teacher ? { role: 'teacher', level: 'adult', seed: 'teacher-a', hair: 'long' } : PRIMARIA_BASE), id, x, y: 0, z, ry: 0, seated: !!row.seated });
    b.base('solid'); b.layer('main').bone(b.rig.root);
    people.push({ ctrl, name, row });
  }));
  const materials = paperMaterials();
  const group = b.finish(materials);
  for (const { ctrl, name, row } of people) {
    const upper = UPPER[name]();
    if (row.seated) seatAtTable(ctrl, upper); else applyPose(ctrl, upper);
  }
  const renderer = new WebGLRenderer({ canvas, antialias: true, preserveDrawingBuffer: true });
  renderer.setSize(size[0], size[1], false); renderer.outputColorSpace = SRGBColorSpace; renderer.toneMapping = NeutralToneMapping;
  const scene = new Scene(); scene.background = new Color('#F4F1F6');
  scene.add(new HemisphereLight(0xffffff, 0xd9cfe6, 1.55));
  const sun = new DirectionalLight(0xfff3e4, 2.1); sun.position.set(-6, 11, 8); scene.add(sun);
  scene.add(group);
  // One row per image, seen from the front-left (34), the right side (side) or the front.
  const n = row.poses.length, w = (n - 1) * step;
  const centre = new Vector3(right[0] * w / 2, .42, right[1] * w / 2 + (row.seated ? .2 : 0)), dist = 30;
  const half = w / 2 + .45;
  const camera = new OrthographicCamera(-half, half, half * size[1] / size[0], -half * size[1] / size[0], .1, 100);
  camera.position.set(centre.x + Math.sin(yaw) * Math.cos(pitch) * dist, centre.y + Math.sin(pitch) * dist, centre.z + Math.cos(yaw) * Math.cos(pitch) * dist);
  camera.lookAt(centre); camera.updateProjectionMatrix();
  renderer.render(scene, camera);
  return { people: people.length };
}
