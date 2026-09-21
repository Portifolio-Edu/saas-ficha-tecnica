import Link from "next/link";

export default function NotFound() {
  return (
    <div className="w-full min-h-screen flex items-center justify-center px-6" style={{ background: "var(--bg)", color: "var(--text)" }}>
      <div className="max-w-sm text-center">
        <div className="text-[13px] font-semibold mb-2" style={{ color: "var(--faint)" }}>Erro 404</div>
        <h1 className="text-[20px] font-bold mb-2" style={{ letterSpacing: "-0.01em" }}>Página não encontrada</h1>
        <p className="text-[13px] mb-6" style={{ color: "var(--sub)" }}>
          O endereço que você tentou abrir não existe ou foi movido.
        </p>
        <Link
          href="/"
          className="inline-block text-[12.5px] font-medium px-4 py-2 rounded-lg"
          style={{ background: "var(--text)", color: "var(--panel)" }}
        >
          Voltar ao início
        </Link>
      </div>
    </div>
  );
}
