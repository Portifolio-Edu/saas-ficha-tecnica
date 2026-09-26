import { Document, Page, Text, View, StyleSheet, pdf } from "@react-pdf/renderer";
import type { ConteudoRotuloVarejo } from "@/components/nutricional/RotuloVarejo";

// RÓTULO PARA VAREJO (2026-09-26): PDF do rótulo de supermercado pra enviar à
// gráfica/designer. Mesma montagem da prévia (RotuloVarejo.tsx): nome e peso,
// lupa (aviso), ingredientes, alergênicos, glúten/lactose, tabela 100 g +
// porção + %VD (IN 75), conservação, preparo e fabricante. Fundo branco e
// letra preta sempre. Faltando dado obrigatório, sai com a marca RASCUNHO.

const PRETO = "#000000";
const estilos = StyleSheet.create({
  pagina: { padding: 32, fontSize: 9.5, fontFamily: "Helvetica", backgroundColor: "#FFFFFF", color: PRETO, lineHeight: 1.35 },
  topo: { flexDirection: "row", justifyContent: "space-between", marginBottom: 10 },
  nome: { fontSize: 15, fontFamily: "Helvetica-Bold", textTransform: "uppercase", maxWidth: 360 },
  peso: { fontSize: 8, textAlign: "right" },
  pesoValor: { fontSize: 11, fontFamily: "Helvetica-Bold" },
  bloco: { marginBottom: 7 },
  negrito: { fontFamily: "Helvetica-Bold" },
  lupa: { borderWidth: 2, borderColor: PRETO, padding: 6, marginBottom: 8, width: 150 },
  lupaTitulo: { fontSize: 8, fontFamily: "Helvetica-Bold" },
  lupaItem: { fontSize: 11, fontFamily: "Helvetica-Bold", textTransform: "uppercase" },
  lupaNota: { fontSize: 6.5, marginTop: 2 },
  tabela: { borderWidth: 1.5, borderColor: PRETO, padding: 6, width: 300, marginVertical: 8 },
  tabTitulo: { fontSize: 11, fontFamily: "Helvetica-Bold", borderBottomWidth: 1.5, borderBottomColor: PRETO, paddingBottom: 2 },
  tabPorcao: { fontSize: 8, borderBottomWidth: 0.75, borderBottomColor: PRETO, paddingVertical: 2 },
  linha: { flexDirection: "row", borderBottomWidth: 0.5, borderBottomColor: "#666666", paddingVertical: 1.5 },
  cab: { flexDirection: "row", borderBottomWidth: 1.5, borderBottomColor: PRETO, paddingVertical: 1.5 },
  colR: { flex: 3.2, fontSize: 8 },
  colN: { flex: 1.3, fontSize: 8, textAlign: "right" },
  colV: { flex: 0.8, fontSize: 8, textAlign: "right" },
  nota: { fontSize: 7, marginTop: 2 },
  faltando: { color: "#B42318", fontFamily: "Helvetica-Bold" },
  rascunho: { position: "absolute", top: 300, left: 60, fontSize: 64, color: "#B42318", opacity: 0.18, transform: "rotate(-30deg)", fontFamily: "Helvetica-Bold" },
  rodape: { position: "absolute", bottom: 20, left: 32, right: 32, fontSize: 6.5, color: "#333333" },
});

function Faltando() {
  return <Text style={estilos.faltando}>[faltando]</Text>;
}

