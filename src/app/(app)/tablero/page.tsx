import type { Metadata } from "next";
import Link from "next/link";
import { DepartmentBars, ScoreRadar } from "@/components/charts";
import { Heatmap } from "@/components/heatmap";
import { Sparkline } from "@/components/sparkline";
import { StarsTrack } from "@/components/stars-track";
import { Badge, Empty, HowCalculated, Meter, PageHeader, Panel, Stat, fmtDate, fmtNum } from "@/components/ui";
import { DIMENSION_SHORT, ESCALATION_LABEL, PHASES, SCORE_LABEL, STARS_NAME, STATUS_LABEL, type EscalationCategory, type StarsScenario } from "@/lib/domain";
import { KPI_STATUS_LABEL } from "@/lib/kpi";
import { loadOverview } from "@/lib/overview";
import { getSession } from "@/lib/session";

export const metadata: Metadata = { title: "Tablero ejecutivo" };

export default async function TableroPage() {
  const s = await getSession();
  if (!s.cycle) {
    return (
      <>
        <PageHeader title="Tablero ejecutivo" />
        <Empty
          title="No hay un ciclo de evaluación activo"
          action={s.isMd ? <Link href="/administracion?tab=ciclos" className="btn btn-primary">Abrir ciclo</Link> : undefined}
        >
          {s.isMd ? "Abra el primer ciclo para comenzar el diagnóstico." : "El Director General aún no abre el ciclo de evaluación."}
        </Empty>
      </>
    );
  }

  const o = await loadOverview(s);
  const st = o.stars;
  const approved = st?.status === "aprobada";
  const primary = (st?.md_primary ?? (s.isMd ? st?.ai_primary : null) ?? null) as StarsScenario | null;
  const secondary = ((st?.md_primary ? st.md_secondary : s.isMd ? st?.ai_secondary : []) ?? []) as StarsScenario[];
  const score = o.approvedScore;
  const today = new Date().toISOString().slice(0, 10);

  return (
    <>
      {o.escalated.length > 0 && (
        <section className="strip-in mb-6 overflow-hidden rounded-[6px] border border-rojo bg-white" aria-labelledby="esc-title" role="alert">
          <div className="flex flex-wrap items-baseline justify-between gap-2 bg-rojo px-4 py-2.5 text-white sm:px-5">
            <h2 id="esc-title" className="font-semibold text-white">
              {o.escalated.length === 1 ? "1 riesgo crítico escalado al Director General" : `${o.escalated.length} riesgos críticos escalados al Director General`}
            </h2>
            <Link href="/riesgos" className="text-sm text-white underline-offset-2 hover:underline">Ver registro de riesgos</Link>
          </div>
          <ul className="divide-y divide-mist">
            {o.escalated.slice(0, 6).map((r) => {
              const late = r.due_date && r.due_date < today;
              return (
                <li key={r.id} className="grid gap-1 px-4 py-2.5 text-sm sm:grid-cols-[minmax(0,1fr)_auto] sm:gap-4 sm:px-5">
                  <div>
                    <span className="font-semibold text-rojo">{ESCALATION_LABEL[r.escalation_category as EscalationCategory]}</span>
                    <span className="text-muted"> · P{r.probability}×I{r.impact} = {r.score}</span>
                    <div>{r.description}</div>
                  </div>
                  <div className="text-xs text-muted sm:text-right">
                    {(r.owner as { full_name: string } | null)?.full_name ?? "Sin responsable"}
                    <br />
                    <span className={late ? "font-semibold text-rojo" : undefined}>{r.due_date ? `Compromiso ${fmtDate(r.due_date)}${late ? " · vencido" : ""}` : "Sin fecha de mitigación"}</span>
                  </div>
                </li>
              );
            })}
          </ul>
          {o.escalated.length > 6 && <p className="px-5 py-2 text-xs text-muted">y {o.escalated.length - 6} más en el registro.</p>}
        </section>
      )}

      <PageHeader
        title="Tablero ejecutivo"
        intro={`${o.cycle.name} · ${o.day < 1 ? "inicia " + fmtDate(o.cycle.starts_on) : o.day > 90 ? "90 días concluidos" : `día ${o.day} de 90`}`}
      />

      <section className="panel mb-5 grid gap-6 p-4 sm:p-6 lg:grid-cols-[minmax(0,1fr)_300px]">
        <div>
          <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="text-lg font-semibold">
              {primary ? (
                <>
                  Situación: {STARS_NAME[primary]}
                  {secondary.length > 0 && <span className="font-normal text-muted"> con {secondary.map((x) => STARS_NAME[x].toLowerCase()).join(" y ")}</span>}
                </>
              ) : (
                "Situación STARS sin definir"
              )}
            </h2>
            <Link href="/stars" className="text-sm text-navy-3 hover:underline">
              {approved ? "Aprobada por el MD" : primary ? "Propuesta de la IA, pendiente de decisión" : "Ir a Evaluación STARS"}
            </Link>
          </div>
          <StarsTrack primary={primary} secondary={secondary} aiPrimary={s.isMd ? st?.ai_primary : null} aiSecondary={s.isMd ? st?.ai_secondary : []} approved={approved} />
        </div>
        <div className="border-t border-rule pt-5 lg:border-t-0 lg:border-l lg:pt-0 lg:pl-6">
          <div className="text-sm text-muted">Puntuación global aprobada</div>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-5xl font-bold tabular-nums text-navy">{score.overall == null ? "—" : fmtNum(score.overall, 2)}</span>
            <span className="text-muted">/ 5</span>
          </div>
          <div className="mt-1 text-sm">{score.overall == null ? "Sin evaluaciones aprobadas" : SCORE_LABEL[Math.round(score.overall)]}</div>
          <div className="mt-4">
            <div className="mb-1 flex justify-between text-xs text-muted"><span>Cobertura por peso</span><span className="tabular-nums">{score.coverage}%</span></div>
            <Meter value={score.coverage} label="Cobertura" />
          </div>
          {o.preliminaryScore.overall != null && o.preliminaryScore.coverage > score.coverage && (
            <p className="mt-3 text-xs text-muted">
              Preliminar con propuestas: {fmtNum(o.preliminaryScore.overall, 2)} ({o.preliminaryScore.coverage}% de cobertura). No sustituye la puntuación aprobada.
            </p>
          )}
          <HowCalculated>
            <p>Global = Σ(puntuación × peso) ÷ Σ(pesos aprobados). Las dimensiones sin aprobar no cuentan como cero; se excluyen y se reporta la cobertura.</p>
            <table className="mt-2 w-full text-xs">
              <tbody>
                {score.lines.map((l) => (
                  <tr key={l.code}>
                    <td className="py-0.5">{l.name}</td>
                    <td className="text-right tabular-nums">{l.score ?? "—"} × {l.weight}%</td>
                    <td className="w-14 text-right tabular-nums">{l.weighted == null ? "—" : fmtNum(l.weighted, 3)}</td>
                  </tr>
                ))}
                <tr className="font-semibold">
                  <td className="pt-1">Suma ponderada</td>
                  <td className="pt-1 text-right">÷ {score.coverage}%</td>
                  <td className="pt-1 text-right tabular-nums">{fmtNum(score.weightedSum, 3)}</td>
                </tr>
              </tbody>
            </table>
            {score.incomplete.length > 0 && <p className="mt-2">Sin aprobar: {score.incomplete.join(", ")}.</p>}
          </HowCalculated>
        </div>
      </section>

      <Panel className="mb-5">
        <div className="grid grid-cols-2 gap-5 sm:grid-cols-4 xl:grid-cols-7">
          <Stat label="Áreas evaluadas" value={`${o.progress.started}/${o.progress.total}`} note={`${o.progress.submitted} enviada(s) al MD`} />
          <Stat label="Evaluaciones aprobadas" value={`${o.progress.pctApproved}%`} note={`${o.progress.approved} de ${o.progress.total}`} />
          <Stat label="Riesgos críticos" value={o.openRisks.filter((r) => r.score >= 15 || r.escalated).length} tone={o.escalated.length ? "rojo" : undefined} note={`${o.escalated.length} escalado(s)`} />
          <Stat label="Prioridades aprobadas" value={`${o.approvedPriorities.length}/5`} />
          <Stat label="Acciones abiertas" value={o.openActions.length} />
          <Stat label="Acciones vencidas" value={o.overdueActions.length} tone={o.overdueActions.length ? "rojo" : undefined} />
          <Stat label="Avance plan 90 días" value={o.planProgress == null ? "—" : `${o.planProgress}%`} />
        </div>
      </Panel>

      <div className="mb-5 grid gap-5 xl:grid-cols-2">
        <Panel title="Ocho dimensiones" aside="Aprobada (navy) frente a preliminar (punteada)">
          <ScoreRadar
            data={o.inputs.map((d) => ({
              label: DIMENSION_SHORT[d.code] ?? d.name,
              value: d.status === "aprobado" ? d.approved_score : null,
              compare: d.status === "aprobado" ? d.approved_score : d.proposed_score,
            }))}
            seriesLabel="Aprobada"
            compareLabel="Preliminar"
          />
        </Panel>
        <Panel title="Puntuación por departamento" aside="Escala 1–5 · línea en 3">
          <DepartmentBars
            data={o.inputs.map((d) => ({
              label: s.dimensions.find((x) => x.code === d.code)?.department_name ?? d.name,
              value: d.status === "aprobado" ? d.approved_score : null,
              status: d.status ? STATUS_LABEL[d.status] : "Sin iniciar",
            }))}
          />
          <p className="mt-2 text-xs text-muted">Solo puntuaciones aprobadas. Las barras vacías corresponden a áreas sin aprobar.</p>
        </Panel>
      </div>

      <div className="mb-5 grid gap-5 xl:grid-cols-[380px_minmax(0,1fr)]">
        <Panel title="Mapa de calor de riesgos" aside={<Link href="/riesgos" className="text-navy-3 hover:underline">{o.openRisks.length} activos</Link>}>
          <Heatmap risks={o.openRisks} hrefBase="/riesgos?estado=activos" compact />
        </Panel>
        <Panel title="Avance del plan e iniciativas" aside={<Link href="/plan-90-dias" className="text-navy-3 hover:underline">Plan de 90 días</Link>}>
          <div className="space-y-3">
            {PHASES.map((p, i) => (
              <div key={p.n} className="grid grid-cols-[150px_minmax(0,1fr)_48px] items-center gap-3 text-sm">
                <span><span className="text-muted">{p.days}</span><br />{p.name}</span>
                <Meter value={o.phaseProgress[i] ?? 0} label={p.name} />
                <span className="text-right tabular-nums">{o.phaseProgress[i] == null ? "—" : `${o.phaseProgress[i]}%`}</span>
              </div>
            ))}
          </div>
          {o.approvedPriorities.length > 0 && (
            <div className="mt-5 space-y-3 border-t border-rule pt-4">
              <h3 className="text-sm font-semibold">Prioridades estratégicas</h3>
              {o.approvedPriorities.map((p) => {
                const linked = o.actions.filter((a) => a.priority_id === p.id && a.status !== "cancelada");
                const pr = linked.length ? Math.round(linked.reduce((t, a) => t + a.progress, 0) / linked.length) : null;
                return (
                  <div key={p.id} className="grid grid-cols-[minmax(0,1fr)_120px_44px] items-center gap-3 text-sm">
                    <span className="truncate" title={p.objective}>{p.objective}</span>
                    <Meter value={pr ?? 0} tone="verde" label={p.objective} />
                    <span className="text-right tabular-nums">{pr == null ? "—" : `${pr}%`}</span>
                  </div>
                );
              })}
            </div>
          )}
        </Panel>
      </div>

      <Panel title="Desempeño de KPIs" aside={<Link href="/kpis" className="text-navy-3 hover:underline">Gestión de KPIs</Link>} bodyClassName="p-0 sm:p-0">
        {o.kpis.some((k) => k.last) ? (
          <div className="overflow-x-auto">
            <table className="table min-w-[760px]">
              <thead>
                <tr><th>KPI</th><th>Área</th><th className="text-right">Línea base</th><th className="text-right">Meta</th><th className="text-right">Real</th><th>Tendencia</th><th>Estado</th></tr>
              </thead>
              <tbody>
                {o.kpis.filter((k) => k.last).map((k) => (
                  <tr key={k.id}>
                    <td className="font-medium">{k.name} <span className="text-xs text-muted">{k.unit}</span></td>
                    <td className="text-muted">{s.dimensions.find((d) => d.code === k.dimension_code)?.name}</td>
                    <td className="text-right tabular-nums">{fmtNum(k.baseline)}</td>
                    <td className="text-right tabular-nums">{k.target_approved_by ? fmtNum(k.target) : "—"}</td>
                    <td className="text-right tabular-nums">{fmtNum(k.last?.value)}</td>
                    <td><Sparkline values={k.measurements.slice(-8).map((m) => m.value)} target={k.target_approved_by ? k.target : null} /></td>
                    <td><Badge tone={k.status === "en_meta" ? "verde" : k.status === "fuera_de_meta" ? "rojo" : "neutral"}>{KPI_STATUS_LABEL[k.status]}</Badge></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-5"><Empty title="Aún no hay mediciones de KPIs">Registre valores reales en Gestión de KPIs para ver tendencias y estado frente a meta.</Empty></div>
        )}
      </Panel>
    </>
  );
}
