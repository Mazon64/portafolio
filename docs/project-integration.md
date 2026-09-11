# Integración De Proyectos

## Alcance

La integración reúne ficha visual, GitHub, narrativa ES/EN revisable, hitos y RAG.
El piloto es el repositorio público `Mazon64/portafolio`, rama `main`. El código
requiere la migración `20260909220000_project_integration` y activación explícita.
La presencia del código no significa que el webhook, los secretos o el piloto ya
estén configurados en Production.

## Datos Y Publicación

- `Project` / `ProjectTranslation`: contenido editorial público existente.
- `ProjectIntegration`: ID estable de repositorio, rama, rutas Markdown permitidas,
  imágenes, hitos, habilitación y timestamp de concurrencia.
- `ProjectSyncJob`: entrega deduplicada, estado, intentos, próxima ejecución y lease.
- `ProjectKnowledge`: un borrador reemplazable y un corpus publicado por proyecto.
- `ProjectKnowledgeChunk`: texto, SHA-256 de fragmento, URL fijada al commit y vector.
- `ProjectQueryQuota`: contadores temporales de consumo, sin preguntas ni respuestas.

El CMS enlaza cada proyecto con `/admin/[lang]/projects/[id]`. La configuración
se guarda con un timestamp observado; otro guardado concurrente produce conflicto.
Las imágenes e hitos de un proyecto visible son contenido editorial: guardar su
configuración los actualiza e invalida la caché. Cambiar la configuración descarta
el borrador generado que ya no corresponde a ella.

Una sincronización prepara el borrador y sus embeddings juntos; no publica ni
sobrescribe la ficha visible. El editor presenta las fuentes fijadas al commit y
los campos de resumen, problema, solución, arquitectura, decisiones y resultados
en ambos idiomas. **Publicar ficha y fuentes** actualiza las dos traducciones,
hace visible el proyecto y reemplaza atómicamente el corpus público anterior.
La publicación rechaza un proyecto o una configuración que cambió desde la
generación. No hay contadores de versiones ni un historial permanente de corpus.

## Imágenes E Hitos

Hasta ocho imágenes ordenadas, con texto alternativo y descripción ES/EN. Se admiten
recursos locales de `/project-media/` y PNG/JPEG/WebP de `raw.githubusercontent.com`
fijados a un SHA completo de commit. `next/image` optimiza imágenes remotas desde
el host permitido. No se añade un proveedor de almacenamiento ni se aceptan URLs
arbitrarias. El piloto incluye un diagrama SVG original identificado como diagrama,
no una captura de pantalla.

Hasta veinte hitos con identificador, título ES/EN, peso 1–100, completado y enlace
opcional de evidencia. El porcentaje es `round(peso completado / peso total * 100)`.
Con hitos, ese resultado se conserva también al guardar desde el formulario básico
del proyecto; sin ellos se utiliza el porcentaje manual. Los commits no modifican
porcentajes ni declaran completado un hito. El estado editorial del proyecto sigue
siendo manual. El registro `lastTelemetryAt` representa una sincronización exitosa.

## Recepción Y Procesamiento

`POST /api/webhooks/github` acepta `push` de la rama configurada. Verifica
`X-Hub-Signature-256` sobre bytes originales, un límite de 1 MB y el ID de repositorio
autorizado. `ping` firmado responde `pong`; otros eventos, ramas, eliminaciones de
rama y repositorios privados se ignoran. El login OAuth del CMS no se reutiliza para
leer repositorios. Esta primera integración importa únicamente repositorios públicos.

La entrega se persiste antes de responder `202`. `after()` inicia un intento de
procesamiento después de la respuesta; la durabilidad reside en PostgreSQL, no en
la continuación serverless. Cada proyecto admite hasta veinte trabajos activos.
El ID de entrega es único mientras se conserva el trabajo; los trabajos exitosos
o sustituidos se limpian después de treinta días.

Un worker obtiene un lease de diez minutos con adquisición condicional, hasta cinco
intentos y backoff de `60s * 2^intentos`. Solo el dueño de un lease vigente puede
guardar el resultado. Los procesos caídos son recuperables cuando expira el lease;
las entregas fuera de orden y las configuraciones obsoletas se marcan `SUPERSEDED`.
La fuente y la rama se comprueban antes y después de las llamadas externas. El CMS
permite sincronización manual, procesamiento pendiente y reintento de fallos.

El cron protegido `GET /api/cron/project-sync` limpia cuotas/trabajos antiguos y
procesa un trabajo elegible. Vercel incluye una ejecución diaria a las 06:00 UTC,
compatible con el plan básico. La vía normal inmediata es `after()`; ante un fallo
el siguiente evento, el control manual o el cron recuperan el trabajo. Una cola
acumulada requiere invocaciones adicionales autenticadas; no se promete recuperación
en un minuto con el cron diario. Se puede invocar el mismo endpoint desde un scheduler
más frecuente sin cambiar el protocolo ni ejecutar migraciones.

