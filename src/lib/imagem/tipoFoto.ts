// PLANO 9,5 (2026-09-26): só foto sobe pros baldes públicos. Antes o servidor
// aceitava qualquer arquivo e usava a extensão do nome: um .html ficava
// público no endereço do Storage (hospedagem de página falsa com o nosso
// link). O balde também recusa (migration 20260928100000_endurecimento).
// Onde mexer: TIPOS (formatos aceitos) — manter igual ao allowed_mime_types.

const TIPOS: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/heic": "heic",
  "image/heif": "heif",
};

export const TAMANHO_MAXIMO_FOTO = 5 * 1024 * 1024;

/** Extensão do arquivo pela foto recebida; erro em português se não for foto aceita. */
export function extensaoDaFoto(tipo: string, tamanho: number): string {
  const extensao = TIPOS[tipo];
  if (!extensao) throw new Error("Envie uma foto (JPG, PNG, WebP ou HEIC).");
  if (tamanho > TAMANHO_MAXIMO_FOTO) throw new Error("A foto passa de 5 MB. Tire outra ou reduza antes de enviar.");
  return extensao;
}
