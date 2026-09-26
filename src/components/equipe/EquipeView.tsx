"use client";

// EQUIPE (2026-09-25): tela Equipe e acessos. Usada no app (/equipe, ações de
// verdade em src/app/equipe/actions.ts) e na demo (/preview/equipe, ações
// simuladas). Três blocos: quem entra com senha (dono, gestor, estoquista), a
// cozinha sem senha (aparelhos conectados + nomes do pessoal) e o quadro do
// que cada papel vê.

import { useEffect, useState } from "react";
import { Check, KeyRound, Lock, MonitorSmartphone, Plus, Trash2, X } from "lucide-react";
import { Card } from "@/components/ficha/Card";
import { Badge } from "@/components/ficha/Badge";
import { Input } from "@/components/ficha/Input";
import { ErroBanner } from "@/components/ficha/ErroBanner";
import { useToast } from "@/components/ficha/Toast";
import { nums } from "@/components/ficha/tema";
import { ROTULO_PAPEL, type Papel } from "@/lib/auth/papeis";
import type { CodigoCozinha, Funcionario, Membro, NovoAcessoInput } from "@/lib/dominio/equipe";
import type { LinkConsulta } from "@/lib/dominio/consulta";
import { LinksConsulta, type AcoesLinks } from "./LinksConsulta";

export type ResultadoEquipe<T = undefined> = { ok: true; dados?: T } | { ok: false; erro: string };

export interface AcoesEquipe extends AcoesLinks {
  criarAcesso: (input: NovoAcessoInput) => Promise<ResultadoEquipe>;
  definirAtivo: (membroId: string, ativo: boolean) => Promise<ResultadoEquipe>;
  trocarSenha: (membroId: string, senha: string) => Promise<ResultadoEquipe>;
  removerAparelho: (membroId: string) => Promise<ResultadoEquipe>;
  gerarCodigo: () => Promise<ResultadoEquipe<CodigoCozinha>>;
  adicionarFuncionario: (nome: string) => Promise<ResultadoEquipe>;
  removerFuncionario: (id: string) => Promise<ResultadoEquipe>;
}

const botaoPrimario = "text-[13px] font-medium px-3.5 min-h-9 rounded-lg inline-flex items-center gap-1.5 disabled:opacity-60";
const botaoSecundario = "text-[13px] font-medium px-3 min-h-9 rounded-lg border inline-flex items-center gap-1.5 hover:bg-[var(--panel-hover)] disabled:opacity-60";

