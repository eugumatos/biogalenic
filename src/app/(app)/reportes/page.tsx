import type { Metadata } from "next";
import { Empty, PageHeader, Panel } from "@/components/ui";
import { getSession } from "@/lib/session";
import { RecommendationsForm } from "./forms";

export const metadata: Metadata = { title: "Reportes y exportación" };

const SECTIONS = [
  "Resumen ejecutivo",
  "Descripción de la empresa",
  "Evaluación STARS",
  "Evaluación de las ocho dimensiones",
  "Desempeño departamental",
  "Evaluación del equipo ejecutivo",
  "Riesgos críticos",
  "Prioridades estratégicas",
  "Quick wins",
  "Plan de 90 días",
  "Recomendaciones del Director General",
];

export default async function ReportesPage() {
  const s = await getSession();
  if (!s.cycle) {
    return (
      <>
        <PageHeader title="Reportes y exportación" />
        <Empty title="No hay un ciclo de evaluación activo" />
      </>
    );
  }
  const { data: cycle } = s.isMd
    ? await s.supabase.from("assessment_cycles").select("md_recommendations").eq("id", s.cycle.id).single()
    : { data: null };

  return (
    <>
      <PageHeader
        title="Reportes y exportación"
        intro={`Reporte ejecutivo del ciclo ${s.cycle.name}, apto para accionistas, junta directiva y alta dirección.`}
      />
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-5">
          <Panel title="Reporte ejecutivo (PDF)">
            <ol className="mb-5 grid list-decimal gap-x-8 gap-y-1 pl-5 text-sm sm:grid-cols-2">
              {SECTIONS.map((x) => <li key={x}>{x}</li>)}
            </ol>
            <a href="/api/reportes/pdf" className="btn btn-primary">Descargar PDF</a>
            <p className="mt-3 text-xs text-muted">
              {s.isMd
                ? "Su versión incluye el análisis de la IA y la evaluación confidencial del equipo ejecutivo. Revise el contenido antes de distribuirlo."
                : "Su versión incluye solo información aprobada por el Director General. La evaluación del equipo ejecutivo es confidencial."}
            </p>
          </Panel>
          <Panel title="Libro de datos (Excel)">
            <p className="mb-4 text-sm">
              Hojas: resumen y fórmula de cálculo, dimensiones, riesgos, KPIs con historial de mediciones, prioridades y plan de 90 días
              {s.isMd ? ", más equipo ejecutivo" : ""}.
            </p>
            <a href="/api/reportes/excel" className="btn btn-secondary">Descargar Excel</a>
          </Panel>
          {s.isMd && (
            <Panel title="Sección 11 del reporte">
              <RecommendationsForm value={cycle?.md_recommendations ?? null} />
            </Panel>
          )}
        </div>
        <aside>
          <Panel title="Antes de compartir">
            <ul className="list-disc space-y-2 pl-5 text-sm text-muted">
              <li>Las puntuaciones globales consideran solo dimensiones aprobadas; el reporte indica la cobertura.</li>
              <li>Las afirmaciones de la IA están clasificadas como hecho verificado, interpretación, hipótesis o recomendación.</li>
              <li>Los riesgos escalados se incluyen siempre.</li>
              <li>Este reporte no constituye un registro GMP ni sustituye los sistemas de calidad aprobados.</li>
            </ul>
          </Panel>
        </aside>
      </div>
    </>
  );
}
