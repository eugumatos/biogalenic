import type { Metadata } from "next";
import Link from "next/link";
import clsx from "clsx";
import { Badge, Notice, PageHeader, Panel, fmtDate, fmtDateTime } from "@/components/ui";
import type { Profile } from "@/lib/domain";
import { requireMd } from "@/lib/session";
import { activateCycle, toggleQuestion } from "./actions";
import { CycleForm, EditUserRow, NewUserForm, QuestionForm, QuestionRow, WeightsForm } from "./forms";

export const metadata: Metadata = { title: "Administración" };

const TABS = [
  { key: "ciclos", label: "Ciclos" },
  { key: "usuarios", label: "Usuarios y accesos" },
  { key: "pesos", label: "Dimensiones y pesos" },
  { key: "preguntas", label: "Preguntas" },
  { key: "auditoria", label: "Auditoría" },
  { key: "gobierno", label: "Gobierno de datos" },
];

const TABLE_LABEL: Record<string, string> = {
  profiles: "Usuarios",
  dimensions: "Dimensiones",
  director_departments: "Asignaciones",
  questions: "Preguntas",
  assessment_cycles: "Ciclos",
  dimension_assessments: "Evaluaciones",
  question_responses: "Respuestas",
  evidence: "Evidencias",
  kpis: "KPIs",
  kpi_measurements: "Mediciones KPI",
  risks: "Riesgos",
  stars_classifications: "Clasificación STARS",
  executive_evaluations: "Equipo ejecutivo",
  strategic_priorities: "Prioridades",
  action_items: "Plan 90 días",
  ai_analysis_runs: "Análisis IA",
};

export default async function AdminPage({ searchParams }: PageProps<"/administracion">) {
  const s = await requireMd();
  const sp = await searchParams;
  const tab = typeof sp.tab === "string" && TABS.some((t) => t.key === sp.tab) ? sp.tab : "ciclos";
  const aviso = typeof sp.aviso === "string" ? sp.aviso : undefined;

  return (
    <>
      <PageHeader title="Administración" intro="Ciclos de evaluación, usuarios y perfiles de acceso, configuración de la matriz y registro de auditoría." />
      {aviso === "bienvenida" && (
        <div className="mb-5"><Notice tone="saline">Cuenta del Director General creada. Abra el primer ciclo de evaluación y luego cree los usuarios del equipo directivo.</Notice></div>
      )}
      {aviso === "sin-ciclo" && (
        <div className="mb-5"><Notice tone="ambar">No hay un ciclo activo. Cree o active uno para comenzar a evaluar.</Notice></div>
      )}
      <nav className="mb-5 flex gap-1 overflow-x-auto border-b border-rule" aria-label="Secciones de administración">
        {TABS.map((t) => (
          <Link
            key={t.key}
            href={`/administracion?tab=${t.key}`}
            aria-current={tab === t.key ? "page" : undefined}
            className={clsx(
              "-mb-px border-b-2 px-3 py-2 text-sm whitespace-nowrap",
              tab === t.key ? "border-navy font-semibold text-navy" : "border-transparent text-muted hover:text-navy",
            )}
          >
            {t.label}
          </Link>
        ))}
      </nav>

      {tab === "ciclos" && <Cycles s={s} />}
      {tab === "usuarios" && <Users s={s} />}
      {tab === "pesos" && (
        <Panel title="Dimensiones y pesos" aside="Deben sumar 100%">
          <div className="max-w-xl"><WeightsForm dimensions={s.dimensions} /></div>
        </Panel>
      )}
      {tab === "preguntas" && <Questions s={s} />}
      {tab === "auditoria" && <Audit s={s} table={typeof sp.tabla === "string" ? sp.tabla : undefined} />}
      {tab === "gobierno" && <Governance />}
    </>
  );
}

type S = Awaited<ReturnType<typeof requireMd>>;