export function EquipeView({
  membros: membrosIniciais,
  funcionarios: funcionariosIniciais,
  papelAtual,
  userIdAtual,
  acoes,
  enderecoCozinha,
  links,
  nomeRestaurante,
}: {
  membros: Membro[];
  funcionarios: Funcionario[];
  /** CELULAR (2026-09-26): links de consulta ativos, por pessoa. */
  links: LinkConsulta[];
  nomeRestaurante: string;
  papelAtual: Papel;
  userIdAtual: string;
  acoes: AcoesEquipe;
  /** Endereço que o aparelho da cozinha abre, ex.: "app.fichatecnica.com.br/cozinha". */
  enderecoCozinha: string;
}) {
  const { mostrarErro, mostrarSucesso } = useToast();
  const [membros, setMembros] = useState(membrosIniciais);
  const [funcionarios, setFuncionarios] = useState(funcionariosIniciais);
  useEffect(() => setMembros(membrosIniciais), [membrosIniciais]);
  useEffect(() => setFuncionarios(funcionariosIniciais), [funcionariosIniciais]);

  const comSenha = membros.filter((m) => m.papel !== "cozinha");
  const aparelhos = membros.filter((m) => m.papel === "cozinha");

  const [formAberto, setFormAberto] = useState(false);
  const [novo, setNovo] = useState<NovoAcessoInput>({ nome: "", usuario: "", senha: "", papel: "estoquista" });
  const [salvando, setSalvando] = useState(false);
  const [erroForm, setErroForm] = useState<string | null>(null);
  const [senhaDe, setSenhaDe] = useState<string | null>(null);
  const [novaSenha, setNovaSenha] = useState("");
  const [codigo, setCodigo] = useState<CodigoCozinha | null>(null);
  const [nomeFuncionario, setNomeFuncionario] = useState("");

  const podeMexerEm = (m: Membro) =>
    m.papel !== "dono" && m.userId !== userIdAtual && (m.papel !== "gestor" || papelAtual === "dono");

  const criarAcesso = async () => {
    setSalvando(true);
    setErroForm(null);
    const r = await acoes.criarAcesso(novo);
    setSalvando(false);
    if (!r.ok) return setErroForm(r.erro);
    setMembros((atual) => [
      ...atual,
      { id: `novo-${Date.now()}`, userId: "", papel: novo.papel, nome: novo.nome.trim(), usuario: novo.usuario.trim().toLowerCase(), ativo: true, criadoEm: new Date().toISOString() },
    ]);
    mostrarSucesso(`Acesso criado. ${novo.nome.trim()} entra com o usuário "${novo.usuario.trim().toLowerCase()}".`);
    setNovo({ nome: "", usuario: "", senha: "", papel: "estoquista" });
    setFormAberto(false);
  };

  const alternarAtivo = async (m: Membro) => {
    const r = await acoes.definirAtivo(m.id, !m.ativo);
    if (!r.ok) return mostrarErro(r.erro);
    setMembros((atual) => atual.map((x) => (x.id === m.id ? { ...x, ativo: !m.ativo } : x)));
    mostrarSucesso(m.ativo ? `${m.nome} não entra mais no sistema.` : `${m.nome} voltou a ter acesso.`);
  };

  const salvarSenha = async (m: Membro) => {
    const r = await acoes.trocarSenha(m.id, novaSenha);
    if (!r.ok) return mostrarErro(r.erro);
    setSenhaDe(null);
    setNovaSenha("");
    mostrarSucesso(`Senha de ${m.nome} trocada.`);
  };

  const gerarCodigo = async () => {
    const r = await acoes.gerarCodigo();
    if (!r.ok || !r.dados) return mostrarErro(r.ok ? "Não foi possível gerar o código." : r.erro);
    setCodigo(r.dados);
  };

  const removerAparelho = async (m: Membro) => {
    if (!window.confirm(`Desconectar "${m.nome}"? O aparelho sai do modo cozinha na hora.`)) return;
    const r = await acoes.removerAparelho(m.id);
    if (!r.ok) return mostrarErro(r.erro);
    setMembros((atual) => atual.filter((x) => x.id !== m.id));
  };

  const adicionarFuncionario = async () => {
    const nome = nomeFuncionario.trim();
    if (!nome) return;
    const r = await acoes.adicionarFuncionario(nome);
    if (!r.ok) return mostrarErro(r.erro);
    setFuncionarios((atual) => [...atual, { id: `novo-${Date.now()}`, nome }].sort((a, b) => a.nome.localeCompare(b.nome)));
    setNomeFuncionario("");
  };

  const removerFuncionario = async (f: Funcionario) => {
    const r = await acoes.removerFuncionario(f.id);
    if (!r.ok) return mostrarErro(r.erro);
    setFuncionarios((atual) => atual.filter((x) => x.id !== f.id));
  };

  return (
    <div className="space-y-6 max-w-5xl">
      <p className="text-[14px] text-[var(--tinta-sub)] max-w-2xl">
        Quem entra no sistema e o que cada um enxerga. O bloqueio vale no banco de dados, não só no menu: a conta do estoquista ou o
        aparelho da cozinha não conseguem puxar faturamento, margem ou custo nem por fora do app.
      </p>

      {/* Acessos com senha */}
      <Card className="p-0 overflow-hidden">
        <div className="px-5 py-4 flex items-start justify-between gap-3 border-b" style={{ borderColor: "var(--linha)" }}>
          <div>
            <h2 className="text-[15px] font-semibold text-[var(--tinta)]">Acessos com senha</h2>
            <p className="text-[13px] text-[var(--tinta-sub)] mt-0.5">Dono, gestor e estoquista entram com usuário e senha.</p>
          </div>
          <button
            onClick={() => setFormAberto(!formAberto)}
            className={botaoPrimario}
            style={{ background: formAberto ? "var(--panel-elevated)" : "var(--tinta)", color: formAberto ? "var(--tinta)" : "var(--panel)" }}
          >
            {formAberto ? <X size={15} /> : <Plus size={15} />}
            {formAberto ? "Fechar" : "Novo acesso"}
          </button>
        </div>

        {formAberto && (
          <div className="px-5 py-4 border-b space-y-3" style={{ borderColor: "var(--linha)", background: "var(--panel-elevated)" }}>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <label className="text-[12px] font-medium text-[var(--tinta-sub)]">
                Nome
                <Input className="mt-1" placeholder="Maria Souza" value={novo.nome} onChange={(e) => setNovo({ ...novo, nome: e.target.value })} />
              </label>
              <label className="text-[12px] font-medium text-[var(--tinta-sub)]">
                Papel
                <select
                  className="mt-1 w-full text-[13px] px-3 py-2 rounded-lg"
                  style={{ border: "1px solid var(--border-strong)", background: "var(--panel)" }}
                  value={novo.papel}
                  onChange={(e) => setNovo({ ...novo, papel: e.target.value as NovoAcessoInput["papel"] })}
                >
                  <option value="estoquista">Estoquista: compras e estoque</option>
                  {papelAtual === "dono" && <option value="gestor">Gestor: vê tudo da operação</option>}
                </select>
              </label>
              <label className="text-[12px] font-medium text-[var(--tinta-sub)]">
                Usuário (é o que a pessoa digita pra entrar)
                <Input
                  className="mt-1"
                  placeholder="maria.estoque"
                  autoCapitalize="none"
                  spellCheck={false}
                  value={novo.usuario}
                  onChange={(e) => setNovo({ ...novo, usuario: e.target.value })}
                />
              </label>
              <label className="text-[12px] font-medium text-[var(--tinta-sub)]">
                Senha (mínimo 8 caracteres)
                <Input className="mt-1" type="text" autoComplete="new-password" value={novo.senha} onChange={(e) => setNovo({ ...novo, senha: e.target.value })} />
              </label>
            </div>
            <ErroBanner erro={erroForm} />
            <div className="flex items-center gap-3">
              <button onClick={criarAcesso} disabled={salvando} className={botaoPrimario} style={{ background: "var(--tinta)", color: "var(--panel)" }}>
                {salvando ? "Criando..." : "Criar acesso"}
              </button>
              <span className="text-[12px] text-[var(--tinta-faint)]">Passe o usuário e a senha pra pessoa. Ela entra na mesma tela de login.</span>
            </div>
          </div>
        )}

        <ul>
          {comSenha.map((m) => (
            <li key={m.id} className="px-5 py-3 border-t first:border-t-0 flex flex-wrap items-center gap-x-4 gap-y-2" style={{ borderColor: "var(--linha)" }}>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-[14px] font-medium text-[var(--tinta)] truncate">{m.nome}</span>
                  <Badge variante={m.papel === "estoquista" ? "info" : "padrao"}>{ROTULO_PAPEL[m.papel]}</Badge>
                  {!m.ativo && <Badge variante="acao">Desativado</Badge>}
                </div>
                <div className="text-[12px] text-[var(--tinta-faint)] mt-0.5" style={nums}>
                  {m.usuario ? `usuário: ${m.usuario}` : "entra com o e-mail do cadastro"}
                </div>
              </div>
              {podeMexerEm(m) && (
                <div className="flex items-center gap-2">
                  {senhaDe === m.id ? (
                    <>
                      <Input className="w-40" placeholder="Nova senha" value={novaSenha} onChange={(e) => setNovaSenha(e.target.value)} />
                      <button onClick={() => salvarSenha(m)} className={botaoSecundario} style={{ borderColor: "var(--linha-forte)" }} aria-label="Salvar senha">
                        <Check size={15} />
                      </button>
                      <button onClick={() => setSenhaDe(null)} className={botaoSecundario} style={{ borderColor: "var(--linha-forte)" }} aria-label="Cancelar">
                        <X size={15} />
                      </button>
                    </>
                  ) : (
                    <button onClick={() => { setSenhaDe(m.id); setNovaSenha(""); }} className={botaoSecundario} style={{ borderColor: "var(--linha-forte)" }}>
                      <KeyRound size={14} /> Trocar senha
                    </button>
                  )}
                  <button onClick={() => alternarAtivo(m)} className={botaoSecundario} style={{ borderColor: "var(--linha-forte)", color: m.ativo ? "var(--danger)" : "var(--tinta)" }}>
                    {m.ativo ? "Desativar" : "Reativar"}
                  </button>
                </div>
              )}
            </li>
          ))}
        </ul>
      </Card>

      {/* Cozinha sem senha */}
      <Card className="p-0 overflow-hidden">
        <div className="px-5 py-4 flex items-start justify-between gap-3 border-b" style={{ borderColor: "var(--linha)" }}>
          <div>
            <h2 className="text-[15px] font-semibold text-[var(--tinta)]">Cozinha, sem senha</h2>
            <p className="text-[13px] text-[var(--tinta-sub)] mt-0.5 max-w-xl">
              Conecte o tablet ou o celular da cozinha uma vez. Depois ninguém digita senha: o aparelho abre direto no modo cozinha e não sai
              dele.
            </p>
          </div>
          <button onClick={gerarCodigo} className={botaoPrimario} style={{ background: "var(--tinta)", color: "var(--panel)" }}>
            <MonitorSmartphone size={15} /> Conectar aparelho
          </button>
        </div>

        {codigo && (
          <div className="px-5 py-4 border-b flex flex-wrap items-center gap-5" style={{ borderColor: "var(--linha)", background: "var(--panel-elevated)" }}>
            <div className="text-[28px] font-semibold tracking-[0.12em] text-[var(--tinta)]" style={nums}>
              {codigo.codigo}
            </div>
            <ol className="text-[13px] text-[var(--tinta-sub)] space-y-0.5 list-decimal pl-4">
              <li>
                No aparelho da cozinha, abra <b className="text-[var(--tinta)]">{enderecoCozinha}</b>
              </li>
              <li>Digite este código. Ele vale uma vez só, até {new Date(codigo.expiraEm).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}.</li>
            </ol>
          </div>
        )}

        <ul>
          {aparelhos.length === 0 && <li className="px-5 py-4 text-[13px] text-[var(--tinta-faint)]">Nenhum aparelho conectado ainda.</li>}
          {aparelhos.map((m) => (
            <li key={m.id} className="px-5 py-3 border-t first:border-t-0 flex items-center gap-3" style={{ borderColor: "var(--linha)" }}>
              <MonitorSmartphone size={16} className="text-[var(--tinta-faint)] shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="text-[14px] font-medium text-[var(--tinta)]">{m.nome}</div>
                <div className="text-[12px] text-[var(--tinta-faint)]">conectado em {new Date(m.criadoEm).toLocaleDateString("pt-BR")}</div>
              </div>
              <button onClick={() => removerAparelho(m)} className={botaoSecundario} style={{ borderColor: "var(--linha-forte)", color: "var(--danger)" }}>
                Desconectar
              </button>
            </li>
          ))}
        </ul>

        <div className="px-5 py-4 border-t" style={{ borderColor: "var(--linha)" }}>
          <h3 className="text-[13px] font-semibold text-[var(--tinta)]">Quem trabalha na cozinha</h3>
          <p className="text-[12px] text-[var(--tinta-faint)] mt-0.5 mb-3">
            Aparece no aparelho pra cada um marcar o próprio nome no que fez. Fica registrado em cada checklist, temperatura, produção e contagem.
          </p>
          <div className="flex flex-wrap gap-2 mb-3">
            {funcionarios.map((f) => (
              <span key={f.id} className="inline-flex items-center gap-1.5 text-[13px] pl-3 pr-1 min-h-8 rounded-full border" style={{ borderColor: "var(--linha-forte)" }}>
                {f.nome}
                <button onClick={() => removerFuncionario(f)} className="w-6 h-6 rounded-full flex items-center justify-center text-[var(--tinta-faint)] hover:text-[var(--danger)]" aria-label={`Remover ${f.nome}`}>
                  <Trash2 size={13} />
                </button>
              </span>
            ))}
            {funcionarios.length === 0 && <span className="text-[13px] text-[var(--tinta-faint)]">Nenhum nome cadastrado.</span>}
          </div>
          <div className="flex gap-2 max-w-sm">
            <Input aria-label="Nome" placeholder="Nome" value={nomeFuncionario} onChange={(e) => setNomeFuncionario(e.target.value)} onKeyDown={(e) => e.key === "Enter" && adicionarFuncionario()} />
            <button onClick={adicionarFuncionario} className={botaoSecundario} style={{ borderColor: "var(--linha-forte)" }}>
              Adicionar
            </button>
          </div>
        </div>
      </Card>

      <LinksConsulta funcionarios={funcionarios} links={links} nomeRestaurante={nomeRestaurante} acoes={acoes} />

      <QuadroAcessos />
    </div>
  );
}

