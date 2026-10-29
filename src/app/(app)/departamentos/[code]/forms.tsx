"use client";

import { Feedback } from "@/components/feedback";
import { useActionState, useState } from "react";
import clsx from "clsx";
import { SCORE_LABEL } from "@/lib/domain";
import { decideAssessment, saveAssessment } from "../actions";

type Question = { id: string; topic: string; prompt: string };
type Response = { question_id: string; score: number | null; answer: string | null };
type Person = { id: string; full_name: string; role: string };
type Assessment = Record<string, unknown> | null;


export function ScalePicker({
  name,
  defaultValue,
  disabled,
  label,
  onChange,
}: {
  name: string;
  defaultValue: number | null | undefined;
  disabled?: boolean;
  label: string;
  onChange?: (v: number | null) => void;
}) {
  const [value, setValue] = useState<number | null>(defaultValue ?? null);
  return (
    <fieldset className="flex flex-wrap gap-1" disabled={disabled} aria-label={label}>
      <input type="hidden" name={name} value={value ?? ""} />
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          aria-pressed={value === n}
          title={SCORE_LABEL[n]}
          onClick={() => {
            const v = value === n ? null : n;
            setValue(v);
            onChange?.(v);
          }}
          className={clsx(
            "h-8 min-w-8 rounded-[4px] border px-2 text-sm font-semibold tabular-nums transition-colors disabled:cursor-not-allowed",
            value === n
              ? n <= 2
                ? "border-rojo bg-rojo text-white"
                : n === 3
                  ? "border-ambar-line bg-ambar-line text-white"
                  : "border-verde bg-verde text-white"
              : "border-rule bg-white text-ink hover:border-navy-3",
          )}
        >
          {n}
        </button>
      ))}
      {value != null && <span className="ml-1 self-center text-xs text-muted">{SCORE_LABEL[value]}</span>}
    </fieldset>
  );
}

export function AssessmentForm({
  code,
  canEdit,
  canSubmit,
  questions,
  responses,
  people,
  assessment: a,
}: {
  code: string;
  canEdit: boolean;
  canSubmit: boolean;
  questions: Question[];
  responses: Response[];
  people: Person[];
  assessment: Assessment;
}) {
  const [state, action, pending] = useActionState(saveAssessment.bind(null, code), undefined);
  const byQ = new Map(responses.map((r) => [r.question_id, r]));
  const [scores, setScores] = useState<Record<string, number | null>>(
    Object.fromEntries(responses.map((r) => [r.question_id, r.score])),
  );
  const vals = Object.values(scores).filter((v): v is number => v != null);
  const avg = vals.length ? vals.reduce((x, y) => x + y, 0) / vals.length : null;
  const v = (k: string) => (a?.[k] as string | null | undefined) ?? "";

  return (
    <form action={action} className="space-y-5">
      <section className="panel">
        <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-rule px-4 py-3 sm:px-5">
          <h2 className="text-[0.98rem] font-semibold">Cuestionario</h2>
          <span className="text-sm text-muted">
            {vals.length}/{questions.length} con puntuación
            {avg != null && <> · promedio {avg.toFixed(1)} (referencia, no reemplaza el juicio del director)</>}
          </span>
        </div>
        <ol className="divide-y divide-mist">
          {questions.map((q) => {
            const r = byQ.get(q.id);
            return (
              <li key={q.id} className="grid gap-3 px-4 py-4 sm:px-5 md:grid-cols-[minmax(0,1fr)_auto]">
                <div className="min-w-0">
                  <div className="text-[0.8rem] font-semibold text-navy-3">{q.topic}</div>
                  <p className="text-[0.95rem]">{q.prompt}</p>
                  <textarea
                    name={`q_${q.id}_answer`}
                    defaultValue={r?.answer ?? ""}
                    disabled={!canEdit}
                    className="input mt-2 min-h-[3.5rem]!"
                    placeholder="Desempeño actual, datos disponibles y fuente"
                    aria-label={`Respuesta: ${q.topic}`}
                  />
                </div>
                <ScalePicker
                  name={`q_${q.id}_score`}
                  defaultValue={r?.score}
                  disabled={!canEdit}
                  label={`Puntuación: ${q.topic}`}
                  onChange={(val) => setScores((s) => ({ ...s, [q.id]: val }))}
                />
              </li>
            );
          })}
        </ol>
      </section>

      <section className="panel">
        <div className="border-b border-rule px-4 py-3 sm:px-5">
          <h2 className="text-[0.98rem] font-semibold">Diagnóstico de la dimensión</h2>
        </div>
        <div className="grid gap-4 p-4 sm:p-5 md:grid-cols-2">
          {[
            ["current_performance", "Desempeño actual", "Situación con datos y periodo de referencia."],
            ["gaps", "Brechas identificadas", "Diferencia entre lo actual y lo requerido."],
            ["root_causes", "Causas raíz", "Distinga síntomas de causas."],
            ["business_impact", "Impacto en el negocio", "Efecto en resultados, cumplimiento, clientes o personas."],
            ["opportunities", "Oportunidades de mejora", "Iniciativas propuestas y su alcance."],
          ].map(([k, label, hint]) => (
            <div key={k} className={k === "opportunities" ? "md:col-span-2" : undefined}>
              <label className="field-label" htmlFor={k}>{label}</label>
              <textarea id={k} name={k} className="input" defaultValue={v(k)} disabled={!canEdit} />
              <p className="field-hint">{hint}</p>
            </div>
          ))}
          <div>
            <label className="field-label" htmlFor="risk_class">Clasificación de riesgo</label>
            <select id="risk_class" name="risk_class" className="input" defaultValue={v("risk_class")} disabled={!canEdit}>
              <option value="">Sin clasificar</option>
              <option value="bajo">Bajo</option>
              <option value="medio">Medio</option>
              <option value="alto">Alto</option>
              <option value="critico">Crítico</option>
            </select>
          </div>
          <div>
            <label className="field-label" htmlFor="responsible_id">Director responsable</label>
            <select id="responsible_id" name="responsible_id" className="input" defaultValue={v("responsible_id")} disabled={!canEdit}>
              <option value="">Sin asignar</option>
              {people.map((p) => (
                <option key={p.id} value={p.id}>{p.full_name || "(sin nombre)"}</option>
              ))}
            </select>
          </div>
        </div>
      </section>

      <section className="panel">
        <div className="border-b border-rule px-4 py-3 sm:px-5">
          <h2 className="text-[0.98rem] font-semibold">Puntuación propuesta</h2>
        </div>
        <div className="grid gap-5 p-4 sm:p-5 md:grid-cols-2">
          <div>
            <span className="field-label">Puntuación de la dimensión (1–5)</span>
            <ScalePicker name="proposed_score" defaultValue={a?.proposed_score as number | null} disabled={!canEdit} label="Puntuación propuesta" />
            <p className="field-hint">1 Crítico · 2 Débil · 3 Intermedio · 4 Sólido · 5 Excelente</p>
          </div>
          <div>
            <label className="field-label" htmlFor="confidence">Nivel de confianza</label>
            <select id="confidence" name="confidence" className="input" defaultValue={v("confidence")} disabled={!canEdit}>
              <option value="">Seleccione</option>
              <option value="alta">Alta — datos verificados y evidencia completa</option>
              <option value="media">Media — datos parciales o sin verificar</option>
              <option value="baja">Baja — percepción o información insuficiente</option>
            </select>
          </div>
        </div>
        {canEdit && (
          <div className="flex flex-wrap items-center gap-3 border-t border-rule px-4 py-3 sm:px-5">
            <button className="btn btn-secondary" name="intent" value="borrador" disabled={pending}>Guardar borrador</button>
            {canSubmit && (
              <button className="btn btn-primary" name="intent" value="enviar" disabled={pending}>Enviar al Director General</button>
            )}
            <Feedback state={state} />
          </div>
        )}
      </section>
    </form>
  );
}

