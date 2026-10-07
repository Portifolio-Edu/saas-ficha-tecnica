// PRODUCAO (2026-09-24): dados da empresa usados nos Termos de uso e na
// Política de privacidade. PREENCHER antes de lançar (docs/PRODUCAO.md). Os
// textos são rascunho: um advogado precisa revisar antes de valerem.
export const EMPRESA = {
  nomeProduto: "Ficha Técnica",
  razaoSocial: process.env.NEXT_PUBLIC_EMPRESA_RAZAO_SOCIAL || "[RAZÃO SOCIAL DA EMPRESA]",
  cnpj: process.env.NEXT_PUBLIC_EMPRESA_CNPJ || "[CNPJ]",
  endereco: process.env.NEXT_PUBLIC_EMPRESA_ENDERECO || "[ENDEREÇO COMPLETO]",
  emailContato: process.env.NEXT_PUBLIC_EMPRESA_EMAIL_CONTATO || "[E-MAIL DE CONTATO]",
  emailPrivacidade: process.env.NEXT_PUBLIC_EMPRESA_EMAIL_PRIVACIDADE || "[E-MAIL DO ENCARREGADO DE DADOS (DPO)]",
  foro: process.env.NEXT_PUBLIC_EMPRESA_FORO || "[CIDADE/UF]",
};
