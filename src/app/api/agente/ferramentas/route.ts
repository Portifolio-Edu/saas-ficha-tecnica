import { NextResponse, type NextRequest } from "next/server";
import { getClienteAtual } from "@/lib/dados/cliente";
import { comoUsuario } from "@/lib/agente/comoUsuario";
import { chaveN8nConfere, verificarPasse } from "@/lib/agente/passe";
import { configAgente } from "@/lib/agente/config";
import { ErroFerramenta, FERRAMENTAS, catalogo } from "@/lib/agente/ferramentas";
import { registrarErro } from "@/lib/monitoramento";

// AGENTE IA (2026-09-26): o n8n chama as ferramentas aqui.
//   POST { ferramenta, argumentos } com "Authorization: Bearer <passe>".
// O passe diz quem está falando; a ferramenta roda COMO essa pessoa (RLS).
// O papel e o restaurante são conferidos de novo no banco (a pessoa pode ter
// sido desativada ou mudado de papel depois que o passe saiu).
// Erro de uso (argumento faltando, item não achado) volta com 200 e
// { ok: false, erro } pro agente ler e corrigir; passe inválido volta 401.
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(req: NextRequest) {
  if (!chaveN8nConfere(req.headers.get("x-ft-chave"), configAgente().chaveN8n)) return NextResponse.json({ erro: "Não autorizado." }, { status: 401 });
  return NextResponse.json({ ferramentas: catalogo() });
}

export async function POST(req: NextRequest) {
  const passe = verificarPasse(req.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? null, configAgente().segredo);
  if (!passe) return NextResponse.json({ ok: false, erro: "Passe inválido ou vencido." }, { status: 401 });

  let corpo: { ferramenta?: unknown; argumentos?: unknown };
  try {
    corpo = await req.json();
  } catch {
    return NextResponse.json({ ok: false, erro: "Corpo precisa ser JSON." }, { status: 400 });
  }
  const nome = String(corpo.ferramenta ?? "");
  const ferramenta = FERRAMENTAS[nome];
  if (!ferramenta) return NextResponse.json({ ok: false, erro: `Ferramenta "${nome}" não existe.` });
  let argumentos = corpo.argumentos ?? {};
  if (typeof argumentos === "string") {
    try {
      argumentos = JSON.parse(argumentos || "{}");
    } catch {
      argumentos = {};
    }
  }

  try {
    const dados = await comoUsuario(passe.u, async () => {
      const atual = await getClienteAtual();
      if (!atual || atual.id !== passe.c) throw new ErroFerramenta("Essa pessoa não tem mais acesso a este restaurante.");
      if (!ferramenta.papeis.includes(atual.papel)) throw new ErroFerramenta(`O papel ${atual.papel} não pode usar "${nome}".`);
      return ferramenta.executar(argumentos as Record<string, unknown>, { ...passe, p: atual.papel });
    });
    return NextResponse.json({ ok: true, dados });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Erro desconhecido.";
    if (!(e instanceof ErroFerramenta)) void registrarErro({ origem: "servidor", rota: `/api/agente/ferramentas/${nome}`, metodo: "POST", erro: e, clienteId: passe.c, userId: passe.u }).catch(() => {});
    return NextResponse.json({ ok: false, erro: msg });
  }
}
