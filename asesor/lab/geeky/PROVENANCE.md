# Procedencia de Geeky 3D

- Fuente: https://github.com/GuateGeeks/geeky-animation
- Commit: `0089c59`
- Los archivos de esta carpeta (salvo `embedded.js` y este documento) son copias sin modificar de la fuente. La estructura relativa se conserva (`live/` y `geeky-motion.mjs`) para que sus importaciones, por ejemplo `core.mjs` -> `../geeky-motion.mjs`, sigan intactas.
- No se copiaron `assistant.mjs`, `svg-renderer.mjs`, `actor.mjs` ni `index.mjs`: el campus no los usa.

| Archivo aquí | Ruta en la fuente | SHA256 |
|---|---|---|
| `geeky-motion.mjs` | `src/geeky-motion.mjs` | `a79f2afbe01f1f3d6a6975ff4382ec13734f7b4c698b935e306b23cf012540cf` |
| `live/actions.mjs` | `src/live/actions.mjs` | `fbfa9e0c6f5dfdb5215f6adc5fdad6f419595aef2616bd26fec425dbd8789d65` |
| `live/brain.mjs` | `src/live/brain.mjs` | `2c489c6c8dbb70b7dffc61636a10eb773e2590a3fd7f42c93894c10d9d5f0648` |
| `live/core.mjs` | `src/live/core.mjs` | `e857eb8d5995a2ed1ef44cb4345f260e52d57d050556eae34ee3b19b470c339e` |
| `live/learning-actions.mjs` | `src/live/learning-actions.mjs` | `c38b3d7f136ac6050e4b33298fc313a3e9455c9292001758206c14cd05629406` |
| `live/technology-actions.mjs` | `src/live/technology-actions.mjs` | `f79db546812eb2ec96e2d5ae811df0ffed39372abec76f761c4c6707dbd69dd2` |
| `live/technology-props.mjs` | `src/live/technology-props.mjs` | `62856cb0a1d6dc9ef19dea055ef0fd1531fe6b6bff68dc7a525f98e3bacf4a86` |
| `live/three-renderer.mjs` | `src/live/three-renderer.mjs` | `502099db0a2015058bf2e5bee60cf6616d65282d8371a3abbfca0069b006e0aa` |

## Licencia

El repositorio de origen no declara una licencia. Pertenece a la misma organización, GuateGeeks. La persona responsable pidió esta integración el 2026-10-24 («remueve el modelo low poly de Geeky e integra el modelo 3D estilizado de https://github.com/GuateGeeks/geeky-animation»).

## Archivos propios

- `embedded.js`: monta el `ThreeRenderer` original sin WebGL propio (`Object.create(ThreeRenderer.prototype)`, escena = un `Group` del campus, `gl` = stub, sin sus luces) y expone `step(dt)` = `renderer.render(brain.update(dt), brain.fx())`.
- `../campus-geeky.js`: posición, escala (0,027), orientación a la cámara, mirada, acciones y reposo en el campus.

Para verificar: `sha256sum geeky-motion.mjs live/*.mjs` debe coincidir con la tabla y con los mismos archivos en el commit `0089c59`.
