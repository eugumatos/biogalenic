import type { Metadata } from "next";
import Link from "next/link";
import { ScoreRadar } from "@/components/charts";
import { Badge, Empty, Notice, PageHeader, Panel, levelTone } from "@/components/ui";
import { COMPETENCIES, LEVEL_LABEL, type Level4 } from "@/lib/domain";
import { requireMd } from "@/lib/session";
import { competencyAverage } from "@/lib/team";
import { EvaluationForm } from "./forms";

export const metadata: Metadata = { title: "Equipo ejecutivo" };

export default async function EquipoPage({ searchParams }: PageProps<"/equipo-ejecutivo">) {
  const s = await requireMd();
  const sp = await searchParams;
  if (!s.cycle) {
    return (
      <>
        <PageHeader title="Equipo ejecutivo" />
        <Empty title="No hay un ciclo de evaluación activo" />
      </>
    );
  }

  const [{ data: execs }, { data: evals }] = await Promise.all([
    s.supabase.from("profiles").select("id, full_name, position, email").eq("is_executive", true).eq("active", true).order("full_name"),
    s.supabase.from("executive_evaluations").select("*").eq("cycle_id", s.cycle.id),
  ]);
  const byExec = new Map((evals ?? []).map((e) => [e.executive_id, e]));
  const selected = typeof sp.e === "string" ? sp.e : execs?.[0]?.id;
  const person = execs?.find((x) => x.id === selected);
  const ev = person ? byExec.get(person.id) ?? null : null;

  // Promedio del equipo por competencia, como referencia en el perfil individual
  const teamAvg = Object.fromEntries(
    COMPETENCIES.map((c) => {
      const v = (evals ?? []).map((e) => e[c.key]).filter((x): x is number => typeof x === "number");
      return [c.key, v.length ? v.reduce((a, b) => a + b, 0) / v.length : null];
    }),
  );

  return (
    <>
      <PageHeader title="Equipo ejecutivo" intro="Evaluación individual confidencial de los directores ejecutivos. Solo el Director General tiene acceso a este módulo." />
      <div className="mb-5"><Notice tone="saline">Información confidencial. No se muestra en tableros ni reportes compartidos con directores o lectores.</Notice></div>

      {!execs?.length ? (
        <Empty title="No hay ejecutivos marcados para evaluación" action={<Link className="btn btn-secondary" href="/administracion?tab=usuarios">Configurar en Administración</Link>}>
          Marque a los directores como “equipo ejecutivo evaluado” en Usuarios y accesos.
        </Empty>
      ) : (
        <div className="grid gap-5 lg:grid-cols-[300px_minmax(0,1fr)]">
          <Panel title="Directores" bodyClassName="p-0 sm:p-0">
            <ul className="divide-y divide-mist">
              {execs.map((x) => {
                const e = byExec.get(x.id);
                const avg = competencyAverage(e);
                return (
                  <li key={x.id}>
                    <Link
                      href={`/equipo-ejecutivo?e=${x.id}`}
                      aria-current={x.id === selected ? "page" : undefined}
                      className={`block px-4 py-3 ${x.id === selected ? "bg-mist-2" : "hover:bg-mist-2"}`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-semibold">{x.full_name || x.email}</span>
                        <span className="tabular-nums text-sm">{avg ?? "—"}</span>
                      </div>
                      <div className="mt-0.5 flex flex-wrap items-center gap-1.5 text-xs text-muted">
                        {x.position ?? "Sin cargo"}
                        {e?.is_critical_talent && <Badge tone="navy">Talento crítico</Badge>}
                        {e?.succession_risk && <Badge tone={levelTone(e.succession_risk)}>Sucesión {LEVEL_LABEL[e.succession_risk as Level4].toLowerCase()}</Badge>}
                      </div>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </Panel>

          {person && (
            <div className="space-y-5">
              <Panel title={`Perfil de desarrollo · ${person.full_name}`} aside={person.position ?? undefined}>
                <div className="grid gap-5 md:grid-cols-[minmax(0,1fr)_260px]">
                  <ScoreRadar
                    data={COMPETENCIES.map((c) => ({ label: c.label, value: (ev?.[c.key] as number | null) ?? null, compare: teamAvg[c.key] }))}
                    seriesLabel={person.full_name}
                    compareLabel="Promedio del equipo"
                    height={320}
                  />
                  <dl className="space-y-3 text-sm">
                    <div><dt className="text-muted">Promedio de competencias</dt><dd className="text-2xl font-bold text-navy">{competencyAverage(ev) ?? "—"}</dd></div>
                    <div><dt className="text-muted">Fortalezas clave</dt><dd>{ev?.strengths ?? "—"}</dd></div>
                    <div><dt className="text-muted">Oportunidades de desarrollo</dt><dd>{ev?.development_opportunities ?? "—"}</dd></div>
                    <div><dt className="text-muted">Prioridades de desarrollo</dt><dd>{ev?.development_priorities ?? "—"}</dd></div>
                  </dl>
                </div>
                <p className="mt-2 text-xs text-muted">Línea punteada: promedio del equipo evaluado en este ciclo.</p>
              </Panel>
              <Panel title="Evaluación">
                <EvaluationForm key={person.id} executiveId={person.id} evaluation={ev} />
              </Panel>
            </div>
          )}
        </div>
      )}
    </>
  );
}
