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

## 4. Webhook De Telemetría (Planificado)

### 4.1 `POST /api/webhooks/github`

Este endpoint todavía no está implementado. Recibirá eventos seleccionados del ciclo de desarrollo, validará `X-Hub-Signature-256`, responderá antes del procesamiento semántico prolongado y actualizará el contexto vectorial de proyectos autorizados.

Headers previstos:

```text
Content-Type: application/json
X-GitHub-Event: push
X-Hub-Signature-256: sha256=<hash_hmac>
```

La especificación del payload y la política de eventos se cerrarán al comenzar el módulo de telemetría para no fijar anticipadamente un modelo de embeddings o una cola de procesamiento.
