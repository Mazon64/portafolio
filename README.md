# Portafolio

Este repositorio contiene mi portafolio bilingüe, desarrollado con Next.js para presentar mi perfil, habilidades, proyectos, experiencia, educación y datos de contacto. La aplicación incluye rutas localizadas, tema claro y oscuro, y contenido profesional administrable consumido desde PostgreSQL.

## Estado Actual

Actualmente incluye:

- Versiones en español e inglés.
- Detección del idioma del navegador al visitar `/`.
- Rutas estrictas con prefijo `/es` o `/en`.
- Tema de sistema, claro y oscuro con persistencia local.
- Navegación responsive y accesible por secciones.
- Diccionarios de interfaz cargados únicamente en el servidor.
- Metadatos localizados y alternates dependientes del entorno.
- Pruebas unitarias para la negociación de idioma y el Proxy.
- Esquema relacional bilingüe administrado mediante Prisma y Supabase.
- Datos iniciales de perfil, experiencia, educación y habilidades.
- pgvector habilitado para la futura etapa RAG.
- Secciones públicas conectadas a Supabase mediante un DAL server-only.
- Caché de contenido por idioma con revalidación cada cinco minutos.
- Cards de habilidades con logos permitidos y badges.
- Estado vacío y estructura expandible para proyectos futuros.
- Formulario de contacto protegido por Cloudflare Turnstile y entregado mediante Resend.
- Analítica web sin cookies mediante Vercel Web Analytics.

El CMS, el CV, la telemetría y el chatbot forman parte de las siguientes etapas. La base inicial no publica proyectos; se incorporarán cuando existan propuestas propias que puedan mostrarse.

## Tecnologías

Tecnologías utilizadas:

- Next.js 16 con App Router y Turbopack.
- React 19.
- TypeScript.
- Tailwind CSS 4.
- shadcn/ui sobre Base UI.
- `next-themes` para preferencias visuales.
- Lucide para iconos de interfaz.
- React Icons para marcas.
- Vitest para pruebas unitarias.
- Prisma 7.10 con el adaptador PostgreSQL.
- React Email y Resend para notificaciones de contacto.
- Vercel Web Analytics para métricas de tráfico y navegación.

## Requisitos

Para ejecutar el proyecto se necesita:

- Node.js 24.
- npm.
- Docker, solo para ejecutar la imagen de producción localmente.

## Configuración Local

1. Instalar las dependencias:

```bash
npm install
```

2. Crear `.env` a partir de `.env.example`.

3. Definir la URL de desarrollo local:

```env
SITE_URL=http://localhost:3000
```

4. Iniciar el servidor:

```bash
npm run dev
```

5. Abrir `http://localhost:3000`. La raíz redirige a `/es` o `/en` según el idioma principal del navegador.

El entorno Docker utiliza un contrato separado. Se debe crear `.env.docker` a partir de `.env.docker.example` y ejecutar:

```bash
docker compose --env-file .env.docker up --build
```

La configuración predeterminada publica el contenedor en `http://localhost:3000`. El servidor nativo de desarrollo y el contenedor utilizan el mismo puerto, por lo que no deben ejecutarse simultáneamente.

## Rutas E Idiomas

El Proxy procesa únicamente `/`:

- Si el navegador tiene español como idioma principal, `/` redirige a `/es`.
- Para cualquier otro idioma, `/` redirige a `/en`.
- `/es` y `/en` son las rutas públicas válidas.
- Una ruta sin prefijo, como `/cv`, devuelve 404.
- Un idioma no soportado, como `/fr`, devuelve 404.

Los textos estructurales de la interfaz se encuentran en `src/i18n/dictionaries`. El contenido profesional administrable se consulta desde PostgreSQL con un locale validado y se normaliza a DTOs antes de llegar a los componentes.

## Tema

El tema del sistema se utiliza como valor inicial. Las opciones disponibles son:

- Sistema.
- Claro.
- Oscuro.

La selección se persiste en el navegador. El selector evita depender del tema durante la hidratación para mantener idéntico el HTML inicial del servidor y del cliente.

## Variables De Entorno

Los contratos se encuentran en `.env.example` y `.env.docker.example`.

