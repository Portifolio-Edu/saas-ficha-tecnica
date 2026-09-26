import type { Metadata } from "next";
import { ConsultaDemo } from "./ConsultaDemo";

export const metadata: Metadata = { title: "Minha cozinha (demonstração)" };

export default function Page() {
  return <ConsultaDemo />;
}
