import type { Metadata } from "next";
import { AnalysisView } from "@/components/analysis-view";
import { ClaimList, ClaimLegend } from "@/components/claims";
import { StarsTrack } from "@/components/stars-track";
import { Badge, Empty, Notice, PageHeader, Panel, fmtDateTime } from "@/components/ui";
import { CONFIDENCE_LABEL, STARS, STARS_NAME, type StarsScenario } from "@/lib/domain";
import type { Analysis, ValidationReport } from "@/lib/ai/schema";
import { getSession } from "@/lib/session";
import { reopenStars } from "./actions";
import { RunAnalysisButton, StarsDecisionForm } from "./forms";

export const metadata: Metadata = { title: "Evaluación STARS" };
export const maxDuration = 300;

export default async function StarsPage({ searchParams }: PageProps<"/stars">) {
  const s = await getSession();
  const sp = await searchParams;
  if (!s.cycle) {
    return (
      <>
        <PageHeader title="Evaluación STARS" />
        <Empty title="No hay un ciclo de evaluación activo" />
      </>
    );
  }

  const { data: stars } = await s.supabase.from("stars_classifications").select("*").eq("cycle_id", s.cycle.id).maybeSingle();

  let runs: { id: string; created_at: string; status: string; model: string; error: string | null }[] = [];
  let run: { id: string; output: Analysis | null; validation: ValidationReport | null; created_at: string } | null = null;
  if (s.isMd) {
    const { data } = await s.supabase
      .from("ai_analysis_runs")
      .select("id, created_at, status, model, error")
      .eq("cycle_id", s.cycle.id)
      .order("created_at", { ascending: false })
      .limit(10);
    runs = data ?? [];
    const pick = typeof sp.run === "string" ? sp.run : runs.find((r) => r.status === "completado")?.id;
    if (pick) {
      const { data: r } = await s.supabase.from("ai_analysis_runs").select("id, output, validation, created_at").eq("id", pick).maybeSingle();
      run = r;
    }
  }

  const approved = stars?.status === "aprobada";
  const primary = (stars?.md_primary ?? (s.isMd ? stars?.ai_primary : null) ?? null) as StarsScenario | null;
  const secondary = (stars?.md_primary ? stars.md_secondary : s.isMd ? stars?.ai_secondary : []) as StarsScenario[];
  const a = run?.output;
  const dimName = (c: string) => s.dimensions.find((d) => d.code === c)?.name ?? c;

  return (
    <>
      <PageHeader
        title="Evaluación STARS"
        intro="La IA propone un escenario a partir de todas las evaluaciones, KPIs y riesgos; nunca solo desde la puntuación. La clasificación vigente es la que aprueba el Director General."
        actions={s.isMd ? <RunAnalysisButton hasRun={runs.length > 0} /> : undefined}
      />

      <section className="panel mb-5 p-4 sm:p-6">
        <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="text-lg font-semibold">
            {primary ? (
              <>
                {STARS_NAME[primary]}
                {secondary.length > 0 && <span className="font-normal text-muted"> con {secondary.map((x) => STARS_NAME[x].toLowerCase()).join(" y ")}</span>}
              </>
            ) : (
              "Sin clasificación"
            )}
          </h2>
          {approved ? (
            <Badge tone="verde">Aprobada por el MD · {fmtDateTime(stars?.approved_at)}</Badge>
          ) : stars?.ai_primary ? (
            <Badge tone="saline">Propuesta pendiente de decisión</Badge>
          ) : (
            <Badge>Sin análisis</Badge>
          )}
        </div>
        <StarsTrack
          primary={primary}
          secondary={secondary}
          aiPrimary={s.isMd ? stars?.ai_primary : null}
          aiSecondary={s.isMd ? stars?.ai_secondary : []}
          approved={approved}
        />
        {approved && stars?.md_rationale && <p className="prose-memo mt-5">{stars.md_rationale}</p>}
        {approved && stars?.override_justification && (
          <p className="mt-3 text-sm text-muted">
            El MD se apartó de la propuesta de la IA ({STARS_NAME[stars.ai_primary as StarsScenario]}): {stars.override_justification}
          </p>
        )}
      </section>

      {!s.isMd && !approved && (
        <Empty title="La clasificación aún no ha sido aprobada">El Director General publicará la clasificación cuando concluya el diagnóstico.</Empty>
      )}

      {s.isMd && (
        <>
          {runs[0]?.status === "error" && (
            <div className="mb-5"><Notice tone="rojo">El último análisis falló ({fmtDateTime(runs[0].created_at)}): {runs[0].error}</Notice></div>
          )}

          <div className="mb-5 grid gap-5 lg:grid-cols-[minmax(0,1fr)_400px]">
            <Panel
              title="B. Propuesta de la IA"
              aside={run ? `${fmtDateTime(run.created_at)} · confianza ${a ? CONFIDENCE_LABEL[a.stars.confianza] : "—"}` : undefined}
            >
              {a ? (
                <div className="space-y-5">
                  <p className="prose-memo">{a.stars.justificacion}</p>
                  <div className="grid gap-6 md:grid-cols-2">
                    <div>
                      <h3 className="mb-2 text-sm font-semibold">Evidencia a favor</h3>
                      <ClaimList claims={a.stars.evidencia_a_favor} />
                    </div>
                    <div>
                      <h3 className="mb-2 text-sm font-semibold">Evidencia en contra</h3>
                      <ClaimList claims={a.stars.evidencia_en_contra} empty="La IA no identificó evidencia contradictoria." />
                    </div>
                  </div>
                  <div>
                    <h3 className="mb-2 text-sm font-semibold">Implicaciones estratégicas</h3>
                    <ClaimList claims={a.stars.implicaciones_estrategicas} />
                  </div>
                  <ClaimLegend />
                </div>
              ) : (
                <Empty title="Aún no hay análisis">
                  Ejecute el análisis cuando las dimensiones tengan información. Con datos parciales, la IA indicará qué evidencia falta en lugar de suponerla.
                </Empty>
              )}
            </Panel>

            <Panel title="Decisión del Director General">
              {approved ? (
                <div className="space-y-3 text-sm">
                  <p>La clasificación está aprobada. Puede reabrirla si nueva evidencia lo justifica; el cambio queda en la auditoría.</p>
                  <form action={reopenStars}><button className="btn btn-secondary">Reabrir decisión</button></form>
                </div>
              ) : (
                <StarsDecisionForm
                  aiPrimary={(stars?.ai_primary ?? null) as StarsScenario | null}
                  current={stars ? { md_primary: stars.md_primary, md_secondary: stars.md_secondary ?? [], md_rationale: stars.md_rationale, override_justification: stars.override_justification } : null}
                />
              )}
            </Panel>
          </div>

          {a && <AnalysisView analysis={a} validation={run?.validation} dimName={dimName} />}

          {runs.length > 0 && (
            <Panel title="Historial de análisis" className="mt-5">
              <ul className="space-y-1 text-sm">
                {runs.map((r) => (
                  <li key={r.id} className="flex flex-wrap gap-x-3">
                    <a href={`/stars?run=${r.id}`} className={r.id === run?.id ? "font-semibold text-navy" : "text-navy-3 hover:underline"}>
                      {fmtDateTime(r.created_at)}
                    </a>
                    <span className="text-muted">{r.model}</span>
                    <span className={r.status === "error" ? "text-rojo" : "text-muted"}>{r.status}</span>
                  </li>
                ))}
              </ul>
            </Panel>
          )}
        </>
      )}

      <Panel title="Los cinco escenarios" className="mt-5">
        <dl className="grid gap-4 text-sm md:grid-cols-5">
          {STARS.map((x) => (
            <div key={x.key}>
              <dt className="font-semibold">{x.name}</dt>
              <dd className="text-muted">{x.summary}</dd>
            </div>
          ))}
        </dl>
      </Panel>
    </>
  );
}
