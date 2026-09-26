# Segurança

Revisão do PR inteiro na etapa 3 do plano 9,5 (2026-09-26). Cada achado com o
que foi feito, onde está e como testar. Testes: `supabase/testes/endurecimento.sql`
(banco) e `e2e/seguranca.spec.ts` (de fora, como navegador/atacante).

## Achados corrigidos

| # | Gravidade | Achado | Correção |
|---|---|---|---|
| 1 | Média | Ficha, embalagem, produção, checklist, temperatura, venda e contagem aceitavam apontar pra item de **outro restaurante** (a policy só conferia o dono da linha, não o do item apontado; `substituir_receita_insumos` passava por cima da RLS). | Gatilho `interno.garantir_mesmo_restaurante` em 11 tabelas: as duas pontas precisam ser do mesmo restaurante. |
| 2 | Média | Dono/gestor podiam gravar `plano` e `status_assinatura` (e trocar `user_id`) em `clientes` — com cobrança, daria pra se dar plano pago. | Privilégio por coluna: só as colunas de cadastro são graváveis. |
| 3 | Média | Logins da equipe usavam e-mail técnico em `equipe.fichatecnica.app`, domínio que não é nosso: quem o registrasse receberia o "esqueci minha senha" de gestor/estoquista e tomaria a conta. | Domínio `.invalid` (reservado, nunca entregue) e "esqueci a senha" recusa usuário da equipe. `src/lib/auth/equipe.ts`. |
| 4 | Média | Link do e-mail com `next=/\site.com` redirecionava pra fora (phishing com link legítimo). | `caminhoInterno()` resolve o caminho e só aceita o mesmo site. `src/lib/auth/redirecionamento.ts`. |
| 5 | Baixa | Baldes de foto aceitavam qualquer arquivo (um `.html` ficava público no Storage). | Balde: só imagem até 5 MB; servidor confere o tipo e usa a extensão do tipo. `src/lib/imagem/tipoFoto.ts`. |
| 6 | Baixa | Tablet podia marcar `estoque_baixado` numa produção. | `producoes`: insert só das colunas do registro; update só de status/motivo. |
| 7 | Baixa | `criado_por` vinha do app (dava pra registrar em nome de outro). | Gatilho `interno.carimbar_criado_por` em 8 tabelas. |
| 8 | Baixa | Membro de um restaurante podia criar outro restaurante (e segurar telefones). | Policy de cadastro exige não ser membro de nenhum. |
| 9 | Baixa | Visitante sem login testava se um WhatsApp é cliente (`telefone_disponivel`) e chamava `auth_*` pela API. | `telefone_disponivel` só pelo servidor; `auth_*` no schema `interno` (fora da API). |
| 10 | Endurecimento | Visitante tinha privilégio de tabela (a RLS devolvia vazio); TRUNCATE concedido. | Visitante sem privilégio nenhum nas tabelas; TRUNCATE/TRIGGER/REFERENCES revogados. |
| 11 | Endurecimento | Nenhum cabeçalho de segurança (o sistema abria dentro de iframe de outro site). | `next.config.ts`: CSP (`frame-ancestors 'none'`…), X-Frame-Options, nosniff, Referrer-Policy, Permissions-Policy, HSTS. |

Migration: `supabase/migrations/20260928100000_endurecimento.sql` (aplicada em
produção em 2026-09-26, sem nenhum restaurante cadastrado). Reverter:
`supabase/reverter/20260928100000_endurecimento.sql`.

## Funções que o usuário logado chama de propósito

O verificador do Supabase lista 10 funções `security definer` executáveis por
usuário logado. Todas são intencionais e conferem restaurante e papel dentro:

| Função | Quem usa | Trava |
|---|---|---|
| `ajustar_saldo_estoque` | estoque | `auth_estoque()` + insumo do restaurante |
| `substituir_receita_insumos` / `_etapas` | gestão | `auth_gestao()` + receita do restaurante; itens pelo gatilho do achado 1 |
| `dados_cozinha`, `lotes_proteina_cozinha`, `escala_publica` | tablet | filtram pelo restaurante; sem custo nem motivo de ausência |
| `enviar_contagem` | tablet | só insumos do restaurante; não devolve saldo |
| `registrar_processamento_cozinha` | tablet | proteína do restaurante; valida pesos |
| `fechamentos_cmv_estoque` | estoquista | `auth_estoque()`; só colunas sem faturamento |
| `agenda_fornecedores` | tablet | só agenda de entrega (sem telefone, e-mail ou contato) do próprio restaurante |

## Tabelas só do servidor

`erros_sistema` (monitoramento) tem RLS ligada e nenhuma policy de propósito:
só a service role lê e grava. O verificador do Supabase lista como "RLS sem
policy" (aviso informativo) — é o esperado.

## Regras pra código novo

- Policy nova: `interno.auth_cliente_id()`, `interno.auth_gestao()`, `interno.auth_estoque()` (nome completo).
- Tabela nova que aponta pra item de restaurante: gatilho `garantir_mesmo_restaurante`.
- Tabela nova com `criado_por`: gatilho `carimbar_criado_por`.
- Função nova `security definer`: `revoke execute … from public, anon` e conferir restaurante e papel dentro.
- Nada de `NEXT_PUBLIC_` em chave secreta; a service role só no servidor e só depois de conferir quem pediu.

## Pendências (painel do dono, etapa 4)

- Ligar a proteção contra senha vazada (Supabase Auth).
- `NEXT_PUBLIC_SITE_URL` em produção e URLs permitidas no Supabase Auth.
- Criar um acesso de estoquista de teste logo após o deploy (confirma que o
  Supabase aceita o domínio `.invalid` da equipe; se recusar, trocar por um
  subdomínio de um domínio seu, sem MX).
