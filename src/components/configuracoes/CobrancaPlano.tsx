"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useConfiguracoes } from "./contexto";
import { formatBRL } from "@/components/charts/format";

interface Situacao { disponivel: boolean; teste?: boolean; valorCentavos?: number; estado?: string | null; faturaUrl?: string | null; erro?: string }
const ROTULOS: Record<string, string> = { criando: "Solicitação em processamento", pendente: "Aguardando pagamento", ativa: "Pagamento confirmado", atrasada: "Pagamento atrasado", cancelada: "Recorrência cancelada" };

export function CobrancaPlano() {
  const { demo } = useConfiguracoes();
  const router = useRouter();
  const [situacao, setSituacao] = useState<Situacao | null>(null);
  const [erro, setErro] = useState("");
  const [ocupado, setOcupado] = useState(false);
  const [confirmarCancelamento, setConfirmarCancelamento] = useState(false);

  useEffect(() => {
    if (demo) return;
    const abortar = new AbortController();
    fetch("/api/assinatura", { cache: "no-store", signal: abortar.signal }).then(async r => {
      if (!r.ok) throw new Error("Não foi possível consultar a assinatura.");
      setSituacao(await r.json());
    }).catch(e => { if (e.name !== "AbortError") setErro("Não foi possível consultar a assinatura. Tente reabrir esta seção."); });
    return () => abortar.abort();
  }, [demo]);

  async function agir(acao: string) {
    setOcupado(true); setErro("");
    try {
      const resposta = await fetch("/api/assinatura", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ acao, confirmar: acao === "cancelar" && confirmarCancelamento, valorAceitoCentavos: situacao?.valorCentavos }) });
      const resultado = await resposta.json();
      if (!resposta.ok) throw new Error(resultado.erro ?? "Não foi possível confirmar a cobrança.");
      const consulta = await fetch("/api/assinatura", { cache: "no-store" });
      if (!consulta.ok) throw new Error("Operação enviada. Atualize a situação para conferir o resultado.");
      setSituacao(await consulta.json()); setConfirmarCancelamento(false);
      router.refresh();
    } catch (e) { setErro(e instanceof Error ? e.message : "Não foi possível confirmar a operação."); }
    finally { setOcupado(false); }
  }

  if (demo) return <p className="mt-4 text-sm text-[var(--tinta-sub)]">Na demonstração, nenhuma assinatura ou cobrança é criada.</p>;
  const botao = "min-h-11 rounded-lg border px-4 py-2 text-sm font-medium disabled:opacity-50 border-[var(--linha)] text-[var(--tinta)]";
  return (
    <div className="mt-5 space-y-3">
      {erro && <p role="alert" className="text-sm text-[var(--sinal)]">{erro}</p>}
      {!situacao && !erro && <p role="status" className="text-sm text-[var(--tinta-sub)]">Consultando assinatura…</p>}
      {situacao?.disponivel && <>
        {situacao.teste && <p className="text-sm text-[var(--aviso)]">Ambiente de teste: nenhum pagamento real. Não use dados de cartão reais.</p>}
        <p className="text-sm text-[var(--tinta)]">Plano mensal · {formatBRL((situacao.valorCentavos ?? 0) / 100)} por restaurante, para toda a equipe.</p>
        {situacao.estado && <p role="status" className="text-sm text-[var(--tinta-sub)]">{ROTULOS[situacao.estado] ?? situacao.estado}</p>}
        {(!situacao.estado || situacao.estado === "cancelada") && <>
          <p className="text-sm text-[var(--tinta-sub)]">A primeira cobrança vence hoje. O pagamento será feito na página do Asaas. Criar a assinatura não confirma o pagamento.</p>
          <button disabled={ocupado} onClick={() => agir("assinar")} className={botao}>{ocupado ? "Processando…" : "Criar assinatura mensal"}</button>
        </>}
        {situacao.faturaUrl && <a href={situacao.faturaUrl} target="_blank" rel="noopener noreferrer" className={`${botao} inline-flex items-center`}>Abrir cobrança no Asaas</a>}
        <div className="flex flex-wrap gap-2">
          <button disabled={ocupado} onClick={() => agir("atualizar")} className={botao}>Atualizar situação</button>
          {situacao.estado && situacao.estado !== "cancelada" && <button disabled={ocupado} onClick={() => setConfirmarCancelamento(true)} className={botao}>Cancelar recorrência</button>}
        </div>
        {confirmarCancelamento && <div className="rounded-lg border border-[var(--linha)] p-4 space-y-3">
          <p className="text-sm text-[var(--tinta-sub)]">Cancelar encerra as próximas cobranças e remove as pendentes da assinatura. Pagamentos anteriores permanecem no histórico.</p>
          <div className="flex flex-wrap gap-2">
            <button disabled={ocupado} onClick={() => agir("cancelar")} className={botao}>Confirmar cancelamento</button>
            <button disabled={ocupado} onClick={() => setConfirmarCancelamento(false)} className={botao}>Continuar com a assinatura</button>
          </div>
        </div>}
      </>}
    </div>
  );
}
