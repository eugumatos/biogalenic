import type { Metadata } from "next";
import Link from "next/link";
import { Badge, Empty, PageHeader, ScoreBadge, fmtDate } from "@/components/ui";
import { STATUS_LABEL, CONFIDENCE_LABEL, type AssessmentStatus, type Confidence } from "@/lib/domain";
import { getSession } from "@/lib/session";

export const metadata: Metadata = { title: "Evaluación departamental" };

const statusTone = { borrador: "neutral", enviado: "saline", devuelto: "ambar", aprobado: "verde" } as const;

export default async function DepartamentosPage() {
  const s = await getSession();
  if (!s.cycle) {
    return (
      <>
        <PageHeader title="Evaluación departamental" />
        <Empty title="No hay un ciclo de evaluación activo">El Director General debe abrir un ciclo en Administración.</Empty>
      </>
    );
  }

  const [{ data: rows }, { data: qcount }, { data: rcount }] = await Promise.all([
    s.supabase
      .from("dimension_assessments")
      .select("id, dimension_code, status, proposed_score, approved_score, confidence, updated_at, responsible:profiles!dimension_assessments_responsible_id_fkey(full_name)")
      .eq("cycle_id", s.cycle.id),
    s.supabase.from("questions").select("dimension_code").eq("active", true),
    s.supabase.from("question_responses").select("assessment_id, score"),
  ]);

  const byCode = new Map((rows ?? []).map((r) => [r.dimension_code as string, r]));
  const visible = s.dimensions.filter((d) => s.isMd || s.isReader || s.managedCodes.includes(d.code));

  return (
    <>
      <PageHeader
        title="Evaluación departamental"
        intro={
          s.isDirector
            ? "Complete la evaluación de sus áreas con evidencia de soporte y envíela al Director General."
            : "Ocho dimensiones ponderadas. Una puntuación solo cuenta en el resultado global cuando el Director General la aprueba con evidencia."
        }
      />
      {visible.length === 0 ? (
        <Empty title="No tiene áreas asignadas">Solicite al Director General que le asigne sus departamentos.</Empty>
      ) : (
        <div className="panel overflow-x-auto">
          <table className="table min-w-[760px]">
            <thead>
              <tr>
                <th>Dimensión</th>
                <th className="text-right">Peso</th>
                <th>Estado</th>
                <th>Cuestionario</th>
                <th>Propuesta</th>
                <th>Aprobada</th>
                <th>Confianza</th>
                <th>Responsable</th>
                <th>Actualizado</th>
              </tr>
            </thead>
            <tbody>
              {visible.map((d) => {
                const a = byCode.get(d.code);
                const total = (qcount ?? []).filter((q) => q.dimension_code === d.code).length;
                const answered = a ? (rcount ?? []).filter((r) => r.assessment_id === a.id && r.score != null).length : 0;
                const status = a?.status as AssessmentStatus | undefined;
                const resp = a?.responsible as unknown as { full_name: string } | null;
                return (
                  <tr key={d.code}>
                    <td>
                      <Link href={`/departamentos/${d.code}`} className="font-semibold text-navy hover:underline">
                        {d.name}
                      </Link>
                      <div className="text-xs text-muted">{d.department_name}</div>
                    </td>
                    <td className="text-right tabular-nums">{d.weight}%</td>
                    <td>{status ? <Badge tone={statusTone[status]}>{STATUS_LABEL[status]}</Badge> : <Badge>Sin iniciar</Badge>}</td>
                    <td className="tabular-nums">{answered}/{total}</td>
                    <td><ScoreBadge score={a?.proposed_score} /></td>
                    <td>{status === "aprobado" ? <ScoreBadge score={a?.approved_score} /> : <span className="text-muted">—</span>}</td>
                    <td>{a?.confidence ? CONFIDENCE_LABEL[a.confidence as Confidence] : "—"}</td>
                    <td>{resp?.full_name || "—"}</td>
                    <td className="whitespace-nowrap text-muted">{a ? fmtDate(a.updated_at) : "—"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
