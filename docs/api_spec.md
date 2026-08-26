# Especificación de APIs
## Proyecto: Portafolio
**Versión:** 1.0.0

---

## 1. Webhook de Telemetría (GitHub)

Este endpoint actúa como un puente asíncrono entre los repositorios de GitHub del ecosistema y el sistema RAG (Inteligencia Artificial). Recibe eventos del ciclo de vida del desarrollo, los procesa y actualiza la base de datos vectorial para que el Chatbot tenga contexto en tiempo real.

### 1.1 `POST /api/webhooks/github`

**Descripción:** Recibe payloads JSON de GitHub cuando ocurren eventos configurados (Push, Pull Request, Issues).

**Headers Requeridos:**
*   `Content-Type: application/json`
*   `X-GitHub-Event: <tipo_de_evento>` (Ej. `push`, `pull_request`)
*   `X-Hub-Signature-256: sha256=<hash_hmac>` (Obligatorio para seguridad)

**Cuerpo de la Petición (Ejemplo - Evento `push` resumido):**
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