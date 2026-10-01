import { describe, expect, it } from "vitest";
import { lerNotaDeCompra } from "../documentoFiscal";

const XML = `<?xml version="1.0"?><nfeProc><NFe><infNFe Id="NFe35260912345678000190550010000012341000012345" versao="4.00">
<ide><mod>55</mod><nNF>1234</nNF><dhEmi>2026-09-25T08:00:00-03:00</dhEmi><tpNF>1</tpNF></ide>
<emit><CNPJ>12345678000190</CNPJ><xNome>HORTIFRUTI VERDE LTDA</xNome><xFant>Verde Horta</xFant></emit>
<det nItem="1"><prod><cProd>10</cProd><xProd>TOMATE ITALIANO KG</xProd><uCom>KG</uCom><qCom>12.5000</qCom><vUnCom>6.9000</vUnCom><vProd>86.25</vProd></prod></det>
<det nItem="2"><prod><cProd>22</cProd><xProd>CEBOLA BRANCA</xProd><uCom>KG</uCom><qCom>5</qCom><vUnCom>4.5</vUnCom><vProd>22.50</vProd><vDesc>2.50</vDesc></prod></det>
</infNFe></NFe></nfeProc>`;

describe("nota de compra (NF-e 55)", () => {
  it("lê fornecedor, número e itens", () => {
    const nota = lerNotaDeCompra(XML);
    expect(nota).toMatchObject({ numero: "1234", fornecedor: "Verde Horta", cnpjFornecedor: "12345678000190", emitidaEm: "2026-09-25" });
    if ("erro" in nota) throw new Error();
    expect(nota.itens).toEqual([
      { codigo: "10", descricao: "TOMATE ITALIANO KG", quantidade: 12.5, unidade: "KG", valorUnitario: 6.9, valor: 86.25 },
      { codigo: "22", descricao: "CEBOLA BRANCA", quantidade: 5, unidade: "KG", valorUnitario: 4.5, valor: 20 },
    ]);
  });
  it("recusa o que não é NF-e de compra", () => {
    expect(lerNotaDeCompra("<xml/>")).toEqual({ erro: "Não é o XML de uma NF-e." });
    expect(lerNotaDeCompra(XML.replace("<mod>55</mod>", "<mod>65</mod>"))).toEqual({ erro: "Não é NF-e de compra (modelo 55)." });
  });
});
