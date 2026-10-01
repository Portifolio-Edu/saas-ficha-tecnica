import { redirect } from "next/navigation";
import { getClienteAtual } from "@/lib/dados/cliente";
import { CadastroForm } from "./CadastroForm";

export default async function CadastroPage() {
  const cliente = await getClienteAtual();
  if (cliente) redirect("/insumos");

  return (
    <main id="conteudo" className="w-full min-h-screen flex items-center justify-center p-4" style={{ background: "var(--bg)" }}>
      <CadastroForm />
    </main>
  );
}
