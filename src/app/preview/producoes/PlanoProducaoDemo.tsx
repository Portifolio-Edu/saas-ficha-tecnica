"use client";

// LISTA DE PRODUÇÃO (2026-09-26): a lista do dia na demo do painel. Mesmo
// "banco" da demo que o tablet (/preview/cozinha) lê.
import { useEffect, useMemo, useState } from "react";
import { PlanoProducaoGestao } from "@/components/producoes/PlanoProducaoGestao";
import { CHAVES_DEMO, useDemo } from "@/lib/demo/armazem";
import { paraVisao, planoDemoInicial, type ItemPlanoDemo } from "@/lib/demo/planoProducao";
import { hojeLocalISO } from "@/lib/calculo/dia";
import type { Producao } from "@/lib/dominio/producao";
import { porNoPlanoDemo, tirarDoPlanoDemo } from "../cozinha/acoesDemo";
import { producoes as producoesFixture, todasReceitas } from "../fixtures";

const pausa = () => new Promise((r) => setTimeout(r, 150));

export function PlanoProducaoDemo() {
  const [hoje, setHoje] = useState<string | null>(null);
  useEffect(() => setHoje(hojeLocalISO()), []);
  const base = hoje ?? "2026-01-05";
  const inicial = useMemo(() => planoDemoInicial(base, todasReceitas), [base]);
  const [planoTodo] = useDemo<ItemPlanoDemo>(CHAVES_DEMO.planoProducao, inicial);
  const [producoes] = useDemo<Producao>(CHAVES_DEMO.producoes, producoesFixture);
  if (!hoje) return null;
  const amanha = hojeLocalISO(new Date(Date.now() + 86_400_000));
  return (
    <PlanoProducaoGestao
      receitas={todasReceitas.map((r) => ({ id: r.id, nome: r.nomePrato, tipo: r.tipo === "preparo_base" ? "preparo_base" : "prato_final", rendimento: r.rendimento, unidade: r.unidadeRendimento }))}
      plano={[...paraVisao(planoTodo, hoje, "gestao"), ...paraVisao(planoTodo, amanha, "gestao")]}
      producoesHoje={producoes.filter((p) => hojeLocalISO(new Date(p.criadoEm)) === hoje)}
      hoje={hoje}
      amanha={amanha}
      acoes={{
        adicionar: async (data, receitaId, quantidade, observacao) => {
          await pausa();
          try {
            const { aviso } = porNoPlanoDemo(receitaId, quantidade, observacao, "Gil (gestor)", "gestao", data);
            return aviso ? { ok: true, aviso } : { ok: true };
          } catch (e) {
            return { ok: false, erro: e instanceof Error ? e.message : "Erro." };
          }
        },
        tirar: async (id) => {
          await pausa();
          tirarDoPlanoDemo(id, "gestao");
          return { ok: true };
        },
      }}
    />
  );
}
