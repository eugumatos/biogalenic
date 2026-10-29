"use client";

import { useActionState, useState } from "react";
import { bootstrapMd, requestReset, signIn, setPassword, type FormState } from "./actions";

function Message({ state }: { state: FormState }) {
  if (state?.error) return <p role="alert" className="text-sm text-rojo">{state.error}</p>;
  if (state?.ok) return <p role="status" className="text-sm text-verde">{state.ok}</p>;
  return null;
}

export function LoginForm({ bootstrap }: { bootstrap: boolean }) {
  const [mode, setMode] = useState<"login" | "reset">("login");
  const [state, action, pending] = useActionState(bootstrap ? bootstrapMd : mode === "login" ? signIn : requestReset, undefined);

  return (
    <form action={action} className="space-y-4" key={mode}>
      {bootstrap && (
        <div>
          <label className="field-label" htmlFor="full_name">Nombre completo</label>
          <input className="input" id="full_name" name="full_name" autoComplete="name" required />
        </div>
      )}
      <div>
        <label className="field-label" htmlFor="email">Correo corporativo</label>
        <input className="input" id="email" name="email" type="email" autoComplete="email" required />
      </div>
      {mode === "login" && (
        <div>
          <label className="field-label" htmlFor="password">Contraseña</label>
          <input
            className="input"
            id="password"
            name="password"
            type="password"
            autoComplete={bootstrap ? "new-password" : "current-password"}
            minLength={8}
            required
          />
        </div>
      )}
      <Message state={state} />
      <button className="btn btn-primary w-full justify-center py-2.5" disabled={pending}>
        {bootstrap ? "Crear cuenta del Director General" : mode === "login" ? "Iniciar sesión" : "Enviar enlace"}
      </button>
      {!bootstrap && (
        <button
          type="button"
          className="btn-quiet text-sm"
          onClick={() => setMode(mode === "login" ? "reset" : "login")}
        >
          {mode === "login" ? "Olvidé mi contraseña" : "Volver a iniciar sesión"}
        </button>
      )}
    </form>
  );
}

export function SetPasswordForm() {
  const [state, action, pending] = useActionState(setPassword, undefined);
  return (
    <form action={action} className="space-y-4">
      <div>
        <label className="field-label" htmlFor="password">Nueva contraseña</label>
        <input className="input" id="password" name="password" type="password" autoComplete="new-password" minLength={8} required />
      </div>
      <div>
        <label className="field-label" htmlFor="confirm">Confirmar contraseña</label>
        <input className="input" id="confirm" name="confirm" type="password" autoComplete="new-password" minLength={8} required />
      </div>
      <Message state={state} />
      <button className="btn btn-primary w-full justify-center py-2.5" disabled={pending}>Guardar contraseña</button>
    </form>
  );
}
