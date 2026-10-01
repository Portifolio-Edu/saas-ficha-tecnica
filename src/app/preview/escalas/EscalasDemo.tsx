"use client";

// ESCALAS (2026-09-26): tela Escalas na demo. Mesmo componente do sistema;
// as ações passam pela mesma validação das server actions e gravam no
// "banco" da demo (localStorage), que a aba Escala do /preview/cozinha lê.
// "Hoje" só é calculado no navegador (a página da demo é estática).
// PERFIL (2026-09-27): prontuário de competências, notas e banco de extras
// também gravam no "banco" da demo, com a mesma validação do servidor.

import { useEffect, useMemo, useState } from "react";
import { EscalasView, type AcoesEscalas } from "@/components/escalas/EscalasView";
import { CHAVES_DEMO, gravarDemo, lerDemo, useDemo } from "@/lib/demo/armazem";
import { escalasDemoIniciais, pessoasDemoAtuais } from "@/lib/demo/escalas";
import { NOME_RESTAURANTE } from "../fixtures";
import { normalizarPerfil, tagsUnicas, validarNota, validarPerfil, type NotaPerfil } from "@/lib/escalas/perfil";
import { normalizarTelefone, validarExtra, type Extra } from "@/lib/escalas/extras";
import { hojeLocalISO } from "@/lib/calculo/dia";
import { aplicarCadastro, type OcorrenciaRegistro, type PessoaEscala } from "@/lib/escalas/cadastro";
import { validarCadastro, validarOcorrencia } from "@/lib/escalas/validacao";
import type { RegrasEscala } from "@/lib/escalas/tipos";

const espera = () => new Promise((r) => setTimeout(r, 200));

export function EscalasDemo() {
  const [hoje, setHoje] = useState<string | null>(null);
  useEffect(() => setHoje(hojeLocalISO()), []);
  if (!hoje) return <div className="h-96 rounded-xl border animate-pulse" style={{ borderColor: "var(--linha)", background: "var(--panel)" }} aria-busy="true" aria-label="Carregando escala" />;
  return <EscalasDemoCarregada hoje={hoje} />;
}

