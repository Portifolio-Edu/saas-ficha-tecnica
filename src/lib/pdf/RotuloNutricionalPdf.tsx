import { Document, Page, Text, View, StyleSheet, pdf } from "@react-pdf/renderer";

// Fundo branco e letra preta são obrigatórios pra tabela de informação
// nutricional (seção 6 do handoff / IN 75-2020) -- diferente dos outros dois
// PDFs, aqui a cor NUNCA muda, mesmo que o resto do sistema use outro tema.
const PRETO = "#000000";
const BRANCO = "#FFFFFF";
const CINZA_BORDA = "#999999";

const estilos = StyleSheet.create({
  pagina: { padding: 36, fontSize: 10, fontFamily: "Helvetica", backgroundColor: BRANCO, color: PRETO },
  moldura: { borderWidth: 1.5, borderColor: PRETO, padding: 16, maxWidth: 340 },
  cabecalho: { borderBottomWidth: 3, borderBottomColor: PRETO, paddingBottom: 6, marginBottom: 6 },
  titulo: { fontSize: 13, fontFamily: "Helvetica-Bold" },
  subtitulo: { fontSize: 8.5, color: PRETO, marginTop: 2 },
  linhaCabecalhoTabela: { flexDirection: "row", borderBottomWidth: 1.5, borderBottomColor: PRETO, paddingBottom: 3, marginBottom: 2 },
  linha: { flexDirection: "row", borderTopWidth: 0.75, borderTopColor: CINZA_BORDA, paddingVertical: 3 },
  th: { fontSize: 7.5, fontFamily: "Helvetica-Bold" },
  colLabel: { flex: 3 },
  colNum: { flex: 2, textAlign: "right" },
  aviso: { fontSize: 7, marginTop: 8, lineHeight: 1.3 },
  incompleta: { fontSize: 8.5, marginBottom: 6, color: "#900000" },
  seloBox: { borderWidth: 1.5, borderColor: PRETO, padding: 8, marginTop: 12, maxWidth: 340 },
  seloTitulo: { fontSize: 9, fontFamily: "Helvetica-Bold", marginBottom: 3 },
  seloTexto: { fontSize: 8, lineHeight: 1.3 },
  rodape: { position: "absolute", bottom: 24, left: 36, right: 36, fontSize: 7, color: "#333333" },
});

export interface LinhaRotuloPdf {
  label: string;
  valorPorcao: string;
  valorPor100: string;
  vd: string;
}

export interface DadosRotuloPdf {
  nomePrato: string;
  rendimento: number;
  pesoPorcaoG: number | null;
  unidadeMassa: "g" | "mL";
  linhas: LinhaRotuloPdf[];
  nutrientesComSelo: string[];
  nutriCompleta: boolean;
  geradoEm: string;
}

function RotuloDocumento({ dados }: { dados: DadosRotuloPdf }) {
  return (
    <Document title={`Rótulo Nutricional - ${dados.nomePrato}`}>
      <Page size="A4" style={estilos.pagina}>
        <Text style={{ fontSize: 8, marginBottom: 12, color: "#333333" }}>
          {dados.nomePrato} · gerado em {dados.geradoEm}
        </Text>

        <View style={estilos.moldura}>
          <View style={estilos.cabecalho}>
            <Text style={estilos.titulo}>INFORMAÇÃO NUTRICIONAL</Text>
            <Text style={estilos.subtitulo}>
              {dados.rendimento} porç{dados.rendimento > 1 ? "ões" : "ão"} por embalagem
              {dados.pesoPorcaoG ? ` · porção de ${dados.pesoPorcaoG}g` : ""}
            </Text>
          </View>

          {!dados.nutriCompleta && (
            <Text style={estilos.incompleta}>
              Atenção: alguns insumos ainda não têm dado nutricional cadastrado -- valores abaixo incompletos, não imprimir como rótulo final.
            </Text>
          )}

          <View style={estilos.linhaCabecalhoTabela}>
            <Text style={[estilos.th, estilos.colLabel]}></Text>
            <Text style={[estilos.th, estilos.colNum]}>Por porção</Text>
            <Text style={[estilos.th, estilos.colNum]}>Por 100{dados.unidadeMassa}</Text>
            <Text style={[estilos.th, estilos.colNum]}>%VD*</Text>
          </View>
          {dados.linhas.map((l, i) => (
            <View key={i} style={estilos.linha}>
              <Text style={estilos.colLabel}>{l.label}</Text>
              <Text style={estilos.colNum}>{l.valorPorcao}</Text>
              <Text style={estilos.colNum}>{l.valorPor100}</Text>
              <Text style={estilos.colNum}>{l.vd}</Text>
            </View>
          ))}

          <Text style={estilos.aviso}>
            *Percentual de valores diários fornecidos pela porção, com base numa dieta de 2.000kcal ou 8.400kJ. Seus valores diários podem ser maiores ou menores dependendo das suas necessidades energéticas. Açúcares totais não têm %VD definido pela norma.
          </Text>
        </View>

        {dados.nutrientesComSelo.length > 0 && (
          <View style={estilos.seloBox}>
            <Text style={estilos.seloTitulo}>ALTO EM {dados.nutrientesComSelo.join(", ").toUpperCase()}</Text>
            <Text style={estilos.seloTexto}>
              Avaliado por 100{dados.unidadeMassa} do alimento, não por porção. Este produto precisa do selo de alerta frontal (lupa) na embalagem -- o desenho oficial é o arquivo vetorial do Anexo XVII da IN 75/2020 e não é gerado por este sistema; precisa ser aplicado na arte final da embalagem, seguindo posição e tamanho do Anexo XVIII.
            </Text>
          </View>
        )}

        <Text style={estilos.rodape} fixed>
          Rótulo nutricional calculado por composição de ingrediente (não é laudo laboratorial, salvo quando informado como tal). Formato conforme RDC 429/2020 e IN 75/2020.
        </Text>
      </Page>
    </Document>
  );
}

export async function gerarRotuloNutricionalPdfBlob(dados: DadosRotuloPdf): Promise<Blob> {
  return pdf(<RotuloDocumento dados={dados} />).toBlob();
}
