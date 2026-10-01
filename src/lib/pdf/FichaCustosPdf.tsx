import { Document, Page, Text, View, pdf } from "@react-pdf/renderer";
import { cor, estilosBase } from "./estilos";
import { formatBRL } from "@/components/charts/format";

export interface LinhaFichaCustosPdf {
  nome: string;
  pesoLiquido: number;
  unidade: string;
  fc: number | null;
  precoUnitario: number;
  custo: number;
  ehPreparo: boolean;
}

export interface DadosFichaCustosPdf {
  nomeRestaurante: string;
  nomePrato: string;
  rendimento: number;
  unidadeRendimento: string;
  linhas: LinhaFichaCustosPdf[];
  cmvTotal: number;
  precoVenda: number;
  margemPct: number;
  margemAlvoPct: number;
  precoSugerido: number;
  geradoEm: string;
}

function FichaCustosDocumento({ dados }: { dados: DadosFichaCustosPdf }) {
  return (
    <Document title={`Ficha de Custos - ${dados.nomePrato}`}>
      <Page size="A4" style={estilosBase.pagina}>
        <View style={estilosBase.cabecalho}>
          <Text style={estilosBase.titulo}>Ficha de Custos — {dados.nomePrato}</Text>
          <Text style={estilosBase.subtitulo}>
            {dados.nomeRestaurante} · uso interno, contém preço e margem — não distribuir · gerado em {dados.geradoEm}
          </Text>
          <Text style={{ marginTop: 6, fontSize: 9, color: cor.sub }}>
            Rende {dados.rendimento} {dados.unidadeRendimento}
          </Text>
        </View>

        <View style={estilosBase.linhaCabecalhoTabela}>
          <Text style={[estilosBase.th, estilosBase.colLabel]}>Insumo</Text>
          <Text style={[estilosBase.th, estilosBase.colNum]}>Peso líq.</Text>
          <Text style={[estilosBase.th, estilosBase.colNum]}>FC</Text>
          <Text style={[estilosBase.th, estilosBase.colNum]}>Preço/unid.</Text>
          <Text style={[estilosBase.th, estilosBase.colNum]}>Custo</Text>
        </View>
        {dados.linhas.map((l, i) => (
          <View key={i} style={estilosBase.linhaTabela}>
            <Text style={estilosBase.colLabel}>{l.nome}{l.ehPreparo ? " (preparo próprio)" : ""}</Text>
            <Text style={estilosBase.colNum}>{l.pesoLiquido}{l.unidade}</Text>
            <Text style={estilosBase.colNum}>{l.fc != null ? l.fc.toFixed(3) : "—"}</Text>
            <Text style={estilosBase.colNum}>{formatBRL(l.precoUnitario)}</Text>
            <Text style={estilosBase.colNum}>{formatBRL(l.custo)}</Text>
          </View>
        ))}
        <View style={estilosBase.linhaTotal}>
          <Text style={{ flex: 5, fontFamily: "Helvetica-Bold" }}>CMV total</Text>
          <Text style={[estilosBase.colNum, { fontFamily: "Helvetica-Bold" }]}>{formatBRL(dados.cmvTotal)}</Text>
        </View>

        <View style={{ marginTop: 24, flexDirection: "row", justifyContent: "space-between" }}>
          <View>
            <Text style={{ fontSize: 8, color: cor.sub, marginBottom: 2 }}>PREÇO DE VENDA</Text>
            <Text style={{ fontSize: 13, fontFamily: "Helvetica-Bold" }}>{formatBRL(dados.precoVenda)}</Text>
          </View>
          <View>
            <Text style={{ fontSize: 8, color: cor.sub, marginBottom: 2 }}>MARGEM NO PREÇO ATUAL</Text>
            <Text style={{ fontSize: 13, fontFamily: "Helvetica-Bold" }}>{dados.margemPct.toFixed(1)}%</Text>
          </View>
          <View>
            <Text style={{ fontSize: 8, color: cor.sub, marginBottom: 2 }}>PREÇO SUGERIDO (MARGEM {dados.margemAlvoPct.toFixed(0)}%)</Text>
            <Text style={{ fontSize: 13, fontFamily: "Helvetica-Bold" }}>{formatBRL(dados.precoSugerido)}</Text>
          </View>
        </View>

        <Text style={estilosBase.rodape} fixed>
          Ficha de Custos gerada pelo sistema de Ficha Técnica. Documento de uso interno do estabelecimento.
        </Text>
      </Page>
    </Document>
  );
}

export async function gerarFichaCustosPdfBlob(dados: DadosFichaCustosPdf): Promise<Blob> {
  return pdf(<FichaCustosDocumento dados={dados} />).toBlob();
}
