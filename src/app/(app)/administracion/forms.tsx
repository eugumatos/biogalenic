"use client";

import { Feedback } from "@/components/feedback";
import { useActionState, useState } from "react";
import type { Dimension, Profile } from "@/lib/domain";
import { ROLE_LABEL } from "@/lib/domain";
import { createCycle, createUser, saveQuestion, updateCycle, updateUser, updateWeights } from "./actions";


export function CycleForm({ cycle }: { cycle?: { id: string; name: string; starts_on: string; ends_on: string | null; company_overview: string | null } }) {
  const [state, action, pending] = useActionState(cycle ? updateCycle.bind(null, cycle.id) : createCycle, undefined);
  return (
    <form action={action} className="grid gap-4 md:grid-cols-3">
      <div>
        <label className="field-label" htmlFor={`name-${cycle?.id ?? "new"}`}>Nombre del ciclo</label>
        <input id={`name-${cycle?.id ?? "new"}`} name="name" className="input" defaultValue={cycle?.name} placeholder="Diagnóstico 90 días — Nov 2026" required />
      </div>
      <div>
        <label className="field-label" htmlFor={`starts-${cycle?.id ?? "new"}`}>Inicio (día 1)</label>
        <input id={`starts-${cycle?.id ?? "new"}`} name="starts_on" type="date" className="input" defaultValue={cycle?.starts_on ?? new Date().toISOString().slice(0, 10)} />
      </div>
      <div>
        <label className="field-label" htmlFor={`ends-${cycle?.id ?? "new"}`}>Cierre</label>
        <input id={`ends-${cycle?.id ?? "new"}`} name="ends_on" type="date" className="input" defaultValue={cycle?.ends_on ?? ""} />
      </div>
      <div className="md:col-span-3">
        <label className="field-label" htmlFor={`overview-${cycle?.id ?? "new"}`}>Descripción de la empresa</label>
        <textarea
          id={`overview-${cycle?.id ?? "new"}`}
          name="company_overview"
          className="input"
          defaultValue={cycle?.company_overview ?? ""}
          placeholder="Contexto que aparecerá en el reporte: operación, líneas SVP/LVP, mercados, plantilla, situación de partida."
        />
      </div>
      <div className="flex flex-wrap items-center gap-3 md:col-span-3">
        {!cycle && (
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="activate" defaultChecked /> Activar este ciclo
          </label>
        )}
        <button className="btn btn-primary" disabled={pending}>{cycle ? "Guardar cambios" : "Crear ciclo"}</button>
        <Feedback state={state} />
      </div>
    </form>
  );
}

function DimChecks({ dimensions, selected }: { dimensions: Dimension[]; selected: string[] }) {
  return (
    <fieldset>
      <legend className="field-label">Departamentos asignados (directores)</legend>
      <div className="grid gap-1.5 sm:grid-cols-2">
        {dimensions.map((d) => (
          <label key={d.code} className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="dims" value={d.code} defaultChecked={selected.includes(d.code)} /> {d.department_name}
          </label>
        ))}
      </div>
    </fieldset>
  );
}

export function NewUserForm({ dimensions }: { dimensions: Dimension[] }) {
  const [state, action, pending] = useActionState(createUser, undefined);
  return (
    <form action={action} className="grid gap-4 md:grid-cols-2">
      <div>
        <label className="field-label" htmlFor="nu-name">Nombre completo</label>
        <input id="nu-name" name="full_name" className="input" required />
      </div>
      <div>
        <label className="field-label" htmlFor="nu-email">Correo</label>
        <input id="nu-email" name="email" type="email" className="input" required />
      </div>
      <div>
        <label className="field-label" htmlFor="nu-position">Cargo</label>
        <input id="nu-position" name="position" className="input" placeholder="Director de Operaciones" />
      </div>
      <div>
        <label className="field-label" htmlFor="nu-role">Perfil de acceso</label>
        <select id="nu-role" name="role" className="input" defaultValue="director">
          <option value="director">{ROLE_LABEL.director}</option>
          <option value="lector">{ROLE_LABEL.lector}</option>
          <option value="md">{ROLE_LABEL.md}</option>
        </select>
      </div>
      <div className="md:col-span-2">
        <DimChecks dimensions={dimensions} selected={[]} />
      </div>
      <label className="flex items-center gap-2 text-sm md:col-span-2">
        <input type="checkbox" name="is_executive" defaultChecked /> Forma parte del equipo ejecutivo evaluado
      </label>
      <div className="flex flex-wrap items-center gap-3 md:col-span-2">
        <button className="btn btn-primary" disabled={pending}>Crear usuario</button>
        <Feedback state={state} />
      </div>
      {state?.tempPassword && (
        <div className="rounded-[4px] border border-saline bg-saline-soft p-3 text-sm md:col-span-2">
          Contraseña temporal para <strong>{state.email}</strong>:{" "}
          <code className="rounded bg-white px-1.5 py-0.5 text-[0.95rem] font-semibold select-all">{state.tempPassword}</code>
          <p className="mt-1 text-muted">Se muestra una sola vez. Entréguela por un canal seguro y pida al usuario cambiarla en su primer ingreso.</p>
        </div>
      )}
    </form>
  );
}

