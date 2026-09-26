import type { Metadata } from "next";
import { DocumentoLegal, Secao } from "@/components/legal/DocumentoLegal";
import { EMPRESA } from "@/lib/legal/empresa";

// PRODUCAO (2026-09-24): RASCUNHO dos Termos de uso, escrito pro caso do Ficha
// Técnica. Precisa de revisão jurídica antes de valer. Dados da empresa em
// src/lib/legal/empresa.ts; ao mudar o texto, atualizar VERSAO_TERMOS.

export const metadata: Metadata = { title: "Termos de uso · Ficha Técnica" };

export default function TermosPage() {
  const e = EMPRESA;
  return (
    <DocumentoLegal titulo="Termos de uso">
      <p>
        Estes Termos regulam o uso do {e.nomeProduto}, software de gestão de fichas técnicas, custos, produção, estoque e CMV para
        estabelecimentos de alimentação, oferecido por {e.razaoSocial}, CNPJ {e.cnpj}, com sede em {e.endereco} (&quot;nós&quot;). Ao criar uma
        conta, você (&quot;cliente&quot;) declara que leu e aceita estes Termos e a Política de privacidade.
      </p>

      <Secao titulo="1. O serviço">
        <p>
          O {e.nomeProduto} é oferecido pela internet, como assinatura (SaaS). Ele organiza as informações que você cadastra (insumos,
          receitas, produções, estoque, checklists, temperaturas, vendas) e calcula custos, margens e indicadores a partir delas.
        </p>
        <p>
          Os cálculos são uma ferramenta de apoio à decisão. Eles dependem da exatidão do que é cadastrado (preços, pesos, fatores de
          correção, vendas e contagens de estoque). A decisão de preço, compra e operação é sempre do cliente.
        </p>
      </Secao>

      <Secao titulo="2. Conta e acesso">
        <p>
          Para usar o serviço é preciso criar uma conta com dados verdadeiros e mantê-los atualizados. Você é responsável por guardar sua
          senha e por tudo o que for feito com o seu acesso, inclusive pelas pessoas da sua equipe a quem você der acesso.
        </p>
        <p>Avise-nos pelo e-mail {e.emailContato} se suspeitar de uso indevido da sua conta.</p>
      </Secao>

      <Secao titulo="3. Teste, assinatura e pagamento">
        <p>
          A conta pode começar com um período de teste gratuito, informado na contratação. Depois dele, o uso depende de assinatura paga,
          no valor e na periodicidade do plano escolhido, cobrada pelo meio de pagamento escolhido (Pix, boleto ou cartão), por meio de
          empresa parceira de pagamentos.
        </p>
        <p>
          Sem pagamento após o vencimento, o acesso pode ser limitado até a regularização. Os valores podem ser reajustados com aviso
          prévio de pelo menos 30 dias.
        </p>
      </Secao>

      <Secao titulo="4. Cancelamento">
        <p>
          Você pode cancelar a qualquer momento, e o acesso continua até o fim do período já pago. Não há devolução proporcional do
          período em curso, salvo quando a lei exigir, inclusive o direito de arrependimento de 7 dias na primeira contratação feita
          pela internet.
        </p>
        <p>
          Depois do cancelamento, você pode pedir a exportação dos seus dados em até 30 dias. Passado esse prazo, os dados podem ser
          apagados, respeitadas as guardas exigidas por lei.
        </p>
      </Secao>

      <Secao titulo="5. Seus dados">
        <p>
          As informações do seu restaurante são suas. Nós as usamos apenas para prestar o serviço, conforme a Política de privacidade, e
          não as vendemos. Cada estabelecimento só enxerga os próprios dados.
        </p>
      </Secao>

      <Secao titulo="6. Uso adequado">
        <p>
          Não é permitido usar o serviço para fins ilegais, tentar acessar dados de outros clientes, sobrecarregar ou atacar o sistema,
          copiar o software ou revendê-lo sem autorização.
        </p>
      </Secao>

      <Secao titulo="7. Disponibilidade e suporte">
        <p>
          Trabalhamos para manter o serviço disponível e seguro, mas podem ocorrer interrupções para manutenção ou por falhas de terceiros
          (hospedagem, internet, provedores). Avisaremos com antecedência as manutenções programadas sempre que possível. Suporte pelo
          e-mail {e.emailContato}.
        </p>
      </Secao>

      <Secao titulo="8. Integrações">
        <p>
          Recursos de integração com PDVs, aplicativos de delivery e arquivos fiscais dependem de terceiros e dos dados que eles
          fornecem. Não respondemos por indisponibilidade ou erro de sistemas de terceiros.
        </p>
      </Secao>

      <Secao titulo="9. Responsabilidade">
        <p>
          Na extensão permitida pela lei, não respondemos por lucros cessantes ou prejuízos indiretos decorrentes de decisões tomadas com
          base nas informações do serviço, nem por dados cadastrados incorretamente. Nossa responsabilidade total fica limitada ao valor
          pago pelo cliente nos 12 meses anteriores ao fato.
        </p>
      </Secao>

      <Secao titulo="10. Propriedade intelectual">
        <p>
          O software, a marca e o conteúdo do {e.nomeProduto} pertencem a {e.razaoSocial}. A assinatura dá direito de uso, não de
          propriedade.
        </p>
      </Secao>

      <Secao titulo="11. Mudanças nestes Termos">
        <p>
          Podemos atualizar estes Termos. Mudanças relevantes serão avisadas no próprio sistema ou por e-mail, e o uso após o aviso
          significa concordância. A versão em vigor fica sempre nesta página.
        </p>
      </Secao>

      <Secao titulo="12. Lei e foro">
        <p>
          Estes Termos seguem as leis brasileiras, incluindo o Código de Defesa do Consumidor quando aplicável. Fica eleito o foro de{" "}
          {e.foro}, ressalvado o foro do domicílio do consumidor quando a lei o garantir.
        </p>
      </Secao>
    </DocumentoLegal>
  );
}
