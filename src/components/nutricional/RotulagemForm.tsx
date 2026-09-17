"use client";

import { useState } from "react";
import { ErroBanner } from "@/components/ficha/ErroBanner";
import { Input } from "@/components/ficha/Input";
import { useAcaoFormulario } from "@/hooks/useAcaoFormulario";
import type { Rotulagem } from "@/lib/dominio/nutricional";

export function RotulagemForm({ rotulagem, onSaved }: { rotulagem?: Rotulagem; onSaved: (r: { ingredientes: string; alergenos: string; gluten: string; lactose: string; fabricante: string; endereco: string; pesoLiquido: string; conservacao: string }) => void }) {
  const [campos, setCampos] = useState({
    ingredientes: rotulagem?.ingredientes ?? "",
    alergenos: rotulagem?.alergenos ?? "",
    gluten: rotulagem?.gluten ?? "",
    lactose: rotulagem?.lactose ?? "",
    fabricante: rotulagem?.fabricante ?? "",
    endereco: rotulagem?.endereco ?? "",
    pesoLiquido: rotulagem?.pesoLiquido ?? "",
    conservacao: rotulagem?.conservacao ?? "",
  });
  const { salvando, erro, executar } = useAcaoFormulario(() => {});

  const campo = (chave: keyof typeof campos) => (e: React.ChangeEvent<HTMLInputElement>) => setCampos({ ...campos, [chave]: e.target.value });

  // onSaved dispara a action assincrona no componente pai (fire-and-forget,
  // sem retorno de erro pra este form) -- so envolve no mesmo hook pra manter
  // o padrao salvando/erro consistente com os outros formularios.
  const salvar = () => executar(async () => {
    onSaved(campos);
    return { ok: true };
  });

  return (
    <div className="px-3.5 pb-3.5" style={{ borderTop: `1px solid ${"var(--border)"}` }}>
      <p className="text-[11.5px] my-3" style={{ color: "var(--sub)" }}>
        Só faz falta pra quem vende em mercado ou varejo de terceiro. Quem serve no próprio estabelecimento pode deixar tudo em branco, o resto do sistema funciona igual.
      </p>
      <div className="grid grid-cols-2 gap-2 mb-3">
        {(
          [
            ["ingredientes", "Lista de ingredientes (ordem decrescente de peso)", true],
            ["alergenos", "Alérgenos (RDC 26/2015)", true],
            ["gluten", "Glúten: contém / não contém", false],
            ["lactose", "Lactose, quando aplicável", false],
            ["fabricante", "Fabricante e CNPJ", false],
            ["endereco", "Endereço do fabricante", false],
            ["pesoLiquido", "Peso líquido da embalagem", false],
            ["conservacao", "Modo de conservação e validade", false],
          ] as const
        ).map(([chave, label, largo]) => (
          <div key={chave} className={largo ? "col-span-2" : ""}>
            <div className="text-[10.5px] mb-1" style={{ color: "var(--faint)" }}>{label}</div>
            <Input value={campos[chave]} onChange={campo(chave)} className="text-[12px] px-2.5 py-1.5 w-full" />
          </div>
        ))}
      </div>
      <ErroBanner erro={erro} />
      <button onClick={salvar} disabled={salvando} className="text-[12.5px] font-medium px-3.5 py-1.5 rounded-lg" style={{ background: "var(--text)", color: "#fff", opacity: salvando ? 0.6 : 1 }}>
        {salvando ? "Salvando..." : "Salvar dados de rotulagem"}
      </button>
    </div>
  );
}
