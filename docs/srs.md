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
* **RF-04.1: CV Público Generado.** El CMS debe generar manualmente borradores independientes ES/EN del CV público mediante IA, redactarlos en primera persona, permitir editar su contenido narrativo antes de guardarlo y exigir publicación explícita. Un cambio posterior en las fuentes debe marcar el artefacto como desactualizado sin regenerarlo ni reemplazarlo automáticamente.
* **RF-04.2: Fundamentación.** La generación debe usar únicamente contenido profesional seleccionado y contexto privado; la respuesta de IA debe validarse como datos estructurados y conservar fechas, URLs, empresas y slugs desde las fuentes canónicas.
* **RF-04.3: CV ATS.** Cada solicitud debe poder generar, revisar y editar antes del guardado un CV ATS de una columna adaptado a una vacante. La vista y el documento impreso deben compartir la misma composición y permitir guardarlo como PDF desde el navegador.
* **RF-04.4: Carta Por Vacante.** La carta de presentación solo debe generarse dentro de una solicitud concreta, permitir edición previa al guardado y permanecer privada.
* **RF-04.5: Gestión De Documentos.** Los documentos generados deben poder filtrarse por texto, tipo, idioma y estado, presentarse paginados y eliminarse desde el CMS con confirmación explícita. La interfaz debe actualizarse después de cada mutación sin una recarga manual.
* **RF-04.6: Privacidad.** El contexto, las vacantes, los CV ATS y las cartas deben requerir autorización administrativa para lectura o descarga y nunca formar parte del DTO público.
* **RF-04.7: Contexto Actual Y Sin Contadores.** Los guardados de contexto deben actualizar el contenido actual sin crear revisiones; los artefactos no deben asignar contadores internos. La retirada fisica de los datos legacy debe seguir expand-contract sin perder el contexto actual ni los documentos.
* **RF-04.8: Continuidad Y Borrado Seguro.** Aplicar o limpiar filtros debe conservar borradores sin guardar. El borrado debe comprobar el estado y timestamp de publicacion observados por el usuario dentro de la transaccion, rechazando una pestaña obsoleta.
* **RF-05: Proyectos Expandibles.** Cada proyecto debe mostrar un resumen y permitir consultar información detallada combinada con el estado generado por telemetría.
* **RF-05.1: Repositorios Opcionales.** Un proyecto debe poder publicarse sin URL ni identificador de repositorio; la vinculación con GitHub solo aplica cuando exista un repositorio visible o autorizado para telemetría.
* **RF-05.2: Presentación de Habilidades.** Las habilidades deben organizarse en categorías ordenadas que se presenten como cuadrículas de iconos o colecciones de badges.
* **RF-05.3: Resumen Visual de Proyecto.** Cada card debe mostrar nombre, resumen, tecnologías y una portada del repositorio cuando exista. Solo mostrará porcentaje cuando existan hitos medibles.
* **RF-05.4: Modal De Proyecto.** Al activar la card se abrirá un modal con capturas integradas en las secciones del contenido, tecnologías, estado, enlaces e hitos visuales con iconos y etiquetas. Las consultas pertenecen a la burbuja global. Debe controlar el foco, cerrar con Escape/botón y adaptarse a móvil y movimiento reducido.
* **RF-05.5: Publicación Automática.** Vincular un repositorio debe iniciar descubrimiento y generación de nombres y contenido ES/EN. Las actualizaciones válidas deben publicarse junto con sus fuentes e imágenes sin aprobación manual; ante fallos se conservará la publicación anterior. No se publicará HTML generado arbitrario.
* **RF-05.6: Imágenes E Hitos Automáticos.** Las imágenes se descubrirán mediante enlaces locales Markdown, carpetas habituales de capturas o carpetas por propósito opcionales, con captions ES/EN derivados de análisis visual directo; los binarios permanecen en GitHub. La IA generará y reevaluará hitos a partir de documentación, una muestra acotada de código/pruebas y actividad de GitHub. El servicio guardará IDs estables, estado, justificación y citas validadas en PostgreSQL. No se exigirá un archivo de hitos ni edición manual. La falta de evidencia se distinguirá como no verificado; el porcentaje contará objetivos completados con pesos iguales y no certificará la terminación global del proyecto.
* **RF-05.7: Sincronización Recuperable.** La recepción debe persistir y deduplicar entregas antes de responder. El procesamiento debe usar leases, reintentos limitados, rechazo de fuentes/configuraciones obsoletas y controles administrativos de estado y recuperación.
* **RF-05.8: Fuentes De Proyectos En El Chat.** La burbuja global puede consultar los corpus publicados de proyectos visibles y habilitados, citar fuentes fijadas al commit y abstenerse cuando no hay evidencia. El historial se persiste aparte del corpus público, con límites de consumo y retención definidos en RF-20.

