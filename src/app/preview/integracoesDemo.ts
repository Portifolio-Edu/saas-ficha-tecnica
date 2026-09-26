// INTEGRACOES (2026-09-23) -- dados SIMULADOS da tela de Integrações na demo.
// Escolha do usuário: na /preview, iFood e Saipos aparecem conectados, com pedidos
// chegando, sempre com o selo "demo". Nada disto existe no app de verdade.
// Valores montados com os preços dos pratos da demo (fixtures), pra bater com as
// outras telas. As notas de exemplo são XML no formato da NFC-e com chave e CNPJ
// fictícios, só pra testar a importação sem ter os arquivos do PDV.

import { pratos } from "./fixtures";
import type { PedidoRecebido } from "@/lib/integracoes/pdvs";

export const CANAIS_CONECTADOS_DEMO = ["ifood", "saipos"];

const preco = (id: string) => pratos.find((p) => p.id === id)?.precoVenda ?? 0;
const nome = (id: string) => pratos.find((p) => p.id === id)?.nomePrato ?? id;

function pedido(id: string, minutosAtras: number, canalId: string, itens: [string, number][], bebidas = 0): PedidoRecebido {
  const agora = new Date("2026-09-22T20:40:00-03:00").getTime();
  return {
    id,
    recebidoEm: new Date(agora - minutosAtras * 60_000).toISOString(),
    canalId,
    itens: [...itens.map(([pid, q]) => ({ nome: nome(pid), quantidade: q })), ...(bebidas ? [{ nome: "Coca-Cola lata", quantidade: bebidas }] : [])],
    valor: Math.round((itens.reduce((s, [pid, q]) => s + preco(pid) * q, 0) + bebidas * 7) * 100) / 100,
  };
}

export const PEDIDOS_RECENTES_DEMO: PedidoRecebido[] = [
  pedido("p1", 2, "ifood", [["pt-margherita", 1], ["pt-calabresa", 1]], 2),
  pedido("p2", 5, "saipos", [["pt-risoto-camarao", 2]], 0),
  pedido("p3", 9, "ifood", [["pt-lasanha", 1]], 1),
  pedido("p4", 14, "saipos", [["pt-parmegiana", 2], ["pt-caprese", 1]], 3),
  pedido("p5", 21, "ifood", [["pt-margherita", 2]], 0),
];

export const RESUMO_HOJE_DEMO: Record<string, { pedidos: number; valor: number }> = {
  ifood: { pedidos: 23, valor: 1421.7 },
  saipos: { pedidos: 15, valor: 1238.4 },
};

// ---------- Notas de exemplo (XML NFC-e) ----------

const NOME_NO_PDV: Record<string, string> = {
  "pt-margherita": "PIZZA MARGUERITA G",
  "pt-calabresa": "PIZZA CALABRESA G",
  "pt-parmegiana": "PARMEGIANA DE FRANGO",
  "pt-risoto-camarao": "RISOTO CAMARAO",
  "pt-lasanha": "LASANHA BOLONHESA",
  "pt-caprese": "SALADA CAPRESE",
};
const CODIGO_NO_PDV: Record<string, string> = {
  "pt-margherita": "101",
  "pt-calabresa": "102",
  "pt-parmegiana": "201",
  "pt-risoto-camarao": "202",
  "pt-lasanha": "203",
  "pt-caprese": "301",
};
// Itens sem ficha técnica (entram no faturamento, não no CMV teórico).
const SEM_FICHA = [
  { codigo: "901", nome: "COCA COLA LATA 350ML", preco: 7 },
  { codigo: "902", nome: "AGUA MINERAL 500ML", preco: 5 },
  { codigo: "903", nome: "SUCO LARANJA 500ML", preco: 12 },
  { codigo: "950", nome: "TIRAMISU", preco: 24 },
];

function aleatorio(semente: number) {
  let s = semente;
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296;
    return s / 4294967296;
  };
}

function chaveNfce(numero: number): string {
  // 35 (SP) + AAMM + CNPJ fictício + mod 65 + série 001 + número + tpEmis 1 + código + DV
  return `35260912345678000190650010${String(numero).padStart(8, "0")}1${String(10000000 + numero).slice(-8)}${numero % 10}`;
}

function xmlNfce(chave: string, dia: string, itens: { codigo: string; nome: string; q: number; v: number }[]): string {
  const dets = itens
    .map(
      (it, i) =>
        `<det nItem="${i + 1}"><prod><cProd>${it.codigo}</cProd><cEAN>SEM GTIN</cEAN><xProd>${it.nome}</xProd><NCM>21069090</NCM><CFOP>5102</CFOP><uCom>UN</uCom><qCom>${it.q.toFixed(4)}</qCom><vUnCom>${(it.v / it.q).toFixed(2)}</vUnCom><vProd>${it.v.toFixed(2)}</vProd><indTot>1</indTot></prod></det>`,
    )
    .join("");
  return `<?xml version="1.0" encoding="UTF-8"?><nfeProc xmlns="http://www.portalfiscal.inf.br/nfe" versao="4.00"><NFe><infNFe Id="NFe${chave}" versao="4.00"><ide><cUF>35</cUF><mod>65</mod><serie>1</serie><dhEmi>${dia}T20:00:00-03:00</dhEmi><tpNF>1</tpNF></ide><emit><CNPJ>12345678000190</CNPJ><xNome>CANTINA BELLA NOTTE (EXEMPLO)</xNome></emit>${dets}</infNFe></NFe><protNFe versao="4.00"><infProt><chNFe>${chave}</chNFe><cStat>100</cStat></infProt></protNFe></nfeProc>`;
}

/** 60 notas de 16/09 a 22/09, uma cancelada (evento) e uma repetida, pra mostrar o tratamento. */
export function gerarNotasExemplo(): { nome: string; conteudo: string }[] {
  const r = aleatorio(20260922);
  const ids = Object.keys(NOME_NO_PDV);
  const arquivos: { nome: string; conteudo: string }[] = [];
  for (let n = 1; n <= 60; n++) {
    const dia = `2026-09-${String(16 + Math.floor((n - 1) / 9)).padStart(2, "0")}`;
    const itens: { codigo: string; nome: string; q: number; v: number }[] = [];
    const qtdPratos = 1 + Math.floor(r() * 3);
    for (let i = 0; i < qtdPratos; i++) {
      const id = ids[Math.floor(r() * ids.length)];
      const q = 1 + Math.floor(r() * 2);
      itens.push({ codigo: CODIGO_NO_PDV[id], nome: NOME_NO_PDV[id], q, v: preco(id) * q });
    }
    if (r() < 0.7) {
      const b = SEM_FICHA[Math.floor(r() * SEM_FICHA.length)];
      const q = 1 + Math.floor(r() * 3);
      itens.push({ codigo: b.codigo, nome: b.nome, q, v: b.preco * q });
    }
    const chave = chaveNfce(n);
    arquivos.push({ nome: `NFCe${chave}.xml`, conteudo: xmlNfce(chave, dia, itens) });
  }
  const canceladaChave = chaveNfce(17);
  arquivos.push({
    nome: `CANC${canceladaChave}.xml`,
    conteudo: `<?xml version="1.0" encoding="UTF-8"?><procEventoNFe versao="1.00"><evento><infEvento><chNFe>${canceladaChave}</chNFe><tpEvento>110111</tpEvento><detEvento><descEvento>Cancelamento</descEvento></detEvento></infEvento></evento></procEventoNFe>`,
  });
  arquivos.push({ nome: `NFCe${chaveNfce(3)}-copia.xml`, conteudo: arquivos[2].conteudo });
  return arquivos;
}
