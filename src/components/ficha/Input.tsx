import type { InputHTMLAttributes } from "react";
import { inputStyle } from "./tema";

/** <input> com o estilo padrão do sistema (borda + fundo de inputStyle).
 * Tamanho de fonte, padding e layout continuam vindo de className em cada
 * chamada, como antes -- este componente só centraliza o style compartilhado. */
export function Input({ className = "", style, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={`rounded-lg px-3 py-2 text-[13px] outline-none transition-all duration-150 focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent)]/15 placeholder:text-[var(--faint)] ${className}`}
      style={{ ...inputStyle, ...style }}
      {...props}
    />
  );
}
