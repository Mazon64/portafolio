-- Synchronize the known seed records after earlier values diverged from the seed text.
UPDATE "ProfileTranslation" AS translation
SET
  "longBio" = CASE translation."locale"
    WHEN 'es' THEN $es$Soy ingeniero de software especializado en desarrollo backend, arquitectura de sistemas e integración de inteligencia artificial. He desarrollado aplicaciones empresariales y sistemas institucionales, desde el diseño hasta el despliegue en producción.

Trabajo con Node.js, bases de datos relacionales, APIs, Docker y arquitecturas modulares. Priorizo la mantenibilidad, la seguridad y la escalabilidad. He implementado sistemas de autenticación multi-tenant y federada, diseñado APIs seguras e integrado modelos de lenguaje (LLMs) en aplicaciones empresariales mediante ingeniería de prompts, programación determinista con LLMs y contexto en tiempo real.$es$
    WHEN 'en' THEN $en$I am a software engineer specializing in backend development, system architecture, and artificial intelligence integration. I have developed enterprise and institutional applications from initial design through production deployment.

I work with Node.js, relational databases, APIs, Docker, and modular architectures. I prioritize maintainability, security, and scalability. I have implemented multi-tenant and federated authentication systems, designed secure APIs, and integrated Large Language Models (LLMs) into enterprise applications using prompt engineering, deterministic LLM programming, and real-time context.$en$
  END,
  "contactText" = CASE translation."locale"
    WHEN 'es' THEN '¿Quieres hablar sobre una oportunidad, una colaboración o un proyecto? Cuéntame los detalles en el formulario y te responderé lo antes posible.'
    WHEN 'en' THEN 'Would you like to discuss an opportunity, collaboration, or project? Share the details in the form and I will get back to you as soon as possible.'
  END
FROM "Profile" AS profile
WHERE translation."profileId" = profile."id"
  AND profile."slug" = 'main-profile'
  AND translation."locale" IN ('es', 'en');

UPDATE "ExperienceTranslation" AS translation
SET "description" = CASE translation."locale"
  WHEN 'es' THEN 'Desarrollé y mantuve el backend de una plataforma institucional para gestionar flujos de trabajo en la Dirección General de Innovación y Emprendimiento de la Universidad de Colima. Implementé APIs con Node.js y Express.js, integré inicio de sesión único (SSO), trabajé con persistencia relacional y preparé el entorno de ejecución con Docker.'
  WHEN 'en' THEN 'I developed and maintained the backend of an institutional workflow management platform for the General Directorate of Innovation and Entrepreneurship at the University of Colima. I implemented APIs with Node.js and Express.js, integrated Single Sign-On (SSO), worked with relational data, and prepared the runtime environment with Docker.'
END
FROM "Experience" AS experience
WHERE translation."experienceId" = experience."id"
  AND experience."slug" = 'universidad-colima-backend-internship'
  AND translation."locale" IN ('es', 'en');
