# Especificación de Requisitos de Software (SRS)
## Proyecto: Portafolio
**Versión:** 1.1.0
**Fecha:** 25 de Agosto, 2026

---

## 1. Introducción

### 1.1 Propósito
Este documento define las especificaciones y requisitos del Portafolio, núcleo del ecosistema de software profesional de David Yael Aranda Montes.

### 1.2 Alcance del Sistema
El Portafolio es una aplicación Fullstack desarrollada en Next.js. El alcance abarca:

1. **Identidad Profesional:** CV web interactivo e imprimible.
2. **Telemetría de Ingeniería:** Sistema RAG alimentado por webhooks de GitHub para reportar el avance real de proyectos.
3. **Auditoría y Gestión:** Panel privado para administrar contenido y auditar conversaciones del chatbot.
4. **Continuidad de Experiencia:** Rastreo de sesiones para retomar conversaciones previas.
5. **Experiencia Bilingüe:** Contenido e interfaz disponibles en español e inglés mediante rutas localizadas.

---

## 2. Requisitos Funcionales (RF)

### 2.1 Módulo de Identidad y CV Imprimible
* **RF-01: Renderizado de CV Optimizado.** El sistema debe proveer una vista dedicada del CV utilizando componentes de `shadcn/ui`.
* **RF-02: Exportación e Impresión.** El sistema debe permitir la impresión directa del CV, ocultando elementos interactivos y formateando el layout a dimensiones A4/Carta mediante `@media print`.
* **RF-03: Única Fuente de Verdad.** La información de Perfil, Experiencia, Educación, Habilidades y Proyectos debe consumirse desde PostgreSQL. La información de contacto puede mantenerse en código o variables de entorno.
* **RF-04: Visibilidad CV vs Portafolio.** El sistema debe permitir definir qué registros se muestran en el Portafolio Web y cuáles se incluyen en el CV imprimible.
* **RF-05: Proyectos Expandibles.** Los proyectos deben mostrar un resumen y permitir consultar información detallada combinada con el estado generado por telemetría.

### 2.2 Módulo de Internacionalización
* **RF-06: Idiomas Soportados.** Las rutas públicas deben ofrecer versiones en español (`/es`) e inglés (`/en`).
* **RF-07: Detección Automática.** Una URL sin prefijo debe usar español cuando sea el idioma principal aceptado por el navegador e inglés para cualquier otro idioma o cuando la preferencia no esté disponible.
* **RF-08: Rutas Localizadas.** Toda ruta pública distinta de `/` debe incluir `/es` o `/en`. Las rutas sin prefijo y los idiomas no soportados deben devolver 404.
* **RF-09: Traducciones de Interfaz.** Los textos estáticos no administrables deben residir en diccionarios versionados fuera de la base de datos.
* **RF-10: Contenido Bilingüe.** Los campos administrables localizables deben tener traducciones completas en español e inglés, sin duplicar fechas, URLs, visibilidad ni telemetría.

### 2.3 Módulo de Telemetría por Webhooks
* **RF-11: Recepción de Eventos.** Debe existir un endpoint `/api/webhooks/github` para eventos de GitHub.
* **RF-12: Procesamiento Semántico.** El sistema debe generar resúmenes y embeddings mediante Google Gemini.
* **RF-13: Persistencia Vectorial.** El sistema debe persistir embeddings en Supabase con pgvector y actualizar el estado de los proyectos.

### 2.4 Módulo de Autenticación y Panel de Administración
* **RF-14: Autenticación OAuth.** El sistema debe integrar inicio de sesión exclusivo mediante GitHub.
* **RF-15: Autorización Estricta.** El acceso a `/admin` debe restringirse a la cuenta de GitHub del propietario mediante una whitelist del lado del servidor.
* **RF-16: Gestión de Contenido.** El CMS debe permitir CRUD de Perfil, Experiencia, Educación, Habilidades, Proyectos y sus traducciones.
* **RF-17: Gestión de Chats.** El CMS debe permitir visualizar conversaciones, eliminarlas y marcarlas como fijadas.

### 2.5 Módulo de Retención y Continuidad de Sesión
* **RF-18: Identificación de Invitados.** Al iniciar un chat, el sistema debe generar un UUID de sesión y almacenarlo en una cookie.
* **RF-19: Recuperación de Contexto.** Una cookie válida debe permitir recuperar el historial previo del visitante.
* **RF-20: Política de Retención.** Los mensajes y sesiones con más de 30 días deben eliminarse, excepto aquellos fijados desde el CMS.

---

## 3. Requisitos No Funcionales (RNF)

### 3.1 Seguridad
* **RNF-01:** Validación de firma `X-Hub-Signature-256` en el webhook de GitHub.
* **RNF-02:** Las API keys de Supabase y Gemini deben permanecer exclusivamente en el servidor.
* **RNF-03:** Las cookies de sesión deben usar `HttpOnly`, `Secure` y `SameSite=Lax`.

### 3.2 Rendimiento
* **RNF-04:** El webhook debe responder en menos de 2000 ms y delegar el procesamiento prolongado.

### 3.3 Diseño y Usabilidad
* **RNF-05:** El CV impreso debe mantener contraste AAA y evitar elementos huérfanos.
* **RNF-06:** La interfaz debe adoptar inicialmente el tema del sistema y permitir que una preferencia manual futura lo sobrescriba de forma persistente.

### 3.4 Arquitectura y Datos
* **RNF-07:** La limpieza de sesiones debe implementarse mediante TTL o un trabajo programado equivalente.
* **RNF-08:** Cada entidad publicada debe tener exactamente una traducción por idioma soportado.
