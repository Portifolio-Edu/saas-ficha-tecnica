import { describe, expect, it } from "vitest";
import { consolidarDocumentos } from "@/lib/integracoes/documentoFiscal";
import { SEM_FICHA } from "@/lib/integracoes/conciliacao";
import { destinoParaLinha, estaPendente, itensParaSalvar, mapeamentoDosProdutos, resumirPendencias, type ProdutoPdv } from "../produtoPdv";

const CHAVE = "35261012345678000190650010000001011000001015";

function nfce(itens: { cod: string; desc: string; q: string; v: string }[]) {
  const dets = itens
    .map((it, i) => `<det nItem="${i + 1}"><prod><cProd>${it.cod}</cProd><xProd>${it.desc}</xProd><uCom>UN</uCom><qCom>${it.q}</qCom><vProd>${it.v}</vProd></prod><imposto/></det>`)
    .join("");
  return `<nfeProc><NFe><infNFe Id="NFe${CHAVE}"><ide><mod>65</mod><dhEmi>2026-10-02T20:00:00-03:00</dhEmi><tpNF>1</tpNF></ide>${dets}</infNFe></NFe><protNFe><infProt><cStat>100</cStat></infProt></protNFe></nfeProc>`;
}

const resumo = consolidarDocumentos([
  {
    nome: "n1.xml",
    conteudo: nfce([
      { cod: "1", desc: "PIZZA MARGUERITA G", q: "10", v: "500" },
      { cod: "2", desc: "COCA 2L", q: "5", v: "40" },
      { cod: "3", desc: "ESCONDIDINHO", q: "7", v: "210" },
    ]),
  },
]);

const produto = (p: Partial<ProdutoPdv>): ProdutoPdv => ({
  id: "x",
  canal: "importacao",
  chave: "1|A",
  codigo: null,
  descricao: "A",
  receitaId: null,
  semFicha: false,
  ultimaQuantidade: null,
  ultimoValor: null,
  ultimaVendaEm: null,
  ...p,
});

describe("produto do PDV sem ficha é pendência", () => {
  it("pendente é o que não tem ficha nem foi marcado 'não tem ficha'", () => {
    expect(estaPendente(produto({}))).toBe(true);
    expect(estaPendente(produto({ receitaId: "r1" }))).toBe(false);
    expect(estaPendente(produto({ semFicha: true }))).toBe(false);
  });

  it("soma a pendência (quantos produtos e quanto vendeu)", () => {
    const lista = [produto({ chave: "a", ultimoValor: 210.5 }), produto({ chave: "b", ultimoValor: 40.25 }), produto({ chave: "c", receitaId: "r1", ultimoValor: 900 }), produto({ chave: "d", semFicha: true, ultimoValor: 70 })];
    expect(resumirPendencias(lista)).toEqual({ produtos: 2, valor: 250.75 });
    expect(resumirPendencias([])).toEqual({ produtos: 0, valor: 0 });
  });

  it("o mapeamento da tela só traz o que foi decidido", () => {
    const lista = [produto({ chave: "a", receitaId: "r1" }), produto({ chave: "b", semFicha: true }), produto({ chave: "c" })];
    expect(mapeamentoDosProdutos(lista)).toEqual({ a: "r1", b: SEM_FICHA });
  });
});

describe("itensParaSalvar: nada some em silêncio", () => {
  const chavePizza = resumo.produtos.find((p) => p.descricao === "PIZZA MARGUERITA G")!.chave;
  const chaveCoca = resumo.produtos.find((p) => p.descricao === "COCA 2L")!.chave;

  it("manda todos os produtos da importação, inclusive o sem decisão", () => {
    const itens = itensParaSalvar(resumo, { [chavePizza]: "r-pizza", [chaveCoca]: SEM_FICHA });
    expect(itens).toHaveLength(3);
    expect(itens.find((i) => i.descricao === "PIZZA MARGUERITA G")).toMatchObject({ receitaId: "r-pizza", semFicha: false, quantidade: 10, valor: 500, data: "2026-10-02" });
    expect(itens.find((i) => i.descricao === "COCA 2L")).toMatchObject({ receitaId: null, semFicha: true });
    // O escondidinho não foi decidido: vai como pendente (nem ficha, nem "sem ficha").
    expect(itens.find((i) => i.descricao === "ESCONDIDINHO")).toMatchObject({ receitaId: null, semFicha: false, quantidade: 7, valor: 210 });
  });

  it("ficha que não existe mais vira pendente em vez de derrubar a gravação", () => {
    const itens = itensParaSalvar(resumo, { [chavePizza]: "r-apagada" }, new Set(["r-outra"]));
    expect(itens.find((i) => i.descricao === "PIZZA MARGUERITA G")).toMatchObject({ receitaId: null, semFicha: false });
  });

  it("respeita os limites da tabela: valor negativo vira 0 e descrição longa é cortada", () => {
    const estranho = { ...resumo, produtos: [{ chave: "9|X", codigo: "9", descricao: "X".repeat(400), unidade: "", quantidade: 1, valor: -12.5 }] };
    const [item] = itensParaSalvar(estranho, {});
    expect(item.valor).toBe(0);
    expect(item.descricao).toHaveLength(300);
    expect(item.chave).toBe("9|X");
  });

  it("'não tem ficha' continua valendo mesmo com a lista de fichas válidas", () => {
    const itens = itensParaSalvar(resumo, { [chaveCoca]: SEM_FICHA }, new Set());
    expect(itens.find((i) => i.descricao === "COCA 2L")).toMatchObject({ receitaId: null, semFicha: true });
  });
});

describe("destinoParaLinha", () => {
  it("traduz o que a pessoa escolheu na tela", () => {
    expect(destinoParaLinha("r1")).toEqual({ receitaId: "r1", semFicha: false });
    expect(destinoParaLinha(SEM_FICHA)).toEqual({ receitaId: null, semFicha: true });
    expect(destinoParaLinha(null)).toEqual({ receitaId: null, semFicha: false });
    expect(destinoParaLinha("")).toEqual({ receitaId: null, semFicha: false });
  });
});
