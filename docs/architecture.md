# Documento de Arquitectura de Software
## Proyecto: Portafolio
**Versión:** 1.3.0

---

## 1. Topología del Sistema
Mi portafolio utiliza una aplicación fullstack de Next.js (App Router) desplegada de forma nativa en Vercel. La aplicación web, sus Route Handlers y Server Actions permanecen en el mismo proyecto; una imagen OCI equivalente conserva la portabilidad para ejecución local o proveedores alternativos.

* **Dominio y DNS:** Cloudflare en modo DNS only.
* **Aplicación y API:** Vercel con Next.js y Vercel Functions.
* **Dominio relacional y vectorial:** PostgreSQL y pgvector alojados en Supabase.
* **Correo de contacto:** Resend con plantillas React Email y Gmail como destino.
* **Servicios futuros:** MongoDB Atlas para conversaciones y Google Gemini para RAG.

### 1.1 Internacionalización y Preferencias de Interfaz
Los prefijos `/es` y `/en` son obligatorios para las rutas públicas. El Proxy interviene solo en `/`: selecciona español cuando es el idioma principal aceptado por el navegador e inglés para cualquier otro idioma. Cualquier otra ruta sin prefijo o con un idioma no soportado devuelve 404.

Los textos de interfaz que no son contenido administrable permanecen en diccionarios JSON cargados exclusivamente en el servidor. El contenido profesional se consulta en PostgreSQL usando un idioma previamente validado. La preferencia visual inicial se obtiene del tema del sistema mediante `next-themes`; una selección manual tiene prioridad y queda persistida en el navegador.

---

## 2. Estrategia de Persistencia de Datos

### 2.1 Base de Datos Primaria: PostgreSQL (Supabase)
PostgreSQL almacenará las entidades estructuradas del portafolio y el CV, además de los vectores del sistema RAG. Prisma 7.10 con `@prisma/adapter-pg` será la capa de acceso de la aplicación a estos datos, administrados desde el CMS. Los scripts operativos de conectividad pueden usar `pg` directamente sin exponer consultas de dominio.

Los datos independientes del idioma, como fechas, URLs, orden, visibilidad y telemetría, permanecerán en la entidad principal. Los campos localizables se almacenarán en tablas de traducción con una restricción única por entidad e idioma. Este modelo evita duplicar datos operativos y permite exigir versiones completas en español e inglés desde el CMS.

El esquema ejecutable se encuentra en `prisma/schema.prisma`. Sus decisiones principales son:

* Todas las entidades administrables usan UUID, un `slug` estable, orden, visibilidad y timestamps según corresponda.
* `Profile`, `Experience`, `Education`, `Project`, `SkillCategory` y `Skill` separan los datos operativos de sus tablas de traducción.
* `ProfileTranslation` contiene el título, la biografía pública y el mensaje editable de contacto. La presentación pública no mantiene una biografía corta adicional.
* Las fechas de experiencia y educación se almacenan como `date`; los periodos proporcionados por mes usan el primer día para el inicio y el último día para el final, mientras la interfaz muestra únicamente mes y año. El CMS exige un estado vigente explícito por registro: vigente persiste `endDate = null`, mientras no vigente exige mes final. No existe un indicador global que presuponga empleo o formación actual.
* Los proyectos se identifican por `slug`. `repositoryFullName` y las URLs son opcionales para permitir proyectos privados o sin repositorio publicado.
* `ProjectStatus` normaliza el ciclo de vida y `progressPct` tiene una restricción SQL entre 0 y 100. `lastTelemetryAt` solo cambia al recibir telemetría y no al editar contenido.
* `SkillPresentation` define categorías `ICON_TILES` o `BADGES`. Las claves de icono se resuelven mediante un registro permitido en la aplicación; la base de datos no almacena componentes ni SVG arbitrarios.
* Las categorías de habilidades localizan su título y una descripción breve editable. Las tecnologías se presentan con iconos permitidos y las capacidades abstractas como badges de ancho adaptable.
* pgvector se habilita una vez con el administrador de Supabase. La primera migración verifica esta precondición, pero no crea tablas vectoriales ni fija dimensiones hasta seleccionar el modelo de embeddings del módulo RAG.

