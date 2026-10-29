-- BIOGALENIC STARS — esquema base
-- Herramienta de apoyo a la gestión. No es un sistema GMP validado ni sustituye al eQMS.

create schema if not exists private;

-- ───────────────────────── Tipos ─────────────────────────
create type public.app_role as enum ('md', 'director', 'lector');
create type public.assessment_status as enum ('borrador', 'enviado', 'devuelto', 'aprobado');
create type public.confidence_level as enum ('alta', 'media', 'baja');
create type public.level4 as enum ('bajo', 'medio', 'alto', 'critico');
create type public.stars_scenario as enum ('start_up', 'turnaround', 'crecimiento_acelerado', 'realineamiento', 'exito_sostenido');
create type public.risk_status as enum ('abierto', 'en_mitigacion', 'cerrado');
create type public.escalation_category as enum ('calidad', 'seguridad_paciente', 'esterilidad', 'integridad_datos', 'sst', 'regulatorio');
create type public.action_status as enum ('pendiente', 'en_curso', 'completada', 'bloqueada', 'cancelada');
create type public.decision_status as enum ('propuesta', 'aprobada', 'rechazada');
create type public.kpi_frequency as enum ('semanal', 'mensual');
create type public.kpi_direction as enum ('mayor_mejor', 'menor_mejor');

-- ───────────────────────── Tablas ─────────────────────────
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text not null default '',
  email text not null default '',
  position text,
  role public.app_role not null default 'lector',
  is_executive boolean not null default false,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.dimensions (
  code text primary key,
  name text not null,
  department_name text not null,
  weight numeric(5, 2) not null check (weight > 0 and weight <= 100),
  sort_order smallint not null,
  description text
);

create table public.director_departments (
  user_id uuid not null references public.profiles (id) on delete cascade,
  dimension_code text not null references public.dimensions (code) on delete cascade,
  primary key (user_id, dimension_code)
);
create index on public.director_departments (dimension_code);

create table public.questions (
  id uuid primary key default gen_random_uuid(),
  dimension_code text not null references public.dimensions (code) on delete cascade,
  topic text not null,
  prompt text not null,
  sort_order smallint not null default 0,
  active boolean not null default true
);
create index on public.questions (dimension_code);

create table public.assessment_cycles (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  starts_on date not null default current_date,
  ends_on date,
  is_active boolean not null default false,
  company_overview text,
  created_at timestamptz not null default now()
);
create unique index assessment_cycles_one_active on public.assessment_cycles (is_active) where is_active;

create table public.dimension_assessments (
  id uuid primary key default gen_random_uuid(),
  cycle_id uuid not null references public.assessment_cycles (id) on delete cascade,
  dimension_code text not null references public.dimensions (code),
  proposed_score smallint check (proposed_score between 1 and 5),
  approved_score smallint check (approved_score between 1 and 5),
  confidence public.confidence_level,
  status public.assessment_status not null default 'borrador',
  current_performance text,
  gaps text,
  root_causes text,
  business_impact text,
  risk_class public.level4,
  responsible_id uuid references public.profiles (id),
  opportunities text,
  ai_recommendations jsonb,
  ai_recommendations_at timestamptz,
  md_comment text,
  override_justification text,
  submitted_by uuid references public.profiles (id),
  submitted_at timestamptz,
  approved_by uuid references public.profiles (id),
  approved_at timestamptz,
  updated_by uuid references public.profiles (id),
  updated_at timestamptz not null default now(),
  unique (cycle_id, dimension_code)
);
create index on public.dimension_assessments (dimension_code);

create table public.question_responses (
  id uuid primary key default gen_random_uuid(),
  assessment_id uuid not null references public.dimension_assessments (id) on delete cascade,
  question_id uuid not null references public.questions (id) on delete cascade,
  score smallint check (score between 1 and 5),
  answer text,
  updated_at timestamptz not null default now(),
  unique (assessment_id, question_id)
);
create index on public.question_responses (question_id);

