import { C } from "@/components/ficha/tema";

/** Estado vazio de grafico: nunca so "sem dados" -- sempre diz o que fazer
 * pra esse grafico passar a existir. */
export function ChartEmptyState({ titulo, dica, altura }: { titulo: string; dica: string; altura: number }) {
  return (
    <div className="flex flex-col items-center justify-center text-center gap-1.5 rounded-lg px-6" style={{ height: altura, background: C.bg }}>
      <span className="text-[12.5px] font-medium" style={{ color: C.sub }}>{titulo}</span>
      <span className="text-[11.5px] max-w-xs" style={{ color: C.faint }}>{dica}</span>
    </div>
  );
}
