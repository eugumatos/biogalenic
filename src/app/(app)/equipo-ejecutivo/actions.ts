"use server";

import { revalidatePath } from "next/cache";
import { COMPETENCIES } from "@/lib/domain";
import { requireCycle } from "@/lib/session";
import { dbError, int, text, type ActionResult } from "@/lib/actions";

export async function saveEvaluation(executiveId: string, _: ActionResult, form: FormData): Promise<ActionResult> {
  const s = await requireCycle();
  if (!s.isMd) return { error: "Acceso confidencial: solo el Director General." };
  const row: Record<string, unknown> = {
    cycle_id: s.cycle.id,
    executive_id: executiveId,
    strengths: text(form, "strengths"),
    development_opportunities: text(form, "development_opportunities"),
    is_critical_talent: form.get("is_critical_talent") === "on",
    succession_risk: text(form, "succession_risk"),
    development_priorities: text(form, "development_priorities"),
    evaluated_by: s.user.id,
  };
  for (const c of COMPETENCIES) row[c.key] = int(form, c.key);
  const { error } = await s.supabase.from("executive_evaluations").upsert(row, { onConflict: "cycle_id,executive_id" });
  if (error) return dbError(error);
  revalidatePath("/equipo-ejecutivo");
  return { ok: "Evaluación guardada." };
}
