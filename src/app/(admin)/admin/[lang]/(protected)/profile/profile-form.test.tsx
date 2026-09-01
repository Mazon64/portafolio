import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("./actions", () => ({ updateProfileAction: vi.fn() }));

import { adminCopy } from "@/i18n/admin";
import { ProfileForm } from "./profile-form";

describe("ProfileForm", () => {
  it("renders shared fields and both required translations", () => {
    const html = renderToStaticMarkup(
      <ProfileForm
        locale="en"
        copy={adminCopy.en.profile}
        profile={{
          updatedAt: "2026-08-31T20:00:00.000Z",
          fullName: "Ada Lovelace",
          email: "ada@example.com",
          es: {
            title: "Ingeniera",
            longBio: "Biografía",
            contactText: "Hablemos",
          },
          en: {
            title: "Engineer",
            longBio: "Biography",
            contactText: "Let's talk",
          },
        }}
      />,
    );

    expect(html).toContain('name="fullName"');
    expect(html).toContain('name="updatedAt"');
    expect(html).toContain('value="Ada Lovelace"');
    expect(html).toContain('name="esLongBio"');
    expect(html).toContain('name="enLongBio"');
    expect(html).toContain("Contenido en español");
    expect(html).toContain("Content in English");
  });
});
