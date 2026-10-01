import { NextResponse, type NextRequest } from "next/server";
import { configAgente } from "@/lib/agente/config";
import { verificarPasse } from "@/lib/agente/passe";

// AGENTE IA (2026-09-26): o n8n confere aqui o passe que chegou no webhook do
// chat antes de gastar IA. Quem não tem passe válido (assinado por este app e
// no prazo) recebe 401 e o workflow para. Não devolve nada além do básico.
// Assim o webhook do chat não precisa de segredo guardado no n8n.
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const passe = verificarPasse(req.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? null, configAgente().segredo);
  if (!passe) return NextResponse.json({ ok: false, erro: "Passe inválido ou vencido." }, { status: 401 });
  return NextResponse.json({ ok: true, canal: passe.canal, papel: passe.p, expira: passe.exp });
}
