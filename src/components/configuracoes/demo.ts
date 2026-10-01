// CONFIGURAÇÕES (2026-10-01): a tela na demonstração (/preview). Mesmas
// regras de validação do app (lerEmpresa, cores), mas grava no navegador
// (localStorage "demo:configuracoes"). Logo e cor também mudam o menu da demo
// (DemoShell escuta o evento EVENTO_MARCA_DEMO).

import type { Configuracoes } from "@/lib/dados/configuracoes";
import { lerEmpresa } from "@/lib/empresa/empresa";
import { CORES_DESTAQUE } from "@/lib/empresa/cores";
import { normalizarTelefone, telefoneValido } from "@/lib/telefone";
import type { AcoesConfiguracoes } from "./contexto";

const CHAVE = "demo:configuracoes";
export const EVENTO_MARCA_DEMO = "demo:marca";

type Salvo = Partial<Omit<Configuracoes, "conta">> & { conta?: Partial<Configuracoes["conta"]> };

function ler(): Salvo {
  try {
    return JSON.parse(localStorage.getItem(CHAVE) ?? "{}") as Salvo;
  } catch {
    return {};
  }
}

function gravar(mudanca: Salvo): boolean {
  try {
    const atual = ler();
    localStorage.setItem(CHAVE, JSON.stringify({ ...atual, ...mudanca, conta: { ...atual.conta, ...mudanca.conta } }));
    return true;
  } catch {
    return false;
  }
}

/** Dados da demo com o que a pessoa mudou por cima. */
export function configuracoesDemo(base: Configuracoes): Configuracoes {
  const s = ler();
  return { ...base, ...s, empresa: { ...base.empresa, ...s.empresa }, conta: { ...base.conta, ...s.conta } };
}

/** Logo e cor da demo, pro menu. */
export function marcaDemo(): { logoUrl: string | null; corDestaque: string | null } {
  const s = ler();
  return { logoUrl: s.logoUrl ?? null, corDestaque: s.corDestaque ?? null };
}

const avisarMarca = () => window.dispatchEvent(new Event(EVENTO_MARCA_DEMO));
const ok = (sucesso: string) => ({ ok: Date.now(), sucesso });
const SEM_ESPACO = { erro: "O navegador não deixou guardar (modo anônimo ou sem espaço)." };
const espera = () => new Promise((r) => setTimeout(r, 250));

function arquivoParaUrl(arquivo: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const leitor = new FileReader();
    leitor.onload = () => resolve(String(leitor.result));
    leitor.onerror = () => reject(leitor.error);
    leitor.readAsDataURL(arquivo);
  });
}

export const acoesDemo: AcoesConfiguracoes = {
  async salvarEmpresa(_e, form) {
    await espera();
    const { dados, erros } = lerEmpresa(form);
    if (Object.keys(erros).length) return { erros: erros as Record<string, string>, erro: "Confira os campos marcados." };
    return gravar({ empresa: dados }) ? ok("Dados do restaurante salvos.") : SEM_ESPACO;
  },
  async buscarCep(cep) {
    const d = cep.replace(/\D/g, "");
    if (d.length !== 8) return { erro: "CEP com 8 números." };
    // Sem consulta de verdade na demo: um endereço fixo pra mostrar o preenchimento.
    await espera();
    return { logradouro: "Rua Augusta", bairro: "Consolação", cidade: "São Paulo", uf: "SP" };
  },
  async enviarLogo(_e, form) {
    const arquivo = form.get("logo");
    if (!(arquivo instanceof File) || arquivo.size === 0) return { erro: "Escolha uma imagem." };
    if (!["image/png", "image/jpeg", "image/webp"].includes(arquivo.type)) return { erro: "Use PNG, JPG ou WebP." };
    // Menor que no app (2 MB): o navegador guarda pouco.
    if (arquivo.size > 1024 * 1024) return { erro: "Na demonstração, use uma imagem de até 1 MB." };
    const logoUrl = await arquivoParaUrl(arquivo);
    if (!gravar({ logoUrl })) return SEM_ESPACO;
    avisarMarca();
    return ok("Logo atualizado.");
  },
  async removerLogo() {
    gravar({ logoUrl: null });
    avisarMarca();
    return ok("Logo removido.");
  },
  async salvarCor(id) {
    const cor = CORES_DESTAQUE.find((c) => c.id === id);
    if (!cor) return { erro: "Escolha uma das cores." };
    gravar({ corDestaque: cor.claro });
    avisarMarca();
    return ok(`Cor de destaque: ${cor.nome.toLowerCase()}.`);
  },
  async salvarMeta(_e, form) {
    await espera();
    const pct = Number(String(form.get("meta") ?? "").replace(",", "."));
    if (!Number.isFinite(pct) || pct < 1 || pct > 95) return { erros: { meta: "Entre 1% e 95%." } };
    return gravar({ margemAlvo: Math.round(pct * 10) / 1000 }) ? ok("Meta de margem salva.") : SEM_ESPACO;
  },
  async salvarMeuNome(_e, form) {
    await espera();
    const nome = String(form.get("nome") ?? "").trim().replace(/\s+/g, " ");
    if (nome.length < 2 || nome.length > 80) return { erros: { nome: "Use de 2 a 80 caracteres." } };
    return gravar({ conta: { nome } }) ? ok("Nome salvo.") : SEM_ESPACO;
  },
  async salvarWhatsappDono(_e, form) {
    await espera();
    const bruto = String(form.get("whatsapp") ?? "");
    if (!telefoneValido(bruto)) return { erros: { whatsapp: "Número com DDD, ex.: (11) 98765-4321." } };
    return gravar({ telefoneDono: normalizarTelefone(bruto) }) ? ok("WhatsApp salvo.") : SEM_ESPACO;
  },
  async trocarEmail(_e, form) {
    await espera();
    const email = String(form.get("email") ?? "").trim().toLowerCase();
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return { erros: { email: "E-mail inválido." } };
    gravar({ conta: { emailPendente: email } });
    return ok(`Na conta de verdade, chegaria um link em ${email}. O e-mail só muda depois de abrir o link.`);
  },
  async trocarSenha(_e, form) {
    await espera();
    const nova = String(form.get("senhaNova") ?? "");
    const erros: Record<string, string> = {};
    if (!form.get("senhaAtual")) erros.senhaAtual = "Digite a senha atual.";
    if (nova.length < 8) erros.senhaNova = "Pelo menos 8 caracteres.";
    if (form.get("senhaConfirmacao") !== nova) erros.senhaConfirmacao = "As duas senhas não são iguais.";
    if (Object.keys(erros).length) return { erros };
    return ok("Na demonstração a senha não muda, mas o caminho é este.");
  },
  async sairDeTodos() {
    window.location.href = "/preview";
  },
};
