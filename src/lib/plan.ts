type A = { status: string; deadline: string | null; progress: number };

export function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

/** Día del plan (1 = fecha de inicio). */
export function cycleDay(startsOn: string, today = todayISO()) {
  const ms = new Date(today + "T12:00:00").getTime() - new Date(startsOn + "T12:00:00").getTime();
  return Math.floor(ms / 86400000) + 1;
}

export function isOverdue(a: A, today = todayISO()) {
  return !!a.deadline && a.deadline < today && a.status !== "completada" && a.status !== "cancelada";
}

/** Promedio simple de avance de acciones no canceladas. Null si no hay acciones. */
export function phaseProgress(items: A[]) {
  const live = items.filter((a) => a.status !== "cancelada");
  if (!live.length) return null;
  return Math.round(live.reduce((t, a) => t + a.progress, 0) / live.length);
}
