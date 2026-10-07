# Configuração e prontidão — 07/10/2026

Antes: README citava `.env.example`, mas o arquivo não existia; dados da empresa eram placeholders fixos; documentos antigos confundiam itens implementados com pendências de ativação.

Agora: modelo de variáveis sem segredos, dados públicos da empresa por `NEXT_PUBLIC_EMPRESA_*`, verificador local que não imprime valores e registro atualizado em `docs/PRONTIDAO_VENDA.md`. Não foram inventados dados legais, preço ou prazo de teste, nem alteradas contas remotas.

Teste do verificador: ambiente vazio deve retornar pendências e código 1; conjunto sintético válido deve retornar código 0, sem reproduzir seus valores. A ferramenta só verifica presença/formato; nunca certifica produção.

Reversão: reverter o commit `docs: registrar prontidão e configurar dados públicos da empresa`. Isso volta aos placeholders originais. Variáveis remotas não são apagadas por `git revert`; este trabalho não as criou.
