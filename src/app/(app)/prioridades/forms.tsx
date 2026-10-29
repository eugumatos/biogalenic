"use client";

import { useActionState } from "react";
import { Feedback } from "@/components/feedback";
import type { Dimension } from "@/lib/domain";
import { savePriority } from "./actions";

export type PriorityRow = {
  id: string;
  objective: string;
  rationale: string | null;
  expected_impact: string | null;
  responsible_id: string | null;
  supporting_dimensions: string[];
  kpi_id: string | null;
  kpi_text: string | null;
  baseline: string | null;
  target: string | null;
  deadline: string | null;
  resources: string | null;
  risks_dependencies: string | null;
  status: string;
  decision_note: string | null;
};

export function PriorityForm({
  priority,
  dimensions,
  people,
  kpis,
  approvedCount,
}: {
  priority?: PriorityRow;
  dimensions: Dimension[];
  people: { id: string; full_name: string }[];
  kpis: { id: string; name: string }[];
  approvedCount: number;
}) {
  const [state, action, pending] = useActionState(savePriority.bind(null, priority?.id ?? null), undefined);
  const k = priority?.id ?? "new";
  const full = approvedCount >= 5 && priority?.status !== "aprobada";
  const field = (name: keyof PriorityRow, label: string, opts: { area?: boolean; hint?: string; span?: boolean } = {}) => (
    <div className={opts.span ? "md:col-span-2" : undefined}>
      <label className="field-label" htmlFor={`${name}-${k}`}>{label}</label>
      {opts.area ? (
        <textarea id={`${name}-${k}`} name={name} className="input min-h-[3.5rem]!" defaultValue={(priority?.[name] as string) ?? ""} />
      ) : (
        <input id={`${name}-${k}`} name={name} className="input" defaultValue={(priority?.[name] as string) ?? ""} />
      )}
      {opts.hint && <p className="field-hint">{opts.hint}</p>}
    </div>
  );

  return (
    <form action={action} className="grid gap-4 md:grid-cols-2">
      {field("objective", "Objetivo estratégico", { area: true, span: true })}
      {field("rationale", "Justificación de negocio", { area: true })}
      {field("expected_impact", "Impacto esperado", { area: true })}
      <div>
        <label className="field-label" htmlFor={`resp-${k}`}>Director responsable</label>
        <select id={`resp-${k}`} name="responsible_id" className="input" defaultValue={priority?.responsible_id ?? ""}>
          <option value="">Sin asignar</option>
          {people.map((p) => <option key={p.id} value={p.id}>{p.full_name}</option>)}
        </select>
      </div>
      <div>
        <label className="field-label" htmlFor={`deadline-${k}`}>Fecha límite</label>
        <input id={`deadline-${k}`} name="deadline" type="date" className="input" defaultValue={priority?.deadline ?? ""} />
      </div>
      <fieldset className="md:col-span-2">
        <legend className="field-label">Departamentos de apoyo</legend>
        <div className="grid gap-1.5 sm:grid-cols-4">
          {dimensions.map((d) => (
            <label key={d.code} className="flex items-center gap-2 text-sm">
              <input type="checkbox" name="supporting_dimensions" value={d.code} defaultChecked={priority?.supporting_dimensions.includes(d.code)} />
              {d.department_name}
            </label>
          ))}
        </div>
      </fieldset>
      <div>
        <label className="field-label" htmlFor={`kpi-${k}`}>KPI del catálogo</label>
        <select id={`kpi-${k}`} name="kpi_id" className="input" defaultValue={priority?.kpi_id ?? ""}>
          <option value="">Ninguno / texto libre</option>
          {kpis.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}
        </select>
      </div>
      {field("kpi_text", "KPI (descripción)")}
      {field("baseline", "Línea base", { hint: "Solo datos reales. Use “Requiere evidencia” si no existe." })}
      {field("target", "Meta", { hint: "Meta aprobada por el MD; sin referencias de industria no verificadas." })}
      {field("resources", "Recursos requeridos", { area: true })}
      {field("risks_dependencies", "Riesgos y dependencias", { area: true })}
      {field("decision_note", "Nota de decisión del MD", { area: true, span: true })}
      <div className="flex flex-wrap items-center gap-2 md:col-span-2">
        <button className="btn btn-primary" name="decision" value="aprobar" disabled={pending || full}>
          {priority?.status === "aprobada" ? "Guardar cambios" : "Aprobar"}
        </button>
        {priority?.status !== "aprobada" && (
          <button className="btn btn-secondary" name="decision" value="guardar" disabled={pending}>Guardar como propuesta</button>
        )}
        {priority && priority.status !== "rechazada" && (
          <button className="btn btn-danger" name="decision" value="rechazar" disabled={pending}>Rechazar</button>
        )}
        {full && <span className="text-sm text-ambar">Ya hay cinco prioridades aprobadas.</span>}
        <Feedback state={state} />
      </div>
    </form>
  );
}
