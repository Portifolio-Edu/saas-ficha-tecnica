import type { ReactNode } from "react";
import { FolderOpen } from "lucide-react";
import { Card } from "./Card";

export function EmptyState({
  titulo = "Nenhum dado encontrado",
  descricao = "Não há informações registradas para exibir no momento.",
  icone,
  acao,
  className = "",
}: {
  titulo?: string;
  descricao?: string;
  icone?: ReactNode;
  acao?: ReactNode;
  className?: string;
}) {
  return (
    <Card className={`p-8 text-center flex flex-col items-center justify-center border-dashed ${className}`}>
      <div
        className="w-12 h-12 rounded-2xl flex items-center justify-center mb-3"
        style={{
          backgroundColor: "var(--accent-soft)",
          color: "var(--accent)",
        }}
      >
        {icone || <FolderOpen size={24} />}
      </div>
      <h3 className="text-[15px] font-semibold text-[var(--text)] mb-1">{titulo}</h3>
      <p className="text-[13px] text-[var(--sub)] max-w-sm mb-4 leading-relaxed">{descricao}</p>
      {acao && <div>{acao}</div>}
    </Card>
  );
}
