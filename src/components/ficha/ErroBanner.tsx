import { C } from "./tema";

/** Banner de erro de formulário -- mesmo bloco vermelho-claro repetido em
 * todo XForm do sistema. Não renderiza nada quando não há erro. */
export function ErroBanner({ erro, className = "mb-3" }: { erro: string | null; className?: string }) {
  if (!erro) return null;
  return (
    <div className={`text-[12px] rounded-md px-2.5 py-2 ${className}`} style={{ background: C.dangerSoft, color: C.danger }}>
      {erro}
    </div>
  );
}
