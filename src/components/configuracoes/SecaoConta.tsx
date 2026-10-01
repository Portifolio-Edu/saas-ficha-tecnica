"use client";

// CONFIGURAÇÕES (2026-10-01): a conta de quem está logado, em qualquer papel.
// Nome; WhatsApp e e-mail de login só pro dono (gestor e estoquista entram
// com usuário criado na tela Equipe); senha conferindo a atual; sair daqui ou
// de todos os aparelhos.

import { useActionState, useEffect, useRef, useState, useTransition } from "react";
import { LogOut, MonitorSmartphone } from "lucide-react";
import { Bloco, BotaoSecundario, Campo, RodapeSalvar, useAvisoDaAcao } from "./campos";
import { useConfiguracoes } from "./contexto";
import { formatarTelefone } from "@/lib/telefone";
import { ROTULO_PAPEL } from "@/lib/auth/papeis";
import type { EstadoForm } from "@/app/configuracoes/actions";

export function SecaoConta() {
  const { papel } = useConfiguracoes();
  return (
    <div className="space-y-4">
      <BlocoPerfil />
      {papel === "dono" && <BlocoEmail />}
      <BlocoSenha />
      <BlocoSessoes />
    </div>
  );
}

/** Um campo de texto com Salvar, pra nome e WhatsApp. */
function useCampoSimples(inicial: string, acao: (e: EstadoForm, f: FormData) => Promise<EstadoForm>) {
  const { recarregar } = useConfiguracoes();
  const [valor, setValor] = useState(inicial);
  const [estado, enviar, pendente] = useActionState(acao, {} as EstadoForm);
  const [erros, setErros] = useState<Record<string, string>>({});
  useEffect(() => setValor(inicial), [inicial]);
  useEffect(() => setErros(estado.erros ?? {}), [estado]);
  useAvisoDaAcao(estado, recarregar);
  return { valor, setValor, enviar, pendente, erros, setErros };
}

function BlocoPerfil() {
  const { dados, papel, acoes } = useConfiguracoes();
  const nome = useCampoSimples(dados.conta.nome, acoes.salvarMeuNome);
  const whats = useCampoSimples(formatarTelefone(dados.telefoneDono), acoes.salvarWhatsappDono);
  const nomeAlterado = nome.valor.trim() !== dados.conta.nome;
  const whatsAlterado = whats.valor.replace(/\D/g, "") !== formatarTelefone(dados.telefoneDono).replace(/\D/g, "");

  return (
    <>
      <form action={nome.enviar} noValidate>
        <Bloco
          titulo="Perfil"
          descricao={
            <>
              Você entra como <strong className="font-medium text-[var(--tinta)]">{ROTULO_PAPEL[papel].toLowerCase()}</strong>
              {dados.conta.usuario ? (
                <>
                  , com o usuário <strong className="font-medium text-[var(--tinta)]">{dados.conta.usuario}</strong>
                </>
              ) : null}
              . O nome aparece pra equipe, nas escalas e nos registros.
            </>
          }
          rodape={<RodapeSalvar alterado={nomeAlterado} pendente={nome.pendente} />}
        >
          <Campo
            rotulo="Seu nome"
            name="nome"
            required
            autoComplete="name"
            maxLength={80}
            className="max-w-sm"
            value={nome.valor}
            onChange={(e) => {
              nome.setValor(e.target.value);
              nome.setErros({});
            }}
            erro={nome.erros.nome}
          />
        </Bloco>
      </form>

      {papel === "dono" && (
        <form action={whats.enviar} noValidate>
          <Bloco
            titulo="WhatsApp do cadastro"
            descricao="O número do dono, usado pelo suporte e na recuperação da conta. Cada número vale para um restaurante só."
            rodape={<RodapeSalvar alterado={whatsAlterado} pendente={whats.pendente} />}
          >
            <Campo
              rotulo="WhatsApp"
              name="whatsapp"
              type="tel"
              required
              autoComplete="tel"
              placeholder="(11) 98765-4321"
              className="max-w-sm"
              value={whats.valor}
              onChange={(e) => {
                whats.setValor(e.target.value);
                whats.setErros({});
              }}
              onBlur={() => whats.setValor((v) => formatarTelefone(v))}
              erro={whats.erros.whatsapp}
            />
          </Bloco>
        </form>
      )}
    </>
  );
}

