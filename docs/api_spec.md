# Especificación De APIs
## Proyecto: Portafolio
**Versión:** 1.3.0

---

## 1. Contacto

### 1.1 `GET /api/contact`

Entrega al navegador únicamente la configuración pública necesaria para presentar Turnstile.

```json
{
  "turnstileSiteKey": "site-key-o-null"
}
```

La respuesta usa `Cache-Control: no-store`. Cuando `CONTACT_DELIVERY_ENABLED` no vale exactamente `true` o falta cualquier credencial requerida, devuelve `null` y no expone información parcial.

### 1.2 `POST /api/contact`

Recibe un mensaje público, valida origen, tamaño, honeypot, formato, límite básico por IP y Turnstile, y entrega una notificación mediante Resend. No persiste el mensaje en PostgreSQL.

```json
{
  "name": "Ada Lovelace",
  "email": "ada@example.com",
  "message": "Me gustaría conversar sobre un proyecto.",
  "website": "",
  "turnstileToken": "token",
  "locale": "es"
}
```

| Código | Estado | Significado |
| --- | --- | --- |
| `202` | `accepted` | Mensaje aceptado o honeypot descartado silenciosamente. |
| `400` | `invalid` / `verification_failed` | Payload o desafío inválido. |
| `403` | `forbidden` | El origen no coincide. |
| `413` | `invalid` | El cuerpo excede el límite. |
| `429` | `rate_limited` | La IP envió otro mensaje dentro de la ventana básica. |
| `502` | `delivery_failed` | Resend no confirmó la entrega. |
| `503` | `unavailable` | La entrega está deshabilitada o incompleta. |

## 2. Autenticación Administrativa

### 2.1 `/api/auth/[...nextauth]`

NextAuth.js administra los endpoints internos de OAuth, callback, CSRF, sesión y cierre de sesión. El único proveedor permitido es GitHub. No se define un contrato público adicional sobre las respuestas internas de la librería.

La admisión exige que el `profile.id` numérico coincida con `ADMIN_GITHUB_ID`. La sesión JWT conserva ese ID y el DAL vuelve a compararlo con la configuración vigente en cada acceso. El CMS no acepta tokens bearer propios ni autenticación por correo o login de GitHub.

Los callbacks registrados en GitHub son:

```text
http://localhost:3000/api/auth/callback/github
https://preview.davidaranda.dev/api/auth/callback/github
https://davidaranda.dev/api/auth/callback/github
```

Cada origen utiliza una aplicación OAuth independiente.

## 3. Mutaciones Del CMS

Las mutaciones administrativas se implementan como Server Actions y no como una API pública versionada. Deben tratarse como endpoints expuestos: vuelven a autorizar la sesión, verifican `CMS_WRITES_ENABLED`, rechazan siempre `VERCEL_ENV=preview`, validan con Zod y escriben mediante transacciones Prisma.

El CMS ofrece CRUD de perfil, experiencia, educación, categorías de habilidades, habilidades y proyectos. Cada escritura localizable de estas entidades conserva `ES` y `EN` dentro de la misma transacción. Sus formularios envían `updatedAt` como versión optimista y reciben `conflict` si el registro cambió desde su lectura; las categorías también cambian de versión cuando se crea, mueve, edita o elimina una habilidad hija. Las URLs públicas de proyectos solo aceptan los protocolos HTTP y HTTPS.

### 3.1 Documentos Profesionales

Los documentos no ofrecen CRUD de contenido persistido. La generación crea un borrador efímero que el administrador puede editar o descartar antes del guardado explícito. La acción de guardado valida su firma y las fuentes vigentes, conserva el UUID idempotente y persiste un CV público en estado `DRAFT`, o una solicitud con CV ATS y carta privados. No existe una acción para editar el contenido de un artefacto ya guardado; para cambiarlo se prepara y guarda otro borrador. La generación y el guardado de esos borradores requieren además `DOCUMENT_GENERATION_ENABLED`.

El CMS permite consultar, filtrar, imprimir y eliminar los artefactos guardados. Publicar es una acción separada, exclusiva de un CV público en estado `DRAFT`, que archiva el CV publicado anterior del mismo idioma. El borrado exige confirmación y los valores observados `expectedStatus` y `expectedPublishedAt`; los comprueba dentro de una transacción serializable con reintentos acotados y devuelve `conflict` si cambiaron. Al eliminar el último artefacto de una solicitud también elimina la solicitud huérfana. Eliminar un CV publicado activa el fallback canónico del idioma.

El contexto privado se actualiza en su fila actual, sin crear nuevas revisiones, y los artefactos no asignan contadores internos. La migración contract final conserva únicamente el contexto actual, impone una sola fila y elimina la columna de contador. La migración expand precede al cambio de aplicación, y el contract se ejecuta después mediante el workflow protegido; el orden y las garantías de conservación están en [document-schema-transition.md](document-schema-transition.md).

### 3.2 Refresco, Caché Y Errores

El refresco administrativo mediante App Router conserva el estado cliente y consulta de nuevo los datos; `router.refresh()` no invalida por sí mismo la caché pública del servidor. Los alcances son distintos:

