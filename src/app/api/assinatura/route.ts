import { NextRequest, NextResponse } from "next/server";
import { getClienteAtual } from "@/lib/dados/cliente";
import { configAsaas } from "@/lib/assinatura/asaas";
import { atualizarAssinatura, exigirCobranca, iniciarAssinatura, lerAssinatura, consultarOferta } from "@/lib/assinatura/servico";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  const cliente = await getClienteAtual();
  if (!cliente) return NextResponse.json({ erro: "Sessão expirada." }, { status: 401 });
  if (cliente.papel !== "dono") return NextResponse.json({ erro: "Só o dono pode consultar a assinatura." }, { status: 403 });
  try {
    const config = configAsaas();
    if (!config) return NextResponse.json({ disponivel: false });
    const [registro, oferta] = await Promise.all([lerAssinatura(cliente.id, config), consultarOferta(cliente.id, config)]);
    return NextResponse.json({ oferta, disponivel: true, teste: config.ambiente === "sandbox", valorCentavos: registro && registro.estado !== "cancelada" ? Number(registro.valor_centavos) : Number(oferta.valor_centavos), estado: registro?.estado ?? null, faturaUrl: registro?.fatura_url ?? null }, { headers: { "Cache-Control": "no-store" } });
  } catch { return NextResponse.json({ erro: "Não foi possível consultar a assinatura. Fale com o suporte." }, { status: 503 }); }
}

export async function POST(req: NextRequest) {
  const cliente = await getClienteAtual();
  if (!cliente) return NextResponse.json({ erro: "Sessão expirada." }, { status: 401 });
  if (cliente.papel !== "dono") return NextResponse.json({ erro: "Só o dono pode alterar a assinatura." }, { status: 403 });
  // Requisições do próprio site, além da sessão, inclusive em prévias.
  if (req.headers.get("origin") !== req.nextUrl.origin) return NextResponse.json({ erro: "Origem inválida." }, { status: 403 });
  const corpo = await req.json().catch(() => null) as { acao?: unknown; confirmar?: unknown; valorAceitoCentavos?: unknown } | null;
  if (!corpo || !["assinar", "atualizar", "cancelar"].includes(String(corpo.acao))) return NextResponse.json({ erro: "Ação inválida." }, { status: 400 });
  if (corpo.acao === "cancelar" && corpo.confirmar !== true) return NextResponse.json({ erro: "Confirme o cancelamento da recorrência." }, { status: 400 });
  try {
    const config = exigirCobranca();
    if (corpo.acao === "assinar" && (typeof corpo.valorAceitoCentavos !== "number" || !Number.isSafeInteger(corpo.valorAceitoCentavos))) return NextResponse.json({ erro: "O preço mudou. Reabra a seção Plano para conferir antes de assinar." }, { status: 409 });
    if (corpo.acao === "assinar") await iniciarAssinatura(cliente, config, corpo.valorAceitoCentavos as number);
    else await atualizarAssinatura(cliente.id, config, corpo.acao === "cancelar");
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ erro: e instanceof Error ? e.message : "Não foi possível confirmar a cobrança." }, { status: 409 });
  }
}
