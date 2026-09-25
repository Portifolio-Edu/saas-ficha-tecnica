"use client";

// EQUIPE (2026-09-25): modo cozinha. Roda no tablet/celular pareado (sem senha)
// e na demo (/preview/cozinha, ações simuladas). Pensado pra bancada: letra
// maior, alvos de toque de 56px, uma coisa por tela. Nenhum valor em R$ nem
// saldo de estoque aparece aqui — os dados já chegam sem isso do banco
// (dados_cozinha). A faixa "Quem está fazendo" fica sempre à vista: cada
// registro sai com o nome de quem fez.

import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  ChefHat, ClipboardCheck, Thermometer, CookingPot, BookOpen, PackageSearch,
  Check, ChevronLeft, Search, UserRound, EyeOff, AlertTriangle,
} from "lucide-react";
import { useToast, ToastContainer } from "@/components/ficha/Toast";
import { nums } from "@/components/ficha/tema";
import { formatQtd } from "@/components/charts/format";
import { MOMENTOS, type Checklist } from "@/lib/dominio/checklist";
import type { LocalArmazenamento, RegistroTemperatura } from "@/lib/dominio/temperatura";
import type { FichaCozinha, ItemContagem, ProducaoCozinha } from "@/lib/dominio/cozinha";
import type { Funcionario } from "@/lib/dominio/equipe";
import type { StatusProducao } from "@/lib/dominio/producao";

export type ResultadoCozinha = { ok: true; aviso?: string } | { ok: false; erro: string };

export interface AcoesCozinha {
  marcarItem: (itemId: string, responsavel: string) => Promise<ResultadoCozinha>;
  desmarcarItem: (itemId: string) => Promise<ResultadoCozinha>;
  registrarTemperatura: (localId: string, temperatura: number, responsavel: string) => Promise<ResultadoCozinha>;
  registrarProducao: (receitaId: string, quantidade: number, responsavel: string) => Promise<ResultadoCozinha>;
  atualizarProducao: (id: string, status: StatusProducao, motivo: string | null) => Promise<ResultadoCozinha>;
  enviarContagem: (responsavel: string, itens: { insumoId: string; quantidade: number }[]) => Promise<ResultadoCozinha>;
}

type Aba = "checklists" | "temperatura" | "producao" | "fichas" | "contagem";

const ABAS: { id: Aba; rotulo: string; icone: typeof ChefHat }[] = [
  { id: "checklists", rotulo: "Checklists", icone: ClipboardCheck },
  { id: "temperatura", rotulo: "Temperatura", icone: Thermometer },
  { id: "producao", rotulo: "Produção", icone: CookingPot },
  { id: "fichas", rotulo: "Fichas", icone: BookOpen },
  { id: "contagem", rotulo: "Contagem", icone: PackageSearch },
];

const CHAVE_RESPONSAVEL = "cozinha:responsavel";

// Foto que não carrega (link quebrado, sem internet na cozinha) some em vez
// de deixar um quadro vazio no meio da ficha.
const esconderImagem = (e: React.SyntheticEvent<HTMLImageElement>) => {
  e.currentTarget.style.display = "none";
};

const botaoGrande = "min-h-14 px-5 rounded-xl text-[16px] font-semibold inline-flex items-center justify-center gap-2 disabled:opacity-60 active:scale-[0.99] transition-transform";
const campoGrande = "min-h-14 px-4 rounded-xl text-[18px] outline-none w-full focus:ring-2 focus:ring-[var(--marca-suave)] focus:border-[var(--marca)]";
const estiloCampo = { border: "1px solid var(--linha-forte)", background: "var(--panel)", color: "var(--tinta)" } as const;

