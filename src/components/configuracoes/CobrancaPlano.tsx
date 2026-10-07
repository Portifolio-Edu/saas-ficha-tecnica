"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useConfiguracoes } from "./contexto";
import { OFERTA_SAAS, type OfertaSaas } from "@/lib/assinatura/oferta";
import { dataBR } from "@/lib/formato";
import { formatBRL } from "@/components/charts/format";

interface Situacao { oferta?: OfertaSaas; disponivel: boolean; teste?: boolean; valorCentavos?: number; estado?: string | null; faturaUrl?: string | null; erro?: string }
const ROTULOS: Record<string, string> = { criando: "Solicitação em processamento", pendente: "Aguardando pagamento", ativa: "Pagamento confirmado", atrasada: "Pagamento atrasado", inativa: "Recorrência suspensa", cancelada: "Recorrência cancelada" };

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

  const apresentacao = <div className="rounded-xl border border-[var(--linha)] bg-[var(--panel)] p-4 space-y-2" aria-label="Oferta de assinatura">
    <p className="text-sm font-semibold text-[var(--tinta)]">7 dias grátis para conhecer a operação com sua equipe</p>
    <p className="text-sm text-[var(--tinta-sub)]">Depois, {formatBRL(OFERTA_SAAS.mensalCentavos / 100)} por mês, por restaurante.</p>
    <p className="text-sm text-[var(--tinta)]">Os 10 primeiros fundadores pagam {formatBRL(OFERTA_SAAS.fundadorCentavos / 100)} por mês enquanto mantiverem a assinatura.</p>
    <p className="text-xs text-[var(--tinta-sub)]">A vaga é confirmada no primeiro pagamento. Cancelar encerra o benefício; uma nova assinatura usa a oferta vigente.</p>
  </div>;
  if (demo) return <div className="mt-5 space-y-3">{apresentacao}<p className="text-sm text-[var(--tinta-sub)]">Demonstração da oferta. Nenhuma vaga é reservada e nenhuma cobrança é criada aqui.</p></div>;
  const botao = "min-h-11 rounded-lg border px-4 py-2 text-sm font-medium disabled:opacity-50 border-[var(--linha)] text-[var(--tinta)]";
  return (
    <div className="mt-5 space-y-3">
      {apresentacao}
      {situacao && !situacao.disponivel && <p className="text-sm text-[var(--tinta-sub)]">A contratação online ainda não está disponível. Fale com o suporte para começar.</p>}
      {erro && <p role="alert" className="text-sm text-[var(--sinal)]">{erro}</p>}
      {!situacao && !erro && <p role="status" className="text-sm text-[var(--tinta-sub)]">Consultando assinatura…</p>}
      {situacao?.disponivel && <>
        {situacao.teste && <p className="text-sm text-[var(--aviso)]">Ambiente de teste: nenhum pagamento real. Não use dados de cartão reais.</p>}
        <p className="text-sm text-[var(--tinta)]">Plano mensal · {formatBRL((situacao.valorCentavos ?? 0) / 100)} por restaurante, para toda a equipe.</p>
        {situacao.oferta && <>
          {situacao.oferta.teste_termina_em && <p className="text-sm text-[var(--tinta-sub)]">Período gratuito até {dataBR(situacao.oferta.teste_termina_em, { timeZone: "America/Sao_Paulo", day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" })} (horário de Brasília).</p>}
          <p className="text-sm text-[var(--tinta-sub)]">Primeiro vencimento: {dataBR(`${situacao.oferta.primeiro_vencimento}T12:00:00-03:00`, { timeZone: "America/Sao_Paulo" })}.</p>
          {situacao.oferta.fundador_confirmado ? <p className="text-sm font-medium text-[var(--tinta)]">Sua condição de fundador está confirmada.</p> : situacao.valorCentavos === OFERTA_SAAS.fundadorCentavos && situacao.estado && situacao.estado !== "cancelada" ? <p className="text-sm text-[var(--tinta-sub)]">Vaga provisoriamente reservada. Confirmação após o primeiro pagamento.</p> : !situacao.estado || situacao.estado === "cancelada" ? <p className="text-sm text-[var(--tinta-sub)]">{situacao.valorCentavos === OFERTA_SAAS.fundadorCentavos ? `${situacao.oferta.vagas_disponiveis} vagas disponíveis para reserva.` : "A condição de fundador não está disponível para esta nova assinatura."} O preço será conferido novamente ao assinar.</p> : null}
        </>}
        {situacao.estado && <p role="status" className="text-sm text-[var(--tinta-sub)]">{ROTULOS[situacao.estado] ?? situacao.estado}</p>}
        {(!situacao.estado || situacao.estado === "cancelada") && <>
          <p className="text-sm text-[var(--tinta-sub)]">O primeiro vencimento respeita o término dos 7 dias grátis. O pagamento será feito na página do Asaas. Criar a assinatura reserva a oferta disponível, mas não confirma o pagamento.</p>
          <button disabled={ocupado} onClick={() => agir("assinar")} className={botao}>{ocupado ? "Processando…" : "Criar assinatura mensal"}</button>
        </>}
        {situacao.faturaUrl && <a href={situacao.faturaUrl} target="_blank" rel="noopener noreferrer" className={`${botao} inline-flex items-center`}>Abrir cobrança no Asaas</a>}
        <div className="flex flex-wrap gap-2">
          <button disabled={ocupado} onClick={() => agir("atualizar")} className={botao}>Atualizar situação</button>
          {situacao.estado && situacao.estado !== "cancelada" && <button disabled={ocupado} onClick={() => setConfirmarCancelamento(true)} className={botao}>Cancelar recorrência</button>}
        </div>
        {confirmarCancelamento && <div className="rounded-lg border border-[var(--linha)] p-4 space-y-3">
          <p className="text-sm text-[var(--tinta-sub)]">Cancelar encerra as próximas cobranças e remove as pendentes da assinatura. Pagamentos anteriores permanecem no histórico. A condição de fundador não é mantida após o cancelamento.</p>
          <div className="flex flex-wrap gap-2">
            <button disabled={ocupado} onClick={() => agir("cancelar")} className={botao}>Confirmar cancelamento</button>
            <button disabled={ocupado} onClick={() => setConfirmarCancelamento(false)} className={botao}>Continuar com a assinatura</button>
          </div>
        </div>}
      </>}
    </div>
  );
}
