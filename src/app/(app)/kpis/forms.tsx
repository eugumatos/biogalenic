"use client";

import { useActionState } from "react";
import { Feedback } from "@/components/feedback";
import type { Dimension } from "@/lib/domain";
import { addMeasurement, saveKpi } from "./actions";

export type KpiRow = {
  id: string;
  dimension_code: string;
  name: string;
  definition: string;
  formula: string;
  unit: string;
  frequency: "semanal" | "mensual";
  direction: "mayor_mejor" | "menor_mejor";
  owner_id: string | null;
  baseline: number | null;
  target: number | null;
  target_approved_by: string | null;
  active: boolean;
};

export function KpiForm({
  kpi,
  dimensions,
  people,
  isMd,
}: {
  kpi?: KpiRow;
  dimensions: Dimension[];
  people: { id: string; full_name: string }[];
  isMd: boolean;
}) {
  const [state, action, pending] = useActionState(saveKpi.bind(null, kpi?.id ?? null), undefined);
  const k = kpi?.id ?? "new";
  return (
    <form action={action} className="grid gap-4 md:grid-cols-4">
      <div className="md:col-span-2">
        <label className="field-label" htmlFor={`kn-${k}`}>Nombre</label>
        <input id={`kn-${k}`} name="name" className="input" defaultValue={kpi?.name} required />
      </div>
      <div>
        <label className="field-label" htmlFor={`kd-${k}`}>Dimensión</label>
        <select id={`kd-${k}`} name="dimension_code" className="input" defaultValue={kpi?.dimension_code ?? dimensions[0]?.code}>
          {dimensions.map((d) => <option key={d.code} value={d.code}>{d.name}</option>)}
        </select>
      </div>
      <div>
        <label className="field-label" htmlFor={`ko-${k}`}>Responsable</label>
        <select id={`ko-${k}`} name="owner_id" className="input" defaultValue={kpi?.owner_id ?? ""}>
          <option value="">Sin asignar</option>
          {people.map((p) => <option key={p.id} value={p.id}>{p.full_name}</option>)}
        </select>
      </div>
      <div className="md:col-span-2">
        <label className="field-label" htmlFor={`kdef-${k}`}>Definición</label>
        <textarea id={`kdef-${k}`} name="definition" className="input min-h-[3.5rem]!" defaultValue={kpi?.definition} />
      </div>
      <div className="md:col-span-2">
        <label className="field-label" htmlFor={`kf-${k}`}>Fórmula</label>
        <textarea id={`kf-${k}`} name="formula" className="input min-h-[3.5rem]!" defaultValue={kpi?.formula} />
      </div>
      <div>
        <label className="field-label" htmlFor={`ku-${k}`}>Unidad</label>
        <input id={`ku-${k}`} name="unit" className="input" defaultValue={kpi?.unit} placeholder="%, USD, días…" />
      </div>
      <div>
        <label className="field-label" htmlFor={`kfr-${k}`}>Frecuencia</label>
        <select id={`kfr-${k}`} name="frequency" className="input" defaultValue={kpi?.frequency ?? "mensual"}>
          <option value="mensual">Mensual</option>
          <option value="semanal">Semanal</option>
        </select>
      </div>
      <div>
        <label className="field-label" htmlFor={`kdir-${k}`}>Sentido deseado</label>
        <select id={`kdir-${k}`} name="direction" className="input" defaultValue={kpi?.direction ?? "mayor_mejor"}>
          <option value="mayor_mejor">Mayor es mejor</option>
          <option value="menor_mejor">Menor es mejor</option>
        </select>
      </div>
      <div />
      <div>
        <label className="field-label" htmlFor={`kb-${k}`}>Línea base</label>
        <input id={`kb-${k}`} name="baseline" inputMode="decimal" className="input" defaultValue={kpi?.baseline ?? ""} />
        <p className="field-hint">Dato real de partida. Déjelo vacío si no existe.</p>
      </div>
      <div>
        <label className="field-label" htmlFor={`kt-${k}`}>Meta</label>
        <input id={`kt-${k}`} name="target" inputMode="decimal" className="input" defaultValue={kpi?.target ?? ""} />
        <p className="field-hint">Meta interna acordada; no use referencias de industria no verificadas.</p>
      </div>
      <div className="flex flex-col justify-center gap-2 text-sm md:col-span-2">
        {isMd ? (
          <label className="flex items-center gap-2">
            <input type="checkbox" name="approve_target" defaultChecked={!!kpi?.target_approved_by} /> Meta aprobada por el Director General
          </label>
        ) : (
          <p className="text-muted">Si cambia la meta, quedará pendiente de aprobación del Director General.</p>
        )}
        {kpi && (
          <label className="flex items-center gap-2">
            <input type="hidden" name="active" value="off" />
            <input type="checkbox" name="active" value="on" defaultChecked={kpi.active} /> KPI activo
          </label>
        )}
      </div>
      <div className="flex items-center gap-3 md:col-span-4">
        <button className="btn btn-primary" disabled={pending}>{kpi ? "Guardar KPI" : "Crear KPI"}</button>
        <Feedback state={state} />
      </div>
    </form>
  );
}

export function MeasurementForm({ kpiId, frequency }: { kpiId: string; frequency: "semanal" | "mensual" }) {
  const [state, action, pending] = useActionState(addMeasurement.bind(null, kpiId), undefined);
  const today = new Date();
  const def =
    frequency === "mensual"
      ? `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-01`
      : today.toISOString().slice(0, 10);
  return (
    <form action={action} className="flex flex-wrap items-end gap-3">
      <div>
        <label className="field-label" htmlFor={`mp-${kpiId}`}>{frequency === "mensual" ? "Mes (primer día)" : "Semana (lunes)"}</label>
        <input id={`mp-${kpiId}`} type="date" name="period_start" className="input" defaultValue={def} required />
      </div>
      <div>
        <label className="field-label" htmlFor={`mv-${kpiId}`}>Valor real</label>
        <input id={`mv-${kpiId}`} name="value" inputMode="decimal" className="input w-32" required />
      </div>
      <div className="min-w-48 flex-1">
        <label className="field-label" htmlFor={`mc-${kpiId}`}>Comentario / fuente</label>
        <input id={`mc-${kpiId}`} name="comment" className="input" />
      </div>
      <button className="btn btn-secondary" disabled={pending}>Registrar</button>
      <Feedback state={state} />
    </form>
  );
}
