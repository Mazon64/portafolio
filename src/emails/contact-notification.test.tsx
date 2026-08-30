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
    expect(html).toContain("DAVID ARANDA");
    expect(html).toContain("Ada &lt;Lovelace&gt;");
    expect(html).toContain("&lt;script&gt;alert");
    expect(html).not.toContain('<script>alert("test")</script>');
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