| Operación | Refresco administrativo | Etiqueta pública `portfolio` |
| --- | --- | --- |
| Mutación de fuentes públicas del CMS | Conserva la nueva versión optimista del registro. | Se invalida después del commit. |
| Guardado de contexto privado | Revalida ambos workspaces documentales y refresca la vista, incluidos los indicadores de fuentes desactualizadas. | No se invalida; no reemplaza automáticamente el CV publicado. |
| Generación y edición efímera | Actualiza el borrador cliente sin persistirlo. | No se invalida. |
| Guardado de borradores documentales | Vuelve al listado y lo refresca mediante App Router. | No se invalida; el guardado no publica. |
| Publicación de CV | Revalida ambas rutas documentales y sus detalles; refresca la vista actual. | Se invalida después del commit. |
| Borrado de artefacto | Revalida el workspace del idioma de interfaz y refresca la vista. | Solo se invalida si el artefacto eliminado era un CV público `PUBLISHED`. |

Un rechazo por validación, autorización, concurrencia o persistencia no invalida la caché. Si falla la revalidación administrativa o la invalidación pública después del commit, las acciones que las ejecutan devuelven `cache-error`: la escritura ya ocurrió y no debe presentarse como un fallo de persistencia ni repetirse para corregir la caché. Los formularios de fuentes conservan la nueva versión optimista. Contexto y publicación intentan refrescar también ante `cache-error`; el detalle mantiene montado el estado de publicación al pasar a publicado o archivado para conservar el mensaje, sin mostrar un botón de publicación inaplicable. Los borrados devuelven estados explícitos `deleted`, `disabled`, `conflict`, `cache-error` o `error`.

## 4. Integración De Proyectos

### 4.1 `POST /api/webhooks/github`

Recibe `push` de la rama predeterminada, cambios de repositorio, milestones, releases e issues asociadas a hitos de repositorios públicos vinculados por ID estable. Verifica HMAC sobre el cuerpo original (máximo 1 MB), deduplica y persiste antes de responder. `after()` inicia descubrimiento y publicación automática; el trabajo y su lease permiten recuperación independiente del request.

Headers:

```text
Content-Type: application/json
X-GitHub-Event: push
X-GitHub-Delivery: <uuid>
X-Hub-Signature-256: sha256=<hash_hmac>
```

El payload común usa `repository.id`, `repository.private` y `repository.default_branch`; `push` exige además `ref` y `after` y contempla `deleted`. Los eventos sin commit solicitan sincronizar el HEAD actual. Un `ping` firmado devuelve `200`; un evento aceptado, duplicado o ignorado devuelve `202`. Firma inválida: `403`; payload inválido: `400`; cuerpo excesivo: `413`; integración deshabilitada, cola llena o persistencia no disponible: `503`. No espera a Gemini para responder; el objetivo de recepción es menos de dos segundos, sujeto a la latencia de la base.

### 4.2 `GET /api/cron/project-sync`

Exige `Authorization: Bearer <CRON_SECRET>` y escrituras habilitadas. Limpia contadores/trabajos caducados, reconcilia conexiones y procesa hasta tres trabajos elegibles dentro de su presupuesto. Responde `401` sin autorización, `503` si está deshabilitado o no disponible, o `200` con `{ status: "processed", processed: <n> }` (`disabled` si faltan credenciales de IA). El cron diario y el workflow de recuperación de quince minutos usan este endpoint; el CMS conserva controles operativos opcionales.

### 4.3 `POST /api/projects/[slug]/ask`

Recibe `{ "question": "...", "locale": "es" }`, con preguntas de 5–600 caracteres y cuerpo máximo de 4 KB. Requiere mismo origen, `PROJECT_RAG_ENABLED`, proyecto visible, integración habilitada y corpus publicado. Recupera fuentes mediante pgvector y devuelve `{ answer, insufficient, sources: [{ id, path, url }] }`, sin guardar la conversación. Todas las respuestas son `no-store`.

Estados: `200` respuesta o abstención; `400` entrada inválida; `403` origen inválido; `404` corpus no disponible; `409` corpus retirado durante la petición; `429` cuota agotada; `503` integración/proveedor no disponible. Solo cita fuentes recuperadas del corpus publicado; ninguna consulta usa borradores, CVs o contexto privado.

### 4.4 Acciones Administrativas

`projectIntegrationAction` autoriza y verifica flags para vincular un repositorio (`connect`), guardar conexión/habilitación (`save`), encolar (`sync`), procesar o reintentar. No acepta imágenes, captions, hitos, textos generados ni operaciones manuales `publish`/`discard`. La conexión inicial genera una ficha oculta hasta su primera publicación válida. Guardar usa `updatedAt` observado; cambios concurrentes producen `conflict`.

El worker publica automáticamente nombres ES/EN, narrativa, imágenes analizadas, tecnologías, enlaces, estado, progreso y fuentes en una transacción protegida por lease y timestamps. Un fallo conserva la publicación anterior. Los fallos de encolado/refresco posteriores a un guardado ya confirmado se diferencian con `cache-error`; la reconciliación recupera el trabajo pendiente.

El contrato operativo, límites, modelo de embeddings y activación del piloto se describen en [project-integration.md](project-integration.md).
