import type { Metadata } from "next";
import { AuthFrame } from "@/components/auth-frame";
import { createClient } from "@/lib/supabase/server";
import { LoginForm } from "./forms";

export const metadata: Metadata = { title: "Iniciar sesión" };

const ERRORS: Record<string, string> = {
  perfil: "Su usuario no tiene un perfil asignado. Contacte al Director General.",
  inactivo: "Su acceso fue desactivado. Contacte al Director General.",
  enlace: "El enlace expiró o ya fue utilizado. Solicite uno nuevo.",
};

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const { error } = await searchParams;
  const supabase = await createClient();
  const { data: bootstrap } = await supabase.rpc("needs_bootstrap");

  return <AuthFrame
    title={bootstrap ? "Configuración inicial" : "Iniciar sesión"}
    intro={bootstrap ? "Aún no hay usuarios. Cree la cuenta del Director General; desde ahí se invita al resto del equipo." : "Acceso restringido al equipo directivo de Biogalenic El Salvador."}
    error={typeof error === "string" ? ERRORS[error] : undefined}
  >
    <LoginForm bootstrap={!!bootstrap} />
  </AuthFrame>;
}

