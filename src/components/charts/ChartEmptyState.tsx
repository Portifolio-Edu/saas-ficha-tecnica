
/** Prancheta vazia -- o glifo de "nada registrado ainda" do sistema inteiro,
 * o mesmo objeto físico que descreve cada uma dessas telas (planilha na
 * prancheta da cozinha). Reservado pra estado vazio, nunca decoração. */
function PranchetaVazia() {
  return (
    <svg width="34" height="34" viewBox="0 0 34 34" fill="none" style={{ color: "var(--marca)" }}>
      <rect x="7" y="6" width="20" height="25" rx="2" stroke="currentColor" strokeWidth="1.6" opacity="0.55" />
      <rect x="12.5" y="3.5" width="9" height="5" rx="1.4" stroke="currentColor" strokeWidth="1.6" opacity="0.75" />
      <line x1="11" y1="15" x2="23" y2="15" stroke="currentColor" strokeWidth="1.4" opacity="0.4" />
      <line x1="11" y1="20" x2="19" y2="20" stroke="currentColor" strokeWidth="1.4" opacity="0.4" />
    </svg>
  );
}

/** Estado vazio de grafico: nunca so "sem dados" -- sempre diz o que fazer
 * pra esse grafico passar a existir. */
export function ChartEmptyState({ titulo, dica, altura }: { titulo: string; dica: string; altura: number }) {
  return (
    <div className="flex flex-col items-center justify-center text-center gap-2.5 rounded-lg px-6" style={{ height: altura, background: "var(--bg)" }}>
      <PranchetaVazia />
      <span className="text-[12.5px] font-medium" style={{ color: "var(--sub)" }}>{titulo}</span>
      <span className="text-[11.5px] max-w-xs" style={{ color: "var(--faint)" }}>{dica}</span>
    </div>
  );
}
