import { Document, Font, Page, StyleSheet, Text, View } from "@react-pdf/renderer";
import type { ReactNode } from "react";
import {
  ACTION_STATUS_LABEL,
  CONFIDENCE_LABEL,
  ESCALATION_LABEL,
  LEVEL_LABEL,
  NOT_GMP_NOTICE,
  PHASES,
  SCORE_LABEL,
  STARS,
  STARS_NAME,
  STATUS_LABEL,
  type ActionStatus,
  type AssessmentStatus,
  type Confidence,
  type EscalationCategory,
  type Level4,
} from "@/lib/domain";
import { CLAIM_LABEL, type Claim } from "@/lib/ai/schema";
import { riskCriticality } from "@/lib/risk";
import type { ReportData } from "./data";

// Sin división silábica automática: evita cortes como "es-tratégico".
Font.registerHyphenationCallback((word) => [word]);

const C = {
  navy: "#14284B",
  ink: "#1A2233",
  muted: "#5A6578",
  rule: "#D3D9E2",
  mist: "#EEF1F5",
  saline: "#4F7FAE",
  verde: "#2F7A57",
  ambar: "#B8862C",
  rojo: "#A8322A",
};

const st = StyleSheet.create({
  page: { paddingTop: 48, paddingBottom: 56, paddingHorizontal: 48, fontFamily: "Helvetica", fontSize: 9.5, color: C.ink, lineHeight: 1.4 },
  header: { position: "absolute", top: 20, left: 48, right: 48, flexDirection: "row", justifyContent: "space-between", fontSize: 7.5, color: C.muted },
  footer: { position: "absolute", bottom: 24, left: 48, right: 48, flexDirection: "row", justifyContent: "space-between", fontSize: 7, color: C.muted, borderTopWidth: 0.5, borderTopColor: C.rule, paddingTop: 6 },
  h1: { fontFamily: "Helvetica-Bold", fontSize: 15, lineHeight: 1.2, color: C.navy, marginBottom: 10 },
  h2: { fontFamily: "Helvetica-Bold", fontSize: 11, lineHeight: 1.25, color: C.navy, marginTop: 12, marginBottom: 6 },
  memo: { fontFamily: "Times-Roman", fontSize: 11, lineHeight: 1.5, marginBottom: 8 },
  muted: { color: C.muted },
  small: { fontSize: 8, color: C.muted },
  row: { flexDirection: "row" },
  th: { fontFamily: "Helvetica-Bold", fontSize: 8, color: C.muted, backgroundColor: C.mist, paddingVertical: 4, paddingHorizontal: 5 },
  td: { paddingVertical: 4, paddingHorizontal: 5, borderBottomWidth: 0.5, borderBottomColor: C.mist },
  stat: { flex: 1, paddingRight: 8 },
  statValue: { fontFamily: "Helvetica-Bold", fontSize: 16, lineHeight: 1.15, color: C.navy, marginVertical: 2 },
  claim: { marginBottom: 5, paddingLeft: 6, borderLeftWidth: 1.5 },
});


const GLYPHS: Record<string, string> = { "→": "->", "←": "<-", "≥": ">=", "≤": "<=", "≠": "!=", "≈": "~", "Σ": "suma", "✓": "Sí", "✔": "Sí", "✗": "No", "−": "-", "\u00a0": " " };

/** La Helvetica estándar del PDF solo cubre WinAnsi: se reemplazan símbolos comunes y se omiten los no representables. */
export function pdfSafe<T>(value: T): T {
  if (typeof value === "string") {
    return value
      .replace(/[→←≥≤≠≈Σ✓✔✗−\u00a0]/g, (c) => GLYPHS[c] ?? c)
      .replace(/[^\u0000-\u00ff—–…·•“”‘’€™]/g, "") as T;
  }
  if (Array.isArray(value)) return value.map(pdfSafe) as T;
  if (value instanceof Map) return new Map([...value].map(([k, v]) => [k, pdfSafe(v)])) as T;
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, pdfSafe(v)])) as T;
  }
  return value;
}

function Section({ n, title, children, breakBefore = true }: { n: number; title: string; children: ReactNode; breakBefore?: boolean }) {
  return (
    <View break={breakBefore}>
      <Text style={st.h1}>{n}. {title}</Text>
      {children}
    </View>
  );
}

