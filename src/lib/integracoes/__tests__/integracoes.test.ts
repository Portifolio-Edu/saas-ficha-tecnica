import { describe, expect, it } from "vitest";
import { consolidarDocumentos, lerDocumentoFiscal } from "../documentoFiscal";
import { consolidarPlanilha, dataBRParaISO, lerCsv, numeroBR, sugerirColunas } from "../planilhaVendas";
import { conciliar, semelhanca, sugerirFicha, SEM_FICHA } from "../conciliacao";

const CHAVE_A = "35260912345678000190650010000001011000001015";
const CHAVE_B = "35260912345678000190650010000001021000001020";

function nfce(chave: string, data: string, itens: { cod: string; desc: string; q: string; v: string; desc2?: string }[], cStat = "100") {
  const dets = itens
    .map(
      (it, i) => `<det nItem="${i + 1}"><prod><cProd>${it.cod}</cProd><cEAN>SEM GTIN</cEAN><xProd>${it.desc}</xProd><NCM>21069090</NCM><CFOP>5102</CFOP><uCom>UN</uCom><qCom>${it.q}</qCom><vUnCom>0</vUnCom><vProd>${it.v}</vProd>${it.desc2 ? `<vDesc>${it.desc2}</vDesc>` : ""}<indTot>1</indTot></prod><imposto/></det>`,
    )
    .join("");
  return `<?xml version="1.0" encoding="UTF-8"?><nfeProc xmlns="http://www.portalfiscal.inf.br/nfe" versao="4.00"><NFe><infNFe Id="NFe${chave}" versao="4.00"><ide><cUF>35</cUF><mod>65</mod><serie>1</serie><dhEmi>${data}T20:15:00-03:00</dhEmi><tpNF>1</tpNF></ide>${dets}<total><ICMSTot><vNF>0</vNF></ICMSTot></total></infNFe></NFe><protNFe versao="4.00"><infProt><chNFe>${chave}</chNFe><cStat>${cStat}</cStat></infProt></protNFe></nfeProc>`;
}

describe("lerDocumentoFiscal", () => {
  it("lê NFC-e com itens, desconto e data", () => {
    const doc = lerDocumentoFiscal(nfce(CHAVE_A, "2026-09-16", [{ cod: "101", desc: "PIZZA MARGUERITA G", q: "2.0000", v: "105.80", desc2: "5.80" }]));
    expect(doc).toMatchObject({ tipo: "venda", modelo: "NFC-e", chave: CHAVE_A, emitidoEm: "2026-09-16", cancelada: false });
    if (doc.tipo !== "venda") throw new Error();
    expect(doc.itens[0]).toEqual({ codigo: "101", descricao: "PIZZA MARGUERITA G", quantidade: 2, unidade: "UN", valor: 100 });
  });

  it("marca NFC-e com protocolo de cancelamento", () => {
    const doc = lerDocumentoFiscal(nfce(CHAVE_A, "2026-09-16", [{ cod: "1", desc: "X", q: "1", v: "10" }], "135"));
    expect(doc).toMatchObject({ tipo: "venda", cancelada: true });
  });

  it("reconhece evento de cancelamento", () => {
    const evento = `<procEventoNFe versao="1.00"><evento><infEvento Id="ID110111${CHAVE_B}01"><chNFe>${CHAVE_B}</chNFe><tpEvento>110111</tpEvento></infEvento></evento></procEventoNFe>`;
    expect(lerDocumentoFiscal(evento)).toEqual({ tipo: "cancelamento", chave: CHAVE_B });
  });

  it("ignora NF-e modelo 55 (nota de compra)", () => {
    const nfe = nfce(CHAVE_A, "2026-09-16", [{ cod: "1", desc: "CAMARAO", q: "5", v: "400" }]).replace("<mod>65</mod>", "<mod>55</mod>");
    expect(lerDocumentoFiscal(nfe).tipo).toBe("ignorado");
  });

  it("lê CF-e SAT com data AAAAMMDD e vItem", () => {
    const sat = `<CFe><infCFe Id="CFe35260912345678000190590001234560001231234567" versao="0.08"><ide><dEmi>20260917</dEmi><hEmi>193000</hEmi></ide><det nItem="1"><prod><cProd>7</cProd><xProd>LASANHA BOLONHESA</xProd><uCom>un</uCom><qCom>1.0000</qCom><vProd>46.90</vProd><vItem>44.90</vItem></prod></det></infCFe></CFe>`;
    const doc = lerDocumentoFiscal(sat);
    expect(doc).toMatchObject({ tipo: "venda", modelo: "CF-e SAT", emitidoEm: "2026-09-17" });
    if (doc.tipo !== "venda") throw new Error();
    expect(doc.itens[0].valor).toBe(44.9);
  });

  it("decodifica entidades na descrição", () => {
    const doc = lerDocumentoFiscal(nfce(CHAVE_A, "2026-09-16", [{ cod: "9", desc: "FILE &amp; FRITAS", q: "1", v: "50" }]));
    if (doc.tipo !== "venda") throw new Error();
    expect(doc.itens[0].descricao).toBe("FILE & FRITAS");
  });

  it("recusa arquivo que não é nota", () => {
    expect(lerDocumentoFiscal("<html></html>").tipo).toBe("ignorado");
  });
});

