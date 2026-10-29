import "server-only";
import { createHash } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import { computeScore } from "@/lib/scoring";
import { ESCALATION_LABEL, type Dimension, type EscalationCategory } from "@/lib/domain";
import { sortMeasurements } from "@/lib/kpi";

/** Construye la fotografía de datos del ciclo que recibe la IA. Cada elemento lleva un ID citable. */
export async function buildSnapshot(supabase: SupabaseClient, cycle: { id: string; name: string; starts_on: string; company_overview: string | null }, dimensions: Dimension[]) {
  const [{ data: assessments }, { data: responses }, { data: questions }, { data: evidence }, { data: kpis }, { data: risks }] = await Promise.all([
    supabase.from("dimension_assessments").select("*").eq("cycle_id", cycle.id),
    supabase.from("question_responses").select("assessment_id, question_id, score, answer"),
    supabase.from("questions").select("id, topic"),
    supabase.from("evidence").select("entity_id, file_name, description").eq("cycle_id", cycle.id).eq("entity_type", "assessment"),
    supabase.from("kpis").select("id, dimension_code, name, unit, direction, baseline, target, target_approved_by, kpi_measurements(period_start, value)").eq("active", true),
    supabase.from("risks").select("*").eq("cycle_id", cycle.id).neq("status", "cerrado"),
  ]);

  const topic = new Map((questions ?? []).map((q) => [q.id, q.topic]));
  const byDim = new Map((assessments ?? []).map((a) => [a.dimension_code, a]));

  const dimensiones = dimensions.map((d) => {
    const a = byDim.get(d.code);
    return {
      id: `eval:${d.code}`,
      codigo: d.code,
      nombre: d.name,
      peso_pct: d.weight,
      estado: a?.status ?? "sin_iniciar",
      puntuacion_propuesta: a?.proposed_score ?? null,
      puntuacion_aprobada: a?.status === "aprobado" ? a.approved_score : null,
      confianza: a?.confidence ?? null,
      desempeno_actual: a?.current_performance ?? null,
      brechas: a?.gaps ?? null,
      causas_raiz: a?.root_causes ?? null,
      impacto_negocio: a?.business_impact ?? null,
      clasificacion_riesgo: a?.risk_class ?? null,
      oportunidades: a?.opportunities ?? null,
      comentario_md: a?.md_comment ?? null,
      evidencias: (evidence ?? []).filter((e) => e.entity_id === a?.id).map((e) => e.description || e.file_name),
      respuestas: a
        ? (responses ?? [])
            .filter((r) => r.assessment_id === a.id)
            .map((r) => ({ tema: topic.get(r.question_id), puntuacion: r.score, respuesta: r.answer }))
        : [],
    };
  });

  const scoreInputs = dimensions.map((d) => {
    const a = byDim.get(d.code);
    return { code: d.code, name: d.name, weight: d.weight, status: a?.status ?? null, proposed_score: a?.proposed_score ?? null, approved_score: a?.approved_score ?? null };
  });
  const aprobado = computeScore(scoreInputs, "aprobado");
  const preliminar = computeScore(scoreInputs, "preliminar");

  const kpiList = (kpis ?? []).map((k) => {
    const ms = sortMeasurements(k.kpi_measurements ?? []).slice(-6);
    return {
      id: `kpi:${k.id}`,
      dimension: k.dimension_code,
      nombre: k.name,
      unidad: k.unit,
      sentido: k.direction,
      linea_base: k.baseline,
      meta: k.target,
      meta_aprobada: !!k.target_approved_by,
      mediciones: ms.map((m) => ({ periodo: m.period_start, valor: m.value })),
    };
  });

  const riesgos = (risks ?? []).map((r) => ({
    id: `riesgo:${r.id}`,
    dimension: r.dimension_code,
    descripcion: r.description,
    probabilidad: r.probability,
    impacto: r.impact,
    puntaje: r.score,
    categoria_escalamiento: r.escalation_category ? ESCALATION_LABEL[r.escalation_category as EscalationCategory] : null,
    escalado: r.escalated,
    controles: r.existing_controls,
    mitigacion: r.mitigation,
    estado: r.status,
  }));

  const snapshot = {
    empresa: {
      nombre: "Biogalenic El Salvador",
      actividad: "Fabricación farmacéutica de soluciones parenterales estériles de pequeño (SVP) y gran volumen (LVP).",
      ciclo: cycle.name,
      inicio_ciclo: cycle.starts_on,
      descripcion: cycle.company_overview,
    },
    puntuacion: {
      regla: "Global = Σ(puntuación × peso) / Σ(pesos evaluados). Las dimensiones sin evaluar no cuentan como cero.",
      aprobada: { global: aprobado.overall, cobertura_pct: aprobado.coverage, sin_aprobar: aprobado.incomplete },
      preliminar: { global: preliminar.overall, cobertura_pct: preliminar.coverage, sin_datos: preliminar.incomplete },
    },
    dimensiones,
    kpis: kpiList,
    riesgos,
  };

  const validIds = new Set<string>([
    ...dimensiones.map((d) => d.id),
    ...kpiList.map((k) => k.id),
    ...riesgos.map((r) => r.id),
    "puntuacion",
  ]);
  const escalated = (risks ?? [])
    .filter((r) => r.escalated)
    .map((r) => ({
      id: r.id as string,
      description: r.description as string,
      score: r.score as number,
      category: ESCALATION_LABEL[r.escalation_category as EscalationCategory],
    }));
  const hash = createHash("sha256").update(JSON.stringify(snapshot)).digest("hex").slice(0, 16);

  return { snapshot, validIds, escalated, hash };
}
