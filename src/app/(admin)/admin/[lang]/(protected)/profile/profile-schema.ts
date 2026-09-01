import { z } from "zod";

import type { Locale } from "@/i18n/config";

const validationCopy = {
  es: {
    required: "Este campo es obligatorio.",
    email: "Introduce un correo válido.",
    tooLong: "El contenido excede la longitud permitida.",
  },
  en: {
    required: "This field is required.",
    email: "Enter a valid email address.",
    tooLong: "The content exceeds the allowed length.",
  },
} as const;

export function createProfileSchema(locale: Locale) {
  const message = validationCopy[locale];
  const requiredText = (maximum: number) =>
    z
      .string()
      .trim()
      .min(1, message.required)
      .max(maximum, message.tooLong);

  return z.object({
    updatedAt: z.iso.datetime(),
    fullName: requiredText(160),
    email: z
      .string()
      .trim()
      .max(320, message.tooLong)
      .refine(
        (value) => value === "" || z.email().safeParse(value).success,
        message.email,
      ),
    esTitle: requiredText(200),
    esLongBio: requiredText(8_000),
    esContactText: requiredText(1_500),
    enTitle: requiredText(200),
    enLongBio: requiredText(8_000),
    enContactText: requiredText(1_500),
  });
}
