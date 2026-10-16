# David Aranda — identidad visual

Marca monocromática coherente con el portafolio: carbón `#171717`, blanco
`#fafafa` y nombre en Geist de peso medio, sin dominio ni descriptor. La firma abreviada
«David Aranda.» conserva el nombre completo en la etiqueta accesible.

El isotipo combina la curva de la D con una A de vértice elevado. Los cortes
en la curva superior y el travesaño dejan respirar los cruces: las letras
se entrelazan sin formar una mancha sólida. La cuadrícula es de 64 unidades
y el trazo de 4,5 unidades. El imagotipo reúne este símbolo con el nombre.

## Aplicaciones

- Logotipo: cabecera de escritorio, menú móvil y pie de página.
- Isotipo: cabecera administrativa, pestaña del navegador y acceso directo iOS.
- Avatar reutilizable: `public/brand/avatar.png` (512×512).
- Logotipos transparentes: `public/brand/logotype-light.svg` para fondo claro y
  `logotype-dark.svg` para fondo oscuro. Usan Geist cuando está instalada y Arial
  como alternativa; el sitio utiliza su propia fuente Geist.

Mantener al menos un cuarto del ancho del isotipo como espacio libre. No estirar
ni agregar sombras, degradados o colores. El icono tiene fondo carbón permanente
para funcionar en pestañas claras y oscuras. El logotipo web sigue el tema del sitio.

Fuente maestra editable: `public/brand/isotype.svg`. Ejecutar
`node scripts/generate-brand.mjs` desde la raíz para regenerar SVG, PNG e ICO
(16, 32 y 48 px). No depende de IA ni de la sincronización de proyectos.