El seed inicial contiene perfil, una experiencia, una formación académica y tres categorías de habilidades: desarrollo de software e infraestructura con iconos, y habilidades de ingeniería con badges. No crea ni elimina proyectos, por lo que puede repetirse después de incorporar propuestas públicas.

Las consultas públicas deben filtrar por el `Locale` solicitado. El CMS no debe publicar una entidad mientras falte una traducción requerida; por ello, el fallback a inglés aplica al enrutamiento, no a registros incompletos dentro de la base de datos.

### 2.2 Acceso Público, CV Y Caché

Las rutas localizadas conservan metadatos independientes de PostgreSQL para que el build no necesite credenciales. El Server Component de contenido llama a `connection()` antes del DAL, por lo que Prisma solo se ejecuta al recibir una petición. `unstable_cache` mantiene DTOs separados para el portafolio y el CV por idioma durante 300 segundos; ambos usan la etiqueta `portfolio`, que el CMS invalida después de una transacción exitosa. El portafolio filtra mediante `showOnPortfolio`, mientras `/es/cv` y `/en/cv` filtran mediante `showOnCv` y ofrecen una composición HTML optimizada para impresión A4 o Carta. El CV usa una columna principal amplia para resumen, experiencia, proyectos y educación, junto a una columna complementaria más estrecha para habilidades e idiomas.

El DAL selecciona únicamente campos públicos, exige la traducción solicitada, convierte fechas y enums a valores serializables y valida URLs externas. Los componentes nunca reciben modelos Prisma ni acceden directamente a variables de entorno. Una inconsistencia de contenido produce el estado de error localizado en lugar de mezclar idiomas o presentar datos parciales.

### 2.3 Presentación y Evolución de Proyectos

Las cards de proyectos muestran nombre, resumen, espacio visual para una imagen y progreso. El detalle se expande de forma accesible para mostrar tecnologías, estado, repositorio, prototipo y la descripción extensa existente. Mientras no haya proyectos publicados, la sección conserva su posición y presenta un estado vacío.

La etapa RAG ampliará este modelo sin almacenar HTML generado. Cada imagen deberá tener URL, texto alternativo, descripción contextual, orden y procedencia. La IA producirá una secuencia estructurada de bloques de texto y referencias a medios a partir de README, documentación y descripciones de imágenes. El servidor validará estas referencias antes de publicarlas; la colocación sugerida será editorial y no una garantía sobre hechos no presentes en las fuentes.

---

## 3. Estrategia de Autenticación y Autorización

### 3.1 Autenticación (SSO con GitHub)
El acceso al CMS se realiza exclusivamente mediante Single Sign-On con GitHub. NextAuth.js orquesta OAuth 2.0 sin gestionar contraseñas propias y mantiene una sesión JWT cifrada con una duración absoluta máxima de doce horas. Un timestamp firmado e inmutable evita que la renovación deslizante prolongue ese límite.

* **Credenciales:** `AUTH_GITHUB_ID` y `AUTH_GITHUB_SECRET`, generados en GitHub.
* **Sesión:** JWT cifrado mediante `AUTH_SECRET`, sin tablas de cuentas o sesiones.
* **Entornos:** local, Preview y Production usan aplicaciones OAuth y secretos independientes.
* **Minimización:** la autorización no solicita scopes adicionales de GitHub. Se consulta una vez el perfil público, se descartan nombre, correo y avatar, y solo el ID numérico se conserva en el JWT y la sesión.

Las rutas `/admin/*` y `/api/auth/*` se redirigen primero al origen declarado en `NEXTAUTH_URL` cuando un alias alternativo alcanza la aplicación. Esto evita iniciar OAuth en un host y recibir el callback en otro, donde no existiría la cookie de estado que protege el flujo.

El origen se valida antes de redirigir: debe contener exclusivamente esquema y host, usar HTTPS fuera de loopback y coincidir con `davidaranda.dev` en Production o `preview.davidaranda.dev` en Preview. La aplicación publica además CSP, protección anti-framing, `nosniff`, política de permisos y referrer policy; `/api/auth/*` declara `noindex, nofollow`. La pantalla de acceso no recopila credenciales y comunica la minimización aplicada al perfil de GitHub.

