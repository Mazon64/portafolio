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

`vercel.json` mantiene las funciones en `sfo1`, cerca de la base de datos de Supabase en Oregon, e ignora builds de ramas distintas de `develop` y `main`. `next.config.ts` genera `output: "standalone"` fuera de Vercel para Docker y lo desactiva en Vercel, donde el adaptador nativo genera su propia salida.

## 2. Variables De Vercel

Configura estas variables en **Settings > Environment Variables**:

| Variable | Entornos | Valor |
| --- | --- | --- |
| `SITE_URL` | Production y Preview | `https://davidaranda.dev` |
| `DATABASE_URL` | Production y Preview | Transaction Pooler del único proyecto Supabase, puerto `6543` |
| `NEXTAUTH_URL` | Production | `https://davidaranda.dev` |
| `NEXTAUTH_URL` | Preview | `https://preview.davidaranda.dev` |
| `AUTH_SECRET` | Production y Preview | Valor aleatorio distinto para cada entorno |
| `AUTH_GITHUB_ID` | Production y Preview | Client ID de la aplicación OAuth propia del entorno |
| `AUTH_GITHUB_SECRET` | Production y Preview | Client secret de la aplicación OAuth propia del entorno |
| `ADMIN_GITHUB_ID` | Production y Preview | ID numérico estable de la única cuenta autorizada |
| `CMS_WRITES_ENABLED` | Preview | `false`; Preview es permanentemente de solo lectura |
| `CMS_WRITES_ENABLED` | Production | `true`, solo después de aprobar autenticación y lectura en Preview |
| `DOCUMENT_GENERATION_ENABLED` | Preview | `false`; Preview nunca llama a Gemini ni crea artefactos |
| `DOCUMENT_GENERATION_ENABLED` | Production | `true` únicamente después de aplicar la migración y verificar el módulo |
| `GEMINI_API_KEYS` | Production | Claves server-only restringidas, separadas por comas o saltos de línea |
| `CONTACT_DELIVERY_ENABLED` | Production | `true` |
| `CONTACT_DELIVERY_ENABLED` | Preview | `false` |
| `RESEND_API_KEY` | Production | API key de Resend con permiso de envío |
| `CONTACT_FROM_EMAIL` | Production | `Portafolio <contact@mail.davidaranda.dev>` |
| `CONTACT_TO_EMAIL` | Production | `contacto@davidaranda.dev` |
| `TURNSTILE_SITE_KEY` | Production | Site key del widget de Turnstile |
| `TURNSTILE_SECRET_KEY` | Production | Secret key del widget de Turnstile |

No configures `DIRECT_URL` en Vercel. `postinstall` genera Prisma con una URL ficticia que no establece ninguna conexión. Las migraciones se ejecutan exclusivamente desde GitHub Actions con el pooler de sesión almacenado en el environment `production`.

Preview y Production comparten `DATABASE_URL`, pero Preview debe mantener `CMS_WRITES_ENABLED=false`. El código interpreta cualquier valor distinto de `true` como escrituras deshabilitadas y, como defensa adicional, rechaza mutaciones cuando `VERCEL_ENV=preview` aunque el flag se herede o configure erróneamente. Preview no recibe `DIRECT_URL` y nunca ejecuta migraciones ni seeds.

Los cambios de variables en Vercel solo se aplican a deployments nuevos. Después de editar una variable de Production, crea un Redeploy del último deployment de `main` o promueve un nuevo commit verificado; volver a ejecutar únicamente GitHub Actions no actualiza el runtime. Confirma siempre el target **Production** y deja Preview con sus valores propios.

`GEMINI_API_KEYS` debe almacenarse como Secret y contener al menos una clave. El servidor descarta entradas vacías y duplicadas, reparte solicitudes por round-robin dentro de cada instancia activa y prueba las claves restantes ante `401`, `403`, `408`, `425`, `429`, errores `5xx`, fallos de red o una respuesta estructural inválida. Los demás errores `4xx` detienen el intento. Al agregar, revocar o rotar claves, reemplaza el valor completo y vuelve a desplegar Production. No configures este pool en Preview.

