"use client";

import { useActionState } from "react";
import { Feedback } from "@/components/feedback";
import { COMPETENCIES } from "@/lib/domain";
import { ScalePicker } from "../departamentos/[code]/forms";
import { saveEvaluation } from "./actions";

export function EvaluationForm({ executiveId, evaluation }: { executiveId: string; evaluation: Record<string, unknown> | null }) {
  const [state, action, pending] = useActionState(saveEvaluation.bind(null, executiveId), undefined);
  const v = (k: string) => (evaluation?.[k] as string | null) ?? "";
  return (
    <form action={action} className="space-y-5">
      <div className="grid gap-x-6 gap-y-3 md:grid-cols-2">
        {COMPETENCIES.map((c) => (
          <div key={c.key} className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-sm font-medium">{c.label}</span>
            <ScalePicker name={c.key} defaultValue={evaluation?.[c.key] as number | null} label={c.label} />
          </div>
        ))}
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <label className="field-label" htmlFor={`s-${executiveId}`}>Fortalezas clave</label>
          <textarea id={`s-${executiveId}`} name="strengths" className="input" defaultValue={v("strengths")} />
        </div>
        <div>
          <label className="field-label" htmlFor={`d-${executiveId}`}>Oportunidades de desarrollo</label>
          <textarea id={`d-${executiveId}`} name="development_opportunities" className="input" defaultValue={v("development_opportunities")} />
        </div>
        <div className="md:col-span-2">
          <label className="field-label" htmlFor={`p-${executiveId}`}>Prioridades individuales de desarrollo</label>
          <textarea id={`p-${executiveId}`} name="development_priorities" className="input" defaultValue={v("development_priorities")} />
        </div>
        <div>
          <label className="field-label" htmlFor={`r-${executiveId}`}>Riesgo de sucesión</label>
          <select id={`r-${executiveId}`} name="succession_risk" className="input" defaultValue={v("succession_risk")}>
            <option value="">Sin evaluar</option>
            <option value="bajo">Bajo</option>
            <option value="medio">Medio</option>
            <option value="alto">Alto</option>
            <option value="critico">Crítico</option>
          </select>
        </div>
        <label className="flex items-center gap-2 self-end pb-2 text-sm">
          <input type="checkbox" name="is_critical_talent" defaultChecked={!!evaluation?.is_critical_talent} /> Talento crítico
        </label>
      </div>
      <div className="flex items-center gap-3">
        <button className="btn btn-primary" disabled={pending}>Guardar evaluación</button>
        <Feedback state={state} />
      </div>
    </form>
  );
}
