"use client";

// CONFIGURAÇÕES (2026-10-01): plano e assinatura, só leitura (o app não muda
// cobrança; o banco nem deixa — ver migration 20260928100000_endurecimento).

import { Bloco } from "./campos";
import { useConfiguracoes } from "./contexto";
import { EMPRESA } from "@/lib/legal/empresa";
import { CobrancaPlano } from "./CobrancaPlano";

const PLANOS: Record<string, string> = { trial: "Teste grátis", basico: "Básico", pro: "Profissional" };
const STATUS: Record<string, { rotulo: string; cor: string }> = {
  trial: { rotulo: "Em teste", cor: "var(--etapa-estoque-texto)" },
  ativa: { rotulo: "Ativa", cor: "var(--sucesso)" },
  atrasada: { rotulo: "Pagamento atrasado", cor: "var(--aviso)" },
  cancelada: { rotulo: "Cancelada", cor: "var(--sinal)" },
  inativa: { rotulo: "Suspensa", cor: "var(--aviso)" },
  pendente: { rotulo: "Aguardando pagamento", cor: "var(--aviso)" },
};

export function SecaoPlano() {
  const { dados } = useConfiguracoes();
  const status = STATUS[dados.statusAssinatura] ?? { rotulo: dados.statusAssinatura, cor: "var(--tinta-sub)" };
  const contato = EMPRESA.emailContato.startsWith("[") ? null : EMPRESA.emailContato;

  return (
    <Bloco titulo="Plano" descricao="A assinatura do restaurante. Vale para toda a equipe.">
      <dl className="grid gap-4 sm:grid-cols-2 max-w-lg">
        <div>
          <dt className="text-[12.5px] text-[var(--tinta-faint)]">Plano</dt>
          <dd className="text-[15px] font-semibold text-[var(--tinta)] mt-0.5">{PLANOS[dados.plano] ?? dados.plano}</dd>
        </div>
        <div>
          <dt className="text-[12.5px] text-[var(--tinta-faint)]">Situação</dt>
          <dd className="text-[15px] font-semibold mt-0.5 inline-flex items-center gap-2 text-[var(--tinta)]">
            <span aria-hidden className="w-2 h-2 rounded-full" style={{ background: status.cor }} />
            {status.rotulo}
          </dd>
        </div>
      </dl>
      <CobrancaPlano />
      <p className="text-[13px] text-[var(--tinta-sub)] mt-4">
        Para mudar de plano ou tirar dúvida sobre a cobrança, fale com o suporte
        {contato ? (
          <>
            {" "}
            em{" "}
            <a href={`mailto:${contato}`} className="underline underline-offset-2 text-[var(--tinta)]">
              {contato}
            </a>
          </>
        ) : null}
        .
      </p>
    </Bloco>
  );
}
