"use client";

// CELULAR (2026-09-26): o link só de consulta na demo — o que a Juliana vê no
// celular. Mesma tela do link de verdade; escala, fichas e checklists vêm do
// "banco" da demo (o que o gestor muda em Escalas e a cozinha marca no tablet
// aparece aqui).

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ConsultaFuncionarioView } from "@/components/consulta/ConsultaFuncionarioView";
import { CHAVES_DEMO, useDemo } from "@/lib/demo/armazem";
import { escalasDemoIniciais, pessoasDemoAtuais } from "@/lib/demo/escalas";
import { hojeLocalISO } from "@/lib/calculo/dia";
import { paraMotor, type OcorrenciaRegistro, type PessoaEscala } from "@/lib/escalas/cadastro";
import { montarEscalaPublica, periodoCozinha, recortePublico } from "@/lib/escalas/publica";
import type { RegrasEscala } from "@/lib/escalas/tipos";
import type { Checklist } from "@/lib/dominio/checklist";
import { minhaEscala, type ConsultaFuncionario } from "@/lib/dominio/consulta";
import { checklists as checklistsFixture, NOME_RESTAURANTE } from "../fixtures";
import { fichasCozinhaDemo } from "../equipeDemo";

const PESSOA = { id: "f-juliana", nome: "Juliana Costa", cargo: "Cozinheira" };

export function ConsultaDemo() {
  // "Hoje" é do navegador: calculado depois de montar (sem diferença entre o
  // HTML estático e o que o navegador desenha).
  const [hoje, setHoje] = useState<string | null>(null);
  useEffect(() => setHoje(hojeLocalISO()), []);
  const base = hoje ?? "2026-01-05";
  const iniciais = useMemo(() => escalasDemoIniciais(base), [base]);
  const padraoRegras = useMemo(() => [iniciais.regras], [iniciais]);
  const [pessoas] = useDemo<PessoaEscala>(CHAVES_DEMO.escalaPessoas, iniciais.pessoas);
  const [ocorrencias] = useDemo<OcorrenciaRegistro>(CHAVES_DEMO.escalaOcorrencias, iniciais.ocorrencias);
  const [regras] = useDemo<RegrasEscala>(CHAVES_DEMO.escalaRegras, padraoRegras);
  const [checklists] = useDemo<Checklist>(CHAVES_DEMO.checklists, checklistsFixture);

  const dados = useMemo<ConsultaFuncionario | null>(() => {
    if (!hoje) return null;
    const { inicio, fim } = periodoCozinha(hoje);
    const publica = montarEscalaPublica(recortePublico(paraMotor(pessoasDemoAtuais(pessoas, iniciais.pessoas)), ocorrencias, regras[0] ?? iniciais.regras), inicio, fim);
    return { restaurante: NOME_RESTAURANTE, pessoa: PESSOA, hoje, escala: minhaEscala(publica, PESSOA.id, hoje), fichas: fichasCozinhaDemo, checklists };
  }, [hoje, pessoas, ocorrencias, regras, iniciais, checklists]);

  const [hora, setHora] = useState("");
  useEffect(() => setHora(new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })), []);

  return (
    <>
      <div className="px-4 py-2 text-[13px] text-center" style={{ background: "var(--marca-suave)", color: "var(--tinta)" }}>
        Demonstração: é isto que a Juliana vê no celular pelo link dela.{" "}
        <Link href="/preview/equipe" className="underline underline-offset-2 font-medium">Gerar links em Equipe</Link>
      </div>
      {dados ? <ConsultaFuncionarioView dados={dados} atualizadoAs={hora} demo /> : <div className="min-h-dvh bg-[var(--fundo)]" aria-busy="true" />}
    </>
  );
}
