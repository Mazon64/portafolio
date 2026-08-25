# Documento de Arquitectura de Software
## Proyecto: Portafolio Base - Ecosistema de Ingeniería
**Versión:** 1.0.0

---

## 1. Topología del Sistema
El Portafolio Base emplea una arquitectura Serverless / Edge impulsada por el framework Next.js (App Router), dividiendo las responsabilidades de datos en un enfoque de persistencia políglota para optimizar el rendimiento y la escalabilidad.

*   **Frontend & API Gateway:** Vercel (Next.js).
*   **Dominio Relacional y Vectorial:** PostgreSQL alojado en Supabase.
*   **Dominio de Mensajería Efímera:** MongoDB Atlas (NoSQL).
*   **Capa de Inteligencia Artificial:** Google Gemini API (Modelo Flash).

---

## 2. Estrategia de Persistencia de Datos

### 2.1 Base de Datos Primaria: PostgreSQL (Supabase)
Manejará las entidades estructuradas (el contenido del portafolio/CV) y el sistema RAG. Utilizaremos **Prisma ORM** para interactuar con esta base de datos, implementando un patrón de "Única Fuente de Verdad" gestionable desde el panel de administración.

**Modelos Principales (Pseudocódigo Prisma):**

```prisma
model Profile {
  id          String   @id @default(uuid())
  title       String   // Ej. "Software Engineer"
  bio_web     String   @db.Text // Descripción larga y conversacional
  bio_cv      String   @db.Text // Resumen ejecutivo corto
  updatedAt   DateTime @updatedAt
}

model Experience {
  id              String   @id @default(uuid())
  company         String
  role            String
  startDate       DateTime
  endDate         DateTime?
  description     String   @db.Text
  show_on_cv      Boolean  @default(true)
  order           Int      @default(0)
}

model Education {
  id              String   @id @default(uuid())
  institution     String
  degree          String
  startDate       DateTime
  endDate         DateTime?
  show_on_cv      Boolean  @default(true)
}

model Project {
  id                String   @id @default(uuid())
  name              String   @unique // Coincide con el repo de GitHub para la telemetría
  summary           String   // Para la tarjeta web contraída y el CV
  detailed_info     String   @db.Text // Para la tarjeta expandida
  url_demo          String?
  url_repo          String?
  tech_stack        String[] 
  show_on_portfolio Boolean  @default(true)
  show_on_cv        Boolean  @default(false) // Solo los más relevantes van al CV
  
  // -- Campos gestionados por el Webhook de Telemetría --
  status            String   @default("Planning")
  progress_pct      Int      @default(0)
  last_telemetry_at DateTime @updatedAt
}

model SkillCategory {
  id          String   @id @default(uuid())
  title       String   // Ej. "Desarrollo multiplataforma", "Diseño UI/UX"
  description String   // Ej. "Frameworks y lenguajes enfocados al desarrollo..."
  order       Int      @default(0) // Para ordenar las tarjetas en la pantalla
  skills      Skill[]
}

model Skill {
  id          String   @id @default(uuid())
  name        String   // Ej. "React" o "Trabajo en equipo"
  icon_name   String?  // String de referencia para react-icons (ej. "SiReact"). 
  is_badge    Boolean  @default(false) // Si es true, el frontend lo pinta como la píldora verde
  show_on_cv  Boolean  @default(true)
  
  // Relación con la categoría
  categoryId  String
  category    SkillCategory @relation(fields: [categoryId], references: [id])
}

---

## 3. Estrategia de Autenticación y Autorización

### 3.1 Autenticación (SSO con GitHub)
El acceso al sistema de gestión (CMS) y auditoría se realizará exclusivamente a través de Single Sign-On (SSO) utilizando el proveedor de identidad de GitHub. Esto se orquestará mediante la librería **NextAuth.js** (Auth.js), garantizando un flujo OAuth 2.0 seguro sin gestionar contraseñas propias.

*   **Credenciales:** Se requerirá un `GITHUB_ID` y un `GITHUB_SECRET` generados desde los *Developer Settings* de GitHub.
*   **Firma de Sesión:** Las sesiones (basadas en JWT) se firmarán criptográficamente utilizando una llave segura y aleatoria definida en la variable de entorno `NEXTAUTH_SECRET`.

### 3.2 Autorización (Patrón Whitelist por Entorno)
Para asegurar que **solo el propietario del ecosistema** (David Yael Aranda Montes) pueda acceder a las rutas protegidas (`/admin/*`), se implementará una validación en tiempo de ejecución (Middleware y Callbacks) basada en variables de entorno.

**Flujo de Validación de Acceso:**
1.  El usuario inicia sesión con GitHub.
2.  El *Callback* de `signIn` de NextAuth intercepta la respuesta.
3.  Compara el correo electrónico (o el ID de GitHub) entrante contra una "Key Segura" definida en el servidor (ej. `ADMIN_GITHUB_EMAIL=tu_correo@gmail.com`).
4.  Si coincide, el JWT se genera y se otorga acceso. Si no coincide, la conexión es rechazada inmediatamente con un error `403 Access Denied`, imposibilitando que otros usuarios de GitHub entren al panel.

**Pseudocódigo del Callback (NextAuth):**
```typescript
callbacks: {
  async signIn({ user }) {
    // Validación estricta con la variable de entorno segura
    const isAllowedToSignIn = user.email === process.env.ADMIN_GITHUB_EMAIL;
    if (isAllowedToSignIn) {
      return true; // Acceso concedido
    } else {
      return false; // Acceso denegado, redirige a página de error
    }
  }
}