| Variable | Uso |
| --- | --- |
| `SITE_URL` | Origen absoluto para canonical y alternates. |
| `HOSTNAME` | Interfaz de red utilizada por el servidor dentro del contenedor. |
| `PORT` | Puerto escuchado por el servidor dentro del contenedor. |
| `HOST_PORT` | Puerto del host utilizado únicamente por Docker Compose. |
| `DATABASE_URL` | Conexión agrupada de Prisma a PostgreSQL. |
| `DIRECT_URL` | Pooler de sesión usado por Prisma CLI y migraciones. |
| `AUTH_SECRET` | Firma de sesiones de Auth.js. |
| `AUTH_GITHUB_ID` | Identificador OAuth de GitHub. |
| `AUTH_GITHUB_SECRET` | Secreto OAuth de GitHub. |
| `ADMIN_GITHUB_ID` | Cuenta autorizada para el CMS. |
| `GITHUB_WEBHOOK_SECRET` | Firma de webhooks de GitHub. |
| `GEMINI_API_KEY` | Acceso a Google Gemini. |
| `RESEND_API_KEY` | Credencial server-only para enviar mensajes del formulario. |
| `CONTACT_FROM_EMAIL` | Remitente verificado utilizado por Resend. |
| `CONTACT_TO_EMAIL` | Buzón privado que recibe los mensajes de contacto. |
| `TURNSTILE_SITE_KEY` | Identificador público del widget de Cloudflare Turnstile. |
| `TURNSTILE_SECRET_KEY` | Credencial server-only para validar desafíos de Turnstile. |
| `MONGODB_URI` | Conexión a MongoDB Atlas. |
| `CRON_SECRET` | Autorización de tareas programadas. |

El formulario se muestra deshabilitado mientras no estén configuradas las tres variables de Resend y las dos de Turnstile. El navegador obtiene en runtime únicamente `TURNSTILE_SITE_KEY` desde `/api/contact`; los demás valores nunca se exponen. Cada envío se valida con Turnstile y después genera una sola notificación editorial y localizada dirigida a `contacto@davidaranda.dev`, con el correo del visitante como `replyTo`. Los mensajes no se duplican en PostgreSQL.

En archivos `.env`, las URLs de PostgreSQL y `CONTACT_FROM_EMAIL` se escriben entre comillas dobles; las claves y direcciones simples no las necesitan. En el panel de Vercel los valores nunca incluyen comillas externas, porque la interfaz las conservaría literalmente.

`.env` contiene la configuración del desarrollo nativo. `.env.docker` contiene la configuración independiente del contenedor y no se incluye en la imagen ni en Git. `SITE_URL` se proporciona durante el build para los metadatos y también queda disponible en runtime. `HOSTNAME`, `PORT` y `DATABASE_URL` se inyectan al ejecutar el contenedor, mientras que `HOST_PORT` solo lo consume Docker Compose. El build genera el cliente Prisma con una URL ficticia no operativa y no se conecta a PostgreSQL. `NODE_ENV=production` es una invariante de la imagen y no una variable configurable del entorno.

Las variables privadas permanecen en el servidor. El prefijo `NEXT_PUBLIC_` no se utiliza para secretos, ningún secreto se pasa como argumento de build y Git no contiene valores reales.

`DATABASE_URL` usa el pooler transaccional de Supabase para las consultas de la aplicación. `DIRECT_URL` usa el pooler de sesión para Prisma CLI y migraciones. Ambas conexiones utilizan el usuario PostgreSQL exclusivo `prisma`.

Las conexiones locales se configuran sin mostrar credenciales mediante:

```powershell
.\scripts\configure-supabase.ps1
```

Antes de la primera migración, el administrador de Supabase debe habilitar pgvector y permitir que el rol de aplicación use el esquema de extensiones:

```sql
CREATE EXTENSION IF NOT EXISTS vector WITH SCHEMA extensions;
GRANT USAGE ON SCHEMA extensions TO prisma;
```

Su estructura y conectividad se verifican con:

```bash
npm run db:check
npm run db:validate
```

El seed es un bootstrap manual y no forma parte del despliegue automático. Una base nueva debe recibir migraciones y seed antes de atender tráfico; después, las migraciones se aplican sin volver a sobrescribir contenido desde el seed.

## Scripts

Comandos disponibles:

