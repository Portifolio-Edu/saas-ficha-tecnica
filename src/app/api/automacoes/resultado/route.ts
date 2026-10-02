import { NextResponse, type NextRequest } from "next/server";
import { criarClienteAdmin, serviceRoleConfigurada } from "@/lib/supabase/admin";
import { configAgente } from "@/lib/agente/config";
import { chaveN8nConfere } from "@/lib/agente/passe";

// AVISOS NO WHATSAPP (2026-10-02): o n8n conta o que conseguiu mandar.
// Mandou = "enviado". Falhou = volta pra fila (até 3 tentativas), depois
// "falhou" com o motivo, que aparece no histórico em Configurações → Avisos.
export const dynamic = "force-dynamic";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function POST(req: NextRequest) {
  if (!chaveN8nConfere(req.headers.get("x-ft-chave"), configAgente().chaveN8n)) {
    return NextResponse.json({ erro: "Não autorizado." }, { status: 401 });
  }
  if (!serviceRoleConfigurada()) return NextResponse.json({ erro: "Servidor sem SUPABASE_SERVICE_ROLE_KEY." }, { status: 503 });

  const corpo = (await req.json().catch(() => ({}))) as { resultados?: { id?: string; ok?: boolean; erro?: string }[] };
  const resultados = (corpo.resultados ?? []).filter((r) => typeof r.id === "string" && UUID.test(r.id)).slice(0, 200);
  if (!resultados.length) return NextResponse.json({ erro: "Nenhum resultado válido." }, { status: 400 });

  const admin = criarClienteAdmin();
  const okIds = resultados.filter((r) => r.ok).map((r) => r.id!);
  const falhas = resultados.filter((r) => !r.ok);

  if (okIds.length) {
    await admin.from("avisos").update({ status: "enviado", enviado_em: new Date().toISOString(), erro: null }).in("id", okIds).eq("status", "enviando");
  }
  if (falhas.length) {
    const { data: atuais } = await admin.from("avisos").select("id, tentativas").in("id", falhas.map((f) => f.id!)).eq("status", "enviando");
    for (const a of atuais ?? []) {
      const motivo = String(falhas.find((f) => f.id === a.id)?.erro ?? "falha no envio").slice(0, 500);
      await admin
        .from("avisos")
        .update({ status: a.tentativas >= 3 ? "falhou" : "pendente", erro: motivo })
        .eq("id", a.id)
        .eq("status", "enviando");
    }
  }
  return NextResponse.json({ enviados: okIds.length, falhas: falhas.length });
}