export function EditUserRow({ user, dimensions, assigned, isSelf }: { user: Profile; dimensions: Dimension[]; assigned: string[]; isSelf: boolean }) {
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState(updateUser.bind(null, user.id), undefined);
  return (
    <li className="py-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <div className="font-semibold">{user.full_name || user.email} {!user.active && <span className="text-xs font-normal text-rojo">(inactivo)</span>}</div>
          <div className="text-sm text-muted">
            {user.email} · {ROLE_LABEL[user.role]}
            {user.position ? ` · ${user.position}` : ""}
            {assigned.length ? ` · ${assigned.map((c) => dimensions.find((d) => d.code === c)?.department_name).join(", ")}` : ""}
          </div>
        </div>
        <button type="button" className="btn btn-secondary" onClick={() => setOpen(!open)} aria-expanded={open}>
          {open ? "Cerrar" : "Editar"}
        </button>
      </div>
      {open && (
        <form action={action} className="mt-3 grid gap-4 rounded-[4px] bg-mist-2 p-4 md:grid-cols-2">
          <div>
            <label className="field-label" htmlFor={`fn-${user.id}`}>Nombre completo</label>
            <input id={`fn-${user.id}`} name="full_name" className="input" defaultValue={user.full_name} />
          </div>
          <div>
            <label className="field-label" htmlFor={`pos-${user.id}`}>Cargo</label>
            <input id={`pos-${user.id}`} name="position" className="input" defaultValue={user.position ?? ""} />
          </div>
          <div>
            <label className="field-label" htmlFor={`role-${user.id}`}>Perfil de acceso</label>
            <select id={`role-${user.id}`} name="role" className="input" defaultValue={user.role} disabled={isSelf}>
              <option value="md">{ROLE_LABEL.md}</option>
              <option value="director">{ROLE_LABEL.director}</option>
              <option value="lector">{ROLE_LABEL.lector}</option>
            </select>
            {isSelf && <input type="hidden" name="role" value="md" />}
          </div>
          <div className="flex flex-col justify-end gap-2 text-sm">
            <label className="flex items-center gap-2"><input type="checkbox" name="is_executive" defaultChecked={user.is_executive} /> Equipo ejecutivo evaluado</label>
            {!isSelf && <label className="flex items-center gap-2"><input type="checkbox" name="active" defaultChecked={user.active} /> Acceso activo</label>}
          </div>
          <div className="md:col-span-2"><DimChecks dimensions={dimensions} selected={assigned} /></div>
          <div className="flex items-center gap-3 md:col-span-2">
            <button className="btn btn-primary" disabled={pending}>Guardar</button>
            <Feedback state={state} />
          </div>
        </form>
      )}
    </li>
  );
}

