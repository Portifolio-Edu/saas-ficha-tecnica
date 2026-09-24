import { headers } from "next/headers";

// PRODUCAO (2026-09-24): endereço público do site, usado nos links dos e-mails
// do Supabase (confirmação de cadastro e recuperação de senha). Em produção vale
// NEXT_PUBLIC_SITE_URL; nas prévias da Vercel, o próprio host da requisição, pra
// o link voltar pra mesma prévia.
export async function origemDoSite(): Promise<string> {
  const fixa = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "");
  if (fixa) return fixa;
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const protocolo = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return `${protocolo}://${host}`;
}
