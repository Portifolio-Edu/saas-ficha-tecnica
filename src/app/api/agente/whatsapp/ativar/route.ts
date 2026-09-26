import { NextResponse, type NextRequest } from "next/server";
import { criarClienteAdmin } from "@/lib/supabase/admin";
import { configAgente } from "@/lib/agente/config";
import { chaveN8nConfere } from "@/lib/agente/passe";
import { hashCodigo, variantesTelefone } from "@/lib/agente/whatsapp";

// AGENTE IA (2026-09-26): a pessoa mandou "ATIVAR 123456" pro WhatsApp do
// agente; o n8n repassa aqui (com a chave x-ft-chave). Se o código bate com o
// gerado pra esse número e está no prazo, o número fica verificado.
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  if (!chaveN8nConfere(req.headers.get("x-ft-chave"), configAgente().chaveN8n)) return NextResponse.json({ erro: "Não autorizado." }, { status: 401 });
  const { telefone, codigo } = (await req.json().catch(() => ({}))) as { telefone?: string; codigo?: string };
  if (!telefone || !codigo) return NextResponse.json({ erro: "Falta telefone ou código." }, { status: 400 });

  const admin = criarClienteAdmin();
  const { data: vinculo } = await admin
    .from("agente_whatsapp")
    .select("id, user_id, cliente_id, telefone")
    .in("telefone", variantesTelefone(telefone))
    .eq("codigo_hash", hashCodigo(codigo))
    .gt("codigo_expira_em", new Date().toISOString())
    .is("verificado_em", null)
    .maybeSingle();
  if (!vinculo) return NextResponse.json({ ok: false, erro: "Código inválido ou vencido. Gere outro no sistema: botão Agente IA → aba WhatsApp." });

  const { error } = await admin.from("agente_whatsapp").update({ verificado_em: new Date().toISOString(), codigo_hash: null, codigo_expira_em: null }).eq("id", vinculo.id);
  if (error) {
    return NextResponse.json({ ok: false, erro: error.code === "23505" ? "Esse número já está ativado pra outra pessoa." : "Não consegui ativar agora." });
  }
  const { data: membro } = await admin.from("membros").select("nome").eq("user_id", vinculo.user_id).maybeSingle();
  return NextResponse.json({ ok: true, nome: membro?.nome ?? null });
}