export function CozinhaApp({
  nomeRestaurante,
  funcionarios,
  checklists,
  locais,
  temperaturas,
  fichas,
  itensContagem,
  producoes,
  acoes,
  rodape,
}: {
  nomeRestaurante: string;
  funcionarios: Funcionario[];
  checklists: Checklist[];
  locais: LocalArmazenamento[];
  temperaturas: RegistroTemperatura[];
  fichas: FichaCozinha[];
  itensContagem: ItemContagem[];
  producoes: ProducaoCozinha[];
  acoes: AcoesCozinha;
  /** Linha no pé da tela (ex.: aviso de demonstração). */
  rodape?: ReactNode;
}) {
  const [aba, setAba] = useState<Aba>("checklists");
  const [responsavel, setResponsavel] = useState<string | null>(null);
  const [trocando, setTrocando] = useState(false);

  useEffect(() => {
    try {
      const salvo = localStorage.getItem(CHAVE_RESPONSAVEL);
      if (salvo) setResponsavel(salvo);
    } catch {}
  }, []);

  const escolher = (nome: string) => {
    setResponsavel(nome);
    setTrocando(false);
    try {
      localStorage.setItem(CHAVE_RESPONSAVEL, nome);
    } catch {}
  };

  return (
    <div className="min-h-screen flex flex-col text-[16px]" style={{ background: "var(--fundo)", color: "var(--tinta)" }}>
      <header className="sticky top-0 z-20 border-b" style={{ background: "var(--panel)", borderColor: "var(--linha)" }}>
        <div className="max-w-4xl mx-auto px-4 h-16 flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0" style={{ background: "var(--tinta)", color: "var(--panel)" }}>
            <ChefHat size={19} />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-[16px] font-semibold leading-tight truncate">{nomeRestaurante}</div>
            <div className="text-[13px] text-[var(--tinta-faint)]">Modo cozinha</div>
          </div>
          {responsavel && (
            <button
              onClick={() => setTrocando(true)}
              className="min-h-11 pl-2 pr-3.5 rounded-full border inline-flex items-center gap-2 text-[15px] font-medium"
              style={{ borderColor: "var(--linha-forte)", background: "var(--panel-elevated)" }}
              aria-label={`${responsavel} está usando. Trocar pessoa`}
            >
              <span className="w-7 h-7 rounded-full flex items-center justify-center text-[13px] font-semibold" style={{ background: "var(--tinta)", color: "var(--panel)" }}>
                {responsavel.slice(0, 1).toUpperCase()}
              </span>
              {responsavel}
            </button>
          )}
        </div>
        <nav className="max-w-4xl mx-auto px-2 flex overflow-x-auto" aria-label="Seções da cozinha">
          {ABAS.map((a) => {
            const Icone = a.icone;
            const ativa = aba === a.id;
            return (
              <button
                key={a.id}
                onClick={() => setAba(a.id)}
                aria-current={ativa ? "page" : undefined}
                className="min-h-14 px-4 flex items-center gap-2 text-[15px] font-medium border-b-2 shrink-0"
                style={{ borderColor: ativa ? "var(--tinta)" : "transparent", color: ativa ? "var(--tinta)" : "var(--tinta-faint)" }}
              >
                <Icone size={18} />
                {a.rotulo}
              </button>
            );
          })}
        </nav>
      </header>

      <main className="flex-1 w-full max-w-4xl mx-auto px-4 py-5">
        {!responsavel || trocando ? (
          <QuemEsta funcionarios={funcionarios} atual={responsavel} onEscolher={escolher} onCancelar={responsavel ? () => setTrocando(false) : undefined} />
        ) : aba === "checklists" ? (
          <SecaoChecklists checklists={checklists} responsavel={responsavel} acoes={acoes} />
        ) : aba === "temperatura" ? (
          <SecaoTemperatura locais={locais} temperaturas={temperaturas} responsavel={responsavel} acoes={acoes} />
        ) : aba === "producao" ? (
          <SecaoProducao fichas={fichas} producoes={producoes} responsavel={responsavel} acoes={acoes} />
        ) : aba === "fichas" ? (
          <SecaoFichas fichas={fichas} />
        ) : (
          <SecaoContagem itens={itensContagem} responsavel={responsavel} acoes={acoes} />
        )}
      </main>
      {rodape && <footer className="text-center text-[13px] text-[var(--tinta-faint)] pb-5 px-4">{rodape}</footer>}
      <ToastContainer />
    </div>
  );
}