function Table({ cols, rows }: { cols: { label: string; w: number; align?: "right" | "left" }[]; rows: ReactNode[][] }) {
  return (
    <View style={{ marginBottom: 8 }}>
      <View style={st.row} fixed>
        {cols.map((c, i) => (
          <Text key={i} style={[st.th, { width: `${c.w}%`, textAlign: c.align ?? "left" }]}>{c.label}</Text>
        ))}
      </View>
      {rows.map((r, i) => (
        <View key={i} style={st.row} wrap={false}>
          {r.map((cell, j) => (
            <View key={j} style={[st.td, { width: `${cols[j].w}%` }]}>
              {typeof cell === "string" || typeof cell === "number" ? <Text style={{ textAlign: cols[j].align ?? "left" }}>{cell}</Text> : cell}
            </View>
          ))}
        </View>
      ))}
    </View>
  );
}

function Claims({ claims, empty = "Sin elementos." }: { claims?: Claim[]; empty?: string }) {
  if (!claims?.length) return <Text style={st.small}>{empty}</Text>;
  const color = { hecho_verificado: C.navy, interpretacion: C.saline, hipotesis: C.ambar, recomendacion: C.navy };
  return (
    <View>
      {claims.map((c, i) => (
        <View key={i} style={[st.claim, { borderLeftColor: color[c.tipo] }]} wrap={false}>
          <Text style={{ fontSize: 7, color: C.muted }}>{CLAIM_LABEL[c.tipo]}</Text>
          <Text>{c.texto}</Text>
        </View>
      ))}
    </View>
  );
}

function scoreColor(v: number | null) {
  if (v == null) return C.rule;
  if (v <= 2) return C.rojo;
  if (v < 3.5) return C.ambar;
  return C.verde;
}

function Bars({ data }: { data: { label: string; value: number | null }[] }) {
  return (
    <View style={{ marginVertical: 6 }}>
      {data.map((d, i) => (
        <View key={i} style={[st.row, { alignItems: "center", marginBottom: 3 }]}>
          <Text style={{ width: "30%", fontSize: 8 }}>{d.label}</Text>
          <View style={{ width: "60%", height: 9, backgroundColor: C.mist }}>
            <View style={{ width: `${((d.value ?? 0) / 5) * 100}%`, height: 9, backgroundColor: scoreColor(d.value) }} />
          </View>
          <Text style={{ width: "10%", textAlign: "right", fontSize: 8 }}>{d.value ?? "s/d"}</Text>
        </View>
      ))}
      <Text style={st.small}>Escala 1–5. “s/d”: sin puntuación aprobada (no cuenta como cero).</Text>
    </View>
  );
}

function Track({ primary, secondary, approved }: { primary: string | null; secondary: string[]; approved: boolean }) {
  return (
    <View style={[st.row, { marginVertical: 8 }]}>
      {STARS.map((s) => {
        const p = primary === s.key;
        const sec = secondary.includes(s.key);
        return (
          <View
            key={s.key}
            style={{
              flex: 1,
              marginRight: 4,
              padding: 6,
              minHeight: 58,
              borderWidth: sec ? 1.5 : 0.5,
              borderColor: p || sec ? C.navy : C.rule,
              backgroundColor: p ? C.navy : sec ? "#FFFFFF" : C.mist,
            }}
          >
            <Text style={{ fontFamily: "Helvetica-Bold", fontSize: 22, lineHeight: 1, marginBottom: 6, color: p ? "#FFFFFF" : sec ? C.navy : C.muted }}>{s.letter}</Text>
            <Text style={{ fontSize: 7.5, lineHeight: 1.2, color: p ? "#FFFFFF" : sec ? C.navy : C.muted }}>{s.name}</Text>
            <Text style={{ fontSize: 6.5, color: p ? "#C9D3E3" : C.muted }}>{p ? (approved ? "Principal" : "Principal (sin aprobar)") : sec ? "Secundario" : " "}</Text>
          </View>
        );
      })}
    </View>
  );
}

const fmt = (d: string | null | undefined) =>
  d ? new Intl.DateTimeFormat("es-SV", { day: "numeric", month: "short", year: "numeric" }).format(new Date(d.length === 10 ? d + "T12:00:00" : d)) : "—";
