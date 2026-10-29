import { AuthFrame } from "@/components/auth-frame";
import { SetPasswordForm } from "@/app/login/forms";

export default function SetPasswordPage() {
  return (
    <AuthFrame title="Defina su contraseña" intro="Use al menos 8 caracteres. Esta contraseña protege información confidencial de la empresa.">
      <SetPasswordForm />
    </AuthFrame>
  );
}
