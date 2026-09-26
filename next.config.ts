import path from "node:path";
import type { NextConfig } from "next";

// PLANO 9,5 (2026-09-26): cabeçalhos de segurança em todas as páginas (antes
// não havia nenhum). O principal: nenhum site de fora consegue abrir o sistema
// dentro de um quadro (iframe) pra enganar o clique de quem está logado.
// A CSP aqui é a parte que não quebra nada (quadros, <base>, formulários,
// plugins); scripts e estilos ficam sem restrição porque o Next injeta
// scripts inline — restringir exige nonce por requisição.
// Reverter: tirar a função headers().
const CABECALHOS = [
  { key: "Content-Security-Policy", value: "frame-ancestors 'none'; base-uri 'self'; form-action 'self'; object-src 'none'" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(self), microphone=(), geolocation=(), payment=(), usb=()" },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
];

// CELULAR (2026-09-26): o link só de consulta leva o código no endereço.
// Sem referer (o código não vaza pra site de fora ao abrir uma foto), sem
// cache e fora dos buscadores.
const CABECALHOS_CONSULTA = [
  { key: "Referrer-Policy", value: "no-referrer" },
  { key: "Cache-Control", value: "private, no-store" },
  { key: "X-Robots-Tag", value: "noindex, nofollow" },
];

const nextConfig: NextConfig = {
  outputFileTracingRoot: path.resolve(__dirname),
  poweredByHeader: false,
  async headers() {
    return [
      { source: "/:path*", headers: CABECALHOS },
      { source: "/consulta/:path*", headers: CABECALHOS_CONSULTA },
    ];
  },
};

export default nextConfig;
