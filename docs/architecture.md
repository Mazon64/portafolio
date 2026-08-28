# Documento de Arquitectura de Software
## Proyecto: Portafolio
**Versión:** 1.2.0

---

## 1. Topología del Sistema
Mi portafolio utiliza una aplicación fullstack de Next.js (App Router) distribuida como una imagen OCI. La aplicación web y sus Route Handlers permanecen en un mismo servicio para reducir la complejidad operativa durante la primera etapa.

* **Dominio y DNS:** Cloudflare, con proxy para el tráfico público.
* **Aplicación y API:** Render Web Service a partir de una imagen Docker publicada en GHCR.
* **Dominio relacional y vectorial:** PostgreSQL y pgvector alojados en Supabase.
* **Dominio de mensajería efímera:** MongoDB Atlas.
* **Capa de inteligencia artificial:** Google Gemini API, mediante un modelo Flash.

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
* Las fechas de experiencia y educación se almacenan como `date`; los periodos proporcionados por mes usan el primer día para el inicio y el último día para el final, mientras la interfaz muestra únicamente mes y año.
* Los proyectos se identifican por `slug`. `repositoryFullName` y las URLs son opcionales para permitir proyectos privados o sin repositorio publicado.
* `ProjectStatus` normaliza el ciclo de vida y `progressPct` tiene una restricción SQL entre 0 y 100. `lastTelemetryAt` solo cambia al recibir telemetría y no al editar contenido.
* `SkillPresentation` define categorías `ICON_TILES` o `BADGES`. Las claves de icono se resuelven mediante un registro permitido en la aplicación; la base de datos no almacena componentes ni SVG arbitrarios.
* Las categorías de habilidades localizan su título y una descripción breve editable. Las tecnologías se presentan con iconos permitidos y las capacidades abstractas como badges de ancho adaptable.
* pgvector se habilita una vez con el administrador de Supabase. La primera migración verifica esta precondición, pero no crea tablas vectoriales ni fija dimensiones hasta seleccionar el modelo de embeddings del módulo RAG.

El seed inicial contiene perfil, una experiencia, una formación académica y tres categorías de habilidades: desarrollo de software e infraestructura con iconos, y habilidades de ingeniería con badges. No crea ni elimina proyectos, por lo que puede repetirse después de incorporar propuestas públicas.

Las consultas públicas deben filtrar por el `Locale` solicitado. El CMS no debe publicar una entidad mientras falte una traducción requerida; por ello, el fallback a inglés aplica al enrutamiento, no a registros incompletos dentro de la base de datos.

### 2.2 Acceso Público y Caché

La ruta localizada conserva metadatos independientes de PostgreSQL para que el build no necesite credenciales. El Server Component de contenido llama a `connection()` antes del DAL, por lo que Prisma solo se ejecuta al recibir una petición. `unstable_cache` mantiene un DTO por idioma durante 300 segundos y usa la etiqueta `portfolio`, preparada para invalidación desde el futuro CMS.

El DAL selecciona únicamente campos públicos, exige la traducción solicitada, convierte fechas y enums a valores serializables y valida URLs externas. Los componentes nunca reciben modelos Prisma ni acceden directamente a variables de entorno. Una inconsistencia de contenido produce el estado de error localizado en lugar de mezclar idiomas o presentar datos parciales.

### 2.3 Presentación y Evolución de Proyectos

Las cards de proyectos muestran nombre, resumen, espacio visual para una imagen y progreso. El detalle se expande de forma accesible para mostrar tecnologías, estado, repositorio, prototipo y la descripción extensa existente. Mientras no haya proyectos publicados, la sección conserva su posición y presenta un estado vacío.

La etapa RAG ampliará este modelo sin almacenar HTML generado. Cada imagen deberá tener URL, texto alternativo, descripción contextual, orden y procedencia. La IA producirá una secuencia estructurada de bloques de texto y referencias a medios a partir de README, documentación y descripciones de imágenes. El servidor validará estas referencias antes de publicarlas; la colocación sugerida será editorial y no una garantía sobre hechos no presentes en las fuentes.

---

## 3. Estrategia de Autenticación y Autorización

### 3.1 Autenticación (SSO con GitHub)
El acceso al CMS y a la auditoría se realizará exclusivamente mediante Single Sign-On con GitHub. Auth.js orquestará el flujo OAuth 2.0 sin gestionar contraseñas propias.

* **Credenciales:** `AUTH_GITHUB_ID` y `AUTH_GITHUB_SECRET`, generados en GitHub.
* **Firma de sesión:** JWT firmados con una llave segura definida en `AUTH_SECRET`.

