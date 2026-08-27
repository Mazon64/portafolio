# Especificación de APIs
## Proyecto: Portafolio
**Versión:** 1.1.0

---

## 1. Webhook de Telemetría (GitHub)

Este endpoint funciona como puente asíncrono entre mis repositorios de GitHub y el sistema RAG. Recibe eventos del ciclo de vida del desarrollo, delega su procesamiento y actualiza la base de datos vectorial para que el chatbot disponga de contexto reciente.

### 1.1 `POST /api/webhooks/github`

**Descripción:** Recibe payloads JSON de GitHub para eventos configurados, como push, pull request e issues.

**Headers requeridos:**
*   `Content-Type: application/json`
*   `X-GitHub-Event: <tipo_de_evento>` (por ejemplo, `push` o `pull_request`)
*   `X-Hub-Signature-256: sha256=<hash_hmac>` (debe validarse antes de aceptar el evento)

**Cuerpo de la petición (ejemplo resumido de un evento `push`):**
```json
{
  "ref": "refs/heads/main",
  "repository": {
    "name": "sistema-tickets-ia",
    "full_name": "tu_usuario/sistema-tickets-ia"
  },
  "commits": [
    {
      "id": "1a2b3c4d",
      "message": "feat(auth): integrar pasarela de pagos con Stripe",
      "author": {
        "username": "tu_usuario"
      },
      "added": ["src/payments/stripe.ts"],
      "modified": ["src/app.module.ts"]
    }
  ]
}
