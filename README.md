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
| `MONGODB_URI` | Conexión a MongoDB Atlas. |
| `CRON_SECRET` | Autorización de tareas programadas. |

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

Mi portafolio y mis demás proyectos se desplegarán inicialmente en servicios con niveles gratuitos. Cada aplicación estará dockerizada y GitHub Actions verificará el código, construirá una imagen OCI y la publicará en GitHub Container Registry.

Render ejecutará la misma imagen construida por GitHub Actions. El workflow `.github/workflows/delivery.yml` ejecuta pruebas, lint y build para los pull requests y pushes a `main`. La ejecución manual también publica las etiquetas `latest` y `sha-<commit>` en GHCR y usa un Deploy Hook para solicitar el despliegue. Cloudflare administrará el dominio, el DNS y el proxy del tráfico público.

Render debe definir `DATABASE_URL` en runtime, usar el puerto asignado por la plataforma y exponer `/api/health/live` como health check. El dominio personalizado configurado en Render debe coincidir con `SITE_URL`; Cloudflare puede apuntar a ese origen mediante el registro indicado por Render.

La entrega requiere la siguiente configuración en GitHub:

| Configuración | Tipo | Uso |
| --- | --- | --- |
| `SITE_URL` | Variable | URL pública incorporada en los metadatos durante el build. |
| `RENDER_DEPLOY_HOOK_URL` | Secreto | Deploy Hook del servicio de Render. |
| `DIRECT_URL` | Secreto | Conexión usada por la entrega manual para aplicar migraciones antes del despliegue. |

Render debe consumir `ghcr.io/<usuario>/<repositorio>:latest`. Un paquete privado de GHCR requiere una credencial del registro con permiso de lectura. `/api/health/live` comprueba el proceso sin acoplarlo a Supabase; `/api/health/ready` comprueba además la conexión, el contenido bilingüe obligatorio y la versión desplegada. Render debe recibir `DATABASE_URL` como secreto de runtime.

El nivel gratuito de Render puede suspender el servicio por inactividad y provocar arranques en frío. Una necesidad futura de disponibilidad continua o latencia estricta para los webhooks requerirá una instancia sin suspensión o un servicio separado para recibir eventos.

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
