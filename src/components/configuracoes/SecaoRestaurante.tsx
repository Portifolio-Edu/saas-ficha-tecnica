"use client";

// CONFIGURAÇÕES (2026-10-01): dados do restaurante (dono e gestor). Logo,
// identificação, contato e endereço. O endereço completa pelo CEP (consulta
// no servidor). Formato de cada campo: src/lib/empresa/empresa.ts.

import { useActionState, useEffect, useRef, useState, useTransition } from "react";
import { ImageUp, Trash2 } from "lucide-react";
import { Bloco, BotaoSecundario, Campo, RodapeSalvar, Selecao, useAvisoDaAcao } from "./campos";
import { useConfiguracoes } from "./contexto";
import { UFS, formatarCep, formatarCnpj, type CampoEmpresa, type DadosEmpresa } from "@/lib/empresa/empresa";
import { formatarTelefone } from "@/lib/telefone";
import { useToast } from "@/components/ficha/Toast";
import type { EstadoForm } from "@/app/configuracoes/actions";

type Valores = Record<CampoEmpresa, string>;

function paraTela(e: DadosEmpresa): Valores {
  return {
    nomeRestaurante: e.nomeRestaurante,
    razaoSocial: e.razaoSocial ?? "",
    cnpj: e.cnpj ? formatarCnpj(e.cnpj) : "",
    inscricaoEstadual: e.inscricaoEstadual ?? "",
    emailContato: e.emailContato ?? "",
    telefoneContato: e.telefoneContato ? formatarTelefone(e.telefoneContato) : "",
    cep: e.cep ? formatarCep(e.cep) : "",
    logradouro: e.logradouro ?? "",
    numero: e.numero ?? "",
    complemento: e.complemento ?? "",
    bairro: e.bairro ?? "",
    cidade: e.cidade ?? "",
    uf: e.uf ?? "",
  };
}

export function SecaoRestaurante() {
  return (
    <div className="space-y-4">
      <BlocoLogo />
      <BlocoEmpresa />
    </div>
  );
}

function BlocoLogo() {
  const { dados, acoes, recarregar } = useConfiguracoes();
  const [estado, enviar, enviando] = useActionState(acoes.enviarLogo, {} as EstadoForm);
  const [removendo, iniciarRemocao] = useTransition();
  const { mostrarErro, mostrarSucesso } = useToast();
  const arquivo = useRef<HTMLInputElement>(null);
  const formulario = useRef<HTMLFormElement>(null);
  useAvisoDaAcao(estado, recarregar);

  const remover = () =>
    iniciarRemocao(async () => {
      const r = await acoes.removerLogo();
      if (r.erro) mostrarErro(r.erro);
      else if (r.sucesso) {
        mostrarSucesso(r.sucesso);
        recarregar();
      }
    });

  return (
    <Bloco titulo="Logo" descricao="Aparece no menu do sistema. PNG, JPG ou WebP de até 2 MB; quadrado ou deitado fica melhor.">
      <form ref={formulario} action={enviar} className="flex flex-wrap items-center gap-4">
        <div
          className="w-16 h-16 rounded-xl border flex items-center justify-center overflow-hidden shrink-0"
          style={{ borderColor: "var(--linha-forte)", background: "var(--panel-elevated)" }}
        >
          {dados.logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={dados.logoUrl} alt={`Logo de ${dados.empresa.nomeRestaurante}`} className="w-full h-full object-contain" />
          ) : (
            <ImageUp size={22} className="text-[var(--tinta-faint)]" aria-hidden />
          )}
        </div>
        <input
          ref={arquivo}
          type="file"
          name="logo"
          accept="image/png,image/jpeg,image/webp"
          className="sr-only"
          tabIndex={-1}
          aria-hidden
          onChange={() => arquivo.current?.files?.length && formulario.current?.requestSubmit()}
        />
        <div className="flex flex-wrap gap-2">
          <BotaoSecundario type="button" onClick={() => arquivo.current?.click()} disabled={enviando}>
            <ImageUp size={15} aria-hidden /> {enviando ? "Enviando…" : dados.logoUrl ? "Trocar logo" : "Enviar logo"}
          </BotaoSecundario>
          {dados.logoUrl && (
            <BotaoSecundario type="button" onClick={remover} disabled={removendo || enviando}>
              <Trash2 size={15} aria-hidden /> {removendo ? "Removendo…" : "Remover"}
            </BotaoSecundario>
          )}
        </div>
      </form>
    </Bloco>
  );
}

