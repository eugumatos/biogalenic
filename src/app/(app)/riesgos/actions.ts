"use server";

import { revalidatePath } from "next/cache";
import { requireCycle, getSession } from "@/lib/session";
import { dbError, int, text, type ActionResult } from "@/lib/actions";

export async function saveRisk(id: string | null, _: ActionResult, form: FormData): Promise<ActionResult> {
  const s = await requireCycle();
  const dimension_code = text(form, "dimension_code");
  if (!dimension_code || !s.canEditDimension(dimension_code)) return { error: "No tiene permiso para registrar riesgos en esta área." };
  const row = {
    dimension_code,
    description: text(form, "description"),
    probability: int(form, "probability"),
    impact: int(form, "impact"),
    escalation_category: text(form, "escalation_category"),
    existing_controls: text(form, "existing_controls"),
    mitigation: text(form, "mitigation"),
    owner_id: text(form, "owner_id"),
    due_date: text(form, "due_date"),
    status: text(form, "status") ?? "abierto",
  };
  if (!row.description) return { error: "Describa el riesgo." };
  if (!row.probability || !row.impact) return { error: "Indique probabilidad e impacto (1–5)." };
  const { error } = id
    ? await s.supabase.from("risks").update(row).eq("id", id)
    : await s.supabase.from("risks").insert({ ...row, cycle_id: s.cycle.id });
  if (error) return dbError(error);
  revalidatePath("/", "layout");
  return { ok: id ? "Riesgo actualizado." : "Riesgo registrado." };
}

export async function deleteRisk(id: string) {
  const s = await getSession();
  if (!s.isMd) return;
  await s.supabase.from("risks").delete().eq("id", id);
  revalidatePath("/", "layout");
}
