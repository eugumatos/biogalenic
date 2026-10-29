import { ClaimList } from "@/components/claims";
import { Panel } from "@/components/ui";
import type { Analysis, ValidationReport } from "@/lib/ai/schema";

export function AnalysisView({ analysis, validation, dimName }: { analysis: Analysis; validation?: ValidationReport | null; dimName: (c: string) => string }) {
  const a = analysis;
  return (
    <div className="space-y-5">
      <Panel title="A. Diagnóstico ejecutivo">
        <p className="prose-memo">{a.diagnostico.situacion_general}</p>
        <div className="mt-5 grid gap-6 md:grid-cols-2">
          <Block title="Asuntos críticos"><ClaimList claims={a.diagnostico.asuntos_criticos} empty="Sin asuntos críticos identificados." /></Block>
          <Block title="Hallazgos clave"><ClaimList claims={a.diagnostico.hallazgos_clave} /></Block>
          <Block title="Fortalezas"><ClaimList claims={a.diagnostico.fortalezas} /></Block>
          <Block title="Debilidades"><ClaimList claims={a.diagnostico.debilidades} /></Block>
        </div>
      </Panel>

      <Panel title="C. Análisis de causas raíz">
        {a.causas_raiz.relaciones.length > 0 && (
          <div className="mb-5 overflow-x-auto">
            <table className="table min-w-[640px]">
              <thead><tr><th>Síntoma</th><th>Causa raíz</th><th>Áreas</th><th>Tipo</th></tr></thead>
              <tbody>
                {a.causas_raiz.relaciones.map((r, i) => (
                  <tr key={i}>
                    <td>{r.sintoma}</td>
                    <td className="font-medium">{r.causa_raiz}</td>
                    <td className="text-muted">{r.dimensiones.map(dimName).join(", ")}</td>
                    <td className="text-xs text-muted">{{ hecho_verificado: "Hecho verificado", interpretacion: "Interpretación", hipotesis: "Hipótesis" }[r.tipo]}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <div className="grid gap-6 md:grid-cols-2">
          <Block title="Problemas recurrentes"><ClaimList claims={a.causas_raiz.problemas_recurrentes} /></Block>
          <Block title="Problemas estructurales"><ClaimList claims={a.causas_raiz.problemas_estructurales} /></Block>
        </div>
      </Panel>

      <Panel title="D. Recomendaciones estratégicas" aside="Las cinco prioridades propuestas están en Prioridades estratégicas">
        <div className="grid gap-6 md:grid-cols-3">
          <Block title="Quick wins"><ClaimList claims={a.recomendaciones.quick_wins} /></Block>
          <Block title="Mejoras de mediano plazo"><ClaimList claims={a.recomendaciones.mediano_plazo} /></Block>
          <Block title="Iniciativas estructurales de largo plazo"><ClaimList claims={a.recomendaciones.largo_plazo} /></Block>
        </div>
      </Panel>

      <Panel title="E. Soporte a la decisión ejecutiva">
        <div className="grid gap-6 md:grid-cols-2">
          <Block title="Decisiones que requieren al Director General"><ClaimList claims={a.soporte_decision.decisiones_md} /></Block>
          <Block title="Decisiones delegables"><ClaimList claims={a.soporte_decision.decisiones_delegables} /></Block>
          <Block title="Prioridades de asignación de recursos"><ClaimList claims={a.soporte_decision.asignacion_recursos} /></Block>
          <Block title="Alineación organizacional"><ClaimList claims={a.soporte_decision.alineacion_organizacional} /></Block>
        </div>
      </Panel>

      <Panel title="Evidencia requerida" aside="Información faltante para un diagnóstico confiable">
        {a.evidencia_requerida.length ? (
          <ul className="space-y-1.5 text-sm">
            {a.evidencia_requerida.map((e, i) => (
              <li key={i}><span className="font-semibold">{dimName(e.dimension)}:</span> {e.detalle}</li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted">La IA no reportó faltantes.</p>
        )}
        {validation && validation.downgraded > 0 && (
          <p className="mt-4 text-xs text-muted">
            Control automático: {validation.downgraded} afirmación(es) presentada(s) como hecho sin fuente verificable se reclasificaron como interpretación.
          </p>
        )}
      </Panel>
    </div>
  );
}

function Block({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="mb-2 text-sm font-semibold">{title}</h3>
      {children}
    </div>
  );
}
