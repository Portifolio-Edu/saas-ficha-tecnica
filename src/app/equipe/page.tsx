import { exigirAcesso } from "@/lib/auth/acesso";
import { origemDoSite } from "@/lib/auth/origem";
import { listarFuncionarios, listarMembros } from "@/lib/dados/equipe";
import { listarLinksConsulta } from "@/lib/dados/consulta";
import { AppShell } from "@/components/ficha/AppShell";
import { EquipeView } from "@/components/equipe/EquipeView";
import {
  acaoAdicionarFuncionario,
  acaoCriarAcesso,
  acaoDefinirAtivo,
  acaoDesligarLinkConsulta,
  acaoGerarLinkConsulta,
  acaoGerarCodigoCozinha,
  acaoRemoverAparelho,
  acaoRemoverFuncionario,
  acaoTrocarSenha,
} from "./actions";

// EQUIPE (2026-09-25): só dono e gestor chegam aqui (exigirAcesso + RLS).
export default async function EquipePage() {
  const cliente = await exigirAcesso("/equipe");
  const [membros, funcionarios, origem, links] = await Promise.all([listarMembros(), listarFuncionarios(), origemDoSite(), listarLinksConsulta()]);

  return (
    <AppShell nomeRestaurante={cliente.nomeRestaurante} papel={cliente.papel} tituloPagina="Equipe e acessos">
      <EquipeView
        membros={membros}
        funcionarios={funcionarios}
        links={links}
        nomeRestaurante={cliente.nomeRestaurante}
        papelAtual={cliente.papel}
        userIdAtual={cliente.userId}
        enderecoCozinha={`${origem.replace(/^https?:\/\//, "")}/cozinha`}
        acoes={{
          criarAcesso: acaoCriarAcesso,
          definirAtivo: acaoDefinirAtivo,
          trocarSenha: acaoTrocarSenha,
          removerAparelho: acaoRemoverAparelho,
          gerarCodigo: acaoGerarCodigoCozinha,
          adicionarFuncionario: acaoAdicionarFuncionario,
          removerFuncionario: acaoRemoverFuncionario,
          gerarLink: acaoGerarLinkConsulta,
          desligarLink: acaoDesligarLinkConsulta,
        }}
      />
    </AppShell>
  );
}
