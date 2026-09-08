-- Update only unchanged seeded copy so later editorial changes remain intact.
UPDATE "ProfileTranslation"
SET "longBio" = $copy$Soy ingeniero de software especializado en desarrollo backend, arquitectura de sistemas e integración de inteligencia artificial. He desarrollado aplicaciones empresariales y sistemas institucionales, desde el diseño hasta el despliegue en producción.

Trabajo con Node.js, bases de datos relacionales, APIs, Docker y arquitecturas modulares. Priorizo la mantenibilidad, la seguridad y la escalabilidad. He implementado sistemas de autenticación multi-tenant y federada, diseñado APIs seguras e integrado modelos de lenguaje (LLMs) en aplicaciones empresariales mediante ingeniería de prompts, programación determinista con LLMs y contexto en tiempo real.$copy$
WHERE "locale" = 'es'
  AND "longBio" = $previous$Ingeniero de Software especializado en desarrollo backend, arquitectura de sistemas e integración de inteligencia artificial. Experiencia construyendo aplicaciones empresariales y sistemas institucionales desde el diseño hasta su despliegue en producción.

Trabajo con Node.js, bases de datos relacionales, APIs, Docker y arquitecturas modulares, con énfasis en mantenibilidad, seguridad y escalabilidad. He implementado sistemas de autenticación multi-tenant y federada, diseñado APIs seguras e integrado modelos de lenguaje (LLMs) en aplicaciones empresariales mediante prompt engineering, programación determinista de LLMs y arquitecturas de IA con contexto en tiempo real.$previous$;

UPDATE "ProfileTranslation"
SET "longBio" = $copy$I am a software engineer specializing in backend development, system architecture, and artificial intelligence integration. I have developed enterprise and institutional applications from initial design through production deployment.

I work with Node.js, relational databases, APIs, Docker, and modular architectures. I prioritize maintainability, security, and scalability. I have implemented multi-tenant and federated authentication systems, designed secure APIs, and integrated Large Language Models (LLMs) into enterprise applications using prompt engineering, deterministic LLM programming, and real-time context.$copy$
WHERE "locale" = 'en'
  AND "longBio" = $previous$Software Engineer specialized in backend development, system architecture, and artificial intelligence integration. Experienced in building enterprise and institutional applications from initial design to production deployment.

I work with Node.js, relational databases, APIs, Docker, and modular architectures, with a strong focus on maintainability, security, and scalability. I have implemented multi-tenant and federated authentication systems, designed secure APIs, and integrated Large Language Models (LLMs) into enterprise applications using prompt engineering, deterministic LLM programming, and architectures that provide real-time contextual information.$previous$;

UPDATE "ProfileTranslation"
SET "contactText" = '¿Quieres hablar sobre una oportunidad, una colaboración o un proyecto? Cuéntame los detalles en el formulario y te responderé lo antes posible.'
WHERE "locale" = 'es'
  AND "contactText" IN (
    '¿Tienes una oportunidad, una colaboración o una idea por construir? Escríbeme y conversemos.',
    '¿Tienes una oportunidad, una colaboración o una idea por construir? Cuéntame los detalles en el formulario y te responderé lo antes posible.'
  );

UPDATE "ProfileTranslation"
SET "contactText" = 'Would you like to discuss an opportunity, collaboration, or project? Share the details in the form and I will get back to you as soon as possible.'
WHERE "locale" = 'en'
  AND "contactText" IN (
    'Have an opportunity, a collaboration, or an idea worth building? Send me a message and let''s talk.',
    'Have an opportunity, a collaboration, or an idea worth building? Share the details in the form and I will get back to you as soon as possible.'
  );

UPDATE "ExperienceTranslation"
SET "description" = 'Desarrollé y mantuve el backend de una plataforma institucional para gestionar flujos de trabajo en la Dirección General de Innovación y Emprendimiento de la Universidad de Colima. Implementé APIs con Node.js y Express.js, integré inicio de sesión único (SSO), trabajé con persistencia relacional y preparé el entorno de ejecución con Docker.'
WHERE "locale" = 'es'
  AND "description" = 'Desarrollo y mantenimiento del backend de una plataforma institucional para gestionar flujos de trabajo en la Dirección General de Innovación y Emprendimiento de la Universidad de Colima. Implementación de APIs con Node.js y Express.js, integración de inicio de sesión único (SSO), persistencia relacional y preparación del entorno de ejecución con Docker.';

UPDATE "SkillCategoryTranslation"
SET "title" = CASE "title"
  WHEN 'Desarrollo de Software' THEN 'Desarrollo de software'
  WHEN 'Infraestructura y Entrega' THEN 'Infraestructura y entrega'
  WHEN 'Habilidades de Ingeniería' THEN 'Habilidades de ingeniería'
END
WHERE "locale" = 'es'
  AND "title" IN ('Desarrollo de Software', 'Infraestructura y Entrega', 'Habilidades de Ingeniería');
