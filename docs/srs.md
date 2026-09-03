# Especificación de Requisitos de Software (SRS)
## Proyecto: Portafolio
**Versión:** 1.3.0
**Fecha:** 31 de agosto de 2026

---

## 1. Introducción

### 1.1 Propósito
Este documento define las especificaciones y requisitos de mi portafolio, núcleo de mi ecosistema de software profesional.

### 1.2 Alcance del Sistema
Mi portafolio es una aplicación fullstack desarrollada en Next.js. Su alcance abarca:

1. **Identidad Profesional:** CV web interactivo e imprimible.
2. **Telemetría de Ingeniería:** Sistema RAG alimentado por webhooks de GitHub para reportar el avance real de proyectos.
3. **Auditoría y Gestión:** Panel privado para administrar contenido y auditar conversaciones del chatbot.
4. **Continuidad de Experiencia:** Rastreo de sesiones para retomar conversaciones previas.
5. **Experiencia Bilingüe:** Contenido e interfaz disponibles en español e inglés mediante rutas localizadas.

---

## 2. Requisitos Funcionales (RF)

### 2.1 Módulo de Identidad y CV Imprimible
* **RF-01: Renderizado de CV Optimizado.** El sistema debe proveer una vista dedicada del CV utilizando componentes de `shadcn/ui`.
* **RF-02: Exportación e Impresión.** El sistema debe permitir la impresión directa del CV, ocultar los elementos interactivos y adaptar el layout a dimensiones A4/Carta mediante `@media print`.
* **RF-03: Única Fuente de Verdad.** La información de perfil, experiencia, educación, habilidades, proyectos y el mensaje de contacto debe consumirse desde PostgreSQL. Solo la identidad estable del shell puede permanecer en código.
* **RF-04: Visibilidad CV vs Portafolio.** El sistema debe permitir definir qué registros se muestran en el portafolio web y cuáles se incluyen en el CV imprimible.
* **RF-04.1: CV Público Generado.** El CMS debe generar manualmente borradores independientes ES/EN del CV público mediante IA, conservar cada versión y exigir publicación explícita. Un cambio posterior en las fuentes debe marcar el artefacto como desactualizado sin regenerarlo ni reemplazarlo automáticamente.
* **RF-04.2: Fundamentación.** La generación debe usar únicamente contenido profesional seleccionado y contexto privado; la respuesta de IA debe validarse como datos estructurados y conservar fechas, URLs, empresas y slugs desde las fuentes canónicas.
* **RF-04.3: CV ATS.** Cada solicitud debe poder producir un CV ATS de una columna adaptado a una vacante y descargable como PDF y DOCX.
* **RF-04.4: Carta Por Vacante.** La carta de presentación solo debe generarse dentro de una solicitud concreta y permanecer privada.
* **RF-04.5: Historial Permanente.** Solicitudes, contextos y artefactos deben conservarse como versiones append-only sin operaciones de borrado desde el CMS.
* **RF-04.6: Privacidad.** El contexto, las vacantes, los CV ATS y las cartas deben requerir autorización administrativa para lectura o descarga y nunca formar parte del DTO público.
* **RF-05: Proyectos Expandibles.** Cada proyecto debe mostrar un resumen y permitir consultar información detallada combinada con el estado generado por telemetría.
* **RF-05.1: Repositorios Opcionales.** Un proyecto debe poder publicarse sin URL ni identificador de repositorio; la vinculación con GitHub solo aplica cuando exista un repositorio visible o autorizado para telemetría.
* **RF-05.2: Presentación de Habilidades.** Las habilidades deben organizarse en categorías ordenadas que se presenten como cuadrículas de iconos o colecciones de badges.
* **RF-05.3: Resumen Visual de Proyecto.** Cada card de proyecto debe mostrar nombre, resumen, espacio para imagen y porcentaje de progreso.
* **RF-05.4: Detalle Expandible.** La expansión de un proyecto debe mostrar tecnologías, estado, repositorio, prototipo y una narrativa detallada de su desarrollo.
* **RF-05.5: Narrativa Asistida.** En una etapa posterior, el sistema debe generar contenido técnico estructurado a partir de README, documentación e imágenes descritas, manteniendo trazabilidad hacia las fuentes y sin publicar HTML arbitrario producido por IA.

### 2.2 Módulo de Internacionalización
* **RF-06: Idiomas Soportados.** Las rutas públicas deben ofrecer versiones en español (`/es`) e inglés (`/en`).
* **RF-07: Detección Automática.** La ruta `/` debe usar español cuando sea el idioma principal aceptado por el navegador e inglés para cualquier otro idioma o cuando la preferencia no esté disponible.
* **RF-08: Rutas Localizadas.** Toda ruta pública distinta de `/` debe incluir `/es` o `/en`. Las rutas sin prefijo y los idiomas no soportados deben devolver 404.
* **RF-09: Traducciones de Interfaz.** Los textos estáticos no administrables deben residir en diccionarios versionados fuera de la base de datos.
* **RF-10: Contenido Bilingüe.** Los campos administrables localizables deben tener traducciones completas en español e inglés, sin duplicar fechas, URLs, visibilidad ni telemetría.

