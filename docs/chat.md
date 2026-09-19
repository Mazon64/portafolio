# Chat Contextual Y Conversaciones

## Experiencia Pública

Una única burbuja acompaña las páginas públicas ES/EN y el CV. No hay formularios
de consulta dentro del contenido de cada proyecto. Cuando se abre un proyecto,
la misma burbuja se aloja visualmente sobre su modal para seguir siendo accesible;
mantiene la conversación y no se convierte en un chat exclusivo de ese proyecto.
Escape cierra primero el chat y después el modal. El chat no aparece al imprimir.

El contexto se observa localmente: ruta pública, sección visible y slug del
proyecto abierto. Se envía únicamente junto con un mensaje, no como seguimiento
continuo de navegación. El router semántico prioriza la pregunta explícita, después
el tema de la conversación y finalmente la pantalla como pista. Preguntar por
David mientras se ve un proyecto sigue siendo una consulta personal. Referencias
ambiguas entre proyectos provocan una aclaración. Los slugs se contrastan con el
catálogo visible; no se usan URLs ni identificadores arbitrarios del cliente.

## Fuentes Y Alcance

Las respuestas sobre David usan exclusivamente perfil, experiencia, educación,
habilidades y contacto públicos. Las consultas de proyectos pueden recuperar
fragmentos de cualquier corpus publicado/visible pertinente, no solo del proyecto
abierto. La pregunta y el historial propio son contexto no confiable, no fuentes
para inventar hechos sobre el propietario. No se consulta `AiContext`, documentos
privados ni conversaciones de otros visitantes.

El router y la respuesta usan JSON validado de Gemini. Las citas se resuelven en
el servidor contra fuentes suministradas. Se verifica de nuevo la visibilidad de
los proyectos/corpus citados antes de completar una respuesta. Ante falta de
evidencia se pide aclaración o se informa de la limitación. El chat no persiste ni
indexa sus mensajes en el corpus público de proyectos.

## Cookie Y Aviso

Abrir la burbuja realiza una lectura y no crea identificador ni conversación.
Antes de iniciar se explica, en el mismo estilo visual del sitio, que Gemini genera
las respuestas, que se usa una cookie para retomar el chat, que el administrador
puede leerlo y que los mensajes vencen a los tres días salvo los fijados.
Los botones son **Iniciar chat** y **Ahora no**. No se añade un banner de cookies
publicitarias ni se condiciona el uso del portafolio a iniciar una conversación.

El servidor exige aceptación afirmativa para crear la cookie funcional. En
Production se denomina `__Host-portfolio-chat`, es `HttpOnly`, `Secure`, `SameSite=Lax`,
sin Domain y con Path `/`. Contiene 32 bytes aleatorios, no el UUID público de la
conversación. La base guarda solamente SHA-256 del identificador. La continuidad
vence después de tres días sin mensajes aceptados; al iniciar una conversación
nueva se retira la asociación anterior y se mantiene su retención independiente.
El identificador estable evita que una respuesta antigua sobrescriba la cookie
de una conversación recién iniciada en otra pestaña.

## Persistencia Y Aislamiento

Se utiliza el PostgreSQL existente, no un servicio MongoDB adicional:

- `ChatConversation`: identificador almacenado como hash, idioma, continuidad, fijado y lease.
- `ChatTurn`: ID de solicitud idempotente, contexto observado, tema resuelto y estado.
- `ChatMessage`: pregunta/respuesta, fuentes, timestamps y fijado individual.

Las tablas tienen RLS habilitado y no conceden acceso a roles públicos de Supabase.
El rol servidor/migrador `prisma` es propietario; la autorización por visitante se
aplica en el DAL mediante cookie. Cada consulta/mutación administrativa exige
GitHub OAuth y la whitelist, independientemente del layout.

