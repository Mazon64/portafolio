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

Los textos de interfaz que no son contenido administrable permanecen en diccionarios JSON cargados exclusivamente en el servidor. El contenido profesional se consultará en PostgreSQL usando un idioma previamente validado. La preferencia visual inicial se obtiene del tema del sistema mediante `next-themes`; una selección manual tiene prioridad y queda persistida en el navegador.

---

## 2. Estrategia de Persistencia de Datos

### 2.1 Base de Datos Primaria: PostgreSQL (Supabase)
PostgreSQL almacenará las entidades estructuradas del portafolio y el CV, además de los vectores del sistema RAG. Prisma ORM será la única capa de acceso a estos datos, administrados desde el CMS.

Los datos independientes del idioma, como fechas, URLs, orden, visibilidad y telemetría, permanecerán en la entidad principal. Los campos localizables se almacenarán en tablas de traducción con una restricción única por entidad e idioma. Este modelo evita duplicar datos operativos y permite exigir versiones completas en español e inglés desde el CMS.

**Modelos principales (pseudocódigo Prisma):**

```prisma
enum Locale {
  ES
  EN
}

model Profile {
  id           String               @id @default(uuid())
  updatedAt    DateTime             @updatedAt
  translations ProfileTranslation[]
}

model ProfileTranslation {
  id        String  @id @default(uuid())
  profileId String
  locale    Locale
  title     String
  bioWeb    String  @db.Text
  bioCv     String  @db.Text
  profile   Profile @relation(fields: [profileId], references: [id], onDelete: Cascade)

  @@unique([profileId, locale])
}

model Experience {
  id           String                  @id @default(uuid())
  company      String
  startDate    DateTime
  endDate      DateTime?
  showOnCv     Boolean                 @default(true)
  order        Int                     @default(0)
  translations ExperienceTranslation[]
}

model ExperienceTranslation {
  id           String     @id @default(uuid())
  experienceId String
  locale       Locale
  role         String
  description  String     @db.Text
  experience   Experience @relation(fields: [experienceId], references: [id], onDelete: Cascade)

  @@unique([experienceId, locale])
}

model Education {
  id           String                 @id @default(uuid())
  institution  String
  startDate    DateTime
  endDate      DateTime?
  showOnCv     Boolean                @default(true)
  translations EducationTranslation[]
}

model EducationTranslation {
  id          String    @id @default(uuid())
  educationId String
  locale      Locale
  degree      String
  education   Education @relation(fields: [educationId], references: [id], onDelete: Cascade)

  @@unique([educationId, locale])
}

model Project {
  id              String               @id @default(uuid())
  repositoryName  String               @unique
  demoUrl         String?
  repositoryUrl   String?
  techStack       String[]
  showOnPortfolio Boolean              @default(true)
  showOnCv        Boolean              @default(false)
  translations    ProjectTranslation[]

  // Campos gestionados mediante el webhook de telemetría
  status          String               @default("Planning")
  progressPct     Int                  @default(0)
  lastTelemetryAt DateTime             @updatedAt
}

model ProjectTranslation {
  id           String  @id @default(uuid())
  projectId    String
  locale       Locale
  name         String
  summary      String
  detailedInfo String  @db.Text
  project      Project @relation(fields: [projectId], references: [id], onDelete: Cascade)

  @@unique([projectId, locale])
}

model SkillCategory {
  id           String                     @id @default(uuid())
  order        Int                        @default(0)
  skills       Skill[]
  translations SkillCategoryTranslation[]
}

model SkillCategoryTranslation {
  id          String        @id @default(uuid())
  categoryId  String
  locale      Locale
  title       String
  description String
  category    SkillCategory @relation(fields: [categoryId], references: [id], onDelete: Cascade)

  @@unique([categoryId, locale])
}

model Skill {
  id           String             @id @default(uuid())
  iconName     String?
  isBadge      Boolean            @default(false)
  showOnCv     Boolean            @default(true)
  categoryId   String
  category     SkillCategory      @relation(fields: [categoryId], references: [id])
  translations SkillTranslation[]
}

model SkillTranslation {
  id      String @id @default(uuid())
  skillId String
  locale  Locale
  name    String
  skill   Skill  @relation(fields: [skillId], references: [id], onDelete: Cascade)

  @@unique([skillId, locale])
}
```

