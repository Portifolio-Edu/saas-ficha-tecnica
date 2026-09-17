import type { InputHTMLAttributes } from "react";
import { inputStyle } from "./tema";

/** <input> com o estilo padrão do sistema (borda + fundo de inputStyle).
 * Tamanho de fonte, padding e layout continuam vindo de className em cada
 * chamada, como antes -- este componente só centraliza o style compartilhado. */
export function Input({ className = "", style, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={`rounded-md ${className}`} style={{ ...inputStyle, ...style }} {...props} />;
}