function QuemEsta({ funcionarios, atual, onEscolher, onCancelar }: { funcionarios: Funcionario[]; atual: string | null; onEscolher: (nome: string) => void; onCancelar?: () => void }) {
  const [outro, setOutro] = useState("");
  return (
    <section className="max-w-xl">
      <h1 className="text-[22px] font-semibold tracking-tight">Quem está usando agora?</h1>
      <p className="text-[15px] text-[var(--tinta-sub)] mt-1 mb-5">Tudo o que você registrar sai com o seu nome.</p>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {funcionarios.map((f) => (
          <button
            key={f.id}
            onClick={() => onEscolher(f.nome)}
            className={`${botaoGrande} border`}
            style={{ borderColor: f.nome === atual ? "var(--tinta)" : "var(--linha-forte)", background: "var(--panel)" }}
          >
            <UserRound size={18} className="text-[var(--tinta-faint)]" />
            {f.nome}
          </button>
        ))}
      </div>
      <div className="flex gap-2 mt-5">
        <input className={campoGrande} style={estiloCampo} placeholder={funcionarios.length ? "Outro nome" : "Seu nome"} value={outro} onChange={(e) => setOutro(e.target.value)} />
        <button onClick={() => outro.trim() && onEscolher(outro.trim())} className={botaoGrande} style={{ background: "var(--tinta)", color: "var(--panel)" }}>
          Entrar
        </button>
      </div>
      {onCancelar && (
        <button onClick={onCancelar} className="mt-4 min-h-11 text-[15px] text-[var(--tinta-sub)] underline underline-offset-2">
          Continuar como {atual}
        </button>
      )}
    </section>
  );
}

function Cartao({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div className={`rounded-xl border ${className}`} style={{ background: "var(--panel)", borderColor: "var(--linha)" }}>
      {children}
    </div>
  );
}