async function Cycles({ s }: { s: S }) {
  const { data: cycles } = await s.supabase.from("assessment_cycles").select("*").order("starts_on", { ascending: false });
  return (
    <div className="space-y-5">
      {(cycles ?? []).map((c) => (
        <Panel
          key={c.id}
          title={c.name}
          aside={
            c.is_active ? (
              <Badge tone="navy">Activo</Badge>
            ) : (
              <form action={activateCycle.bind(null, c.id)}><button className="btn btn-secondary">Activar</button></form>
            )
          }
        >
          <p className="mb-4 text-sm text-muted">{fmtDate(c.starts_on)} — {c.ends_on ? fmtDate(c.ends_on) : "sin cierre definido"}</p>
          <CycleForm cycle={c} />
        </Panel>
      ))}
      <Panel title="Nuevo ciclo de evaluación">
        <CycleForm />
      </Panel>
    </div>
  );
}

async function Users({ s }: { s: S }) {
  const [{ data: users }, { data: assignments }] = await Promise.all([
    s.supabase.from("profiles").select("*").order("full_name").returns<Profile[]>(),
    s.supabase.from("director_departments").select("user_id, dimension_code"),
  ]);
  return (
    <div className="space-y-5">
      <Panel title="Usuarios" aside={`${users?.length ?? 0} registrados`}>
        <ul className="divide-y divide-mist">
          {(users ?? []).map((u) => (
            <EditUserRow
              key={u.id}
              user={u}
              dimensions={s.dimensions}
              assigned={(assignments ?? []).filter((a) => a.user_id === u.id).map((a) => a.dimension_code)}
              isSelf={u.id === s.user.id}
            />
          ))}
        </ul>
      </Panel>
      <Panel title="Crear usuario">
        <NewUserForm dimensions={s.dimensions} />
      </Panel>
      <Panel title="Perfiles de acceso">
        <dl className="grid gap-3 text-sm md:grid-cols-3">
          <div><dt className="font-semibold">Director General</dt><dd className="text-muted">Acceso total. Aprueba evaluaciones, define STARS y prioridades, ve el equipo ejecutivo y la auditoría.</dd></div>
          <div><dt className="font-semibold">Director Ejecutivo</dt><dd className="text-muted">Solo sus departamentos asignados: completa evaluaciones, sube evidencia, registra KPIs y riesgos, envía al MD.</dd></div>
          <div><dt className="font-semibold">Solo lectura</dt><dd className="text-muted">Ve tableros, evaluaciones y decisiones aprobadas y el avance del plan. No edita.</dd></div>
        </dl>
      </Panel>
    </div>
  );
}

async function Questions({ s }: { s: S }) {
  const { data: questions } = await s.supabase.from("questions").select("*").order("dimension_code").order("sort_order");
  return (
    <div className="space-y-5">
      <Panel title="Agregar pregunta"><QuestionForm dimensions={s.dimensions} /></Panel>
      {s.dimensions.map((d) => (
        <Panel key={d.code} title={d.name}>
          <ul className="divide-y divide-mist">
            {(questions ?? []).filter((q) => q.dimension_code === d.code).map((q) => (
              <QuestionRow key={q.id} dimensions={s.dimensions} question={q} toggle={toggleQuestion.bind(null, q.id, !q.active)} />
            ))}
          </ul>
        </Panel>
      ))}
    </div>
  );
}