Las integraciones de contacto se limitan a Production mediante `CONTACT_DELIVERY_ENABLED`. En Preview la interfaz permanece disponible, pero `/api/contact` no expone la site key ni llama a Turnstile o Resend y rechaza cualquier intento de entrega con el error genérico del formulario. La generación documental aplica la misma separación con `DOCUMENT_GENERATION_ENABLED`: Preview puede revisar la interfaz y el fallback del CV, pero nunca envía contexto o vacantes a Gemini.

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

### GitHub OAuth Y CMS

GitHub OAuth Apps admite una URL de callback por aplicación. Crea tres aplicaciones independientes para evitar compartir secretos o callbacks:

| Entorno | Homepage URL | Authorization callback URL |
| --- | --- | --- |
| Local | `http://localhost:3000` | `http://localhost:3000/api/auth/callback/github` |
| Preview | `https://preview.davidaranda.dev` | `https://preview.davidaranda.dev/api/auth/callback/github` |
| Production | `https://davidaranda.dev` | `https://davidaranda.dev/api/auth/callback/github` |

Genera un `AUTH_SECRET` independiente para cada entorno y guarda client secrets exclusivamente en el proveedor correspondiente. `ADMIN_GITHUB_ID` debe ser el ID numérico inmutable, no el login `Mazon64`; se puede consultar mediante la API pública de GitHub y debe verificarse antes de habilitar el CMS.

Las aplicaciones OAuth no necesitan scopes adicionales. NextAuth.js debe enviar un scope vacío, omitir la consulta a `/user/emails` y conservar únicamente el ID numérico del perfil público; el CMS no utiliza correo, avatar, organizaciones ni repositorios para autenticar o autorizar.

Inicia siempre el acceso administrativo desde el dominio canónico de cada entorno. Si un alias alternativo alcanza la aplicación, `/admin/*` y `/api/auth/*` se redirigen hacia `NEXTAUTH_URL` antes de comenzar OAuth, porque la cookie de estado y el callback deben pertenecer al mismo origen. Los hosts `*.vercel.app` permanecen denegados por WAF antes de llegar a esta capa.

En Preview, completa primero Vercel Authentication y confirma que su cookie de acceso sigue vigente antes de pulsar **Continuar con GitHub**. Standard Protection también intercepta `/api/auth/callback/github`; sin esa sesión previa, Vercel redirige el callback a su propio SSO antes de que NextAuth.js pueda validarlo.

El panel está disponible en `/admin/es` y `/admin/en`; `/admin` detecta el idioma. NextAuth.js rechaza cualquier proveedor distinto de GitHub y cualquier ID fuera de la whitelist. El DAL y las Server Actions repiten la autorización para no depender del layout. Las escrituras actualizan el perfil y sus dos traducciones en una transacción, rechazan versiones obsoletas e invalidan la caché pública solo después del commit.

Para preparar Preview:

1. Configura en Vercel Preview el mismo `DATABASE_URL` de Production.
2. Crea una aplicación OAuth exclusiva para `https://preview.davidaranda.dev`.
3. Configura `NEXTAUTH_URL`, `AUTH_SECRET`, las credenciales OAuth y `ADMIN_GITHUB_ID` solo para Preview.
4. Configura `CMS_WRITES_ENABLED=false` y comprueba que el formulario rechace mutaciones.
5. Verifica autenticación, autorización, lectura del perfil y cierre de sesión sin editar datos.
6. Revisa `/admin/es/documents`: antes de la migración debe mostrar el estado pendiente sin romper el resto del CMS.

## 3. Migraciones

En GitHub usa únicamente el environment protegido `production` para migraciones:

| Nombre | Tipo | Valor |
| --- | --- | --- |
| `DIRECT_URL` | Secret | Session Pooler del único proyecto Supabase, puerto `5432` |

El workflow manual **Database Migrations** ejecuta `prisma migrate deploy`, comprueba el estado final y solo acepta ejecuciones desde `main`. Configura el environment `production` con revisores requeridos y una regla de deployment branches limitada a `main`. Preview no almacena `DIRECT_URL`.

Vercel nunca aplica migraciones durante el build. Para un cambio de esquema:

