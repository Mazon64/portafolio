# Despliegue Del Portafolio

## Topología

El portafolio público utiliza `https://davidaranda.dev` y el último Preview de `develop` utiliza `https://preview.davidaranda.dev`. Los demás proyectos pueden usar subdominios como `proyecto.davidaranda.dev` sin compartir rutas, assets ni APIs con este despliegue.

```text
Internet
  -> Cloudflare DNS
  -> Vercel (Next.js y Vercel Functions)
  -> Supabase PostgreSQL
```

Vercel es el destino principal del frontend y despliega directamente desde GitHub. Docker y GHCR se mantienen como una ruta independiente para VPS, NAS u otro proveedor de contenedores.

El formulario de contacto entrega una notificación a Gmail mediante Resend, está protegido por Cloudflare Turnstile y no persiste mensajes en PostgreSQL.

Vercel Web Analytics recopila páginas vistas y navegación mediante la integración oficial para Next.js. La instrumentación no requiere secretos ni variables adicionales.

## 1. Proyecto En Vercel

1. Importa el repositorio `Mazon64/portafolio` desde el panel de Vercel.
2. Conserva `main` como Production Branch y el directorio raíz predeterminado. `develop` utiliza el entorno Preview integrado de Vercel.
3. Usa el preset de Next.js y deja los comandos de instalación y build en sus valores automáticos.
4. Activa **Automatically expose System Environment Variables**. La ruta de readiness usa `VERCEL_GIT_COMMIT_SHA` para identificar la versión desplegada.
5. Confirma que Production usa Node.js 24. `package.json` también fija `24.x`.
6. En la sección **Analytics** del proyecto, confirma que Web Analytics está habilitado.
7. Activa Vercel Authentication con **Standard Protection** para mantener Production público y exigir acceso al proyecto en los Preview.
8. Vincula `preview.davidaranda.dev` al entorno Preview y a la rama `develop`.
9. Publica una regla WAF `host ends with .vercel.app -> deny` para que la aplicación solo se sirva mediante dominios propios.

`vercel.json` mantiene las funciones en `sfo1`, cerca de la base de datos de Supabase en Oregon. `next.config.ts` genera `output: "standalone"` fuera de Vercel para Docker y lo desactiva en Vercel, donde el adaptador nativo genera su propia salida.

## 2. Variables De Vercel

Configura estas variables en **Settings > Environment Variables**:

| Variable | Entornos | Valor |
| --- | --- | --- |
| `SITE_URL` | Production y Preview | `https://davidaranda.dev` |
| `DATABASE_URL` | Production y Preview | Transaction Pooler de Supabase, puerto `6543` |
| `CONTACT_DELIVERY_ENABLED` | Production | `true` |
| `CONTACT_DELIVERY_ENABLED` | Preview | `false` |
| `RESEND_API_KEY` | Production | API key de Resend con permiso de envío |
| `CONTACT_FROM_EMAIL` | Production | `Portafolio <contact@mail.davidaranda.dev>` |
| `CONTACT_TO_EMAIL` | Production | `contacto@davidaranda.dev` |
| `TURNSTILE_SITE_KEY` | Production | Site key del widget de Turnstile |
| `TURNSTILE_SECRET_KEY` | Production | Secret key del widget de Turnstile |

No configures `DIRECT_URL` en Vercel. `postinstall` genera Prisma con una URL ficticia que no establece ninguna conexión. Las migraciones se ejecutan exclusivamente desde GitHub Actions con el pooler de sesión.

Mientras el portafolio sea de solo lectura, Preview puede consultar la misma base mediante `DATABASE_URL`. Antes de habilitar CMS, escrituras o seeds desde previews, se debe crear una base o un rol aislado para ese entorno.

Las integraciones de contacto se limitan a Production mediante `CONTACT_DELIVERY_ENABLED`. En Preview la interfaz permanece disponible, pero `/api/contact` no expone la site key ni llama a Turnstile o Resend y rechaza cualquier intento de entrega con el error genérico del formulario.

`SITE_URL` conserva el dominio público también en Preview para que canonical y alternates nunca anuncien una URL temporal. Vercel evita por defecto que sus Preview Deployments sean indexados. Si el formulario debe probarse fuera de local, se deben crear credenciales separadas de Resend y Turnstile para Preview; nunca se copian los secretos de Production.

