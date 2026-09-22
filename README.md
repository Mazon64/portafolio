# Portafolio

Portafolio bilingüe desarrollado con Next.js (App Router), React, TypeScript y Tailwind CSS, conectado a PostgreSQL y Supabase para presentar perfil, habilidades, proyectos, experiencia, educación y datos de contacto de forma administrable.

## Tecnologías Principales

- **Framework:** Next.js 16 (App Router, Turbopack), React 19, TypeScript.
- **Estilos:** Tailwind CSS 4, shadcn/ui sobre Base UI, `next-themes`.
- **Base de Datos y ORM:** PostgreSQL, Supabase (`pgvector`), Prisma 7.
- **Autenticación:** NextAuth.js (GitHub OAuth con whitelist por ID estable).
- **Servicios:** Resend (correo de contacto), Cloudflare Turnstile (protección de formulario), Google Gemini (documentos, RAG y chat contextual).

## Requisitos

- Node.js 24
- npm
- Docker (opcional, para ejecución local de producción)

## Configuración Local

1. Instalar dependencias:
   ```bash
   npm install
   ```

2. Configurar variables de entorno copiando `.env.example` a `.env` y completando los valores necesarios.

3. Iniciar el servidor de desarrollo:
   ```bash
   npm run dev
   ```

4. Abrir `http://localhost:3000`. La raíz redirige automáticamente a `/es` o `/en` según el idioma del navegador.

Para ejecución local con Docker:
```bash
docker compose --env-file .env.docker up --build
```

## Scripts Disponibles

```bash
npm run dev           # Servidor de desarrollo
npm run build         # Build de producción y validación de tipos
npm run start         # Servidor de producción
npm run lint          # ESLint
npm run test          # Pruebas unitarias (Vitest)
npm run db:check      # Conectividad PostgreSQL
npm run db:generate   # Generación del cliente Prisma
npm run db:migrate    # Aplicación de migraciones pendientes
npm run db:seed       # Carga inicial de contenido profesional
npm run db:validate   # Validación del esquema Prisma
```

## Proyectos Automáticos

Solo se vincula un repositorio público mediante `propietario/nombre`. El servicio
descubre sus fuentes habituales, genera la ficha ES/EN y los hitos con IA, y guarda
estado, identidad y evidencia en PostgreSQL. No requiere JSON de hitos ni fichas
especiales en el repositorio. README, roadmap, Issues/releases y capturas son
fuentes opcionales; las limitaciones y requisitos se explican en
[Integración Automática de Proyectos](docs/project-integration.md).

## Documentación Técnica

Toda la especificación e información operativa detallada se encuentra en el directorio `docs/`:

- [Arquitectura](docs/architecture.md)
- [Especificación de Requisitos (SRS)](docs/srs.md)
- [Despliegue y Operación](docs/deployment.md)
- [Especificación de API](docs/api_spec.md)
- [Integración Automática de Proyectos](docs/project-integration.md)
- [Chat Contextual y Conversaciones](docs/chat.md)
