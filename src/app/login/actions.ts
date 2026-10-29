"use server";

import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { z } from "zod";
import { createClient, createServiceClient } from "@/lib/supabase/server";

export type FormState = { error?: string; ok?: string } | undefined;

const creds = z.object({
  email: z.email("Ingrese un correo válido."),
  password: z.string().min(8, "La contraseña debe tener al menos 8 caracteres."),
});

export async function signIn(_: FormState, form: FormData): Promise<FormState> {
  const parsed = creds.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error) return { error: "Correo o contraseña incorrectos." };
  redirect("/tablero");
}

/** Crea la cuenta del Director General. Solo funciona mientras no exista ningún usuario. */
export async function bootstrapMd(_: FormState, form: FormData): Promise<FormState> {
  const parsed = creds.extend({ full_name: z.string().trim().min(3, "Ingrese su nombre completo.") }).safeParse(Object.fromEntries(form));
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const supabase = await createClient();
  const { data: needs } = await supabase.rpc("needs_bootstrap");
  if (!needs) return { error: "La cuenta del Director General ya existe. Inicie sesión." };

  const admin = createServiceClient();
  const { error } = await admin.auth.admin.createUser({
    email: parsed.data.email,
    password: parsed.data.password,
    email_confirm: true,
    user_metadata: { full_name: parsed.data.full_name },
  });
  if (error) return { error: error.message };

  await supabase.auth.signInWithPassword({ email: parsed.data.email, password: parsed.data.password });
  redirect("/administracion?tab=ciclos&aviso=bienvenida");
}

export async function requestReset(_: FormState, form: FormData): Promise<FormState> {
  const email = z.email().safeParse(form.get("email"));
  if (!email.success) return { error: "Ingrese un correo válido." };
  const h = await headers();
  const origin = h.get("origin") ?? `https://${h.get("host")}`;
  const supabase = await createClient();
  await supabase.auth.resetPasswordForEmail(email.data, { redirectTo: `${origin}/auth/callback?next=/auth/clave` });
  return { ok: "Si el correo está registrado, recibirá un enlace para definir una nueva contraseña." };
}

export async function setPassword(_: FormState, form: FormData): Promise<FormState> {
  const pw = z.string().min(8, "La contraseña debe tener al menos 8 caracteres.").safeParse(form.get("password"));
  if (!pw.success) return { error: pw.error.issues[0].message };
  if (form.get("password") !== form.get("confirm")) return { error: "Las contraseñas no coinciden." };
  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password: pw.data });
  if (error) return { error: error.message };
  redirect("/tablero");
}