function Documento({ c, rascunho, geradoEm }: { c: ConteudoRotuloVarejo; rascunho: boolean; geradoEm: string }) {
  const porcao = c.pesoPorcao ? `${c.pesoPorcao} ${c.unidadeBase}` : "—";
  return (
    <Document title={`Rótulo para varejo - ${c.nomeProduto}`}>
      <Page size="A4" style={estilos.pagina}>
        {rascunho && <Text style={estilos.rascunho} fixed>RASCUNHO</Text>}
        <View style={estilos.topo}>
          <Text style={estilos.nome}>{c.nomeProduto}</Text>
          <View>
            <Text style={estilos.peso}>PESO LÍQUIDO</Text>
            <Text style={[estilos.peso, estilos.pesoValor]}>{c.pesoLiquido || "[faltando]"}</Text>
          </View>
        </View>

        {c.altoEm.length > 0 && (
          <View style={estilos.lupa}>
            <Text style={estilos.lupaTitulo}>ALTO EM</Text>
            {c.altoEm.map((n) => (
              <Text key={n} style={estilos.lupaItem}>{n}</Text>
            ))}
            <Text style={estilos.lupaNota}>Aplicar a arte oficial da IN 75/2020, Anexo XVII (posição e tamanho: Anexo XVIII).</Text>
          </View>
        )}

        <Text style={estilos.bloco}>{c.ingredientes ?? "INGREDIENTES: "}{!c.ingredientes && <Faltando />}</Text>
        <Text style={[estilos.bloco, estilos.negrito]}>{c.alergicos ?? "ALÉRGICOS: "}{!c.alergicos && <Faltando />}</Text>
        <Text style={[estilos.bloco, estilos.negrito]}>
          {c.gluten ?? "[glúten faltando]"}
          {c.lactose ? `  ·  ${c.lactose}` : ""}
        </Text>

        <View style={estilos.tabela}>
          <Text style={estilos.tabTitulo}>INFORMAÇÃO NUTRICIONAL</Text>
          <Text style={estilos.tabPorcao}>
            Porções por embalagem: {c.porcoesPorEmbalagem ?? "—"}
            {"\n"}Porção: {porcao} ({c.medidaCaseira || "medida caseira"})
          </Text>
          <View style={estilos.cab}>
            <Text style={estilos.colR}> </Text>
            <Text style={[estilos.colN, estilos.negrito]}>100 {c.unidadeBase}</Text>
            <Text style={[estilos.colN, estilos.negrito]}>{porcao}</Text>
            <Text style={[estilos.colV, estilos.negrito]}>%VD*</Text>
          </View>
          {c.linhas.map((l) => (
            <View key={l.rotulo} style={estilos.linha}>
              <Text style={[estilos.colR, l.nivel ? { paddingLeft: 8 } : estilos.negrito]}>{l.rotulo}</Text>
              <Text style={estilos.colN}>{l.por100}</Text>
              <Text style={estilos.colN}>{l.porPorcao}</Text>
              <Text style={estilos.colV}>{l.vd}</Text>
            </View>
          ))}
          <Text style={estilos.nota}>*Percentual de valores diários fornecidos pela porção.</Text>
        </View>

        <Text style={estilos.bloco}>
          <Text style={estilos.negrito}>CONSERVAÇÃO: </Text>
          {c.conservacao || "[faltando]"}
        </Text>
        {c.modoPreparo ? (
          <Text style={estilos.bloco}>
            <Text style={estilos.negrito}>MODO DE PREPARO: </Text>
            {c.modoPreparo}
          </Text>
        ) : null}
        <Text style={[estilos.bloco, { fontSize: 8.5 }]}>
          <Text style={estilos.negrito}>Fabricado por: </Text>
          {c.fabricante || "[faltando]"} · {c.endereco || "[faltando]"}
          {"\n"}Lote e validade: impressos na embalagem.
        </Text>

        <Text style={estilos.rodape} fixed>
          Gerado em {geradoEm} pelo Ficha Técnica. Tabela conforme RDC 429/2020 e IN 75/2020 (valores arredondados pelo Anexo IV); alergênicos RDC 26/2015; glúten Lei
          10.674/2003; lactose RDC 136/2017. Revisão final e aprovação da arte: responsável técnico.
        </Text>
      </Page>
    </Document>
  );
}

export async function gerarRotuloVarejoPdfBlob(c: ConteudoRotuloVarejo, rascunho: boolean): Promise<Blob> {
  return pdf(<Documento c={c} rascunho={rascunho} geradoEm={new Date().toLocaleDateString("pt-BR")} />).toBlob();
}
