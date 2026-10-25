# Herramientas reproducibles

Requieren Python 3.10 o posterior. La lectura de JSON, validación y producción de SVG utilizan la biblioteca estándar de Python. Para exportar PNG se necesita Inkscape instalado localmente. No se realizan descargas ni llamadas de red.

Desde la raíz del paquete:

```bash
python3 herramientas/generar_planos.py --validate-only
```

Este comando lee **los JSON entregados**, compara sus métricas guardadas contra un recálculo y no escribe archivos. Devuelve código 0 si pasa o 1 si falla.

Para regenerar las 22 láminas SVG, el catálogo y la validación a partir de los JSON existentes:

```bash
python3 herramientas/generar_planos.py
```

Para exportar también las 22 láminas PNG y las 140 vistas PNG individuales:

```bash
python3 herramientas/generar_planos.py --png --views
```

Las 140 vistas se guardan en `vistas/Pxx-nombre/`: frente, espalda, izquierda anatómica, derecha anatómica, superior, inferior y tres cuartos. Son proyecciones deterministas de los JSON. Los PNG artísticos de `imagenes/` no se regeneran con esta herramienta.

## Edición de recetas

Los modos normales nunca sustituyen las piezas por presets. Si se editan vértices o caras, actualizar deliberadamente `metadata.triangles`, `metadata.bounds_local_H`, `metadata.dimensions_scene` y el conteo de `assembly.json` cuando corresponda. La validación detecta datos guardados obsoletos; no los corrige silenciosamente.

**Restablecimiento explícito:**

```bash
python3 herramientas/generar_planos.py --presets --png --views
```

`--presets` sobrescribe los 20 JSON de piezas y `assembly.json` con la receta original R2 contenida en el script. Usarlo solo cuando se quiera restaurar esa base. No combinarlo con `--validate-only`.

## Pruebas del validador

```bash
python3 herramientas/probar_validador.py
```

Se realizan cambios deliberadamente incorrectos **en memoria** para comprobar que se detectan: conteos falsos, métricas obsoletas, índices fuera de rango, coordenadas no finitas, ciclos del rig y anclajes desalineados. No modifica las recetas entregadas.

## Alcance

Ver `../VALIDACION-GEOMETRICA.json` y `../datos/CONTRATO.md`. Las comprobaciones numéricas no equivalen a revisar todas las poses ni a medir el rendimiento del cotizador.