function EscalasDemoCarregada({ hoje }: { hoje: string }) {
  const iniciais = useMemo(() => escalasDemoIniciais(hoje), [hoje]);
  const padraoRegras = useMemo(() => [iniciais.regras], [iniciais]);
  const [pessoasGravadas] = useDemo<PessoaEscala>(CHAVES_DEMO.escalaPessoas, iniciais.pessoas);
  const pessoas = useMemo(() => pessoasDemoAtuais(pessoasGravadas, iniciais.pessoas), [pessoasGravadas, iniciais]);
  const [notas] = useDemo<NotaPerfil>(CHAVES_DEMO.escalaNotas, iniciais.notas);
  const [extras] = useDemo<Extra>(CHAVES_DEMO.escalaExtras, iniciais.extras);
  const lerPessoas = () => pessoasDemoAtuais(lerDemo(CHAVES_DEMO.escalaPessoas, iniciais.pessoas), iniciais.pessoas);
  const [ocorrencias] = useDemo<OcorrenciaRegistro>(CHAVES_DEMO.escalaOcorrencias, iniciais.ocorrencias);
  const [regras] = useDemo<RegrasEscala>(CHAVES_DEMO.escalaRegras, padraoRegras);

  const acoes = useMemo<AcoesEscalas>(
    () => ({
      salvarPessoa: async (id, c) => {
        await espera();
        const problema = validarCadastro(c);
        if (problema) return { ok: false, erro: problema };
        const lista = lerPessoas();
        const novoId = id ?? `p-${Date.now().toString(36)}`;
        const pessoa = aplicarCadastro(novoId, c, lista.find((p) => p.id === id)?.perfil);
        const nova = id ? lista.map((p) => (p.id === id ? pessoa : p)) : [...lista, pessoa];
        gravarDemo(CHAVES_DEMO.escalaPessoas, nova.sort((a, b) => a.nome.localeCompare(b.nome)));
        return { ok: true };
      },
      salvarRegras: async (r) => {
        await espera();
        if (!(Number.isInteger(r.intervaloDomingoSemanas) && r.intervaloDomingoSemanas >= 1 && r.intervaloDomingoSemanas <= 7)) {
          return { ok: false, erro: "Rodízio de domingo entre 1 e 7 semanas." };
        }
        const cobertura = Object.fromEntries(Object.entries(r.coberturaMinima).filter(([, v]) => v > 0));
        gravarDemo(CHAVES_DEMO.escalaRegras, [{ intervaloDomingoSemanas: r.intervaloDomingoSemanas, coberturaMinima: cobertura }]);
        return { ok: true };
      },
      criarOcorrencia: async (o) => {
        await espera();
        const problema = validarOcorrencia(o);
        if (problema) return { ok: false, erro: problema };
        const lista = lerDemo(CHAVES_DEMO.escalaOcorrencias, iniciais.ocorrencias);
        const nova: OcorrenciaRegistro = {
          id: `oc-${Date.now().toString(36)}`,
          funcionarioId: o.funcionarioId,
          tipo: o.tipo,
          inicio: o.inicio,
          fim: o.fim,
          restricoes: o.restricoes,
          ...(o.nota?.trim() ? { nota: o.nota.trim() } : {}),
          criadoEm: new Date().toISOString(),
        };
        gravarDemo(CHAVES_DEMO.escalaOcorrencias, [nova, ...lista].sort((a, b) => b.inicio.localeCompare(a.inicio)));
        return { ok: true };
      },
      removerOcorrencia: async (id) => {
        await espera();
        gravarDemo(CHAVES_DEMO.escalaOcorrencias, lerDemo(CHAVES_DEMO.escalaOcorrencias, iniciais.ocorrencias).filter((o) => o.id !== id));
        return { ok: true };
      },
      salvarPerfil: async (funcionarioId, entrada) => {
        await espera();
        const perfil = normalizarPerfil(entrada);
        const problema = validarPerfil(perfil);
        if (problema) return { ok: false, erro: problema };
        const agora = new Date().toISOString();
        gravarDemo(CHAVES_DEMO.escalaPessoas, lerPessoas().map((p) => (p.id === funcionarioId ? { ...p, perfil: { ...perfil, atualizadoEm: agora } } : p)));
        return { ok: true };
      },
      criarNota: async (n) => {
        await espera();
        const problema = validarNota(n, hoje);
        if (problema) return { ok: false, erro: problema };
        const nova: NotaPerfil = { id: `nt-${Date.now().toString(36)}`, ...n, texto: n.texto.trim(), autor: "Gestor (demo)", criadoEm: new Date().toISOString() };
        const lista = [nova, ...lerDemo(CHAVES_DEMO.escalaNotas, iniciais.notas)].sort((a, b) => b.data.localeCompare(a.data) || b.criadoEm.localeCompare(a.criadoEm));
        gravarDemo(CHAVES_DEMO.escalaNotas, lista);
        return { ok: true };
      },
      removerNota: async (id) => {
        await espera();
        gravarDemo(CHAVES_DEMO.escalaNotas, lerDemo(CHAVES_DEMO.escalaNotas, iniciais.notas).filter((n) => n.id !== id));
        return { ok: true };
      },
      salvarExtra: async (id, entrada) => {
        await espera();
        const e = { ...entrada, cargos: tagsUnicas(entrada.cargos), pracas: tagsUnicas(entrada.pracas) };
        const problema = validarExtra(e);
        if (problema) return { ok: false, erro: problema };
        const lista = lerDemo(CHAVES_DEMO.escalaExtras, iniciais.extras);
        const atual = id ? lista.find((x) => x.id === id) : undefined;
        const consentimentoEm = e.aceitaWhatsapp ? (atual?.aceitaWhatsapp ? atual.consentimentoEm : new Date().toISOString()) : null;
        const extra: Extra = { ...e, id: id ?? `ex-${Date.now().toString(36)}`, nome: e.nome.trim(), telefone: normalizarTelefone(e.telefone), nota: e.nota?.trim() || null, consentimentoEm };
        gravarDemo(CHAVES_DEMO.escalaExtras, id ? lista.map((x) => (x.id === id ? extra : x)) : [...lista, extra]);
        return { ok: true };
      },
      removerExtra: async (id) => {
        await espera();
        gravarDemo(CHAVES_DEMO.escalaExtras, lerDemo(CHAVES_DEMO.escalaExtras, iniciais.extras).filter((x) => x.id !== id));
        return { ok: true };
      },
    }),
    // lerPessoas só usa `iniciais` (já na lista).
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [iniciais, hoje],
  );

  return (
    <EscalasView
      pessoas={pessoas}
      ocorrencias={ocorrencias}
      regras={regras[0] ?? iniciais.regras}
      notas={notas}
      extras={extras}
      nomeRestaurante={NOME_RESTAURANTE}
      hoje={hoje}
      acoes={acoes}
    />
  );
}
