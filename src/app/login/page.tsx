import { redirect } from "next/navigation";
import { getClienteAtual } from "@/lib/dados/cliente";
import { LoginForm } from "./LoginForm";

export default async function LoginPage() {
  const cliente = await getClienteAtual();
  if (cliente) redirect("/insumos");

  return (
    <div className="w-full min-h-screen flex items-center justify-center p-4" style={{ background: "var(--bg)" }}>
      <LoginForm />
    </div>
  );
}
