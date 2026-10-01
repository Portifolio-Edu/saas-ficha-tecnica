import { DemoShell } from "@/components/ficha/DemoShell";
import { EstoqueDemo } from "../PorPapelDemo";
import { NOME_RESTAURANTE, insumos, estoque, movimentacoes, fornecedores } from "../fixtures";

export default function Page() {
  return (
    <DemoShell nomeRestaurante={NOME_RESTAURANTE} tituloPagina="Estoque">
      <EstoqueDemo insumos={insumos} estoque={estoque} movimentacoes={movimentacoes} fornecedores={fornecedores} />
    </DemoShell>
  );
}
