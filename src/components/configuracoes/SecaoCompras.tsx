"use client";
import { useActionState, useEffect, useState } from "react";
import { Bloco, Interruptor, RodapeSalvar, useAvisoDaAcao } from "./campos";
import { useConfiguracoes } from "./contexto";
import { dataBR } from "@/lib/formato";
import type { EstadoForm } from "@/app/configuracoes/actions";

export function SecaoCompras() {
  const { dados, acoes, recarregar } = useConfiguracoes();
  const base = dados.estoquePodeAprovarCompras ?? false;
  const [permitir, setPermitir] = useState(base);
  const [estado, enviar, enviando] = useActionState(acoes.salvarPermissaoCompras, {} as EstadoForm);
  useEffect(() => setPermitir(base), [base]);
  useAvisoDaAcao(estado, recarregar);
  return <form action={enviar} aria-label="Permissões de compras">
    <Bloco titulo="Aprovação de compras" descricao="Defina quem pode decidir sobre as requisições deste restaurante. Somente gestor e dono podem alterar esta permissão." rodape={<RodapeSalvar alterado={permitir !== base} pendente={enviando} rotulo="Salvar permissões" />}>
      <Interruptor nome="estoquePodeAprovar" rotulo="Permitir que o estoque aprove e rejeite compras" descricao="Vale para todos os usuários com perfil Estoquista, inclusive nas próprias solicitações. Eles poderão solicitar, aprovar, rejeitar e confirmar compras aprovadas." ligado={permitir} aoMudar={setPermitir} />
      <p className="mt-4 text-sm text-[var(--tinta-sub)]">{permitir ? "Com esta opção ligada, gestor, dono e estoque podem aprovar e rejeitar requisições." : "Com esta opção desligada, somente gestor e dono aprovam ou rejeitam; o estoque solicita e confirma as compras já aprovadas."}</p>
      <p className="mt-3 text-sm text-[var(--tinta-sub)]">Ao retirar a permissão, novas decisões do estoque serão bloqueadas. As aprovações anteriores e seus responsáveis permanecem no histórico.</p>
      {dados.permissaoComprasAlteradaEm && <p className="mt-3 text-xs text-[var(--tinta-sub)]">Última alteração por {dados.permissaoComprasAlteradaNome ?? "Gestão"} em {dataBR(dados.permissaoComprasAlteradaEm, { timeZone: "America/Sao_Paulo", day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" })}.</p>}
      {estado.erro && <p role="alert" className="mt-3 text-sm text-[var(--danger)]">{estado.erro}</p>}
    </Bloco>
  </form>;
}
