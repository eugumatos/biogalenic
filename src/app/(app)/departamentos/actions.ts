"use server";

import { revalidatePath } from "next/cache";
import { getSession, requireCycle } from "@/lib/session";
import { dbError, int, text, type ActionResult } from "@/lib/actions";

async function ensureAssessment(code: string) {
  const s = await requireCycle();
  if (!s.canEditDimension(code)) throw new Error("No tiene permiso para evaluar esta dimensión.");
  const { data: existing } = await s.supabase
    .from("dimension_assessments")
    .select("id, status")
    .eq("cycle_id", s.cycle.id)
    .eq("dimension_code", code)
    .maybeSingle();
  if (existing) return { s, id: existing.id as string, status: existing.status as string };
  const { data, error } = await s.supabase
    .from("dimension_assessments")
    .insert({ cycle_id: s.cycle.id, dimension_code: code, status: "borrador" })
    .select("id, status")
    .single();
  if (error) throw new Error(dbError(error)?.error);
  return { s, id: data.id as string, status: data.status as string };
}

export async function getOrCreateAssessmentId(code: string): Promise<{ id?: string; cycleId?: string; error?: string }> {
  try {
    const { id, s } = await ensureAssessment(code);
    return { id, cycleId: s.cycle.id };
  } catch (e) {
    return { error: (e as Error).message };
  }
}

export async function saveAssessment(code: string, _: ActionResult, form: FormData): Promise<ActionResult> {
  let ctx;
  try {
    ctx = await ensureAssessment(code);
  } catch (e) {
    return { error: (e as Error).message };
  }
  const { s, id } = ctx;
  const intent = form.get("intent") === "enviar" ? "enviado" : "borrador";

  // Respuestas del cuestionario
  const responses: { assessment_id: string; question_id: string; score: number | null; answer: string | null }[] = [];
  for (const [key] of form.entries()) {
    const m = /^q_([0-9a-f-]{36})_score$/.exec(key);
    if (!m) continue;
    const qid = m[1];
    const score = int(form, `q_${qid}_score`);
    const answer = text(form, `q_${qid}_answer`);
    if (score != null || answer != null) responses.push({ assessment_id: id, question_id: qid, score, answer });
  }
  if (responses.length) {
    const { error } = await s.supabase.from("question_responses").upsert(responses, { onConflict: "assessment_id,question_id" });
    if (error) return dbError(error);
  }

  const { error } = await s.supabase
    .from("dimension_assessments")
    .update({
      proposed_score: int(form, "proposed_score"),
      confidence: text(form, "confidence"),
      current_performance: text(form, "current_performance"),
      gaps: text(form, "gaps"),
      root_causes: text(form, "root_causes"),
      business_impact: text(form, "business_impact"),
      risk_class: text(form, "risk_class"),
      responsible_id: text(form, "responsible_id"),
      opportunities: text(form, "opportunities"),
      status: intent,
    })
    .eq("id", id);
  if (error) return dbError(error);

  revalidatePath("/departamentos", "layout");
  return { ok: intent === "enviado" ? "Evaluación enviada al Director General." : "Borrador guardado." };
}

export async function decideAssessment(id: string, _: ActionResult, form: FormData): Promise<ActionResult> {
  const s = await getSession();
  if (!s.isMd) return { error: "Solo el Director General puede aprobar o devolver evaluaciones." };
  const decision = form.get("decision");
  const update =
    decision === "aprobar"
      ? {
          status: "aprobado",
          approved_score: int(form, "approved_score"),
          override_justification: text(form, "override_justification"),
          md_comment: text(form, "md_comment"),
        }
      : decision === "devolver"
        ? { status: "devuelto", md_comment: text(form, "md_comment") }
        : decision === "reabrir"
          ? { status: "devuelto", md_comment: text(form, "md_comment") ?? "Reabierta por el Director General." }
          : null;
  if (!update) return { error: "Decisión no válida." };
  if (update.status === "devuelto" && !update.md_comment) return { error: "Indique qué debe corregirse." };

  const { error } = await s.supabase.from("dimension_assessments").update(update).eq("id", id);
  if (error) return dbError(error);
  revalidatePath("/", "layout");
  return { ok: decision === "aprobar" ? "Evaluación aprobada." : "Evaluación devuelta al director." };
}

export async function registerEvidence(input: {
  cycleId: string;
  dimensionCode: string | null;
  entityType: "assessment" | "risk" | "action" | "kpi";
  entityId: string;
  path: string;
  fileName: string;
  mimeType: string;
  size: number;
  description: string | null;
}): Promise<ActionResult> {
  const s = await getSession();
  const { error } = await s.supabase.from("evidence").insert({
    cycle_id: input.cycleId,
    dimension_code: input.dimensionCode,
    entity_type: input.entityType,
    entity_id: input.entityId,
    storage_path: input.path,
    file_name: input.fileName,
    mime_type: input.mimeType,
    size_bytes: input.size,
    description: input.description,
  });
  if (error) {
    await s.supabase.storage.from("evidencias").remove([input.path]);
    return dbError(error);
  }
  revalidatePath("/", "layout");
  return { ok: "Evidencia registrada." };
}

export async function evidenceUrl(id: string): Promise<{ url?: string; error?: string }> {
  const s = await getSession();
  const { data: ev } = await s.supabase.from("evidence").select("storage_path, file_name").eq("id", id).maybeSingle();
  if (!ev) return { error: "Evidencia no encontrada o sin permiso." };
  const { data, error } = await s.supabase.storage
    .from("evidencias")
    .createSignedUrl(ev.storage_path, 120, { download: ev.file_name });
  if (error) return { error: "No se pudo generar el enlace de descarga." };
  return { url: data.signedUrl };
}

export async function deleteEvidence(id: string): Promise<ActionResult> {
  const s = await getSession();
  const { data: ev } = await s.supabase.from("evidence").select("storage_path").eq("id", id).maybeSingle();
  if (!ev) return { error: "Evidencia no encontrada." };
  const { error } = await s.supabase.from("evidence").delete().eq("id", id);
  if (error) return dbError(error);
  await s.supabase.storage.from("evidencias").remove([ev.storage_path]);
  revalidatePath("/", "layout");
  return { ok: "Evidencia eliminada." };
}
