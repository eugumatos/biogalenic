import { z } from "zod";

export const CLAIM_TYPES = ["hecho_verificado", "interpretacion", "hipotesis", "recomendacion"] as const;
export type ClaimType = (typeof CLAIM_TYPES)[number];

export const CLAIM_LABEL: Record<ClaimType, string> = {
  hecho_verificado: "Hecho verificado",
  interpretacion: "Interpretación",
  hipotesis: "Hipótesis",
  recomendacion: "Recomendación",
};

const claim = z.object({
  tipo: z.enum(CLAIM_TYPES).describe(
    "hecho_verificado SOLO si está respaldado por datos del snapshot citados en fuentes; interpretacion = lectura de la dirección o del analista; hipotesis = posible explicación no comprobada; recomendacion = acción sugerida.",
  ),
  texto: z.string().describe("Afirmación en español ejecutivo, una o dos oraciones."),
  fuentes: z.array(z.string()).describe("IDs del snapshot que respaldan la afirmación (p. ej. 'eval:calidad', 'kpi:<uuid>', 'riesgo:<uuid>'). Vacío si no hay respaldo directo."),
});
export type Claim = z.infer<typeof claim>;

const scenario = z.enum(["start_up", "turnaround", "crecimiento_acelerado", "realineamiento", "exito_sostenido"]);

export const analysisSchema = z.object({
  diagnostico: z.object({
    situacion_general: z.string().describe("Párrafo ejecutivo sobre la situación global de la organización."),
    hallazgos_clave: z.array(claim),
    fortalezas: z.array(claim),
    debilidades: z.array(claim),
    asuntos_criticos: z.array(claim).describe("Incluye siempre los riesgos escalados aunque los promedios sean buenos."),
  }),
  stars: z.object({
    principal: scenario,
    secundarios: z.array(scenario).max(2),
    evidencia_a_favor: z.array(claim),
    evidencia_en_contra: z.array(claim),
    confianza: z.enum(["alta", "media", "baja"]),
    justificacion: z.string(),
    implicaciones_estrategicas: z.array(claim),
  }),
  causas_raiz: z.object({
    problemas_recurrentes: z.array(claim),
    relaciones: z
      .array(
        z.object({
          sintoma: z.string(),
          causa_raiz: z.string(),
          dimensiones: z.array(z.string()).describe("Códigos de dimensión involucrados."),
          tipo: z.enum(["hecho_verificado", "interpretacion", "hipotesis"]),
          fuentes: z.array(z.string()),
        }),
      )
      .describe("Relaciones síntoma → causa raíz entre departamentos."),
    problemas_estructurales: z.array(claim),
  }),
  recomendaciones: z.object({
    prioridades: z
      .array(
        z.object({
          objetivo: z.string(),
          justificacion: z.string(),
          impacto_esperado: z.string(),
          dimension_responsable: z.string().describe("Código de la dimensión que lidera."),
          dimensiones_apoyo: z.array(z.string()),
          kpi: z.string().describe("KPI propuesto. Usar un KPI existente del snapshot cuando aplique."),
          linea_base: z.string().describe("Valor del snapshot o 'Requiere evidencia' si no existe."),
          meta: z.string().describe("Meta propuesta a aprobar por el MD, o 'Por definir por el MD'. Nunca inventar benchmarks."),
          plazo_dias: z.number().int().min(7).max(365),
          recursos: z.string(),
          riesgos_dependencias: z.string(),
        }),
      )
      .max(5),
    quick_wins: z.array(claim),
    mediano_plazo: z.array(claim),
    largo_plazo: z.array(claim),
  }),
  soporte_decision: z.object({
    decisiones_md: z.array(claim),
    decisiones_delegables: z.array(claim),
    asignacion_recursos: z.array(claim),
    alineacion_organizacional: z.array(claim),
  }),
  recomendaciones_por_dimension: z.array(
    z.object({ dimension: z.string(), recomendaciones: z.array(claim) }),
  ),
  evidencia_requerida: z
    .array(z.object({ dimension: z.string(), detalle: z.string() }))
    .describe("Información faltante necesaria para un diagnóstico confiable."),
});

export type Analysis = z.infer<typeof analysisSchema>;

export type ValidationReport = {
  unsupportedFacts: { path: string; texto: string; fuentes: string[] }[];
  downgraded: number;
};