El mensaje del visitante se guarda antes de llamar a IA. La generación ocurre
fuera de la transacción. Un lease de cinco minutos serializa las respuestas de una
conversación; la respuesta solo se guarda si sigue siendo dueño del lease. Repetir
el mismo request ID devuelve el resultado guardado o el estado pendiente, sin
duplicar mensajes. Reutilizarlo con otro contenido se rechaza. Un fallo de proveedor
conserva la pregunta y permite reintentar. Las conversaciones nunca se recuperan
mediante un UUID enviado en el cuerpo: solo mediante la cookie válida.

## Retención De Tres Días

Cada mensaje sin fijar vence exactamente a las 72 horas de su creación. El plazo
no se reinicia para mensajes antiguos al añadir mensajes nuevos. Una conversación
fijada conserva todos sus mensajes; fijar un mensaje conserva ese mensaje. El
administrador puede desfijar o eliminar explícitamente incluso contenido fijado.

Las lecturas públicas y administrativas excluyen inmediatamente lo vencido. La
limpieza física se ejecuta por `Chat Retention` cada quince minutos (sujeto al
scheduler) y por el cron diario de Vercel. El endpoint procesa lotes acotados,
elimina mensajes caducados, turnos vacíos y conversaciones vacías vencidas. Usa
los mismos locks de conversación que el fijado para impedir carreras. Fijar una
conversación no revive mensajes que ya habían vencido.

No se duplican mensajes en títulos/resúmenes permanentes. La vista administrativa
calcula el extracto desde mensajes todavía visibles. Los códigos de fallo no
contienen texto del visitante ni secretos del proveedor.

## Administración

`/admin/[lang]/conversations` lista conversaciones por actividad, permite buscar
mensajes y filtrar fijados. El detalle muestra el intercambio cronológico, fuentes,
contexto de navegación y tema interpretado. Se puede fijar conversación o mensaje
y eliminar el hilo completo. Las mutaciones comprueban timestamps para rechazar
pestañas obsoletas. La navegación funciona también en móvil.

## Activación Y Operación

La interfaz se entrega a `develop` antes de activar el servicio: Preview muestra la
burbuja, el aviso de cookie, el contexto observado y el nuevo modal. El botón de
inicio permanece deshabilitado y el servidor no crea cookies, mensajes ni llamadas
a Gemini. Administración conserva su cabecera y filtros si falta la migración,
con un aviso explícito y sin conversaciones simuladas. Esto permite revisar el
diseño sin ejecutar migraciones en Preview.

1. Promover y aplicar primero `20260915100000_contextual_chat` mediante el workflow
   protegido desde `main`. La migración es expand-only, sin datos de prueba. La
   promoción del esquema usa el snapshot revisado de `develop` que contiene solo
   la migración, antes de promover la aplicación dependiente a Production.
2. Desplegar la aplicación y configurar `CHAT_ENABLED=true` en Production junto
   con `CMS_WRITES_ENABLED=true` y Gemini. Preview debe mantener `CHAT_ENABLED=false`;
   el código bloquea allí sesiones, cookies nuevas, mensajes y limpieza.
3. `PROJECT_RAG_ENABLED` controla la recuperación vectorial de fuentes de proyectos.
   El chat personal y la política de retención son independientes de la sincronización.
4. `Chat Retention` reutiliza el secret de GitHub `PROJECT_SYNC_CRON_SECRET`, cuyo
   valor coincide con `CRON_SECRET` de Vercel. La limpieza no requiere Gemini ni el
   flag de chat activo. El único requisito operacional es permitir escrituras de
   mantenimiento en Production.
5. Verificar consentimiento, cookie, reanudación, pregunta personal con proyecto
   abierto, cambio explícito de proyecto, referencia ambigua, fijado y expiración.

Las cuotas separan creación de sesiones y mensajes, protegen identificadores con
HMAC y se almacenan en contadores temporales. El límite inicial de mensajes es ocho
por cliente/minuto, treinta globales/minuto y doscientos globales/día. No son cookies
de analítica. Los mensajes se envían a Gemini para responder; la retención descrita
aquí corresponde al almacenamiento de esta aplicación.
