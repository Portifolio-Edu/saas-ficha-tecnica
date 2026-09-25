import { redirect } from "next/navigation";
import { getClienteAtual } from "@/lib/dados/cliente";
import { LoginForm } from "./LoginForm";

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ aviso?: string }> }) {
  const cliente = await getClienteAtual();
  if (cliente) redirect("/");
  // PRODUCAO (2026-09-24): /auth/confirmar manda pra cá quando o link do e-mail venceu.
  const { aviso } = await searchParams;

  return (
    <div className="w-full min-h-screen flex items-center justify-center p-4" style={{ background: "var(--bg)" }}>
      <LoginForm linkInvalido={aviso === "link-invalido"} />
    </div>
  );
}
