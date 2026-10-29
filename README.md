# Cotizador de programas GuateGeeks

El [asesor de programas](asesor/LEEME.md) permite configurar niveles, estudiantes, programas y equipos, comparar modalidades y descargar una propuesta institucional. Su campus 3D se actualiza con la configuración y comparte controles entre escritorio y móvil. Consulta [arquitectura, procedencia y pruebas del campus](docs/campus-3d.md).

La propuesta específica de Colegio Costa Sur permanece en `index.html`, `costa-sur.css` y `costa-sur.js` como referencia del escenario comercial original.

## Publicar

El workflow existente `.github/workflows/pages.yml` publica el asesor en la raíz de GitHub Pages. Copia `asesor/index.html`, sus scripts y estilos, el bundle de `asesor/vendor/` y los recursos de `assets/`; ajusta las rutas de estos últimos para la raíz. El origen de publicación de Pages debe ser GitHub Actions.

Tras editar la escena 3D, compila su bundle antes de publicar:

```bash
npm ci && npm run build
npm test
```

Para verlo localmente, sirve la raíz del repositorio por HTTP y abre `/asesor/index.html`; `#ejemplo` carga una configuración de demostración. Las instrucciones completas están en [asesor/LEEME.md](asesor/LEEME.md).

## Archivos

- `asesor/`: configurador, motor comercial, exportación PDF y campus 3D.
- `docs/campus-3d.md`: contrato de datos, decisiones visuales y validación del campus.
- `index.html`, `costa-sur.css` y `costa-sur.js`: propuesta original de Costa Sur.
- `assets/`: marca y fotografías de equipos utilizadas por las propuestas.

Socrates Aprende está disponible para estudiantes de 4.º a 6.º primaria en la fase actual. Para preprimaria y de 1.º a 3.º primaria se ofrece como recurso docente, sin contenido estudiantil. La ampliación para estudiantes se realizará por fases: primero básico y después bachillerato. El acceso y su vigencia se acuerdan con GuateGeeks según el modelo. La plataforma abre desde su enlace público. Los importes son estimaciones comerciales y se confirman con GuateGeeks.

## Asistente Geeky

Voz opcional, chat y controles del cotizador y campus: [integración y despliegue](docs/geeky-agent.md), [validación](docs/geeky-agent-validation.md). El runtime se versiona en [GuateGeeks/geeky-agent](https://github.com/GuateGeeks/geeky-agent).