Las consultas públicas deben filtrar por el `Locale` solicitado. El CMS no debe publicar una entidad mientras falte una traducción requerida; por ello, el fallback a inglés aplica al enrutamiento, no a registros incompletos dentro de la base de datos.

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
| `DATABASE_URL` | Conexión agrupada de Prisma a PostgreSQL/Supabase. |
| `DIRECT_URL` | Conexión directa para migraciones. |
| `AUTH_SECRET` | Firma de sesiones de Auth.js. |
| `AUTH_GITHUB_ID` | Identificador OAuth de GitHub. |
| `AUTH_GITHUB_SECRET` | Secreto OAuth de GitHub. |
| `ADMIN_GITHUB_ID` | Identificador estable autorizado para el CMS. |
| `GITHUB_WEBHOOK_SECRET` | Validación de firmas del webhook. |
| `GEMINI_API_KEY` | Acceso a Google Gemini. |
| `MONGODB_URI` | Conexión a MongoDB Atlas. |
| `CRON_SECRET` | Autorización de tareas programadas. |

El repositorio versiona `.env.example` sin secretos. Cada entorno mantiene su propio archivo `.env` o la configuración equivalente de la plataforma de despliegue.

---

## 5. Entrega y Operación

### 5.1 Flujo de CI/CD

GitHub Actions automatizará la entrega con este flujo:

1. Ejecutar pruebas, lint y build para cada cambio propuesto.
2. Construir una imagen OCI a partir del `Dockerfile` al integrar cambios en la rama principal.
3. Publicar la imagen en GitHub Container Registry con una etiqueta inmutable para el SHA del commit y la etiqueta móvil `latest` consumida por Render.
4. Solicitar el despliegue de Render mediante un Deploy Hook después de publicar correctamente la imagen.
5. Conservar en Render, GitHub y los proveedores de datos únicamente los secretos requeridos por cada servicio.

Render no reconstruirá la aplicación. El despliegue utilizará la imagen que haya superado las verificaciones de GitHub Actions para mantener trazabilidad entre código, artefacto y ejecución.

Como las páginas localizadas se generan estáticamente, `SITE_URL` se proporcionará como variable pública de build para incorporar canonical y alternates correctos en los metadatos. Todas las credenciales y conexiones privadas permanecerán fuera de la imagen.

### 5.2 Flujo de Tráfico

El dominio público se configurará en Cloudflare y su DNS apuntará al dominio personalizado de Render. El proxy de Cloudflare permanecerá activo cuando sea compatible con la validación del dominio y TLS de Render. El recorrido esperado será:

```text
Visitante o webhook de GitHub
  -> Cloudflare DNS/proxy
  -> Render Web Service
  -> Next.js (páginas y Route Handlers)
  -> Supabase / MongoDB Atlas / Gemini
```

### 5.3 Limitaciones del Nivel Gratuito

El servicio gratuito de Render puede suspenderse por inactividad y provocar un arranque en frío. Por este motivo, no se puede garantizar una respuesta menor a dos segundos para el primer webhook después de una suspensión. El endpoint debe permanecer ligero: validar la firma, registrar o delegar el evento y responder antes de ejecutar procesamiento semántico prolongado.

Una necesidad futura de latencia estricta o disponibilidad continua requerirá una instancia sin suspensión o un servicio separado de recepción. Esa complejidad no se añadirá mientras la carga real no la justifique.

### 5.4 Estrategia de Portabilidad

El `Dockerfile` funcionará como contrato de ejecución para evitar el acoplamiento a Render. La imagen debe poder ejecutarse localmente y en cualquier proveedor compatible con OCI. Cloudflare administrará el dominio para permitir cambios de origen sin trasladar el DNS autoritativo.
