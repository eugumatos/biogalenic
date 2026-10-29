"use server";

import { revalidatePath } from "next/cache";
import { getSession, requireCycle } from "@/lib/session";
import { dbError, text, type ActionResult } from "@/lib/actions";
import { buildSnapshot } from "@/lib/ai/snapshot";
import { AI_MODEL, runAnalysis } from "@/lib/ai/analysis";
import { validateAnalysis } from "@/lib/ai/validate";

export async function runExecutiveAnalysis(): Promise<ActionResult> {
  const s = await requireCycle();
  if (!s.isMd) return { error: "Solo el Director General puede ejecutar el análisis." };
  if (!process.env.AI_GATEWAY_API_KEY && !process.env.VERCEL_OIDC_TOKEN) {
    return { error: "Falta configurar AI_GATEWAY_API_KEY (Vercel AI Gateway) en el entorno." };
  }

  const { snapshot, validIds, escalated, hash } = await buildSnapshot(s.supabase, s.cycle, s.dimensions);
  const { data: run, error: runErr } = await s.supabase
    .from("ai_analysis_runs")
    .insert({ cycle_id: s.cycle.id, model: AI_MODEL, input_hash: hash, input_snapshot: snapshot, status: "en_proceso" })
    .select("id")
    .single();
  if (runErr) return dbError(runErr);

  let analysis;
  try {
    const raw = await runAnalysis(snapshot);
    const v = validateAnalysis(raw, validIds, escalated);
    analysis = v.analysis;
    await s.supabase.from("ai_analysis_runs").update({ status: "completado", output: v.analysis, validation: v.report }).eq("id", run.id);
  } catch (e) {
    const msg = (e as Error).message?.slice(0, 500) ?? "Error desconocido";
    await s.supabase.from("ai_analysis_runs").update({ status: "error", error: msg }).eq("id", run.id);
    return { error: `El análisis no pudo completarse: ${msg}` };
  }

  // Propuesta STARS (no altera la decisión del MD ya registrada)
  const { data: existing } = await s.supabase.from("stars_classifications").select("id").eq("cycle_id", s.cycle.id).maybeSingle();
  const aiFields = { ai_run_id: run.id, ai_primary: analysis.stars.principal, ai_secondary: analysis.stars.secundarios };
  if (existing) await s.supabase.from("stars_classifications").update(aiFields).eq("id", existing.id);
  else await s.supabase.from("stars_classifications").insert({ cycle_id: s.cycle.id, ...aiFields, status: "propuesta" });

  // Prioridades propuestas: reemplaza las propuestas de IA anteriores aún no decididas
  await s.supabase.from("strategic_priorities").delete().eq("cycle_id", s.cycle.id).eq("source", "ia").eq("status", "propuesta");
  const { data: assignments } = await s.supabase.from("director_departments").select("user_id, dimension_code");
  const start = new Date(s.cycle.starts_on + "T12:00:00");
  const prios = analysis.recomendaciones.prioridades.map((p, i) => ({
    cycle_id: s.cycle.id,
    objective: p.objetivo,
    rationale: p.justificacion,
    expected_impact: p.impacto_esperado,
    responsible_id: assignments?.find((a) => a.dimension_code === p.dimension_responsable)?.user_id ?? null,
    supporting_dimensions: p.dimensiones_apoyo.filter((d) => s.dimensions.some((x) => x.code === d)),
    kpi_text: p.kpi,
    baseline: p.linea_base,
    target: p.meta,
    deadline: new Date(start.getTime() + p.plazo_dias * 86400000).toISOString().slice(0, 10),
    resources: p.recursos,
    risks_dependencies: p.riesgos_dependencias,
    status: "propuesta",
    source: "ia",
    ai_run_id: run.id,
    sort_order: i + 1,
  }));
  if (prios.length) await s.supabase.from("strategic_priorities").insert(prios);

  // Recomendaciones por dimensión, visibles para el director del área
  const now = new Date().toISOString();
  for (const rec of analysis.recomendaciones_por_dimension) {
    if (!s.dimensions.some((d) => d.code === rec.dimension)) continue;
    const { data: a } = await s.supabase
      .from("dimension_assessments")
      .select("id")
      .eq("cycle_id", s.cycle.id)
      .eq("dimension_code", rec.dimension)
      .maybeSingle();
    if (a) {
      await s.supabase.from("dimension_assessments").update({ ai_recommendations: rec.recomendaciones, ai_recommendations_at: now }).eq("id", a.id);
    } else {
      await s.supabase.from("dimension_assessments").insert({
        cycle_id: s.cycle.id,
        dimension_code: rec.dimension,
        status: "borrador",
        ai_recommendations: rec.recomendaciones,
        ai_recommendations_at: now,
      });
    }
  }

  revalidatePath("/", "layout");
  return { ok: "Análisis completado. Revise la propuesta y registre su decisión." };
}

export async function decideStars(_: ActionResult, form: FormData): Promise<ActionResult> {
  const s = await requireCycle();
  if (!s.isMd) return { error: "Solo el Director General puede definir la clasificación STARS." };
  const md_primary = text(form, "md_primary");
  if (!md_primary) return { error: "Seleccione el escenario principal." };
  const md_secondary = form.getAll("md_secondary").map(String).filter((x) => x !== md_primary).slice(0, 2);
  const status = form.get("decision") === "aprobar" ? "aprobada" : "propuesta";
  const row = {
    md_primary,
    md_secondary,
    md_rationale: text(form, "md_rationale"),
    override_justification: text(form, "override_justification"),
    status,
  };
  const { data: existing } = await s.supabase.from("stars_classifications").select("id").eq("cycle_id", s.cycle.id).maybeSingle();
  const { error } = existing
    ? await s.supabase.from("stars_classifications").update(row).eq("id", existing.id)
    : await s.supabase.from("stars_classifications").insert({ ...row, cycle_id: s.cycle.id });
  if (error) return dbError(error);
  revalidatePath("/", "layout");
  return { ok: status === "aprobada" ? "Clasificación STARS aprobada." : "Borrador de decisión guardado." };
}

export async function reopenStars() {
  const s = await getSession();
  if (!s.isMd || !s.cycle) return;
  await s.supabase.from("stars_classifications").update({ status: "propuesta" }).eq("cycle_id", s.cycle.id);
  revalidatePath("/", "layout");
}
