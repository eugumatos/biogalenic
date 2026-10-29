"use client";

import { useActionState, useState } from "react";
import { Feedback } from "@/components/feedback";
import { STARS, type StarsScenario } from "@/lib/domain";
import { decideStars, runExecutiveAnalysis } from "./actions";

export function RunAnalysisButton({ hasRun }: { hasRun: boolean }) {
  const [state, action, pending] = useActionState(runExecutiveAnalysis, undefined);
  return (
    <form action={action} className="flex flex-col items-end gap-1">
      <button className="btn btn-primary" disabled={pending}>
        {pending ? "Analizando… (1–3 min)" : hasRun ? "Actualizar análisis" : "Ejecutar análisis ejecutivo"}
      </button>
      <Feedback state={state} />
    </form>
  );
}

export function StarsDecisionForm({
  aiPrimary,
  current,
}: {
  aiPrimary: StarsScenario | null;
  current: { md_primary: StarsScenario | null; md_secondary: StarsScenario[]; md_rationale: string | null; override_justification: string | null } | null;
}) {
  const [state, action, pending] = useActionState(decideStars, undefined);
  const [primary, setPrimary] = useState<string>(current?.md_primary ?? aiPrimary ?? "");
  const differs = !!aiPrimary && !!primary && primary !== aiPrimary;

  return (
    <form action={action} className="space-y-4">
      <fieldset>
        <legend className="field-label">Escenario principal</legend>
        <div className="grid gap-1.5 sm:grid-cols-2">
          {STARS.map((s) => (
            <label key={s.key} className="flex items-center gap-2 text-sm">
              <input type="radio" name="md_primary" value={s.key} checked={primary === s.key} onChange={() => setPrimary(s.key)} />
              {s.name}
              {aiPrimary === s.key && <span className="text-xs text-navy-3">(propuesta IA)</span>}
            </label>
          ))}
        </div>
      </fieldset>
      <fieldset>
        <legend className="field-label">Escenarios secundarios (máx. 2)</legend>
        <div className="grid gap-1.5 sm:grid-cols-2">
          {STARS.filter((s) => s.key !== primary).map((s) => (
            <label key={s.key} className="flex items-center gap-2 text-sm">
              <input type="checkbox" name="md_secondary" value={s.key} defaultChecked={current?.md_secondary.includes(s.key)} />
              {s.name}
            </label>
          ))}
        </div>
      </fieldset>
      <div>
        <label className="field-label" htmlFor="md_rationale">Fundamento de la decisión</label>
        <textarea id="md_rationale" name="md_rationale" className="input" defaultValue={current?.md_rationale ?? ""} />
      </div>
      {differs && (
        <div>
          <label className="field-label" htmlFor="override_justification">Justificación para apartarse de la propuesta de la IA (obligatoria para aprobar)</label>
          <textarea id="override_justification" name="override_justification" className="input" defaultValue={current?.override_justification ?? ""} required />
        </div>
      )}
      <div className="flex flex-wrap items-center gap-2">
        <button className="btn btn-primary" name="decision" value="aprobar" disabled={pending || !primary}>Aprobar clasificación</button>
        <button className="btn btn-secondary" name="decision" value="borrador" disabled={pending || !primary}>Guardar sin aprobar</button>
        <Feedback state={state} />
      </div>
    </form>
  );
}
