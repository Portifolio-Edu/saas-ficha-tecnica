"use client";

// PLANO 9,5, etapa 3 (2026-09-26): LGPD na tela Configurações, só pro dono.
// Baixar tudo (JSON) e excluir o restaurante (confirmando pelo nome).

import { useActionState, useState } from "react";
import { Download, Trash2 } from "lucide-react";
import { Card } from "@/components/ficha/Card";
import { acaoExcluirRestaurante } from "@/app/configuracoes/actions";

export function DadosDaConta({ nomeRestaurante }: { nomeRestaurante: string }) {
  const [confirmando, setConfirmando] = useState(false);
  const [estado, acao, pendente] = useActionState(acaoExcluirRestaurante, {});

  return (
    <Card className="p-5">
      <h2 className="text-[13px] font-semibold mb-1">Seus dados</h2>
      <p className="text-[12.5px] mb-4" style={{ color: "var(--sub)" }}>
        Baixe tudo o que o restaurante tem no sistema (fichas, insumos, estoque, produções, checklists, equipe e escalas) num arquivo que abre em
        qualquer programa. Direito seu pela LGPD.
      </p>
      <a
        href="/conta/exportar"
        className="inline-flex items-center gap-2 min-h-10 px-3 rounded-lg border text-[13px] font-medium hover:bg-[var(--panel-hover)]"
        style={{ borderColor: "var(--border-strong)" }}
      >
        <Download size={15} /> Baixar todos os dados
      </a>

      <div className="border-t mt-5 pt-5" style={{ borderColor: "var(--linha)" }}>
        <h3 className="text-[13px] font-semibold mb-1" style={{ color: "var(--danger)" }}>
          Excluir o restaurante
        </h3>
        <p className="text-[12.5px] mb-3" style={{ color: "var(--sub)" }}>
          Apaga para sempre os dados, as fotos e os acessos de toda a equipe, inclusive o seu. Não tem como desfazer: baixe os dados antes, se quiser
          guardar.
        </p>
        {!confirmando ? (
          <button
            type="button"
            onClick={() => setConfirmando(true)}
            className="inline-flex items-center gap-2 min-h-10 px-3 rounded-lg border text-[13px] font-medium"
            style={{ borderColor: "color-mix(in srgb, var(--danger) 45%, transparent)", color: "var(--danger)" }}
          >
            <Trash2 size={15} /> Excluir restaurante…
          </button>
        ) : (
          <form action={acao} className="space-y-3">
            <label htmlFor="confirmacao" className="block text-[12.5px]">
              Para confirmar, digite o nome do restaurante: <strong>{nomeRestaurante}</strong>
            </label>
            <input
              id="confirmacao"
              name="confirmacao"
              required
              autoComplete="off"
              className="w-full text-[13px] px-3 min-h-10 rounded-lg border bg-[var(--panel)]"
              style={{ borderColor: "var(--border-strong)" }}
            />
            {estado.erro && (
              <p role="alert" className="text-[12.5px]" style={{ color: "var(--danger)" }}>
                {estado.erro}
              </p>
            )}
            <div className="flex gap-2">
              <button
                type="submit"
                disabled={pendente}
                className="inline-flex items-center gap-2 min-h-10 px-3 rounded-lg text-[13px] font-semibold disabled:opacity-60"
                style={{ background: "var(--danger)", color: "var(--panel)" }}
              >
                <Trash2 size={15} /> {pendente ? "Excluindo…" : "Excluir para sempre"}
              </button>
              <button type="button" onClick={() => setConfirmando(false)} className="min-h-10 px-3 rounded-lg border text-[13px]" style={{ borderColor: "var(--border-strong)" }}>
                Cancelar
              </button>
            </div>
          </form>
        )}
      </div>
    </Card>
  );
}
