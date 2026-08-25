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

model Skill {
  id          String   @id @default(uuid())
  name        String
  category    String   // Ej. "Frontend", "Backend", "Herramientas"
  show_on_cv  Boolean  @default(true)
}

// Nota: La tabla de embeddings para pgvector se manejará mediante migraciones 
// SQL crudas, ya que Prisma tiene soporte limitado para vectores nativos.