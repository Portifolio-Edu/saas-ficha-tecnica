// AVISOS NO WHATSAPP (2026-10-02): monta os avisos que estão na hora e põe na
// caixa de saída (tabela avisos). Roda no servidor, chamado pelo n8n
// (/api/automacoes/pendentes) a cada poucos minutos.
//
// Usa a service role (não há usuário logado: é o relógio que chama), então
// TODA consulta aqui filtra por restaurante explicitamente. Só vai pra quem
// é dono ou gestor ativo com o WhatsApp verificado no agente.
// A chave única da tabela faz o mesmo aviso não sair duas vezes, mesmo que
// isto rode várias vezes no mesmo minuto.

import type { SupabaseClient } from "@supabase/supabase-js";
import { inicioDoDiaISO, hojeLocalISO } from "@/lib/calculo/dia";
import { foraDaFaixa, textoFaixa } from "@/lib/dominio/temperatura";
import {
  CONFIG_PADRAO,
  JANELA_MIN,
  TEMPERATURA_RECENTE_MIN,
  minutoLocal,
  naJanela,
  noSilencio,
  textoChecklistAbertura,
  textoResumo,
  textoTemperatura,
  type ConfigAvisos,
  type TipoAviso,
} from "./avisos";

interface Destinatario {
  userId: string;
  telefone: string;
}

export interface NovoAviso {
  cliente_id: string;
  tipo: TipoAviso;
  chave: string;
  user_id: string;
  telefone: string;
  texto: string;
}

type Linha = Record<string, unknown>;

function lerConfig(l: Linha | undefined): ConfigAvisos {
  if (!l) return CONFIG_PADRAO;
  return {
    temperatura: Boolean(l.temperatura),
    checklistAbertura: Boolean(l.checklist_abertura),
    checklistAberturaAte: String(l.checklist_abertura_ate),
    resumoDiario: Boolean(l.resumo_diario),
    resumoHora: String(l.resumo_hora),
    silencioInicio: (l.silencio_inicio as string | null) ?? null,
    silencioFim: (l.silencio_fim as string | null) ?? null,
  };
}

function agrupar<T>(itens: T[], chave: (t: T) => string): Map<string, T[]> {
  const m = new Map<string, T[]>();
  for (const i of itens) m.set(chave(i), [...(m.get(chave(i)) ?? []), i]);
  return m;
}

async function ler<T = Linha>(consulta: PromiseLike<{ data: unknown; error: { message: string } | null }>): Promise<T[]> {
  const { data, error } = await consulta;
  if (error) throw new Error(error.message);
  return (data ?? []) as T[];
}

