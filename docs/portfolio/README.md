# Material Del Proyecto

`milestones.json` es la fuente de hitos de esta entrega. Los cinco objetivos previos
se marcaron completados según arquitectura, despliegue y la activación de proyectos
documentada. El modal se verificó en navegador real de escritorio y móvil, con
cierre, Escape y retorno del foco; por ello también está completado. Publicación
automática y análisis visual quedan pendientes de su comprobación con proveedores
reales. Los pesos suman 100; el porcentaje mide este alcance, no el número
de commits ni el esfuerzo futuro de mantenimiento. El chatbot global con historial
no pertenece a estos ocho objetivos y continúa planificado en el SRS.

Cada hito tiene ID estable, título ES/EN, peso, estado y una ruta de evidencia que
debe existir en el mismo commit. Cambiar este archivo actualiza los hitos públicos
en la siguiente sincronización, sin duplicarlos en formularios del CMS.

## Imágenes Por Propósito

```text
docs/portfolio/images/
├── interface/    # Pantallas, navegación, formularios y composición visual.
├── features/     # Secuencias y resultados del uso de una funcionalidad.
├── diagrams/     # Arquitectura, flujos y modelos de datos documentados.
└── results/      # Salidas del sistema, informes y evidencias de resultados.
```

Dentro de cada categoría puede haber subcarpetas por funcionalidad, por ejemplo
`features/document-generation/01-editor.webp` y `02-print-preview.webp`. El tamaño
de pantalla puede estar en el nombre (`home-mobile.webp`), pero no determina la
clasificación. Un archivo `cover.*` o `portada.*` tiene prioridad como portada;
en su ausencia se priorizan interfaz, funcionalidades, resultados y diagramas.

Se descubren hasta ocho PNG, JPEG o WebP de tamaño válido. Los SVG genéricos de
plantilla y el diagrama antiguo de `public/project-media` no se usan como portada.
Sin imágenes válidas, la card muestra el texto y las tecnologías sin una imagen
inventada. Diagramas vectoriales pueden exportarse como PNG/WebP en `diagrams/`.

Las capturas iniciales `interface/cover.webp` y `features/project-detail.webp` se
obtuvieron de la aplicación local en modo de solo lectura, con su contenido público
real, durante la validación del modal. No son ilustraciones generadas ni capturas
del CMS privado. Reflejan el contenido visible en ese momento; sincronizaciones
posteriores pueden actualizar los textos del proyecto.

No se requieren descripciones manuales. Gemini analiza los píxeles y devuelve
texto alternativo y descripción visual ES/EN. El archivo sigue en GitHub; solo se
conservan referencias, hashes y metadatos generados. No se infieren rendimiento,
tecnologías internas o funcionalidad implementada únicamente a partir de una foto.