NextAuth.js no presenta su página de acceso integrada. Tanto un inicio directo como la recuperación posterior a un callback interrumpido pasan por `/admin/auth-error`, recuperan el locale guardado y vuelven a la pantalla de acceso propia; así no se mezclan estilos, recursos externos ni formularios de fallback con el CMS.

### 3.2 Autorización (Whitelist por Entorno)
El acceso a `/admin/*` está restringido al propietario del ecosistema. El callback de autenticación compara `account.providerAccountId`, el identificador numérico que NextAuth.js normaliza desde GitHub, con `ADMIN_GITHUB_ID`; después, el DAL vuelve a comparar ese ID en cada petición para revocar sesiones existentes cuando cambie la whitelist. El perfil crudo, el correo y el login no participan en la autorización porque pueden variar o ser mutables.

```typescript
callbacks: {
  async signIn({ account }) {
    return account?.provider === "github"
      && account.providerAccountId === process.env.ADMIN_GITHUB_ID;
  }
}
```

`/admin` detecta el idioma y redirige a `/admin/es` o `/admin/en`. El login permanece fuera del layout protegido, mientras el dashboard y cada consulta administrativa exigen autorización server-side. El CMS ofrece CRUD de perfil, experiencia, educación, categorías de habilidades, habilidades y proyectos. Las mutaciones usan Server Actions consideradas endpoints públicos: autorizan nuevamente, validan con Zod y ejecutan transacciones Prisma que conservan juntas las traducciones ES/EN.

`updatedAt` actúa como versión optimista para impedir que una pestaña obsoleta sobrescriba una edición reciente. Las categorías reciben además una nueva versión cuando cambia una habilidad hija, para proteger los borrados en cascada. Después del commit se llama `updateTag("portfolio")`; si solo falla esa invalidación, la interfaz confirma que el guardado ocurrió y conserva la nueva versión.

`CMS_WRITES_ENABLED` es una segunda barrera operacional y falla de forma segura. Preview comparte la base Supabase exclusivamente para lecturas: aunque el flag se configure accidentalmente en `true`, `VERCEL_ENV=preview` bloquea las mutaciones. Preview tampoco recibe `DIRECT_URL`, ejecuta migraciones ni ejecuta seeds.

---

## 4. Variables de Entorno

Los secretos estarán disponibles solo en el servidor. El prefijo `NEXT_PUBLIC_` no se utilizará para credenciales, conexiones o firmas.

| Variable | Propósito |
| --- | --- |
| `SITE_URL` | Origen absoluto usado en canonical y alternates de metadatos. |
| `HOSTNAME` | Interfaz de red utilizada por el servidor del contenedor. |
| `PORT` | Puerto de escucha asignado al contenedor. |
| `HOST_PORT` | Puerto del host utilizado por Docker Compose; no se inyecta en el contenedor. |
| `DATABASE_URL` | Conexión agrupada de Prisma a PostgreSQL/Supabase. |
| `DIRECT_URL` | Pooler de sesión usado por Prisma CLI y migraciones. |
| `NEXTAUTH_URL` | Origen exacto del callback OAuth para cada entorno. |
| `AUTH_SECRET` | Cifrado e integridad de sesiones JWT de Auth.js. |
| `AUTH_GITHUB_ID` | Identificador OAuth de GitHub. |
| `AUTH_GITHUB_SECRET` | Secreto OAuth de GitHub. |
| `ADMIN_GITHUB_ID` | Identificador estable autorizado para el CMS. |
| `CMS_WRITES_ENABLED` | Habilitación explícita de mutaciones administrativas. |
| `CONTACT_DELIVERY_ENABLED` | Habilitación explícita de la entrega del formulario. |
| `RESEND_API_KEY` | Credencial server-only para enviar correo mediante Resend. |
| `CONTACT_FROM_EMAIL` | Remitente verificado de las notificaciones de contacto. |
| `CONTACT_TO_EMAIL` | Buzón privado de destino. |
| `TURNSTILE_SITE_KEY` | Identificador público entregado al formulario en runtime. |
| `TURNSTILE_SECRET_KEY` | Credencial server-only para validar Turnstile. |
| `GITHUB_WEBHOOK_SECRET` | Validación de firmas del webhook. |
| `GEMINI_API_KEY` | Acceso a Google Gemini. |
| `MONGODB_URI` | Conexión a MongoDB Atlas. |
| `CRON_SECRET` | Autorización de tareas programadas. |

