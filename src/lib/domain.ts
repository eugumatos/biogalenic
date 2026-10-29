export type AppRole = "md" | "director" | "lector";
export type AssessmentStatus = "borrador" | "enviado" | "devuelto" | "aprobado";
export type Confidence = "alta" | "media" | "baja";
export type Level4 = "bajo" | "medio" | "alto" | "critico";
export type StarsScenario =
  | "start_up"
  | "turnaround"
  | "crecimiento_acelerado"
  | "realineamiento"
  | "exito_sostenido";
export type RiskStatus = "abierto" | "en_mitigacion" | "cerrado";
export type EscalationCategory =
  | "calidad"
  | "seguridad_paciente"
  | "esterilidad"
  | "integridad_datos"
  | "sst"
  | "regulatorio";
export type ActionStatus = "pendiente" | "en_curso" | "completada" | "bloqueada" | "cancelada";
export type DecisionStatus = "propuesta" | "aprobada" | "rechazada";

export const ROLE_LABEL: Record<AppRole, string> = {
  md: "Director General",
  director: "Director Ejecutivo",
  lector: "Ejecutivo (solo lectura)",
};

export const SCORE_LABEL: Record<number, string> = {
  1: "Crítico",
  2: "Débil",
  3: "Intermedio",
  4: "Sólido",
  5: "Excelente",
};

export const STATUS_LABEL: Record<AssessmentStatus, string> = {
  borrador: "Borrador",
  enviado: "Enviada al MD",
  devuelto: "Devuelta",
  aprobado: "Aprobada",
};

export const CONFIDENCE_LABEL: Record<Confidence, string> = { alta: "Alta", media: "Media", baja: "Baja" };
export const LEVEL_LABEL: Record<Level4, string> = { bajo: "Bajo", medio: "Medio", alto: "Alto", critico: "Crítico" };

export const STARS: { key: StarsScenario; letter: string; name: string; summary: string }[] = [
  { key: "start_up", letter: "S", name: "Start-up", summary: "Creación de una nueva operación, unidad, planta, línea o mercado." },
  { key: "turnaround", letter: "T", name: "Turnaround", summary: "Recuperación de una operación con problemas financieros, operativos, de calidad u organizacionales significativos." },
  { key: "crecimiento_acelerado", letter: "A", name: "Crecimiento acelerado", summary: "Expansión rápida que exige capacidad, inversión, talento y escalabilidad operativa." },
  { key: "realineamiento", letter: "R", name: "Realineamiento", summary: "Operación establecida que requiere realinear estrategia, organización, operación o cultura." },
  { key: "exito_sostenido", letter: "S", name: "Éxito sostenido", summary: "Operación exitosa enfocada en sostener desempeño, mejora continua y competitividad." },
];
export const STARS_NAME = Object.fromEntries(STARS.map((s) => [s.key, s.name])) as Record<StarsScenario, string>;

export const ESCALATION_LABEL: Record<EscalationCategory, string> = {
  calidad: "Calidad farmacéutica",
  seguridad_paciente: "Seguridad del paciente",
  esterilidad: "Aseguramiento de esterilidad",
  integridad_datos: "Integridad de datos",
  sst: "Seguridad ocupacional",
  regulatorio: "Cumplimiento regulatorio",
};

export const RISK_STATUS_LABEL: Record<RiskStatus, string> = {
  abierto: "Abierto",
  en_mitigacion: "En mitigación",
  cerrado: "Cerrado",
};

export const ACTION_STATUS_LABEL: Record<ActionStatus, string> = {
  pendiente: "Pendiente",
  en_curso: "En curso",
  completada: "Completada",
  bloqueada: "Bloqueada",
  cancelada: "Cancelada",
};

export const DECISION_LABEL: Record<DecisionStatus, string> = {
  propuesta: "Propuesta",
  aprobada: "Aprobada",
  rechazada: "Rechazada",
};

export const PHASES = [
  { n: 1, days: "Días 1–30", name: "Aprender y diagnosticar", focus: ["Evaluación del negocio", "Entrevistas ejecutivas", "Visitas operativas", "Análisis financiero", "Identificación de riesgos"] },
  { n: 2, days: "Días 31–60", name: "Alinear y definir", focus: ["Prioridades estratégicas", "Alineación del equipo ejecutivo", "Quick wins", "Definición de KPIs", "Asignación de recursos"] },
  { n: 3, days: "Días 61–90", name: "Ejecutar y consolidar", focus: ["Implementación de iniciativas", "Revisiones de desempeño", "Rendición de cuentas", "Evaluación de resultados", "Hoja de ruta a 12 meses"] },
] as const;

export const COMPETENCIES = [
  { key: "technical", label: "Competencia técnica" },
  { key: "strategic", label: "Pensamiento estratégico" },
  { key: "leadership", label: "Liderazgo" },
  { key: "execution", label: "Capacidad de ejecución" },
  { key: "accountability", label: "Rendición de cuentas" },
  { key: "collaboration", label: "Colaboración" },
  { key: "decision_making", label: "Toma de decisiones" },
  { key: "adaptability", label: "Adaptabilidad" },
  { key: "integrity", label: "Integridad" },
] as const;
export type CompetencyKey = (typeof COMPETENCIES)[number]["key"];

export type Dimension = {
  code: string;
  name: string;
  department_name: string;
  weight: number;
  sort_order: number;
  description: string | null;
};

export type Profile = {
  id: string;
  full_name: string;
  email: string;
  position: string | null;
  role: AppRole;
  is_executive: boolean;
  active: boolean;
};

export const NOT_GMP_NOTICE =
  "Herramienta de apoyo a la gestión. No es un sistema GMP validado ni sustituye al eQMS.";

/** Nombres cortos de dimensión para gráficos. */
export const DIMENSION_SHORT: Record<string, string> = {
  financiero: "Financiero",
  comercial: "Comercial",
  industrial: "Industrial",
  calidad: "Calidad",
  supply: "Suministro",
  personas: "Personas",
  seguridad: "Seguridad",
  estrategia: "Estrategia",
};