async function Audit({ s, table }: { s: S; table?: string }) {
  let q = s.supabase.from("audit_log").select("*").order("at", { ascending: false }).limit(200);
  if (table) q = q.eq("table_name", table);
  const [{ data: rows }, { data: people }] = await Promise.all([q, s.supabase.from("profiles").select("id, full_name, email")]);
  const who = new Map((people ?? []).map((p) => [p.id, p.full_name || p.email]));
  return (
    <Panel
      title="Registro de auditoría"
      aside={
        <span className="flex flex-wrap gap-2">
          <Link href="/administracion?tab=auditoria" className={!table ? "font-semibold text-navy" : "text-navy-3 hover:underline"}>Todo</Link>
          {Object.entries(TABLE_LABEL).map(([k, v]) => (
            <Link key={k} href={`/administracion?tab=auditoria&tabla=${k}`} className={table === k ? "font-semibold text-navy" : "text-navy-3 hover:underline"}>{v}</Link>
          ))}
        </span>
      }
      bodyClassName="p-0 sm:p-0"
    >
      <div className="overflow-x-auto">
        <table className="table min-w-[860px]">
          <thead><tr><th>Fecha</th><th>Usuario</th><th>Registro</th><th>Acción</th><th>Cambios (anterior → nuevo)</th></tr></thead>
          <tbody>
            {(rows ?? []).map((r) => {
              const fields: string[] = r.changed_fields ?? [];
              return (
                <tr key={r.id}>
                  <td className="whitespace-nowrap">{fmtDateTime(r.at)}</td>
                  <td>{r.actor_id ? who.get(r.actor_id) ?? r.actor_id.slice(0, 8) : "Sistema"}</td>
                  <td>{TABLE_LABEL[r.table_name] ?? r.table_name}</td>
                  <td>{{ insert: "Alta", update: "Cambio", delete: "Baja" }[r.action as string] ?? r.action}</td>
                  <td className="max-w-[560px] text-xs">
                    {r.action === "update" ? (
                      <ul className="space-y-0.5">
                        {fields.slice(0, 8).map((f) => (
                          <li key={f} className="break-words">
                            <span className="font-semibold">{f}</span>: <span className="text-muted">{short(r.old_data?.[f])}</span> → {short(r.new_data?.[f])}
                          </li>
                        ))}
                        {fields.length > 8 && <li className="text-muted">y {fields.length - 8} campo(s) más</li>}
                      </ul>
                    ) : (
                      <span className="text-muted">{short(r.new_data ?? r.old_data, 160)}</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="px-4 py-3 text-xs text-muted">Se muestran los últimos 200 eventos. El registro es de solo inserción: ningún usuario puede modificarlo desde la aplicación.</p>
    </Panel>
  );
}

function short(v: unknown, max = 80) {
  if (v == null) return "∅";
  const t = typeof v === "string" ? v : JSON.stringify(v);
  return t.length > max ? t.slice(0, max) + "…" : t;
}

function Governance() {
  return (
    <Panel title="Gobierno de datos y cumplimiento">
      <div className="prose-memo space-y-3 text-[0.98rem]">
        <p>
          Biogalenic STARS es una herramienta de apoyo a la gestión y a la toma de decisiones. No es un sistema GMP validado,
          no es un eQMS y no sustituye los sistemas de calidad aprobados. Los registros oficiales de desviaciones, CAPA, liberación
          de lotes y quejas permanecen en los sistemas validados de la empresa.
        </p>
        <p>
          No cargue información identificable de pacientes ni registros de lote confidenciales, salvo que la plataforma y su
          seguridad hayan sido aprobadas formalmente para ese propósito.
        </p>
      </div>
      <ul className="mt-5 grid gap-3 text-sm md:grid-cols-2">
        <li><strong>Control de acceso:</strong> políticas a nivel de base de datos (RLS) por perfil y departamento.</li>
        <li><strong>Confidencialidad:</strong> las evaluaciones del equipo ejecutivo solo son visibles para el Director General.</li>
        <li><strong>Documentos:</strong> almacenamiento privado; descargas mediante enlaces firmados de 2 minutos.</li>
        <li><strong>Auditoría:</strong> cada alta, cambio y baja registra usuario, fecha, valores anteriores y nuevos.</li>
        <li><strong>Respaldo:</strong> copias diarias automáticas de Supabase; se recomienda activar recuperación a un punto en el tiempo (PITR) en producción.</li>
        <li><strong>Retención:</strong> defina con Calidad y Legal el plazo de conservación de ciclos y evidencias; los ciclos cerrados no se eliminan desde la aplicación.</li>
      </ul>
    </Panel>
  );
}
