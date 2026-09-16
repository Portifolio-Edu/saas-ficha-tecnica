import { Document, Page, Text, View, pdf } from "@react-pdf/renderer";
import { cor, estilosBase } from "./estilos";

export interface LinhaFichaOperacionalPdf {
  nome: string;
  pesoLiquido: number;
  unidade: string;
  ehPreparo: boolean;
}

export interface DadosFichaOperacionalPdf {
  nomeRestaurante: string;
  nomePrato: string;
  rendimento: number;
  unidadeRendimento: string;
  pesoPorcaoG: number | null;
  linhas: LinhaFichaOperacionalPdf[];
  modoPreparo: string | null;
  geradoEm: string;
}

function FichaOperacionalDocumento({ dados }: { dados: DadosFichaOperacionalPdf }) {
  const paragrafos = dados.modoPreparo ? dados.modoPreparo.split("\n").filter((p) => p.trim()) : [];

  return (
    <Document title={`Ficha Operacional - ${dados.nomePrato}`}>
      <Page size="A4" style={estilosBase.pagina}>
        <View style={estilosBase.cabecalho}>
          <Text style={estilosBase.titulo}>Ficha Operacional — {dados.nomePrato}</Text>
          <Text style={estilosBase.subtitulo}>
            {dados.nomeRestaurante} · sem preço, pra uso na cozinha · gerado em {dados.geradoEm}
          </Text>
          <Text style={{ marginTop: 6, fontSize: 9, color: cor.sub }}>
            Rende {dados.rendimento} {dados.unidadeRendimento}
            {dados.pesoPorcaoG ? ` · porção de ${dados.pesoPorcaoG}g` : ""}
          </Text>
        </View>

        <View style={estilosBase.linhaCabecalhoTabela}>
          <Text style={[estilosBase.th, estilosBase.colLabel]}>Ingrediente</Text>
          <Text style={[estilosBase.th, estilosBase.colNum]}>Quantidade</Text>
        </View>
        {dados.linhas.map((l, i) => (
          <View key={i} style={estilosBase.linhaTabela}>
            <Text style={estilosBase.colLabel}>{l.nome}{l.ehPreparo ? " (preparo próprio)" : ""}</Text>
            <Text style={estilosBase.colNum}>{l.pesoLiquido}{l.unidade}</Text>
          </View>
        ))}

        {paragrafos.length > 0 && (
          <View style={{ marginTop: 20 }}>
            <Text style={{ fontSize: 11, fontFamily: "Helvetica-Bold", marginBottom: 6 }}>Modo de preparo</Text>
            {paragrafos.map((p, i) => (
              <Text key={i} style={{ fontSize: 10, marginBottom: 4, lineHeight: 1.4 }}>{p}</Text>
            ))}
          </View>
        )}

        <Text style={estilosBase.rodape} fixed>
          Ficha Operacional gerada pelo sistema de Ficha Técnica. Sem valores de custo -- uso na cozinha.
        </Text>
      </Page>
    </Document>
  );
}

export async function gerarFichaOperacionalPdfBlob(dados: DadosFichaOperacionalPdf): Promise<Blob> {
  return pdf(<FichaOperacionalDocumento dados={dados} />).toBlob();
}
