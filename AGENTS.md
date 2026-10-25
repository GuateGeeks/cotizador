# Trabajo en el cotizador

Sitio estático de GuateGeeks: `index.html` (portada) y `asesor/` (asesor de
programas educativos). JavaScript directo, sin framework; el campus 3D usa
Three.js 0.186.1 empaquetado con esbuild en `asesor/vendor/lab-scene.min.js`.

## Comandos

- `npm ci`: dependencias exactas (Node 22).
- `npm test`: pruebas de Node (`asesor/test/*.test.js`).
- `npm run build`: regenera el bundle. Hazlo después de editar `asesor/lab/*` y
  súbelo junto con los cambios; `checks.yml` comprueba que coincide con las fuentes.
- `npm run serve`: servidor local en <http://127.0.0.1:8087/asesor/index.html>.
- `npm run test:browser`: recorrido real en Chromium (requiere Playwright, ver
  [QA 3D](.claude/skills/cotizador-3d-qa/SKILL.md)).
- `npm run capture -- <carpeta>`: capturas de estados y vistas de referencia.

Si cambias `asesor/*.js` o `asesor/*.css`, sube el `?v=` de `asesor/index.html`
para invalidar la caché del navegador.

## Reglas

- `main` se publica en guategeeks.com/cotizador al hacer push. Trabaja en una
  rama y entrega por PR; no hagas push a `main` sin instrucción explícita.
- El motor comercial (`motor.js`, `config.js`, `propuesta-pdf.js`) es la fuente
  de verdad. La escena 3D consume sus resultados y nunca calcula precios. No
  inventes precios, servicios, plazos ni condiciones para completar pantallas.
- Conserva el flujo de cinco pasos (Niveles, Estudiantes, Programas,
  Configuración, Propuesta) y la cotización completa sin 3D.
- Credenciales fuera del repositorio: no guardes tokens en `git config`,
  fuentes, artefactos ni registros.
- `artifacts/` es evidencia local ignorada por git. Usa una carpeta nueva por
  corrida y no sobrescribas capturas revisadas.
- No declares una verificación sin ejecutarla. Distingue emulación de viewport
  de prueba en dispositivo real, y SwiftShader de GPU.

## Skills del proyecto

Están en `.claude/skills/` (`.agents/skills` apunta al mismo lugar):

- [cotizador-papercraft](.claude/skills/cotizador-papercraft/SKILL.md): dirección
  de arte, biblioteca de papel y materiales.
- [cotizador-campus-growth](.claude/skills/cotizador-campus-growth/SKILL.md):
  planificador modular, conexiones y estados de crecimiento.
- [cotizador-scene-contract](.claude/skills/cotizador-scene-contract/SKILL.md):
  frontera entre el cotizador y la escena, reglas de equipos y lo ilustrativo.
- [cotizador-3d-qa](.claude/skills/cotizador-3d-qa/SKILL.md): navegador,
  capturas, presupuestos de render y evidencia.

Documentación del campus: [docs/campus-3d.md](docs/campus-3d.md). Plan vigente:
[papercraft](docs/superpowers/plans/2026-10-24-campus-papercraft.md).
