import type { Metadata } from "next";
import Link from "next/link";
import clsx from "clsx";
import { Badge, Empty, PageHeader, Panel, fmtDate, fmtNum } from "@/components/ui";
import { Sparkline } from "@/components/sparkline";
import { KPI_STATUS_LABEL, KPI_TREND_LABEL, kpiStatus, kpiTrend, sortMeasurements, type KpiStatus } from "@/lib/kpi";
import { getSession } from "@/lib/session";
import { deleteMeasurement } from "./actions";
import { KpiForm, MeasurementForm, type KpiRow } from "./forms";

export const metadata: Metadata = { title: "Gestión de KPIs" };

const statusTone: Record<KpiStatus, "verde" | "rojo" | "neutral"> = {
  en_meta: "verde",
  fuera_de_meta: "rojo",
  sin_meta: "neutral",
  sin_dato: "neutral",
};

export default async function KpisPage({ searchParams }: PageProps<"/kpis">) {
  const s = await getSession();
  const sp = await searchParams;
  const dim = typeof sp.dim === "string" ? sp.dim : "";
  const q = typeof sp.q === "string" ? sp.q : "";

  const [{ data: kpis }, { data: people }] = await Promise.all([
    s.supabase
      .from("kpis")
      .select("*, owner:profiles!kpis_owner_id_fkey(full_name), kpi_measurements(id, period_start, value, comment)")
      .order("name"),
    s.supabase.from("profiles").select("id, full_name").eq("active", true).neq("role", "lector").order("full_name"),
  ]);

  const list = (kpis ?? []).filter(
    (k) => (!dim || k.dimension_code === dim) && (!q || `${k.name} ${k.definition}`.toLowerCase().includes(q.toLowerCase())),
  );
  const editableDims = s.dimensions.filter((d) => s.canEditDimension(d.code));

  return (
    <>
      <PageHeader
        title="Gestión de KPIs"
        intro="Base central de indicadores. Las metas las establecen el Director General y los directores; un KPI solo se califica contra una meta aprobada por el MD."
      />

      <form className="no-print mb-4 flex flex-wrap items-end gap-3" role="search">
        <div>
          <label className="field-label" htmlFor="kf-dim">Dimensión</label>
          <select id="kf-dim" name="dim" className="input" defaultValue={dim}>
            <option value="">Todas</option>
            {s.dimensions.map((d) => <option key={d.code} value={d.code}>{d.name}</option>)}
          </select>
        </div>
        <div className="min-w-48 flex-1">
          <label className="field-label" htmlFor="kf-q">Buscar</label>
          <input id="kf-q" name="q" className="input" defaultValue={q} />
        </div>
        <button className="btn btn-secondary">Filtrar</button>
        {(dim || q) && <Link href="/kpis" className="btn-quiet text-sm">Limpiar</Link>}
      </form>

      {s.dimensions
        .filter((d) => !dim || d.code === dim)
        .map((d) => {
          const rows = list.filter((k) => k.dimension_code === d.code);
          if (!rows.length) return null;
          const canEdit = s.canEditDimension(d.code);
          return (
            <Panel key={d.code} title={d.name} aside={`${rows.length} KPI`} className="mb-5" bodyClassName="p-0 sm:p-0">
              <ul className="divide-y divide-mist">
                {rows.map((k) => {
                  const ms = sortMeasurements(k.kpi_measurements ?? []);
                  const last = ms.at(-1);
                  const approved = !!k.target_approved_by;
                  const status = kpiStatus(ms, k.target, approved, k.direction);
                  const trend = kpiTrend(ms, k.direction);
                  const full = (k.kpi_measurements ?? []) as { id: string; period_start: string; value: number; comment: string | null }[];
                  return (
                    <li key={k.id} className={clsx("px-4 py-3 sm:px-5", !k.active && "opacity-60")}>
                      <div className="grid items-center gap-3 md:grid-cols-[minmax(0,1.6fr)_repeat(4,minmax(0,0.7fr))_110px]">
                        <div className="min-w-0">
                          <div className="font-semibold">{k.name} {!k.active && <span className="text-xs font-normal">(inactivo)</span>}</div>
                          <div className="text-xs text-muted">
                            {k.unit || "sin unidad"} · {k.frequency} · {k.direction === "mayor_mejor" ? "mayor es mejor" : "menor es mejor"} ·{" "}
                            {(k.owner as { full_name: string } | null)?.full_name ?? "sin responsable"}
                          </div>
                        </div>
                        <Cell label="Línea base" value={fmtNum(k.baseline)} />
                        <Cell
                          label={approved ? "Meta aprobada" : "Meta (pendiente)"}
                          value={k.target != null ? fmtNum(k.target) : "—"}
                        />
                        <Cell label={last ? `Real ${fmtDate(last.period_start)}` : "Real"} value={last ? fmtNum(last.value) : "—"} />
                        <div>
                          <Badge tone={statusTone[status]}>{KPI_STATUS_LABEL[status]}</Badge>
                          <div className={clsx("mt-1 text-xs", trend === "empeora" ? "text-rojo" : trend === "mejora" ? "text-verde" : "text-muted")}>
                            {KPI_TREND_LABEL[trend]}
                          </div>
                        </div>
                        <Sparkline values={ms.slice(-12).map((m) => m.value)} target={approved ? k.target : null} />
                      </div>

                      <details className="group mt-2">
                        <summary className="cursor-pointer list-none text-sm text-navy-3 hover:underline">
                          Definición, historial{canEdit ? " y edición" : ""}
                        </summary>
                        <div className="mt-3 space-y-4 rounded-[4px] bg-mist-2 p-4">
                          <dl className="grid gap-3 text-sm md:grid-cols-2">
                            <div><dt className="text-muted">Definición</dt><dd>{k.definition || "—"}</dd></div>
                            <div><dt className="text-muted">Fórmula</dt><dd>{k.formula || "—"}</dd></div>
                          </dl>
                          {full.length > 0 && (
                            <table className="table bg-white">
                              <thead><tr><th>Periodo</th><th className="text-right">Valor</th><th>Comentario</th>{canEdit && <th />}</tr></thead>
                              <tbody>
                                {[...full].sort((a, b) => b.period_start.localeCompare(a.period_start)).slice(0, 24).map((m) => (
                                  <tr key={m.id}>
                                    <td>{fmtDate(m.period_start)}</td>
                                    <td className="text-right tabular-nums">{fmtNum(Number(m.value))}</td>
                                    <td className="text-muted">{m.comment ?? ""}</td>
                                    {canEdit && (
                                      <td className="text-right">
                                        <form action={deleteMeasurement.bind(null, m.id)}><button className="btn-quiet text-xs text-muted">Eliminar</button></form>
                                      </td>
                                    )}
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          )}
                          {canEdit && <MeasurementForm kpiId={k.id} frequency={k.frequency} />}
                          {canEdit && (
                            <details>
                              <summary className="cursor-pointer text-sm font-semibold text-navy">Editar KPI</summary>
                              <div className="mt-3"><KpiForm kpi={k as KpiRow} dimensions={editableDims} people={people ?? []} isMd={s.isMd} /></div>
                            </details>
                          )}
                        </div>
                      </details>
                    </li>
                  );
                })}
              </ul>
            </Panel>
          );
        })}

      {list.length === 0 && <Empty title="No hay KPIs que coincidan" />}

      {editableDims.length > 0 && (
        <Panel title="Nuevo KPI">
          <KpiForm dimensions={editableDims} people={people ?? []} isMd={s.isMd} />
        </Panel>
      )}
    </>
  );
}

function Cell({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs text-muted">{label}</div>
      <div className="font-semibold tabular-nums">{value}</div>
    </div>
  );
}
