# Especificación de Requisitos de Software (SRS)
## Proyecto: Portafolio
**Versión:** 1.0.0
**Fecha:** 23 de Agosto, 2026

---

## 1. Introducción

### 1.1 Propósito
El propósito de este documento es definir las especificaciones y requisitos para el desarrollo del "Portafolio", el núcleo del ecosistema de software profesional de David Yael Aranda Montes. 

### 1.2 Alcance del Sistema
El Portafolio es una aplicación Fullstack desarrollada en Next.js. El alcance abarca:
1. **Identidad Profesional:** CV web interactivo e imprimible (optimizado con CSS nativo).
2. **Telemetría de Ingeniería (AI-Driven):** Sistema RAG alimentado por Webhooks de GitHub para reportar el avance real de proyectos.
3. **Auditoría y Gestión de Interacciones:** Un panel de administración privado para monitorear, auditar y depurar las conversaciones que los reclutadores tienen con el Chatbot.
4. **Continuidad de Experiencia:** Un sistema de rastreo de sesiones para usuarios no autenticados que permite retomar conversaciones previas con el chatbot.

---

## 2. Requisitos Funcionales (RF)

### 2.1 Módulo de Identidad y CV Imprimible
* **RF-01: Renderizado de CV Optimizado.** El sistema debe proveer una vista dedicada del CV utilizando componentes de `shadcn/ui`.
* **RF-02: Exportación e Impresión.** El sistema debe permitir la impresión directa del CV, ocultando elementos interactivos y formateando el layout a dimensiones A4/Carta mediante `@media print`.
* **RF-03: Única Fuente de Verdad (Contenido).** Toda la información de Perfil, Experiencia, Educación, Habilidades y Proyectos debe consumirse desde la base de datos relacional (PostgreSQL). (Nota: La información de contacto se mantendrá estática en el código/entorno).
* **RF-04: Filtro de Visibilidad CV vs Portafolio.** El sistema debe permitir definir qué registros (ej. proyectos o experiencias específicas) se muestran en la versión completa del Portafolio Web y cuáles se renderizan en la versión sintética del CV imprimible.
* **RF-05: Vista Detallada de Proyectos (Tarjetas Expandibles).** En la vista web, los proyectos se mostrarán como tarjetas resumidas que, al interactuar, revelarán información detallada consumida desde la base de datos, combinada con su "Estado Actual" generado dinámicamente por el sistema de telemetría (RAG).

### 2.2 Módulo de Telemetría por Webhooks
* **RF-03:** Endpoint de recepción (`/api/webhooks/github`) para eventos de GitHub (Pushes, PRs, Issues, CI/CD).
* **RF-04:** Generación de resúmenes semánticos y embeddings vía API de Google Gemini.
* **RF-05:** Persistencia vectorial en Supabase (pgvector) y actualización dinámica del estado de los proyectos.

### 2.3 Módulo de Autenticación y Panel de Administración (CMS)
* **RF-09: Autenticación OAuth.** El sistema debe integrar inicio de sesión exclusivo mediante GitHub.
* **RF-10: Autorización Estricta (Whitelist).** El acceso a la ruta `/admin` debe estar restringido única y exclusivamente a la cuenta de GitHub de David Yael Aranda Montes.
* **RF-11: Gestión de Contenido (CMS).** El panel de administración debe proporcionar una interfaz para Crear, Leer, Actualizar y Eliminar (CRUD) la información de las secciones Perfil, Experiencia, Educación, Habilidades y Proyectos, modificando directamente la base de datos primaria.
* **RF-12: Gestión de Chats.** El panel de administración debe permitir visualizar el historial completo de conversaciones, eliminarlas y marcarlas ("Pin").

### 2.4 Módulo de Retención y Continuidad de Sesión
* **RF-09: Identificación de Invitados.** Al iniciar un chat, el sistema debe generar un UUID de sesión único y almacenarlo en una cookie en el navegador del visitante.
* **RF-10: Recuperación de Contexto.** Si un visitante con una cookie de sesión válida regresa al portafolio, el sistema debe cargar su historial de chat previo.
* **RF-11: Política de Retención (TTL).** El sistema debe eliminar automáticamente de la base de datos todos los mensajes y sesiones de chat que superen los 30 días de antigüedad, exceptuando aquellos que tengan la propiedad `isPinned=true` establecida desde el panel de administración.

---

## 3. Requisitos No Funcionales (RNF)

### 3.1 Seguridad
* **RNF-01:** Validación de firma criptográfica (`X-Hub-Signature-256`) en el Webhook de GitHub.
* **RNF-02:** Protección de API Keys (Supabase, Gemini) exclusivas del lado del servidor.
* **RNF-03: Seguridad de Cookies.** Las cookies de sesión del chatbot deben configurarse con los atributos `HttpOnly`, `Secure` (solo HTTPS) y `SameSite=Lax` para prevenir ataques XSS y CSRF.

### 3.2 Rendimiento
* **RNF-04:** El Webhook debe responder en < 2000ms para evitar timeouts de GitHub (requiere procesamiento asíncrono para la ingesta de Gemini/Supabase).

### 3.3 Diseño y Usabilidad
* **RNF-05:** Fidelidad de impresión del CV con contraste AAA y sin elementos huérfanos.

### 3.4 Arquitectura y Datos
* **RNF-06:** La base de datos debe soportar índices de Tiempo de Vida (TTL - Time-To-Live) o en su defecto, el sistema debe incluir un Cron Job programado que ejecute la limpieza a los 30 días automáticamente.