import "server-only";
import ExcelJS from "exceljs";
import {
  ACTION_STATUS_LABEL,
  CONFIDENCE_LABEL,
  DECISION_LABEL,
  ESCALATION_LABEL,
  LEVEL_LABEL,
  RISK_STATUS_LABEL,
  STARS_NAME,
  STATUS_LABEL,
  type ActionStatus,
  type AssessmentStatus,
  type Confidence,
  type DecisionStatus,
  type EscalationCategory,
  type Level4,
  type RiskStatus,
} from "@/lib/domain";
import { KPI_STATUS_LABEL, KPI_TREND_LABEL } from "@/lib/kpi";
import { riskCriticality } from "@/lib/risk";
import type { ReportData } from "./data";

const NAVY = "FF14284B";

function sheet(wb: ExcelJS.Workbook, name: string, columns: { header: string; key: string; width: number }[]) {
  const ws = wb.addWorksheet(name, { views: [{ state: "frozen", ySplit: 1 }] });
  ws.columns = columns;
  const head = ws.getRow(1);
  head.font = { bold: true, color: { argb: "FFFFFFFF" } };
  head.fill = { type: "pattern", pattern: "solid", fgColor: { argb: NAVY } };
  head.alignment = { vertical: "middle", wrapText: true };
  return ws;
}

