import type { Metadata } from "next";
import { DocumentoLegal, Secao } from "@/components/legal/DocumentoLegal";
import { EMPRESA } from "@/lib/legal/empresa";

// PRODUCAO (2026-09-24): RASCUNHO da Política de privacidade (LGPD, Lei
// 13.709/2018), escrito pro caso do Ficha Técnica. Precisa de revisão jurídica.
// Dados da empresa em src/lib/legal/empresa.ts; ao mudar o texto, atualizar
// VERSAO_TERMOS. Se entrar um fornecedor novo (ex.: monitoramento de erros),
// incluir na seção 4.

export const metadata: Metadata = { title: "Política de privacidade · Ficha Técnica" };

export default function PrivacidadePage() {
  const e = EMPRESA;
  return (
    <DocumentoLegal titulo="Política de privacidade">
      <p>
        Esta Política explica como {e.razaoSocial}, CNPJ {e.cnpj} (&quot;nós&quot;), trata dados pessoais no {e.nomeProduto}, conforme a
        Lei Geral de Proteção de Dados (LGPD, Lei 13.709/2018).
      </p>

      <Secao titulo="1. Nosso papel">
        <p>
          <strong className="text-[var(--tinta)]">Dados da sua conta</strong> (nome, e-mail, telefone, restaurante, dados de pagamento):
          somos o controlador, porque decidimos como esses dados são usados para prestar e cobrar o serviço.
        </p>
        <p>
          <strong className="text-[var(--tinta)]">Dados que você cadastra sobre a sua operação</strong> (nomes de pessoas da equipe em
          produções, checklists e temperaturas, fotos das praças, vendas importadas): o controlador é o seu restaurante, e nós atuamos
          como operador, tratando esses dados só para prestar o serviço, conforme suas instruções.
        </p>
      </Secao>

      <Secao titulo="2. Quais dados tratamos">
        <ul className="list-disc pl-5 space-y-1.5">
          <li>Cadastro: nome, e-mail, telefone, nome do restaurante e, se informado, CNPJ.</li>
          <li>Acesso: registros de login, endereço IP, navegador e datas de acesso, por segurança.</li>
          <li>Operação: o que você cadastra no sistema (insumos, receitas, produções, estoque, checklists, temperaturas, fotos, vendas).</li>
          <li>Pagamento: dados da assinatura. Os dados de cartão são tratados diretamente pela empresa de pagamentos; não os guardamos.</li>
          <li>Arquivos importados (XML de notas fiscais e planilhas): lidos no seu navegador; só as vendas por produto são aproveitadas.</li>
        </ul>
      </Secao>

      <Secao titulo="3. Para que usamos e com qual base legal">
        <ul className="list-disc pl-5 space-y-1.5">
          <li>Prestar o serviço e dar suporte: execução de contrato (art. 7º, V).</li>
          <li>Cobrar a assinatura e emitir documentos fiscais: execução de contrato e obrigação legal (art. 7º, II e V).</li>
          <li>Segurança, prevenção a fraude e registros de acesso: obrigação legal (Marco Civil da Internet) e legítimo interesse (art. 7º, IX).</li>
          <li>Avisos sobre o serviço (vencimento, mudanças, manutenção): execução de contrato.</li>
          <li>Comunicações de marketing: só com o seu consentimento, que pode ser retirado a qualquer momento.</li>
        </ul>
      </Secao>

      <Secao titulo="4. Com quem compartilhamos">
        <p>Não vendemos dados. Compartilhamos apenas com fornecedores necessários para o serviço funcionar:</p>
        <ul className="list-disc pl-5 space-y-1.5">
          <li>Supabase: banco de dados, autenticação e armazenamento de arquivos (servidores em São Paulo).</li>
          <li>Vercel: hospedagem do site (pode processar dados fora do Brasil).</li>
          <li>Empresa de pagamentos: cobrança da assinatura.</li>
          <li>Provedor de envio de e-mails: e-mails de confirmação, recuperação de senha e avisos.</li>
          <li>Autoridades, quando houver obrigação legal ou ordem judicial.</li>
        </ul>
        <p>
          Quando algum fornecedor trata dados fora do Brasil, isso ocorre com as garantias previstas na LGPD (art. 33), como cláusulas
          contratuais de proteção de dados.
        </p>
      </Secao>

      <Secao titulo="5. Por quanto tempo guardamos">
        <p>
          Enquanto a conta estiver ativa. Após o cancelamento, os dados da operação ficam disponíveis para exportação por 30 dias e depois
          são apagados. Registros de acesso são guardados por 6 meses (Marco Civil da Internet) e dados fiscais e de cobrança pelo prazo
          exigido pela legislação tributária.
        </p>
      </Secao>

      <Secao titulo="6. Seus direitos">
        <p>
          Você pode pedir, a qualquer momento: confirmação de que tratamos seus dados, acesso, correção, anonimização ou exclusão de dados
          desnecessários, portabilidade, informação sobre com quem compartilhamos, revogação de consentimento e revisão de decisões
          automatizadas (art. 18). Responderemos em até 15 dias.
        </p>
        <p>
          O dono do restaurante faz duas dessas coisas direto no sistema, em Configurações → Seus dados: baixar todos os dados do
          restaurante num arquivo (acesso e portabilidade) e excluir o restaurante, que apaga na hora os dados, as fotos e os acessos da
          equipe. Cópias de segurança automáticas do provedor expiram no ciclo delas e não são usadas para recuperar dados excluídos.
        </p>
        <p>
          Pedidos pelo e-mail {e.emailPrivacidade}. Se o pedido for sobre dados cadastrados por um restaurante cliente (por exemplo, seu
          nome em um registro de produção), encaminharemos ao restaurante, que é o controlador desses dados.
        </p>
      </Secao>

      <Secao titulo="7. Segurança">
        <p>
          Os dados trafegam criptografados (HTTPS). Cada restaurante só acessa os próprios dados, por regras aplicadas no próprio banco de
          dados. O acesso interno é restrito. Em caso de incidente de segurança que possa gerar risco relevante, avisaremos os afetados e
          a ANPD, como manda a lei.
        </p>
      </Secao>

      <Secao titulo="8. Cookies e armazenamento no navegador">
        <p>
          Usamos apenas cookies necessários para manter você conectado. O navegador também guarda preferências suas, como o tema claro ou
          escuro. Não usamos cookies de publicidade.
        </p>
      </Secao>

      <Secao titulo="9. Encarregado de dados e contato">
        <p>
          Encarregado pelo tratamento de dados pessoais (DPO): {e.emailPrivacidade}. Endereço: {e.endereco}.
        </p>
      </Secao>

      <Secao titulo="10. Mudanças nesta Política">
        <p>Podemos atualizar esta Política. Mudanças relevantes serão avisadas no sistema ou por e-mail.</p>
      </Secao>
    </DocumentoLegal>
  );
}
