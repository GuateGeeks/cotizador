// The immersive program room as a VR space: three play zones instead of tables, spare headsets on the shelf
// and a screen showing the virtual world. Room-local metres, like the other furnishing in create-world.
import constants from '../../../world/constants.json';

const BASE = constants.base;
const SHELF_TOP = BASE + 1.2;
const INLAY_TOP = BASE + .036; // The corner classroom's coloured floor inlay; rings sit on it.

// [x, z, rotation, start time in seconds]: zones far enough apart that reaching arms never cross, in the
// front strip of the room so the roof and the front beam leave them in view.
export const VR_ZONES = [[-.6, 1.1, .3, 0], [.85, 1.2, 0, 1.1], [2.3, 1.0, -.3, 2.2]];
// The teacher watches from beside the screen at the back.
export const VR_TEACHER = [-.85, -1.2, .45];

// [asset, x, y, z, rotation, scale, onShelf]. Headsets on the shelf hide with it at campus distance.
export const VR_PROPS = [
  ['equip-screen-vr', .4, BASE, -1.7, 0, 1, false],
  ...VR_ZONES.map(([x, z]) => ['equip-vr-zone', x, INLAY_TOP, z, 0, 1, false]),
  ['equip-vr-set', 1.84, SHELF_TOP, -1.95, 0, 1, true],
  ['equip-vr-set', 2.36, SHELF_TOP, -1.95, 0, 1, true]
];

export const VR_ASSETS = [...new Set(VR_PROPS.map(([asset]) => asset)), 'equip-vr-headset', 'equip-vr-controller', 'furn-shelves', 'equip-kit-storage'];
