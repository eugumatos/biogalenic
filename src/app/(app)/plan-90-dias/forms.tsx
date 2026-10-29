"use client";

import { useActionState, useState } from "react";
import { Feedback } from "@/components/feedback";
import { ACTION_STATUS_LABEL } from "@/lib/domain";
import { saveAction, updateProgress } from "./actions";

export type ActionRow = {
  id: string;
  phase: number;
  title: string;
  description: string | null;
  priority_id: string | null;
  is_quick_win: boolean;
  owner_id: string | null;
  deadline: string | null;
  kpi_text: string | null;
  target: string | null;
  progress: number;
  status: string;
  comments: string | null;
  completion_evidence: string | null;
};

export function ActionForm({
  action: a,
  people,
  priorities,
  defaultPhase = 1,
}: {
  action?: ActionRow;
  people: { id: string; full_name: string }[];
  priorities: { id: string; objective: string }[];
  defaultPhase?: number;
}) {
  const [state, act, pending] = useActionState(saveAction.bind(null, a?.id ?? null), undefined);
  const k = a?.id ?? `new-${defaultPhase}`;
  return (
    <form action={act} className="grid gap-3 md:grid-cols-2">
      <div className="md:col-span-2">
        <label className="field-label" htmlFor={`t-${k}`}>Acción</label>
        <input id={`t-${k}`} name="title" className="input" defaultValue={a?.title} required />
      </div>
      <div className="md:col-span-2">
        <label className="field-label" htmlFor={`d-${k}`}>Descripción</label>
        <textarea id={`d-${k}`} name="description" className="input min-h-[3rem]!" defaultValue={a?.description ?? ""} />
      </div>
      <div>
        <label className="field-label" htmlFor={`ph-${k}`}>Fase</label>
        <select id={`ph-${k}`} name="phase" className="input" defaultValue={a?.phase ?? defaultPhase}>
          <option value={1}>Días 1–30 · Aprender y diagnosticar</option>
          <option value={2}>Días 31–60 · Alinear y definir</option>
          <option value={3}>Días 61–90 · Ejecutar y consolidar</option>
        </select>
      </div>
      <div>
        <label className="field-label" htmlFor={`o-${k}`}>Responsable</label>
        <select id={`o-${k}`} name="owner_id" className="input" defaultValue={a?.owner_id ?? ""}>
          <option value="">Sin asignar</option>
          {people.map((p) => <option key={p.id} value={p.id}>{p.full_name}</option>)}
        </select>
      </div>
      <div>
        <label className="field-label" htmlFor={`dl-${k}`}>Fecha límite</label>
        <input id={`dl-${k}`} name="deadline" type="date" className="input" defaultValue={a?.deadline ?? ""} />
      </div>
      <div>
        <label className="field-label" htmlFor={`pr-${k}`}>Prioridad estratégica</label>
        <select id={`pr-${k}`} name="priority_id" className="input" defaultValue={a?.priority_id ?? ""}>
          <option value="">Ninguna</option>
          {priorities.map((p) => <option key={p.id} value={p.id}>{p.objective.slice(0, 80)}</option>)}
        </select>
      </div>
      <div>
        <label className="field-label" htmlFor={`kp-${k}`}>KPI</label>
        <input id={`kp-${k}`} name="kpi_text" className="input" defaultValue={a?.kpi_text ?? ""} />
      </div>
      <div>
        <label className="field-label" htmlFor={`tg-${k}`}>Meta</label>
        <input id={`tg-${k}`} name="target" className="input" defaultValue={a?.target ?? ""} />
      </div>
      <label className="flex items-center gap-2 text-sm md:col-span-2">
        <input type="checkbox" name="is_quick_win" defaultChecked={a?.is_quick_win} /> Quick win
      </label>
      <div className="flex items-center gap-3 md:col-span-2">
        <button className="btn btn-primary" disabled={pending}>{a ? "Guardar acción" : "Agregar acción"}</button>
        <Feedback state={state} />
      </div>
    </form>
  );
}

export function ProgressForm({ action: a }: { action: ActionRow }) {
  const [state, act, pending] = useActionState(updateProgress.bind(null, a.id), undefined);
  const [status, setStatus] = useState(a.status);
  const [progress, setProgress] = useState(a.progress);
  return (
    <form action={act} className="grid gap-3 sm:grid-cols-2">
      <div>
        <label className="field-label" htmlFor={`st-${a.id}`}>Estado</label>
        <select
          id={`st-${a.id}`}
          name="status"
          className="input"
          value={status}
          onChange={(e) => {
            setStatus(e.target.value);
            if (e.target.value === "completada") setProgress(100);
          }}
        >
          {Object.entries(ACTION_STATUS_LABEL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>
      </div>
      <div>
        <label className="field-label" htmlFor={`pg-${a.id}`}>Avance: {progress}%</label>
        <input id={`pg-${a.id}`} name="progress" type="range" min={0} max={100} step={5} value={progress} onChange={(e) => setProgress(Number(e.target.value))} className="w-full accent-navy" />
      </div>
      <div className="sm:col-span-2">
        <label className="field-label" htmlFor={`cm-${a.id}`}>Comentarios</label>
        <textarea id={`cm-${a.id}`} name="comments" className="input min-h-[3rem]!" defaultValue={a.comments ?? ""} />
      </div>
      <div className="sm:col-span-2">
        <label className="field-label" htmlFor={`ev-${a.id}`}>Evidencia de cumplimiento{status === "completada" ? " (obligatoria)" : ""}</label>
        <textarea id={`ev-${a.id}`} name="completion_evidence" className="input min-h-[3rem]!" defaultValue={a.completion_evidence ?? ""} placeholder="Documento, acta, reporte o resultado verificable" />
      </div>
      <div className="flex items-center gap-3 sm:col-span-2">
        <button className="btn btn-primary" disabled={pending}>Registrar avance</button>
        <Feedback state={state} />
      </div>
    </form>
  );
}
