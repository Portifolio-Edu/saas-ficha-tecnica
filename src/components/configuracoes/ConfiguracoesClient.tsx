"use client";

// CONFIGURAÇÕES (2026-10-01): a tela ganhou seções — Restaurante, Minha conta,
// Aparência, Plano e Seus dados — cada papel vê as suas (SECOES). Antes era
// só o cartão de tema e o LGPD. A seção aberta fica no endereço (?secao=),
// pra o link do e-mail e o menu da conta abrirem direto nela.
// No computador as seções ficam numa coluna à esquerda; no celular, num
// seletor no topo. Versão anterior: `git show 4edfd3f:src/components/configuracoes/ConfiguracoesClient.tsx`.
// DESEMPENHO (2026-10-02): trocar de seção travava o toque (580 ms na barra
// da Vercel): a seção nova era montada dentro do clique. Agora o menu marca a
// seção na hora e o conteúdo vem logo depois (useDeferredValue); seção já
// aberta fica montada e guardada (content-visibility, como no modo cozinha),
// então voltar a ela é instantâneo e o que foi digitado não se perde.
// Pra voltar: um só <div key={secao.id}> com a seção escolhida.

import { memo, useCallback, useDeferredValue, useEffect, useMemo, useState } from "react";
import { BellRing, Building2, CreditCard, Database, Palette, UserRound } from "lucide-react";
import { Contexto, type ContextoConfiguracoes } from "./contexto";
import { acoesApp } from "./acoesApp";
import { acoesDemo, configuracoesDemo } from "./demo";
import { SecaoRestaurante } from "./SecaoRestaurante";
import { SecaoConta } from "./SecaoConta";
import { SecaoAparencia } from "./SecaoAparencia";
import { SecaoPlano } from "./SecaoPlano";
import { SecaoAvisos } from "./SecaoAvisos";
import { DadosDaConta } from "./DadosDaConta";
import { usePapelDemo } from "@/components/ficha/PapelDemo";
import { ehGestao, type Papel } from "@/lib/auth/papeis";
import type { Configuracoes } from "@/lib/dados/configuracoes";

export type IdSecao = "restaurante" | "avisos" | "conta" | "aparencia" | "plano" | "dados";

const SECOES: { id: IdSecao; rotulo: string; icone: typeof Building2; pode: (p: Papel) => boolean }[] = [
  { id: "restaurante", rotulo: "Restaurante", icone: Building2, pode: ehGestao },
  // AVISOS NO WHATSAPP (2026-10-02)
  { id: "avisos", rotulo: "Avisos no WhatsApp", icone: BellRing, pode: ehGestao },
  { id: "conta", rotulo: "Minha conta", icone: UserRound, pode: () => true },
  { id: "aparencia", rotulo: "Aparência", icone: Palette, pode: () => true },
  { id: "plano", rotulo: "Plano", icone: CreditCard, pode: (p) => p === "dono" },
  { id: "dados", rotulo: "Seus dados", icone: Database, pode: (p) => p === "dono" },
];

