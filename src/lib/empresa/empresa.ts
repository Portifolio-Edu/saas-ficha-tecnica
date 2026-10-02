// CONFIGURAÇÕES (2026-10-01): dados da empresa (restaurante). Regras de
// formato iguais às do banco (migration 20261001100000_configuracoes_empresa):
// CNPJ e CEP só dígitos, UF em maiúsculas, e-mail simples, telefone com 55.
// Aqui fica a validação que o banco não faz (dígito verificador do CNPJ) e as
// mensagens que a tela mostra campo a campo.

import { normalizarTelefone, telefoneValido } from "@/lib/telefone";

export interface DadosEmpresa {
  nomeRestaurante: string;
  razaoSocial: string | null;
  cnpj: string | null;
  inscricaoEstadual: string | null;
  emailContato: string | null;
  telefoneContato: string | null;
  cep: string | null;
  logradouro: string | null;
  numero: string | null;
  complemento: string | null;
  bairro: string | null;
  cidade: string | null;
  uf: string | null;
}

export type CampoEmpresa = keyof DadosEmpresa;
export type ErrosEmpresa = Partial<Record<CampoEmpresa, string>>;

export const UFS = [
  "AC", "AL", "AM", "AP", "BA", "CE", "DF", "ES", "GO", "MA", "MG", "MS", "MT", "PA", "PB",
  "PE", "PI", "PR", "RJ", "RN", "RO", "RR", "RS", "SC", "SE", "SP", "TO",
] as const;

const soDigitos = (v: string) => v.replace(/\D/g, "");

/** CNPJ com dígitos verificadores certos (aceita com ou sem pontuação). */
export function cnpjValido(valor: string): boolean {
  const d = soDigitos(valor);
  if (d.length !== 14 || /^(\d)\1{13}$/.test(d)) return false;
  const digito = (base: string) => {
    let soma = 0;
    let peso = base.length - 7;
    for (const c of base) {
      soma += Number(c) * peso--;
      if (peso < 2) peso = 9;
    }
    const resto = soma % 11;
    return resto < 2 ? 0 : 11 - resto;
  };
  const d1 = digito(d.slice(0, 12));
  const d2 = digito(d.slice(0, 12) + d1);
  return d.endsWith(`${d1}${d2}`);
}

export function formatarCnpj(valor: string | null | undefined): string {
  const d = soDigitos(valor ?? "");
  if (d.length !== 14) return valor ?? "";
  return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8, 12)}-${d.slice(12)}`;
}

export function formatarCep(valor: string | null | undefined): string {
  const d = soDigitos(valor ?? "");
  return d.length === 8 ? `${d.slice(0, 5)}-${d.slice(5)}` : valor ?? "";
}

/** "Av. Paulista, 1000 · Bela Vista · São Paulo/SP · 01310-100" (só o que tiver). */
export function enderecoEmUmaLinha(e: Pick<DadosEmpresa, "logradouro" | "numero" | "complemento" | "bairro" | "cidade" | "uf" | "cep">): string {
  const rua = [e.logradouro, e.numero].filter(Boolean).join(", ");
  const ruaCompleta = [rua, e.complemento].filter(Boolean).join(" ");
  const cidade = [e.cidade, e.uf].filter(Boolean).join("/");
  return [ruaCompleta, e.bairro, cidade, e.cep ? formatarCep(e.cep) : null].filter(Boolean).join(" · ");
}

const texto = (v: FormDataEntryValue | null) => {
  const t = String(v ?? "").trim().replace(/\s+/g, " ");
  return t.length ? t : null;
};

/** Lê e valida o formulário da empresa. Devolve os dados prontos pro banco ou os erros por campo. */
export function lerEmpresa(form: FormData): { dados: DadosEmpresa; erros: ErrosEmpresa } {
  const erros: ErrosEmpresa = {};
  const nomeRestaurante = texto(form.get("nomeRestaurante")) ?? "";
  if (nomeRestaurante.length < 2 || nomeRestaurante.length > 80) erros.nomeRestaurante = "Use de 2 a 80 caracteres.";

  const razaoSocial = texto(form.get("razaoSocial"));
  if (razaoSocial && (razaoSocial.length < 2 || razaoSocial.length > 120)) erros.razaoSocial = "Use de 2 a 120 caracteres.";

  const cnpjBruto = texto(form.get("cnpj"));
  const cnpj = cnpjBruto ? soDigitos(cnpjBruto) : null;
  if (cnpjBruto && !cnpjValido(cnpjBruto)) erros.cnpj = "CNPJ inválido. Confira os 14 números.";

  const ieBruta = texto(form.get("inscricaoEstadual"));
  let inscricaoEstadual: string | null = null;
  if (ieBruta) {
    inscricaoEstadual = /^isent[oa]$/i.test(ieBruta) ? "ISENTO" : soDigitos(ieBruta);
    if (inscricaoEstadual !== "ISENTO" && (inscricaoEstadual.length < 2 || inscricaoEstadual.length > 14)) {
      erros.inscricaoEstadual = "Só números (até 14) ou ISENTO.";
    }
  }

  const emailContato = texto(form.get("emailContato"))?.toLowerCase() ?? null;
  if (emailContato && (emailContato.length > 160 || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(emailContato))) {
    erros.emailContato = "E-mail inválido.";
  }

  const telBruto = texto(form.get("telefoneContato"));
  const telefoneContato = telBruto ? normalizarTelefone(telBruto) : null;
  if (telBruto && !telefoneValido(telBruto)) erros.telefoneContato = "Telefone com DDD, ex.: (11) 3333-4444.";

  const cepBruto = texto(form.get("cep"));
  const cep = cepBruto ? soDigitos(cepBruto) : null;
  if (cep && cep.length !== 8) erros.cep = "CEP com 8 números.";

  const ufBruta = texto(form.get("uf"))?.toUpperCase() ?? null;
  const uf = ufBruta && (UFS as readonly string[]).includes(ufBruta) ? ufBruta : null;
  if (ufBruta && !uf) erros.uf = "Escolha o estado.";

  const limite = (campo: CampoEmpresa, max: number) => {
    const v = texto(form.get(campo));
    if (v && v.length > max) erros[campo] = `Até ${max} caracteres.`;
    return v;
  };

  return {
    dados: {
      nomeRestaurante,
      razaoSocial,
      cnpj,
      inscricaoEstadual,
      emailContato,
      telefoneContato,
      cep,
      logradouro: limite("logradouro", 120),
      numero: limite("numero", 20),
      complemento: limite("complemento", 60),
      bairro: limite("bairro", 60),
      cidade: limite("cidade", 60),
      uf,
    },
    erros,
  };
}

/** Quanto do cadastro da empresa está preenchido (pros avisos de "complete o cadastro"). */
export function camposFaltando(e: DadosEmpresa): string[] {
  const faltam: string[] = [];
  if (!e.razaoSocial) faltam.push("razão social");
  if (!e.cnpj) faltam.push("CNPJ");
  if (!e.cep || !e.logradouro || !e.cidade || !e.uf) faltam.push("endereço");
  return faltam;
}
