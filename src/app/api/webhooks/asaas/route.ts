import { NextRequest, NextResponse } from "next/server";
import { configAsaas, tokenWebhookValido } from "@/lib/assinatura/asaas";
import { processarEventoAssinatura } from "@/lib/assinatura/servico";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  let config;
  try { config = configAsaas(); } catch { return NextResponse.json({ erro: "Indisponível." }, { status: 503 }); }
  if (!config) return NextResponse.json({ erro: "Indisponível." }, { status: 503 });
  if (!tokenWebhookValido(req.headers.get("asaas-access-token"), config.token)) return NextResponse.json({ erro: "Sem acesso." }, { status: 401 });
  if (Number(req.headers.get("content-length")) > 100_000) return NextResponse.json({ erro: "Corpo muito grande." }, { status: 413 });
  const texto = await req.text();
  if (Buffer.byteLength(texto) > 100_000) return NextResponse.json({ erro: "Corpo muito grande." }, { status: 413 });
  let evento;
  try { evento = JSON.parse(texto); } catch { return NextResponse.json({ erro: "Evento inválido." }, { status: 400 }); }
  if (!evento || typeof evento.id !== "string" || evento.id.length > 200 || typeof evento.event !== "string") return NextResponse.json({ erro: "Evento inválido." }, { status: 400 });
  if (!evento.event.startsWith("PAYMENT_") && !evento.event.startsWith("SUBSCRIPTION_")) return NextResponse.json({ ok: true });
  try {
    await processarEventoAssinatura(config, evento);
    return NextResponse.json({ ok: true });
  } catch {
    // Sem payload, CNPJ, e-mail ou chaves nos logs. 503 solicita nova entrega.
    console.error("[assinatura] Falha na conciliação do webhook.");
    return NextResponse.json({ erro: "Conciliação indisponível." }, { status: 503 });
  }
}