/** Monta os avisos do momento (sem gravar). Separado de gravar pra testar. */
export async function montarAvisos(admin: SupabaseClient, app: string, agora = new Date()): Promise<NovoAviso[]> {
  // 1. Quem recebe: WhatsApp verificado + dono/gestor ativo.
  const zaps = await ler<{ cliente_id: string; user_id: string; telefone: string }>(
    admin.from("agente_whatsapp").select("cliente_id, user_id, telefone").not("verificado_em", "is", null),
  );
  if (!zaps.length) return [];
  const membros = await ler<{ cliente_id: string; user_id: string }>(
    admin.from("membros").select("cliente_id, user_id").in("user_id", zaps.map((z) => z.user_id)).eq("ativo", true).in("papel", ["dono", "gestor"]),
  );
  const pode = new Set(membros.map((m) => `${m.cliente_id}:${m.user_id}`));
  const destinatarios = new Map<string, Destinatario[]>();
  for (const z of zaps) {
    if (!pode.has(`${z.cliente_id}:${z.user_id}`)) continue;
    destinatarios.set(z.cliente_id, [...(destinatarios.get(z.cliente_id) ?? []), { userId: z.user_id, telefone: z.telefone }]);
  }
  const ids = [...destinatarios.keys()];
  if (!ids.length) return [];

  const [configs, restaurantes] = await Promise.all([
    ler(admin.from("avisos_config").select("*").in("cliente_id", ids)),
    ler<{ id: string; nome_restaurante: string }>(admin.from("clientes").select("id, nome_restaurante").in("id", ids)),
  ]);
  const cfgDe = new Map(ids.map((id) => [id, lerConfig(configs.find((c) => c.cliente_id === id))]));
  const nomeDe = new Map(restaurantes.map((r) => [r.id, r.nome_restaurante]));

  const minuto = minutoLocal(agora);
  const hoje = hojeLocalISO(agora);
  const inicioHoje = inicioDoDiaISO(agora);
  const inicioOntem = inicioDoDiaISO(new Date(Date.parse(inicioHoje) - 60 * 60 * 1000));
  const ontem = hojeLocalISO(new Date(inicioOntem));

  const comTemperatura = ids.filter((id) => cfgDe.get(id)!.temperatura);
  const comChecklist = ids.filter((id) => {
    const c = cfgDe.get(id)!;
    return c.checklistAbertura && naJanela(minuto, c.checklistAberturaAte, JANELA_MIN.checklist_abertura) && !noSilencio(minuto, c);
  });
  const comResumo = ids.filter((id) => {
    const c = cfgDe.get(id)!;
    return c.resumoDiario && naJanela(minuto, c.resumoHora, JANELA_MIN.resumo_diario) && !noSilencio(minuto, c);
  });

  const novos: NovoAviso[] = [];
  const paraTodos = (cliente: string, tipo: TipoAviso, chave: string, texto: string) => {
    for (const d of destinatarios.get(cliente) ?? []) novos.push({ cliente_id: cliente, tipo, chave, user_id: d.userId, telefone: d.telefone, texto });
  };

  // 2. Locais de armazenamento (temperatura agora e resumo de ontem).
  const precisaLocais = [...new Set([...comTemperatura, ...comResumo])];
  const locais = precisaLocais.length
    ? await ler<{ id: string; cliente_id: string; nome: string; temperatura_min_c: number | null; temperatura_max_c: number | null }>(
        admin.from("locais_armazenamento").select("id, cliente_id, nome, temperatura_min_c, temperatura_max_c").in("cliente_id", precisaLocais),
      )
    : [];
  const localDe = new Map(locais.map((l) => [l.id, l]));
  const fora = (r: { local_armazenamento_id: string; temperatura_c: number }) => {
    const l = localDe.get(r.local_armazenamento_id);
    return !!l && foraDaFaixa({ temperaturaMinC: l.temperatura_min_c, temperaturaMaxC: l.temperatura_max_c }, Number(r.temperatura_c));
  };

  // 3. Temperatura fora da faixa (registrada nas últimas 2 h; um aviso por registro).
  const locaisTemp = locais.filter((l) => comTemperatura.includes(l.cliente_id));
  if (locaisTemp.length) {
    const desde = new Date(agora.getTime() - TEMPERATURA_RECENTE_MIN * 60 * 1000).toISOString();
    const registros = await ler<{ id: string; local_armazenamento_id: string; temperatura_c: number; responsavel: string; registrado_em: string }>(
      admin
        .from("registros_temperatura")
        .select("id, local_armazenamento_id, temperatura_c, responsavel, registrado_em")
        .in("local_armazenamento_id", locaisTemp.map((l) => l.id))
        .gte("registrado_em", desde),
    );
    for (const r of registros.filter(fora)) {
      const l = localDe.get(r.local_armazenamento_id)!;
      paraTodos(
        l.cliente_id,
        "temperatura",
        r.id,
        textoTemperatura({
          restaurante: nomeDe.get(l.cliente_id) ?? "",
          local: l.nome,
          temperaturaC: Number(r.temperatura_c),
          faixa: textoFaixa({ temperaturaMinC: l.temperatura_min_c, temperaturaMaxC: l.temperatura_max_c }),
          responsavel: r.responsavel,
          registradoEm: r.registrado_em,
          app,
        }),
      );
    }
  }

  // 4. Checklists: abertura de hoje (atrasada) e todos de ontem (resumo).
  const precisaChecklists = [...new Set([...comChecklist, ...comResumo])];
  if (precisaChecklists.length) {
    const checklists = await ler<{ id: string; cliente_id: string; nome: string; momento: string }>(
      admin.from("checklists").select("id, cliente_id, nome, momento").in("cliente_id", precisaChecklists),
    );
    const itens = checklists.length
      ? await ler<{ id: string; checklist_id: string }>(admin.from("checklist_itens").select("id, checklist_id").in("checklist_id", checklists.map((c) => c.id)))
      : [];
    const execucoes = itens.length
      ? await ler<{ checklist_item_id: string; concluido_em: string }>(
          admin.from("checklist_execucoes").select("checklist_item_id, concluido_em").in("checklist_item_id", itens.map((i) => i.id)).gte("concluido_em", inicioOntem),
        )
      : [];
    const feitosHoje = new Set(execucoes.filter((e) => e.concluido_em >= inicioHoje).map((e) => e.checklist_item_id));
    const feitosOntem = new Set(execucoes.filter((e) => e.concluido_em < inicioHoje).map((e) => e.checklist_item_id));
    const itensDe = agrupar(itens, (i) => i.checklist_id);

    for (const cliente of comChecklist) {
      const pendentes = checklists
        .filter((c) => c.cliente_id === cliente && c.momento === "abertura")
        .map((c) => {
          const lista = itensDe.get(c.id) ?? [];
          return { nome: c.nome, total: lista.length, feitos: lista.filter((i) => feitosHoje.has(i.id)).length };
        })
        .filter((p) => p.total > 0 && p.feitos < p.total);
      if (pendentes.length) {
        paraTodos(cliente, "checklist_abertura", hoje, textoChecklistAbertura({ restaurante: nomeDe.get(cliente) ?? "", limite: cfgDe.get(cliente)!.checklistAberturaAte, pendentes, app }));
      }
    }

    // 5. Resumo de ontem.
    if (comResumo.length) {
      const [producoes, tempOntem, pedidos] = await Promise.all([
        ler<{ cliente_id: string; status: string; motivo_perda: string | null; receitas: { nome_prato: string } | null }>(
          admin.from("producoes").select("cliente_id, status, motivo_perda, receitas(nome_prato)").in("cliente_id", comResumo).gte("criado_em", inicioOntem).lt("criado_em", inicioHoje),
        ),
        locais.length
          ? ler<{ local_armazenamento_id: string; temperatura_c: number }>(
              admin
                .from("registros_temperatura")
                .select("local_armazenamento_id, temperatura_c")
                .in("local_armazenamento_id", locais.filter((l) => comResumo.includes(l.cliente_id)).map((l) => l.id))
                .gte("registrado_em", inicioOntem)
                .lt("registrado_em", inicioHoje),
            )
          : Promise.resolve([]),
        ler<{ cliente_id: string }>(admin.from("requisicoes").select("cliente_id").in("cliente_id", comResumo).eq("status", "pendente")),
      ]);
      for (const cliente of comResumo) {
        const prods = producoes.filter((p) => p.cliente_id === cliente);
        const itensCliente = checklists.filter((c) => c.cliente_id === cliente).flatMap((c) => itensDe.get(c.id) ?? []);
        paraTodos(
          cliente,
          "resumo_diario",
          hoje,
          textoResumo({
            restaurante: nomeDe.get(cliente) ?? "",
            data: ontem,
            produzidas: prods.filter((p) => p.status === "produzido").length,
            perdas: prods.filter((p) => p.status === "perda").map((p) => ({ receita: p.receitas?.nome_prato ?? "Produção", motivo: p.motivo_perda ?? "sem motivo" })),
            temperaturasFora: tempOntem.filter((r) => localDe.get(r.local_armazenamento_id)?.cliente_id === cliente && fora(r)).length,
            checklist: { total: itensCliente.length, feitos: itensCliente.filter((i) => feitosOntem.has(i.id)).length },
            pedidosPendentes: pedidos.filter((p) => p.cliente_id === cliente).length,
            app,
          }),
        );
      }
    }
  }

  return novos;
}

/** Põe na caixa de saída; o que já existe (mesma chave) é ignorado. Devolve quantos eram novos. */
export async function gravarAvisos(admin: SupabaseClient, avisos: NovoAviso[]): Promise<number> {
  if (!avisos.length) return 0;
  const { data, error } = await admin
    .from("avisos")
    .upsert(avisos, { onConflict: "cliente_id,tipo,chave,user_id", ignoreDuplicates: true })
    .select("id");
  if (error) throw new Error(error.message);
  return data?.length ?? 0;
}