### 2.2 Módulo de Internacionalización
* **RF-06: Idiomas Soportados.** Las rutas públicas deben ofrecer versiones en español (`/es`) e inglés (`/en`).
* **RF-07: Detección Automática.** La ruta `/` debe usar español cuando sea el idioma principal aceptado por el navegador e inglés para cualquier otro idioma o cuando la preferencia no esté disponible.
* **RF-08: Rutas Localizadas.** Toda ruta pública distinta de `/` debe incluir `/es` o `/en`. Las rutas sin prefijo y los idiomas no soportados deben devolver 404.
* **RF-09: Traducciones de Interfaz.** Los textos estáticos no administrables deben residir en diccionarios versionados fuera de la base de datos.
* **RF-10: Contenido Bilingüe.** Los campos administrables localizables deben tener traducciones completas en español e inglés, sin duplicar fechas, URLs, visibilidad ni telemetría.

### 2.3 Módulo de Telemetría por Webhooks
* **RF-11: Recepción de Eventos.** Debe existir un endpoint `/api/webhooks/github` para recibir eventos de GitHub.
* **RF-12: Procesamiento Semántico.** El sistema debe generar resúmenes y embeddings mediante Google Gemini.
* **RF-13: Persistencia Vectorial.** El sistema debe persistir embeddings de fuentes públicas y observaciones visuales en Supabase con pgvector. Estado y progreso se derivan de metadatos e hitos documentados, no de cantidad de commits. El corpus usa `gemini-embedding-001` a 768 dimensiones; cambios de modelo/dimensión requieren reindexación.

### 2.4 Módulo de Autenticación y Panel de Administración
* **RF-14: Autenticación OAuth.** El sistema debe integrar el inicio de sesión exclusivamente mediante GitHub y usar sesiones JWT cifradas sin almacenar contraseñas.
* **RF-15: Autorización Estricta.** El acceso a `/admin` debe restringirse a mi cuenta mediante el ID numérico estable de GitHub. La autorización debe repetirse en el DAL y en cada mutación, sin depender únicamente de layouts o controles de cliente.
* **RF-16: Gestión de Contenido.** El CMS debe permitir crear, consultar, actualizar y eliminar perfil, experiencias, educación, categorías de habilidades, habilidades, proyectos y sus traducciones. Las mutaciones deben conservar completas las versiones en español e inglés.
* **RF-16.1: Interfaz Administrativa Bilingüe.** El CMS debe ofrecer interfaz en español e inglés mediante `/admin/es` y `/admin/en`, sin duplicar los datos editables.
* **RF-16.2: Aislamiento De Escrituras.** Las mutaciones deben requerir una habilitación explícita del servidor. Preview puede compartir la base de Production únicamente con escrituras, migraciones y seeds deshabilitados; `VERCEL_ENV=preview` debe bloquear escrituras incluso si el flag se configura erróneamente.
* **RF-16.3: Consistencia De Edición.** El CMS debe rechazar formularios basados en una versión obsoleta, invalidar la caché pública solo después del commit y distinguir un fallo de invalidación de un fallo de persistencia.
* **RF-16.4: Periodos Por Mes.** Experiencia y educación deben capturar y mostrar periodos por mes y año. Cada registro debe declarar explícitamente si continúa vigente; si no está vigente, debe incluir un mes final, sin presuponer que exista empleo o formación actual.
* **RF-17: Gestión de Chats.** El CMS debe permitir buscar y visualizar conversaciones con sus mensajes, fuentes y contexto; eliminarlas y fijar conversaciones completas o mensajes individuales.
* **RF-17.1: Chat Global Contextual.** Una burbuja independiente de los proyectos debe responder sobre el perfil público y los proyectos visibles. La sección/proyecto observado es solo una pista: la pregunta explícita y el historial prevalecen; ante ambigüedad se pide aclaración.
* **RF-17.2: Funciones Automáticas.** La IA debe inferir el tema del mensaje y ejecutar funciones públicas permitidas para consultar información específica, buscar proyectos y devolver acciones al CV, repositorios, demos y redes sociales. Las peticiones combinadas se resuelven sin un selector de tema ni preguntas adicionales cuando la intención es clara. Los enlaces se validan y resuelven en el servidor.

### 2.5 Módulo de Retención y Continuidad de Sesión
* **RF-18: Identificación de Invitados.** Al iniciar expresamente el chat, tras un aviso comprensible, el sistema debe asignar un identificador opaco impredecible en una cookie funcional HttpOnly/Secure. Solo su hash se guarda en la base; abrir la burbuja no crea cookies ni conversaciones.
* **RF-19: Recuperación de Contexto.** Una cookie válida debe permitir recuperar el historial previo del visitante.
* **RF-20: Política de Retención.** Los mensajes sin fijar vencen a las 72 horas desde su creación y se eliminan por mantenimiento periódico. Los fijados o pertenecientes a una conversación fijada se conservan. No se reviven mensajes vencidos al fijar después su conversación.
* **RF-20.1: Continuidad Y Fallos.** Una cookie válida permite retomar el historial propio. El guardado precede a la generación de IA, las peticiones son idempotentes y una respuesta fallida puede reintentarse sin duplicar mensajes.

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
* **RNF-10:** GitHub Actions debe verificar el código y publicar la imagen en GHCR solo desde `main`; Vercel debe desplegar Preview efímeros desde `feature/*`, el Preview estable desde `develop` y Production desde `main`.
* **RNF-11:** La primera migración debe verificar que pgvector esté habilitado sin fijar tablas ni dimensiones de embeddings antes de seleccionar el modelo utilizado por el módulo RAG.
