# Material Del Proyecto

Este directorio conserva material visual opcional. Los hitos ya no se mantienen
en un archivo: los genera y reevalúa la IA dentro del servicio de portafolio, que
guarda identidad, estado, justificación y evidencia en PostgreSQL. Consulta
[el contrato automático](../project-integration.md).

La documentación normal sigue describiendo hechos y pendientes: el chat global y
la retención se activaron según [chat.md](../chat.md), mientras la aceptación del
panel de conversaciones con la sesión GitHub del propietario continúa pendiente.
No se fija un porcentaje manual en este repositorio.

## Imágenes Por Propósito

Esta organización es opcional. También se descubren imágenes locales enlazadas
desde Markdown y carpetas `screenshots/` o `captures/`, sin crear esta estructura.

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
plantilla no se usan como portada. El diagrama local obsoleto y su directorio se eliminaron.
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
