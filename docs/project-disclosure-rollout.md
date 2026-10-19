# Entrega De Divulgación Y Acciones Del Chat

## Orden Obligatorio

1. Promover **solo** `20261003100000_project_disclosure/migration.sql` mediante
   `develop` y Preview revisado. Aplicar con **Database Migrations** desde `main`,
   con aprobación del environment protegido `production`.
2. Verificar la creación de las cuatro tablas y de `publicationVersion` en
   `ChatTurn` y `DocumentArtifact`. RLS debe estar activo; `anon` y `authenticated`
   no deben tener privilegios. La migración es expand-only y no altera datos actuales.
3. Integrar y revisar la aplicación en `develop` después de aplicar la migración.
   El nuevo cliente Prisma usa las columnas añadidas incluso en consultas que
   seleccionan todos los campos: **no desplegar esta aplicación antes del DDL**.
4. Configurar `PROJECT_GOVERNANCE_ENABLED=true` en Production y Preview. Mantener
   `CMS_WRITES_ENABLED=false`, integración, contacto e IA deshabilitados en Preview.
5. Revisar casos completos, selectivos, anónimos, internos y excluidos en Preview;
   aprobar manualmente antes de promover el código a Production.
6. Configurar conectores exclusivamente en Production, verificarlos con un
   repositorio autorizado y confirmar las revocaciones. No se añade automáticamente
   ningún repositorio nuevo durante la entrega.

Una vez guardadas políticas, **no desactivar `PROJECT_GOVERNANCE_ENABLED` ni volver
a una versión anterior que no aplique políticas**. Para detener procesamiento,
deshabilitar los flags de integración/IA; para retirar datos, usar INTERNAL/EXCLUDED.
La proyección se lee sin caché cuando la gobernanza está activa.

## GitHub App

Crear una App distinta del OAuth del CMS. Instalarla en la cuenta personal y en las
organizaciones necesarias, eligiendo los repositorios. Permisos de solo lectura:
Metadata, Contents, Issues y Pull requests. Una instalación aprobada solo con
Metadata y Contents sigue funcionando: se leen documentación y código, y se omiten
issues, releases y contribuciones hasta aceptar los permisos nuevos en GitHub.

Variables: `GITHUB_APP_ID`, `GITHUB_APP_PRIVATE_KEY` (PEM, acepta `\\n`),
`GITHUB_APP_WEBHOOK_SECRET` y, opcional, `GITHUB_APP_SLUG` para el enlace de
instalación del CMS. Webhook: `https://davidaranda.dev/api/webhooks/github-app`,
eventos `installation`, `installation_repositories`, `push`, `repository`, `issues`,
`milestone` y `release`. Los pushes se agrupan por commit, por lo que el webhook de
repositorio y el de la App pueden coexistir sin sincronizar dos veces.

El servidor firma JWT RS256 de menos de diez minutos y solicita tokens de instalación
limitados a un repositorio. Ningún token se guarda en PostgreSQL ni llega al cliente.
La instalación se resuelve por el ID estable del repositorio; el nombre es solo una
pista, de modo que un renombrado o transferencia no rompe la vinculación. Un fallo de
la App distinto de "no instalada" reintenta la sincronización en lugar de retirar.

### Vinculación Unificada

El CMS lista los repositorios con la App instalada y, con `PROJECT_GITHUB_TOKEN`,
los propios, los de organizaciones y aquellos en los que el propietario contribuyó
(commits, PRs, issues y revisiones). Los privados sin la App instalada se muestran
como pendientes de instalación. Se vincula por ID estable, nombre o URL.

Un repositorio privado necesita una decisión explícita al vincularlo:

- **Interno (predeterminado):** política `INTERNAL` sin procesamiento de IA.
- **Publicar descripción derivada:** `privateSources: PUBLISH_DERIVED` exige modo
  `FULL`, `externalAi: PRIVATE_SELECTED` y oculta repositorio, fuentes e imágenes.
  La ficha, los hitos (sin citas) y los hechos para chat y CV se publican; el código,
  las rutas, los enlaces y las imágenes del repositorio no. El chat no indexa sus
  fragmentos.

Sin esa política, un repositorio que pasa a privado se retira como antes. La
vinculación nunca amplía una política ya guardada.

### Fuentes Internas Seleccionadas

La evidencia se guarda en `ProjectEvidence`, nunca en `ProjectKnowledgeChunk`.
PRIVATE_SELECTED permite producir propuestas internas mediante Gemini; NONE y
PUBLIC_ONLY nunca envían archivos internos al proveedor. Las propuestas internas
se muestran en administración y no se publican automáticamente. La política contiene
los hechos autorizados ES/EN usados por ficha, chat y documentos.

