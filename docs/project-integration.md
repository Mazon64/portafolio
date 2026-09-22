# Proyectos Automáticos

## Contrato

Vincular un repositorio público basta para iniciar descubrimiento, generación ES/EN,
análisis de imágenes, indexación y publicación. No se rellenan fichas, tecnologías,
descripciones de imágenes o hitos en el CMS y no se aprueba cada actualización.
La IA genera y reevalúa los hitos; el servicio conserva su identidad, estado y
evidencia en PostgreSQL. No se exige un manifiesto ni un archivo de hitos en el repo.
El CMS administra la conexión, pausa, estado, reintentos y eliminación del proyecto.
Los documentos profesionales (CV, ATS y cartas) conservan su flujo independiente.

## Descubrimiento De Fuentes

- GitHub aporta ID estable, nombre, descripción, rama predeterminada, homepage,
  lenguajes y estado archivado. El slug se asigna una sola vez para conservar identidad.
- Se detectan Markdown de la raíz y de `docs/`, `doc/` o `documentation/`, con
  prioridad para README, roadmap, changelog, arquitectura y SRS. Son opcionales.
- Manifiestos como `package.json`, `pyproject.toml`, `go.mod`, `Cargo.toml`,
  `requirements.txt`, `pom.xml` y `composer.json` aportan tecnologías declaradas.
  Dockerfile y vercel.json aportan sus plataformas. Nunca se ejecuta código del repo.
- Un árbol truncado o excesivo se rechaza. Se excluyen rutas ocultas, traversal,
  symlinks y árboles de dependencias. Los blobs se leen por SHA, no por una rama móvil.
- Se lee una muestra de hasta cinco archivos de implementación y tres de pruebas,
  incluyendo esquemas cuando caben. No se ejecuta ni se audita todo el código.
- GitHub Milestones, Issues y releases aportan contexto opcional: hasta cuatro
  milestones, cuatro issues recientes (se excluyen PRs) y dos releases. Sus cuerpos
  se acotan; cerrar un issue por sí solo no demuestra implementación ni aceptación.
- La selección está limitada a doce Markdown, ocho manifiestos y 64 fragmentos.
  Los archivos aportan hasta 60 KB de fragmentos, con topes de 12 KB para código y
  manifiestos por separado; se reserva el resto para actividad, metadatos e imágenes
  dentro de 120 KB totales. Los Markdown largos se muestrean en hasta tres fragmentos
  literales (introducción, aceptación pendiente cuando se detecta y cierre), con sus
  ordinales originales; no se presentan como una lectura exhaustiva. Los archivos
  o muestras que no caben se omiten. Un fallo de
  lectura/proveedor no se interpreta como desaparición de los objetivos anteriores.

## Imágenes Por Propósito

Las imágenes son opcionales. Se descubren enlaces locales en los Markdown leídos,
carpetas `screenshots/` o `captures/` (también anidadas) y, como convención adicional,
las carpetas siguientes. No es necesario reorganizar un repositorio para vincularlo.
No se descargan imágenes desde URLs externas arbitrarias; se resuelven a blobs
regulares del mismo repositorio y commit. Logos, iconos y badges se excluyen.

```text
docs/portfolio/images/
├── interface/   # Pantallas, navegación y composición de la interfaz.
├── features/    # Uso y resultados de una funcionalidad; admite subcarpetas.
├── diagrams/    # Arquitectura, flujos y modelos de datos.
└── results/     # Informes, salidas y evidencia visual de resultados.
```

Se descubren hasta ocho PNG/JPEG/WebP de hasta 4 MB. `cover.*` o `portada.*` tienen
prioridad; después se priorizan interfaz, funcionalidades, resultados y diagramas.
La organización no depende del tamaño de pantalla. Los SVG de plantilla no se usan
como portadas; el antiguo diagrama local y su directorio se eliminaron.
Sin imágenes válidas, la card usa composición de texto y tecnologías, sin portada
inventada ni una foto de reemplazo. Diagramas SVG pueden exportarse a PNG/WebP.

Sharp verifica formato y tamaño (20 megapíxeles como máximo), normaliza orientación,
quita metadatos y prepara WebP de hasta 1280px y 1 MB para Gemini. Se envían los
píxeles reales, junto con ruta, categoría y contexto del repositorio. Gemini devuelve
texto alternativo y descripción visual ES/EN para los identificadores exactos.
La imagen no demuestra por sí sola tecnología interna, rendimiento o finalización.

Los archivos permanecen en el repositorio y se sirven por URL fijada al commit;
`next/image` aporta optimización/caché. PostgreSQL guarda únicamente referencias,
hashes, dimensiones y descripciones. El análisis se reutiliza si coinciden blob,
modelo y política visual. Los textos visuales se indexan para RAG indicando que son
observaciones visuales, no prueba de implementación técnica.

## Hitos Y Estado

