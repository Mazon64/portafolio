import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Preview,
  Section,
  Text,
} from "react-email";

import type { Locale } from "@/i18n/config";

type ContactNotificationProps = {
  locale: Locale;
  name: string;
  email: string;
  message: string;
};

const copy = {
  es: {
    preview: (name: string) => `Nuevo mensaje de ${name} desde tu portafolio`,
    subject: (name: string) => `Nuevo mensaje del portafolio: ${name}`,
    marker: "/CONTACTO",
    title: "Nuevo mensaje",
    intro:
      "Alguien utilizó el formulario de tu portafolio. Puedes responder directamente a este correo.",
    name: "Nombre",
    email: "Correo",
    message: "Mensaje",
    reply: (name: string) => `Responder a ${name}`,
    source: "Enviado desde la versión en español de davidaranda.dev",
  },
  en: {
    preview: (name: string) => `New message from ${name} through your portfolio`,
    subject: (name: string) => `New portfolio message: ${name}`,
    marker: "/CONTACT",
    title: "New message",
    intro:
      "Someone used your portfolio contact form. You can reply directly to this email.",
    name: "Name",
    email: "Email",
    message: "Message",
    reply: (name: string) => `Reply to ${name}`,
    source: "Sent from the English version of davidaranda.dev",
  },
} as const;

export function getContactEmailSubject(locale: Locale, name: string) {
  return copy[locale].subject(name.replace(/[\r\n]/g, " "));
}

export function getContactEmailText({
  locale,
  name,
  email,
  message,
}: ContactNotificationProps) {
  const labels = copy[locale];

  return `${labels.title}\n\n${labels.name}: ${name}\n${labels.email}: ${email}\n\n${labels.message}:\n${message}\n\n${labels.source}`;
}

export function ContactNotificationEmail({
  locale,
  name,
  email,
  message,
}: ContactNotificationProps) {
  const labels = copy[locale];

  return (
    <Html lang={locale}>
      <Head />
      <Preview>{labels.preview(name)}</Preview>
      <Body style={body}>
        <Container style={shell}>
          <Section style={wordmarkSection}>
            <Text style={wordmark}>DAVID ARANDA</Text>
            <Text style={wordmarkDetail}>PORTFOLIO / MESSAGE</Text>
          </Section>

          <Section style={card}>
            <Text style={marker}>{labels.marker}</Text>
            <Heading style={heading}>{labels.title}</Heading>
            <Text style={intro}>{labels.intro}</Text>

            <Hr style={divider} />

            <Section style={metadataGrid}>
              <Text style={label}>{labels.name}</Text>
              <Text style={value}>{name}</Text>
              <Text style={label}>{labels.email}</Text>
              <Text style={value}>{email}</Text>
            </Section>

            <Text style={messageLabel}>{labels.message}</Text>
            <Section style={messagePanel}>
              <Text style={messageText}>{message}</Text>
            </Section>

            <Button href={`mailto:${email}`} style={button}>
              {labels.reply(name)}
            </Button>
          </Section>

          <Section style={footer}>
            <Text style={footerText}>{labels.source}</Text>
            <Text style={footerLink}>davidaranda.dev</Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}

const body = {
  backgroundColor: "#171717",
  color: "#171717",
  fontFamily: "Arial, Helvetica, sans-serif",
  margin: "0",
  padding: "0",
};

const shell = {
  margin: "0 auto",
  maxWidth: "620px",
  padding: "40px 16px",
};

const wordmarkSection = {
  padding: "0 8px 24px",
};

const wordmark = {
  color: "#fafafa",
  fontSize: "18px",
  fontWeight: "700",
  letterSpacing: "-0.4px",
  margin: "0",
};

const wordmarkDetail = {
  color: "#a3a3a3",
  fontFamily: "Courier New, monospace",
  fontSize: "10px",
  letterSpacing: "2px",
  margin: "6px 0 0",
};

const card = {
  backgroundColor: "#fafafa",
  border: "1px solid #e5e5e5",
  borderRadius: "18px",
  padding: "40px",
};

const marker = {
  color: "#737373",
  fontFamily: "Courier New, monospace",
  fontSize: "11px",
  letterSpacing: "1.8px",
  margin: "0 0 20px",
};

const heading = {
  color: "#171717",
  fontSize: "42px",
  fontWeight: "700",
  letterSpacing: "-2px",
  lineHeight: "1",
  margin: "0",
};

const intro = {
  color: "#525252",
  fontSize: "16px",
  lineHeight: "26px",
  margin: "20px 0 0",
};

const divider = {
  borderColor: "#d4d4d4",
  margin: "32px 0",
};

const metadataGrid = {
  margin: "0",
};

const label = {
  color: "#737373",
  fontFamily: "Courier New, monospace",
  fontSize: "10px",
  letterSpacing: "1.5px",
  margin: "0 0 6px",
  textTransform: "uppercase" as const,
};

const value = {
  color: "#171717",
  fontSize: "16px",
  fontWeight: "600",
  lineHeight: "24px",
  margin: "0 0 24px",
  wordBreak: "break-word" as const,
};

const messageLabel = {
  ...label,
  marginTop: "8px",
};

const messagePanel = {
  backgroundColor: "#ededeb",
  borderLeft: "3px solid #171717",
  borderRadius: "0 10px 10px 0",
  margin: "0 0 28px",
  padding: "18px 20px",
};

const messageText = {
  color: "#262626",
  fontSize: "16px",
  lineHeight: "26px",
  margin: "0",
  whiteSpace: "pre-wrap" as const,
  wordBreak: "break-word" as const,
};

const button = {
  backgroundColor: "#171717",
  borderRadius: "10px",
  color: "#fafafa",
  display: "inline-block",
  fontSize: "14px",
  fontWeight: "700",
  padding: "14px 20px",
  textDecoration: "none",
};

const footer = {
  padding: "22px 8px 0",
};

const footerText = {
  color: "#a3a3a3",
  fontSize: "12px",
  lineHeight: "18px",
  margin: "0",
};

const footerLink = {
  color: "#fafafa",
  fontFamily: "Courier New, monospace",
  fontSize: "11px",
  letterSpacing: "1px",
  margin: "8px 0 0",
};
