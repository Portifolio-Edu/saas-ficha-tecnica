"use client";

import { useState } from "react";
import { Camera } from "lucide-react";

export function FotoReceitaMiniatura({ url }: { url: string | null }) {
  const [falhou, setFalhou] = useState(false);
  return (
    <span className="w-12 h-12 shrink-0 rounded-lg overflow-hidden border flex items-center justify-center" style={{ borderColor: "var(--border)", background: "var(--bg)" }}>
      {url && !falhou ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={url} alt="" loading="lazy" className="w-full h-full object-cover" onError={() => setFalhou(true)} />
      ) : <Camera size={18} style={{ color: "var(--faint)" }} aria-label="Sem foto cadastrada" />}
    </span>
  );
}
