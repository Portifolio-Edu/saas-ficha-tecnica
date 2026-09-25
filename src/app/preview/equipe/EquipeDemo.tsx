"use client";

// EQUIPE (2026-09-25): tela Equipe na demo. As ações não gravam nada: só
// respondem "ok" (e o código de pareamento é inventado na hora).

import { EquipeView, type AcoesEquipe } from "@/components/equipe/EquipeView";
import { usePapelDemo } from "@/components/ficha/PapelDemo";
import { funcionariosDemo, membrosDemo, USER_ID_DONO_DEMO } from "../equipeDemo";

const espera = () => new Promise((r) => setTimeout(r, 250));
const ok = async () => {
  await espera();
  return { ok: true as const };
};

const ALFABETO = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";

const acoesDemo: AcoesEquipe = {
  criarAcesso: async (input) => {
    await espera();
    if (!input.nome.trim() || input.usuario.trim().length < 3) return { ok: false, erro: "Preencha nome e usuário (mínimo 3 letras)." };
    if (input.senha.length < 8) return { ok: false, erro: "A senha precisa ter pelo menos 8 caracteres." };
    return { ok: true };
  },
  definirAtivo: ok,
  trocarSenha: async (_id, senha) => (senha.length < 8 ? { ok: false, erro: "A senha precisa ter pelo menos 8 caracteres." } : ok()),
  removerAparelho: ok,
  gerarCodigo: async () => {
    await espera();
    const bruto = Array.from({ length: 8 }, () => ALFABETO[Math.floor(Math.random() * ALFABETO.length)]).join("");
    return { ok: true, dados: { codigo: `${bruto.slice(0, 4)}-${bruto.slice(4)}`, expiraEm: new Date(Date.now() + 15 * 60_000).toISOString() } };
  },
  adicionarFuncionario: ok,
  removerFuncionario: ok,
};

export function EquipeDemo() {
  const { papel } = usePapelDemo();
  const userId = papel === "gestor" ? "u-gestor" : USER_ID_DONO_DEMO;
  return (
    <EquipeView
      membros={membrosDemo}
      funcionarios={funcionariosDemo}
      papelAtual={papel}
      userIdAtual={userId}
      acoes={acoesDemo}
      enderecoCozinha="app.fichatecnica.com.br/cozinha"
    />
  );
}
