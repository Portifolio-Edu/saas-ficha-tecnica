"use client";

// CONFIGURAÇÕES (2026-10-03): a mesma tela do sistema, ligada ao "banco" da
// demo (lib/demo/armazem.ts). As regras de validação são as do sistema
// (lib/dominio/configuracoes.ts); só o destino muda (localStorage em vez do
// Supabase). Canais e margem também alimentam o preço por canal em
// /preview/receitas. "Recomeçar a demo" no índice volta tudo ao padrão.

import { useMemo } from "react";
import { CHAVES_DEMO, gravarDemo, lerDemo, useDemo } from "@/lib/demo/armazem";
import { nomeJaExiste, validarCanal, validarRestaurante, validarTurno, type CanalVendaConfig, type DadosRestaurante } from "@/lib/dominio/configuracoes";
import type { Turno } from "@/lib/dominio/producao";
import { ConfiguracoesClient } from "./ConfiguracoesClient";
import type { AcoesConfiguracoes } from "./tipos";

export function ConfiguracoesDemo({ restaurante, canais, turnos }: { restaurante: DadosRestaurante; canais: CanalVendaConfig[]; turnos: Turno[] }) {
  const [restaurantes] = useDemo<DadosRestaurante>(CHAVES_DEMO.restaurante, [restaurante]);
  const [listaCanais] = useDemo<CanalVendaConfig>(CHAVES_DEMO.canais, canais);
  const [listaTurnos] = useDemo<Turno>(CHAVES_DEMO.turnosConfig, turnos);

  const acoes = useMemo<AcoesConfiguracoes>(() => {
    const canaisAtuais = () => lerDemo<CanalVendaConfig>(CHAVES_DEMO.canais, canais);
    const turnosAtuais = () => lerDemo<Turno>(CHAVES_DEMO.turnosConfig, turnos);
    return {
      async salvarRestaurante(entrada) {
        const v = validarRestaurante(entrada);
        if (!v.ok) return { ok: false, erro: v.erro };
        const atual = lerDemo<DadosRestaurante>(CHAVES_DEMO.restaurante, [restaurante])[0];
        gravarDemo(CHAVES_DEMO.restaurante, [{ ...atual, ...v.valor }]);
        return { ok: true };
      },
      async salvarCanal(id, entrada) {
        const v = validarCanal(entrada);
        if (!v.ok) return { ok: false, erro: v.erro };
        const lista = canaisAtuais();
        if (nomeJaExiste(v.valor.nomeCanal, lista.map((c) => ({ id: c.id, nome: c.nomeCanal })), id ?? undefined)) {
          return { ok: false, erro: `Já existe um canal chamado "${v.valor.nomeCanal}".` };
        }
        gravarDemo(
          CHAVES_DEMO.canais,
          id ? lista.map((c) => (c.id === id ? { ...c, ...v.valor } : c)) : [...lista, { id: `demo-canal-${Date.now()}`, ...v.valor }],
        );
        return { ok: true };
      },
      async excluirCanal(id) {
        gravarDemo(CHAVES_DEMO.canais, canaisAtuais().filter((c) => c.id !== id));
        return { ok: true };
      },
      async salvarTurno(id, entrada) {
        const v = validarTurno(entrada);
        if (!v.ok) return { ok: false, erro: v.erro };
        const lista = turnosAtuais();
        if (nomeJaExiste(v.valor.nome, lista.map((t) => ({ id: t.id, nome: t.nome })), id ?? undefined)) {
          return { ok: false, erro: `Já existe um turno chamado "${v.valor.nome}".` };
        }
        gravarDemo(
          CHAVES_DEMO.turnosConfig,
          id ? lista.map((t) => (t.id === id ? { ...t, ...v.valor } : t)) : [...lista, { id: `demo-turno-${Date.now()}`, ...v.valor }],
        );
        return { ok: true };
      },
      async excluirTurno(id) {
        const lista = turnosAtuais();
        if (lista.length <= 1) return { ok: false, erro: "O restaurante precisa de pelo menos um turno. Renomeie este em vez de excluir." };
        gravarDemo(CHAVES_DEMO.turnosConfig, lista.filter((t) => t.id !== id));
        return { ok: true };
      },
    };
  }, [restaurante, canais, turnos]);

  return <ConfiguracoesClient restaurante={restaurantes[0] ?? restaurante} canais={listaCanais} turnos={listaTurnos} acoes={acoes} />;
}
