import { NextResponse, type NextRequest } from "next/server";
import { validarRelato } from "@/lib/desempenho/toqueLento";

// DESEMPENHO (2026-10-02): recebe do navegador o relato de toque lento
// (src/components/ficha/MedidorToque.tsx) e grava no log do servidor — na
// Vercel: projeto → Logs, filtre por "toque-lento". Não grava no banco (nada
// de dado da pessoa: só a tela, o elemento e os scripts) e só aceita do
// próprio site. Ver docs/DESEMPENHO.md.
export const dynamic = "force-dynamic";

const MAX_BYTES = 4096;

export async function POST(req: NextRequest) {
  // Do próprio site: o navegador diz (sec-fetch-site) e a origem bate com o
  // host pedido. Não usar req.nextUrl.origin: atrás de proxy/`next start -H`
  // ele vira "localhost" e recusaria o próprio site.
  const site = req.headers.get("sec-fetch-site");
  const origem = req.headers.get("origin");
  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host");
  let mesmoHost = true;
  if (origem) {
    try {
      mesmoHost = new URL(origem).host === host;
    } catch {
      mesmoHost = false;
    }
  }
  if ((site && site !== "same-origin") || !mesmoHost) return new NextResponse(null, { status: 403 });

  const texto = await req.text().catch(() => "");
  if (!texto || texto.length > MAX_BYTES) return new NextResponse(null, { status: 400 });
  let corpo: unknown;
  try {
    corpo = JSON.parse(texto);
  } catch {
    return new NextResponse(null, { status: 400 });
  }
  const relato = validarRelato(corpo);
  if (!relato) return new NextResponse(null, { status: 400 });

  console.warn(
    JSON.stringify({
      tipo: "toque-lento",
      ambiente: process.env.VERCEL_ENV ?? process.env.NODE_ENV,
      navegador: (req.headers.get("user-agent") ?? "").slice(0, 160),
      ...relato,
    }),
  );
  return new NextResponse(null, { status: 204 });
}
