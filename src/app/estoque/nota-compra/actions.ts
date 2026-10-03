"use server";

// NF-e DE COMPRA (2026-10-03): ler e registrar a nota do fornecedor. O XML vai
// inteiro nas duas chamadas e o servidor refaz a conta com o cadastro do banco
// antes de gravar: o navegador só mostra a conferência, não decide quantidade
// nem preço.
import { revalidatePath } from "next/cache";
import { getClienteAtual } from "@/lib/dados/cliente";
import { listarInsumos } from "@/lib/dados/insumos";
import { listarLembrancas, notaJaImportadaEm, registrarNotaCompra, type ResultadoRegistro } from "@/lib/dados/notasCompra";
import { lerNotaDeCompra, type NotaDeCompra } from "@/lib/integracoes/documentoFiscal";
import { calcularConferencia, montarConferencia, montarRegistro, podeConfirmar, type DecisaoItem, type LinhaConferencia, type OpcoesNota } from "@/lib/integracoes/conferenciaNota";

export type ResultadoLeitura = { ok: true; nota: NotaDeCompra; linhas: LinhaConferencia[]; jaImportadaEm: string | null } | { ok: false; erro: string };
export type ResultadoImportacao = ({ ok: true } & ResultadoRegistro) | { ok: false; erro: string };

/** XML de NF-e tem dezenas de KB; 5 MB cobre nota com centenas de itens. */
const LIMITE_XML = 5_000_000;

function erroDe(e: unknown): string {
  return e instanceof Error ? e.message : "Erro desconhecido.";
}

async function conferirAcesso(): Promise<string | null> {
  const cliente = await getClienteAtual();
  if (!cliente) return "Sessão expirada. Faça login novamente.";
  if (cliente.papel === "cozinha") return "Só dono, gestor e estoquista importam nota de compra.";
  return null;
}

function lerXml(xml: unknown): NotaDeCompra | { erro: string } {
  if (typeof xml !== "string" || !xml.trim()) return { erro: "Escolha o arquivo XML da nota." };
  if (xml.length > LIMITE_XML) return { erro: "Arquivo grande demais para um XML de NF-e." };
  const nota = lerNotaDeCompra(xml);
  if ("erro" in nota) return nota;
  if (!/^\d{44}$/.test(nota.chave)) return { erro: "A nota não tem uma chave de acesso válida (44 dígitos)." };
  if (nota.itens.length === 0) return { erro: "A nota não tem itens." };
  return nota;
}

function decisoesValidas(decisoes: unknown, itens: number): decisoes is DecisaoItem[] {
  return (
    Array.isArray(decisoes) &&
    decisoes.length <= itens &&
    decisoes.every(
      (d) =>
        d &&
        Number.isInteger(d.ordem) &&
        d.ordem >= 1 &&
        d.ordem <= itens &&
        typeof d.ignorar === "boolean" &&
        (d.insumoId === null || typeof d.insumoId === "string") &&
        (d.fator === null || (typeof d.fator === "number" && Number.isFinite(d.fator))),
    )
  );
}

/** Lê a nota e devolve a conferência com as sugestões de insumo (nada é gravado). */
export async function acaoLerNotaCompra(xml: string): Promise<ResultadoLeitura> {
  const negado = await conferirAcesso();
  if (negado) return { ok: false, erro: negado };
  const nota = lerXml(xml);
  if ("erro" in nota) return { ok: false, erro: nota.erro };
  try {
    const [insumos, lembrancas, jaImportadaEm] = await Promise.all([listarInsumos(), listarLembrancas(), notaJaImportadaEm(nota.chave)]);
    return { ok: true, nota, linhas: montarConferencia(nota, insumos, lembrancas), jaImportadaEm };
  } catch (e) {
    return { ok: false, erro: erroDe(e) };
  }
}

/** Confirma a nota: entrada no estoque, preço novo dos insumos e ligações lembradas, tudo ou nada. */
export async function acaoImportarNotaCompra(xml: string, decisoes: DecisaoItem[], opcoes: OpcoesNota): Promise<ResultadoImportacao> {
  const negado = await conferirAcesso();
  if (negado) return { ok: false, erro: negado };
  const nota = lerXml(xml);
  if ("erro" in nota) return { ok: false, erro: nota.erro };
  if (!decisoesValidas(decisoes, nota.itens.length)) return { ok: false, erro: "Conferência inválida. Leia a nota de novo." };
  if (!opcoes || typeof opcoes.atualizarPrecos !== "boolean" || typeof opcoes.incluirExtras !== "boolean") return { ok: false, erro: "Opções inválidas." };
  try {
    const insumos = await listarInsumos();
    const resultado = calcularConferencia(nota, decisoes, insumos, opcoes.incluirExtras);
    const pode = podeConfirmar(resultado);
    if (!pode.ok) return { ok: false, erro: pode.motivo ?? "Confira os itens da nota." };
    const r = await registrarNotaCompra(montarRegistro(nota, decisoes, resultado, opcoes));
    // Estoque e preço mudam juntos: o custo das fichas e o CMV teórico também.
    for (const rota of ["/estoque", "/estoque/nota-compra", "/insumos", "/receitas", "/cmv", "/visao-geral"]) revalidatePath(rota);
    return { ok: true, ...r };
  } catch (e) {
    return { ok: false, erro: erroDe(e) };
  }
}