export function DecisionForm({
  id,
  mode,
  proposed,
  evidenceCount,
}: {
  id: string;
  mode: "decidir" | "reabrir";
  proposed: number | null;
  evidenceCount: number;
}) {
  const [state, action, pending] = useActionState(decideAssessment.bind(null, id), undefined);
  const [score, setScore] = useState<number | null>(proposed);
  const changed = score != null && score !== proposed;

  if (mode === "reabrir") {
    return (
      <form action={action} className="space-y-2 pt-2">
        <textarea name="md_comment" className="input" placeholder="Motivo para reabrir" aria-label="Motivo para reabrir" />
        <button className="btn btn-secondary" name="decision" value="reabrir" disabled={pending}>Reabrir evaluación</button>
        <Feedback state={state} />
      </form>
    );
  }

  return (
    <form action={action} className="space-y-4">
      <div>
        <span className="field-label">Puntuación aprobada</span>
        <ScalePicker name="approved_score" defaultValue={proposed} label="Puntuación aprobada" onChange={setScore} />
        <p className="field-hint">Propuesta del director: {proposed ?? "—"}</p>
      </div>
      {changed && (
        <div>
          <label className="field-label" htmlFor="override_justification">Justificación del ajuste (obligatoria)</label>
          <textarea id="override_justification" name="override_justification" className="input" required />
        </div>
      )}
      <div>
        <label className="field-label" htmlFor="md_comment">Comentario al director</label>
        <textarea id="md_comment" name="md_comment" className="input min-h-[3.5rem]!" />
      </div>
      {evidenceCount === 0 && (
        <p className="text-sm text-ambar">Sin evidencia adjunta: no se puede aprobar hasta que se cargue al menos un documento.</p>
      )}
      <div className="flex flex-wrap gap-2">
        <button className="btn btn-primary" name="decision" value="aprobar" disabled={pending || evidenceCount === 0}>Aprobar</button>
        <button className="btn btn-secondary" name="decision" value="devolver" disabled={pending}>Devolver con comentarios</button>
      </div>
      <Feedback state={state} />
    </form>
  );
}
