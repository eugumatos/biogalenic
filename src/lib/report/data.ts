import "server-only";
import type { getSession } from "@/lib/session";
import { loadOverview } from "@/lib/overview";
import type { Analysis } from "@/lib/ai/schema";
import { competencyAverage } from "@/lib/team";

type Session = Awaited<ReturnType<typeof getSession>>;

/** Datos del reporte ejecutivo. Lo confidencial (equipo ejecutivo, análisis IA) solo se incluye para el MD. */
export async function loadReport(s: Session) {
  const o = await loadOverview(s);
  const { data: cycle } = await s.supabase.from("assessment_cycles").select("md_recommendations").eq("id", o.cycle.id).single();

  let analysis: Analysis | null = null;
  let analysisAt: string | null = null;
  let team: { name: string; position: string | null; avg: number | null; critical: boolean; succession: string | null; strengths: string | null; development: string | null }[] | null = null;

  if (s.isMd) {
    const { data: run } = await s.supabase
      .from("ai_analysis_runs")
      .select("output, created_at")
      .eq("cycle_id", o.cycle.id)
      .eq("status", "completado")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    analysis = (run?.output as Analysis) ?? null;
    analysisAt = run?.created_at ?? null;

    const { data: evals } = await s.supabase
      .from("executive_evaluations")
      .select("*, executive:profiles!executive_evaluations_executive_id_fkey(full_name, position)")
      .eq("cycle_id", o.cycle.id);
    team = (evals ?? []).map((e) => {
      const ex = e.executive as { full_name: string; position: string | null } | null;
      return {
        name: ex?.full_name ?? "—",
        position: ex?.position ?? null,
        avg: competencyAverage(e),
        critical: !!e.is_critical_talent,
        succession: e.succession_risk,
        strengths: e.strengths,
        development: e.development_priorities ?? e.development_opportunities,
      };
    });
  }

  return {
    ...o,
    dimensions: s.dimensions,
    mdRecommendations: (cycle?.md_recommendations as string | null) ?? null,
    analysis,
    analysisAt,
    team,
    audience: s.isMd ? "Director General (incluye información confidencial)" : "Distribución ejecutiva (solo información aprobada)",
    generatedBy: s.profile.full_name || s.profile.email,
  };
}

export type ReportData = Awaited<ReturnType<typeof loadReport>>;