### Correo Y Protección Del Formulario

1. En Resend agrega `mail.davidaranda.dev` como dominio de envío y copia exactamente sus registros DNS a Cloudflare.
2. Espera a que Resend confirme SPF y DKIM antes de utilizar `contact@mail.davidaranda.dev`.
3. En Cloudflare Turnstile crea un widget Managed limitado a `davidaranda.dev`.
4. Configura en Vercel `CONTACT_DELIVERY_ENABLED=true` y las cinco variables de Production indicadas arriba, y vuelve a desplegar.
5. Envía una prueba desde cada idioma y confirma que llega a `contacto@davidaranda.dev` y que **Responder** apunta al correo del visitante.

La notificación usa React Email con una composición editorial monocromática, wordmark tipográfico y fallback de texto plano. El asunto y las etiquetas siguen el locale de origen (`/es` o `/en`); los valores introducidos por el visitante se escapan durante el render de React.

Para desarrollo local se pueden usar las claves de prueba que Cloudflare documenta como **always passes**:

```env
TURNSTILE_SITE_KEY=1x00000000000000000000AA
TURNSTILE_SECRET_KEY=1x0000000000000000000000000000000AA
```

La site key se entrega al cliente desde `GET /api/contact` en runtime para conservar la portabilidad de la imagen Docker. El flag, la secret key y las credenciales de Resend permanecen exclusivamente en el Route Handler. El endpoint exige que el flag valga exactamente `true` y verifica además la acción `contact`, el hostname, el origen, el tamaño, el honeypot y el límite básico por IP antes de solicitar la entrega.

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

## 4. Flujo De Ramas Y Promoción

- `develop` es la rama de integración y `https://preview.davidaranda.dev` siempre apunta al último Preview de esa rama.
- Las ramas `feature/*` y `fix/*` parten de `develop` y vuelven a ella mediante pull request.
- `main` está protegida contra pushes directos y solo recibe promociones revisadas desde `develop`.
- El check `verify` debe aprobar pruebas, lint y build antes de fusionar en `main`.
- Antes de promover, se revisan `/es`, `/en`, navegación responsive y los endpoints de salud en el Preview.
- Los cambios de esquema siguen la estrategia expand-contract y se aplican con el workflow manual antes de publicar código que dependa de ellos.

Flujo habitual:

```bash
git switch develop
git pull --ff-only
git switch -c feature/nombre-breve
# implementar, verificar y abrir PR hacia develop
# cuando develop esté listo, abrir PR de develop hacia main
```

## 5. Calidad E Imagen Docker

El workflow **Quality and Container** ejecuta pruebas, lint y build en pull requests y pushes a `develop` y `main`. Un push verificado a `develop` valida el candidato sin publicar imagen. Únicamente después de un merge verificado en `main` publica:

- `ghcr.io/mazon64/portafolio:latest`
- `ghcr.io/mazon64/portafolio:sha-<commit>`

También se puede ejecutar manualmente para volver a publicar la imagen de un commit. Vercel no consume esta imagen.

Para probar la ruta portable localmente, crea `.env.docker` desde `.env.docker.example` y ejecuta:

```bash
docker compose --env-file .env.docker up --build
```

La imagen standalone conserva `/api/health/live` como health check y recibe `DATABASE_URL` solamente durante su ejecución.

## 6. Dominio Y Cloudflare

Realiza el corte solo después de verificar el deployment temporal `*.vercel.app`:

1. En Vercel, abre **Settings > Domains** y agrega `davidaranda.dev`.
2. Agrega también `www.davidaranda.dev` y configúralo para redirigir al dominio apex si se desea soportar esa variante.
3. Agrega `preview.davidaranda.dev`, selecciona el entorno Preview y vincula la rama `develop`.
4. Copia exactamente los registros que Vercel indique para los tres dominios.
5. En Cloudflare reemplaza el registro que apunta a Render por el destino de Vercel.
6. Mantén esos registros en modo **DNS only** para evitar un doble proxy delante del CDN de Vercel.
7. Espera a que Vercel confirme DNS y TLS antes de retirar el servicio anterior.

Cloudflare puede continuar administrando la zona y los demás subdominios. No es necesario cambiar sus nameservers a Vercel.

## 7. Verificación Y Retiro De Render

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