const num = (n: number | null | undefined, d = 2) => (n == null ? "—" : new Intl.NumberFormat("es-SV", { maximumFractionDigits: d }).format(n));

export function ExecutiveReport({ r: raw }: { r: ReportData }) {
  const r = pdfSafe(raw);
  const stars = r.stars;
  const approved = stars?.status === "aprobada";
  const primary = stars?.md_primary ?? (r.team ? stars?.ai_primary : null) ?? null;
  const secondary = (stars?.md_primary ? stars.md_secondary : r.team ? stars?.ai_secondary : []) ?? [];
  const sc = r.approvedScore;
  const dimName = (c: string) => r.dimensions.find((d) => d.code === c)?.name ?? c;
  const critical = r.openRisks.filter((x) => x.escalated || x.score >= 15);
  const quickWins = r.actions.filter((a) => a.is_quick_win);
  const generated = new Intl.DateTimeFormat("es-SV", { dateStyle: "long", timeStyle: "short" }).format(new Date());

  return (
    <Document title={`Biogalenic STARS — ${r.cycle.name}`} author="Biogalenic El Salvador" subject="Reporte ejecutivo" language="es">
      <Page size="LETTER" style={st.page}>
        <View style={{ marginTop: 120 }}>
          <Text style={{ fontSize: 10, color: C.muted }}>Biogalenic El Salvador</Text>
          <Text style={{ fontFamily: "Helvetica-Bold", fontSize: 26, lineHeight: 1.15, color: C.navy, marginTop: 6, marginBottom: 4 }}>Evaluación ejecutiva y diagnóstico estratégico</Text>
          <Text style={{ fontSize: 13, lineHeight: 1.3, color: C.navy, marginTop: 6 }}>{r.cycle.name}</Text>
          <Track primary={primary} secondary={secondary} approved={approved} />
          <Text style={[st.memo, { marginTop: 18, color: C.muted }]}>
            Diagnosticar antes de transformar. Alinear antes de acelerar. Ejecutar con disciplina. Medir lo que importa.
          </Text>
          <View style={{ marginTop: 60 }}>
            <Text style={st.small}>Generado el {generated} por {r.generatedBy}</Text>
            <Text style={st.small}>Audiencia: {r.audience}</Text>
            <Text style={[st.small, { marginTop: 8 }]}>{NOT_GMP_NOTICE}</Text>
          </View>
        </View>
      </Page>

      <Page size="LETTER" style={st.page}>
        <View style={st.header} fixed>
          <Text>Biogalenic STARS · {r.cycle.name}</Text>
          <Text>Confidencial</Text>
        </View>
        <View style={st.footer} fixed>
          <Text>{NOT_GMP_NOTICE}</Text>
          <Text render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`} />
        </View>

        <Section n={1} title="Resumen ejecutivo" breakBefore={false}>
          <View style={[st.row, { marginBottom: 10 }]}>
            <View style={st.stat}><Text style={st.small}>Puntuación global</Text><Text style={st.statValue}>{sc.overall == null ? "—" : `${num(sc.overall)} / 5`}</Text><Text style={st.small}>{sc.overall == null ? "Sin aprobaciones" : SCORE_LABEL[Math.round(sc.overall)]}</Text></View>
            <View style={st.stat}><Text style={st.small}>Cobertura por peso</Text><Text style={st.statValue}>{sc.coverage}%</Text><Text style={st.small}>{r.progress.approved} de {r.progress.total} áreas aprobadas</Text></View>
            <View style={st.stat}><Text style={st.small}>Escenario STARS</Text><Text style={[st.statValue, { fontSize: 12 }]}>{primary ? STARS_NAME[primary] : "Sin definir"}</Text><Text style={st.small}>{approved ? "Aprobado por el MD" : "Pendiente de aprobación"}</Text></View>
            <View style={st.stat}><Text style={st.small}>Riesgos escalados</Text><Text style={[st.statValue, { color: r.escalated.length ? C.rojo : C.navy }]}>{r.escalated.length}</Text><Text style={st.small}>{critical.length} críticos activos</Text></View>
            <View style={st.stat}><Text style={st.small}>Plan de 90 días</Text><Text style={st.statValue}>{r.planProgress == null ? "—" : `${r.planProgress}%`}</Text><Text style={st.small}>{r.overdueActions.length} acciones vencidas</Text></View>
          </View>
          {r.analysis ? (
            <>
              <Text style={st.memo}>{r.analysis.diagnostico.situacion_general}</Text>
              <Text style={st.h2}>Asuntos críticos</Text>
              <Claims claims={r.analysis.diagnostico.asuntos_criticos.slice(0, 6)} />
              <Text style={st.small}>Análisis de IA del {fmt(r.analysisAt)}. Las afirmaciones se clasifican como hecho verificado, interpretación, hipótesis o recomendación.</Text>
            </>
          ) : stars?.md_rationale ? (
            <Text style={st.memo}>{stars.md_rationale}</Text>
          ) : (
            <Text style={st.muted}>El diagnóstico narrativo estará disponible cuando el Director General apruebe la clasificación STARS.</Text>
          )}
          {sc.incomplete.length > 0 && <Text style={[st.small, { marginTop: 6 }]}>Dimensiones sin puntuación aprobada: {sc.incomplete.join(", ")}.</Text>}
        </Section>

        <Section n={2} title="Descripción de la empresa" breakBefore={false}>
          <Text style={{ marginTop: 4 }}>
            Biogalenic El Salvador fabrica soluciones parenterales estériles de pequeño volumen (SVP) y gran volumen (LVP).
          </Text>
          {r.cycle.company_overview ? <Text style={[st.memo, { marginTop: 6 }]}>{r.cycle.company_overview}</Text> : <Text style={st.small}>Descripción ampliada no registrada en el ciclo.</Text>}
          <Text style={st.small}>Ciclo iniciado el {fmt(r.cycle.starts_on)}.</Text>
        </Section>

        <Section n={3} title="Evaluación STARS">
          <Track primary={primary} secondary={secondary} approved={approved} />
          {approved && stars?.md_rationale && <Text style={st.memo}>{stars.md_rationale}</Text>}
          {approved && stars?.override_justification && stars.ai_primary && (
            <Text style={st.small}>El Director General se apartó de la propuesta de la IA ({STARS_NAME[stars.ai_primary]}): {stars.override_justification}</Text>
          )}
          {r.analysis && (
            <>
              <Text style={st.h2}>Propuesta de la IA · confianza {CONFIDENCE_LABEL[r.analysis.stars.confianza]}</Text>
              <Text style={st.memo}>{r.analysis.stars.justificacion}</Text>
              <View style={st.row}>
                <View style={{ flex: 1, paddingRight: 10 }}><Text style={st.h2}>Evidencia a favor</Text><Claims claims={r.analysis.stars.evidencia_a_favor} /></View>
                <View style={{ flex: 1 }}><Text style={st.h2}>Evidencia en contra</Text><Claims claims={r.analysis.stars.evidencia_en_contra} empty="No se identificó evidencia contradictoria." /></View>
              </View>
              <Text style={st.h2}>Implicaciones estratégicas</Text>
              <Claims claims={r.analysis.stars.implicaciones_estrategicas} />
            </>
          )}
        </Section>

        <Section n={4} title="Evaluación de las ocho dimensiones">
          <Table
            cols={[{ label: "Dimensión", w: 28 }, { label: "Peso", w: 9, align: "right" }, { label: "Aprobada", w: 13, align: "right" }, { label: "Ponderada", w: 13, align: "right" }, { label: "Estado", w: 20 }, { label: "Confianza", w: 17 }]}
            rows={r.approvedScore.lines.map((l) => {
              const a = r.byDim.get(l.code);
              return [
                l.name,
                `${l.weight}%`,
                l.score == null ? "—" : `${l.score} · ${SCORE_LABEL[l.score]}`,
                l.weighted == null ? "—" : num(l.weighted, 3),
                l.status ? STATUS_LABEL[l.status as AssessmentStatus] : "Sin iniciar",
                a?.confidence ? CONFIDENCE_LABEL[a.confidence as Confidence] : "—",
              ];
            })}
          />
          <Text style={st.small}>
            Puntuación ponderada = puntuación × peso. Global = suma de ponderadas ÷ suma de pesos aprobados = {num(sc.weightedSum, 3)} ÷ {sc.coverage}% = {sc.overall == null ? "—" : num(sc.overall)}.
          </Text>
          <Bars data={r.approvedScore.lines.map((l) => ({ label: l.name, value: l.score }))} />
        </Section>

        <Section n={5} title="Desempeño departamental">
          {r.dimensions.map((d) => {
            const a = r.byDim.get(d.code);
            if (!a) return null;
            const rows: [string, string | null][] = [
              ["Desempeño actual", a.current_performance],
              ["Brechas", a.gaps],
              ["Causas raíz", a.root_causes],
              ["Impacto en el negocio", a.business_impact],
              ["Oportunidades de mejora", a.opportunities],
            ];
            return (
              <View key={d.code} style={{ marginBottom: 10 }}>
                <Text style={st.h2}>
                  {d.department_name} · {a.status === "aprobado" ? `${a.approved_score} (${SCORE_LABEL[a.approved_score]})` : STATUS_LABEL[a.status as AssessmentStatus]}
                  {a.risk_class ? ` · riesgo ${LEVEL_LABEL[a.risk_class as Level4].toLowerCase()}` : ""}
                </Text>
                {rows.filter(([, v]) => v).map(([k, v]) => (
                  <View key={k} style={[st.row, { marginBottom: 3 }]} wrap={false}>
                    <Text style={{ width: "26%", color: C.muted }}>{k}</Text>
                    <Text style={{ width: "74%" }}>{v}</Text>
                  </View>
                ))}
                {rows.every(([, v]) => !v) && <Text style={st.small}>Sin diagnóstico registrado.</Text>}
              </View>
            );
          })}
        </Section>

        <Section n={6} title="Evaluación del equipo ejecutivo">
          {r.team ? (
            r.team.length ? (
              <Table
                cols={[{ label: "Director", w: 22 }, { label: "Promedio", w: 10, align: "right" }, { label: "Talento crítico", w: 12 }, { label: "Riesgo sucesión", w: 12 }, { label: "Fortalezas", w: 22 }, { label: "Prioridades de desarrollo", w: 22 }]}
                rows={r.team.map((t) => [
                  `${t.name}${t.position ? `\n${t.position}` : ""}`,
                  t.avg == null ? "—" : num(t.avg, 1),
                  t.critical ? "Sí" : "No",
                  t.succession ? LEVEL_LABEL[t.succession as Level4] : "—",
                  t.strengths ?? "—",
                  t.development ?? "—",
                ])}
              />
            ) : (
              <Text style={st.muted}>No hay evaluaciones registradas en este ciclo.</Text>
            )
          ) : (
            <Text style={st.muted}>Sección confidencial: disponible solo en la versión del Director General.</Text>
          )}
        </Section>

        <Section n={7} title="Riesgos críticos" breakBefore={false}>
          {critical.length ? (
            <Table
              cols={[{ label: "Riesgo", w: 34 }, { label: "Área", w: 13 }, { label: "P×I", w: 9, align: "right" }, { label: "Escalamiento", w: 16 }, { label: "Mitigación", w: 28 }]}
              rows={critical.map((x) => [
                x.description,
                dimName(x.dimension_code),
                `${x.score} · ${LEVEL_LABEL[riskCriticality(x.score)]}`,
                x.escalation_category ? ESCALATION_LABEL[x.escalation_category as EscalationCategory] : "—",
                `${x.mitigation ?? "Sin mitigación registrada"}${x.due_date ? ` (${fmt(x.due_date)})` : ""}`,
              ])}
            />
          ) : (
            <Text style={st.muted}>No hay riesgos críticos ni escalados activos.</Text>
          )}
          <Text style={st.small}>Los riesgos escalados se reportan siempre, independientemente del promedio de su área.</Text>
        </Section>

        <Section n={8} title="Prioridades estratégicas">
          {r.approvedPriorities.length ? (
            r.approvedPriorities.map((p, i) => (
              <View key={p.id} style={{ marginBottom: 10 }} wrap={false}>
                <Text style={st.h2}>{i + 1}. {p.objective}</Text>
                <Table
                  cols={[{ label: "Responsable", w: 20 }, { label: "KPI", w: 24 }, { label: "Línea base / meta", w: 22 }, { label: "Fecha límite", w: 14 }, { label: "Recursos", w: 20 }]}
                  rows={[[
                    (p.responsible as { full_name: string } | null)?.full_name ?? "—",
                    p.kpi_text ?? "—",
                    `${p.baseline ?? "—"} / ${p.target ?? "—"}`,
                    fmt(p.deadline),
                    p.resources ?? "—",
                  ]]}
                />
                {p.rationale && <Text><Text style={st.muted}>Justificación: </Text>{p.rationale}</Text>}
                {p.expected_impact && <Text><Text style={st.muted}>Impacto esperado: </Text>{p.expected_impact}</Text>}
                {p.risks_dependencies && <Text><Text style={st.muted}>Riesgos y dependencias: </Text>{p.risks_dependencies}</Text>}
              </View>
            ))
          ) : (
            <Text style={st.muted}>Aún no hay prioridades aprobadas.</Text>
          )}
        </Section>

        <Section n={9} title="Quick wins" breakBefore={false}>
          {quickWins.length ? (
            <Table
              cols={[{ label: "Acción", w: 44 }, { label: "Responsable", w: 20 }, { label: "Fecha", w: 14 }, { label: "Avance", w: 10, align: "right" }, { label: "Estado", w: 12 }]}
              rows={quickWins.map((a) => [a.title, (a.owner as { full_name: string } | null)?.full_name ?? "—", fmt(a.deadline), `${a.progress}%`, ACTION_STATUS_LABEL[a.status as ActionStatus]])}
            />
          ) : (
            <Text style={st.muted}>No hay quick wins registrados en el plan.</Text>
          )}
          {r.analysis && r.analysis.recomendaciones.quick_wins.length > 0 && (
            <>
              <Text style={st.h2}>Quick wins sugeridos por la IA (no aprobados como acciones)</Text>
              <Claims claims={r.analysis.recomendaciones.quick_wins} />
            </>
          )}
        </Section>

        <Section n={10} title="Plan de 90 días">
          {PHASES.map((ph, i) => {
            const items = r.actions.filter((a) => a.phase === ph.n);
            return (
              <View key={ph.n} style={{ marginBottom: 8 }}>
                <Text style={st.h2}>{ph.days} · {ph.name} · avance {r.phaseProgress[i] == null ? "—" : `${r.phaseProgress[i]}%`}</Text>
                {items.length ? (
                  <Table
                    cols={[{ label: "Acción", w: 34 }, { label: "Responsable", w: 18 }, { label: "Fecha", w: 13 }, { label: "KPI / meta", w: 17 }, { label: "Avance", w: 8, align: "right" }, { label: "Estado", w: 10 }]}
                    rows={items.map((a) => [
                      a.title,
                      (a.owner as { full_name: string } | null)?.full_name ?? "—",
                      fmt(a.deadline),
                      [a.kpi_text, a.target].filter(Boolean).join(" · ") || "—",
                      `${a.progress}%`,
                      ACTION_STATUS_LABEL[a.status as ActionStatus],
                    ])}
                  />
                ) : (
                  <Text style={st.small}>Sin acciones.</Text>
                )}
              </View>
            );
          })}
        </Section>

        <Section n={11} title="Recomendaciones del Director General">
          {r.mdRecommendations ? <Text style={st.memo}>{r.mdRecommendations}</Text> : <Text style={st.muted}>El Director General no ha registrado recomendaciones para este reporte.</Text>}
          {r.analysis && (
            <>
              <Text style={st.h2}>Decisiones que requieren al Director General (propuesta de la IA)</Text>
              <Claims claims={r.analysis.soporte_decision.decisiones_md} />
              <Text style={st.h2}>Asignación de recursos (propuesta de la IA)</Text>
              <Claims claims={r.analysis.soporte_decision.asignacion_recursos} />
              {r.analysis.evidencia_requerida.length > 0 && (
                <>
                  <Text style={st.h2}>Evidencia requerida</Text>
                  {r.analysis.evidencia_requerida.map((e, i) => (
                    <Text key={i}>• {dimName(e.dimension)}: {e.detalle}</Text>
                  ))}
                </>
              )}
            </>
          )}
        </Section>
      </Page>
    </Document>
  );
}