La IA deriva hasta veinte objetivos significativos de las fuentes habituales:
capacidades implementadas, requisitos, roadmap, trabajo pendiente y aceptación.
Devuelve títulos y justificación ES/EN, estado y citas textuales. El servidor valida
que cada ID de fuente y cita existan en el material leído, asigna URLs, hashes e IDs
para objetivos nuevos y persiste el resultado en `ProjectKnowledge.narrative`.
`metadata.milestonePolicy = "ai-v1"` identifica esta política. No se necesita DDL:
la columna JSONB existente ya almacena los hitos junto a su publicación atómica.

En cada sincronización se entrega el estado anterior como contexto, no como prueba.
Cada ID existente debe reaparecer exactamente una vez. Si falta evidencia actual,
queda `unverified`; si hay trabajo explícito pendiente, `pending`; solo se marca
`completed` cuando el contenido respalda el objetivo completo. La IA no puede borrar
objetivos para elevar el porcentaje. Se rechazan identidades desconocidas/duplicadas,
títulos EN duplicados, citas inventadas y objetivos nuevos sin fuentes. Los objetivos
de otro repositorio no se reutilizan al cambiar la conexión por un ID de GitHub distinto.

Una captura, dependencia, nombre de archivo, conteo de commits o existencia de tests
no certifica una funcionalidad. La clasificación semántica es una inferencia de IA,
no una certificación externa: el CMS muestra la justificación y los extractos para
inspeccionarla. Los documentos de aceptación pendiente prevalecen sobre la mera
existencia del código. No se considera aceptado el panel de conversaciones del
portafolio hasta la comprobación con la sesión real del propietario.

Cada objetivo evaluado usa peso 1 y el porcentaje es
`round(objetivos completados / objetivos totales * 100)`. Los no verificados cuentan
en el denominador. Sin objetivos fundamentados se oculta el porcentaje. Representa
el alcance identificado, no esfuerzo ni terminación total. Archivado en GitHub implica
`ARCHIVED`; en otros casos se mantiene `IN_PROGRESS`, incluso con el 100% de hitos.

Los snapshots anteriores siguen siendo legibles. En su siguiente sincronización,
sus IDs se conservan y sus estados se reevalúan sin usar el antiguo archivo JSON;
los pesos se normalizan a 1. Por tanto el porcentaje puede cambiar legítimamente.
Los archivos del repo se citan por commit. Issues, milestones y releases tienen URLs
mutables: sus extractos y hashes se conservan como evidencia de la lectura publicada.

## Publicación Atómica

`ProjectIntegration` conserva conexión y habilitación. Sus antiguos campos de
imágenes/hitos/rutas no son entradas del nuevo flujo. El resultado generado se
almacena en `ProjectKnowledge.narrative` como snapshot validado: ES/EN, nombres,
metadatos, imágenes e hitos. Esta transición usa JSON existente y no requiere DDL.

El worker verifica rama, configuración, proyecto y lease antes de publicar. En una
transacción reemplaza el corpus anterior, inserta vectores, actualiza traducciones,
tecnologías, demo, progreso y estado, y hace visible la ficha. Solo después invalida
`portfolio`. No hay intervención de publicación manual ni historial numerado de
versiones. Si falla una etapa, se conserva la publicación anterior y se reintenta.
Un fallo de caché después del commit no convierte el guardado en fallo de persistencia.

## Cola Y Recuperación

El webhook verifica HMAC y deduplica entregas antes de responder `202`. Escucha
`push` de la rama predeterminada, `repository`, `milestone`, `release` e `issues`,
aunque no estén asociadas a hitos. Solo acepta repositorios vinculados y públicos; no consume
como instrucciones el contenido del webhook. `after()` inicia el procesamiento,
pero la durabilidad está en PostgreSQL.

Los leases duran diez minutos, con cinco intentos y backoff exponencial. Solo el
dueño vigente puede publicar; eventos de commits obsoletos se marcan `SUPERSEDED`.
El cron de Vercel conserva una ejecución diaria. El workflow **Project Sync Recovery**
invoca el endpoint protegido cada quince minutos desde `main`, utilizando el secret
de repositorio `PROJECT_SYNC_CRON_SECRET` con el mismo valor que `CRON_SECRET` en
Vercel. No tiene acceso a la base ni a Gemini, ni ejecuta migraciones. Puede haber
retrasos del scheduler; no es una garantía de tiempo real.

Cada recuperación reconcilia hasta veinte conexiones, priorizando las menos
sincronizadas, crea como máximo un trabajo periódico por proyecto/día y procesa
hasta tres trabajos elegibles dentro del presupuesto. La rutina recupera también
conexiones cuyo primer encolado falló. Los trabajos terminados se conservan treinta
días para deduplicación; las cuotas caducadas se eliminan automáticamente.

## Modal Y RAG

La card abre un diálogo cuyo contenido integra las capturas con sus secciones:
interfaz en la introducción, funcionalidades con la solución, diagramas con
arquitectura y resultados con sus evidencias. Los hitos tienen iconos SVG, colores
y etiquetas de estado. Base UI gestiona foco y cierre; el contenido se desplaza
independientemente del encabezado. Las consultas están en la burbuja global,
accesible también con el modal abierto; su contexto no fuerza el tema de la pregunta.