function BlocoEmpresa() {
  const { dados, acoes, recarregar } = useConfiguracoes();
  const base = paraTela(dados.empresa);
  const [valores, setValores] = useState<Valores>(base);
  const [erros, setErros] = useState<Record<string, string>>({});
  const [estado, salvar, salvando] = useActionState(acoes.salvarEmpresa, {} as EstadoForm);
  const [cepStatus, setCepStatus] = useState<string>("");
  const [buscandoCep, iniciarBusca] = useTransition();
  const formulario = useRef<HTMLFormElement>(null);
  const focarErro = useRef(false);
  const chaveBase = JSON.stringify(base);

  // Dados novos (depois de salvar) viram a nova base.
  useEffect(() => {
    setValores(JSON.parse(chaveBase) as Valores);
  }, [chaveBase]);

  useEffect(() => {
    setErros(estado.erros ?? {});
    focarErro.current = !!estado.erros;
  }, [estado]);
  // Depois que o erro aparece na tela, o foco vai pro primeiro campo errado.
  useEffect(() => {
    if (!focarErro.current) return;
    focarErro.current = false;
    formulario.current?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus();
  }, [erros]);
  useAvisoDaAcao(estado, recarregar);

  const alterado = (Object.keys(base) as CampoEmpresa[]).some((k) => base[k] !== valores[k]);

  const mudar = (campo: CampoEmpresa) => (ev: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const v = ev.target.value;
    setValores((a) => ({ ...a, [campo]: v }));
    if (erros[campo])
        setErros((e) => {
          const resto = { ...e };
          delete resto[campo];
          return resto;
        });
  };

  const campo = (nome: CampoEmpresa) => ({ name: nome, value: valores[nome], onChange: mudar(nome), erro: erros[nome] });

  const buscarCep = () => {
    const d = valores.cep.replace(/\D/g, "");
    if (d.length !== 8 || d === (dados.empresa.cep ?? "")) return;
    setValores((a) => ({ ...a, cep: formatarCep(d) }));
    iniciarBusca(async () => {
      setCepStatus("Buscando o endereço…");
      const r = await acoes.buscarCep(d);
      if ("erro" in r) {
        setCepStatus("");
        setErros((e) => ({ ...e, cep: r.erro }));
        return;
      }
      setValores((a) => ({
        ...a,
        logradouro: r.logradouro || a.logradouro,
        bairro: r.bairro || a.bairro,
        cidade: r.cidade || a.cidade,
        uf: r.uf || a.uf,
      }));
      setCepStatus("Endereço preenchido pelo CEP. Confira e complete o número.");
    });
  };

  return (
    <form ref={formulario} action={salvar} noValidate>
      <Bloco titulo="Dados do restaurante" descricao="Saem nos relatórios, no rótulo para varejo e nos documentos." rodape={<RodapeSalvar alterado={alterado} pendente={salvando} />}>
        <div className="space-y-6">
          <fieldset className="grid gap-4 sm:grid-cols-2">
            <legend className="sr-only">Identificação</legend>
            <Campo rotulo="Nome do restaurante" required autoComplete="organization" maxLength={80} className="sm:col-span-2" ajuda="Como a equipe e os clientes conhecem a casa. Aparece no menu." {...campo("nomeRestaurante")} />
            <Campo rotulo="Razão social" maxLength={120} className="sm:col-span-2" {...campo("razaoSocial")} />
            <Campo
              rotulo="CNPJ"
              inputMode="numeric"
              placeholder="00.000.000/0000-00"
              maxLength={18}
              {...campo("cnpj")}
              onBlur={() => setValores((a) => ({ ...a, cnpj: formatarCnpj(a.cnpj) }))}
            />
            <Campo rotulo="Inscrição estadual" maxLength={20} ajuda="Só os números, ou ISENTO." {...campo("inscricaoEstadual")} />
          </fieldset>

          <fieldset className="border-t pt-5" style={{ borderColor: "var(--linha)" }}>
            <legend className="sr-only">Contato</legend>
            <h3 aria-hidden className="text-[13px] font-semibold text-[var(--tinta)] mb-3">Contato</h3>
            <div className="grid gap-4 sm:grid-cols-2">
            <Campo rotulo="E-mail de contato" type="email" autoComplete="email" maxLength={160} ajuda="Fornecedores e clientes. Não é o e-mail de login." {...campo("emailContato")} />
            <Campo
              rotulo="Telefone de contato"
              type="tel"
              autoComplete="tel"
              placeholder="(11) 3333-4444"
              {...campo("telefoneContato")}
              onBlur={() => setValores((a) => ({ ...a, telefoneContato: a.telefoneContato ? formatarTelefone(a.telefoneContato) : "" }))}
            />
            </div>
          </fieldset>

          <fieldset className="border-t pt-5" style={{ borderColor: "var(--linha)" }}>
            <legend className="sr-only">Endereço</legend>
            <h3 aria-hidden className="text-[13px] font-semibold text-[var(--tinta)] mb-3">Endereço</h3>
            <div className="grid gap-4 sm:grid-cols-6">
            <Campo
              rotulo="CEP"
              inputMode="numeric"
              autoComplete="postal-code"
              placeholder="00000-000"
              maxLength={9}
              className="sm:col-span-2"
              {...campo("cep")}
              onBlur={buscarCep}
              ajuda={<span aria-live="polite">{buscandoCep ? "Buscando o endereço…" : cepStatus || "Completa rua, bairro e cidade."}</span>}
            />
            <Campo rotulo="Rua" autoComplete="address-line1" maxLength={120} className="sm:col-span-4" {...campo("logradouro")} />
            <Campo rotulo="Número" maxLength={20} className="sm:col-span-2" {...campo("numero")} />
            <Campo rotulo="Complemento" autoComplete="address-line2" maxLength={60} className="sm:col-span-4" {...campo("complemento")} />
            <Campo rotulo="Bairro" maxLength={60} className="sm:col-span-2" {...campo("bairro")} />
            <Campo rotulo="Cidade" autoComplete="address-level2" maxLength={60} className="sm:col-span-3" {...campo("cidade")} />
            <Selecao
              rotulo="UF"
              className="sm:col-span-1"
              name="uf"
              value={valores.uf}
              onChange={mudar("uf")}
              erro={erros.uf}
              opcoes={[{ valor: "", rotulo: "—" }, ...UFS.map((u) => ({ valor: u, rotulo: u }))]}
            />
            </div>
          </fieldset>
        </div>
      </Bloco>
    </form>
  );
}