## Fuentes, IA Y RAG

Las fuentes se leen mediante GitHub REST desde un commit inmutable: máximo doce
archivos Markdown, 120 KB totales y 64 fragmentos. No se recorre el repositorio ni
se siguen enlaces del contenido. Las rutas ocultas, traversal y formatos distintos
de Markdown se rechazan. Los fragmentos tienen hasta 2.400 caracteres con solapamiento
de 400. Se reutiliza el embedding cuando coinciden ruta, ordinal, hash y modelo.

La narrativa usa `GEMINI_MODEL` y también recibe las descripciones editoriales de
imágenes e hitos. Las instrucciones distinguen planes de implementación y tratan
repositorio/preguntas como datos no confiables. El contexto privado de CVs no entra
en esta integración. Los textos generados se validan y se revisan antes de publicar.

Los embeddings usan `gemini-embedding-001`, `outputDimensionality=768`, tareas
`RETRIEVAL_DOCUMENT` / `RETRIEVAL_QUERY` y normalización. El esquema usa
`extensions.vector(768)`, consistente con la extensión ya habilitada en Supabase.
Cambiar el modelo o dimensión exige reindexar; no basta con cambiar una variable.

`POST /api/projects/[slug]/ask` recibe `{ question, locale }` y busca hasta seis
fragmentos del corpus publicado del proyecto visible y habilitado. La búsqueda es
exacta por distancia coseno, con umbral 0,65. Para este volumen pequeño no se usa
un índice aproximado. El umbral deberá calibrarse con las preguntas del piloto.

La respuesta incluye enlaces a fuentes y se abstiene si no encuentra evidencia
o si el modelo propone identificadores de cita inexistentes. Antes de responder
se vuelve a comprobar que el corpus siga publicado y el proyecto visible. Los
embeddings y extractos internos no se entregan como parte del JSON público.
Las consultas actuales cubren las fuentes Markdown publicadas; las descripciones
de imágenes e hitos orientan la narrativa, pero no son fragmentos RAG independientes.

Las preguntas no se persisten. Hay cuotas atómicas de tres peticiones por cliente
y minuto, treinta globales por minuto y doscientas globales por día. El identificador
se protege con HMAC y `AUTH_SECRET`; solo se guarda el contador temporal. En hosting
propio el proxy debe sobrescribir `X-Forwarded-For`. El historial de conversaciones,
MongoDB y un chatbot global siguen fuera de este módulo por proyecto.

## Activación Del Piloto

1. Promover **solo la migración expand** por `feature/* → develop → main`, revisar
   Preview y aplicarla por el workflow protegido de Production. Verificar el rol
   de aplicación y `extensions.vector` antes de promover el código dependiente.
2. Desplegar la aplicación después de la migración. Mantener ambos flags nuevos
   en `false` en Preview. Las rutas de escritura y proveedores bloquean Preview
   aunque sus flags se activen accidentalmente.
3. Configurar en Production `PROJECT_INTEGRATION_ENABLED=true`, las claves Gemini
   ya utilizadas, `GITHUB_WEBHOOK_SECRET` y `CRON_SECRET`. `PROJECT_GITHUB_TOKEN`
   es opcional; si se usa, limitarlo a lectura de contenido/metadatos del repositorio
   público elegido. Crear un nuevo deployment para aplicar las variables.
4. En Proyectos, pulsar **Preparar este portafolio como piloto**. El inicializador
   crea una ficha oculta con diagrama e hitos verificables; no sobrescribe una ficha
   existente. Revisar/guardar la configuración y las rutas permitidas.
5. Crear el webhook del repositorio hacia
   `https://davidaranda.dev/api/webhooks/github`, tipo JSON, secreto coincidente,
   eventos `push`. Verificar el `ping`, la sincronización inicial y una redelivery.
6. Sincronizar, consultar el estado, revisar el texto y sus enlaces y publicar.
   Completar los hitos de sincronización/RAG únicamente después de verificarlos.
7. Habilitar `PROJECT_RAG_ENABLED=true` en Production y redeploy. Probar preguntas
   de arquitectura, decisiones, trabajo pendiente y una pregunta sin evidencia.
   Confirmar citas al commit y abstención. No habilitar cuotas ni Gemini en Preview.

## Verificación

Las pruebas cubren firmas, Preview, duplicados, rutas de fuentes, cuotas/esquema,
leases, fallos de proveedor, citas y visibilidad. PGlite con pgvector aplica la
migración real sobre una base aislada y ejecuta el SQL real de recuperación para
probar exclusión de borradores/proyectos ocultos, dimensiones y borrados en cascada.
Eso no sustituye la validación final de credenciales, webhook y respuestas Gemini
contra Production. El build no llama a esos servicios ni aplica migraciones.
