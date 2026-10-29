"use server";

import { randomBytes } from "node:crypto";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireMd } from "@/lib/session";
import { createServiceClient } from "@/lib/supabase/server";
import { dbError, num, text, type ActionResult } from "@/lib/actions";

export type CreateUserResult = { error?: string; ok?: string; tempPassword?: string; email?: string } | undefined;

export async function createCycle(_: ActionResult, form: FormData): Promise<ActionResult> {
  const s = await requireMd();
  const name = text(form, "name");
  if (!name) return { error: "Indique el nombre del ciclo." };
  const activate = form.get("activate") === "on";
  if (activate) {
    const { error } = await s.supabase.from("assessment_cycles").update({ is_active: false }).eq("is_active", true);
    if (error) return dbError(error);
  }
  const { error } = await s.supabase.from("assessment_cycles").insert({
    name,
    starts_on: text(form, "starts_on") ?? new Date().toISOString().slice(0, 10),
    ends_on: text(form, "ends_on"),
    company_overview: text(form, "company_overview"),
    is_active: activate,
  });
  if (error) return dbError(error);
  revalidatePath("/", "layout");
  return { ok: "Ciclo creado." };
}

export async function activateCycle(id: string) {
  const s = await requireMd();
  await s.supabase.from("assessment_cycles").update({ is_active: false }).eq("is_active", true);
  await s.supabase.from("assessment_cycles").update({ is_active: true }).eq("id", id);
  revalidatePath("/", "layout");
}

export async function updateCycle(id: string, _: ActionResult, form: FormData): Promise<ActionResult> {
  const s = await requireMd();
  const { error } = await s.supabase
    .from("assessment_cycles")
    .update({
      name: text(form, "name") ?? undefined,
      starts_on: text(form, "starts_on") ?? undefined,
      ends_on: text(form, "ends_on"),
      company_overview: text(form, "company_overview"),
    })
    .eq("id", id);
  if (error) return dbError(error);
  revalidatePath("/", "layout");
  return { ok: "Ciclo actualizado." };
}

const newUser = z.object({
  email: z.email("Correo no válido."),
  full_name: z.string().trim().min(3, "Indique el nombre completo."),
  role: z.enum(["md", "director", "lector"]),
  position: z.string().trim().optional(),
});

/**
 * Crea el usuario con una contraseña temporal que el MD entrega por un canal seguro.
 * (El SMTP por defecto de Supabase no envía correos a dominios externos.)
 */
export async function createUser(_: CreateUserResult, form: FormData): Promise<CreateUserResult> {
  const s = await requireMd();
  const parsed = newUser.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const tempPassword = randomBytes(9).toString("base64url");
  const admin = createServiceClient();
  const { data, error } = await admin.auth.admin.createUser({
    email: parsed.data.email,
    password: tempPassword,
    email_confirm: true,
    user_metadata: { full_name: parsed.data.full_name },
  });
  if (error) return { error: error.message.includes("already") ? "Ya existe un usuario con ese correo." : error.message };

  const uid = data.user.id;
  const { error: pErr } = await s.supabase
    .from("profiles")
    .update({
      full_name: parsed.data.full_name,
      role: parsed.data.role,
      position: parsed.data.position || null,
      is_executive: form.get("is_executive") === "on",
    })
    .eq("id", uid);
  if (pErr) return dbError(pErr);

  const dims = form.getAll("dims").map(String);
  if (dims.length) {
    const { error: dErr } = await s.supabase.from("director_departments").insert(dims.map((d) => ({ user_id: uid, dimension_code: d })));
    if (dErr) return dbError(dErr);
  }
  revalidatePath("/administracion");
  return { ok: "Usuario creado.", tempPassword, email: parsed.data.email };
}

export async function updateUser(id: string, _: ActionResult, form: FormData): Promise<ActionResult> {
  const s = await requireMd();
  const role = text(form, "role");
  if (id === s.user.id && role !== "md") return { error: "No puede quitarse a sí mismo el rol de Director General." };
  const { error } = await s.supabase
    .from("profiles")
    .update({
      full_name: text(form, "full_name") ?? "",
      position: text(form, "position"),
      role,
      is_executive: form.get("is_executive") === "on",
      active: id === s.user.id ? true : form.get("active") === "on",
    })
    .eq("id", id);
  if (error) return dbError(error);

  const dims = form.getAll("dims").map(String);
  await s.supabase.from("director_departments").delete().eq("user_id", id);
  if (dims.length) {
    const { error: dErr } = await s.supabase.from("director_departments").insert(dims.map((d) => ({ user_id: id, dimension_code: d })));
    if (dErr) return dbError(dErr);
  }
  revalidatePath("/", "layout");
  return { ok: "Usuario actualizado." };
}

export async function updateWeights(_: ActionResult, form: FormData): Promise<ActionResult> {
  const s = await requireMd();
  const updates = s.dimensions.map((d) => ({ code: d.code, weight: num(form, `w_${d.code}`) }));
  if (updates.some((u) => u.weight == null || u.weight <= 0)) return { error: "Todos los pesos deben ser mayores que cero." };
  const total = updates.reduce((a, u) => a + (u.weight ?? 0), 0);
  if (Math.abs(total - 100) > 0.001) return { error: `Los pesos deben sumar 100%. Suma actual: ${total}%.` };
  for (const u of updates) {
    const { error } = await s.supabase.from("dimensions").update({ weight: u.weight }).eq("code", u.code);
    if (error) return dbError(error);
  }
  revalidatePath("/", "layout");
  return { ok: "Pesos actualizados. El cambio queda registrado en la auditoría." };
}

export async function saveQuestion(id: string | null, _: ActionResult, form: FormData): Promise<ActionResult> {
  const s = await requireMd();
  const row = {
    dimension_code: text(form, "dimension_code"),
    topic: text(form, "topic"),
    prompt: text(form, "prompt"),
    sort_order: num(form, "sort_order") ?? 99,
    active: form.get("active") !== "off",
  };
  if (!row.dimension_code || !row.topic || !row.prompt) return { error: "Complete dimensión, tema y pregunta." };
  const { error } = id
    ? await s.supabase.from("questions").update(row).eq("id", id)
    : await s.supabase.from("questions").insert(row);
  if (error) return dbError(error);
  revalidatePath("/", "layout");
  return { ok: id ? "Pregunta actualizada." : "Pregunta agregada." };
}

export async function toggleQuestion(id: string, active: boolean) {
  const s = await requireMd();
  await s.supabase.from("questions").update({ active }).eq("id", id);
  revalidatePath("/", "layout");
}
