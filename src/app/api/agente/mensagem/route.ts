import { randomUUID } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getClienteAtual } from "@/lib/dados/cliente";
import { agenteConfigurado, configAgente } from "@/lib/agente/config";
import { PAPEIS_DO_AGENTE, passeDaPessoa } from "@/lib/agente/pessoa";
import { listarPropostasPendentes } from "@/lib/agente/propostas";
import { verificarPasse } from "@/lib/agente/passe";
import { lerNotaDeCompra } from "@/lib/integracoes/documentoFiscal";
import { registrarErro } from "@/lib/monitoramento";

// AGENTE IA (2026-09-26): mensagem do chat do sistema → n8n.
// Recebe texto + até 3 anexos (foto, áudio, PDF, XML de NF-e). Fotos, áudios
// e PDFs vão pro balde privado agente-anexos (pasta do restaurante) e o n8n
// recebe um link assinado de 10 min. XML de NF-e é lido aqui e vai como
// dados (o modelo não precisa ler o XML inteiro). O passe identifica a
// pessoa; o n8n repassa nas ferramentas. Resposta: texto do agente + as
// propostas pendentes dessa pessoa (a tela mostra Confirmar/Cancelar).
export const dynamic = "force-dynamic";
export const maxDuration = 120;

const MAX_ARQUIVOS = 3;
const MAX_BYTES = 15 * 1024 * 1024;

function tipoDoArquivo(f: File): "imagem" | "audio" | "pdf" | "xml" | null {
  const t = f.type.toLowerCase();
  const n = f.name.toLowerCase();
  if (t.startsWith("image/")) return "imagem";
  if (t.startsWith("audio/")) return "audio";
  if (t === "application/pdf" || n.endsWith(".pdf")) return "pdf";
  if (t.includes("xml") || n.endsWith(".xml")) return "xml";
  return null;
}

export async function POST(req: NextRequest) {
  const cliente = await getClienteAtual();
  if (!cliente) return NextResponse.json({ erro: "Sessão expirada. Entre de novo." }, { status: 401 });
  if (!PAPEIS_DO_AGENTE.includes(cliente.papel)) return NextResponse.json({ erro: "O agente é pra dono, gestor e estoquista." }, { status: 403 });
  if (!agenteConfigurado()) return NextResponse.json({ erro: "O agente ainda não está ligado neste ambiente (falta configurar o n8n)." }, { status: 503 });

  const form = await req.formData();
  const texto = String(form.get("texto") ?? "").trim().slice(0, 4000);
  const arquivos = form.getAll("arquivos").filter((a): a is File => a instanceof File && a.size > 0);
  if (!texto && arquivos.length === 0) return NextResponse.json({ erro: "Escreva algo ou mande um arquivo." }, { status: 400 });
  if (arquivos.length > MAX_ARQUIVOS) return NextResponse.json({ erro: `Até ${MAX_ARQUIVOS} arquivos por mensagem.` }, { status: 400 });

  const supabase = await createClient();
  const anexos: { tipo: string; nome: string; mime: string; url: string }[] = [];
  const notas: unknown[] = [];
  for (const f of arquivos) {
    const tipo = tipoDoArquivo(f);
    if (!tipo) return NextResponse.json({ erro: `Arquivo não aceito: ${f.name}. Mande foto, áudio, PDF ou XML de nota.` }, { status: 400 });
    if (f.size > MAX_BYTES) return NextResponse.json({ erro: `${f.name} passa de 15 MB.` }, { status: 400 });
    if (tipo === "xml") {
      const nota = lerNotaDeCompra(await f.text());
      notas.push("erro" in nota ? { arquivo: f.name, erro: nota.erro } : nota);
      continue;
    }
    const ext = (f.name.split(".").pop() ?? "bin").toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 5) || "bin";
    const caminho = `${cliente.id}/${new Date().toISOString().slice(0, 10)}/${randomUUID()}.${ext}`;
    const { error: erroEnvio } = await supabase.storage.from("agente-anexos").upload(caminho, f, { contentType: f.type || undefined });
    if (erroEnvio) return NextResponse.json({ erro: `Não consegui guardar ${f.name}: ${erroEnvio.message}` }, { status: 400 });
    const { data: link, error: erroLink } = await supabase.storage.from("agente-anexos").createSignedUrl(caminho, 600);
    if (erroLink || !link) return NextResponse.json({ erro: "Não consegui gerar o link do arquivo." }, { status: 500 });
    anexos.push({ tipo, nome: f.name, mime: f.type, url: link.signedUrl });
  }

  const { segredo, chaveN8n, urlN8n } = configAgente();
  const passe = passeDaPessoa(cliente, "web");
  const dados = verificarPasse(passe, segredo)!;
  let resposta: string;
  try {
    const r = await fetch(urlN8n, {
      method: "POST",
      headers: { "content-type": "application/json", "x-ft-chave": chaveN8n },
      body: JSON.stringify({
        passe,
        canal: "web",
        sessao: `ft:${cliente.id}:${cliente.userId}:web`,
        pessoa: { nome: cliente.nomeMembro, papel: cliente.papel },
        restaurante: cliente.nomeRestaurante,
        texto,
        anexos,
        notas,
        expira: dados.exp,
      }),
      signal: AbortSignal.timeout(110_000),
    });
    const corpo = (await r.json().catch(() => null)) as { resposta?: string } | null;
    if (!r.ok || !corpo?.resposta) throw new Error(`n8n respondeu ${r.status}`);
    resposta = corpo.resposta;
  } catch (e) {
    void registrarErro({ origem: "servidor", rota: "/api/agente/mensagem", metodo: "POST", erro: e, clienteId: cliente.id, userId: cliente.userId }).catch(() => {});
    return NextResponse.json({ erro: "O agente não respondeu agora. Tente de novo em instantes." }, { status: 502 });
  }

  const propostas = await listarPropostasPendentes(dados).catch(() => []);
  return NextResponse.json({ resposta, propostas });
}
