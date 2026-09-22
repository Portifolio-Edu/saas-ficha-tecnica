"use client";

export interface MostradorNivelProps {
  rotulo: string;
  estacaoNumero: string;
  totalLotes: number;
  capacidadeMax: number;
  statusTexto?: string;
  emRisco?: boolean;
}

export function MostradorNivel({
  rotulo,
  estacaoNumero,
  totalLotes,
  capacidadeMax,
  statusTexto = "OPERANDO",
  emRisco = false,
}: MostradorNivelProps) {
  const percentual = Math.min(100, Math.round((totalLotes / capacidadeMax) * 100));
  const totalSegmentos = 10;
  const segmentosAtivos = Math.round((percentual / 100) * totalSegmentos);

  const corSinal = "var(--sinal)";
  const corAtiva = emRisco ? corSinal : "var(--tinta)";

  return (
    <div
      className="p-5 rounded-2xl border flex flex-col font-sans transition-all duration-200 hover:border-[var(--linha-forte)] shadow-sm"
      style={{
        borderColor: "var(--linha)",
        backgroundColor: "var(--panel)",
        boxShadow: "var(--shadow-card)",
      }}
    >
      {/* Header da Estação */}
      <div className="flex items-center justify-between pb-3.5 mb-3.5 border-b" style={{ borderColor: "var(--linha)" }}>
        <div className="flex items-center gap-2.5">
          <span
            className="text-[12px] font-extrabold px-2 py-0.5 rounded-md"
            style={{
              backgroundColor: emRisco ? "rgba(255, 59, 48, 0.15)" : "var(--panel-elevated)",
              color: emRisco ? corSinal : "var(--tinta-sub)",
              border: `1px solid ${emRisco ? "rgba(255, 59, 48, 0.35)" : "var(--linha-forte)"}`,
            }}
          >
            {estacaoNumero}
          </span>
          <span className="text-[15px] font-bold tracking-tight text-[var(--tinta)]">
            {rotulo}
          </span>
        </div>

        <span
          className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] md:text-[12px] font-extrabold uppercase tracking-wide shadow-sm"
          style={{
            backgroundColor: emRisco ? "rgba(255, 59, 48, 0.15)" : "rgba(16, 185, 129, 0.15)",
            color: emRisco ? corSinal : "var(--sucesso)",
            border: `1px solid ${emRisco ? "rgba(255, 59, 48, 0.35)" : "rgba(16, 185, 129, 0.35)"}`,
          }}
        >
          <span
            className="w-2 h-2 rounded-full"
            style={{
              backgroundColor: emRisco ? corSinal : "var(--sucesso)",
              boxShadow: emRisco ? "0 0 8px var(--sinal)" : "0 0 8px var(--sucesso)",
            }}
          />
          {statusTexto}
        </span>
      </div>

      {/* Visor de Carga com Segmentos LED Modernos e Altura Aumentada */}
      <div className="space-y-3">
        <div className="flex items-center justify-between text-[13px] md:text-[14px]">
          <span className="font-semibold uppercase tracking-wider text-[var(--tinta-sub)]">Nível de Carga</span>
          <span className="text-[16px] font-black" style={{ color: corAtiva }}>
            {totalLotes} / {capacidadeMax} lotes · {percentual}%
          </span>
        </div>

        {/* Barra Segmentada Mais Espessa (18px) para visualização rápida à distância */}
        <div className="grid grid-cols-10 gap-2 h-4 p-1 rounded-xl bg-[var(--panel-elevated)] border border-[var(--linha-forte)]">
          {Array.from({ length: totalSegmentos }).map((_, i) => {
            const preenchido = i < segmentosAtivos;
            return (
              <div
                key={i}
                className="h-full rounded-sm transition-all duration-300"
                style={{
                  backgroundColor: preenchido ? corAtiva : "transparent",
                  boxShadow: preenchido
                    ? emRisco
                      ? "0 0 8px var(--sinal)"
                      : "0 0 6px rgba(255, 255, 255, 0.3)"
                    : "none",
                  opacity: preenchido ? 1 : 0.12,
                  border: `1px solid ${preenchido ? corAtiva : "var(--linha)"}`,
                }}
              />
            );
          })}
        </div>

        {/* Escala com texto claro de 11px */}
        <div className="flex justify-between text-[11px] md:text-[12px] font-semibold text-[var(--tinta-sub)] pt-0.5">
          <span>0%</span>
          <span>50%</span>
          <span>100% (Capacidade Máxima)</span>
        </div>
      </div>
    </div>
  );
}