### 2.3 Módulo de Telemetría por Webhooks
* **RF-11: Recepción de Eventos.** Debe existir un endpoint `/api/webhooks/github` para recibir eventos de GitHub.
* **RF-12: Procesamiento Semántico.** El sistema debe generar resúmenes y embeddings mediante Google Gemini.
* **RF-13: Persistencia Vectorial.** El sistema debe persistir los embeddings en Supabase con pgvector y actualizar el estado de los proyectos.

### 2.4 Módulo de Autenticación y Panel de Administración
* **RF-14: Autenticación OAuth.** El sistema debe integrar el inicio de sesión exclusivamente mediante GitHub y usar sesiones JWT cifradas sin almacenar contraseñas.
* **RF-15: Autorización Estricta.** El acceso a `/admin` debe restringirse a mi cuenta mediante el ID numérico estable de GitHub. La autorización debe repetirse en el DAL y en cada mutación, sin depender únicamente de layouts o controles de cliente.
* **RF-16: Gestión de Contenido.** El CMS debe permitir crear, consultar, actualizar y eliminar perfil, experiencias, educación, categorías de habilidades, habilidades, proyectos y sus traducciones. Las mutaciones deben conservar completas las versiones en español e inglés.
* **RF-16.1: Interfaz Administrativa Bilingüe.** El CMS debe ofrecer interfaz en español e inglés mediante `/admin/es` y `/admin/en`, sin duplicar los datos editables.
* **RF-16.2: Aislamiento De Escrituras.** Las mutaciones deben requerir una habilitación explícita del servidor. Preview puede compartir la base de Production únicamente con escrituras, migraciones y seeds deshabilitados; `VERCEL_ENV=preview` debe bloquear escrituras incluso si el flag se configura erróneamente.
* **RF-16.3: Consistencia De Edición.** El CMS debe rechazar formularios basados en una versión obsoleta, invalidar la caché pública solo después del commit y distinguir un fallo de invalidación de un fallo de persistencia.
* **RF-16.4: Periodos Por Mes.** Experiencia y educación deben capturar y mostrar periodos por mes y año. Cada registro debe declarar explícitamente si continúa vigente; si no está vigente, debe incluir un mes final, sin presuponer que exista empleo o formación actual.
* **RF-17: Gestión de Chats.** El CMS debe permitir visualizar conversaciones, eliminarlas y marcarlas como fijadas.

### 2.5 Módulo de Retención y Continuidad de Sesión
* **RF-18: Identificación de Invitados.** Al iniciar un chat, el sistema debe generar un UUID de sesión y almacenarlo en una cookie.
* **RF-19: Recuperación de Contexto.** Una cookie válida debe permitir recuperar el historial previo del visitante.
* **RF-20: Política de Retención.** Los mensajes y sesiones con más de 30 días deben eliminarse, excepto aquellos fijados desde el CMS.

---

## 3. Requisitos No Funcionales (RNF)

### 3.1 Seguridad
* **RNF-01:** El webhook de GitHub debe validar la firma `X-Hub-Signature-256`.
* **RNF-02:** Las API keys de Supabase y Gemini deben permanecer exclusivamente en el servidor.
* **RNF-02.1:** Las claves de Gemini deben operar como un pool con distribución round-robin y failover acotado entre credenciales, sin exponer valores ni multiplicar errores de solicitud no recuperables.
* **RNF-03:** Las cookies de sesión deben utilizar `HttpOnly`, `Secure` y `SameSite=Lax`.

### 3.2 Rendimiento
* **RNF-04:** El webhook futuro debe responder en menos de 2000 ms y delegar el procesamiento semántico prolongado.

### 3.3 Diseño y Usabilidad
* **RNF-05:** El CV impreso debe mantener contraste AAA y evitar elementos huérfanos.
* **RNF-06:** La interfaz debe adoptar inicialmente el tema del sistema y permitir que una preferencia manual lo sobrescriba de forma persistente.

### 3.4 Arquitectura y Datos
* **RNF-07:** La limpieza de sesiones debe implementarse mediante TTL o un trabajo programado equivalente.
* **RNF-08:** Cada entidad publicada debe tener exactamente una traducción por idioma soportado.
* **RNF-09:** Vercel debe servir la aplicación principal y una imagen OCI equivalente debe conservar la ejecución local y la portabilidad.
* **RNF-10:** GitHub Actions debe verificar el código y publicar la imagen en GHCR solo desde `main`; Vercel debe desplegar Preview desde `develop` y Production desde `main`.
* **RNF-11:** La primera migración debe verificar que pgvector esté habilitado sin fijar tablas ni dimensiones de embeddings antes de seleccionar el modelo utilizado por el módulo RAG.
