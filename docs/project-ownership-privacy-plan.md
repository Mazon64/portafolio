# Plan De Propiedad, Participación Y Privacidad De Proyectos

**Estado: propuesta de diseño; no implementada.** No habilita repositorios privados
ni cambia permisos o datos publicados. La integración actual sigue siendo pública.

## 1. Objetivo

Representar tanto proyectos propios como colaboraciones, trabajos empresariales,
encargos y contribuciones open source. La ficha explica qué es el proyecto y su
estado general, pero centra la narrativa profesional en lo que David hizo realmente.
Cada dato publicado debe respetar la política del proyecto, independientemente de
que GitHub permita leer el repositorio.

El repositorio sigue sin necesitar archivos especiales para el portafolio. Propiedad,
participación, permisos de divulgación y marca se configuran en el servicio.

## 2. Dimensiones Independientes

1. **Relación con el proyecto:** propio, copropiedad, empleado, prácticas,
   contratista/freelance, colaborador open source, equipo académico/comunitario o
   derivado/fork. Puede haber varias relaciones y periodos en un mismo proyecto.
2. **Titularidad:** persona, equipo, empresa, cliente u organización. El propietario
   de un repositorio GitHub no demuestra por sí solo autoría exclusiva del producto.
3. **Acceso a las fuentes:** público, privado, interno de organización, sin acceso
   o sin repositorio. Se registra por fuente, no se confunde con la visibilidad web.
4. **Divulgación:** completa, selectiva con identidad, anonimizada, borrador interno
   o excluida. Un embargo añade una fecha mínima de publicación; no autoriza datos.
5. **Estado:** ciclo de vida del proyecto, estado de mi participación y estado de
   publicación/sincronización son distintos. Un proyecto puede seguir activo cuando
   mi colaboración ya terminó, o tener una ficha publicada con sincronización pausada.

Los presets simplifican la configuración, pero se guardan estas dimensiones por
separado. Un cambio de público a privado nunca amplía automáticamente permisos.

## 3. Casos Cubiertos

| Caso | Presentación | Fuente y atribución |
| --- | --- | --- |
| Propio y público | Nombre y enlaces reales; identidad propia; estado global y aportación | Generación automática desde fuentes públicas; no atribuir dependencias o trabajo ajeno como propio |
| Propio y privado | Identidad real o alias; código oculto; detalles elegidos | Conector privado opcional y política explícita de divulgación |
| Copropiedad/equipo | Proyecto compartido y rol personal | Separar logros colectivos de responsabilidades individuales |
| Empresa/cliente identificable | Nombre y/o logo autorizados; título real o descriptivo | Describir mi trabajo sin asumir que soy dueño del producto ni publicar código interno |
| Empresa/cliente anonimizado | Sector o contexto general permitido; título genérico | Ocultar también logos, dominios, slugs, capturas, nombres de archivos y métricas que identifiquen indirectamente |
| Open source ajeno | Estado general público, marca y enlaces permitidos; sección de contribuciones | PRs, revisiones, issues, documentación y cambios propios como evidencia |
| Fork/derivado | Identificar el proyecto base cuando sea publicable y describir mis modificaciones | No contar historial importado como aportación propia; distinguir mantener un fork de crear el original |
| Académico/comunitario | Proyecto de equipo con rol, periodo y entregables propios | Reconocer colaboración; instituciones y personas solo según la configuración |
| Sin acceso o sin repo | Caso profesional basado en fuentes públicas o una declaración del administrador | No inventar telemetría; no fingir verificación desde código inaccesible |
| Completamente confidencial | No se agrega | Si uno existente pasa a ese nivel, se retira de las superficies externas y se detiene su procesamiento según la política |

Empresa empleadora y cliente pueden ser entidades diferentes. Su nombre y logo se
configuran independientemente: tener permiso para nombrar a la empleadora no implica
poder identificar a su cliente.

## 4. Política De Campos Y Destinos

Cada campo admite una modalidad adecuada: real, versión generalizada/alias u oculto.

