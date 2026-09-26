import { NextResponse, type NextRequest } from "next/server";
import { criarClienteAdmin } from "@/lib/supabase/admin";
import { configAgente } from "@/lib/agente/config";
import { assinarPasse, chaveN8nConfere } from "@/lib/agente/passe";
import { PAPEIS_DO_AGENTE } from "@/lib/agente/pessoa";
import { variantesTelefone } from "@/lib/agente/whatsapp";
import type { Papel } from "@/lib/auth/papeis";

// AGENTE IA (2026-09-26): o n8n (workflow do WhatsApp) pergunta quem é o dono
// do número que mandou a mensagem. Só com a chave do n8n (x-ft-chave) e só
// número VERIFICADO (a pessoa mandou o código de ativação). Devolve o passe
// da pessoa (15 min) ou 404 { erro: "nao_vinculado" }.
// Usa a service role só pra essa busca; as ferramentas depois rodam como a pessoa.
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const { segredo, chaveN8n } = configAgente();
  if (!chaveN8nConfere(req.headers.get("x-ft-chave"), chaveN8n)) return NextResponse.json({ erro: "Não autorizado." }, { status: 401 });
  const { telefone } = (await req.json().catch(() => ({}))) as { telefone?: string };
  if (!telefone) return NextResponse.json({ erro: "Falta o telefone." }, { status: 400 });

  const admin = criarClienteAdmin();
  const { data: vinculo } = await admin
    .from("agente_whatsapp")
    .select("user_id, cliente_id")
    .in("telefone", variantesTelefone(telefone))
    .not("verificado_em", "is", null)
    .maybeSingle();
  if (!vinculo) return NextResponse.json({ erro: "nao_vinculado" }, { status: 404 });

  const [{ data: membro }, { data: restaurante }] = await Promise.all([
    admin.from("membros").select("papel, nome, ativo").eq("user_id", vinculo.user_id).eq("cliente_id", vinculo.cliente_id).maybeSingle(),
    admin.from("clientes").select("nome_restaurante").eq("id", vinculo.cliente_id).maybeSingle(),
  ]);
  if (!membro || !membro.ativo || !PAPEIS_DO_AGENTE.includes(membro.papel as Papel) || !restaurante) {
    return NextResponse.json({ erro: "nao_vinculado" }, { status: 404 });
  }
  const passe = assinarPasse({ u: vinculo.user_id, c: vinculo.cliente_id, p: membro.papel as Papel, n: membro.nome, r: restaurante.nome_restaurante, canal: "whatsapp" }, segredo);
  return NextResponse.json({
    passe,
    sessao: `ft:${vinculo.cliente_id}:${vinculo.user_id}:whatsapp`,
    pessoa: { nome: membro.nome, papel: membro.papel },
    restaurante: restaurante.nome_restaurante,
  });
}