El repositorio versiona `.env.example` para desarrollo nativo y `.env.docker.example` para ejecución local en contenedor, ambos sin secretos. Los archivos reales `.env` y `.env.docker` permanecen fuera de Git. Cada plataforma mantiene una configuración equivalente. `SITE_URL` es la única variable de aplicación proporcionada durante el build porque forma parte de los metadatos estáticos. Las variables operativas, conexiones y credenciales se inyectan en runtime; ninguna credencial se incorpora como argumento de build. `NODE_ENV=production` permanece fija como invariante de la imagen.

---

## 5. Entrega y Operación

### 5.1 Flujo de CI/CD

GitHub Actions y Vercel implementan este flujo:

1. Ejecutar pruebas, lint y build en pull requests y pushes a `develop` y `main`.
2. Desplegar `develop` como Preview protegido y `main` como Production público mediante Vercel.
3. Revisar visual y funcionalmente Preview antes de solicitar la promoción a `main`.
4. Aplicar migraciones compatibles mediante el workflow manual y el environment protegido correspondiente.
5. Publicar la imagen OCI `latest` y `sha-<commit>` en GHCR únicamente después de integrar un commit verificado en `main`.
6. Conservar en Vercel, GitHub y los proveedores de datos únicamente los secretos requeridos por cada entorno.

Vercel despliega directamente desde GitHub y no consume la imagen de GHCR. Docker permanece como contrato de portabilidad independiente.

Los metadatos localizados se generan durante el build y usan `SITE_URL` para incorporar canonical y alternates correctos. El contenido profesional se renderiza bajo demanda y recibe `DATABASE_URL` exclusivamente en runtime. Todas las credenciales y conexiones privadas permanecen fuera de la imagen. El área administrativa no carga Vercel Web Analytics.

### 5.2 Flujo de Tráfico

Cloudflare conserva la zona DNS, pero los registros del portafolio permanecen en modo DNS only y apuntan a Vercel para evitar un doble proxy. El recorrido actual es:

```text
Visitante o administrador
  -> Cloudflare DNS
  -> Vercel
  -> Next.js (páginas, Route Handlers y Server Actions)
  -> Supabase / GitHub OAuth / Resend
```

`/api/health/live` comprueba el proceso sin consultar dependencias. `/api/health/ready` verifica PostgreSQL, el perfil, las traducciones públicas y el SHA de Vercel o de la imagen. Esta separación evita interpretar una interrupción temporal de Supabase como un fallo del proceso.

### 5.3 Separación De Entornos

Production y Preview usan la misma base Supabase para evitar un segundo proyecto. Preview solo consulta datos: no ejecuta mutaciones, migraciones ni seeds. El único `DIRECT_URL` reside en el environment `production` de GitHub y solo puede usarse desde `main`. Las aplicaciones OAuth, `AUTH_SECRET` y `NEXTAUTH_URL` se mantienen separadas por origen.

Las integraciones que no deben operar en Preview permanecen detrás de flags server-only específicos. `CONTACT_DELIVERY_ENABLED` controla la entrega del formulario sin depender de `NODE_ENV`; `CMS_WRITES_ENABLED` controla las mutaciones administrativas y `VERCEL_ENV=preview` impone además un bloqueo de seguridad aunque el flag se configure erróneamente.

### 5.4 Estrategia de Portabilidad

El `Dockerfile` funciona como contrato de ejecución para evitar el acoplamiento exclusivo a Vercel. La imagen puede ejecutarse localmente y en cualquier proveedor compatible con OCI. Cloudflare administra el dominio para permitir cambios de origen sin trasladar el DNS autoritativo.
