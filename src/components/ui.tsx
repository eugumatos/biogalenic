import clsx from "clsx";
import type { ReactNode } from "react";
import { SCORE_LABEL } from "@/lib/domain";

export function PageHeader({
  title,
  intro,
  actions,
}: {
  title: string;
  intro?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div className="max-w-3xl">
        <h1 className="text-2xl font-bold sm:text-[1.75rem]">{title}</h1>
        {intro && <p className="mt-1.5 text-[0.95rem] text-muted">{intro}</p>}
      </div>
      {actions && <div className="no-print flex flex-wrap gap-2">{actions}</div>}
    </header>
  );
}

export function Panel({
  title,
  aside,
  children,
  className,
  bodyClassName,
}: {
  title?: ReactNode;
  aside?: ReactNode;
  children: ReactNode;
  className?: string;
  bodyClassName?: string;
}) {
  return (
    <section className={clsx("panel", className)}>
      {(title || aside) && (
        <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-rule px-4 py-3 sm:px-5">
          {title && <h2 className="text-[0.98rem] font-semibold">{title}</h2>}
          {aside && <div className="text-sm text-muted">{aside}</div>}
        </div>
      )}
      <div className={clsx("p-4 sm:p-5", bodyClassName)}>{children}</div>
    </section>
  );
}

type Tone = "neutral" | "verde" | "ambar" | "rojo" | "navy" | "saline";
const toneClass: Record<Tone, string> = {
  neutral: "bg-mist text-muted",
  verde: "bg-verde-soft text-verde",
  ambar: "bg-ambar-soft text-ambar",
  rojo: "bg-rojo-soft text-rojo",
  navy: "bg-navy text-white",
  saline: "bg-saline-soft text-navy-3",
};

export function Badge({ tone = "neutral", children, className }: { tone?: Tone; children: ReactNode; className?: string }) {
  return (
    <span className={clsx("inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold whitespace-nowrap", toneClass[tone], className)}>
      {children}
    </span>
  );
}

export function scoreTone(score: number | null | undefined): Tone {
  if (score == null) return "neutral";
  if (score <= 2) return "rojo";
  if (score === 3) return "ambar";
  return "verde";
}

export function ScoreBadge({ score }: { score: number | null | undefined }) {
  if (score == null) return <Badge>Sin evaluar</Badge>;
  return (
    <Badge tone={scoreTone(score)}>
      {score} · {SCORE_LABEL[score]}
    </Badge>
  );
}

export function levelTone(level: string | null | undefined): Tone {
  if (level === "critico") return "rojo";
  if (level === "alto") return "ambar";
  if (level === "medio") return "saline";
  return "neutral";
}

export function Stat({
  label,
  value,
  note,
  tone,
}: {
  label: string;
  value: ReactNode;
  note?: ReactNode;
  tone?: "rojo" | "ambar" | "verde";
}) {
  return (
    <div className="min-w-0">
      <div className="text-[0.8rem] text-muted">{label}</div>
      <div
        className={clsx(
          "mt-0.5 text-2xl font-bold tabular-nums",
          tone === "rojo" ? "text-rojo" : tone === "ambar" ? "text-ambar" : tone === "verde" ? "text-verde" : "text-navy",
        )}
      >
        {value}
      </div>
      {note && <div className="mt-0.5 text-xs text-muted">{note}</div>}
    </div>
  );
}

export function Meter({ value, tone = "navy", label }: { value: number; tone?: "navy" | "verde" | "ambar" | "rojo"; label?: string }) {
  const v = Math.max(0, Math.min(100, value));
  const bar = { navy: "bg-navy", verde: "bg-verde", ambar: "bg-ambar-line", rojo: "bg-rojo" }[tone];
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-mist" role="meter" aria-valuemin={0} aria-valuemax={100} aria-valuenow={v} aria-label={label}>
      <div className={clsx("h-full rounded-full", bar)} style={{ width: `${v}%` }} />
    </div>
  );
}

export function Empty({ title, children, action }: { title: string; children?: ReactNode; action?: ReactNode }) {
  return (
    <div className="rounded-[6px] border border-dashed border-rule bg-mist-2 px-5 py-8 text-center">
      <p className="font-semibold text-navy">{title}</p>
      {children && <p className="mx-auto mt-1 max-w-md text-sm text-muted">{children}</p>}
      {action && <div className="mt-4 flex justify-center">{action}</div>}
    </div>
  );
}

export function HowCalculated({ children, summary = "Cómo se calcula" }: { children: ReactNode; summary?: string }) {
  return (
    <details className="group mt-3 text-sm">
      <summary className="cursor-pointer list-none text-navy-3 select-none hover:underline">
        <span className="inline-block transition-transform group-open:rotate-90">›</span> {summary}
      </summary>
      <div className="mt-2 rounded-[4px] bg-mist-2 p-3 text-muted">{children}</div>
    </details>
  );
}

export function Notice({ tone = "ambar", children }: { tone?: "ambar" | "rojo" | "saline" | "verde"; children: ReactNode }) {
  const c = {
    ambar: "border-ambar-line bg-ambar-soft text-ink",
    rojo: "border-rojo bg-rojo-soft text-ink",
    saline: "border-saline bg-saline-soft text-ink",
    verde: "border-verde bg-verde-soft text-ink",
  }[tone];
  return <div className={clsx("rounded-[4px] border-l-4 px-4 py-3 text-sm", c)}>{children}</div>;
}

export function fmtDate(d: string | null | undefined) {
  if (!d) return "—";
  const date = d.length === 10 ? new Date(d + "T12:00:00") : new Date(d);
  return new Intl.DateTimeFormat("es-SV", { day: "numeric", month: "short", year: "numeric" }).format(date);
}

export function fmtDateTime(d: string | null | undefined) {
  if (!d) return "—";
  return new Intl.DateTimeFormat("es-SV", { dateStyle: "medium", timeStyle: "short" }).format(new Date(d));
}

export function fmtNum(n: number | null | undefined, digits = 2) {
  if (n == null || Number.isNaN(n)) return "—";
  return new Intl.NumberFormat("es-SV", { maximumFractionDigits: digits }).format(n);
}
