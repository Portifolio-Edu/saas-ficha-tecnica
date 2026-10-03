"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ficha/Card";
import type { CanalVendaConfig, DadosRestaurante } from "@/lib/dominio/configuracoes";
import type { Turno } from "@/lib/dominio/producao";
import { DadosDaConta } from "./DadosDaConta";
import { RestauranteForm } from "./RestauranteForm";
import { CanaisVenda } from "./CanaisVenda";
import { TurnosConfig } from "./TurnosConfig";
import type { AcoesConfiguracoes } from "./tipos";

type Preferencia = "light" | "dark" | "system";

function aplicarTema(pref: Preferencia) {
  const resolvido =
    pref === "system"
      ? window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light"
      : pref;
  document.documentElement.setAttribute("data-theme", resolvido);
}

const OPCOES: { valor: Preferencia; label: string }[] = [
  { valor: "light", label: "Claro" },
  { valor: "dark", label: "Escuro" },
  { valor: "system", label: "Sistema" },
];

// CONFIGURAÇÕES (2026-10-03): a tela deixou de ser só Tema e Seus dados. Agora
// tem os dados do restaurante e a margem alvo padrão, os canais de venda
// (comissão e embalagem) e os turnos. Versão anterior (só tema e LGPD):
// `git show 4edfd3f:src/components/configuracoes/ConfiguracoesClient.tsx`.
//
// `nomeRestaurante` só vem pro dono (LGPD: baixar e excluir os dados).
// `acoes` são as server actions no sistema e funções da demo em /preview.
export function ConfiguracoesClient({
  nomeRestaurante,
  restaurante,
  canais,
  turnos,
  acoes,
}: {
  nomeRestaurante?: string;
  restaurante: DadosRestaurante;
  canais: CanalVendaConfig[];
  turnos: Turno[];
  acoes: AcoesConfiguracoes;
}) {
  const [preferencia, setPreferencia] = useState<Preferencia>("system");

  useEffect(() => {
    const salvo = localStorage.getItem("tema");
    setPreferencia(salvo === "light" || salvo === "dark" ? salvo : "system");
  }, []);

  useEffect(() => {
    aplicarTema(preferencia);
    if (preferencia === "system") {
      const mq = window.matchMedia("(prefers-color-scheme: dark)");
      const listener = () => aplicarTema("system");
      mq.addEventListener("change", listener);
      return () => mq.removeEventListener("change", listener);
    }
  }, [preferencia]);

  const escolher = (valor: Preferencia) => {
    setPreferencia(valor);
    if (valor === "system") {
      localStorage.removeItem("tema");
    } else {
      localStorage.setItem("tema", valor);
    }
  };

  return (
    <div className="max-w-3xl space-y-6 pb-12">
      <div>
        <h2 className="text-[22px] font-semibold tracking-tight text-[var(--tinta)]">Configurações</h2>
        <p className="text-[14px] text-[var(--tinta-sub)] mt-1">Dados da casa, canais de venda e turnos. O que muda aqui vale pro sistema inteiro.</p>
      </div>

      <RestauranteForm key={`${restaurante.nomeRestaurante}|${restaurante.nome}|${restaurante.cnpj}|${restaurante.margemAlvo}`} restaurante={restaurante} acoes={acoes} />
      <CanaisVenda canais={canais} acoes={acoes} />
      <TurnosConfig turnos={turnos} acoes={acoes} />

      <Card className="p-5">
        <h2 className="text-[16px] font-semibold text-[var(--tinta)] mb-1">Tema</h2>
        <p className="text-[13px] mb-4 text-[var(--tinta-sub)]">
          Escolha o tema do app, só neste aparelho. &quot;Sistema&quot; segue a preferência do seu navegador.
        </p>
        <div className="flex flex-wrap gap-2" role="group" aria-label="Tema">
          {OPCOES.map((o) => (
            <button
              key={o.valor}
              onClick={() => escolher(o.valor)}
              aria-pressed={preferencia === o.valor}
              className="text-[13px] font-medium px-4 min-h-10 rounded-lg"
              style={{
                background: preferencia === o.valor ? "var(--text)" : "var(--panel)",
                color: preferencia === o.valor ? "var(--panel)" : "var(--text)",
                border: `1px solid ${preferencia === o.valor ? "var(--text)" : "var(--border-strong)"}`,
              }}
            >
              {o.label}
            </button>
          ))}
        </div>
      </Card>
      {nomeRestaurante && <DadosDaConta nomeRestaurante={nomeRestaurante} />}
    </div>
  );
}
