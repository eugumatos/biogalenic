"use client";

import { useActionState, useState } from "react";
import { Feedback } from "@/components/feedback";
import { ESCALATION_LABEL, RISK_STATUS_LABEL, type Dimension } from "@/lib/domain";
import { isEscalated, riskCriticality } from "@/lib/risk";
import { saveRisk } from "./actions";

export type RiskRow = {
  id: string;
  dimension_code: string;
  description: string;
  probability: number;
  impact: number;
  escalation_category: string | null;
  existing_controls: string | null;
  mitigation: string | null;
  owner_id: string | null;
  due_date: string | null;
  status: string;
};

const CRIT_LABEL = { critico: "Crítico", alto: "Alto", medio: "Medio", bajo: "Bajo" };

export function RiskForm({
  risk,
  dimensions,
  people,
  onSaved,
}: {
  risk?: RiskRow;
  dimensions: Dimension[];
  people: { id: string; full_name: string }[];
  onSaved?: () => void;
}) {
  const [state, action, pending] = useActionState(async (prev: Parameters<typeof saveRisk>[1], fd: FormData) => {
    const r = await saveRisk(risk?.id ?? null, prev, fd);
    if (r?.ok) onSaved?.();
    return r;
  }, undefined);
  const [p, setP] = useState(risk?.probability ?? 3);
  const [i, setI] = useState(risk?.impact ?? 3);
  const [cat, setCat] = useState(risk?.escalation_category ?? "");
  const score = p * i;
  const esc = isEscalated((cat || null) as never, p, i);
  const k = risk?.id ?? "new";

  return (
    <form action={action} className="grid gap-4 md:grid-cols-6">
      <div className="md:col-span-4">
        <label className="field-label" htmlFor={`rd-${k}`}>Descripción del riesgo</label>
        <textarea id={`rd-${k}`} name="description" className="input min-h-[3.5rem]!" defaultValue={risk?.description} required />
      </div>
      <div className="md:col-span-2">
        <label className="field-label" htmlFor={`rdim-${k}`}>Departamento</label>
        <select id={`rdim-${k}`} name="dimension_code" className="input" defaultValue={risk?.dimension_code ?? dimensions[0]?.code}>
          {dimensions.map((d) => <option key={d.code} value={d.code}>{d.department_name}</option>)}
        </select>
      </div>
      <div>
        <label className="field-label" htmlFor={`rp-${k}`}>Probabilidad</label>
        <select id={`rp-${k}`} name="probability" className="input" value={p} onChange={(e) => setP(Number(e.target.value))}>
          {[1, 2, 3, 4, 5].map((n) => <option key={n} value={n}>{n}</option>)}
        </select>
      </div>
      <div>
        <label className="field-label" htmlFor={`ri-${k}`}>Impacto</label>
        <select id={`ri-${k}`} name="impact" className="input" value={i} onChange={(e) => setI(Number(e.target.value))}>
          {[1, 2, 3, 4, 5].map((n) => <option key={n} value={n}>{n}</option>)}
        </select>
      </div>
      <div className="md:col-span-2">
        <label className="field-label" htmlFor={`rc-${k}`}>Categoría de escalamiento</label>
        <select id={`rc-${k}`} name="escalation_category" className="input" value={cat} onChange={(e) => setCat(e.target.value)}>
          <option value="">Ninguna (riesgo de negocio)</option>
          {Object.entries(ESCALATION_LABEL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>
      </div>
      <div className="md:col-span-2 flex flex-col justify-end text-sm">
        <div>
          Puntaje <strong className="tabular-nums">{p} × {i} = {score}</strong> · {CRIT_LABEL[riskCriticality(score)]}
        </div>
        {esc && <div className="font-semibold text-rojo">Se escalará de inmediato al Director General</div>}
      </div>
      <div className="md:col-span-3">
        <label className="field-label" htmlFor={`rec-${k}`}>Controles existentes</label>
        <textarea id={`rec-${k}`} name="existing_controls" className="input min-h-[3.5rem]!" defaultValue={risk?.existing_controls ?? ""} />
      </div>
      <div className="md:col-span-3">
        <label className="field-label" htmlFor={`rm-${k}`}>Acción de mitigación</label>
        <textarea id={`rm-${k}`} name="mitigation" className="input min-h-[3.5rem]!" defaultValue={risk?.mitigation ?? ""} />
      </div>
      <div className="md:col-span-2">
        <label className="field-label" htmlFor={`ro-${k}`}>Responsable</label>
        <select id={`ro-${k}`} name="owner_id" className="input" defaultValue={risk?.owner_id ?? ""}>
          <option value="">Sin asignar</option>
          {people.map((x) => <option key={x.id} value={x.id}>{x.full_name}</option>)}
        </select>
      </div>
      <div className="md:col-span-2">
        <label className="field-label" htmlFor={`rdd-${k}`}>Fecha compromiso</label>
        <input id={`rdd-${k}`} type="date" name="due_date" className="input" defaultValue={risk?.due_date ?? ""} />
      </div>
      <div className="md:col-span-2">
        <label className="field-label" htmlFor={`rs-${k}`}>Estado</label>
        <select id={`rs-${k}`} name="status" className="input" defaultValue={risk?.status ?? "abierto"}>
          {Object.entries(RISK_STATUS_LABEL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>
      </div>
      <div className="flex items-center gap-3 md:col-span-6">
        <button className="btn btn-primary" disabled={pending}>{risk ? "Guardar cambios" : "Registrar riesgo"}</button>
        <Feedback state={state} />
      </div>
    </form>
  );
}

export function RiskEditor({
  risk,
  dimensions,
  people,
  label = "Editar",
}: {
  risk?: RiskRow;
  dimensions: Dimension[];
  people: { id: string; full_name: string }[];
  label?: string;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" className={risk ? "btn-quiet text-sm" : "btn btn-primary"} onClick={() => setOpen(true)}>
        {label}
      </button>
      {open && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-navy/40 p-4 sm:p-10" role="dialog" aria-modal="true" aria-label={risk ? "Editar riesgo" : "Nuevo riesgo"}>
          <div className="panel w-full max-w-3xl">
            <div className="flex items-center justify-between border-b border-rule px-5 py-3">
              <h2 className="font-semibold">{risk ? "Editar riesgo" : "Nuevo riesgo"}</h2>
              <button type="button" className="btn-quiet" onClick={() => setOpen(false)}>Cerrar</button>
            </div>
            <div className="p-5">
              <RiskForm risk={risk} dimensions={dimensions} people={people} onSaved={() => setTimeout(() => setOpen(false), 700)} />
            </div>
          </div>
        </div>
      )}
    </>
  );
}
