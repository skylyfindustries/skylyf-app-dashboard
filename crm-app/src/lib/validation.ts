import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().trim().min(1, "Email is required").email("Enter a valid email address"),
  password: z.string().min(1, "Password is required").min(6, "Password must be at least 6 characters"),
});

export const userSchema = (isEdit: boolean) =>
  z.object({
    name: z.string().trim().min(2, "Name must be at least 2 characters").max(80, "Name is too long"),
    email: z.string().trim().min(1, "Email is required").email("Enter a valid email address"),
    password: isEdit
      ? z.string().refine((v) => v === "" || v.length >= 6, "Password must be at least 6 characters")
      : z.string().min(6, "Password must be at least 6 characters"),
    role: z.string().min(1, "Select a role"),
    phone: z
      .string()
      .trim()
      .refine((v) => v === "" || /^\+?[0-9\s-]{7,15}$/.test(v), "Enter a valid phone number"),
    department: z.string().trim().max(60, "Department is too long"),
  });

/** Returns a field → message map, or null when valid. */
export function fieldErrors<T>(schema: z.ZodType<T>, data: unknown): Record<string, string> | null {
  const r = schema.safeParse(data);
  if (r.success) return null;
  const out: Record<string, string> = {};
  for (const i of r.error.issues) out[String(i.path[0])] ??= i.message;
  return out;
}