create table public.evidence (
  id uuid primary key default gen_random_uuid(),
  cycle_id uuid not null references public.assessment_cycles (id) on delete cascade,
  dimension_code text references public.dimensions (code),
  entity_type text not null check (entity_type in ('assessment', 'risk', 'action', 'kpi')),
  entity_id uuid not null,
  storage_path text not null unique,
  file_name text not null,
  mime_type text,
  size_bytes bigint,
  description text,
  uploaded_by uuid not null default auth.uid() references public.profiles (id),
  created_at timestamptz not null default now()
);
create index on public.evidence (entity_type, entity_id);
create index on public.evidence (cycle_id);
create index on public.evidence (dimension_code);

create table public.kpis (
  id uuid primary key default gen_random_uuid(),
  dimension_code text not null references public.dimensions (code),
  name text not null,
  definition text not null default '',
  formula text not null default '',
  unit text not null default '',
  frequency public.kpi_frequency not null default 'mensual',
  direction public.kpi_direction not null default 'mayor_mejor',
  owner_id uuid references public.profiles (id),
  baseline numeric,
  target numeric,
  target_approved_by uuid references public.profiles (id),
  target_approved_at timestamptz,
  active boolean not null default true,
  created_at timestamptz not null default now()
);
create index on public.kpis (dimension_code);
create index on public.kpis (owner_id);

create table public.kpi_measurements (
  id uuid primary key default gen_random_uuid(),
  kpi_id uuid not null references public.kpis (id) on delete cascade,
  period_start date not null,
  value numeric not null,
  comment text,
  entered_by uuid default auth.uid() references public.profiles (id),
  created_at timestamptz not null default now(),
  unique (kpi_id, period_start)
);

