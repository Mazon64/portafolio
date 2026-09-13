# Proyectos Automáticos

## Contrato

Vincular un repositorio público basta para iniciar descubrimiento, generación ES/EN,
análisis de imágenes, indexación y publicación. No se rellenan fichas, tecnologías,
descripciones de imágenes o hitos en el CMS y no se aprueba cada actualización.
El CMS administra la conexión, pausa, estado, reintentos y eliminación del proyecto.
Los documentos profesionales (CV, ATS y cartas) conservan su flujo independiente.

## Descubrimiento De Fuentes

- GitHub aporta ID estable, nombre, descripción, rama predeterminada, homepage,
  lenguajes y estado archivado. El slug se asigna una sola vez para conservar identidad.
- Se detectan README y documentación de `docs/`, con prioridad para arquitectura,
  SRS, API y la guía de integración. No se exige seleccionar rutas manualmente.
- Manifiestos como `package.json`, `pyproject.toml`, `go.mod`, `Cargo.toml`,
  `requirements.txt`, `pom.xml` y `composer.json` aportan tecnologías declaradas.
  Dockerfile y vercel.json aportan sus plataformas. Nunca se ejecuta código del repo.
- Un árbol truncado o excesivo se rechaza. Se excluyen rutas ocultas, traversal,
  symlinks y árboles de dependencias. Los blobs se leen por SHA, no por una rama móvil.
- La selección está limitada a doce Markdown, ocho manifiestos y 64 fragmentos;
  reserva espacio para metadatos, hitos e imágenes dentro de 120 KB de texto.
  Archivos opcionales que exceden el presupuesto no se importan parcialmente.

## Imágenes Por Propósito

```text
docs/portfolio/images/
├── interface/   # Pantallas, navegación y composición de la interfaz.
├── features/    # Uso y resultados de una funcionalidad; admite subcarpetas.
├── diagrams/    # Arquitectura, flujos y modelos de datos.
└── results/     # Informes, salidas y evidencia visual de resultados.
```

Se descubren hasta ocho PNG/JPEG/WebP de hasta 4 MB. `cover.*` o `portada.*` tienen
prioridad; después se priorizan interfaz, funcionalidades, resultados y diagramas.
La organización no depende del tamaño de pantalla. Los SVG de plantilla y el
diagrama antiguo de `public/project-media` quedan fuera de esta selección.
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

La fuente prioritaria es `docs/portfolio/milestones.json`: ID, título ES/EN, peso,
completado y ruta de evidencia dentro del mismo commit. Se verifica que esa ruta
exista y no sea un symlink. El modelo puede traducir títulos, pero no añadir objetivos,
cambiar pesos o inventar finalizaciones.

Sin ese archivo se importan Milestones de GitHub con pesos iguales y su estado
abierto/cerrado. Sin objetivos medibles se oculta el porcentaje. Con ellos se calcula
`round(peso completado / peso total * 100)`. El estado se deriva: archivado en GitHub
→ `ARCHIVED`; todos los hitos completos → `COMPLETED`; otros casos → `IN_PROGRESS`.
El porcentaje corresponde al alcance documentado, no al número de commits ni a
una estimación del esfuerzo total. El piloto define ocho metas en el repositorio,
con evidencias y el estado que corresponde a su verificación.

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
`push` de la rama predeterminada, `repository`, `milestone`, `release` e `issues`
relacionadas con hitos. Solo acepta repositorios vinculados y públicos; no consume
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

La card es un disparador de diálogo, no un desplegable inline. El modal incluye
detalle estructurado, galería filtrable por tipo, tecnologías, enlaces, hitos,
fuentes y preguntas RAG. Base UI gestiona foco, Escape y retorno a la card. En
móvil ocupa la pantalla; el cierre permanece visible al desplazar el contenido.
Las animaciones respetan movimiento reducido.

Los embeddings siguen usando `gemini-embedding-001` a 768 dimensiones normalizadas.
RAG consulta únicamente un corpus publicado de un proyecto visible/habilitado,
cita sus fuentes o se abstiene. Revalida visibilidad antes de responder. Mantiene
las cuotas de tres preguntas por cliente/minuto, treinta globales/minuto y doscientas
globales/día, sin almacenar conversaciones ni contexto privado de documentos.

## Operación

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
