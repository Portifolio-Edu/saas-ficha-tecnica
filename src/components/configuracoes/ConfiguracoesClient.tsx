"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ficha/Card";
import { DadosDaConta } from "./DadosDaConta";

type Preferencia = "light" | "dark" | "system";

function aplicarTema(pref: Preferencia) {
  const resolvido =
    pref === "system"
      ? window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light"
      : pref;
  document.documentElement.setAttribute("data-theme", resolvido);
}

const OPCOES: { valor: Preferencia; label: string }[] = [
  { valor: "light", label: "Claro" },
  { valor: "dark", label: "Escuro" },
  { valor: "system", label: "Sistema" },
];

/** `nomeRestaurante` só vem pro dono (LGPD: baixar e excluir os dados). */
export function ConfiguracoesClient({ nomeRestaurante }: { nomeRestaurante?: string } = {}) {
  const [preferencia, setPreferencia] = useState<Preferencia>("system");

  useEffect(() => {
    const salvo = localStorage.getItem("tema");
    setPreferencia(salvo === "light" || salvo === "dark" ? salvo : "system");
  }, []);

  useEffect(() => {
    aplicarTema(preferencia);
    if (preferencia === "system") {
      const mq = window.matchMedia("(prefers-color-scheme: dark)");
      const listener = () => aplicarTema("system");
      mq.addEventListener("change", listener);
      return () => mq.removeEventListener("change", listener);
    }
  }, [preferencia]);

  const escolher = (valor: Preferencia) => {
    setPreferencia(valor);
    if (valor === "system") {
      localStorage.removeItem("tema");
    } else {
      localStorage.setItem("tema", valor);
    }
  };

  return (
    <div className="max-w-md space-y-4">
      <Card className="p-5">
        <h2 className="text-[13px] font-semibold mb-1">Tema</h2>
        <p className="text-[12.5px] mb-4" style={{ color: "var(--sub)" }}>
          Escolha a aparência do app. &quot;Sistema&quot; segue a preferência do seu navegador.
        </p>
        <div className="flex gap-2">
          {OPCOES.map((o) => (
            <button
              key={o.valor}
              onClick={() => escolher(o.valor)}
              className="text-[12.5px] font-medium px-3 py-1.5 rounded-lg"
              style={{
                background: preferencia === o.valor ? "var(--text)" : "var(--panel)",
                color: preferencia === o.valor ? "var(--panel)" : "var(--text)",
                border: `1px solid ${preferencia === o.valor ? "var(--text)" : "var(--border-strong)"}`,
              }}
            >
              {o.label}
            </button>
          ))}
        </div>
      </Card>
      {nomeRestaurante && <DadosDaConta nomeRestaurante={nomeRestaurante} />}
    </div>
  );
}