create table public.risks (
  id uuid primary key default gen_random_uuid(),
  cycle_id uuid not null references public.assessment_cycles (id) on delete cascade,
  dimension_code text not null references public.dimensions (code),
  description text not null,
  probability smallint not null check (probability between 1 and 5),
  impact smallint not null check (impact between 1 and 5),
  score smallint generated always as (probability * impact) stored,
  escalation_category public.escalation_category,
  escalated boolean generated always as (
    escalation_category is not null and (impact >= 4 or probability * impact >= 15)
  ) stored,
  existing_controls text,
  mitigation text,
  owner_id uuid references public.profiles (id),
  due_date date,
  status public.risk_status not null default 'abierto',
  created_by uuid default auth.uid() references public.profiles (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index on public.risks (cycle_id);
create index on public.risks (dimension_code);
create index on public.risks (owner_id);

create table public.ai_analysis_runs (
  id uuid primary key default gen_random_uuid(),
  cycle_id uuid not null references public.assessment_cycles (id) on delete cascade,
  model text not null,
  input_hash text not null,
  input_snapshot jsonb not null,
  output jsonb,
  validation jsonb,
  status text not null default 'en_proceso' check (status in ('en_proceso', 'completado', 'error')),
  error text,
  created_by uuid default auth.uid() references public.profiles (id),
  created_at timestamptz not null default now()
);
create index on public.ai_analysis_runs (cycle_id, created_at desc);

create table public.stars_classifications (
  id uuid primary key default gen_random_uuid(),
  cycle_id uuid not null unique references public.assessment_cycles (id) on delete cascade,
  ai_run_id uuid references public.ai_analysis_runs (id) on delete set null,
  ai_primary public.stars_scenario,
  ai_secondary public.stars_scenario[] not null default '{}',
  md_primary public.stars_scenario,
  md_secondary public.stars_scenario[] not null default '{}',
  md_rationale text,
  override_justification text,
  status public.decision_status not null default 'propuesta',
  approved_by uuid references public.profiles (id),
  approved_at timestamptz,
  updated_at timestamptz not null default now()
);
create index on public.stars_classifications (ai_run_id);

create table public.executive_evaluations (
  id uuid primary key default gen_random_uuid(),
  cycle_id uuid not null references public.assessment_cycles (id) on delete cascade,
  executive_id uuid not null references public.profiles (id) on delete cascade,
  technical smallint check (technical between 1 and 5),
  strategic smallint check (strategic between 1 and 5),
  leadership smallint check (leadership between 1 and 5),
  execution smallint check (execution between 1 and 5),
  accountability smallint check (accountability between 1 and 5),
  collaboration smallint check (collaboration between 1 and 5),
  decision_making smallint check (decision_making between 1 and 5),
  adaptability smallint check (adaptability between 1 and 5),
  integrity smallint check (integrity between 1 and 5),
  strengths text,
  development_opportunities text,
  is_critical_talent boolean not null default false,
  succession_risk public.level4,
  development_priorities text,
  evaluated_by uuid default auth.uid() references public.profiles (id),
  updated_at timestamptz not null default now(),
  unique (cycle_id, executive_id)
);
create index on public.executive_evaluations (executive_id);

create table public.strategic_priorities (
  id uuid primary key default gen_random_uuid(),
  cycle_id uuid not null references public.assessment_cycles (id) on delete cascade,
  objective text not null,
  rationale text,
  expected_impact text,
  responsible_id uuid references public.profiles (id),
  supporting_dimensions text[] not null default '{}',
  kpi_id uuid references public.kpis (id) on delete set null,
  kpi_text text,
  baseline text,
  target text,
  deadline date,
  resources text,
  risks_dependencies text,
  status public.decision_status not null default 'propuesta',
  source text not null default 'manual' check (source in ('ia', 'manual')),
  ai_run_id uuid references public.ai_analysis_runs (id) on delete set null,
  decision_note text,
  decided_by uuid references public.profiles (id),
  decided_at timestamptz,
  sort_order smallint not null default 0,
  created_at timestamptz not null default now()
);
create index on public.strategic_priorities (cycle_id);
create index on public.strategic_priorities (kpi_id);
create index on public.strategic_priorities (ai_run_id);

create table public.action_items (
  id uuid primary key default gen_random_uuid(),
  cycle_id uuid not null references public.assessment_cycles (id) on delete cascade,
  phase smallint not null check (phase between 1 and 3),
  title text not null,
  description text,
  priority_id uuid references public.strategic_priorities (id) on delete set null,
  is_quick_win boolean not null default false,
  owner_id uuid references public.profiles (id),
  deadline date,
  kpi_text text,
  target text,
  progress smallint not null default 0 check (progress between 0 and 100),
  status public.action_status not null default 'pendiente',
  comments text,
  completion_evidence text,
  created_by uuid default auth.uid() references public.profiles (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index on public.action_items (cycle_id, phase);
create index on public.action_items (owner_id);
create index on public.action_items (priority_id);

create table public.approvals (
  id uuid primary key default gen_random_uuid(),
  entity_type text not null,
  entity_id uuid not null,
  action text not null,
  comment text,
  actor_id uuid default auth.uid() references public.profiles (id),
  created_at timestamptz not null default now()
);
create index on public.approvals (entity_type, entity_id);

create table public.audit_log (
  id bigint generated always as identity primary key,
  table_name text not null,
  row_id text,
  action text not null,
  actor_id uuid,
  old_data jsonb,
  new_data jsonb,
  changed_fields text[],
  at timestamptz not null default now()
);
create index on public.audit_log (table_name, row_id);
create index on public.audit_log (at desc);

-- ───────────────────────── Funciones auxiliares ─────────────────────────
create or replace function private.user_role()
returns public.app_role language sql stable security definer set search_path = '' as $$
  select role from public.profiles where id = (select auth.uid()) and active
$$;

create or replace function private.is_md()
returns boolean language sql stable security definer set search_path = '' as $$
  select coalesce((select role = 'md' from public.profiles where id = (select auth.uid()) and active), false)
$$;

create or replace function private.manages(dim text)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.director_departments dd
    join public.profiles p on p.id = dd.user_id
    where dd.user_id = (select auth.uid()) and dd.dimension_code = dim and p.active and p.role = 'director'
  )
$$;

create or replace function private.can_read_dimension(dim text)
returns boolean language sql stable security definer set search_path = '' as $$
  select private.is_md() or private.manages(dim)
$$;

grant usage on schema private to authenticated;
grant execute on all functions in schema private to authenticated;

-- Perfil automático; el primer usuario registrado es el Director General (MD).
create or replace function private.handle_new_user()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id, email, full_name, role)
  values (
    new.id,
    coalesce(new.email, ''),
    coalesce(new.raw_user_meta_data ->> 'full_name', ''),
    case when exists (select 1 from public.profiles where role = 'md') then 'lector'::public.app_role else 'md'::public.app_role end
  );
  return new;
end $$;

create trigger on_auth_user_created after insert on auth.users
  for each row execute function private.handle_new_user();

-- Auditoría genérica
create or replace function private.audit()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  o jsonb := case when tg_op in ('UPDATE', 'DELETE') then to_jsonb(old) end;
  n jsonb := case when tg_op in ('INSERT', 'UPDATE') then to_jsonb(new) end;
  changed text[];
begin
  if tg_op = 'UPDATE' then
    select array_agg(k) into changed from jsonb_object_keys(n) k
      where k not in ('updated_at') and (o -> k) is distinct from (n -> k);
    if changed is null then return new; end if;
  end if;
  insert into public.audit_log (table_name, row_id, action, actor_id, old_data, new_data, changed_fields)
  values (tg_table_name, coalesce(n ->> 'id', o ->> 'id', n ->> 'user_id', o ->> 'user_id'), lower(tg_op), auth.uid(), o, n, changed);
  return coalesce(new, old);
end $$;

do $$
declare t text;
begin
  foreach t in array array[
    'profiles', 'dimensions', 'director_departments', 'questions', 'assessment_cycles',
    'dimension_assessments', 'question_responses', 'evidence', 'kpis', 'kpi_measurements',
    'risks', 'stars_classifications', 'executive_evaluations', 'strategic_priorities',
    'action_items', 'ai_analysis_runs'
  ] loop
    execute format('create trigger audit_%1$s after insert or update or delete on public.%1$I for each row execute function private.audit()', t);
  end loop;
end $$;

create or replace function private.touch_updated_at()
returns trigger language plpgsql set search_path = '' as $$
begin
  new.updated_at := now();
  return new;
end $$;

create trigger touch before update on public.dimension_assessments for each row execute function private.touch_updated_at();
create trigger touch before update on public.question_responses for each row execute function private.touch_updated_at();
create trigger touch before update on public.risks for each row execute function private.touch_updated_at();
create trigger touch before update on public.action_items for each row execute function private.touch_updated_at();
create trigger touch before update on public.executive_evaluations for each row execute function private.touch_updated_at();
create trigger touch before update on public.stars_classifications for each row execute function private.touch_updated_at();

-- Flujo de aprobación de evaluaciones
create or replace function private.guard_assessment()
returns trigger language plpgsql security definer set search_path = '' as $$
declare md boolean := private.is_md();
begin
  new.updated_by := auth.uid();

  if not md then
    -- Los directores no pueden aprobar, devolver ni modificar campos del MD.
    if new.status not in ('borrador', 'enviado') then
      raise exception 'Solo el Director General puede aprobar o devolver evaluaciones.';
    end if;
    if tg_op = 'UPDATE' then
      if old.status not in ('borrador', 'devuelto') then
        raise exception 'La evaluación ya fue enviada y no puede editarse hasta que sea devuelta.';
      end if;
      if new.approved_score is distinct from old.approved_score
        or new.md_comment is distinct from old.md_comment
        or new.override_justification is distinct from old.override_justification
        or new.ai_recommendations is distinct from old.ai_recommendations then
        raise exception 'Campos reservados al Director General.';
      end if;
    else
      new.approved_score := null; new.md_comment := null; new.override_justification := null; new.ai_recommendations := null;
    end if;
  end if;

  if new.status = 'enviado' and (tg_op = 'INSERT' or old.status is distinct from 'enviado') then
    if new.proposed_score is null or new.confidence is null then
      raise exception 'Para enviar se requiere puntuación propuesta y nivel de confianza.';
    end if;
    new.submitted_by := auth.uid(); new.submitted_at := now();
    insert into public.approvals (entity_type, entity_id, action) values ('assessment', new.id, 'enviado');
  end if;

  if new.status = 'aprobado' and (tg_op = 'INSERT' or old.status is distinct from 'aprobado') then
    if new.approved_score is null then
      new.approved_score := new.proposed_score;
    end if;
    if new.approved_score is null then
      raise exception 'No se puede aprobar sin puntuación.';
    end if;
    if not exists (select 1 from public.evidence e where e.entity_type = 'assessment' and e.entity_id = new.id) then
      raise exception 'Se requiere al menos una evidencia de soporte para aprobar la puntuación.';
    end if;
    if new.approved_score is distinct from new.proposed_score and coalesce(trim(new.override_justification), '') = '' then
      raise exception 'Modificar la puntuación propuesta requiere una justificación documentada.';
    end if;
    new.approved_by := auth.uid(); new.approved_at := now();
    insert into public.approvals (entity_type, entity_id, action, comment)
      values ('assessment', new.id,
        case when new.approved_score is distinct from new.proposed_score then 'aprobado_con_ajuste' else 'aprobado' end,
        new.override_justification);
  end if;

  if new.status = 'devuelto' and tg_op = 'UPDATE' and old.status is distinct from 'devuelto' then
    new.approved_score := null; new.approved_by := null; new.approved_at := null;
    insert into public.approvals (entity_type, entity_id, action, comment) values ('assessment', new.id, 'devuelto', new.md_comment);
  end if;

  return new;
end $$;

create trigger guard before insert or update on public.dimension_assessments
  for each row execute function private.guard_assessment();

-- Meta de KPI: cualquier cambio de meta por un director invalida la aprobación previa
create or replace function private.guard_kpi_target()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if tg_op = 'UPDATE' and new.target is not distinct from old.target
     and new.target_approved_by is not distinct from old.target_approved_by then
    return new;
  end if;
  if private.is_md() then
    if new.target is not null and new.target_approved_by is not null then
      new.target_approved_by := auth.uid(); new.target_approved_at := now();
    end if;
  else
    new.target_approved_by := null; new.target_approved_at := null;
  end if;
  return new;
end $$;

create trigger guard before insert or update on public.kpis for each row execute function private.guard_kpi_target();

-- Máximo cinco prioridades estratégicas aprobadas por ciclo
create or replace function private.guard_priorities()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.status = 'aprobada' and (
    select count(*) from public.strategic_priorities
    where cycle_id = new.cycle_id and status = 'aprobada' and id <> new.id
  ) >= 5 then
    raise exception 'Solo se permiten cinco prioridades estratégicas aprobadas por ciclo.';
  end if;
  if tg_op = 'INSERT' or new.status is distinct from old.status then
    new.decided_by := auth.uid(); new.decided_at := now();
  end if;
  return new;
end $$;

create trigger guard before insert or update on public.strategic_priorities for each row execute function private.guard_priorities();

-- Responsables de acciones: solo avance, estado, comentarios y evidencia
create or replace function private.guard_action()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if not private.is_md() then
    if row(new.cycle_id, new.phase, new.title, new.description, new.priority_id, new.is_quick_win, new.owner_id, new.deadline, new.kpi_text, new.target)
       is distinct from
       row(old.cycle_id, old.phase, old.title, old.description, old.priority_id, old.is_quick_win, old.owner_id, old.deadline, old.kpi_text, old.target) then
      raise exception 'Solo el Director General puede redefinir la acción. El responsable actualiza avance, estado, comentarios y evidencia.';
    end if;
  end if;
  if new.status = 'completada' then new.progress := 100; end if;
  return new;
end $$;

create trigger guard before update on public.action_items for each row execute function private.guard_action();

create or replace function private.guard_stars()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.status = 'aprobada' and (tg_op = 'INSERT' or old.status is distinct from 'aprobada') then
    if new.md_primary is null then
      raise exception 'Defina el escenario principal antes de aprobar.';
    end if;
    if new.ai_primary is not null and new.md_primary <> new.ai_primary and coalesce(trim(new.override_justification), '') = '' then
      raise exception 'Apartarse de la recomendación de la IA requiere una justificación documentada.';
    end if;
    new.approved_by := auth.uid(); new.approved_at := now();
    insert into public.approvals (entity_type, entity_id, action, comment) values ('stars', new.id, 'aprobado', new.override_justification);
  end if;
  if new.status <> 'aprobada' then new.approved_by := null; new.approved_at := null; end if;
  return new;
end $$;

create trigger guard before insert or update on public.stars_classifications for each row execute function private.guard_stars();

-- ───────────────────────── RLS ─────────────────────────
alter table public.profiles enable row level security;
alter table public.dimensions enable row level security;
alter table public.director_departments enable row level security;
alter table public.questions enable row level security;
alter table public.assessment_cycles enable row level security;
alter table public.dimension_assessments enable row level security;
alter table public.question_responses enable row level security;
alter table public.evidence enable row level security;
alter table public.kpis enable row level security;
alter table public.kpi_measurements enable row level security;
alter table public.risks enable row level security;
alter table public.ai_analysis_runs enable row level security;
alter table public.stars_classifications enable row level security;
alter table public.executive_evaluations enable row level security;
alter table public.strategic_priorities enable row level security;
alter table public.action_items enable row level security;
alter table public.approvals enable row level security;
alter table public.audit_log enable row level security;

-- Perfiles: todos los usuarios autenticados ven el directorio; solo el MD modifica roles.
create policy "perfiles lectura" on public.profiles for select to authenticated using (true);
create policy "perfiles md" on public.profiles for update to authenticated using ((select private.is_md())) with check ((select private.is_md()));

-- Configuración: lectura general, escritura MD
create policy "dimensiones lectura" on public.dimensions for select to authenticated using (true);
create policy "dimensiones md" on public.dimensions for all to authenticated using ((select private.is_md())) with check ((select private.is_md()));
create policy "preguntas lectura" on public.questions for select to authenticated using (true);
create policy "preguntas md" on public.questions for all to authenticated using ((select private.is_md())) with check ((select private.is_md()));
create policy "ciclos lectura" on public.assessment_cycles for select to authenticated using (true);
create policy "ciclos md" on public.assessment_cycles for all to authenticated using ((select private.is_md())) with check ((select private.is_md()));
create policy "asignaciones lectura" on public.director_departments for select to authenticated
  using (user_id = (select auth.uid()) or (select private.is_md()));
create policy "asignaciones md" on public.director_departments for all to authenticated using ((select private.is_md())) with check ((select private.is_md()));

-- Evaluaciones departamentales
create policy "evaluaciones lectura" on public.dimension_assessments for select to authenticated
  using (private.can_read_dimension(dimension_code) or (status = 'aprobado' and (select private.user_role()) = 'lector'));
create policy "evaluaciones alta" on public.dimension_assessments for insert to authenticated
  with check (private.can_read_dimension(dimension_code));
create policy "evaluaciones edicion" on public.dimension_assessments for update to authenticated
  using (private.can_read_dimension(dimension_code)) with check (private.can_read_dimension(dimension_code));
create policy "evaluaciones baja" on public.dimension_assessments for delete to authenticated using ((select private.is_md()));

create policy "respuestas lectura" on public.question_responses for select to authenticated using (
  exists (select 1 from public.dimension_assessments a where a.id = assessment_id
    and (private.can_read_dimension(a.dimension_code) or (a.status = 'aprobado' and (select private.user_role()) = 'lector'))));
create policy "respuestas escritura" on public.question_responses for all to authenticated
  using (exists (select 1 from public.dimension_assessments a where a.id = assessment_id
    and ((select private.is_md()) or (private.manages(a.dimension_code) and a.status in ('borrador', 'devuelto')))))
  with check (exists (select 1 from public.dimension_assessments a where a.id = assessment_id
    and ((select private.is_md()) or (private.manages(a.dimension_code) and a.status in ('borrador', 'devuelto')))));

-- Evidencias
create policy "evidencias lectura" on public.evidence for select to authenticated
  using ((select private.is_md()) or (dimension_code is not null and private.manages(dimension_code)) or uploaded_by = (select auth.uid()));
create policy "evidencias alta" on public.evidence for insert to authenticated
  with check (uploaded_by = (select auth.uid()) and ((select private.is_md()) or (dimension_code is not null and private.manages(dimension_code))));
create policy "evidencias baja" on public.evidence for delete to authenticated
  using ((select private.is_md()) or uploaded_by = (select auth.uid()));

-- KPIs: visibles para todos; edición MD o director del área
create policy "kpis lectura" on public.kpis for select to authenticated using (true);
create policy "kpis escritura" on public.kpis for all to authenticated
  using (private.can_read_dimension(dimension_code)) with check (private.can_read_dimension(dimension_code));
create policy "mediciones lectura" on public.kpi_measurements for select to authenticated using (true);
create policy "mediciones escritura" on public.kpi_measurements for all to authenticated
  using (exists (select 1 from public.kpis k where k.id = kpi_id and private.can_read_dimension(k.dimension_code)))
  with check (exists (select 1 from public.kpis k where k.id = kpi_id and private.can_read_dimension(k.dimension_code)));

-- Riesgos: lectura MD, director del área y lectores; escritura MD o director del área
create policy "riesgos lectura" on public.risks for select to authenticated
  using (private.can_read_dimension(dimension_code) or (select private.user_role()) = 'lector');
create policy "riesgos escritura" on public.risks for insert to authenticated with check (private.can_read_dimension(dimension_code));
create policy "riesgos edicion" on public.risks for update to authenticated
  using (private.can_read_dimension(dimension_code)) with check (private.can_read_dimension(dimension_code));
create policy "riesgos baja" on public.risks for delete to authenticated using ((select private.is_md()));

-- Análisis IA y equipo ejecutivo: solo MD
create policy "ia md" on public.ai_analysis_runs for all to authenticated using ((select private.is_md())) with check ((select private.is_md()));
create policy "equipo md" on public.executive_evaluations for all to authenticated using ((select private.is_md())) with check ((select private.is_md()));

-- STARS y prioridades: MD gestiona; el resto ve lo aprobado
create policy "stars lectura" on public.stars_classifications for select to authenticated
  using ((select private.is_md()) or status = 'aprobada');
create policy "stars md" on public.stars_classifications for all to authenticated using ((select private.is_md())) with check ((select private.is_md()));
create policy "prioridades lectura" on public.strategic_priorities for select to authenticated
  using ((select private.is_md()) or status = 'aprobada');
create policy "prioridades md" on public.strategic_priorities for all to authenticated using ((select private.is_md())) with check ((select private.is_md()));

-- Plan 90 días: visible para todos; MD define; responsable actualiza avance
create policy "acciones lectura" on public.action_items for select to authenticated using (true);
create policy "acciones md" on public.action_items for insert to authenticated with check ((select private.is_md()));
create policy "acciones edicion" on public.action_items for update to authenticated
  using ((select private.is_md()) or owner_id = (select auth.uid()))
  with check ((select private.is_md()) or owner_id = (select auth.uid()));
create policy "acciones baja" on public.action_items for delete to authenticated using ((select private.is_md()));

-- Historial
create policy "aprobaciones lectura" on public.approvals for select to authenticated using ((select private.is_md()));
create policy "auditoria lectura" on public.audit_log for select to authenticated using ((select private.is_md()));

-- ───────────────────────── Almacenamiento de evidencias ─────────────────────────
-- Ruta: {cycle_id}/{dimension_code}/{uuid}-{archivo}
insert into storage.buckets (id, name, public, file_size_limit)
values ('evidencias', 'evidencias', false, 26214400)
on conflict (id) do nothing;

create policy "evidencias storage lectura" on storage.objects for select to authenticated
  using (bucket_id = 'evidencias' and private.can_read_dimension((storage.foldername(name))[2]));
create policy "evidencias storage alta" on storage.objects for insert to authenticated
  with check (bucket_id = 'evidencias' and private.can_read_dimension((storage.foldername(name))[2]));
create policy "evidencias storage baja" on storage.objects for delete to authenticated
  using (bucket_id = 'evidencias' and ((select private.is_md()) or owner_id = (select auth.uid())::text));

-- Configuración inicial: indica si aún no existe ningún usuario (para crear la cuenta del MD).
create or replace function public.needs_bootstrap()
returns boolean language sql stable security definer set search_path = '' as $$
  select not exists (select 1 from public.profiles)
$$;
revoke execute on function public.needs_bootstrap() from public;
grant execute on function public.needs_bootstrap() to anon, authenticated;
