/** Busca em pt-BR: "camarao" encontra "Camarão", sem modificar o dado salvo. */
export function normalizarBusca(texto: string): string {
  return texto.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
}
