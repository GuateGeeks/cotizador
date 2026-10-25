# Contrato de piezas papercraft

La biblioteca está en `asesor/lab/paper/`. Cada autor es dueño **solo** de su
archivo `pieces-<grupo>.js`. No edites `kit.js`, `material.js`,
`inspector.js`, `catalog.js` ni archivos de otros grupos. Si necesitas una
primitiva nueva, constrúyela localmente en tu archivo con las existentes y
pídela en el informe.

Antes de empezar, lee:

- el skill [cotizador-papercraft](../../.claude/skills/cotizador-papercraft/SKILL.md);
- `asesor/lab/paper/kit.js` (API y paleta);
- `asesor/lab/paper/pieces-kit.js` (ejemplo trabajado).

Abre también tus láminas de referencia en `docs/papercraft/reference/`.

## Forma de una pieza

```js
import { PAPER as C, T, t, SCALE, newMeta, stage, edgeTone, shadeTone } from './kit.js';

export const PIECES = [{
  id: 'room-initial',            // estable, kebab-case, único en el catálogo
  label: 'Aula inicial',         // español, como en la lámina
  group: 'rooms',                // el de tu archivo
  size: { w: 2.6, d: 2.3, h: 1.7 },  // huella y altura declaradas (unidades de escena)
  budget: 700,                   // triángulos máximos de la pieza sola
  opts: {},                      // variante por defecto que recibe build
  build(b, p, opts) {            // b: builder de campus-kit; p: paperKit(b)
    const meta = newMeta({ focus: [0, .8, 0] });
    // ... geometría ...
    return meta;
  }
}];
```

**Origen y ejes**

- La pieza se apoya en `y = 0` con la huella centrada en `x = 0, z = 0`.
- `+Z` mira a la cámara y es el frente: el lado abierto del aula en corte, la
  puerta de la entrada o la cara de una persona.
- `+X` es la derecha vista desde el frente.

**Huesos**

- Crea huesos con `b.rig.add(opts.id + '.<parte>', opts.parent || 'root', x, y, z)`.
- Dibuja sobre un hueso con `b.bone(hueso)` y vuelve con
  `b.bone(opts.parent || 'root')`.
- Las coordenadas son las del espacio del hueso en reposo.
- Prefija siempre los nombres con `opts.id`, porque en el campus varias piezas
  comparten un mismo rig.

**Ensamblaje**

Llamada: `stage(meta, hueso, orden, estilo, extra)`.

- Órdenes:
  - 0: base;
  - 1: muros;
  - 2: cubierta;
  - 3: conexiones;
  - 4: mobiliario y recursos;
  - 5: personas.
- Estilos:
  - `fold`: gira desde `from` radianes sobre `axis` hasta el reposo. Es el de
    muros y cubiertas, con el hueso en la línea de pliegue (la base del muro o
    la bisagra);
  - `rise`: escala en Y;
  - `pop`: escala;
  - `drop`: cae desde arriba.
- Toda pieza arquitectónica que se ensambla tiene al menos un `fold`.

**`meta`**

- `focus`: punto local para el acercamiento.
- `anchors`: `{ nombre: [x, y, z] }`, por ejemplo puerta, pie y cima de
  escalera, asientos, pantalla o mesas.
- `connectors`:
  `[{ side: 'left'|'right'|'back'|'front'|'up', type: 'wall'|'open'|'door'|'corridor', at: [x, y, z] }]`.

**Capas**

- El builder empieza en `solid`, que proyecta sombra.
- Para detalles pequeños sin sombra usa `b.layer('soft')` y vuelve con
  `b.layer('main')`.
- El vidrio va con `p.glass(...)` y las sombras de contacto con `p.shadow(...)`.

**Paleta**

- Solo `PAPER`, más los derivados con `edgeTone` o `shadeTone`.
- Los acentos de nivel están en `PAPER.level`.
- Un hex nuevo solo se usa si no existe un equivalente, y se justifica en el
  informe.

## Reglas de papel (resumen del skill)

- **Espesor:**
  - `T = 0.03` para estructura;
  - `t = 0.018` para mobiliario, personas y hojas;
  - `BOARD = 0.06` para bases.

  El canto debe verse. Donde la referencia muestra lámina, no van cajas
  macizas.
- **Pliegues con intención:** muros como láminas plegadas (`p.fold`) o cards
  unidas en arista. Superficies limpias entre pliegues.
- **Pestañas:** de 2 a 4 por módulo arquitectónico, solo en uniones elegidas.
- **Capas:** marcos y ventanas como cards superpuestas, separadas al menos un
  espesor. **Nunca dejes caras coplanares superpuestas**, porque parpadean.
- **Vegetación:** `p.crown` facetada y `p.spike` plegados. Nunca esferas
  suaves.
- **Material:** el material ya es papel mate. No simules textura con
  geometría.
- **Escala:** respeta `SCALE`:
  - puerta de 0.52 × 1.08;
  - mesa de 0.36 de alto y asiento a 0.22;
  - persona de primaria de 0.78 y adulta de 0.98 (perfiles de `construction/FICHAS-TECNICAS.md`);
  - piso de 1.7 y losa de 0.12.

  Nunca escales una pieza para que «quepa».
- **Presupuesto:** `budget` es un tope de triángulos y no se relaja. Si no
  alcanza, simplifica.

## Autocomprobación

```bash
cd /home/adawolfs/projects/makecode/cotizador
PLAYWRIGHT_MODULE=/home/adawolfs/projects/tools/node_modules/playwright \
  ~/.nvm/versions/node/v22.23.4/bin/node tools/paper-shot.cjs artifacts/paper/<grupo>-r<N> --group <grupo> --views 34,front,close --assembly 0,.5
```

- Usa una carpeta nueva por corrida (`r1`, `r2`, `r3`).
- El script espera su turno: un solo Chromium a la vez. **No uses `--gpu`.**
- Abre la hoja del grupo y cada pieza con la herramienta de lectura de
  imágenes, y compáralas con tu lámina.
- `report.json` trae triángulos, tamaño real, etapas y errores de
  construcción. Sin errores es requisito.
- Corrige con un máximo de **dos rondas** después de la primera corrida.

Para comprobar solo la sintaxis, antes de renderizar:

```bash
~/.nvm/versions/node/v22.23.4/bin/node -e "import('./asesor/lab/paper/pieces-<grupo>.js').then(m=>console.log(m.PIECES.length))"
```

No ejecutes `npm run build`, no edites `asesor/vendor/` y no hagas commits.

## Informe final

Responde en pocas líneas:

- cada pieza con su id, triángulos y presupuesto;
- la carpeta de la última corrida;
- qué coincide con la referencia y qué no;
- los defectos conocidos;
- lo que pides al kit.

No declares calidad visual sin haber abierto las imágenes.