function SecaoChecklists({ checklists: iniciais, responsavel, acoes }: { checklists: Checklist[]; responsavel: string; acoes: AcoesCozinha }) {
  const { mostrarErro } = useToast();
  const [checklists, setChecklists] = useState(iniciais);
  useEffect(() => setChecklists(iniciais), [iniciais]);
  const [aberto, setAberto] = useState<string | null>(null);

  const alternar = async (checklistId: string, itemId: string, feito: boolean) => {
    setChecklists((atual) =>
      atual.map((c) => (c.id !== checklistId ? c : { ...c, itens: c.itens.map((i) => (i.id === itemId ? { ...i, concluidoHoje: !feito } : i)) })),
    );
    const r = feito ? await acoes.desmarcarItem(itemId) : await acoes.marcarItem(itemId, responsavel);
    if (!r.ok) {
      mostrarErro(r.erro);
      setChecklists((atual) =>
        atual.map((c) => (c.id !== checklistId ? c : { ...c, itens: c.itens.map((i) => (i.id === itemId ? { ...i, concluidoHoje: feito } : i)) })),
      );
    }
  };

  if (checklists.length === 0) return <Vazio texto="Nenhum checklist cadastrado. O gestor monta na tela Checklists." />;

  const atual = checklists.find((c) => c.id === aberto);
  if (atual) {
    const grupos = [
      ...atual.areas.map((a) => ({ id: a.id as string | null, nome: a.nome })),
      { id: null, nome: atual.areas.length ? "Geral" : "" },
    ];
    return (
      <section>
        <Voltar onClick={() => setAberto(null)} />
        <h1 className="text-[22px] font-semibold tracking-tight">{atual.nome}</h1>
        <p className="text-[15px] text-[var(--tinta-sub)] mt-0.5 mb-4">
          {atual.itens.filter((i) => i.concluidoHoje).length} de {atual.itens.length} feitos hoje
        </p>
        <div className="space-y-5">
          {grupos.map((g) => {
            const itens = atual.itens.filter((i) => i.areaId === g.id);
            const fotos = atual.fotos.filter((f) => f.areaId === g.id);
            if (itens.length === 0 && fotos.length === 0) return null;
            return (
              <div key={g.id ?? "geral"}>
                {g.nome && <h2 className="text-[17px] font-semibold mb-2">{g.nome}</h2>}
                {fotos.length > 0 && (
                  <div className="flex gap-2 overflow-x-auto mb-3">
                    {fotos.map((f) => (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img key={f.id} src={f.url} onError={esconderImagem} alt={f.legenda ?? `Referência de ${g.nome || atual.nome}`} className="h-40 rounded-lg object-cover border" style={{ borderColor: "var(--linha)" }} />
                    ))}
                  </div>
                )}
                <Cartao>
                  {itens.map((i, n) => (
                    <button
                      key={i.id}
                      onClick={() => alternar(atual.id, i.id, i.concluidoHoje)}
                      className={`w-full min-h-14 px-4 py-3 flex items-center gap-3 text-left ${n > 0 ? "border-t" : ""}`}
                      style={{ borderColor: "var(--linha)" }}
                      aria-pressed={i.concluidoHoje}
                    >
                      <span
                        className="w-7 h-7 rounded-md border-2 flex items-center justify-center shrink-0"
                        style={{ borderColor: i.concluidoHoje ? "var(--sucesso)" : "var(--linha-forte)", background: i.concluidoHoje ? "var(--sucesso)" : "transparent", color: "#fff" }}
                      >
                        {i.concluidoHoje && <Check size={17} strokeWidth={3} />}
                      </span>
                      <span className="text-[16px]" style={{ color: i.concluidoHoje ? "var(--tinta-faint)" : "var(--tinta)", textDecoration: i.concluidoHoje ? "line-through" : undefined }}>
                        {i.texto}
                      </span>
                    </button>
                  ))}
                </Cartao>
              </div>
            );
          })}
        </div>
      </section>
    );
  }

  return (
    <section className="space-y-6">
      {MOMENTOS.map((m) => {
        const doMomento = checklists.filter((c) => c.momento === m.id);
        if (doMomento.length === 0) return null;
        return (
          <div key={m.id}>
            <h2 className="text-[13px] font-medium text-[var(--tinta-faint)] mb-2">{m.label}</h2>
            <div className="grid sm:grid-cols-2 gap-3">
              {doMomento.map((c) => {
                const feitos = c.itens.filter((i) => i.concluidoHoje).length;
                const completo = c.itens.length > 0 && feitos === c.itens.length;
                return (
                  <button key={c.id} onClick={() => setAberto(c.id)} className="text-left rounded-xl border p-4 min-h-20" style={{ background: "var(--panel)", borderColor: completo ? "var(--sucesso)" : "var(--linha)" }}>
                    <div className="text-[17px] font-semibold">{c.nome}</div>
                    <div className="text-[14px] mt-1" style={{ color: completo ? "var(--sucesso)" : "var(--tinta-sub)" }}>
                      {completo ? "Tudo feito hoje" : `${feitos} de ${c.itens.length} feitos`}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}
    </section>
  );
}

function faixa(l: LocalArmazenamento): string {
  if (l.temperaturaMinC != null && l.temperaturaMaxC != null) return `${l.temperaturaMinC} a ${l.temperaturaMaxC} °C`;
  if (l.temperaturaMaxC != null) return `até ${l.temperaturaMaxC} °C`;
  if (l.temperaturaMinC != null) return `a partir de ${l.temperaturaMinC} °C`;
  return "sem faixa definida";
}

function foraDaFaixa(l: LocalArmazenamento, t: number): boolean {
  return (l.temperaturaMinC != null && t < l.temperaturaMinC) || (l.temperaturaMaxC != null && t > l.temperaturaMaxC);
}

function SecaoTemperatura({ locais, temperaturas: iniciais, responsavel, acoes }: { locais: LocalArmazenamento[]; temperaturas: RegistroTemperatura[]; responsavel: string; acoes: AcoesCozinha }) {
  const { mostrarErro, mostrarSucesso } = useToast();
  const [registros, setRegistros] = useState(iniciais);
  useEffect(() => setRegistros(iniciais), [iniciais]);
  const [valores, setValores] = useState<Record<string, string>>({});
  const [salvando, setSalvando] = useState<string | null>(null);

  if (locais.length === 0) return <Vazio texto="Nenhum equipamento cadastrado. O gestor cadastra em Segurança alimentar." />;

  const registrar = async (l: LocalArmazenamento) => {
    const t = Number((valores[l.id] ?? "").replace(",", "."));
    if (!(valores[l.id] ?? "").trim() || !Number.isFinite(t)) return mostrarErro("Digite a temperatura que o termômetro mostra.");
    setSalvando(l.id);
    const r = await acoes.registrarTemperatura(l.id, t, responsavel);
    setSalvando(null);
    if (!r.ok) return mostrarErro(r.erro);
    setRegistros((atual) => [
      { id: `novo-${Date.now()}`, localArmazenamentoId: l.id, nomeLocal: l.nome, temperaturaC: t, responsavel, registradoEm: new Date().toISOString(), insumoId: null, nomeInsumo: null },
      ...atual,
    ]);
    setValores((v) => ({ ...v, [l.id]: "" }));
    if (foraDaFaixa(l, t)) mostrarErro(`${l.nome} fora da faixa (${faixa(l)}). Avise o responsável agora.`);
    else mostrarSucesso(`${l.nome}: ${t} °C registrado.`);
  };

  return (
    <section className="grid sm:grid-cols-2 gap-3">
      {locais.map((l) => {
        const ultimo = registros.find((r) => r.localArmazenamentoId === l.id);
        const alerta = ultimo ? foraDaFaixa(l, ultimo.temperaturaC) : false;
        return (
          <Cartao key={l.id} className="p-4">
            <div className="flex items-start justify-between gap-2">
              <div>
                <div className="text-[17px] font-semibold">{l.nome}</div>
                <div className="text-[14px] text-[var(--tinta-faint)]">{faixa(l)}</div>
              </div>
              {ultimo && (
                <div className="text-right">
                  <div className="text-[20px] font-semibold" style={{ ...nums, color: alerta ? "var(--danger)" : "var(--tinta)" }}>{ultimo.temperaturaC} °C</div>
                  <div className="text-[12px] text-[var(--tinta-faint)]">
                    {new Date(ultimo.registradoEm).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })} · {ultimo.responsavel}
                  </div>
                </div>
              )}
            </div>
            <div className="flex gap-2 mt-3">
              <input
                className={campoGrande}
                style={estiloCampo}
                inputMode="decimal"
                placeholder="°C"
                aria-label={`Temperatura de ${l.nome}`}
                value={valores[l.id] ?? ""}
                onChange={(e) => setValores((v) => ({ ...v, [l.id]: e.target.value }))}
              />
              <button onClick={() => registrar(l)} disabled={salvando === l.id} className={botaoGrande} style={{ background: "var(--tinta)", color: "var(--panel)" }}>
                Registrar
              </button>
            </div>
          </Cartao>
        );
      })}
    </section>
  );
}

const MOTIVOS_PERDA = ["Queimou", "Caiu no chão", "Passou da validade", "Contaminação", "Erro no preparo"];

function SecaoProducao({ fichas, producoes: iniciais, responsavel, acoes }: { fichas: FichaCozinha[]; producoes: ProducaoCozinha[]; responsavel: string; acoes: AcoesCozinha }) {
  const { mostrarErro, mostrarSucesso, mostrarInfo } = useToast();
  const [producoes, setProducoes] = useState(iniciais);
  useEffect(() => setProducoes(iniciais), [iniciais]);
  const [receitaId, setReceitaId] = useState("");
  const [quantidade, setQuantidade] = useState("");
  const [salvando, setSalvando] = useState(false);
  const [perdaDe, setPerdaDe] = useState<string | null>(null);
  const ficha = fichas.find((f) => f.id === receitaId);

  const registrar = async () => {
    const q = Number(quantidade.replace(",", "."));
    if (!ficha) return mostrarErro("Escolha o que foi produzido.");
    if (!(q > 0)) return mostrarErro("Informe a quantidade produzida.");
    setSalvando(true);
    const r = await acoes.registrarProducao(ficha.id, q, responsavel);
    setSalvando(false);
    if (!r.ok) return mostrarErro(r.erro);
    setProducoes((atual) => [
      { id: `novo-${Date.now()}`, lote: "novo", receitaId: ficha.id, nomeReceita: ficha.nome, quantidade: q, unidade: ficha.unidadeRendimento, responsavel, status: "em_producao", motivoPerda: null, criadoEm: new Date().toISOString() },
      ...atual,
    ]);
    setQuantidade("");
    if (r.aviso) mostrarInfo(r.aviso);
    else mostrarSucesso(`${ficha.nome} registrado. O estoque já foi baixado.`);
  };

  const mudarStatus = async (p: ProducaoCozinha, status: StatusProducao, motivo: string | null = null) => {
    const r = await acoes.atualizarProducao(p.id, status, motivo);
    if (!r.ok) return mostrarErro(r.erro);
    setProducoes((atual) => atual.map((x) => (x.id === p.id ? { ...x, status, motivoPerda: motivo } : x)));
    setPerdaDe(null);
  };

  const pratos = fichas.filter((f) => f.tipo === "prato_final");
  const preparos = fichas.filter((f) => f.tipo === "preparo_base");

  return (
    <section className="space-y-6">
      <Cartao className="p-4 space-y-3">
        <h1 className="text-[20px] font-semibold tracking-tight">Registrar produção</h1>
        <select className={campoGrande} style={estiloCampo} value={receitaId} onChange={(e) => setReceitaId(e.target.value)} aria-label="O que foi produzido">
          <option value="">O que foi produzido?</option>
          {preparos.length > 0 && (
            <optgroup label="Preparos">
              {preparos.map((f) => <option key={f.id} value={f.id}>{f.nome}</option>)}
            </optgroup>
          )}
          {pratos.length > 0 && (
            <optgroup label="Pratos">
              {pratos.map((f) => <option key={f.id} value={f.id}>{f.nome}</option>)}
            </optgroup>
          )}
        </select>
        <div className="flex gap-2 items-center">
          <input className={campoGrande} style={estiloCampo} inputMode="decimal" placeholder="Quantidade" aria-label="Quantidade produzida" value={quantidade} onChange={(e) => setQuantidade(e.target.value)} />
          <span className="text-[16px] text-[var(--tinta-sub)] min-w-20">{ficha?.unidadeRendimento ?? ""}</span>
        </div>
        <button onClick={registrar} disabled={salvando} className={`${botaoGrande} w-full`} style={{ background: "var(--tinta)", color: "var(--panel)" }}>
          {salvando ? "Registrando..." : "Registrar produção"}
        </button>
      </Cartao>

      <div>
        <h2 className="text-[17px] font-semibold mb-2">Hoje</h2>
        {producoes.length === 0 ? (
          <p className="text-[15px] text-[var(--tinta-faint)]">Nada registrado hoje ainda.</p>
        ) : (
          <Cartao>
            {producoes.map((p, n) => (
              <div key={p.id} className={`px-4 py-3 ${n > 0 ? "border-t" : ""}`} style={{ borderColor: "var(--linha)" }}>
                <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
                  <div className="flex-1 min-w-0">
                    <div className="text-[16px] font-medium">
                      {p.nomeReceita} <span className="text-[var(--tinta-sub)] font-normal" style={nums}>· {formatQtd(p.quantidade)} {p.unidade}</span>
                    </div>
                    <div className="text-[13px] text-[var(--tinta-faint)]">
                      {p.responsavel} · {new Date(p.criadoEm).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                      {p.status === "perda" && p.motivoPerda ? ` · perda: ${p.motivoPerda}` : ""}
                    </div>
                  </div>
                  <StatusProducaoSelo status={p.status} />
                  {p.status === "em_producao" && (
                    <>
                      <button onClick={() => mudarStatus(p, "produzido")} className="min-h-11 px-4 rounded-lg text-[15px] font-medium border" style={{ borderColor: "var(--linha-forte)" }}>
                        Pronto
                      </button>
                      <button onClick={() => setPerdaDe(perdaDe === p.id ? null : p.id)} className="min-h-11 px-4 rounded-lg text-[15px] font-medium border" style={{ borderColor: "var(--linha-forte)", color: "var(--danger)" }}>
                        Perda
                      </button>
                    </>
                  )}
                </div>
                {perdaDe === p.id && (
                  <div className="flex flex-wrap gap-2 mt-3">
                    {MOTIVOS_PERDA.map((m) => (
                      <button key={m} onClick={() => mudarStatus(p, "perda", m)} className="min-h-11 px-4 rounded-full text-[15px] border" style={{ borderColor: "var(--linha-forte)" }}>
                        {m}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </Cartao>
        )}
      </div>
    </section>
  );
}

function StatusProducaoSelo({ status }: { status: StatusProducao }) {
  const mapa: Record<StatusProducao, { rotulo: string; cor: string }> = {
    em_producao: { rotulo: "Em produção", cor: "var(--status-producao)" },
    produzido: { rotulo: "Pronto", cor: "var(--sucesso)" },
    perda: { rotulo: "Perda", cor: "var(--danger)" },
  };
  const s = mapa[status];
  return (
    <span className="text-[13px] font-medium px-2 py-1 rounded-md" style={{ color: s.cor, background: `color-mix(in srgb, ${s.cor} 10%, transparent)` }}>
      {s.rotulo}
    </span>
  );
}

function SecaoFichas({ fichas }: { fichas: FichaCozinha[] }) {
  const [busca, setBusca] = useState("");
  const [abertaId, setAbertaId] = useState<string | null>(null);
  const [alvo, setAlvo] = useState("");
  const aberta = fichas.find((f) => f.id === abertaId);
  const filtradas = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    return termo ? fichas.filter((f) => f.nome.toLowerCase().includes(termo)) : fichas;
  }, [busca, fichas]);

  if (aberta) {
    const quantoFazer = Number(alvo.replace(",", ".")) || aberta.rendimento;
    const fator = quantoFazer / (aberta.rendimento || 1);
    return (
      <section>
        <Voltar onClick={() => { setAbertaId(null); setAlvo(""); }} />
        <div className="flex flex-col sm:flex-row gap-4">
          {aberta.fotoUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={aberta.fotoUrl} onError={esconderImagem} alt={`Prato pronto: ${aberta.nome}`} className="w-full sm:w-56 h-48 object-cover rounded-xl border" style={{ borderColor: "var(--linha)" }} />
          )}
          <div>
            <h1 className="text-[24px] font-semibold tracking-tight">{aberta.nome}</h1>
            <p className="text-[15px] text-[var(--tinta-sub)] mt-1">
              A ficha rende {formatQtd(aberta.rendimento)} {aberta.unidadeRendimento}
              {aberta.pesoPorcaoG ? ` · porção de ${formatQtd(aberta.pesoPorcaoG)} g` : ""}
            </p>
            <label className="flex items-center gap-2 mt-3 text-[15px]">
              Vou fazer
              <input className="min-h-12 w-24 px-3 rounded-lg text-[18px] text-center" style={estiloCampo} inputMode="decimal" placeholder={formatQtd(aberta.rendimento)} value={alvo} onChange={(e) => setAlvo(e.target.value)} />
              {aberta.unidadeRendimento}
            </label>
          </div>
        </div>

        <h2 className="text-[17px] font-semibold mt-6 mb-2">Ingredientes</h2>
        <Cartao>
          {aberta.ingredientes.map((i, n) => (
            <div key={i.id} className={`min-h-14 px-4 py-3 flex items-center gap-3 ${n > 0 ? "border-t" : ""}`} style={{ borderColor: "var(--linha)" }}>
              <span className="flex-1 text-[16px]">
                {i.nome}
                {i.ehPreparo && <span className="text-[13px] text-[var(--tinta-faint)]"> · preparo da casa</span>}
              </span>
              <span className="text-[18px] font-semibold" style={nums}>{formatQtd(Number((i.quantidade * fator).toFixed(3)))} {i.unidade}</span>
            </div>
          ))}
        </Cartao>

        {aberta.modoPreparo && (
          <>
            <h2 className="text-[17px] font-semibold mt-6 mb-2">Modo de preparo</h2>
            <p className="text-[16px] leading-relaxed whitespace-pre-line">{aberta.modoPreparo}</p>
          </>
        )}
        {aberta.etapas.length > 0 && (
          <ol className="mt-4 space-y-3">
            {aberta.etapas.map((e) => (
              <li key={e.ordem} className="flex gap-3">
                <span className="w-8 h-8 rounded-full flex items-center justify-center text-[15px] font-semibold shrink-0" style={{ background: "var(--panel-elevated)" }}>{e.ordem}</span>
                <div className="flex-1">
                  {e.titulo && <div className="text-[16px] font-semibold">{e.titulo}</div>}
                  {e.texto && <p className="text-[16px] leading-relaxed">{e.texto}</p>}
                  {e.fotoUrl && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={e.fotoUrl} onError={esconderImagem} alt={e.titulo ?? `Etapa ${e.ordem}`} className="mt-2 max-h-52 rounded-lg border" style={{ borderColor: "var(--linha)" }} />
                  )}
                </div>
              </li>
            ))}
          </ol>
        )}
      </section>
    );
  }

  return (
    <section>
      <div className="relative mb-4">
        <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--tinta-faint)]" />
        <input className={`${campoGrande} pl-11`} style={estiloCampo} placeholder="Buscar ficha" value={busca} onChange={(e) => setBusca(e.target.value)} />
      </div>
      {filtradas.length === 0 ? (
        <Vazio texto="Nenhuma ficha encontrada." />
      ) : (
        <Cartao>
          {filtradas.map((f, n) => (
            <button key={f.id} onClick={() => setAbertaId(f.id)} className={`w-full min-h-14 px-4 py-3 flex items-center gap-3 text-left ${n > 0 ? "border-t" : ""}`} style={{ borderColor: "var(--linha)" }}>
              <span className="flex-1 text-[16px] font-medium">{f.nome}</span>
              <span className="text-[14px] text-[var(--tinta-faint)]">{f.tipo === "preparo_base" ? "Preparo" : "Prato"}</span>
            </button>
          ))}
        </Cartao>
      )}
    </section>
  );
}

function SecaoContagem({ itens, responsavel, acoes }: { itens: ItemContagem[]; responsavel: string; acoes: AcoesCozinha }) {
  const { mostrarErro } = useToast();
  const [valores, setValores] = useState<Record<string, string>>({});
  const [enviando, setEnviando] = useState(false);
  const [enviada, setEnviada] = useState(false);

  const preenchidos = itens.filter((i) => (valores[i.insumoId] ?? "").trim() !== "");
  const locais = Array.from(new Set(itens.map((i) => i.local)));

  if (itens.length === 0) return <Vazio texto="Nenhum item com estoque controlado." />;

  if (enviada) {
    return (
      <Cartao className="p-6 max-w-xl">
        <div className="w-11 h-11 rounded-full flex items-center justify-center mb-3" style={{ background: "color-mix(in srgb, var(--sucesso) 12%, transparent)", color: "var(--sucesso)" }}>
          <Check size={22} />
        </div>
        <h1 className="text-[20px] font-semibold">Contagem enviada</h1>
        <p className="text-[15px] text-[var(--tinta-sub)] mt-1">Obrigado, {responsavel}. O gestor confere a diferença.</p>
        <button onClick={() => { setEnviada(false); setValores({}); }} className={`${botaoGrande} border mt-5`} style={{ borderColor: "var(--linha-forte)" }}>
          Fazer outra contagem
        </button>
      </Cartao>
    );
  }

  const enviar = async () => {
    const lista = preenchidos.map((i) => ({ insumoId: i.insumoId, quantidade: Number(valores[i.insumoId].replace(",", ".")) }));
    if (lista.some((i) => !Number.isFinite(i.quantidade) || i.quantidade < 0)) return mostrarErro("Tem quantidade inválida. Use só números.");
    if (!window.confirm(`Enviar a contagem de ${lista.length} ${lista.length === 1 ? "item" : "itens"}?`)) return;
    setEnviando(true);
    const r = await acoes.enviarContagem(responsavel, lista);
    setEnviando(false);
    if (!r.ok) return mostrarErro(r.erro);
    setEnviada(true);
  };

  return (
    <section className="pb-24">
      <div className="flex items-start gap-3 mb-5 max-w-2xl">
        <EyeOff size={20} className="mt-0.5 text-[var(--tinta-faint)] shrink-0" />
        <p className="text-[15px] text-[var(--tinta-sub)]">
          Conte o que está na prateleira e digite o número. Você não vê o saldo do sistema; o gestor confere a diferença. Pode deixar em branco o
          que não contou.
        </p>
      </div>
      <div className="space-y-5">
        {locais.map((local) => (
          <div key={local}>
            <h2 className="text-[17px] font-semibold mb-2">{local}</h2>
            <Cartao>
              {itens
                .filter((i) => i.local === local)
                .map((i, n) => (
                  <label key={i.insumoId} className={`min-h-16 px-4 py-2 flex items-center gap-3 ${n > 0 ? "border-t" : ""}`} style={{ borderColor: "var(--linha)" }}>
                    <span className="flex-1 text-[16px]">{i.nome}</span>
                    <input
                      className="min-h-12 w-28 px-3 rounded-lg text-[18px] text-right"
                      style={estiloCampo}
                      inputMode="decimal"
                      value={valores[i.insumoId] ?? ""}
                      onChange={(e) => setValores((v) => ({ ...v, [i.insumoId]: e.target.value }))}
                      aria-label={`Quantidade contada de ${i.nome}, em ${i.unidade}`}
                    />
                    <span className="w-8 text-[15px] text-[var(--tinta-faint)]">{i.unidade}</span>
                  </label>
                ))}
            </Cartao>
          </div>
        ))}
      </div>
      <div className="fixed inset-x-0 bottom-0 border-t" style={{ background: "var(--panel)", borderColor: "var(--linha)" }}>
        <div className="max-w-4xl mx-auto px-4 py-3">
          <button onClick={enviar} disabled={enviando || preenchidos.length === 0} className={`${botaoGrande} w-full`} style={{ background: "var(--tinta)", color: "var(--panel)" }}>
            {enviando ? "Enviando..." : preenchidos.length === 0 ? "Digite o que contou" : `Enviar contagem (${preenchidos.length} ${preenchidos.length === 1 ? "item" : "itens"})`}
          </button>
        </div>
      </div>
    </section>
  );
}

function Voltar({ onClick }: { onClick: () => void }) {
  return (
    <button onClick={onClick} className="min-h-11 -ml-2 pl-1 pr-3 mb-3 inline-flex items-center gap-1 text-[15px] font-medium text-[var(--tinta-sub)]">
      <ChevronLeft size={20} /> Voltar
    </button>
  );
}

function Vazio({ texto }: { texto: string }) {
  return (
    <div className="flex items-start gap-3 text-[15px] text-[var(--tinta-sub)] max-w-xl">
      <AlertTriangle size={18} className="mt-0.5 shrink-0 text-[var(--tinta-faint)]" />
      {texto}
    </div>
  );
}
