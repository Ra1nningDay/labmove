import { z } from "zod";

// Common reusable validators
export const ISODateTimeString = z
  .string()
  .refine((v) => !Number.isNaN(Date.parse(v)), {
    message: "Invalid ISO datetime",
  });

export const ThaiPhone = z
  .string()
  .trim()
  .regex(/^(\+66|0)\d{8,9}$/u, { message: "Invalid Thai phone" });

export const NonEmptyString = z.string().trim().min(1);

export type ValidationErrorItem = {
  path: string;
  message: string;
};

export function formatZodError(e: unknown): ValidationErrorItem[] {
  if (e && typeof e === "object" && "issues" in e) {
    const err = e as z.ZodError;
    return err.issues.map((i) => ({
      path: i.path.join("."),
      message: i.message,
    }));
  }
  return [{ path: "_", message: "Validation failed" }];
}