```bash
npm run dev    # Servidor de desarrollo
npm run build  # Build de producción y validación de tipos
npm run start  # Servidor de producción
npm run lint   # ESLint
npm run test   # Pruebas unitarias
npm run email:dev    # Previsualización local de las plantillas de correo
npm run db:check     # Conectividad de los dos endpoints PostgreSQL
npm run db:generate  # Generación local del cliente Prisma
npm run db:migrate   # Aplicación de migraciones pendientes
npm run db:seed      # Carga idempotente de contenido profesional
npm run db:smoke     # Integridad del esquema y los datos iniciales
npm run db:status    # Estado de las migraciones
npm run db:validate  # Validación del esquema Prisma
```

## Estructura Principal

Estructura del código:

```text
src/
  app/[lang]/              Layout y página localizados
  components/              Componentes de aplicación
  components/portfolio/    Secciones públicas y estados de carga
  components/ui/           Primitivas de shadcn/ui
  config/                  Configuración de sitio y entorno
  data/                    DAL, normalización y DTOs públicos
  i18n/                    Locales, negociación y diccionarios
  proxy.ts                 Redirección de idioma para la raíz
docs/
  architecture.md          Arquitectura y modelo bilingüe propuesto
  srs.md                   Requisitos funcionales y no funcionales
  api_spec.md              Contrato del webhook de telemetría
```

## Despliegue

Vercel despliega el frontend directamente desde GitHub. `develop` es la rama de integración y siempre produce un Preview para pruebas; `main` está protegida, representa exclusivamente el código publicado y cada merge en ella produce el deployment de Production. `vercel.json` ubica las funciones en `sfo1`, cerca de Supabase, mientras `package.json` fija Node.js 24 y genera Prisma durante `postinstall` sin conectarse a PostgreSQL.

El trabajo cotidiano parte de `develop`, opcionalmente en ramas `feature/*` o `fix/*`, y vuelve a `develop` mediante pull request. Una versión se promueve con un pull request de `develop` a `main` solo después de verificar el Preview, CI y los cambios de base de datos aplicables. No se realizan pushes directos a `main`.

Vercel requiere esta configuración:

| Configuración | Tipo | Uso |
| --- | --- | --- |
| `SITE_URL` | Variable | URL pública incorporada en los metadatos durante el build. |
| `DATABASE_URL` | Secreto | Transaction Pooler de Supabase usado por el runtime. |

Vercel Web Analytics está habilitado en el proyecto y se instrumenta desde el root layout con `@vercel/analytics`. No requiere claves, cookies ni variables de entorno adicionales.

`DIRECT_URL` no se configura en Vercel. GitHub lo almacena como secreto del environment protegido `production`; el workflow manual **Database Migrations** es el único que aplica migraciones. Los cambios de esquema se despliegan con una estrategia expand-contract para que el código publicado y la base permanezcan compatibles.

Docker sigue siendo una ruta de despliegue mantenida e independiente. El workflow **Quality and Container** verifica pruebas, lint y build en `develop`, `main` y sus pull requests, pero publica `latest` y `sha-<commit>` en GHCR únicamente después de cada push verificado a `main`. Next.js genera la imagen standalone fuera de Vercel; dentro de Vercel utiliza la salida de su adaptador nativo. La imagen Docker puede ejecutarse en un VPS, NAS o proveedor de contenedores con `.env.docker`.

`/api/health/live` comprueba el proceso sin acoplarlo a Supabase. `/api/health/ready` comprueba además la conexión, el contenido bilingüe obligatorio y la versión desplegada, usando `VERCEL_GIT_COMMIT_SHA` en Vercel o `APP_VERSION` en Docker.

Cloudflare conserva la zona DNS, pero el dominio del portafolio apunta directamente a Vercel en modo DNS only. La guía operativa de importación, variables, migraciones, GHCR y corte de dominio se encuentra en [`docs/deployment.md`](docs/deployment.md).

El webhook definido en este ecosistema permitirá que las actualizaciones de mis otros repositorios alimenten la telemetría y el contexto del portafolio.

## Verificación

Antes de crear un commit se ejecutan:

```bash
npm run test
npm run lint
npm run build
```

## Próximas Etapas

El desarrollo continuará en este orden:

1. Implementar el CV localizado e imprimible.
2. Añadir autenticación y CMS.
3. Incorporar propuestas propias y su progreso como proyectos públicos.
4. Añadir medios y narrativa técnica estructurada para proyectos.
5. Incorporar telemetría, RAG y chatbot.

## Documentación

La documentación técnica se encuentra en:

- [Arquitectura](docs/architecture.md)
- [Especificación de requisitos](docs/srs.md)
- [Especificación de API](docs/api_spec.md)
