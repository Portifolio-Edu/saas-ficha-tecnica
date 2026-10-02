import { NextResponse, type NextRequest } from "next/server";
import { criarClienteAdmin, serviceRoleConfigurada } from "@/lib/supabase/admin";
import { configAgente } from "@/lib/agente/config";
import { chaveN8nConfere } from "@/lib/agente/passe";
import { origemDoSite } from "@/lib/auth/origem";
import { gravarAvisos, montarAvisos } from "@/lib/automacoes/gerar";
import { registrarErro } from "@/lib/monitoramento";

// AVISOS NO WHATSAPP (2026-10-02): o n8n (workflow "FT — Avisos") chama a cada
// 5 min. O app monta os avisos que estão na hora, põe na caixa de saída e
// devolve os que o n8n deve mandar agora (já marcados "enviando"). Só com a
// chave do n8n (x-ft-chave). Depois de mandar, o n8n chama /resultado.
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  if (!chaveN8nConfere(req.headers.get("x-ft-chave"), configAgente().chaveN8n)) {
    return NextResponse.json({ erro: "Não autorizado." }, { status: 401 });
  }
  if (!serviceRoleConfigurada()) return NextResponse.json({ erro: "Servidor sem SUPABASE_SERVICE_ROLE_KEY." }, { status: 503 });

  const admin = criarClienteAdmin();
  try {
    const novos = await gravarAvisos(admin, await montarAvisos(admin, await origemDoSite()));
    const { data, error } = await admin.rpc("reservar_avisos", { p_limite: 50 });
    if (error) throw new Error(error.message);
    const avisos = ((data ?? []) as { id: string; telefone: string; texto: string; tipo: string }[]).map((a) => ({
      id: a.id,
      telefone: a.telefone,
      texto: a.texto,
      tipo: a.tipo,
    }));
    return NextResponse.json({ novos, avisos });
  } catch (e) {
    await registrarErro({ origem: "servidor", rota: "/api/automacoes/pendentes", metodo: "POST", erro: e }).catch(() => {});
    return NextResponse.json({ erro: "Falha ao montar os avisos." }, { status: 500 });
  }
}
