# Identidad de correo

La notificación automática de contacto (`src/emails/contact-notification.tsx`)
usa el isotipo PNG público, nombre como texto y cabecera localizada ES/EN. Su
imagen se publica junto con la aplicación en `/brand/avatar.png`; usa la URL
absoluta de producción para que pueda cargar desde los clientes de correo.
Los datos del visitante siguen escapados y el botón responde a su dirección.

Las firmas personales se prepararon para `contacto@davidaranda.dev` y
`david@davidaranda.dev`: normal para nuevos mensajes, compacta para respuestas.
Incluyen nombre, cargo, correo y web; la normal añade LinkedIn y GitHub.
El HTML usa tablas, estilos inline y PNG remoto (no SVG ni fuentes web).
Los recursos entregados se mantienen fuera del repositorio como paquete local.

Google Workspace distingue dos recursos:
- Logo de organización: imagotipo PNG 320 × 132 px, desde Cuenta → Configuración
  de la cuenta → Personalización. Visible dentro de la organización.
- Foto de cuenta: isotipo cuadrado PNG 512 × 512 px.

Fuente: https://knowledge.workspace.google.com/admin/getting-started/add-your-logo-to-google-workspace

Las firmas se pegan renderizadas en Gmail y se asignan a cada dirección de envío.
No se modificaron las cuentas ni los parámetros de entrega de correo.
