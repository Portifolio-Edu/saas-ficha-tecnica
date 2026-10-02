import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

// DESEMPENHO (2026-10-02): travas do docs/DESEMPENHO.md que dá pra pegar
// já no editor. O orçamento de cada tela (e2e/orcamento-desempenho.spec.ts)
// pega o resto. Reverter: tirar os três blocos marcados "DESEMPENHO".
const IMPORTS_PESADOS = [
  { name: "@/lib/supabase/client", message: "Cliente do Supabase no navegador (~190 KB): carregue com import() na hora do uso (ver AppShellCliente.tsx, sair())." },
];
const SO_NA_DEMO = { group: ["@/app/preview/*", "**/preview/fixtures"], message: "Código/dados da demo não entram no app: use import() só no caminho da demo." };

const eslintConfig = [
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  // DESEMPENHO: formatador de número/data reaproveitado.
  {
    files: ["src/**/*.{ts,tsx}"],
    ignores: ["src/lib/formato.ts", "**/__tests__/**"],
    rules: {
      "no-restricted-syntax": [
        "error",
        {
          selector: "CallExpression[callee.property.name=/^toLocale(String|DateString|TimeString)$/]",
          message: "Monta um formatador novo a cada chamada (lento em lista). Use numeroBR/dataBR/horaBR de @/lib/formato.",
        },
        {
          selector: "NewExpression[callee.object.name='Intl']",
          message: "Formatador Intl novo a cada chamada é caro. Use formatadorData/numeroBR de @/lib/formato (reaproveitam).",
        },
      ],
    },
  },
  // DESEMPENHO: biblioteca pesada só sob demanda; dados da demo só na demo.
  {
    files: ["src/**/*.{ts,tsx}"],
    ignores: ["src/components/charts/**", "**/Grafico*.tsx", "src/app/preview/**"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          paths: [...IMPORTS_PESADOS, { name: "recharts", message: "Recharts (~290 KB): gráfico em arquivo Grafico*.tsx carregado com next/dynamic e <EspacoDoGrafico/>." }],
          patterns: [SO_NA_DEMO],
        },
      ],
    },
  },
  // DESEMPENHO: na demo pode dado de exemplo, mas não o cliente do Supabase.
  {
    files: ["src/app/preview/**/*.{ts,tsx}"],
    rules: { "no-restricted-imports": ["error", { paths: IMPORTS_PESADOS }] },
  },
  {
    ignores: [
      "node_modules/**",
      ".next/**",
      "out/**",
      "build/**",
      "next-env.d.ts",
    ],
  },
];

export default eslintConfig;