export async function buildWorkbook(r: ReportData) {
  const wb = new ExcelJS.Workbook();
  wb.creator = "Biogalenic STARS";
  wb.created = new Date();
  const dimName = (c: string) => r.dimensions.find((d) => d.code === c)?.name ?? c;

  const res = sheet(wb, "Resumen", [{ header: "Indicador", key: "k", width: 42 }, { header: "Valor", key: "v", width: 60 }]);
  const stars = r.stars;
  res.addRows([
    { k: "Ciclo", v: r.cycle.name },
    { k: "Inicio", v: r.cycle.starts_on },
    { k: "Generado por", v: r.generatedBy },
    { k: "Audiencia", v: r.audience },
    { k: "Escenario STARS principal", v: stars?.md_primary ? STARS_NAME[stars.md_primary] : "Sin aprobar" },
    { k: "Escenarios secundarios", v: (stars?.md_secondary ?? []).map((x) => STARS_NAME[x]).join(", ") || "—" },
    { k: "Estado de la clasificación", v: stars?.status === "aprobada" ? "Aprobada por el MD" : "Pendiente" },
    { k: "Puntuación global aprobada (1–5)", v: r.approvedScore.overall ?? "Sin datos" },
    { k: "Cobertura por peso (%)", v: r.approvedScore.coverage },
    { k: "Suma ponderada", v: r.approvedScore.weightedSum },
    { k: "Dimensiones sin aprobar", v: r.approvedScore.incomplete.join(", ") || "—" },
    { k: "Riesgos activos", v: r.openRisks.length },
    { k: "Riesgos escalados", v: r.escalated.length },
    { k: "Prioridades aprobadas", v: r.approvedPriorities.length },
    { k: "Acciones abiertas", v: r.openActions.length },
    { k: "Acciones vencidas", v: r.overdueActions.length },
    { k: "Avance plan 90 días (%)", v: r.planProgress ?? "—" },
    { k: "Fórmula", v: "Global = Σ(puntuación × peso) ÷ Σ(pesos aprobados). Las dimensiones sin aprobar no cuentan como cero." },
    { k: "Aviso", v: "Herramienta de apoyo a la gestión. No es un sistema GMP validado ni sustituye al eQMS." },
  ]);

  const dims = sheet(wb, "Dimensiones", [
    { header: "Dimensión", key: "name", width: 28 },
    { header: "Peso (%)", key: "weight", width: 10 },
    { header: "Estado", key: "status", width: 16 },
    { header: "Propuesta", key: "proposed", width: 11 },
    { header: "Aprobada", key: "approved", width: 11 },
    { header: "Ponderada", key: "weighted", width: 11 },
    { header: "Confianza", key: "confidence", width: 11 },
    { header: "Clasificación de riesgo", key: "risk", width: 14 },
    { header: "Desempeño actual", key: "perf", width: 50 },
    { header: "Brechas", key: "gaps", width: 50 },
    { header: "Causas raíz", key: "causes", width: 50 },
    { header: "Impacto", key: "impact", width: 50 },
    { header: "Oportunidades", key: "opps", width: 50 },
    { header: "Justificación de ajuste del MD", key: "override", width: 40 },
  ]);
  for (const l of r.approvedScore.lines) {
    const a = r.byDim.get(l.code);
    dims.addRow({
      name: l.name,
      weight: l.weight,
      status: l.status ? STATUS_LABEL[l.status as AssessmentStatus] : "Sin iniciar",
      proposed: a?.proposed_score ?? null,
      approved: l.score,
      weighted: l.weighted,
      confidence: a?.confidence ? CONFIDENCE_LABEL[a.confidence as Confidence] : null,
      risk: a?.risk_class ? LEVEL_LABEL[a.risk_class as Level4] : null,
      perf: a?.current_performance,
      gaps: a?.gaps,
      causes: a?.root_causes,
      impact: a?.business_impact,
      opps: a?.opportunities,
      override: a?.override_justification,
    });
  }

  const risks = sheet(wb, "Riesgos", [
    { header: "Riesgo", key: "d", width: 50 },
    { header: "Departamento", key: "dim", width: 22 },
    { header: "Probabilidad", key: "p", width: 12 },
    { header: "Impacto", key: "i", width: 10 },
    { header: "Puntaje", key: "s", width: 10 },
    { header: "Criticidad", key: "c", width: 12 },
    { header: "Escalamiento", key: "e", width: 26 },
    { header: "Escalado", key: "esc", width: 10 },
    { header: "Controles existentes", key: "ctl", width: 40 },
    { header: "Mitigación", key: "m", width: 40 },
    { header: "Responsable", key: "o", width: 22 },
    { header: "Fecha compromiso", key: "due", width: 14 },
    { header: "Estado", key: "st", width: 14 },
  ]);
  for (const x of r.risks) {
    const row = risks.addRow({
      d: x.description,
      dim: dimName(x.dimension_code),
      p: x.probability,
      i: x.impact,
      s: x.score,
      c: LEVEL_LABEL[riskCriticality(x.score)],
      e: x.escalation_category ? ESCALATION_LABEL[x.escalation_category as EscalationCategory] : "",
      esc: x.escalated ? "Sí" : "No",
      ctl: x.existing_controls,
      m: x.mitigation,
      o: (x.owner as { full_name: string } | null)?.full_name,
      due: x.due_date,
      st: RISK_STATUS_LABEL[x.status as RiskStatus],
    });
    if (x.escalated) row.getCell("esc").font = { bold: true, color: { argb: "FFA8322A" } };
  }

  const kpis = sheet(wb, "KPIs", [
    { header: "KPI", key: "n", width: 34 },
    { header: "Dimensión", key: "dim", width: 22 },
    { header: "Unidad", key: "u", width: 10 },
    { header: "Frecuencia", key: "f", width: 11 },
    { header: "Responsable", key: "o", width: 22 },
    { header: "Línea base", key: "b", width: 12 },
    { header: "Meta", key: "t", width: 12 },
    { header: "Meta aprobada", key: "ta", width: 12 },
    { header: "Último periodo", key: "lp", width: 14 },
    { header: "Real", key: "lv", width: 12 },
    { header: "Tendencia", key: "tr", width: 13 },
    { header: "Estado", key: "st", width: 18 },
  ]);
  const hist = sheet(wb, "Mediciones KPI", [
    { header: "KPI", key: "n", width: 34 },
    { header: "Periodo", key: "p", width: 14 },
    { header: "Valor", key: "v", width: 12 },
  ]);
  for (const k of r.kpis) {
    kpis.addRow({
      n: k.name,
      dim: dimName(k.dimension_code),
      u: k.unit,
      f: k.frequency,
      o: k.owner_name,
      b: k.baseline,
      t: k.target,
      ta: k.target_approved_by ? "Sí" : "No",
      lp: k.last?.period_start,
      lv: k.last?.value,
      tr: KPI_TREND_LABEL[k.trend],
      st: KPI_STATUS_LABEL[k.status],
    });
    for (const m of k.measurements) hist.addRow({ n: k.name, p: m.period_start, v: m.value });
  }

  const prios = sheet(wb, "Prioridades", [
    { header: "Objetivo", key: "o", width: 50 },
    { header: "Estado", key: "s", width: 12 },
    { header: "Origen", key: "src", width: 10 },
    { header: "Responsable", key: "r", width: 22 },
    { header: "Justificación", key: "j", width: 45 },
    { header: "Impacto esperado", key: "i", width: 40 },
    { header: "KPI", key: "k", width: 28 },
    { header: "Línea base", key: "b", width: 18 },
    { header: "Meta", key: "t", width: 18 },
    { header: "Fecha límite", key: "d", width: 14 },
    { header: "Recursos", key: "res", width: 35 },
    { header: "Riesgos y dependencias", key: "rd", width: 35 },
  ]);
  for (const p of r.priorities) {
    prios.addRow({
      o: p.objective,
      s: DECISION_LABEL[p.status as DecisionStatus],
      src: p.source === "ia" ? "IA" : "MD",
      r: (p.responsible as { full_name: string } | null)?.full_name,
      j: p.rationale,
      i: p.expected_impact,
      k: p.kpi_text,
      b: p.baseline,
      t: p.target,
      d: p.deadline,
      res: p.resources,
      rd: p.risks_dependencies,
    });
  }

  const plan = sheet(wb, "Plan 90 días", [
    { header: "Fase", key: "f", width: 8 },
    { header: "Acción", key: "t", width: 45 },
    { header: "Quick win", key: "q", width: 10 },
    { header: "Responsable", key: "o", width: 22 },
    { header: "Fecha límite", key: "d", width: 14 },
    { header: "KPI", key: "k", width: 24 },
    { header: "Meta", key: "m", width: 18 },
    { header: "Avance (%)", key: "p", width: 11 },
    { header: "Estado", key: "s", width: 13 },
    { header: "Comentarios", key: "c", width: 40 },
    { header: "Evidencia de cumplimiento", key: "e", width: 40 },
  ]);
  for (const a of r.actions) {
    plan.addRow({
      f: a.phase,
      t: a.title,
      q: a.is_quick_win ? "Sí" : "",
      o: (a.owner as { full_name: string } | null)?.full_name,
      d: a.deadline,
      k: a.kpi_text,
      m: a.target,
      p: a.progress,
      s: ACTION_STATUS_LABEL[a.status as ActionStatus],
      c: a.comments,
      e: a.completion_evidence,
    });
  }

  if (r.team) {
    const team = sheet(wb, "Equipo ejecutivo", [
      { header: "Director", key: "n", width: 28 },
      { header: "Cargo", key: "p", width: 26 },
      { header: "Promedio", key: "a", width: 10 },
      { header: "Talento crítico", key: "c", width: 14 },
      { header: "Riesgo de sucesión", key: "s", width: 16 },
      { header: "Fortalezas", key: "f", width: 45 },
      { header: "Prioridades de desarrollo", key: "d", width: 45 },
    ]);
    for (const t of r.team) {
      team.addRow({ n: t.name, p: t.position, a: t.avg, c: t.critical ? "Sí" : "No", s: t.succession ? LEVEL_LABEL[t.succession as Level4] : "", f: t.strengths, d: t.development });
    }
  }

  wb.eachSheet((ws) => {
    ws.eachRow((row, i) => {
      if (i > 1) row.alignment = { vertical: "top", wrapText: true };
    });
  });

  return wb.xlsx.writeBuffer();
}