La reconciliación importa como máximo una fuente interna pendiente por ejecución,
con intervalo diario, lease de cinco minutos y espera de quince minutos tras fallo.
La publicación comprueba de nuevo permisos/configuración dentro de una transacción
serializable. La retirada de una instalación o de un repositorio pausa sus fuentes
y pone la ficha afectada en INTERNAL hasta revisar su autorización.

## Imágenes Y Logos

Crear un bucket **privado** de Supabase Storage. No crear políticas de lectura
pública. Configurar únicamente en Production:

- `PROJECT_MEDIA_STORAGE_URL`: origen HTTPS del proyecto Supabase.
- `PROJECT_MEDIA_STORAGE_KEY`: credencial server-only con acceso al bucket.
- `PROJECT_MEDIA_STORAGE_BUCKET`: nombre del bucket.

El CMS acepta PNG/JPEG/WebP hasta 3 MB, limita píxeles, normaliza con Sharp a WebP y
elimina EXIF, metadatos y nombres originales. Los binarios permanecen en Storage;
PostgreSQL solo guarda identidad, relación y dimensiones. Subir no publica: incluir
el Media ID en las imágenes autorizadas de la política. Para un logo, usar
`/api/project-media/<Media ID>` en la organización correspondiente.

El gateway público comprueba política, proyecto, embargo y autorización del recurso
en cada petición, repite la revisión después de leer Storage y responde `no-store`.
Estas imágenes no pasan por la caché del optimizador Next. Las fichas anónimas no
publican logos ni capturas identificables. Preview no recibe credenciales de escritura
de Storage; las pruebas con binarios reales se realizan tras la promoción aprobada.

## Cambio De Permisos

Cada guardado cambia una revisión UUID y usa control optimista. Invalida trabajos
anteriores, archiva documentos derivados y corta generaciones de chat pendientes.
No se borran conversaciones ajenas: los historiales públicos se filtran por la
revisión global de publicación; la auditoría administrativa conserva la retención
normal. Un mensaje previo no puede reintroducir datos retirados en otro prompt.
Las respuestas, documentos y trabajos vuelven a comprobar la revisión al guardar.

La invalidación documental es conservadora: afecta todos los documentos generados,
porque un resumen puede incorporar hechos de proyectos fuera de su sección de
proyectos. Deben regenerarse tras cambiar una política. Los archivos previamente
descargados no pueden revocarse fuera del servicio.

## Inventario De Funciones Públicas Del Chat

| Función | Resultado |
| --- | --- |
| `get_public_profile` | Perfil, experiencia, educación y habilidades |
| `get_social_links` | Redes y correo público; URLs resueltas por el servidor |
| `get_cv` | Leer CV o abrir impresión/guardar PDF del navegador |
| `find_projects`, `get_project` | Buscar y abrir ficha, repositorio o demo autorizados |
| `get_project_media` | Capturas y diagramas autorizados |
| `search_project_sources` | Evidencia pública filtrada por política, con referencias |
| `prepare_contact` | Formulario editable dentro del chat con datos de la conversación |
| `navigate_portfolio` | Navegar a cualquier sección pública |
| `change_language`, `change_theme` | Idioma y apariencia |
| `manage_chat` | Nueva conversación, cierre e historial anterior |
| `get_site_info` | Explicar capacidades, contexto y retención |

Las acciones no aceptan JavaScript, SQL, rutas administrativas ni URLs propuestas
por el modelo. El contacto utiliza el mismo endpoint, Turnstile, límites, correo y
clave idempotente Resend que el formulario principal. Preparar el formulario no
equivale a enviar; el componente informa del resultado real. Las acciones se activan
mediante controles accesibles en el chat. El CV usa la misma composición imprimible;
no se afirma una descarga antes de que el navegador la realice.

## Verificación Antes De Activar

- Tests, lint, build y `git diff --check`.
- Migración aplicada por el workflow protegido; nunca desde Preview/local.
- GitHub App real, eliminación/suspensión y cambio de visibilidad.
- Bucket privado, subida, autorización y retirada inmediata del gateway.
- Formularios de contacto desde ambas interfaces con Turnstile y Resend reales.
- CV y chat sin referencias privadas; pruebas con marcadores confidenciales en
  fuentes internas y con cambios concurrentes de política.
- Prueba visual ES/EN, móvil, teclado, tema, idioma y acciones combinadas.

La instalación de la App, el bucket y sus credenciales requieren configuración del
propietario. Las pruebas automatizadas no certifican esa configuración externa.