### 3.2 Autorización (Whitelist por Entorno)
El acceso a `/admin/*` estará restringido al propietario del ecosistema. Los callbacks de autenticación compararán el identificador estable de mi cuenta de GitHub con una whitelist almacenada en variables de entorno del servidor. El correo podrá utilizarse como dato adicional, pero no como único identificador porque el proveedor permite modificarlo.

```typescript
callbacks: {
  async signIn({ profile }) {
    return String(profile.id) === process.env.ADMIN_GITHUB_ID;
  }
}
```

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
| `AUTH_SECRET` | Firma de sesiones de Auth.js. |
| `AUTH_GITHUB_ID` | Identificador OAuth de GitHub. |
| `AUTH_GITHUB_SECRET` | Secreto OAuth de GitHub. |
| `ADMIN_GITHUB_ID` | Identificador estable autorizado para el CMS. |
| `GITHUB_WEBHOOK_SECRET` | Validación de firmas del webhook. |
| `GEMINI_API_KEY` | Acceso a Google Gemini. |
| `MONGODB_URI` | Conexión a MongoDB Atlas. |
| `CRON_SECRET` | Autorización de tareas programadas. |

El repositorio versiona `.env.example` para desarrollo nativo y `.env.docker.example` para ejecución local en contenedor, ambos sin secretos. Los archivos reales `.env` y `.env.docker` permanecen fuera de Git. Cada plataforma mantiene una configuración equivalente. `SITE_URL` es la única variable de aplicación proporcionada durante el build porque forma parte de los metadatos estáticos. Las variables operativas, conexiones y credenciales se inyectan en runtime; ninguna credencial se incorpora como argumento de build. `NODE_ENV=production` permanece fija como invariante de la imagen.

---

## 5. Entrega y Operación

### 5.1 Flujo de CI/CD

GitHub Actions automatizará la entrega con este flujo:

1. Ejecutar pruebas, lint y build para cada cambio propuesto.
2. Construir una imagen OCI a partir del `Dockerfile` al integrar cambios en la rama principal.
3. Publicar la imagen en GitHub Container Registry con una etiqueta inmutable para el SHA del commit y la etiqueta móvil `latest` consumida por Render.
4. Aplicar las migraciones pendientes con `DIRECT_URL` después de construir la imagen y antes de activar el despliegue.
5. Solicitar el despliegue de Render mediante un Deploy Hook después de publicar correctamente la imagen y migrar la base.
6. Conservar en Render, GitHub y los proveedores de datos únicamente los secretos requeridos por cada servicio.

Render no reconstruirá la aplicación. El despliegue utilizará la imagen que haya superado las verificaciones de GitHub Actions para mantener trazabilidad entre código, artefacto y ejecución.

Los metadatos localizados se generan durante el build y usan `SITE_URL` para incorporar canonical y alternates correctos. El contenido profesional se renderiza bajo demanda y recibe `DATABASE_URL` exclusivamente en runtime. Todas las credenciales y conexiones privadas permanecen fuera de la imagen.

### 5.2 Flujo de Tráfico

El dominio público se configurará en Cloudflare y su DNS apuntará al dominio personalizado de Render. El proxy de Cloudflare permanecerá activo cuando sea compatible con la validación del dominio y TLS de Render. El recorrido esperado será:

```text
Visitante o webhook de GitHub
  -> Cloudflare DNS/proxy
  -> Render Web Service
  -> Next.js (páginas y Route Handlers)
  -> Supabase / MongoDB Atlas / Gemini
```

`/api/health/live` se utiliza como liveness del contenedor y no consulta dependencias. `/api/health/ready` verifica PostgreSQL, el perfil y las traducciones de todos los registros públicos; también devuelve el SHA incorporado en la imagen. GitHub Actions espera ese SHA después de solicitar el despliegue. Esta separación evita reiniciar la aplicación únicamente por una interrupción temporal de Supabase y evita aprobar una versión anterior todavía saludable.

### 5.3 Limitaciones del Nivel Gratuito

El servicio gratuito de Render puede suspenderse por inactividad y provocar un arranque en frío. Por este motivo, no se puede garantizar una respuesta menor a dos segundos para el primer webhook después de una suspensión. El endpoint debe permanecer ligero: validar la firma, registrar o delegar el evento y responder antes de ejecutar procesamiento semántico prolongado.

Una necesidad futura de latencia estricta o disponibilidad continua requerirá una instancia sin suspensión o un servicio separado de recepción. Esa complejidad no se añadirá mientras la carga real no la justifique.

### 5.4 Estrategia de Portabilidad

El `Dockerfile` funcionará como contrato de ejecución para evitar el acoplamiento a Render. La imagen debe poder ejecutarse localmente y en cualquier proveedor compatible con OCI. Cloudflare administrará el dominio para permitir cambios de origen sin trasladar el DNS autoritativo.