function BlocoEmail() {
  const { dados, acoes, recarregar } = useConfiguracoes();
  const [valor, setValor] = useState("");
  const [estado, enviar, pendente] = useActionState(acoes.trocarEmail, {} as EstadoForm);
  const [erro, setErro] = useState<string>();
  useEffect(() => {
    setErro(estado.erros?.email);
    if (estado.ok) setValor("");
  }, [estado]);
  useAvisoDaAcao(estado, recarregar);

  return (
    <form action={enviar} noValidate>
      <Bloco
        titulo="E-mail de login"
        descricao={
          <>
            Hoje você entra com <strong className="font-medium text-[var(--tinta)]">{dados.conta.email ?? "—"}</strong>. Para trocar, mandamos um link
            para o e-mail novo; ele só passa a valer depois que você abrir o link.
          </>
        }
        rodape={<RodapeSalvar alterado={valor.trim().length > 0} pendente={pendente} rotulo="Enviar link" />}
      >
        {dados.conta.emailPendente && (
          <p role="status" className="text-[13px] rounded-lg px-3 py-2.5 mb-4" style={{ background: "color-mix(in srgb, var(--aviso) 10%, transparent)", color: "var(--tinta)" }}>
            Aguardando a confirmação de <strong className="font-medium">{dados.conta.emailPendente}</strong>. Abra o link que chegou nesse e-mail.
          </p>
        )}
        <Campo
          rotulo="Novo e-mail"
          name="email"
          type="email"
          required
          autoComplete="email"
          className="max-w-sm"
          value={valor}
          onChange={(e) => {
            setValor(e.target.value);
            setErro(undefined);
          }}
          erro={erro}
        />
      </Bloco>
    </form>
  );
}

function BlocoSenha() {
  const { acoes } = useConfiguracoes();
  const vazio = { senhaAtual: "", senhaNova: "", senhaConfirmacao: "" };
  const [valores, setValores] = useState(vazio);
  const [estado, enviar, pendente] = useActionState(acoes.trocarSenha, {} as EstadoForm);
  const [erros, setErros] = useState<Record<string, string>>({});
  const formulario = useRef<HTMLFormElement>(null);
  const focarErro = useRef(false);
  useEffect(() => {
    setErros(estado.erros ?? {});
    if (estado.ok) setValores({ senhaAtual: "", senhaNova: "", senhaConfirmacao: "" });
    focarErro.current = !!estado.erros;
  }, [estado]);
  // Depois que o erro aparece na tela, o foco vai pro primeiro campo errado.
  useEffect(() => {
    if (!focarErro.current) return;
    focarErro.current = false;
    formulario.current?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus();
  }, [erros]);
  useAvisoDaAcao(estado);

  const campo = (nome: keyof typeof vazio) => ({
    name: nome,
    type: "password",
    required: true,
    value: valores[nome],
    erro: erros[nome],
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => {
      const v = e.target.value;
      setValores((a) => ({ ...a, [nome]: v }));
      if (erros[nome])
        setErros((e) => {
          const resto = { ...e };
          delete resto[nome];
          return resto;
        });
    },
  });

  return (
    <form ref={formulario} action={enviar} noValidate>
      <Bloco
        titulo="Senha"
        descricao="Pedimos a senha atual para ninguém trocar a sua com o aparelho aberto."
        rodape={<RodapeSalvar alterado={Object.values(valores).every((v) => v.length > 0)} pendente={pendente} rotulo="Trocar senha" />}
      >
        <div className="grid gap-4 max-w-sm">
          <Campo rotulo="Senha atual" autoComplete="current-password" {...campo("senhaAtual")} />
          <Campo rotulo="Nova senha" autoComplete="new-password" minLength={8} ajuda="Pelo menos 8 caracteres." {...campo("senhaNova")} />
          <Campo rotulo="Repita a nova senha" autoComplete="new-password" {...campo("senhaConfirmacao")} />
        </div>
      </Bloco>
    </form>
  );
}

function BlocoSessoes() {
  const { acoes, demo } = useConfiguracoes();
  const [saindo, iniciar] = useTransition();
  const [confirmando, setConfirmando] = useState(false);

  return (
    <Bloco titulo="Aparelhos conectados" descricao="Perdeu o celular ou entrou num computador emprestado? Saia de todos os aparelhos de uma vez. Você vai precisar entrar de novo aqui também.">
      {!confirmando ? (
        <BotaoSecundario type="button" onClick={() => setConfirmando(true)}>
          <MonitorSmartphone size={15} aria-hidden /> Sair de todos os aparelhos…
        </BotaoSecundario>
      ) : (
        <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Confirmar saída de todos os aparelhos">
          <button
            type="button"
            disabled={saindo}
            onClick={() => iniciar(() => acoes.sairDeTodos())}
            className="inline-flex items-center gap-2 min-h-10 px-4 rounded-lg text-[13.5px] font-medium disabled:opacity-60"
            style={{ background: "var(--tinta)", color: "var(--panel)" }}
          >
            <LogOut size={15} aria-hidden /> {saindo ? "Saindo…" : demo ? "Sair (demonstração)" : "Sair de todos agora"}
          </button>
          <BotaoSecundario type="button" onClick={() => setConfirmando(false)} disabled={saindo}>
            Cancelar
          </BotaoSecundario>
        </div>
      )}
    </Bloco>
  );
}
