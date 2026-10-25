# Actores del campus (`meta.actors`)

Contrato entre la composición (`asesor/lab/paper/compose.js`) y la actividad de la escena
(`asesor/lab/paper/scene-activity.js`, `campus-scene.js`). La composición coloca muebles,
equipos y personas; la actividad los anima a partir de estos datos. Coordenadas en metros del
modelo, **locales al módulo** del aula o patio (`floor` es la altura del piso del aula dentro de
su módulo). `ry` en radianes: una persona con `ry = 0` mira hacia +Z (hacia la cámara).

Compatibilidad: los campos y nombres de hueso anteriores se conservan. Lo nuevo de la
composición por actividad (2026-10-25) está marcado con **nuevo**. Las pruebas
`asesor/test/paper-composition.test.js` y `tools/paper-activity-check.mjs` comprueban el contrato.

## `actors.rooms[]`

| Campo | Tipo | Uso |
|---|---|---|
| `key`, `programId`, `levelId` | string / null | Módulo y alcance del aula. |
| `kind` | `'class' \| 'project' \| 'vr'` | Sin cambios: la actividad decide la pose sentada (`project` = alcanzar el kit). |
| `layout` **nuevo** | `'class' \| 'workbench' \| 'track' \| 'vr'` | Composición: aula de nivel, mesa de taller, pista de Tale-Bot en el piso, círculo de RV. |
| `floor` | número | Altura del piso dentro del módulo. |
| `teacher`, `facilitator` | `{ ctrl, home: [x, z], ry, away }` | `away` **nuevo**: `[x, z, ry]` libre donde el facilitador ayuda (hoy la constante de la actividad, `[.02, .62, …]`); `null` en el docente. |
| `students[]` | `{ ctrl, seat, vr?, k? }` | Solo personas que la actividad sienta (o de pie con visor, `vr: true`). `seat` indexa `seats`. |
| `second[]`, `waiting[]` | como hasta ahora | Segundo grupo simultáneo (segunda mesa) y grupo que espera en la banca (relevo). |
| `around[]` **nuevo** | `{ ctrl, spot: { x, z, ry }, pose: 'kneel' \| 'stand', waiting }` | Grupo alrededor de la pista de Tale-Bot: de rodillas o de pie. **No** está en `students`, porque la actividad actual sentaría a esas personas en el aire. Si se anima, conservar `pose` (las rodillas van 0.022 sobre el piso). |
| `devices[]` | `{ bone, home: [x, y, z, ry], set, body, hub, … }` | Ver abajo. |
| `seats[]` | `{ x, z, ry, table, set, side, … }` | Solo existen las sillas usadas: `chair: true` **nuevo** marca las que tienen silla; `tableIndex` **nuevo** (índice en `tops`); `service: true` **nuevo** para docentes de servicio; `stand: true` en RV. |
| `bench[]` | `{ x, z, ry }` | Banca del relevo (frente izquierdo del taller). |
| `holo` | hueso | `<aula>.holo.float`, la isla flotante del holograma. |
| `holoCentre` **nuevo** | `[x, z]` | Centro del círculo de RV. |
| `stations`, `relay`, `simultaneous` | booleano | Sin cambios. |
| `tables[]` | `[x, y, z]` | Sin cambios (centro de cada mesa). |
| `tops[]` **nuevo** | `{ key, index, x, z, y, w, d, x0, x1, z0, z1 }` | Superficie útil de cada mesa (y = cubierta). |
| `track` **nuevo** | `{ x0, x1, z0, z1, y }` o null | Superficie de la pista de Tale-Bot en el piso. |
| `service` | `{ kind: 'training' \| 'followup', teachers: [{ ctrl, seat }] }` | Sin cambios; los asientos de servicio están en `seats`. |

### `devices[]`

| Campo | Uso |
|---|---|
| `bone` | Montura sin escala: la actividad mueve su `position` y `rotation.y` (como hasta ahora). |
| `home` | `[x, y, z, ry]` de reposo sobre su superficie. |
| `set` | 0 = kit principal; 1 = segundo set (grupo simultáneo, segunda mesa). |
| `body`, `hub` | Huesos internos (`<aula>.t<i>.dev.body`, `.hub`) si la pieza los tiene. |
| `scale` **nuevo** | Escala de diorama (ver tabla). Vive en el hueso hijo `<aula>.t<i>.dev.size`; no tocar su escala. |
| `motion` **nuevo** | `'drive'` (Tale-Bot recorre la pista), `'walk'` (el dino avanza poco), `'build'` (SPIKE casi quieto), `'still'` (protoboard). |
| `range` **nuevo** | `[dx, dz]`: desplazamiento máximo que la composición deja libre alrededor de `home`. |
| `surface` **nuevo** | `{ x0, x1, z0, z1, y }`: mesa o pista donde se apoya. |

