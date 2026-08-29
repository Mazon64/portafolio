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

El formulario de contacto permanece deshabilitado mientras no se defina si los mensajes se enviarán por correo o se almacenarán en la aplicación. No se deben configurar las variables de Resend hasta tomar esa decisión.

## 1. Proyecto En Vercel

1. Importa el repositorio `Mazon64/portafolio` desde el panel de Vercel.
2. Conserva `main` como Production Branch y el directorio raíz predeterminado.
3. Usa el preset de Next.js y deja los comandos de instalación y build en sus valores automáticos.
4. Activa **Automatically expose System Environment Variables**. La ruta de readiness usa `VERCEL_GIT_COMMIT_SHA` para identificar la versión desplegada.
5. Confirma que Production usa Node.js 24. `package.json` también fija `24.x`.

`vercel.json` mantiene las funciones en `sfo1`, cerca de la base de datos de Supabase en Oregon. `next.config.ts` conserva `output: "standalone"` para Docker; Vercel procesa el proyecto con su integración nativa de Next.js.

## 2. Variables De Vercel

Configura estas variables en **Settings > Environment Variables**:

| Variable | Entornos | Valor |
| --- | --- | --- |
| `SITE_URL` | Production y Preview | `https://davidaranda.dev` |
| `DATABASE_URL` | Production y Preview | Transaction Pooler de Supabase, puerto `6543` |

No configures `DIRECT_URL` en Vercel. `postinstall` genera Prisma con una URL ficticia que no establece ninguna conexión. Las migraciones se ejecutan exclusivamente desde GitHub Actions con el pooler de sesión.

Mientras el portafolio sea de solo lectura, Preview puede consultar la misma base mediante `DATABASE_URL`. Antes de habilitar CMS, escrituras o seeds desde previews, se debe crear una base o un rol aislado para ese entorno.

No configures todavía `RESEND_API_KEY`, `CONTACT_FROM_EMAIL` ni `CONTACT_TO_EMAIL`.

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
