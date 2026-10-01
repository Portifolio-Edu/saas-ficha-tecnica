"use client";

// CONFIGURAÇÕES (2026-10-01): tema (deste aparelho, qualquer papel), cor de
// destaque e meta de margem padrão (do restaurante, dono e gestor).
// O tema saiu do ConfiguracoesClient antigo sem mudar o comportamento
// (localStorage "tema"; "Sistema" segue o navegador).

import { useActionState, useEffect, useOptimistic, useState, useTransition } from "react";
import { Check, Monitor, Moon, Sun } from "lucide-react";
import { Bloco, Campo, RodapeSalvar, useAvisoDaAcao } from "./campos";
import { useConfiguracoes } from "./contexto";
import { CORES_DESTAQUE, corPorValor } from "@/lib/empresa/cores";
import { ehGestao } from "@/lib/auth/papeis";
import { useToast } from "@/components/ficha/Toast";
import type { EstadoForm } from "@/app/configuracoes/actions";

type Preferencia = "light" | "dark" | "system";

function aplicarTema(pref: Preferencia) {
  const resolvido = pref === "system" ? (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light") : pref;
  document.documentElement.setAttribute("data-theme", resolvido);
}

const TEMAS: { valor: Preferencia; rotulo: string; icone: typeof Sun }[] = [
  { valor: "light", rotulo: "Claro", icone: Sun },
  { valor: "dark", rotulo: "Escuro", icone: Moon },
  { valor: "system", rotulo: "Sistema", icone: Monitor },
];

export function SecaoAparencia() {
  const { papel } = useConfiguracoes();
  return (
    <div className="space-y-4">
      <BlocoTema />
      {ehGestao(papel) && (
        <>
          <BlocoCor />
          <BlocoMeta />
        </>
      )}
    </div>
  );
}

/** Grupo de opções em botões (role radio), com setas do teclado. */
function OpcoesEmLinha<T extends string>({
  rotulo,
  valor,
  opcoes,
  aoEscolher,
  desabilitado,
}: {
  rotulo: string;
  valor: T;
  opcoes: { valor: T; conteudo: React.ReactNode; nome: string }[];
  aoEscolher: (v: T) => void;
  desabilitado?: boolean;
}) {
  const teclas = (e: React.KeyboardEvent<HTMLDivElement>) => {
    const i = opcoes.findIndex((o) => o.valor === valor);
    const passo = e.key === "ArrowRight" || e.key === "ArrowDown" ? 1 : e.key === "ArrowLeft" || e.key === "ArrowUp" ? -1 : 0;
    if (!passo) return;
    e.preventDefault();
    const proxima = opcoes[(i + passo + opcoes.length) % opcoes.length];
    aoEscolher(proxima.valor);
    (e.currentTarget.querySelector(`[data-valor="${proxima.valor}"]`) as HTMLElement | null)?.focus();
  };
  return (
    <div role="radiogroup" aria-label={rotulo} onKeyDown={teclas} className="flex flex-wrap gap-2">
      {opcoes.map((o) => {
        const marcado = o.valor === valor;
        return (
          <button
            key={o.valor}
            type="button"
            role="radio"
            aria-checked={marcado}
            aria-label={o.nome}
            data-valor={o.valor}
            tabIndex={marcado ? 0 : -1}
            disabled={desabilitado}
            onClick={() => aoEscolher(o.valor)}
            className="inline-flex items-center gap-2 min-h-10 px-3 rounded-lg border text-[13.5px] font-medium transition-colors disabled:opacity-60"
            style={{
              borderColor: marcado ? "var(--marca)" : "var(--linha-forte)",
              background: marcado ? "var(--marca-suave)" : "var(--panel)",
              color: "var(--tinta)",
              boxShadow: marcado ? "inset 0 0 0 1px var(--marca)" : undefined,
            }}
          >
            {o.conteudo}
          </button>
        );
      })}
    </div>
  );
}

function BlocoTema() {
  const [preferencia, setPreferencia] = useState<Preferencia>("system");

  useEffect(() => {
    try {
      const salvo = localStorage.getItem("tema");
      setPreferencia(salvo === "light" || salvo === "dark" ? salvo : "system");
    } catch {}
  }, []);

  useEffect(() => {
    aplicarTema(preferencia);
    if (preferencia !== "system") return;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const ouvinte = () => aplicarTema("system");
    mq.addEventListener("change", ouvinte);
    return () => mq.removeEventListener("change", ouvinte);
  }, [preferencia]);

  const escolher = (valor: Preferencia) => {
    setPreferencia(valor);
    try {
      if (valor === "system") localStorage.removeItem("tema");
      else localStorage.setItem("tema", valor);
    } catch {}
  };

  return (
    <Bloco titulo="Tema" descricao={'Vale só neste aparelho. "Sistema" segue o claro ou escuro do celular ou computador.'}>
      <OpcoesEmLinha
        rotulo="Tema"
        valor={preferencia}
        aoEscolher={escolher}
        opcoes={TEMAS.map((t) => ({
          valor: t.valor,
          nome: t.rotulo,
          conteudo: (
            <>
              <t.icone size={15} aria-hidden /> {t.rotulo}
            </>
          ),
        }))}
      />
    </Bloco>
  );
}

function BlocoCor() {
  const { dados, acoes, recarregar } = useConfiguracoes();
  const atual = corPorValor(dados.corDestaque).id;
  const [escolhida, setEscolhida] = useOptimistic(atual);
  const [salvando, iniciar] = useTransition();
  const { mostrarErro, mostrarSucesso } = useToast();

  const escolher = (id: string) => {
    if (id === escolhida) return;
    iniciar(async () => {
      setEscolhida(id);
      const r = await acoes.salvarCor(id);
      if (r.erro) mostrarErro(r.erro);
      else {
        if (r.sucesso) mostrarSucesso(r.sucesso);
        recarregar();
      }
    });
  };

  return (
    <Bloco
      titulo="Cor de destaque"
      descricao="Muda o acento do sistema (item do menu aberto, foco, seleção) para toda a equipe. Todas as opções têm contraste conferido nos temas claro e escuro. Vermelho, laranja e verde ficam de fora: são as cores de risco, aviso e acerto."
    >
      <OpcoesEmLinha
        rotulo="Cor de destaque"
        valor={escolhida}
        aoEscolher={escolher}
        desabilitado={salvando}
        opcoes={CORES_DESTAQUE.map((c) => ({
          valor: c.id,
          nome: c.nome,
          conteudo: (
            <>
              <span
                aria-hidden
                className="amostra-cor w-4 h-4 rounded-full flex items-center justify-center"
                style={{ "--amostra-claro": c.claro, "--amostra-escuro": c.escuro } as React.CSSProperties}
              >
                {c.id === escolhida && <Check size={11} strokeWidth={3} style={{ color: "var(--panel)" }} />}
              </span>
              {c.nome}
            </>
          ),
        }))}
      />
    </Bloco>
  );
}

function BlocoMeta() {
  const { dados, acoes, recarregar } = useConfiguracoes();
  const inicial = String(Math.round(dados.margemAlvo * 1000) / 10).replace(".", ",");
  const [valor, setValor] = useState(inicial);
  const [estado, enviar, pendente] = useActionState(acoes.salvarMeta, {} as EstadoForm);
  const [erro, setErro] = useState<string>();
  useEffect(() => setValor(inicial), [inicial]);
  useEffect(() => setErro(estado.erros?.meta), [estado]);
  useAvisoDaAcao(estado, recarregar);

  return (
    <form action={enviar} noValidate>
      <Bloco
        titulo="Meta de margem"
        descricao="Margem que todo prato deveria ter. Vale para os pratos sem meta própria e marca na Visão geral quem ficou abaixo."
        rodape={<RodapeSalvar alterado={valor.replace(",", ".") !== inicial.replace(",", ".")} pendente={pendente} />}
      >
        <div className="flex items-end gap-2 max-w-[12rem]">
          <Campo
            rotulo="Meta padrão (%)"
            name="meta"
            inputMode="decimal"
            required
            value={valor}
            onChange={(e) => {
              setValor(e.target.value);
              setErro(undefined);
            }}
            erro={erro}
            className="flex-1"
          />
        </div>
      </Bloco>
    </form>
  );
}