- Título del proyecto: real, alias o descriptor neutro; el slug público se genera
  desde la identidad autorizada y nunca hereda un nombre confidencial del repo.
- Organización/cliente: nombre, sector y relación; cada uno puede omitirse.
- Marca: logo del proyecto y logo de la organización son recursos distintos.
- Participación: rol, periodo, responsabilidades, contribuciones y resultados.
- Descripción general, tecnologías, arquitectura y decisiones técnicas.
- Estado, hitos, progreso, fechas, métricas e impacto.
- Capturas, diagramas, demo, enlace al repositorio y referencias externas.
- Código y citas: por defecto no se publican fragmentos ni rutas privadas.

La política también define destinos: portafolio, chat, CV público y documentos
privados exportables (ATS/cartas). La administración interna no equivale a publicación.
El chat nunca tiene más información que su proyección pública autorizada. Exportar
un ATS puede requerir una selección distinta de la web, sin habilitar acceso al
contexto interno completo por defecto.

Los logos no se infieren automáticamente del avatar de una organización. Se eligen
de recursos permitidos o se cargan desde el CMS; pueden faltar sin afectar la ficha.
Una identidad anonimizada excluye los logos identificables y contempla también
texto visible en imágenes, alt text, metadatos y nombres de archivo.

## 5. Narrativa Y Atribución

La ficha tiene dos bloques diferenciados:

**Sobre el proyecto:** propósito, problema, capacidades y estado general permitido.

**Mi participación:** rol, periodo, responsabilidades, contribuciones, decisiones y
resultados personales, en primera persona y con un alcance explícito.

Ejemplo: «La plataforma administra procesos institucionales. Durante mis prácticas
desarrollé APIs del módulo de solicitudes e integré su autenticación». No convertir
esto en «Desarrollé toda la plataforma».

El servicio relaciona la cuenta GitHub por ID estable y permite vincular otras
identidades verificadas. Usa PRs, commits, coautoría, revisiones, issues, documentación
y declaraciones administrativas para detectar aportaciones. La cantidad de commits,
ser administrador del repo o aparecer en CODEOWNERS no demuestra liderazgo ni
responsabilidad sobre todas las funcionalidades. Las revisiones y el trabajo sin
commits propios también cuentan cuando están documentados.

Las declaraciones manuales se distinguen de la evidencia verificable en GitHub. Si
no se puede atribuir una capacidad a David, puede aparecer como capacidad del
proyecto, pero no como logro personal. Los periodos declarados prevalecen sobre
inferencias de empleo o colaboración basadas solo en la fecha del último commit.

## 6. Hitos Y Avance

- Dos ámbitos: `PROJECT` para objetivos globales y `CONTRIBUTION` para los personales.
- Cada objetivo conserva ID, evidencia, estado y política de divulgación.
- La IA genera y reevalúa ambos a partir de las fuentes permitidas, conservando el
  estado no verificado cuando falte evidencia.
- No se presenta el avance global como porcentaje de mi trabajo, ni la cantidad de
  commits como porcentaje de autoría.
- Los hitos privados se pueden ocultar o generalizar. El porcentaje público se
  calcula solo sobre un conjunto publicable y se etiqueta con su alcance; no revela
  por diferencias el número de objetivos internos. Puede omitirse por completo.
- Un repositorio archivado no implica que un producto con varios repositorios haya
  terminado. La fuente de estado global debe ser explícita y respetar su evidencia.

## 7. Acceso Privado Y Procesamiento Con IA

Usar una **GitHub App**, separada del OAuth utilizado para iniciar sesión en el CMS:

- Instalación por cuenta/organización y selección de repositorios concretos.
- Permisos de lectura mínimos: metadatos/contenido y, para atribución, PRs e Issues.
- Tokens de instalación de corta duración, emitidos y utilizados solo en el servidor.
- Validación de que la instalación y el repositorio corresponden a la conexión.
- Webhooks de cambios y revocaciones, más reconciliación periódica de permisos.

