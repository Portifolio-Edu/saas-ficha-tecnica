import { StyleSheet } from "@react-pdf/renderer";

// Paleta neutra pra PDF -- deliberadamente não reaproveita a paleta C de
// src/components/ficha/tema.ts: papel imprime em preto e branco na cozinha
// na maior parte das vezes, então contraste alto importa mais que combinar
// com a UI. O rótulo nutricional tem estilo próprio à parte (fundo branco e
// letra preta são obrigatórios por norma, não uma escolha de tema).
export const cor = {
  texto: "#111111",
  sub: "#555555",
  faint: "#888888",
  borda: "#DDDDDD",
  bordaForte: "#111111",
};

export const estilosBase = StyleSheet.create({
  pagina: { padding: 36, fontSize: 10, fontFamily: "Helvetica", color: cor.texto },
  cabecalho: { marginBottom: 16 },
  titulo: { fontSize: 16, fontFamily: "Helvetica-Bold", marginBottom: 2 },
  subtitulo: { fontSize: 9, color: cor.sub },
  linhaCabecalhoTabela: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: cor.bordaForte,
    paddingBottom: 4,
    marginBottom: 2,
  },
  linhaTabela: {
    flexDirection: "row",
    borderBottomWidth: 0.5,
    borderBottomColor: cor.borda,
    paddingVertical: 4,
  },
  linhaTotal: {
    flexDirection: "row",
    borderTopWidth: 1,
    borderTopColor: cor.bordaForte,
    paddingTop: 5,
    marginTop: 2,
  },
  th: { fontSize: 8, fontFamily: "Helvetica-Bold", textTransform: "uppercase", color: cor.sub },
  colLabel: { flex: 3 },
  colNum: { flex: 1, textAlign: "right" },
  rodape: { position: "absolute", bottom: 24, left: 36, right: 36, fontSize: 7.5, color: cor.faint },
});
