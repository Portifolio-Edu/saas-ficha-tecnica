"use client";

import { useState } from "react";
import { Check } from "lucide-react";
import type { DadosRestaurante } from "@/lib/dominio/configuracoes";
import { fracaoParaPct, formatarCnpj } from "@/lib/dominio/configuracoes";
import { formatarTelefone } from "@/lib/telefone";
import { formatNumero } from "@/components/charts/format";
import { BotaoPrimario, Campo, CampoTexto, MensagemErro, SecaoConfig } from "./campos";
import type { AcoesConfiguracoes } from "./tipos";

// CONFIGURAÇÕES (2026-10-03): dados do restaurante e a margem alvo padrão (a
// meta dos pratos que não têm meta própria na ficha). O WhatsApp só aparece:
// é a identidade do cadastro e não muda por aqui.

export function RestauranteForm({ restaurante, acoes }: { restaurante: DadosRestaurante; acoes: AcoesConfiguracoes }) {
  const [nomeRestaurante, setNomeRestaurante] = useState(restaurante.nomeRestaurante);
  const [nome, setNome] = useState(restaurante.nome);
  const [cnpj, setCnpj] = useState(restaurante.cnpj ? formatarCnpj(restaurante.cnpj) : "");
  const [margem, setMargem] = useState(formatNumero(fracaoParaPct(restaurante.margemAlvo), fracaoParaPct(restaurante.margemAlvo) % 1 === 0 ? 0 : 1));
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [salvo, setSalvo] = useState(false);

  const salvar = async (e: React.FormEvent) => {
    e.preventDefault();
    setSalvando(true);
    setErro(null);
    setSalvo(false);
    try {
      const r = await acoes.salvarRestaurante({ nomeRestaurante, nome, cnpj, margemAlvoPct: margem });
      if (!r.ok) setErro(r.erro);
      else setSalvo(true);
    } finally {
      setSalvando(false);
    }
  };

  const mudou = () => setSalvo(false);

  return (
    <SecaoConfig titulo="Restaurante" descricao="Dados da casa e a meta de margem usada nos pratos que não têm meta própria.">
      <form onSubmit={salvar} className="p-5 space-y-5">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Campo rotulo="Nome do restaurante" htmlFor="cfg-nome-restaurante">
            <CampoTexto id="cfg-nome-restaurante" value={nomeRestaurante} onChange={(e) => { setNomeRestaurante(e.target.value); mudou(); }} autoComplete="organization" />
          </Campo>
          <Campo rotulo="Responsável" htmlFor="cfg-nome">
            <CampoTexto id="cfg-nome" value={nome} onChange={(e) => { setNome(e.target.value); mudou(); }} autoComplete="name" />
          </Campo>
          <Campo rotulo="WhatsApp do cadastro" htmlFor="cfg-telefone" ajuda="Identifica o restaurante. Pra trocar, fale com o suporte.">
            <CampoTexto id="cfg-telefone" value={formatarTelefone(restaurante.telefone)} disabled readOnly />
          </Campo>
          <Campo rotulo="CNPJ (opcional)" htmlFor="cfg-cnpj">
            <CampoTexto id="cfg-cnpj" inputMode="numeric" placeholder="00.000.000/0000-00" value={cnpj} onChange={(e) => { setCnpj(e.target.value); mudou(); }} />
          </Campo>
        </div>

        <div className="max-w-xs">
          <Campo rotulo="Margem alvo padrão (%)" htmlFor="cfg-margem" ajuda="Vale pra todo prato sem meta própria. Preço sugerido = custo ÷ (1 − margem).">
            <CampoTexto id="cfg-margem" inputMode="decimal" value={margem} onChange={(e) => { setMargem(e.target.value); mudou(); }} style={{ fontVariantNumeric: "tabular-nums" }} />
          </Campo>
        </div>

        <MensagemErro erro={erro} />
        <div className="flex items-center gap-3">
          <BotaoPrimario type="submit" disabled={salvando}>
            {salvando ? "Salvando..." : "Salvar"}
          </BotaoPrimario>
          {salvo && (
            <span role="status" className="inline-flex items-center gap-1.5 text-[13px]" style={{ color: "var(--sucesso)" }}>
              <Check size={15} /> Salvo
            </span>
          )}
        </div>
      </form>
    </SecaoConfig>
  );
}
