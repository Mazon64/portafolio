# Documento de Arquitectura de Software
## Proyecto: Portafolio
**Versión:** 1.1.0

---

## 1. Topología del Sistema
El Portafolio emplea una arquitectura Serverless / Edge impulsada por Next.js (App Router), dividiendo las responsabilidades de datos en un enfoque de persistencia políglota para optimizar el rendimiento y la escalabilidad.

* **Frontend y API Gateway:** Vercel (Next.js).
* **Dominio Relacional y Vectorial:** PostgreSQL alojado en Supabase.
* **Dominio de Mensajería Efímera:** MongoDB Atlas (NoSQL).
* **Capa de Inteligencia Artificial:** Google Gemini API (modelo Flash).

### 1.1 Internacionalización y Preferencias de Interfaz
Las rutas públicas usan obligatoriamente los prefijos `/es` y `/en`. El Proxy solo interviene en `/`: selecciona español cuando es el idioma principal aceptado por el navegador e inglés para cualquier otro idioma. Cualquier otra ruta sin prefijo o con un idioma no soportado devuelve 404.

Los textos de interfaz que no son contenido administrable se mantienen en diccionarios JSON cargados exclusivamente en el servidor. El contenido profesional se consulta en PostgreSQL usando un idioma previamente validado. La preferencia visual inicial se obtiene del tema del sistema mediante `next-themes`; una selección manual futura tendrá prioridad y quedará persistida en el navegador.

---

## 2. Estrategia de Persistencia de Datos

### 2.1 Base de Datos Primaria: PostgreSQL (Supabase)
Manejará las entidades estructuradas del portafolio/CV y el sistema RAG. Prisma ORM será la única capa de acceso a estos datos, gestionados desde el panel de administración.

Los datos independientes del idioma, como fechas, URLs, orden, visibilidad y telemetría, permanecen en la entidad principal. Los campos localizables se guardan en tablas de traducción con una restricción única por entidad e idioma. Esto evita duplicar datos operativos y permite exigir versiones completas en español e inglés desde el CMS.

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

  // Campos gestionados por el webhook de telemetría
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
Solo el propietario del ecosistema podrá acceder a `/admin/*`. Los callbacks de autenticación compararán el identificador estable de la cuenta de GitHub con una whitelist almacenada en variables de entorno del servidor. El correo puede emplearse como dato adicional, pero no como único identificador si el proveedor permite modificarlo.

```typescript
callbacks: {
  async signIn({ profile }) {
    return String(profile.id) === process.env.ADMIN_GITHUB_ID;
  }
}
```

---

## 4. Variables de Entorno

Los secretos permanecen disponibles solo en el servidor. No se utilizará el prefijo `NEXT_PUBLIC_` para credenciales, conexiones o firmas.

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

El repositorio versiona `.env.example` sin secretos. Cada entorno mantiene su propio archivo `.env` o configuración equivalente en la plataforma de despliegue.
