import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Badge, Notice, PageHeader, Panel, ScoreBadge, fmtDateTime, levelTone } from "@/components/ui";
import { ClaimList, ClaimLegend } from "@/components/claims";
import { EvidenceList, type EvidenceItem } from "@/components/evidence";
import { CONFIDENCE_LABEL, LEVEL_LABEL, STATUS_LABEL, type AssessmentStatus, type Confidence, type Level4 } from "@/lib/domain";
import type { Claim } from "@/lib/ai/schema";
import { riskCriticality } from "@/lib/risk";
import { getSession } from "@/lib/session";
import { AssessmentForm, DecisionForm } from "./forms";
import { getOrCreateAssessmentId } from "../actions";

export async function generateMetadata({ params }: PageProps<"/departamentos/[code]">): Promise<Metadata> {
  const { code } = await params;
  return { title: `Evaluación · ${code}` };
}

export default async function DimensionPage({ params }: PageProps<"/departamentos/[code]">) {
  const { code } = await params;
  const s = await getSession();
  const dim = s.dimensions.find((d) => d.code === code);
  if (!dim) notFound();
  if (s.isDirector && !s.managedCodes.includes(code)) notFound();
  if (!s.cycle) {
    return <PageHeader title={dim.name} intro="No hay un ciclo de evaluación activo." />;
  }

  const [{ data: a }, { data: questions }, { data: people }, { data: kpis }, { data: risks }] = await Promise.all([
    s.supabase.from("dimension_assessments").select("*").eq("cycle_id", s.cycle.id).eq("dimension_code", code).maybeSingle(),
    s.supabase.from("questions").select("id, topic, prompt, sort_order").eq("dimension_code", code).eq("active", true).order("sort_order"),
    s.supabase.from("profiles").select("id, full_name, role").eq("active", true).in("role", ["md", "director"]).order("full_name"),
    s.supabase.from("kpis").select("id, name, unit, baseline, target, kpi_measurements(value, period_start)").eq("dimension_code", code).eq("active", true).order("name"),
    s.supabase.from("risks").select("id, description, score, escalated, status").eq("cycle_id", s.cycle.id).eq("dimension_code", code).neq("status", "cerrado").order("score", { ascending: false }),
  ]);

  const [{ data: responses }, { data: evidence }] = a
    ? await Promise.all([
        s.supabase.from("question_responses").select("question_id, score, answer").eq("assessment_id", a.id),
        s.supabase
          .from("evidence")
          .select("id, file_name, description, size_bytes, created_at, uploaded_by, uploader:profiles!evidence_uploaded_by_fkey(full_name)")
          .eq("entity_type", "assessment")
          .eq("entity_id", a.id)
          .order("created_at"),
      ])
    : [{ data: [] }, { data: [] }];

  const status = (a?.status ?? null) as AssessmentStatus | null;
  const canEdit = s.canEditDimension(code) && status !== "aprobado" && (s.isMd || status !== "enviado");
  const evidenceItems: EvidenceItem[] = (evidence ?? []).map((e) => ({
    ...e,
    uploader_name: (e.uploader as unknown as { full_name: string } | null)?.full_name,
  }));
  const aiRecs = (a?.ai_recommendations ?? null) as Claim[] | null;
  const resolveId = getOrCreateAssessmentId.bind(null, code);

  return (
    <>
      <div className="mb-2 text-sm">
        <Link href="/departamentos" className="text-navy-3 hover:underline">Evaluación departamental</Link>
      </div>
      <PageHeader
        title={dim.name}
        intro={`${dim.department_name} · peso ${dim.weight}% del resultado global. ${dim.description ?? ""}`}
        actions={
          <div className="flex items-center gap-2">
            {status ? <Badge tone={status === "aprobado" ? "verde" : status === "devuelto" ? "ambar" : status === "enviado" ? "saline" : "neutral"}>{STATUS_LABEL[status]}</Badge> : <Badge>Sin iniciar</Badge>}
          </div>
        }
      />

      {status === "devuelto" && a?.md_comment && (
        <div className="mb-5"><Notice tone="ambar"><strong>Devuelta por el Director General:</strong> {a.md_comment}</Notice></div>
      )}
      {status === "enviado" && !s.isMd && (
        <div className="mb-5"><Notice tone="saline">Enviada el {fmtDateTime(a?.submitted_at)}. Podrá editarla de nuevo si el Director General la devuelve.</Notice></div>
      )}

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-5">
          <AssessmentForm
            code={code}
            canEdit={canEdit}
            canSubmit={canEdit}
            questions={questions ?? []}
            responses={responses ?? []}
            people={people ?? []}
            assessment={a}
          />

          <Panel title="Evidencia de soporte" aside={evidenceItems.length ? `${evidenceItems.length} archivo(s)` : "Requerida para aprobar"}>
            <EvidenceList
              items={evidenceItems}
              canUpload={s.canEditDimension(code)}
              cycleId={s.cycle.id}
              dimensionCode={code}
              entityType="assessment"
              entityId={a?.id ?? null}
              resolveEntityId={resolveId}
              currentUserId={s.user.id}
              isMd={s.isMd}
            />
          </Panel>
        </div>

        <aside className="space-y-5">
          {s.isMd && a && (status === "enviado" || status === "aprobado" || status === "borrador" || status === "devuelto") && (
            <Panel title="Decisión del Director General">
              {status === "aprobado" ? (
                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2">Puntuación aprobada <ScoreBadge score={a.approved_score} /></div>
                  {a.approved_score !== a.proposed_score && (
                    <p className="text-muted">Propuesta original: {a.proposed_score}. Justificación: {a.override_justification}</p>
                  )}
                  <p className="text-muted">Aprobada el {fmtDateTime(a.approved_at)}</p>
                  <DecisionForm id={a.id} mode="reabrir" proposed={a.proposed_score} evidenceCount={evidenceItems.length} />
                </div>
              ) : status === "enviado" ? (
                <DecisionForm id={a.id} mode="decidir" proposed={a.proposed_score} evidenceCount={evidenceItems.length} />
              ) : (
                <p className="text-sm text-muted">La evaluación aún no fue enviada. Puede completarla usted mismo y enviarla para decidir.</p>
              )}
            </Panel>
          )}

          <Panel title="Recomendaciones de la IA" aside={a?.ai_recommendations_at ? fmtDateTime(a.ai_recommendations_at) : undefined}>
            {aiRecs?.length ? (
              <div className="space-y-3">
                <ClaimList claims={aiRecs} />
                <ClaimLegend />
              </div>
            ) : (
              <p className="text-sm text-muted">Se generan cuando el Director General ejecuta el análisis ejecutivo en Evaluación STARS.</p>
            )}
          </Panel>

          <Panel title="Riesgos abiertos del área" aside={<Link className="text-navy-3 hover:underline" href={`/riesgos?dim=${code}`}>Registro</Link>}>
            {risks?.length ? (
              <ul className="space-y-2 text-sm">
                {risks.map((r) => (
                  <li key={r.id} className="flex items-start justify-between gap-3">
                    <span>{r.description}</span>
                    <Badge tone={r.escalated ? "rojo" : levelTone(riskCriticality(r.score))}>
                      {r.score}{r.escalated ? " · escalado" : ""}
                    </Badge>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted">Sin riesgos abiertos registrados.</p>
            )}
          </Panel>

          <Panel title="Indicadores del área" aside={<Link className="text-navy-3 hover:underline" href={`/kpis?dim=${code}`}>KPIs</Link>}>
            <ul className="space-y-2 text-sm">
              {(kpis ?? []).map((k) => {
                const ms = ((k.kpi_measurements ?? []) as { value: number; period_start: string }[]).sort((x, y) => y.period_start.localeCompare(x.period_start));
                return (
                  <li key={k.id} className="flex items-baseline justify-between gap-3">
                    <span>{k.name}</span>
                    <span className="whitespace-nowrap tabular-nums text-muted">
                      {ms[0] ? `${ms[0].value} ${k.unit}` : "sin dato"}
                      {k.target != null ? ` · meta ${k.target}` : ""}
                    </span>
                  </li>
                );
              })}
            </ul>
          </Panel>

          {a && (
            <Panel title="Resumen">
              <dl className="grid grid-cols-2 gap-y-2 text-sm">
                <dt className="text-muted">Confianza</dt>
                <dd>{a.confidence ? CONFIDENCE_LABEL[a.confidence as Confidence] : "—"}</dd>
                <dt className="text-muted">Clasificación de riesgo</dt>
                <dd>{a.risk_class ? <Badge tone={levelTone(a.risk_class)}>{LEVEL_LABEL[a.risk_class as Level4]}</Badge> : "—"}</dd>
                <dt className="text-muted">Enviada</dt>
                <dd>{fmtDateTime(a.submitted_at)}</dd>
              </dl>
            </Panel>
          )}
        </aside>
      </div>
    </>
  );
}
