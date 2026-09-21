import type { Metadata } from "next";
import { Geist, Geist_Mono, Big_Shoulders_Stencil } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
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
        className={`${geistSans.variable} ${geistMono.variable} ${bigShouldersStencil.variable} antialiased`}
      >
        <a href="#conteudo" className="pular-para-conteudo">Pular para o conteúdo</a>
        {children}
      </body>
    </html>
  );
}
