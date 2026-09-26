"use client";

// PEDIDOS DA COZINHA (2026-09-26): agenda do fornecedor em campos de toque
// (dias da semana, horário limite, antecedência, categorias) — é daqui que a
// cozinha tira o "peça até terça às 18h pra chegar quarta". Uma coluna no
// celular, grade no computador.

import { useState } from "react";
import { ErroBanner } from "@/components/ficha/ErroBanner";
import { Input } from "@/components/ficha/Input";
import { useAcaoFormulario } from "@/hooks/useAcaoFormulario";
import { validarFornecedor, type Fornecedor, type FornecedorInput } from "@/lib/dominio/fornecedor";
import { CATEGORIAS_PEDIDO, DIAS_SEMANA_CURTO, type CategoriaPedido } from "@/lib/dominio/requisicao";
import { acaoCriarFornecedor, acaoAtualizarFornecedor } from "@/app/estoque/actions";

const campo = "text-[15px] md:text-[13px] px-3 min-h-11 md:min-h-10 w-full";

function Chip({ ativo, onClick, children }: { ativo: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={ativo}
      className="min-h-11 md:min-h-9 px-3 rounded-lg border text-[14px] md:text-[13px] font-medium"
      style={{
        borderColor: ativo ? "var(--tinta)" : "var(--linha-forte)",
        background: ativo ? "var(--tinta)" : "var(--panel)",
        color: ativo ? "var(--panel)" : "var(--tinta-sub)",
      }}
    >
      {children}
    </button>
  );
}

export function NovoFornecedorForm({ fornecedor, onCancel, onSaved }: { fornecedor?: Fornecedor; onCancel: () => void; onSaved: () => void }) {
  const [f, setF] = useState<FornecedorInput>({
    empresa: fornecedor?.empresa ?? "",
    contato: fornecedor?.contato ?? "",
    telefone: fornecedor?.telefone ?? "",
    email: fornecedor?.email ?? "",
    fornece: fornecedor?.fornece ?? "",
    entregaDias: fornecedor?.entregaDias ?? [],
    pedidoAte: fornecedor?.pedidoAte ?? "",
    pedidoAntecedencia: fornecedor?.pedidoAntecedencia ?? 1,
    categoriasPedido: fornecedor?.categoriasPedido ?? [],
    horarioEntrega: fornecedor?.horarioEntrega ?? "",
    prazoUrgencia: fornecedor?.prazoUrgencia ?? "",
  });
  const [aviso, setAviso] = useState<string | null>(null);
  const { salvando, erro, executar } = useAcaoFormulario(onSaved);
  const set = (k: keyof FornecedorInput) => (e: React.ChangeEvent<HTMLInputElement>) => setF({ ...f, [k]: e.target.value });
  const alternarDia = (d: number) => setF({ ...f, entregaDias: f.entregaDias.includes(d) ? f.entregaDias.filter((x) => x !== d) : [...f.entregaDias, d] });
  const alternarCategoria = (c: CategoriaPedido) =>
    setF({ ...f, categoriasPedido: f.categoriasPedido.includes(c) ? f.categoriasPedido.filter((x) => x !== c) : [...f.categoriasPedido, c] });

  const salvar = () => {
    const problema = validarFornecedor(f);
    setAviso(problema);
    if (problema) return;
    executar(() => (fornecedor ? acaoAtualizarFornecedor(fornecedor.id, f) : acaoCriarFornecedor(f)));
  };

  return (
    <div className="px-4 md:px-5 py-4 space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
        <Input aria-label="Empresa" placeholder="Empresa" value={f.empresa} onChange={set("empresa")} className={campo} />
        <Input aria-label="Nome do contato" placeholder="Nome do contato" value={f.contato} onChange={set("contato")} className={campo} />
        <Input aria-label="Telefone" inputMode="tel" placeholder="Telefone / WhatsApp" value={f.telefone} onChange={set("telefone")} className={campo} />
        <Input aria-label="E-mail" inputMode="email" placeholder="E-mail" value={f.email} onChange={set("email")} className={campo} />
        <Input aria-label="O que fornece" placeholder="O que fornece" value={f.fornece} onChange={set("fornece")} className={`${campo} md:col-span-2`} />
      </div>

      <fieldset>
        <legend className="text-[13px] font-medium text-[var(--tinta)] mb-1.5">Atende os pedidos da cozinha de</legend>
        <div className="flex flex-wrap gap-2">
          {CATEGORIAS_PEDIDO.map((c) => (
            <Chip key={c.id} ativo={f.categoriasPedido.includes(c.id)} onClick={() => alternarCategoria(c.id)}>
              {c.rotulo}
            </Chip>
          ))}
        </div>
      </fieldset>

      <fieldset>
        <legend className="text-[13px] font-medium text-[var(--tinta)] mb-1.5">Dias de entrega</legend>
        <div className="flex flex-wrap gap-2">
          {[1, 2, 3, 4, 5, 6, 0].map((d) => (
            <Chip key={d} ativo={f.entregaDias.includes(d)} onClick={() => alternarDia(d)}>
              {DIAS_SEMANA_CURTO[d][0].toUpperCase() + DIAS_SEMANA_CURTO[d].slice(1)}
            </Chip>
          ))}
        </div>
      </fieldset>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 items-end">
        <label className="text-[13px] font-medium text-[var(--tinta)]">
          Recebe pedido até
          <Input type="time" value={f.pedidoAte} onChange={set("pedidoAte")} className={`${campo} mt-1`} />
        </label>
        <label className="text-[13px] font-medium text-[var(--tinta)]">
          Antecedência
          <select
            value={f.pedidoAntecedencia}
            onChange={(e) => setF({ ...f, pedidoAntecedencia: Number(e.target.value) })}
            className={`${campo} mt-1 rounded-lg border bg-[var(--panel)]`}
            style={{ borderColor: "var(--linha-forte)" }}
          >
            <option value={0}>No dia da entrega</option>
            <option value={1}>1 dia antes</option>
            <option value={2}>2 dias antes</option>
            <option value={3}>3 dias antes</option>
          </select>
        </label>
        <label className="text-[13px] font-medium text-[var(--tinta)]">
          Horário da entrega
          <Input placeholder="ex.: 7h às 10h" value={f.horarioEntrega} onChange={set("horarioEntrega")} className={`${campo} mt-1`} />
        </label>
        <label className="text-[13px] font-medium text-[var(--tinta)]">
          Pedido de urgência
          <Input placeholder="ex.: mesmo dia até 7h" value={f.prazoUrgencia} onChange={set("prazoUrgencia")} className={`${campo} mt-1`} />
        </label>
      </div>

      <ErroBanner erro={aviso ?? erro} />
      <div className="flex flex-wrap gap-2">
        <button onClick={salvar} disabled={salvando} className="text-[14px] md:text-[13px] font-medium px-4 min-h-11 md:min-h-10 rounded-lg" style={{ background: "var(--accent)", color: "var(--accent-contrast, #fff)", opacity: salvando ? 0.6 : 1 }}>
          {salvando ? "Salvando..." : fornecedor ? "Salvar alterações" : "Salvar fornecedor"}
        </button>
        <button onClick={onCancel} className="text-[14px] md:text-[13px] font-medium px-4 min-h-11 md:min-h-10 rounded-lg" style={{ border: `1px solid ${"var(--border-strong)"}` }}>
          Cancelar
        </button>
      </div>
    </div>
  );
}