1. Crea una migración expand compatible con la versión publicada.
2. Integra en `main` únicamente la migración compatible, sin código que todavía dependa de ella.
3. Ejecuta **Database Migrations** desde `main` después de la aprobación requerida.
4. Verifica que Production y Preview continúen funcionando con el esquema expandido.
5. Promueve en un cambio posterior el código que utiliza el nuevo esquema.
6. Realiza eliminaciones contract incompatibles solo después de retirar todos sus usos.

La migración `add_generated_documents` es expand-only. Su commit puede promoverse y ejecutarse primero en `main`; el commit de aplicación permanece compatible tanto antes como después de la migración porque captura exclusivamente el error de tabla inexistente y conserva el CV actual. No habilites `DOCUMENT_GENERATION_ENABLED` hasta confirmar las tablas desde el workflow protegido.

## 4. Flujo De Ramas Y Promoción

- `develop` es la rama de integración y `https://preview.davidaranda.dev` siempre apunta al último Preview de esa rama.
- Las ramas `feature/*` y `fix/*` parten de `develop` y vuelven a ella mediante pull request.
- Los pushes a ramas de trabajo se validan en GitHub Actions, pero `ignoreCommand` evita deployments Vercel adicionales. Vercel solo construye `develop` como Preview y `main` como Production.
- `main` está protegida contra pushes directos y solo recibe promociones revisadas desde `develop`.
- El check `verify` debe aprobar pruebas, lint y build antes de fusionar en `main`.
- Antes de promover, se revisan `/es`, `/en`, `/admin/es`, `/admin/en`, navegación responsive, autenticación y lectura administrativa sin mutaciones, y los endpoints de salud en Preview.
- La promoción de `develop` a `main` requiere aprobación manual explícita después de revisar Preview.
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

La configuración vigente es:

1. `davidaranda.dev` sirve Production desde `main`.
2. `www.davidaranda.dev` redirige al dominio apex.
3. `preview.davidaranda.dev` sirve el entorno Preview de `develop` y está protegido por Vercel Authentication.
4. Cloudflare mantiene los registros de estos hosts en modo **DNS only** para evitar un doble proxy delante del CDN de Vercel.
5. Una regla WAF de Vercel deniega hosts `*.vercel.app`; la operación usa exclusivamente dominios propios.

Cloudflare puede continuar administrando la zona y los demás subdominios. No es necesario cambiar sus nameservers a Vercel.

## 7. Verificación

Comprueba en Preview y después de cada promoción en Production:

- `/es`
- `/en`
- `/es/cv` y `/en/cv`
- `/admin`, que debe redirigir al locale detectado
- `/admin/es` y `/admin/en`, que deben exigir GitHub OAuth
- `/admin/es/documents` y `/admin/en/documents`, que deben ser legibles y rechazar generación en Preview
- `/api/health/live`, que debe devolver `204`
- `/api/health/ready`, que debe devolver `status: ready` y el SHA desplegado
- Canonical, alternates, assets, tema y navegación móvil

En Preview confirma que el acceso y la lectura funcionen, y que una mutación responda como deshabilitada. En Production realiza primero una edición reversible, comprueba los dos idiomas y conserva `DIRECT_URL` únicamente dentro de su environment protegido.

### Incidentes De Safe Browsing

Si Chrome presenta una advertencia roja de sitio engañoso:

1. No continúes a través de la excepción del navegador durante el diagnóstico.
2. Consulta la propiedad de dominio en Google Search Console, sección **Seguridad y acciones manuales > Problemas de seguridad**, y Google Transparency Report.
3. Revisa las URLs de ejemplo si Google las proporciona, los deployments activos, DNS, dependencias, scripts externos y posibles redirecciones antes de asumir que es un falso positivo.
4. Despliega cualquier corrección mediante el flujo normal de Preview y Production. Confirma CSP, anti-framing, `nosniff`, `X-Robots-Tag` en `/api/auth/*` y el origen exacto de `NEXTAUTH_URL`.
5. Solicita una revisión en Search Console explicando que el acceso no recopila contraseñas, delega OAuth en GitHub y que se verificaron código, historial, DNS y deployments.
6. Repite el flujo desde otro navegador o dispositivo y monitoriza Transparency Report hasta que Google retire la clasificación.

Nunca incluyas `code`, `state` ni cookies al documentar un callback OAuth. Los códigos son temporales y de un solo uso, pero deben tratarse como secretos mientras permanecen vigentes.