export function ConfiguracoesClient({
  dados,
  papel: papelApp,
  secaoInicial,
  demo = false,
}: {
  dados: Configuracoes;
  /** Papel de quem está logado. Na demo vem do "Ver como". */
  papel?: Papel;
  secaoInicial?: string;
  demo?: boolean;
}) {
  const papelDemo = usePapelDemo().papel;
  const papel = demo ? papelDemo : (papelApp ?? "dono");

  const [dadosDemo, setDadosDemo] = useState(dados);
  const recarregar = useCallback(() => {
    if (demo) setDadosDemo(configuracoesDemo(dados));
  }, [demo, dados]);
  useEffect(recarregar, [recarregar]);

  const visiveis = SECOES.filter((s) => s.pode(papel));
  const [escolhida, setEscolhida] = useState<string | undefined>(secaoInicial);
  const secao = visiveis.find((s) => s.id === escolhida) ?? visiveis[0];
  const conteudo = useDeferredValue(secao.id);
  const [montadas, setMontadas] = useState<IdSecao[]>([secao.id]);
  if (!montadas.includes(conteudo)) setMontadas([...montadas, conteudo]);

  const abrir = (id: IdSecao) => {
    setEscolhida(id);
    const url = new URL(window.location.href);
    url.searchParams.set("secao", id);
    window.history.replaceState(null, "", url);
  };

  const contexto: ContextoConfiguracoes = useMemo(
    () => ({ dados: demo ? dadosDemo : dados, papel, acoes: demo ? acoesDemo : acoesApp, demo, recarregar }),
    [demo, dadosDemo, dados, papel, recarregar],
  );

  return (
    <Contexto.Provider value={contexto}>
      <div className="max-w-5xl md:grid md:grid-cols-[13rem_minmax(0,1fr)] md:gap-8">
        {/* Celular: seletor */}
        <div className="md:hidden mb-4">
          <label htmlFor="secao-config" className="block text-[12.5px] font-medium text-[var(--tinta-sub)] mb-1.5">
            Seção
          </label>
          <select
            id="secao-config"
            value={secao.id}
            onChange={(e) => abrir(e.target.value as IdSecao)}
            className="w-full min-h-11 rounded-lg px-3 text-[15px] border bg-[var(--panel)] text-[var(--tinta)]"
            style={{ borderColor: "var(--linha-forte)" }}
          >
            {visiveis.map((s) => (
              <option key={s.id} value={s.id}>
                {s.rotulo}
              </option>
            ))}
          </select>
        </div>

        {/* Computador: coluna */}
        <nav aria-label="Seções das configurações" className="hidden md:block">
          <ul className="sticky top-20 space-y-0.5">
            {visiveis.map((s) => {
              const ativa = s.id === secao.id;
              const Icone = s.icone;
              return (
                <li key={s.id}>
                  <a
                    href={`?secao=${s.id}`}
                    onClick={(e) => {
                      e.preventDefault();
                      abrir(s.id);
                    }}
                    aria-current={ativa ? "page" : undefined}
                    className={`flex items-center gap-2.5 px-2.5 min-h-10 rounded-lg text-[14px] transition-colors ${ativa ? "font-medium" : "hover:bg-[var(--panel-hover)]"}`}
                    style={{ color: ativa ? "var(--tinta)" : "var(--tinta-sub)", background: ativa ? "var(--panel-elevated)" : undefined }}
                  >
                    <Icone size={16} strokeWidth={1.8} aria-hidden style={{ color: ativa ? "var(--marca)" : "var(--tinta-faint)" }} />
                    {s.rotulo}
                  </a>
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="min-w-0 max-w-2xl" aria-busy={conteudo !== secao.id || undefined}>
          {montadas
            .filter((id) => visiveis.some((v) => v.id === id))
            .map((id) => {
              const aberta = id === conteudo;
              return (
                <div key={id} className={aberta ? undefined : "secao-guardada"} aria-hidden={aberta ? undefined : true} inert={!aberta}>
                  <ConteudoSecao id={id} demo={demo} nomeRestaurante={contexto.dados.empresa.nomeRestaurante} />
                </div>
              );
            })}
        </div>
      </div>
    </Contexto.Provider>
  );
}

/** Memo: marcar a seção no menu não redesenha as seções montadas. */
const ConteudoSecao = memo(function ConteudoSecao({ id, demo, nomeRestaurante }: { id: IdSecao; demo: boolean; nomeRestaurante: string }) {
  if (id === "restaurante") return <SecaoRestaurante />;
  if (id === "avisos") return <SecaoAvisos />;
  if (id === "conta") return <SecaoConta />;
  if (id === "aparencia") return <SecaoAparencia />;
  if (id === "plano") return <SecaoPlano />;
  return demo ? (
    <p className="text-[13.5px] text-[var(--tinta-sub)]">Na demonstração não há dados para baixar nem excluir.</p>
  ) : (
    <DadosDaConta nomeRestaurante={nomeRestaurante} />
  );
});
