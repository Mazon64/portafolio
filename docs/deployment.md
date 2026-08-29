# Despliegue Del Portafolio

## Topología

El portafolio público utilizará `https://davidaranda.dev`. Los demás proyectos podrán usar subdominios como `proyecto.davidaranda.dev`, evitando acoplar sus rutas, assets y APIs a un único despliegue.

```text
Internet
  -> Cloudflare DNS y proxy
  -> Render Web Service
  -> ghcr.io/mazon64/portafolio:latest
  -> Supabase PostgreSQL
```

El formulario de contacto permanece deshabilitado mientras no se defina si los mensajes se enviarán por correo o se almacenarán en la aplicación. No se deben configurar las variables de Resend hasta tomar esa decisión.

## 1. Imagen En GHCR

Cada push a `main` verifica la aplicación y publica dos etiquetas:

- `ghcr.io/mazon64/portafolio:latest`
- `ghcr.io/mazon64/portafolio:sha-<commit>`

El primer push crea automáticamente el paquete en GitHub Packages. Para que Render lo consuma sin credenciales, abre el paquete `portafolio`, entra a **Package settings**, selecciona **Change visibility** y cámbialo a público. Si se mantiene privado, Render necesitará una credencial de registro con permiso `read:packages`.

## 2. Web Service En Render

El Blueprint `render.yaml` versiona la configuración del servicio. Después de hacer pública la imagen de GHCR, abre:

[Crear servicio desde el Blueprint de Render](https://render.com/deploy?repo=https://github.com/Mazon64/portafolio)

Render solicitará únicamente el valor secreto de `DATABASE_URL`. El Blueprint configura la imagen, el plan gratuito, la región de Oregon, el health check, el dominio y las variables públicas.

Si prefieres crear el servicio manualmente:

1. Crea un **New Web Service** desde una imagen existente.
2. Usa `ghcr.io/mazon64/portafolio:latest` como imagen.
3. Selecciona la región de Oregon, cercana a la base de datos actual de Supabase.
4. Configura `/api/health/live` como health check.
5. Define las variables de runtime:

| Variable | Valor |
| --- | --- |
| `SITE_URL` | `https://davidaranda.dev` |
| `HOSTNAME` | `0.0.0.0` |
| `DATABASE_URL` | Transaction Pooler de Supabase, puerto `6543` |

Render proporciona `PORT`; no debe fijarse manualmente. No configures todavía `RESEND_API_KEY`, `CONTACT_FROM_EMAIL` ni `CONTACT_TO_EMAIL`.

Después del primer despliegue, crea un **Deploy Hook** del servicio.

## 3. Entrega Desde GitHub

En **Settings > Secrets and variables > Actions** configura:

| Nombre | Tipo | Valor |
| --- | --- | --- |
| `SITE_URL` | Variable | `https://davidaranda.dev` |
| `DIRECT_URL` | Secret | Session Pooler de Supabase, puerto `5432` |
| `RENDER_DEPLOY_HOOK_URL` | Secret | Deploy Hook generado por Render |

El workflow manual **Delivery** publica la imagen, aplica migraciones, solicita el despliegue y espera que `/api/health/ready` reporte el SHA publicado.

## 4. Dominio En Render Y Cloudflare

1. Añade `davidaranda.dev` como custom domain en Render.
2. Copia el destino DNS indicado por Render.
3. En Cloudflare crea el registro para el apex `@` usando ese destino. Cloudflare aplica CNAME flattening en el dominio raíz.
4. Mantén el proxy desactivado durante la validación inicial de Render.
5. Cuando Render confirme el dominio y TLS, activa el proxy de Cloudflare.
6. Añade `www.davidaranda.dev` y redirígelo permanentemente a `https://davidaranda.dev` si se desea soportar esa variante.

## 5. Verificación

Comprueba:

- `https://davidaranda.dev/es`
- `https://davidaranda.dev/en`
- `https://davidaranda.dev/api/health/live`
- `https://davidaranda.dev/api/health/ready`

Readiness debe devolver `status: ready` y la versión debe coincidir con el SHA desplegado.
