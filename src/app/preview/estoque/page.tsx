import { DemoShell } from "@/components/ficha/DemoShell";
import { EstoqueClient } from "@/app/estoque/EstoqueClient";
import { NOME_RESTAURANTE, insumos, estoque, movimentacoes, fornecedores } from "../fixtures";

export default function Page() {
  return (
    <DemoShell nomeRestaurante={NOME_RESTAURANTE} tituloPagina="Estoque">
      <EstoqueClient insumos={insumos} estoque={estoque} movimentacoes={movimentacoes} fornecedores={fornecedores} />
    </DemoShell>
  );
}
