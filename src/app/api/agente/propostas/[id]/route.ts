import { NextResponse, type NextRequest } from "next/server";
import { getClienteAtual } from "@/lib/dados/cliente";
import { cancelarProposta, confirmarProposta } from "@/lib/agente/propostas";
import { PAPEIS_DO_AGENTE } from "@/lib/agente/pessoa";
import type { PasseAgente } from "@/lib/agente/passe";

// AGENTE IA (2026-09-26): botões Confirmar/Cancelar da proposta, na tela.
// Roda com a sessão (cookie) da própria pessoa — mesma RLS.
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const cliente = await getClienteAtual();
  if (!cliente || !PAPEIS_DO_AGENTE.includes(cliente.papel)) return NextResponse.json({ erro: "Sem acesso." }, { status: 401 });
  const { id } = await params;
  const { acao } = (await req.json().catch(() => ({}))) as { acao?: string };
  const passe: PasseAgente = { v: 1, u: cliente.userId, c: cliente.id, p: cliente.papel, n: cliente.nomeMembro, r: cliente.nomeRestaurante, canal: "web", exp: 0 };
  try {
    const resultado = acao === "confirmar" ? await confirmarProposta(passe, id) : acao === "cancelar" ? await cancelarProposta(passe, id) : null;
    if (resultado === null) return NextResponse.json({ erro: "Ação inválida." }, { status: 400 });
    return NextResponse.json({ resultado });
  } catch (e) {
    return NextResponse.json({ erro: e instanceof Error ? e.message : "Erro desconhecido." }, { status: 400 });
  }
}
