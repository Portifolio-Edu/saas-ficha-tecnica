import path from "node:path";
import type { NextConfig } from "next";

// PLANO 9,5 (2026-09-28): cabeçalhos de segurança em todas as páginas (antes
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

const nextConfig: NextConfig = {
  outputFileTracingRoot: path.resolve(__dirname),
  poweredByHeader: false,
  async headers() {
    return [{ source: "/:path*", headers: CABECALHOS }];
  },
};

export default nextConfig;
