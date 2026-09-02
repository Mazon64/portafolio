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

El CMS ofrece CRUD de perfil, experiencia, educación, categorías de habilidades, habilidades y proyectos. También crea versiones append-only de contexto, solicitudes y documentos profesionales. Cada escritura localizable conserva `ES` y `EN` dentro de la misma transacción. Los formularios existentes envían `updatedAt` como versión optimista y reciben `conflict` si el registro cambió desde su lectura; las categorías también cambian de versión cuando se crea, mueve, edita o elimina una habilidad hija.

Después de un commit exitoso se invalida la etiqueta `portfolio`; un error de validación, autorización, concurrencia o persistencia nunca invalida la caché. Si la invalidación falla después del commit, la acción devuelve `cache-error` y conserva la nueva versión. Los borrados devuelven estados explícitos `deleted`, `disabled`, `conflict`, `cache-error` o `error`. Las URLs públicas de proyectos solo aceptan los protocolos HTTP y HTTPS.

### 3.1 `GET /admin/{locale}/documents/{id}/download?format=pdf|docx`

Descarga un CV ATS o una carta ya persistidos. El handler vuelve a exigir autorización administrativa mediante el DAL, valida UUID y formato, reconstruye el archivo desde JSON validado y responde con `Cache-Control: private, no-store`, `nosniff` y `Content-Disposition: attachment`. Los artefactos públicos se consumen mediante la vista HTML del CV y no se exportan por este endpoint.

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