export function WeightsForm({ dimensions }: { dimensions: Dimension[] }) {
  const [state, action, pending] = useActionState(updateWeights, undefined);
  const [w, setW] = useState<Record<string, string>>(Object.fromEntries(dimensions.map((d) => [d.code, String(d.weight)])));
  const total = Object.values(w).reduce((a, v) => a + (Number(v) || 0), 0);
  return (
    <form action={action}>
      <table className="table">
        <thead><tr><th>Dimensión</th><th className="w-36 text-right">Peso (%)</th></tr></thead>
        <tbody>
          {dimensions.map((d) => (
            <tr key={d.code}>
              <td>{d.name}</td>
              <td className="text-right">
                <input
                  name={`w_${d.code}`}
                  type="number"
                  step="0.5"
                  min="0.5"
                  className="input w-24 text-right"
                  value={w[d.code]}
                  onChange={(e) => setW({ ...w, [d.code]: e.target.value })}
                  aria-label={`Peso ${d.name}`}
                />
              </td>
            </tr>
          ))}
          <tr>
            <td className="font-semibold">Total</td>
            <td className={`text-right font-semibold tabular-nums ${Math.abs(total - 100) > 0.001 ? "text-rojo" : "text-verde"}`}>{total}%</td>
          </tr>
        </tbody>
      </table>
      <div className="mt-4 flex items-center gap-3">
        <button className="btn btn-primary" disabled={pending || Math.abs(total - 100) > 0.001}>Guardar pesos</button>
        <Feedback state={state} />
      </div>
    </form>
  );
}

export function QuestionForm({
  dimensions,
  question,
}: {
  dimensions: Dimension[];
  question?: { id: string; dimension_code: string; topic: string; prompt: string; sort_order: number };
}) {
  const [state, action, pending] = useActionState(saveQuestion.bind(null, question?.id ?? null), undefined);
  return (
    <form action={action} className="grid gap-3 md:grid-cols-[200px_200px_minmax(0,1fr)_80px_auto] md:items-end">
      <div>
        <label className="field-label" htmlFor={`qd-${question?.id ?? "new"}`}>Dimensión</label>
        <select id={`qd-${question?.id ?? "new"}`} name="dimension_code" className="input" defaultValue={question?.dimension_code ?? dimensions[0]?.code}>
          {dimensions.map((d) => <option key={d.code} value={d.code}>{d.name}</option>)}
        </select>
      </div>
      <div>
        <label className="field-label" htmlFor={`qt-${question?.id ?? "new"}`}>Tema / indicador</label>
        <input id={`qt-${question?.id ?? "new"}`} name="topic" className="input" defaultValue={question?.topic} required />
      </div>
      <div>
        <label className="field-label" htmlFor={`qp-${question?.id ?? "new"}`}>Pregunta</label>
        <input id={`qp-${question?.id ?? "new"}`} name="prompt" className="input" defaultValue={question?.prompt} required />
      </div>
      <div>
        <label className="field-label" htmlFor={`qo-${question?.id ?? "new"}`}>Orden</label>
        <input id={`qo-${question?.id ?? "new"}`} name="sort_order" type="number" className="input" defaultValue={question?.sort_order ?? 99} />
      </div>
      <div className="flex items-center gap-2">
        <button className="btn btn-primary" disabled={pending}>{question ? "Guardar" : "Agregar"}</button>
      </div>
      <div className="md:col-span-5"><Feedback state={state} /></div>
    </form>
  );
}

export function QuestionRow({
  dimensions,
  question,
  toggle,
}: {
  dimensions: Dimension[];
  question: { id: string; dimension_code: string; topic: string; prompt: string; sort_order: number; active: boolean };
  toggle: () => Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  return (
    <li className="py-2.5">
      <div className="flex items-start gap-3 text-sm">
        <span className="w-6 shrink-0 text-right tabular-nums text-muted">{question.sort_order}</span>
        <div className={`min-w-0 flex-1 ${question.active ? "" : "text-muted line-through"}`}>
          <span className="font-semibold">{question.topic}</span> — {question.prompt}
        </div>
        <button type="button" className="btn-quiet text-sm" onClick={() => setOpen(!open)}>{open ? "Cerrar" : "Editar"}</button>
        <form action={toggle}><button className="btn-quiet text-sm">{question.active ? "Desactivar" : "Activar"}</button></form>
      </div>
      {open && <div className="mt-3 rounded-[4px] bg-mist-2 p-3"><QuestionForm dimensions={dimensions} question={question} /></div>}
    </li>
  );
}
