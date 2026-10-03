import { EstoqueDemo } from "../PorPapelDemo";
import { insumos, estoque, movimentacoes, fornecedores } from "../fixtures";

export default function Page() {
  return (
    <EstoqueDemo insumos={insumos} estoque={estoque} movimentacoes={movimentacoes} fornecedores={fornecedores} />
  );
}
