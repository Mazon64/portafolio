import type { Locale } from "./config";

export const adminCopy = {
  es: {
    metadataTitle: "Administración | David Aranda",
    brand: "ADMIN / PORTAFOLIO",
    navigation: {
      menu: "Navegación",
      menuDescription: "Gestiona el portafolio y ajusta tus preferencias.",
      close: "Cerrar menú",
      dashboard: "Resumen",
      profile: "Perfil",
      viewSite: "Ver portafolio",
      newTab: "Abre en una pestaña nueva",
      signOut: "Cerrar sesión",
    },
    preferences: {
      language: "Idioma",
      spanish: "Español",
      english: "Inglés",
      theme: "Tema",
      system: "Sistema",
      light: "Claro",
      dark: "Oscuro",
    },
    login: {
      eyebrow: "/ACCESO PRIVADO",
      title: "Acceso al panel de administración.",
      description:
        "Este espacio está protegido. Si tienes una cuenta autorizada, continúa con GitHub; de lo contrario, puedes volver al portafolio público.",
      action: "Continuar con GitHub",
      denied: "La cuenta de GitHub no está autorizada.",
      failed: "No fue posible completar el inicio de sesión.",
    },
    dashboard: {
      eyebrow: "/CENTRO DE CONTROL",
      title: "Contenido profesional",
      description:
        "Gestiona la información que alimenta el portafolio público y el CV desde una fuente bilingüe.",
      profileTitle: "Perfil principal",
      profileDescription:
        "Nombre, correo público, título, biografía y mensaje de contacto.",
      edit: "Editar perfil",
      nextTitle: "Siguientes módulos",
      nextDescription:
        "Experiencia, educación, habilidades y proyectos se incorporarán como incrementos independientes.",
    },
    profile: {
      eyebrow: "/PERFIL PRINCIPAL",
      title: "Identidad y presentación",
      description:
        "Los campos compartidos se publican en ambos idiomas. Cada traducción se guarda de forma atómica.",
      shared: "Información compartida",
      spanish: "Contenido en español",
      english: "Content in English",
      fullName: "Nombre completo",
      email: "Correo público",
      titleEs: "Título profesional",
      titleEn: "Professional title",
      bioEs: "Biografía",
      bioEn: "Biography",
      contactEs: "Mensaje de contacto",
      contactEn: "Contact message",
      save: "Guardar cambios",
      saving: "Guardando...",
      success: "El perfil se actualizó y la caché pública fue invalidada.",
      invalid: "Revisa los campos indicados.",
      failed: "No fue posible guardar el perfil.",
      disabled: "Las escrituras del CMS están deshabilitadas en este entorno.",
      conflict: "El perfil cambió en otra pestaña. Recarga la página antes de editarlo.",
      cacheError:
        "El perfil se guardó, pero la caché no pudo invalidarse. El contenido público se actualizará automáticamente.",
    },
  },
  en: {
    metadataTitle: "Administration | David Aranda",
    brand: "ADMIN / PORTFOLIO",
    navigation: {
      menu: "Navigation",
      menuDescription: "Manage the portfolio and adjust your preferences.",
      close: "Close menu",
      dashboard: "Overview",
      profile: "Profile",
      viewSite: "View portfolio",
      newTab: "Opens in a new tab",
      signOut: "Sign out",
    },
    preferences: {
      language: "Language",
      spanish: "Spanish",
      english: "English",
      theme: "Theme",
      system: "System",
      light: "Light",
      dark: "Dark",
    },
    login: {
      eyebrow: "/PRIVATE ACCESS",
      title: "Administration panel access.",
      description:
        "This area is protected. If you have an authorized account, continue with GitHub; otherwise, you can return to the public portfolio.",
      action: "Continue with GitHub",
      denied: "The GitHub account is not authorized.",
      failed: "The sign-in flow could not be completed.",
    },
    dashboard: {
      eyebrow: "/CONTROL CENTER",
      title: "Professional content",
      description:
        "Manage the information that powers the public portfolio and CV from one bilingual source.",
      profileTitle: "Main profile",
      profileDescription:
        "Name, public email, title, biography, and contact message.",
      edit: "Edit profile",
      nextTitle: "Upcoming modules",
      nextDescription:
        "Experience, education, skills, and projects will be added as independent increments.",
    },
    profile: {
      eyebrow: "/MAIN PROFILE",
      title: "Identity and presentation",
      description:
        "Shared fields are published in both languages. Every translation is saved atomically.",
      shared: "Shared information",
      spanish: "Contenido en español",
      english: "Content in English",
      fullName: "Full name",
      email: "Public email",
      titleEs: "Título profesional",
      titleEn: "Professional title",
      bioEs: "Biografía",
      bioEn: "Biography",
      contactEs: "Mensaje de contacto",
      contactEn: "Contact message",
      save: "Save changes",
      saving: "Saving...",
      success: "The profile was updated and the public cache was invalidated.",
      invalid: "Review the highlighted fields.",
      failed: "The profile could not be saved.",
      disabled: "CMS writes are disabled in this environment.",
      conflict: "The profile changed in another tab. Reload the page before editing it.",
      cacheError:
        "The profile was saved, but the cache could not be invalidated. Public content will update automatically.",
    },
  },
} as const satisfies Record<Locale, object>;

export type AdminCopy = (typeof adminCopy)[Locale];
