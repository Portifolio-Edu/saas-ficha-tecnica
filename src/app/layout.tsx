import type { Metadata, Viewport } from "next";
import { Hanken_Grotesk } from "next/font/google";
import "./globals.css";

// SISTEMA premium (2026-09-22): Hanken Grotesk, grotesca neutra no tom do painel
// Stripe, com algarismos tabulares por padrão (todos os dígitos têm a mesma
// largura, então colunas de número alinham sozinhas) e espaço normal.
// Testadas e descartadas: Mona Sans (o zero tabular vira um retângulo estreito
// em peso alto), Schibsted (vírgula solta nos números), Onest e Host (largas
// demais pra tabela densa). Antes: Plus Jakarta Sans (--fonte-jakarta), que o
// Impeccable lista entre as fontes-padrão de app gerado por IA.
const hanken = Hanken_Grotesk({
  variable: "--fonte-app",
  subsets: ["latin"],
  display: "swap",
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  // CELULAR (2026-09-26): ocupa a tela toda no iPhone; a barra de baixo
  // respeita a área do gesto (env(safe-area-inset-bottom)).
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#F6F6F7" },
    { media: "(prefers-color-scheme: dark)", color: "#0B0B0C" }, // SISTEMA: mesmo --fundo do tema escuro
  ],
};

export const metadata: Metadata = {
  title: "Ficha Técnica",
  description: "CMV, precificação e controle operacional para restaurantes.",
  openGraph: {
    title: "Ficha Técnica",
    description: "CMV, precificação e controle operacional para restaurantes.",
    type: "website",
    locale: "pt_BR",
  },
  twitter: {
    card: "summary",
    title: "Ficha Técnica",
    description: "CMV, precificação e controle operacional para restaurantes.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" className={hanken.variable} suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem("tema");if(t!=="light"&&t!=="dark"){t=window.matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light";}document.documentElement.setAttribute("data-theme",t);}catch(e){}})();`,
          }}
        />
      </head>
      <body className="antialiased">
        <a href="#conteudo" className="pular-para-conteudo">Pular para o conteúdo</a>
        {children}
      </body>
    </html>
  );
}
