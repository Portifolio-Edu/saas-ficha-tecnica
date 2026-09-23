"use client";

import { useEffect, useRef, useState } from "react";
import { ErroBanner } from "@/components/ficha/ErroBanner";
import { acaoUploadFotoReceita } from "@/app/receitas/actions";
import { reduzirImagem } from "@/lib/imagem/reduzirImagem";

/** Picker de foto reutilizado pela foto principal do prato e pela foto de
 * cada etapa. Mostra preview local instantâneo (URL.createObjectURL) enquanto
 * sobe pro storage em segundo plano, depois troca pela URL pública real.
 * Não é o visualizador grande -- isso fica no FichaProducaoModal. */
export function UploadFoto({
  valor,
  onChange,
  alturaPreview = 120,
}: {
  valor: string | null;
  onChange: (url: string | null) => void;
  alturaPreview?: number;
}) {
  const [preview, setPreview] = useState<string | null>(valor);
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const objectUrlRef = useRef<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Mantém o preview sincronizado quando o valor externo muda (ex: troca de
  // receita no formulário de edição), sem sobrescrever um preview local que
  // ainda está com upload em andamento.
  useEffect(() => {
    if (!enviando) setPreview(valor);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [valor]);

  useEffect(() => {
    return () => {
      if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
    };
  }, []);

  const selecionarArquivo = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const arquivo = e.target.files?.[0];
    if (!arquivo) return;
    e.target.value = "";

    setErro(null);
    if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
    const localUrl = URL.createObjectURL(arquivo);
    objectUrlRef.current = localUrl;
    setPreview(localUrl);
    setEnviando(true);

    try {
      const formData = new FormData();
      // POLIMENTO checklists-pracas: reduz a foto antes de subir. Antes ia o
      // arquivo original, e foto de celular (3–8 MB) passava do limite de 1 MB
      // das server actions. Reverter: voltar a `formData.set("arquivo", arquivo)`.
      formData.set("arquivo", await reduzirImagem(arquivo));
      const resultado = await acaoUploadFotoReceita(formData);
      if (resultado.ok) {
        onChange(resultado.url);
        setPreview(resultado.url);
      } else {
        setErro(resultado.erro);
        setPreview(valor);
      }
    } catch (err) {
      setErro(err instanceof Error ? err.message : "Erro desconhecido ao enviar a foto.");
      setPreview(valor);
    } finally {
      setEnviando(false);
    }
  };

  const remover = () => {
    setErro(null);
    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current);
      objectUrlRef.current = null;
    }
    setPreview(null);
    onChange(null);
  };

  return (
    <div>
      <div
        className="rounded-lg overflow-hidden flex items-center justify-center mb-2"
        style={{
          height: alturaPreview,
          width: alturaPreview,
          background: "var(--bg)",
          border: preview ? `1px solid ${"var(--border)"}` : "1px dashed var(--border-strong)",
        }}
      >
        {preview ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={preview} alt="Prévia da foto" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
        ) : (
          <span className="text-[11px] text-center px-2" style={{ color: "var(--faint)" }}>
            Sem foto
          </span>
        )}
      </div>

      <div className="flex items-center gap-2">
        <input ref={inputRef} type="file" accept="image/*" onChange={selecionarArquivo} className="hidden" />
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={enviando}
          className="text-[11.5px] font-medium px-2.5 py-1 rounded-md"
          style={{ border: `1px solid ${"var(--border-strong)"}`, opacity: enviando ? 0.6 : 1 }}
        >
          {enviando ? "Enviando..." : preview ? "Trocar foto" : "Escolher foto"}
        </button>
        {preview && !enviando && (
          <button type="button" onClick={remover} className="text-[11.5px] font-medium px-2.5 py-1 rounded-md" style={{ color: "var(--danger)" }}>
            Remover
          </button>
        )}
      </div>

      <ErroBanner erro={erro} className="mt-2" />
    </div>
  );
}
