// POLIMENTO checklists-pracas (2026-09-22): foto de tablet/celular sai com 3–8 MB,
// e server action do Next aceita até 1 MB por padrão (next.config sem
// bodySizeLimit). Aqui a imagem é reduzida no aparelho antes de subir: lado maior
// de até 1600px em JPEG, que fica em ~200–500 KB e continua nítida pra conferir
// a montagem da praça ou o empratamento. Usado pelas fotos de praça e de receita.
// Se o navegador não conseguir ler o formato (ex.: HEIC fora do Safari), devolve o
// arquivo original e o servidor responde o erro de tamanho, se houver.

const LADO_MAXIMO = 1600;
const QUALIDADE = 0.82;
const JA_PEQUENO_BYTES = 600 * 1024;

export async function reduzirImagem(arquivo: File): Promise<File> {
  if (!arquivo.type.startsWith("image/")) return arquivo;
  if (arquivo.size <= JA_PEQUENO_BYTES && arquivo.type === "image/jpeg") return arquivo;
  try {
    const bitmap = await createImageBitmap(arquivo, { imageOrientation: "from-image" });
    const escala = Math.min(1, LADO_MAXIMO / Math.max(bitmap.width, bitmap.height));
    const largura = Math.round(bitmap.width * escala);
    const altura = Math.round(bitmap.height * escala);
    const canvas = document.createElement("canvas");
    canvas.width = largura;
    canvas.height = altura;
    const ctx = canvas.getContext("2d");
    if (!ctx) return arquivo;
    ctx.drawImage(bitmap, 0, 0, largura, altura);
    bitmap.close();
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", QUALIDADE));
    if (!blob || blob.size >= arquivo.size) return arquivo;
    const nome = arquivo.name.replace(/\.[^.]+$/, "") || "foto";
    return new File([blob], `${nome}.jpg`, { type: "image/jpeg" });
  } catch {
    return arquivo;
  }
}
