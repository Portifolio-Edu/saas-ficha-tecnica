// INTEGRACOES (2026-09-23) -- catálogo de canais de venda que o Ficha Técnica
// soma (não substitui): PDVs escolhidos pelo usuário + iFood. Nenhuma integração
// por API existe ainda (depende do backend Supabase + n8n e do credenciamento com
// cada empresa, PRODUCT.md). No app aparecem como "Em breve"; na demo /preview,
// iFood e Saipos aparecem conectados com o selo "demo" (escolha do usuário).
// Só nomes em texto: sem logotipo de terceiros.
//
// PRIORIDADE (2026-09-26): decisão do dono — integrar com PDV tem burocracia
// (credenciamento com cada empresa), então o lançamento começa só com iFood,
// Anota AI e Saipos, que ficam em destaque na tela. Os demais aparecem como
// "Em breve". Pra promover um canal: `prioridade: true` + `descricao`.

export interface CanalVenda {
  id: string;
  nome: string;
  grupo: GrupoCanal;
  /** Um dos canais do lançamento (em destaque). Os outros: "Em breve". */
  prioridade?: boolean;
  /** O que a integração traz, em uma frase (só nos de prioridade). */
  descricao?: string;
}

export type GrupoCanal = "Delivery" | "Restaurante e delivery" | "Casas médias e redes" | "Maquininha com PDV" | "Food service e franquias";

export const GRUPOS_CANAL: { grupo: GrupoCanal; descricao: string }[] = [
  { grupo: "Delivery", descricao: "Pedidos do app entram com os itens e baixam a ficha na hora." },
  { grupo: "Restaurante e delivery", descricao: "Os PDVs mais comuns em restaurante pequeno e delivery." },
  { grupo: "Casas médias e redes", descricao: "Salão com várias praças, mais de uma loja." },
  { grupo: "Maquininha com PDV", descricao: "Lanchonetes e restaurantes que vendem direto pela maquininha." },
  { grupo: "Food service e franquias", descricao: "Operações com padrão de rede." },
];

export const CANAIS: CanalVenda[] = [
  { id: "ifood", nome: "iFood", grupo: "Delivery", prioridade: true, descricao: "Cada pedido do app entra com os itens e baixa a ficha dos pratos na hora." },
  { id: "anota-ai", nome: "Anota AI", grupo: "Restaurante e delivery", prioridade: true, descricao: "Pedidos do WhatsApp e do cardápio digital entram no CMV sem digitar nada." },
  { id: "saipos", nome: "Saipos", grupo: "Restaurante e delivery", prioridade: true, descricao: "Vendas do salão, balcão e delivery do caixa entram no CMV do período." },
  { id: "consumer", nome: "Consumer", grupo: "Restaurante e delivery" },
  { id: "goomer", nome: "Goomer", grupo: "Restaurante e delivery" },
  { id: "colibri", nome: "Colibri", grupo: "Casas médias e redes" },
  { id: "totvs-chef", nome: "TOTVS Chef", grupo: "Casas médias e redes" },
  { id: "stone", nome: "Stone", grupo: "Maquininha com PDV" },
  { id: "cielo", nome: "Cielo", grupo: "Maquininha com PDV" },
  { id: "pagseguro", nome: "PagSeguro", grupo: "Maquininha com PDV" },
  { id: "linx-degust", nome: "Linx Degust", grupo: "Food service e franquias" },
  { id: "menew", nome: "Menew", grupo: "Food service e franquias" },
];

export interface PedidoRecebido {
  id: string;
  /** ISO */
  recebidoEm: string;
  canalId: string;
  itens: { nome: string; quantidade: number }[];
  valor: number;
}

export const CANAIS_PRIORIDADE = CANAIS.filter((c) => c.prioridade);
export const CANAIS_EM_BREVE = CANAIS.filter((c) => !c.prioridade);
