"use client";

import { useState } from "react";
import { ErroBanner } from "@/components/ficha/ErroBanner";
import { Input } from "@/components/ficha/Input";
import { useAcaoFormulario } from "@/hooks/useAcaoFormulario";
import type { Fornecedor, FornecedorInput } from "@/lib/dominio/fornecedor";
import { acaoCriarFornecedor, acaoAtualizarFornecedor } from "@/app/estoque/actions";

export function NovoFornecedorForm({ fornecedor, onCancel, onSaved }: { fornecedor?: Fornecedor; onCancel: () => void; onSaved: () => void }) {
  const [f, setF] = useState<FornecedorInput>({
    empresa: fornecedor?.empresa ?? "",
    contato: fornecedor?.contato ?? "",
    telefone: fornecedor?.telefone ?? "",
    email: fornecedor?.email ?? "",
    fornece: fornecedor?.fornece ?? "",
    diasEntrega: fornecedor?.diasEntrega ?? "",
    horarioEntrega: fornecedor?.horarioEntrega ?? "",
    prazoUrgencia: fornecedor?.prazoUrgencia ?? "",
  });
  const { salvando, erro, executar } = useAcaoFormulario(onSaved);
  const set = (k: keyof FornecedorInput) => (e: React.ChangeEvent<HTMLInputElement>) => setF({ ...f, [k]: e.target.value });

  const salvar = () => {
    if (!f.empresa.trim() || !f.telefone.trim()) return;
    executar(() => (fornecedor ? acaoAtualizarFornecedor(fornecedor.id, f) : acaoCriarFornecedor(f)));
  };

  return (
    <div className="px-5 py-4">
      <div className="grid grid-cols-3 gap-2 mb-2">
        <Input placeholder="Empresa" value={f.empresa} onChange={set("empresa")} className="text-[12.5px] px-2.5 py-1.5" />
        <Input placeholder="Nome do contato" value={f.contato} onChange={set("contato")} className="text-[12.5px] px-2.5 py-1.5" />
        <Input placeholder="Telefone" value={f.telefone} onChange={set("telefone")} className="text-[12.5px] px-2.5 py-1.5" />
      </div>
      <div className="grid grid-cols-2 gap-2 mb-2">
        <Input placeholder="E-mail" value={f.email} onChange={set("email")} className="text-[12.5px] px-2.5 py-1.5" />
        <Input placeholder="O que fornece" value={f.fornece} onChange={set("fornece")} className="text-[12.5px] px-2.5 py-1.5" />
      </div>
      <div className="grid grid-cols-3 gap-2 mb-3">
        <Input placeholder="Dias de entrega (ex: Seg, Qua)" value={f.diasEntrega} onChange={set("diasEntrega")} className="text-[12.5px] px-2.5 py-1.5" />
        <Input placeholder="Horário de entrega" value={f.horarioEntrega} onChange={set("horarioEntrega")} className="text-[12.5px] px-2.5 py-1.5" />
        <Input placeholder="Prazo pra pedido de urgência" value={f.prazoUrgencia} onChange={set("prazoUrgencia")} className="text-[12.5px] px-2.5 py-1.5" />
      </div>
      <ErroBanner erro={erro} />
      <div className="flex gap-2">
        <button onClick={salvar} disabled={salvando} className="text-[12.5px] font-medium px-3.5 py-1.5 rounded-lg" style={{ background: "var(--accent)", color: "var(--accent-contrast, #fff)", opacity: salvando ? 0.6 : 1 }}>
          {salvando ? "Salvando..." : fornecedor ? "Salvar alterações" : "Salvar fornecedor"}
        </button>
        <button onClick={onCancel} className="text-[12.5px] font-medium px-3.5 py-1.5 rounded-lg" style={{ border: `1px solid ${"var(--border-strong)"}` }}>
          Cancelar
        </button>
      </div>
    </div>
  );
}
