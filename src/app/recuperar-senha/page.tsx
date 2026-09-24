import { CartaoAuth } from "@/components/auth/CartaoAuth";
import { RecuperarSenhaForm } from "./RecuperarSenhaForm";

// PRODUCAO (2026-09-24): pedido de link pra criar senha nova.
export default function RecuperarSenhaPage() {
  return (
    <CartaoAuth titulo="Esqueci minha senha" subtitulo="Informe o e-mail da conta. Mandamos um link pra você criar uma senha nova.">
      <RecuperarSenhaForm />
    </CartaoAuth>
  );
}
