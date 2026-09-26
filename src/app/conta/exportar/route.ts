import { NextResponse } from "next/server";
import { getClienteAtual } from "@/lib/dados/cliente";
import { exportarDadosRestaurante } from "@/lib/dados/conta";
import { createClient } from "@/lib/supabase/server";

// PLANO 9,5, etapa 3 (2026-09-28): LGPD — download de todos os dados do
// restaurante em JSON (acesso e portabilidade). Só o dono.
export async function GET() {
  const cliente = await getClienteAtual();
  if (!cliente) return NextResponse.json({ erro: "Faça login." }, { status: 401 });
  if (cliente.papel !== "dono") return NextResponse.json({ erro: "Só o dono do restaurante baixa os dados." }, { status: 403 });

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const agora = new Date();
  const corpo = {
    gerado_em: agora.toISOString(),
    formato: "ficha-tecnica/exportacao-v1",
    restaurante: cliente.nomeRestaurante,
    conta_do_dono: { email: user?.email ?? null, criada_em: user?.created_at ?? null },
    tabelas: await exportarDadosRestaurante(),
  };

  const nome = cliente.nomeRestaurante
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "") || "restaurante";
  return new NextResponse(JSON.stringify(corpo, null, 2), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="ficha-tecnica-${nome}-${agora.toISOString().slice(0, 10)}.json"`,
      "Cache-Control": "no-store",
    },
  });
}