Los embeddings siguen usando `gemini-embedding-001` a 768 dimensiones normalizadas.
El chat global consulta corpus publicados de proyectos visibles/habilitados y
datos públicos del perfil. Cita fuentes, revalida visibilidad y separa la navegación
del tema solicitado. Sus conversaciones se almacenan en tablas privadas con
retención de tres días y fijado; nunca se incorporan al índice público. Véase
[chat.md](chat.md). El antiguo endpoint de preguntas por proyecto fue retirado.

## Operación

### Verificación De La Publicación Automática

La actualización se promovió mediante PR #51, commit `e9d47c9`. El workflow
[Project Sync Recovery 34774545629](https://github.com/Mazon64/portafolio/actions/runs/34774545629)
ejecutó el worker de Production y publicó automáticamente un snapshot con nombres
ES/EN, tecnologías y demo detectadas, ocho hitos y dos imágenes analizadas desde
`interface/` y `features/`. No se invocó publicación editorial ni se escribieron
captions manuales. La primera comprobación registró 52 fragmentos indexados.

En navegador real, escritorio ES y móvil EN cargaron las dos imágenes, abrieron y
cerraron el modal correctamente y restauraron el foco, sin errores JavaScript.
Una pregunta sobre la pantalla de inicio obtuvo una respuesta visual con cita a
`docs/portfolio/images/interface/cover.webp`; una pregunta técnica EN citó la
documentación del repositorio. Tras estas comprobaciones se marcaron los dos hitos
que permanecían pendientes. Los secretos del scheduler y los cinco eventos del
webhook están configurados; la homepage de GitHub apunta al dominio público actual.

El esquema base se aplicó mediante PR #46 y workflow protegido
[34610613317](https://github.com/Mazon64/portafolio/actions/runs/34610613317).
La primera integración se activó por PR #47, con consultas ES/EN y deduplicación
real verificadas. La publicación automática reemplaza el modo de revisión de esa
primera entrega; el contrato actual es el descrito arriba.

Para activar en otra instalación: aplicar primero el esquema desde `main`, configurar
flags y secretos exclusivamente en Production, registrar los eventos del webhook,
configurar el secret del scheduler y vincular el repositorio. Mantener ambos flags
de proyectos en `false` en Preview: la aplicación bloquea allí escrituras y Gemini.
Validar un push que cambie texto, una imagen y un hito, comprobar publicación sin
intervención, navegación del modal, captions visuales y citas al commit de origen.

## Revisión Visual En Preview

Preview muestra el modal y la burbuja de la versión candidata sin sincronizar ni
escribir en la base compartida. Todos los proyectos, incluido este portafolio,
muestran los hitos de la última publicación guardada por el servicio. Ya no existe
un override local para el piloto. La nueva generación ocurre solo en Production
después de promover el código y ejecutar una sincronización automática.

## Qué Debe Aportar Un Repositorio

- **Obligatorio:** repositorio público accesible, con una rama predeterminada y un
  commit legible. Solo se introduce `propietario/nombre` en el portafolio.
- **Recomendado, no obligatorio:** README y documentación normal que expliquen
  propósito, alcance, decisiones y pendientes. El código muestra implementación;
  no puede revelar por sí solo objetivos de producto o una aceptación humana.
- **Opcional:** manifiestos para identificar tecnologías, Issues/Milestones/releases
  para trabajo y entregas, homepage de GitHub para la demo, capturas para ilustrar
  la interfaz. Sin capturas la card funciona con texto; sin homepage no se inventa URL.
- **No requerido:** JSON de hitos, traducciones ES/EN, porcentajes, fichas del
  portafolio ni configuración propia en el repositorio.

Las capturas reales deben existir como archivos del repo si se quieren mostrar:
el servicio no ejecuta el proyecto ni navega una aplicación arbitraria para tomarlas.
La organización por `docs/portfolio/images/` es una alternativa opcional a los
enlaces Markdown y carpetas habituales, no una dependencia de la integración.

El webhook es una optimización opcional para recibir cambios pronto, no un requisito
por repositorio: el scheduler del servicio descubre y sincroniza conexiones también
sin webhook, con reconciliación diaria por proyecto. Los proveedores, secretos y
schedulers se configuran una vez en el servicio de portafolio.

## Estado De La Entrega De Hitos IA

Esta evolución está implementada como candidata; su publicación y aceptación con
el proveedor real siguen pendientes. La comprobación de lectura del 22 de septiembre
de 2026 sobre el repositorio existente descubrió documentación, código/pruebas y dos
imágenes sin leer el JSON de hitos. Gemini devolvió `503 UNAVAILABLE` en los intentos
de generación, por lo que no se certificó una generación real ni se escribió en la
base durante esa comprobación. La suite automatizada comprueba identidad entre
sincronizaciones, citas, estados no verificados y conservación de la publicación
anterior ante respuestas inválidas.

Antes de cerrar esta entrega: revisar Preview, obtener la aprobación de promoción,
validar generación y reevaluación reales conservando IDs, y verificar el snapshot
publicado y su evidencia. Preview permanece de solo lectura y no se vincula otro
repositorio para esta entrega. La aceptación administrativa del chat continúa
independiente y requiere la sesión GitHub real del propietario.
