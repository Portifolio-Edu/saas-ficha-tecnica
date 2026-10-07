import Link from "next/link";
import { ArrowRight, CheckCircle2 } from "lucide-react";
import type { Insumo } from "@/lib/dominio/insumo";
import type { Receita } from "@/lib/dominio/receita";

type DadosInicio = {
  insumos: Insumo[];
  receitas: Receita[];
  producoes: readonly unknown[];
  fechamentos: readonly unknown[];
};

export function passosDoRestaurante(dados: DadosInicio) {
  return [
    { titulo: "Cadastre os insumos", detalhe: "Informe embalagem, preço e unidade para calcular os custos.", rota: "/insumos", pronto: dados.insumos.length > 0 },
    { titulo: "Monte a primeira ficha técnica", detalhe: "Inclua ingredientes, rendimento, modo de preparo e foto do prato.", rota: "/receitas", pronto: dados.receitas.some(r => r.tipo === "prato_final" && r.ficha.length > 0 && r.rendimento > 0 && Boolean(r.modoPreparo?.trim()) && Boolean(r.fotoUrl)) },
    { titulo: "Informe o estoque inicial", detalhe: "Comece com o saldo de pelo menos um insumo; zero também é um saldo válido.", rota: "/estoque", pronto: dados.insumos.some(i => i.estoque !== null) },
    { titulo: "Planeje a primeira produção", detalhe: "Crie uma produção e acompanhe as etapas no quadro da cozinha.", rota: "/producoes", pronto: dados.producoes.length > 0 },
    { titulo: "Faça o primeiro fechamento", detalhe: "Ao terminar o período, registre vendas e inventário para conferir o CMV real.", rota: "/cmv", pronto: dados.fechamentos.length > 0 },
  ];
}

export function PrimeirosPassos({ basePath, ...dados }: DadosInicio & { basePath: string }) {
  const passos = passosDoRestaurante(dados);
  const completos = passos.filter(p => p.pronto).length;
  const proximo = passos.find(p => !p.pronto);
  if (!proximo) return null;

  return (
    <section aria-labelledby="inicio-restaurante" className="rounded-xl border p-5" style={{ background: "var(--panel)", borderColor: "var(--linha)" }}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 id="inicio-restaurante" className="text-base font-semibold text-[var(--tinta)]">Comece pelo seu restaurante</h2>
          <p className="mt-1 text-sm text-[var(--tinta-sub)]">O progresso acompanha seus cadastros. Faça cada etapa no ritmo da operação.</p>
        </div>
        <span className="text-sm text-[var(--tinta-sub)]">{completos} de {passos.length} etapas</span>
      </div>
      <ol className="mt-4 grid gap-2 sm:grid-cols-2 xl:grid-cols-5">
        {passos.map((p, i) => (
          <li key={p.rota}>
            <Link href={`${basePath}${p.rota}`} className="flex h-full min-h-11 gap-2 rounded-lg border p-3 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--sucesso)]" style={{ borderColor: "var(--linha)" }}>
              {p.pronto ? <CheckCircle2 aria-hidden className="mt-0.5 h-4 w-4 shrink-0 text-[var(--sucesso)]" /> : <span aria-hidden className="text-sm text-[var(--tinta-faint)]">{i + 1}.</span>}
              <div>
                <span className="text-sm font-medium text-[var(--tinta)]">{p.titulo}</span>
                <p className="mt-1 text-xs leading-relaxed text-[var(--tinta-sub)]">{p.pronto ? "Concluído" : p.detalhe}</p>
              </div>
            </Link>
          </li>
        ))}
      </ol>
      <Link href={`${basePath}${proximo.rota}`} className="mt-4 inline-flex min-h-11 items-center gap-2 text-sm font-medium text-[var(--tinta)] underline underline-offset-4">
        Próximo passo: {proximo.titulo.toLocaleLowerCase("pt-BR")} <ArrowRight aria-hidden className="h-4 w-4" />
      </Link>
    </section>
  );
}
