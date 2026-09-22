import type { Metadata } from "next";
import { Public_Sans, IBM_Plex_Mono, Fraunces, Big_Shoulders_Stencil } from "next/font/google";
import "./globals.css";

// Corpo: Public Sans -- legível em tabela densa, sem ser a Geist/Inter padrão
// de app gerado. Números: IBM Plex Mono, tabular. Título de página: Fraunces
// itálico, só no h1 do shell.
const fonteCorpo = Public_Sans({
  variable: "--fonte-corpo",
  weight: ["400", "500", "600", "700"],
  subsets: ["latin"],
});

const fonteNumero = IBM_Plex_Mono({
  variable: "--fonte-numero",
  weight: ["400", "500", "600"],
  subsets: ["latin"],
});

const fonteTitulo = Fraunces({
  variable: "--fonte-titulo",
  weight: ["500", "600"],
  style: ["normal", "italic"],
  subsets: ["latin"],
});

// Face de identidade -- só pra wordmark, estado vazio e ficha de produção
// (nunca pro corpo do app). Estêncil industrial: registro de placa de
// câmara fria / caixa de estoque seco, não de cardápio bonito.
const bigShouldersStencil = Big_Shoulders_Stencil({
  variable: "--font-display",
  weight: ["800"],
  subsets: ["latin"],
});

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
    <html lang="pt-BR" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem("tema");if(t!=="light"&&t!=="dark"){t=window.matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light";}document.documentElement.setAttribute("data-theme",t);}catch(e){}})();`,
          }}
        />
      </head>
      <body
        className={`${fonteCorpo.variable} ${fonteNumero.variable} ${fonteTitulo.variable} ${bigShouldersStencil.variable} antialiased`}
      >
        <a href="#conteudo" className="pular-para-conteudo">Pular para o conteúdo</a>
        {children}
      </body>
    </html>
  );
}
