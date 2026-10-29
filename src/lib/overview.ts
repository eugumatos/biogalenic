import "server-only";
import type { getSession } from "./session";
import { completion, computeScore } from "./scoring";
import { kpiStatus, kpiTrend, sortMeasurements, type Direction, type KpiStatus, type KpiTrend, type Measurement } from "./kpi";
import { isOverdue, phaseProgress, cycleDay } from "./plan";
import type { AssessmentStatus, StarsScenario } from "./domain";

type Session = Awaited<ReturnType<typeof getSession>>;

/** Datos consolidados del ciclo para el tablero y los reportes. Respeta el RLS del usuario. */
export async function loadOverview(s: Session) {
  const cycle = s.cycle!;
  const [{ data: assessments }, { data: risks }, { data: stars }, { data: prios }, { data: actions }, { data: kpis }] = await Promise.all([
    s.supabase.from("dimension_assessments").select("*, responsible:profiles!dimension_assessments_responsible_id_fkey(full_name)").eq("cycle_id", cycle.id),
    s.supabase.from("risks").select("*, owner:profiles!risks_owner_id_fkey(full_name)").eq("cycle_id", cycle.id).order("score", { ascending: false }),
    s.supabase.from("stars_classifications").select("*").eq("cycle_id", cycle.id).maybeSingle(),
    s.supabase.from("strategic_priorities").select("*, responsible:profiles!strategic_priorities_responsible_id_fkey(full_name)").eq("cycle_id", cycle.id).order("sort_order"),
    s.supabase.from("action_items").select("*, owner:profiles!action_items_owner_id_fkey(full_name)").eq("cycle_id", cycle.id).order("deadline", { nullsFirst: false }),
    s.supabase.from("kpis").select("*, owner:profiles!kpis_owner_id_fkey(full_name), kpi_measurements(period_start, value)").eq("active", true).order("name"),
  ]);

  const byDim = new Map((assessments ?? []).map((a) => [a.dimension_code as string, a]));
  const inputs = s.dimensions.map((d) => {
    const a = byDim.get(d.code);
    return {
      code: d.code,
      name: d.name,
      weight: d.weight,
      status: (a?.status ?? null) as AssessmentStatus | null,
      proposed_score: a?.proposed_score ?? null,
      approved_score: a?.approved_score ?? null,
    };
  });
  const approvedScore = computeScore(inputs, "aprobado");
  const preliminaryScore = computeScore(inputs, "preliminar");
  const progress = completion(inputs);

  const openRisks = (risks ?? []).filter((r) => r.status !== "cerrado");
  const escalated = openRisks.filter((r) => r.escalated);
  const allActions = actions ?? [];

  const kpiRows = (kpis ?? []).map((k) => {
    const ms = sortMeasurements((k.kpi_measurements ?? []) as Measurement[]);
    const status: KpiStatus = kpiStatus(ms, k.target, !!k.target_approved_by, k.direction as Direction);
    const trend: KpiTrend = kpiTrend(ms, k.direction as Direction);
    return {
      id: k.id as string,
      name: k.name as string,
      unit: k.unit as string,
      dimension_code: k.dimension_code as string,
      direction: k.direction as Direction,
      frequency: k.frequency as string,
      baseline: k.baseline as number | null,
      target: k.target as number | null,
      target_approved_by: k.target_approved_by as string | null,
      owner_name: (k.owner as { full_name: string } | null)?.full_name ?? null,
      measurements: ms,
      last: ms.at(-1) ?? null,
      status,
      trend,
    };
  });

  return {
    cycle,
    day: cycleDay(cycle.starts_on),
    assessments: assessments ?? [],
    byDim,
    inputs,
    approvedScore,
    preliminaryScore,
    progress,
    risks: risks ?? [],
    openRisks,
    escalated,
    stars: stars as null | {
      ai_primary: StarsScenario | null;
      ai_secondary: StarsScenario[];
      md_primary: StarsScenario | null;
      md_secondary: StarsScenario[];
      md_rationale: string | null;
      override_justification: string | null;
      status: string;
      approved_at: string | null;
      ai_run_id: string | null;
    },
    priorities: prios ?? [],
    approvedPriorities: (prios ?? []).filter((p) => p.status === "aprobada"),
    actions: allActions,
    openActions: allActions.filter((a) => a.status !== "completada" && a.status !== "cancelada"),
    overdueActions: allActions.filter((a) => isOverdue(a)),
    planProgress: phaseProgress(allActions),
    phaseProgress: [1, 2, 3].map((p) => phaseProgress(allActions.filter((a) => a.phase === p))),
    kpis: kpiRows,
  };
}

export type Overview = Awaited<ReturnType<typeof loadOverview>>;
