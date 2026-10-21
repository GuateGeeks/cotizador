# Migración del cotizador a GuateGeeks

## Objetivo

Publicar el cotizador existente bajo la organización `GuateGeeks` y servirlo en
`https://guategeeks.com/cotizador/`, sin alterar el repositorio original ni el
proyecto de programas educativos.

## Diseño

Se conserva el historial completo de `jarredondor1/cotizadorgg`: el repositorio
de origen se clona y su rama `main` se publica en el repositorio vacío
`GuateGeeks/cotizador`.

La aplicación estática usa referencias relativas para sus hojas de estilo,
JavaScript e imágenes. Por ello sus recursos se resolverán desde
`/cotizador/` sin cambiar el código de la aplicación.

El flujo de despliegue se ajustará para GitHub Pages y la configuración de
Pages se habilitará desde la rama `main`. El dominio `guategeeks.com`, ya
configurado para los repositorios de la organización, expondrá el proyecto en
la ruta `/cotizador/`.

## Validación

1. Confirmar que `main` conserva los commits del proyecto original.
2. Confirmar que el remoto de publicación es `GuateGeeks/cotizador`.
3. Verificar que GitHub Pages termina correctamente y que
   `https://guategeeks.com/cotizador/` devuelve la página y sus recursos.