const LINHAS_QUADRO: { item: string; acesso: [boolean, boolean, boolean, boolean] }[] = [
  { item: "Faturamento, relatórios e margem", acesso: [true, true, false, false] },
  { item: "Preço de venda e custo dos pratos", acesso: [true, true, false, false] },
  { item: "Insumos, preço de compra e fornecedores", acesso: [true, true, true, false] },
  { item: "Estoque e movimentações", acesso: [true, true, true, false] },
  { item: "CMV do estoque (consumo em R$)", acesso: [true, true, true, false] },
  { item: "Resultado da contagem cega", acesso: [true, true, false, false] },
  { item: "Checklists, temperaturas e produção", acesso: [true, true, false, true] },
  { item: "Ficha técnica (gramatura e preparo, sem custo)", acesso: [true, true, false, true] },
  { item: "Contar estoque sem ver o saldo", acesso: [true, true, false, true] },
  { item: "Equipe e acessos", acesso: [true, true, false, false] },
];

function QuadroAcessos() {
  return (
    <Card className="p-0 overflow-hidden">
      <div className="px-5 py-4 border-b" style={{ borderColor: "var(--linha)" }}>
        <h2 className="text-[15px] font-semibold text-[var(--tinta)]">O que cada papel vê</h2>
      </div>
      <div tabIndex={0} role="region" aria-label="Acessos da equipe" className="overflow-x-auto">
        <table className="w-full text-[13px]">
          <thead>
            <tr className="text-[var(--tinta-faint)]">
              <th className="py-2.5 px-5 font-medium text-left">&nbsp;</th>
              {(["dono", "gestor", "estoquista", "cozinha"] as Papel[]).map((p) => (
                <th key={p} className="py-2.5 px-3 font-medium text-center">{ROTULO_PAPEL[p]}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {LINHAS_QUADRO.map((l) => (
              <tr key={l.item} className="border-t" style={{ borderColor: "var(--linha)" }}>
                <td className="py-2.5 px-5 text-[var(--tinta)]">{l.item}</td>
                {l.acesso.map((ok, i) => (
                  <td key={i} className="py-2.5 px-3 text-center">
                    {ok ? (
                      <Check size={16} className="inline" style={{ color: "var(--sucesso)" }} aria-label="vê" />
                    ) : (
                      <Lock size={14} className="inline text-[var(--tinta-faint)]" aria-label="não vê" />
                    )}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
