# Despliegue Del Portafolio

## Topología

El portafolio público utiliza `https://davidaranda.dev`. Los demás proyectos pueden usar subdominios como `proyecto.davidaranda.dev` sin compartir rutas, assets ni APIs con este despliegue.

```text
Internet
  -> Cloudflare DNS
  -> Vercel (Next.js y Vercel Functions)
  -> Supabase PostgreSQL
```

Vercel es el destino principal del frontend y despliega directamente desde GitHub. Docker y GHCR se mantienen como una ruta independiente para VPS, NAS u otro proveedor de contenedores.

El formulario de contacto entrega una notificación a Gmail mediante Resend, está protegido por Cloudflare Turnstile y no persiste mensajes en PostgreSQL.

## 1. Proyecto En Vercel

1. Importa el repositorio `Mazon64/portafolio` desde el panel de Vercel.
2. Conserva `main` como Production Branch y el directorio raíz predeterminado.
3. Usa el preset de Next.js y deja los comandos de instalación y build en sus valores automáticos.
4. Activa **Automatically expose System Environment Variables**. La ruta de readiness usa `VERCEL_GIT_COMMIT_SHA` para identificar la versión desplegada.
5. Confirma que Production usa Node.js 24. `package.json` también fija `24.x`.

`vercel.json` mantiene las funciones en `sfo1`, cerca de la base de datos de Supabase en Oregon. `next.config.ts` genera `output: "standalone"` fuera de Vercel para Docker y lo desactiva en Vercel, donde el adaptador nativo genera su propia salida.

## 2. Variables De Vercel

Configura estas variables en **Settings > Environment Variables**:

| Variable | Entornos | Valor |
| --- | --- | --- |
| `SITE_URL` | Production y Preview | `https://davidaranda.dev` |
| `DATABASE_URL` | Production y Preview | Transaction Pooler de Supabase, puerto `6543` |
| `RESEND_API_KEY` | Production | API key de Resend con permiso de envío |
| `CONTACT_FROM_EMAIL` | Production | `Portafolio <contact@mail.davidaranda.dev>` |
| `CONTACT_TO_EMAIL` | Production | `contacto@davidaranda.dev` |
| `TURNSTILE_SITE_KEY` | Production | Site key del widget de Turnstile |
| `TURNSTILE_SECRET_KEY` | Production | Secret key del widget de Turnstile |

No configures `DIRECT_URL` en Vercel. `postinstall` genera Prisma con una URL ficticia que no establece ninguna conexión. Las migraciones se ejecutan exclusivamente desde GitHub Actions con el pooler de sesión.

Mientras el portafolio sea de solo lectura, Preview puede consultar la misma base mediante `DATABASE_URL`. Antes de habilitar CMS, escrituras o seeds desde previews, se debe crear una base o un rol aislado para ese entorno.

Las integraciones de contacto se limitan a Production para que los previews no envíen mensajes ni requieran registrar hostnames efímeros en Turnstile. Cuando falte cualquier variable, `/api/contact` no expone la site key y el formulario permanece deshabilitado.

### Correo Y Protección Del Formulario

1. En Resend agrega `mail.davidaranda.dev` como dominio de envío y copia exactamente sus registros DNS a Cloudflare.
2. Espera a que Resend confirme SPF y DKIM antes de utilizar `contact@mail.davidaranda.dev`.
3. En Cloudflare Turnstile crea un widget Managed limitado a `davidaranda.dev`.
4. Configura en Vercel las cinco variables de Production indicadas arriba y vuelve a desplegar.
5. Envía una prueba desde cada idioma y confirma que llega a `contacto@davidaranda.dev` y que **Responder** apunta al correo del visitante.

Para desarrollo local se pueden usar las claves de prueba que Cloudflare documenta como **always passes**:

```env
TURNSTILE_SITE_KEY=1x00000000000000000000AA
TURNSTILE_SECRET_KEY=1x0000000000000000000000000000000AA
```

La site key se entrega al cliente desde `GET /api/contact` en runtime para conservar la portabilidad de la imagen Docker. La secret key y las credenciales de Resend permanecen exclusivamente en el Route Handler. El endpoint verifica además la acción `contact`, el hostname, el origen, el tamaño, el honeypot y el límite básico por IP antes de solicitar la entrega.

## 3. Migraciones

En GitHub crea un environment llamado `production` y define dentro de el:

| Nombre | Tipo | Valor |
| --- | --- | --- |
| `DIRECT_URL` | Secret | Session Pooler de Supabase, puerto `5432` |

El workflow manual **Database Migrations** ejecuta `prisma migrate deploy` y comprueba el estado final. Si el environment tiene revisores requeridos, GitHub solicitará aprobación antes de acceder al secreto.

Vercel nunca aplica migraciones durante el build. Para un cambio de esquema:

1. Crea y verifica una migración compatible con la versión publicada.
2. Ejecuta **Database Migrations** desde la rama o commit que contiene esa migración.
3. Fusiona el código que empieza a depender del nuevo esquema.
4. Realiza eliminaciones incompatibles en un cambio posterior, después de retirar todos sus usos.

## 4. Calidad E Imagen Docker

El workflow **Quality and Container** ejecuta pruebas, lint y build en pull requests y pushes a `main`. Después de verificar un push a `main`, publica:

- `ghcr.io/mazon64/portafolio:latest`
- `ghcr.io/mazon64/portafolio:sha-<commit>`

También se puede ejecutar manualmente para volver a publicar la imagen de un commit. Vercel no consume esta imagen.

Para probar la ruta portable localmente, crea `.env.docker` desde `.env.docker.example` y ejecuta:

```bash
docker compose --env-file .env.docker up --build
```

La imagen standalone conserva `/api/health/live` como health check y recibe `DATABASE_URL` solamente durante su ejecución.

## 5. Dominio Y Cloudflare

Realiza el corte solo después de verificar el deployment temporal `*.vercel.app`:

1. En Vercel, abre **Settings > Domains** y agrega `davidaranda.dev`.
2. Agrega también `www.davidaranda.dev` y configúralo para redirigir al dominio apex si se desea soportar esa variante.
3. Copia exactamente los registros que Vercel indique para ambos dominios.
4. En Cloudflare reemplaza el registro que apunta a Render por el destino de Vercel.
5. Mantén esos registros en modo **DNS only** para evitar un doble proxy delante del CDN de Vercel.
6. Espera a que Vercel confirme DNS y TLS antes de retirar el servicio anterior.

Cloudflare puede continuar administrando la zona y los demás subdominios. No es necesario cambiar sus nameservers a Vercel.

## 6. Verificación Y Retiro De Render

Comprueba en el dominio temporal y después en el dominio final:

- `/es`
- `/en`
- `/api/health/live`, que debe devolver `204`
- `/api/health/ready`, que debe devolver `status: ready` y el SHA desplegado
- Canonical, alternates, assets, tema y navegación móvil

Conserva Render activo durante el corte para poder restaurar el registro DNS si aparece un problema. Cuando el dominio final funcione de forma estable:

1. Elimina el Web Service de Render.
2. Elimina el secreto de GitHub `RENDER_DEPLOY_HOOK_URL` si todavía existe.
3. Conserva `DIRECT_URL` dentro del environment protegido `production`.
