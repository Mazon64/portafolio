import { describe, expect, it } from "vitest";
import { render } from "react-email";

import {
  ContactNotificationEmail,
  getContactEmailSubject,
  getContactEmailText,
} from "./contact-notification";

const message = {
  locale: "es" as const,
  name: "Ada <Lovelace>",
  email: "ada@example.com",
  message: '<script>alert("test")</script>\nProyecto interesante.',
};

describe("contact notification email", () => {
  it("renders localized editorial content and escapes visitor input", async () => {
    const html = await render(ContactNotificationEmail(message));

    expect(html).toContain("Nuevo mensaje");
    expect(html).toContain("David Aranda.");
    expect(html).toContain("https://davidaranda.dev/brand/avatar.png");
    expect(html).toContain("PORTAFOLIO / CONTACTO");
    expect(html).toContain("Ada &lt;Lovelace&gt;");
    expect(html).toContain("&lt;script&gt;alert");
    expect(html).not.toContain('<script>alert("test")</script>');
  });

  it("keeps English branding and the visitor reply destination", async () => {
    const html = await render(ContactNotificationEmail({ ...message, locale: "en" }));
    expect(html).toContain("PORTFOLIO / CONTACT");
    expect(html).toContain('href="mailto:ada@example.com"');
    expect(html).not.toContain("<svg");
  });

  it("provides localized subjects and plain text", () => {
    expect(getContactEmailSubject("es", "Ada\nLovelace")).toBe(
      "Nuevo mensaje del portafolio: Ada Lovelace",
    );
    expect(getContactEmailSubject("en", "Ada Lovelace")).toBe(
      "New portfolio message: Ada Lovelace",
    );
    expect(getContactEmailText(message)).toContain(
      "Enviado desde la versión en español",
    );
  });
});