describe("consolidarDocumentos", () => {
  it("soma por produto, tira cancelada por evento e nota repetida", () => {
    const a = nfce(CHAVE_A, "2026-09-16", [
      { cod: "101", desc: "PIZZA MARGUERITA G", q: "2", v: "105.80" },
      { cod: "900", desc: "COCA COLA LATA", q: "2", v: "14.00" },
    ]);
    const b = nfce(CHAVE_B, "2026-09-18", [{ cod: "101", desc: "PIZZA MARGUERITA G", q: "1", v: "52.90" }]);
    const cancelB = `<procEventoNFe><evento><infEvento><chNFe>${CHAVE_B}</chNFe><tpEvento>110111</tpEvento></infEvento></evento></procEventoNFe>`;
    const r = consolidarDocumentos([
      { nome: "a.xml", conteudo: a },
      { nome: "a-copia.xml", conteudo: a },
      { nome: "b.xml", conteudo: b },
      { nome: "b-canc.xml", conteudo: cancelB },
    ]);
    expect(r.documentos).toBe(1);
    expect(r.repetidos).toBe(1);
    expect(r.cancelados).toBe(1);
    expect(r.inicio).toBe("2026-09-16");
    expect(r.faturamento).toBe(119.8);
    expect(r.produtos.find((p) => p.codigo === "101")?.quantidade).toBe(2);
  });
});

describe("planilha", () => {
  it("números e datas em pt-BR", () => {
    expect(numeroBR("1.234,56")).toBe(1234.56);
    expect(numeroBR("R$ 12,00")).toBe(12);
    expect(numeroBR("1.5")).toBe(1.5);
    expect(numeroBR("1.234")).toBe(1234);
    expect(numeroBR("1,234.50")).toBe(1234.5);
    expect(dataBRParaISO("22/09/2026 13:40")).toBe("2026-09-22");
    expect(dataBRParaISO("2026-09-22")).toBe("2026-09-22");
  });

  it("lê CSV com ; e aspas, sugere colunas e soma", () => {
    const csv = 'Data;Código;Produto;Qtde;Valor Total\n16/09/2026;101;"PIZZA MARGUERITA; G";2;105,80\n17/09/2026;101;"PIZZA MARGUERITA; G";1;52,90\n17/09/2026;900;COCA COLA LATA;3;21,00\nTOTAL;;;6;179,70\n';
    const p = lerCsv(csv);
    expect(p.cabecalho).toEqual(["Data", "Código", "Produto", "Qtde", "Valor Total"]);
    const col = sugerirColunas(p.cabecalho);
    expect(col).toEqual({ data: 0, codigo: 1, produto: 2, quantidade: 3, valor: 4 });
    const r = consolidarPlanilha(p, col);
    expect(r.produtos).toHaveLength(2);
    expect(r.produtos[0]).toMatchObject({ descricao: "PIZZA MARGUERITA; G", quantidade: 3, valor: 158.7 });
    expect(r.faturamento).toBe(179.7);
    expect([r.inicio, r.fim]).toEqual(["2026-09-16", "2026-09-17"]);
  });
});

describe("conciliação", () => {
  const fichas = [
    { id: "pt-margherita", nome: "Pizza Margherita" },
    { id: "pt-calabresa", nome: "Pizza Calabresa" },
    { id: "pt-parmegiana", nome: "Frango à Parmegiana" },
    { id: "pt-risoto", nome: "Risoto de Camarão" },
  ];
  const produto = (descricao: string) => ({ chave: descricao, codigo: "", descricao, unidade: "UN", quantidade: 1, valor: 10 });

  it("sugere a ficha certa com nome de PDV abreviado ou com erro de digitação", () => {
    expect(sugerirFicha(produto("PIZZA MARGUERITA G"), fichas)).toBe("pt-margherita");
    expect(sugerirFicha(produto("PIZZA CALABRESA GRANDE"), fichas)).toBe("pt-calabresa");
    expect(sugerirFicha(produto("PARMEGIANA DE FRANGO"), fichas)).toBe("pt-parmegiana");
    expect(sugerirFicha(produto("RISOTO CAMARAO"), fichas)).toBe("pt-risoto");
  });

  it("não sugere nada pra bebida", () => {
    expect(sugerirFicha(produto("COCA COLA LATA 350ML"), fichas)).toBeNull();
    expect(semelhanca("PIZZA DOCE CHOCOLATE", "Pizza Margherita")).toBeLessThan(0.75);
  });

  it("separa vendas por ficha e faturamento sem ficha", () => {
    const resumo = {
      origem: "xml" as const,
      documentos: 2,
      cancelados: 0,
      repetidos: 0,
      ignorados: [],
      inicio: null,
      fim: null,
      faturamento: 130,
      produtos: [
        { chave: "a", codigo: "1", descricao: "PIZZA", unidade: "UN", quantidade: 2, valor: 100 },
        { chave: "b", codigo: "2", descricao: "COCA", unidade: "UN", quantidade: 2, valor: 20 },
        { chave: "c", codigo: "3", descricao: "NOVO", unidade: "UN", quantidade: 1, valor: 10 },
      ],
    };
    const r = conciliar(resumo, { a: "pt-margherita", b: SEM_FICHA });
    expect(r.vendas).toEqual([{ receitaId: "pt-margherita", quantidade: 2, valor: 100 }]);
    expect(r.faturamentoSemFicha).toBe(30);
    expect(r.pendentes).toBe(1);
  });
});
