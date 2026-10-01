"use client";

// DEMO (2026-09-25): volta a demo aos dados de exemplo, apagando o que foi
// registrado neste navegador (src/lib/demo/armazem.ts → limparDemo).

import { useState } from "react";
import { RotateCcw } from "lucide-react";
import { limparDemo } from "@/lib/demo/armazem";

export function RecomecarDemo() {
  const [feito, setFeito] = useState(false);
  return (
    <button
      type="button"
      onClick={() => {
        if (!window.confirm("Apagar o que você registrou na demonstração e voltar aos dados de exemplo?")) return;
        limparDemo();
        setFeito(true);
      }}
      className="mt-3 inline-flex items-center gap-1.5 text-[12px] font-medium px-3 min-h-8 rounded-md border"
      style={{ borderColor: "var(--border)", color: "var(--text)" }}
    >
      <RotateCcw size={13} />
      {feito ? "Demonstração recomeçada" : "Recomeçar a demonstração"}
    </button>
  );
}
