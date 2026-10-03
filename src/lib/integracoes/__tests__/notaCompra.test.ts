import { describe, expect, it } from "vitest";
import { lerNotaDeCompra } from "../documentoFiscal";

const XML = `<?xml version="1.0"?><nfeProc><NFe><infNFe Id="NFe35260912345678000190550010000012341000012345" versao="4.00">
<ide><mod>55</mod><serie>1</serie><nNF>1234</nNF><dhEmi>2026-09-25T08:00:00-03:00</dhEmi><tpNF>1</tpNF></ide>
<emit><CNPJ>12345678000190</CNPJ><xNome>HORTIFRUTI VERDE LTDA</xNome><xFant>Verde Horta</xFant></emit>
<det nItem="1"><prod><cProd>10</cProd><xProd>TOMATE ITALIANO KG</xProd><uCom>KG</uCom><qCom>12.5000</qCom><vUnCom>6.9000</vUnCom><vProd>86.25</vProd></prod></det>
<det nItem="2"><prod><cProd>22</cProd><xProd>CEBOLA BRANCA</xProd><uCom>KG</uCom><qCom>5</qCom><vUnCom>4.5</vUnCom><vProd>22.50</vProd><vDesc>2.50</vDesc></prod></det>
<total><ICMSTot><vNF>106.25</vNF></ICMSTot></total>
</infNFe></NFe></nfeProc>`;

describe("nota de compra (NF-e 55)", () => {
  it("lê fornecedor, número e itens", () => {
    const nota = lerNotaDeCompra(XML);
    expect(nota).toMatchObject({ numero: "1234", serie: "1", fornecedor: "Verde Horta", cnpjFornecedor: "12345678000190", emitidaEm: "2026-09-25", valorTotal: 106.25 });
    if ("erro" in nota) throw new Error();
    expect(nota.chave).toMatch(/^\d{44}$/);
    expect(nota.itens).toEqual([
      { codigo: "10", descricao: "TOMATE ITALIANO KG", quantidade: 12.5, unidade: "KG", valorUnitario: 6.9, valor: 86.25, custosExtras: 0 },
      { codigo: "22", descricao: "CEBOLA BRANCA", quantidade: 5, unidade: "KG", valorUnitario: 4.5, valor: 20, custosExtras: 0 },
    ]);
  });

  it("recusa o que não é NF-e de compra", () => {
    expect(lerNotaDeCompra("<xml/>")).toEqual({ erro: "Não é o XML de uma NF-e." });
    expect(lerNotaDeCompra(XML.replace("<mod>55</mod>", "<mod>65</mod>"))).toEqual({ erro: "Não é NF-e de compra (modelo 55)." });
  });

  it("recusa nota cancelada pelo protocolo", () => {
    const cancelada = XML.replace("</nfeProc>", `<protNFe versao="4.00"><infProt><cStat>101</cStat></infProt></protNFe></nfeProc>`);
    expect(lerNotaDeCompra(cancelada)).toEqual({ erro: "Essa nota está cancelada." });
    const autorizada = XML.replace("</nfeProc>", `<protNFe versao="4.00"><infProt><cStat>100</cStat></infProt></protNFe></nfeProc>`);
    expect("erro" in lerNotaDeCompra(autorizada)).toBe(false);
  });

  it("soma frete, seguro, outras despesas, IPI e ICMS-ST do item no custo extra", () => {
    const comExtras = XML.replace(
      `<vUnCom>6.9000</vUnCom><vProd>86.25</vProd></prod></det>`,
      `<vUnCom>6.9000</vUnCom><vProd>86.25</vProd><vFrete>3.10</vFrete><vSeg>0.40</vSeg><vOutro>1.00</vOutro></prod><imposto><ICMS><ICMS10><vICMSST>2.50</vICMSST></ICMS10></ICMS><IPI><IPITrib><vIPI>1.75</vIPI></IPITrib></IPI></imposto></det>`,
    );
    const nota = lerNotaDeCompra(comExtras);
    if ("erro" in nota) throw new Error();
    expect(nota.itens[0].custosExtras).toBe(8.75);
    expect(nota.itens[0].valor).toBe(86.25);
    // O segundo item não tem nada a mais: o extra de um não vaza pro outro.
    expect(nota.itens[1].custosExtras).toBe(0);
  });
});