Una empresa puede tener que autorizar la instalación. Poder iniciar sesión como
colaborador no permite conceder acceso a cualquier repositorio empresarial.

**Leer una fuente y enviarla a Gemini son permisos independientes.** La política
elige entre no usar IA para datos privados, usar solo información ya publicable o
permitir procesar fuentes privadas seleccionadas. La selección se aplica antes de
preparar prompts, embeddings o análisis visual, incluyendo exclusión de archivos.

Cuando no se autoriza el acceso o el procesamiento privado, se usa información
pública o un breve contexto permitido del administrador. No hay una forma fiable
de deducir automáticamente lo que no se puede leer ni qué autoriza una empresa.

Referencia: [tokens de instalación de GitHub App](https://docs.github.com/en/apps/creating-github-apps/authenticating-with-a-github-app/authenticating-as-a-github-app-installation).

## 8. Separación Entre Evidencia Interna Y Publicación

```text
Fuentes públicas o privadas autorizadas
  -> adquisición y evidencia interna
  -> extracción de hechos / atribución
  -> política y conjunto de hechos publicables
  -> narrativa ES/EN basada exclusivamente en esos hechos
  -> snapshot público y recursos permitidos
  -> ficha, CV y corpus RAG público
```

Las fuentes privadas nunca se insertan en el corpus consultado por el chat público.
No basta un prompt que pida guardar secretos: el generador público y su recuperación
solo reciben hechos publicables. La evidencia completa y sus enlaces privados se
conservan, si procede, en el área administrativa; las referencias externas de un
caso anonimizado apuntan a su explicación pública, no a rutas internas de GitHub.

Para imágenes privadas no se usan enlaces `raw.githubusercontent.com` con tokens.
Los recursos publicables se normalizan y copian al almacenamiento controlado del
portafolio, con nombres neutros; los internos permanecen privados. La autorización
de publicación de cada imagen precede a su distribución pública y optimización.

## 9. Automatización Y Configuración Inicial

El flujo habitual es vincular el repo, seleccionar relación/identidades, elegir un
preset de divulgación y confirmar marca y campos permitidos. Los presets se pueden
reutilizar por organización; no se requieren JSON ni fichas dentro de los repos.

- **Público propio o colaboración pública:** generación/publicación automáticas
  dentro del alcance elegido, con atribución personal separada del relato global.
- **Privado/selectivo/anonimizado:** configurar una vez los hechos y reglas que
  pueden salir. La narrativa pública usa solo ese conjunto. Las actualizaciones
  estructuradas ya autorizadas pueden automatizarse; nuevos hechos privados o una
  ampliación del alcance quedan pendientes de autorización, no se publican por una
  decisión de la IA. Un filtro de palabras no garantiza anonimización semántica.
- **Sin material procesable:** la IA redacta desde un contexto publicable mínimo;
  el servicio no exige redactar toda la ficha, pero tampoco inventa información.

Se muestra qué cambió, qué está publicado y qué quedó fuera. Permisos de divulgación
son decisiones humanas; sincronización, redacción, traducción e hitos siguen siendo
trabajo automático del servicio.

## 10. Datos Y Cambios En La Arquitectura

Modelo propuesto, a concretar antes de migrar:

| Entidad | Responsabilidad |
| --- | --- |
| `Project` | Identidad interna, identidad pública y ciclo de vida del producto |
| `ProjectRepository` | Cero o más repositorios por proyecto, acceso, instalación y configuración de sincronización |
| `ProjectOrganization` | Empleadora, cliente, titular o equipo y su presentación permitida |
| `ProjectParticipation` | Roles, periodos, identidades y alcance de la contribución personal |
| `ProjectDisclosurePolicy` | Reglas por dato, fuente, IA y destino; revisión/hash de política |
| `ProjectEvidence` | Hechos y evidencia interna con procedencia y atribución |
| `ProjectPublication` | Snapshot sanitizado ES/EN ligado a la política vigente |
| `ProjectMedia` | Recursos internos/publicables y política de marca |

Se pueden conservar JSONB tipados para contenido flexible, pero identidad, permisos,
conexiones y referencias de publicación necesitan relaciones explícitas. Los
fragmentos RAG públicos se relacionan únicamente con publicaciones permitidas.

Puntos actuales a modificar: `ProjectIntegration` es uno a uno con `Project`;
`getRepository()` rechaza privados; `githubJson()` usa un token global opcional;
el worker fija URLs públicas y publica fuentes originales; el DAL del chat consulta
`ProjectKnowledgeChunk` directamente. El soporte privado requiere esa separación,
no solamente retirar la comprobación `repository.private`.

## 11. Cambios De Política Y Revocación

Cada trabajo registra la política y configuración observadas. Antes de publicar
comprueba que sigan vigentes; una tarea antigua nunca puede restaurar datos retirados.
Al restringir permisos se bloquea la publicación afectada inmediatamente, se invalida
la caché y se regeneran o retiran las salidas. No se espera únicamente al TTL.

La retirada cubre ficha, búsquedas, metadatos SEO, JSON enviado al navegador, fuentes,
imágenes, CV ya generados, corpus vectorial y respuestas almacenadas del asistente
dependientes de esa publicación. Los mensajes antiguos no pueden reintroducir datos
retirados en el contexto del modelo. Los documentos generados necesitan registrar
sus proyectos/políticas de origen para poder invalidarlos.

Un cambio de visibilidad del repo o revocación de la App pausa la adquisición y
revalida la publicación según su política. Pasar a público no concede permisos de
marca ni de autoría automáticamente. Los archivos ya descargados o entregados fuera
del servicio no se pueden retirar retroactivamente.

## 12. Entrega Por Fases

1. **Dominio y publicación:** relación, participación, políticas, identidad pública,
   proyección única para ficha/chat/CV y compatibilidad de los proyectos existentes.
   No inferir que todos los proyectos actuales son de autoría exclusiva.
2. **Colaboraciones públicas:** detección de contribuciones, relatos global/personal,
   hitos por ámbito y plantillas de presentación. Validar forks y coautoría.
3. **Fuentes privadas:** GitHub App, selección de repositorios, adquisición aislada,
   permiso de IA, reglas de hechos publicables y revocación. Mantener deshabilitado
   el acceso privado hasta superar las pruebas de separación de datos.
4. **Marca y casos selectivos:** logos, recursos controlados, empresa/cliente por
   separado, anonimización y proyectos sin repositorio accesible.
5. **Operación:** cambios de política, reindexación, documentos derivados, estados
   pendientes y observabilidad sin contenido confidencial en logs.

Cada fase con DDL sigue expand-contract: esquema compatible desde `main` por el
workflow protegido, después código dependiente. Preview conserva lectura, sin
migraciones, ingestión privada, llamadas a Gemini ni escrituras en la base compartida.

## 13. Criterios De Aceptación

- Un proyecto público ajeno muestra el estado global y solo atribuye a David su aporte.
- Un fork no atribuye a David el historial del proyecto original.
- Un proyecto empresarial puede mostrar nombre sin logo, logo autorizado con identidad,
  o una presentación anonimizada sin identificadores indirectos.
- Un caso sin título publicable usa un descriptor neutro y slug coherente.
- Un proyecto privado no filtra URLs, rutas, texto, imágenes ni embeddings internos
  por la ficha, el chat, el CV, un error o una respuesta cacheada.
- El modo sin IA privada no envía código ni capturas privadas a Gemini.
- Un cambio de política durante un trabajo impide publicar con permisos antiguos.
- Revocar una fuente o retirar un hecho actualiza también documentos y respuestas
  previas controladas por el servicio, no solo el componente visual.
- La ausencia de fuentes suficientes produce omisión o estado no verificado.
- Ningún caso requiere un manifiesto de portafolio dentro del repositorio de origen.
