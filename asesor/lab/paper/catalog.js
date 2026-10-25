/**
 * Papercraft catalog: every piece the campus can use, by group. Each author file
 * exports PIECES; see docs/papercraft/CONTRACT.md for the piece contract.
 */
import { PIECES as KIT } from './pieces-kit.js';
import { PIECES as ROOMS } from './pieces-rooms.js';
import { PIECES as LINKS } from './pieces-links.js';
import { PIECES as NATURE } from './pieces-nature.js';
import { PIECES as FURNITURE } from './pieces-furniture.js';
import { PIECES as TECH } from './pieces-tech.js';
import { PIECES as PEOPLE } from './pieces-people.js';

export const GROUPS = Object.freeze([
  { id: 'kit', label: 'Materiales y construcción' },
  { id: 'rooms', label: 'Arquitectura: aulas' },
  { id: 'links', label: 'Arquitectura: conexiones' },
  { id: 'nature', label: 'Vegetación y exterior' },
  { id: 'furniture', label: 'Mobiliario y recursos' },
  { id: 'tech', label: 'Tecnologías educativas' },
  { id: 'people', label: 'Personajes' }
]);

export const CATALOG = Object.freeze([...KIT, ...ROOMS, ...LINKS, ...NATURE, ...FURNITURE, ...TECH, ...PEOPLE]);
