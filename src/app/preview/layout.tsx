// LAYOUT (2026-10-03): menu, barra superior e "Ver como" da demo ficam aqui e
// não remontam entre as seções; só o conteúdo de cada page.tsx troca. O índice
// (/preview), o modo cozinha e a consulta do celular seguem sem o menu (ver
// SEM_MENU em src/components/ficha/DemoShell.tsx).
import { DemoShell } from "@/components/ficha/DemoShell";
import { NOME_RESTAURANTE } from "./fixtures";

export default function PreviewLayout({ children }: { children: React.ReactNode }) {
  return <DemoShell nomeRestaurante={NOME_RESTAURANTE}>{children}</DemoShell>;
}
