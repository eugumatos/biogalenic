export function Feedback({ state }: { state: { error?: string; ok?: string } | undefined }) {
  if (state?.error) return <p role="alert" className="text-sm text-rojo">{state.error}</p>;
  if (state?.ok) return <p role="status" className="text-sm text-verde">{state.ok}</p>;
  return null;
}
