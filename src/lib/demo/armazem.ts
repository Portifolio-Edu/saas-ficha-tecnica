"use client";

// DEMO (2026-09-25): o "banco" da demonstração (/preview). Cada tela da demo
// grava no localStorage do navegador e as outras leem das mesmas chaves, pra
// o que a cozinha registra aparecer no painel do gestor (e vice-versa), como
// acontece no sistema de verdade pelo Supabase. As chaves demo_producoes,
// demo_estoque e demo_movimentacoes já existiam (Produções, Estoque, agente
// IA); checklists, temperaturas e contagens entram agora.
// gravarDemo avisa as outras telas abertas na mesma aba com um StorageEvent
// sintético (o evento nativo só dispara entre abas diferentes).
// Recomeçar a demo: limparDemo() (botão no índice /preview).

import { useEffect, useState } from "react";

export const CHAVES_DEMO = {
  producoes: "demo_producoes",
  estoque: "demo_estoque",
  movimentacoes: "demo_movimentacoes",
  checklists: "demo_checklists",
  temperaturas: "demo_temperaturas",
  contagens: "demo_contagens",
  // PROTEÍNAS (2026-09-25): lotes de proteína limpa (tablet → Manipulação de proteínas).
  processamentos: "demo_processamentos",
  // ESCALAS (2026-09-26): equipe, prontuário e regras (regras = lista de 1 item).
  escalaPessoas: "demo_escala_pessoas",
  escalaOcorrencias: "demo_escala_ocorrencias",
  escalaRegras: "demo_escala_regras",
} as const;

export type ChaveDemo = (typeof CHAVES_DEMO)[keyof typeof CHAVES_DEMO];

// Contagens podem zerar de verdade (gestor descartou todas); as outras listas
// vazias são sobra de versões antigas da demo e voltam pro padrão. O
// prontuário da escala também pode zerar (gestor apagou todas as ocorrências).
const PODE_FICAR_VAZIA: ReadonlySet<string> = new Set([CHAVES_DEMO.contagens, CHAVES_DEMO.escalaOcorrencias]);

/** Lista gravada ou, se ainda não houver (ou vier vazia), o padrão dos fixtures. */
export function lerDemo<T>(chave: ChaveDemo, padrao: T[]): T[] {
  if (typeof window === "undefined") return padrao;
  try {
    const salvo = localStorage.getItem(chave);
    if (!salvo) return padrao;
    const lista = JSON.parse(salvo);
    if (!Array.isArray(lista)) return padrao;
    return lista.length > 0 || PODE_FICAR_VAZIA.has(chave) ? (lista as T[]) : padrao;
  } catch {
    return padrao;
  }
}

export function gravarDemo<T>(chave: ChaveDemo, lista: T[]): void {
  try {
    localStorage.setItem(chave, JSON.stringify(lista));
    window.dispatchEvent(new StorageEvent("storage", { key: chave }));
  } catch {}
}

/** Lê a chave e acompanha mudanças (desta aba e de outras). `versao` muda a
 * cada gravação — dá pra usar como `key` pra remontar um componente que só lê
 * as props na montagem. */
export function useDemo<T>(chave: ChaveDemo, padrao: T[]): [T[], number] {
  const [estado, setEstado] = useState<{ lista: T[]; versao: number }>({ lista: padrao, versao: 0 });
  useEffect(() => {
    const carregar = () => setEstado((e) => ({ lista: lerDemo(chave, padrao), versao: e.versao + 1 }));
    carregar();
    const escutar = (e: StorageEvent) => {
      if (!e.key || e.key === chave) carregar();
    };
    window.addEventListener("storage", escutar);
    return () => window.removeEventListener("storage", escutar);
    // padrao vem dos fixtures (referência estável por página).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chave]);
  return [estado.lista, estado.versao];
}

export function limparDemo(): void {
  try {
    for (const chave of Object.values(CHAVES_DEMO)) localStorage.removeItem(chave);
    localStorage.removeItem("demo_valores_nutricionais");
    window.dispatchEvent(new StorageEvent("storage", { key: null }));
  } catch {}
}