**Pendiente para la animación.** La actividad actual mueve todo equipo ±0.16 en x, ±0.12 en z y gira
±0.55 rad. Con equipos 2× eso saca el dino y el SPIKE del borde de la mesa a media corrida. En reposo
(el estado que se muestra y se comprueba) todo queda en `home`. Usar `motion` y `range` para limitar
el recorrido.

## `actors.drones[]`

| Campo | Uso |
|---|---|
| `bone`, `home`, `props`, `host`, `units` | Sin cambios. `home = [0, .78, -.05]`: el dron flota sobre el centro de la plataforma. |
| `hover` **nuevo** | Altura de vuelo en reposo (`home[1]`). Hoy la actividad lo aterriza al final de la corrida (y = 0.08); la referencia lo muestra en el aire. |
| `scale` **nuevo** | 2.2 (hueso hijo `patio:drones.drone.size`). |
| `pilots[]` **nuevo** | `{ ctrl, spot: { x, z, ry }, controller, who }`: dos estudiantes en el borde oeste de la plataforma con pose `tablet`. `controller` es el hueso del control, hijo de `ctrl.root`: sigue a la persona. No están en `walkers`. |
| `pad` **nuevo** | `{ x0, x1, z0, z1, y }` de la plataforma (y = 0.06). |

## `actors.walkers[]`

Sin cambios de forma. El público del dron (`kind: 'patio'`) se sienta en la banca más cercana o se
queda de pie al este de la plataforma, mirando al dron.

## Personas por aula (planificador)

`plan.js` asigna, en este orden cuando el tope de 40 obliga a recortar: personal (docente por aula de
nivel, facilitador por taller con servicio guiado), el grupo del dron (dos pilotos con `pilot: true` y un
espectador), dos estudiantes por aula, el tercer estudiante de cada taller (el aula con formación docente
lo cede al final), caminantes, el tercer estudiante de las aulas de nivel y el resto. `plan.serviceRooms`
reserva los docentes de servicio (2 de formación y 1 de seguimiento), así que la escena no descarta
caminantes para ellos.

## Escala de diorama (`DEVICE_SCALE`)

| Pieza | Escala | Pieza | Escala |
|---|---|---|---|
| `robot-tale` | 2.7 | `hologram` | 3.6 |
| `robot-dino` | 1.8 | `drone` | 2.2 |
| `kit-spike` | 2.6 | `laptop` | 1.4 |
| `electronics` | 2.3 | `controller` | 1.7 |
| `component-tray` | 1.4 | `kit-box` | 1.2 |

## Nombres de hueso

Se conservan: `<aula>.t<i>`, `<aula>.t<i>.c<n|s>`, `<aula>.t<i>.lap`, `<aula>.t<i>.dev`,
`<aula>.t<i>.mat`, `<aula>.shelf`, `<aula>.box`, `<aula>.flag`, `<aula>.pads`, `<aula>.holo`,
`<aula>.p<asiento>`, `<aula>.teacher`, `<aula>.facilitator`, `<aula>.svc<asiento>`, `<aula>.svcbox`,
`<aula>.bench`, `<aula>.x<asiento>`, `<aula>.w<i>`, `walk.<clave>` y `patio:drones.drone`
(con `.prop0…3` y `.ctl`).

Nuevos:

| Hueso | Qué es |
|---|---|
| `<aula>.t<i>.c<n\|s><k>` | Segunda silla (k = 2, 3…) del mismo lado de una mesa; la primera conserva `.c<n\|s>`. |
| `<aula>.t<i>.lap<k>` | Segunda laptop de una mesa (aula de nivel: una por estudiante). |
| `<aula>.svclap` | Laptop del docente de seguimiento. |
| `<aula>.svctray`, `<aula>.t0.tray` | Bandeja de componentes (formación docente; electrónica). |
| `<aula>.track` | Pista de Tale-Bot en el piso. |
| `<aula>.k<i>` | Niños extra de pie junto a la pista (siguiente grupo). |
| `<pieza>.size` | Hijo con la escala de diorama de cualquier equipo escalado (`.t<i>.dev.size`, `.holo.size`, `.lap.size`, …). |
| `patio:drones.pilot<i>` | Piloto del dron (raíz de la persona). |
| `patio:drones.drone.ctl1` | Control del segundo piloto (`.ctl` es el del primero), hijo de la raíz del piloto. |
