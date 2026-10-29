import { renderToBuffer } from "@react-pdf/renderer";
import { getSession } from "@/lib/session";
import { loadReport } from "@/lib/report/data";
import { ExecutiveReport } from "@/lib/report/pdf";

export const maxDuration = 60;

export async function GET() {
  const s = await getSession();
  if (!s.cycle) return new Response("No hay un ciclo activo.", { status: 404 });
  const data = await loadReport(s);
  const buffer = await renderToBuffer(<ExecutiveReport r={data} />);
  const name = `Biogalenic-STARS-${data.cycle.name.replace(/[^\w-]+/g, "_")}.pdf`;
  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${name}"`,
      "Cache-Control": "private, no-store",
    },
  });
}
