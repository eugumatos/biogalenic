"use server";

import { revalidatePath } from "next/cache";
import { requireCycle } from "@/lib/session";
import { dbError, text, type ActionResult } from "@/lib/actions";

export async function saveRecommendations(_: ActionResult, form: FormData): Promise<ActionResult> {
  const s = await requireCycle();
  if (!s.isMd) return { error: "Solo el Director General." };
  const { error } = await s.supabase.from("assessment_cycles").update({ md_recommendations: text(form, "md_recommendations") }).eq("id", s.cycle.id);
  if (error) return dbError(error);
  revalidatePath("/reportes");
  return { ok: "Recomendaciones guardadas. Se incluirán en la sección 11 del reporte." };
}
