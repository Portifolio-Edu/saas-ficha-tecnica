/* eslint-disable @next/next/no-img-element */
"use client";

import { useState, useRef, useEffect } from "react";
import {
  X, Send, Mic, Camera, Smartphone,
  Sparkles, CheckCircle2, Play, Square, QrCode,
  RefreshCw, Bot, Check, Volume2
} from "lucide-react";
import { nums } from "@/components/ficha/tema";
import { useToast } from "@/components/ficha/Toast";

export interface AcaoPropostaIA {
  tipo: "nutricional" | "entrada_estoque" | "saida_perda" | "cadastro_insumo";
  titulo: string;
  descricao: string;
  insumoId?: string;
  nomeInsumo?: string;
  dadosNutricionais?: {
    caloriasKcal: number;
    carboidratosG: number;
    acucaresTotaisG: number;
    acucaresAdicionadosG: number;
    proteinasG: number;
    gordurasTotaisG: number;
    gordurasSaturadasG: number;
    gordurasTransG: number;
    fibraAlimentarG: number;
    sodioMg: number;
    baseGramas?: number;
  };
  dadosEstoque?: {
    quantidade: number;
    unidadeMedida: string;
    origem: string;
  };
  executada?: boolean;
}

export interface MensagemChat {
  id: string;
  remetente: "usuario" | "ia" | "sistema";
  texto: string;
  imagemUrl?: string;
  audioSegundos?: number;
  acaoProposta?: AcaoPropostaIA;
  timestamp: string;
  origem?: "web" | "whatsapp";
}

const EXEMPLOS_AUDIO = [
  {
    titulo: "Chegada de Peito de Frango",
    texto: "Chegaram 15kg de peito de frango da Avícola Bom Frango a R$ 17,90 o quilo.",
    tipo: "entrada_estoque" as const,
  },
  {
    titulo: "Rótulo do Fermento Seco",
    texto: "Informação do rótulo do fermento biológico seco: por 100g tem 392 calorias, 40g de carboidratos, 45g de proteína e 60mg de sódio.",
    tipo: "nutricional" as const,
  },
  {
    titulo: "Registro de Perda na Bancada",
    texto: "Descarte de 1.8kg de tomate italiano estragado na bancada da manhã.",
    tipo: "saida_perda" as const,
  },
];

export function AgenteIaModal({
  aberto,
  onFechar,
  insumoFocoId,
  insumoFocoNome,
  onAplicarNutricional,
  onAplicarEstoque,
  escopo = "completo",
}: {
  /** EQUIPE (2026-09-25): "estoque" = versão do estoquista: notas fiscais,
   * chegadas, perdas e contagens. Sem tabela nutricional (tela da gestão). */
  escopo?: "completo" | "estoque";
  aberto: boolean;
  onFechar: () => void;
  insumoFocoId?: string | null;
  insumoFocoNome?: string | null;
  onAplicarNutricional?: (insumoId: string, valores: Record<string, unknown>) => void;
  onAplicarEstoque?: (insumoId: string, tipo: string, quantidade: number, origem: string) => void;
}) {
  const [abaAtiva, setAbaAtiva] = useState<"chat" | "whatsapp">("chat");
  const [mensagens, setMensagens] = useState<MensagemChat[]>([]);
  const [textoEntrada, setTextoEntrada] = useState("");
  const [processando, setProcessando] = useState(false);
  const [gravando, setGravando] = useState(false);
  const [tempoGravacao, setTempoGravacao] = useState(0);
  const [imagemSelecionada, setImagemSelecionada] = useState<string | null>(null);
  const [nomeArquivoImagem, setNomeArquivoImagem] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const timerGravacaoRef = useRef<NodeJS.Timeout | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const { mostrarSucesso, mostrarErro } = useToast();

  // Inicializar mensagens de boas-vindas
  useEffect(() => {
    if (mensagens.length === 0) {
      const msgsIniciais: MensagemChat[] = [
        {
          id: "msg-welcome-1",
          remetente: "ia",
          texto: insumoFocoNome
            ? `Olá! Estou pronto para calibrar o insumo **${insumoFocoNome}**. Envie uma foto da embalagem/tabela nutricional ou grave um áudio para eu preencher os dados automaticamente.`
            : escopo === "estoque"
              ? "Olá! Sou o **Agente de IA do Estoque**. Mande a foto da nota fiscal ou do cupom, grave um áudio da chegada ou da perda, ou conecte o WhatsApp: eu preparo o lançamento no estoque pra você conferir e confirmar."
              : "Olá! Sou o **Agente de IA da Cozinha & Estoque**. Você pode me enviar fotos de rótulos/notas fiscais, gravar áudios da operação ou conectar pelo WhatsApp para lançar tudo no sistema automaticamente.",
          timestamp: new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }),
          origem: "web",
        },
      ];
      setMensagens(msgsIniciais);
    }
  }, [insumoFocoNome, mensagens.length, escopo]);

  // Scroll automático para a última mensagem
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [mensagens, processando]);

  // Controle de gravação de áudio
  const iniciarGravacao = async () => {
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        mostrarErro("Seu navegador não suporta captura direta de áudio. Use os exemplos de áudio.");
        return;
      }

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.start();
      setGravando(true);
      setTempoGravacao(0);

      timerGravacaoRef.current = setInterval(() => {
        setTempoGravacao((prev) => prev + 1);
      }, 1000);
    } catch {
      mostrarErro("Permissão de microfone negada. Você também pode clicar nos áudios de demonstração.");
    }
  };

  const pararGravacao = (enviar = true) => {
    if (timerGravacaoRef.current) {
      clearInterval(timerGravacaoRef.current);
      timerGravacaoRef.current = null;
    }

    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream.getTracks().forEach((track) => track.stop());
    }

    setGravando(false);

    if (enviar && tempoGravacao >= 1) {
      const segundos = tempoGravacao;
      processarAudioGravado(segundos);
    }
    setTempoGravacao(0);
  };

  const processarAudioGravado = (segundos: number) => {
    // Simular transcrição inteligente de áudio da cozinha
    const hora = new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });

    let transcricao = "Informações nutricionais: 392 calorias, 40g carboidratos, 45g proteínas, 60mg sódio.";
    if (!insumoFocoNome) {
      transcricao = "Chegaram 10kg de peito de frango da Avícola Bom Frango a R$ 17,90.";
    }

    const novaMsgUsuario: MensagemChat = {
      id: `usr-aud-${Date.now()}`,
      remetente: "usuario",
      texto: `🎙️ Áudio de voz gravado (${segundos}s)`,
      audioSegundos: segundos,
      timestamp: hora,
      origem: "web",
    };

    setMensagens((prev) => [...prev, novaMsgUsuario]);
    processarComIa(transcricao, undefined, true);
  };

  // Enviar imagem
  const handleSelecionarImagem = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setNomeArquivoImagem(file.name);
    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      setImagemSelecionada(dataUrl);
    };
    reader.readAsDataURL(file);
  };

  // Processamento inteligente do Agente de IA
  const processarComIa = (promptTexto: string, imgUrl?: string, isAudio = false) => {
    setProcessando(true);

    setTimeout(() => {
      const hora = new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
      const promptLower = promptTexto.toLowerCase();

      // Caso 1: Rótulo / Dados Nutricionais (Fermento, Farinha, etc.)
      // No escopo do estoque a foto é de nota fiscal (cai no Caso 2).
      if (
        escopo === "completo" &&
        (imgUrl ||
        promptLower.includes("rótulo") ||
        promptLower.includes("nutricional") ||
        promptLower.includes("caloria") ||
        promptLower.includes("fermento") ||
        insumoFocoNome)
      ) {
        const insumoId = insumoFocoId || "i-fermento";
        const insumoNome = insumoFocoNome || "Fermento Biológico Seco";

        const respostaIa: MensagemChat = {
          id: `ia-${Date.now()}`,
          remetente: "ia",
          texto: isAudio
            ? `Transcrevi seu áudio: *"${promptTexto}"*\n\nIdentifiquei a **tabela nutricional por 100g** para **${insumoNome}**:`
            : imgUrl
            ? `Analisei a imagem enviada (*${nomeArquivoImagem || "rótulo.jpg"}*) via OCR multimodal.\n\nExtraí com precisão a **tabela nutricional por 100g** para **${insumoNome}**:`
            : `Processe dados nutricionais para **${insumoNome}**:`,
          imagemUrl: imgUrl,
          timestamp: hora,
          origem: "web",
          acaoProposta: {
            tipo: "nutricional",
            titulo: `Aplicar dados nutricionais em ${insumoNome}`,
            descricao: "Base 100g: 392 kcal | Carb: 40g | Prot: 45g | Gord: 5.5g | Sódio: 60mg",
            insumoId,
            nomeInsumo: insumoNome,
            dadosNutricionais: {
              caloriasKcal: 392,
              carboidratosG: 40,
              acucaresTotaisG: 1.5,
              acucaresAdicionadosG: 0,
              proteinasG: 45,
              gordurasTotaisG: 5.5,
              gordurasSaturadasG: 1.2,
              gordurasTransG: 0,
              fibraAlimentarG: 22,
              sodioMg: 60,
              baseGramas: 100,
            },
          },
        };

        setMensagens((prev) => [...prev, respostaIa]);
        setProcessando(false);
        setImagemSelecionada(null);
        setNomeArquivoImagem(null);
        return;
      }

      // Caso 2: Entrada de Estoque / Nota Fiscal
      if ((escopo === "estoque" && imgUrl) || promptLower.includes("peito de frango") || promptLower.includes("chegaram") || promptLower.includes("nota") || promptLower.includes("compra")) {
        const respostaIa: MensagemChat = {
          id: `ia-${Date.now()}`,
          remetente: "ia",
          texto: isAudio
            ? `Transcrevi seu áudio: *"${promptTexto}"*\n\nDetectei uma **entrada de mercadoria**:`
            : imgUrl
            ? `Analisei a nota fiscal/recibo via OCR:\n\nDetectei uma **compra faturada**:`
            : `Identifiquei uma nova entrada de estoque:`,
          timestamp: hora,
          origem: "web",
          acaoProposta: {
            tipo: "entrada_estoque",
            titulo: "Lançar Entrada no Estoque: Peito de Frango",
            descricao: "+15kg · Fornecedor: Avícola Bom Frango · NF #48291",
            insumoId: "i-frango",
            nomeInsumo: "Peito de Frango",
            dadosEstoque: {
              quantidade: 15,
              unidadeMedida: "kg",
              origem: "Compra — Avícola Bom Frango (via Agente IA)",
            },
          },
        };

        setMensagens((prev) => [...prev, respostaIa]);
        setProcessando(false);
        setImagemSelecionada(null);
        setNomeArquivoImagem(null);
        return;
      }

      // Caso padrão / Assistente Geral de Cozinha
      const respostaIa: MensagemChat = {
        id: `ia-${Date.now()}`,
        remetente: "ia",
        texto:
          escopo === "estoque"
            ? `Entendido! No estoque eu posso:\n1. 📄 Ler a foto da nota fiscal ou do cupom e preparar a entrada no estoque.\n2. 🎙️ Ouvir áudios de chegada, perda ou descarte e lançar a movimentação.\n3. 📦 Avisar quando um insumo estiver abaixo do mínimo.\n4. 📲 Receber tudo pelo WhatsApp, direto do celular.`
            : `Entendido! Posso ajudar a:\n1. 📷 Ler fotos de rótulos e embalagens para preencher tabelas nutricionais.\n2. 📄 Ler notas fiscais ou cupons de fornecedores para dar entrada no estoque.\n3. 🎙️ Ouvir áudios da equipe da cozinha com lotes, perdas ou recebimentos.\n4. 📲 Conectar ao WhatsApp para receber tudo direto do celular da equipe.`,
        timestamp: hora,
        origem: "web",
      };

      setMensagens((prev) => [...prev, respostaIa]);
      setProcessando(false);
      setImagemSelecionada(null);
      setNomeArquivoImagem(null);
    }, 1200);
  };

  const enviarMensagem = () => {
    if (!textoEntrada.trim() && !imagemSelecionada) return;

    const hora = new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
    const texto = textoEntrada.trim();
    const img = imagemSelecionada;

    const novaMsg: MensagemChat = {
      id: `usr-${Date.now()}`,
      remetente: "usuario",
      texto: texto || (img ? "📷 Envio de imagem para análise" : ""),
      imagemUrl: img || undefined,
      timestamp: hora,
      origem: "web",
    };

    setMensagens((prev) => [...prev, novaMsg]);
    setTextoEntrada("");
    processarComIa(texto || "Análise de imagem", img || undefined, false);
  };

  const executarAcaoProposta = (msgId: string, acao: AcaoPropostaIA) => {
    if (acao.tipo === "nutricional" && acao.insumoId && acao.dadosNutricionais) {
      if (onAplicarNutricional) {
        onAplicarNutricional(acao.insumoId, acao.dadosNutricionais);
      } else {
        // Fallback demo storage
        try {
          const salvo = localStorage.getItem("demo_valores_nutricionais");
          const lista = salvo ? JSON.parse(salvo) : [];
          const filtrado = lista.filter((v: { insumoId?: string }) => v.insumoId !== acao.insumoId);
          filtrado.push({
            insumoId: acao.insumoId,
            baseGramas: acao.dadosNutricionais.baseGramas ?? 100,
            valores: acao.dadosNutricionais,
          });
          localStorage.setItem("demo_valores_nutricionais", JSON.stringify(filtrado));
          window.dispatchEvent(new Event("storage"));
        } catch {}
      }

      mostrarSucesso(`Dados nutricionais de ${acao.nomeInsumo} salvos com sucesso via IA!`);
    } else if (acao.tipo === "entrada_estoque" && acao.insumoId && acao.dadosEstoque) {
      if (onAplicarEstoque) {
        onAplicarEstoque(acao.insumoId, "entrada", acao.dadosEstoque.quantidade, acao.dadosEstoque.origem);
      } else {
        // Fallback demo storage
        try {
          const salvoMov = localStorage.getItem("demo_movimentacoes");
          const listaMov = salvoMov ? JSON.parse(salvoMov) : [];
          const novaMov = {
            id: `mov-ai-${Date.now()}`,
            insumoId: acao.insumoId,
            nomeInsumo: acao.nomeInsumo ?? "Insumo",
            unidadeMedida: acao.dadosEstoque.unidadeMedida,
            tipo: "entrada",
            quantidade: acao.dadosEstoque.quantidade,
            origem: acao.dadosEstoque.origem,
            criadoEm: new Date().toISOString(),
          };
          localStorage.setItem("demo_movimentacoes", JSON.stringify([novaMov, ...listaMov]));

          // Atualizar saldo
          const salvoEst = localStorage.getItem("demo_estoque");
          if (salvoEst) {
            const listaEst = JSON.parse(salvoEst);
            const atualizado = listaEst.map((e: { insumoId?: string; saldoAtual?: number }) =>
              e.insumoId === acao.insumoId ? { ...e, saldoAtual: Number(((e.saldoAtual ?? 0) + acao.dadosEstoque!.quantidade).toFixed(3)) } : e
            );
            localStorage.setItem("demo_estoque", JSON.stringify(atualizado));
          }
          window.dispatchEvent(new Event("storage"));
        } catch {}
      }

      mostrarSucesso(`Entrada de +${acao.dadosEstoque.quantidade}${acao.dadosEstoque.unidadeMedida} registrada no estoque!`);
    }

    // Marcar como executada
    setMensagens((prev) =>
      prev.map((m) =>
        m.id === msgId ? { ...m, acaoProposta: { ...m.acaoProposta!, executada: true } } : m
      )
    );
  };

  const dispararExemploAudio = (exemplo: typeof EXEMPLOS_AUDIO[0]) => {
    const hora = new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
    const novaMsg: MensagemChat = {
      id: `usr-aud-${Date.now()}`,
      remetente: "usuario",
      texto: `🎙️ "${exemplo.texto}"`,
      audioSegundos: 4,
      timestamp: hora,
      origem: "whatsapp",
    };
    setMensagens((prev) => [...prev, novaMsg]);
    processarComIa(exemplo.texto, undefined, true);
  };

  if (!aberto) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-md animate-fade-in font-sans">
      <div
        className="w-full max-w-2xl h-[90vh] max-h-[720px] rounded-2xl flex flex-col overflow-hidden border shadow-2xl"
        style={{
          backgroundColor: "var(--panel)",
          borderColor: "var(--linha-forte)",
          boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.45)",
        }}
      >
        {/* Header do Agente */}
        <div
          className="px-5 py-3.5 border-b flex items-center justify-between"
          style={{
            borderColor: "var(--linha)",
            backgroundColor: "var(--panel-elevated)",
          }}
        >
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center text-white shadow-sm relative"
              style={{
                background: "linear-gradient(135deg, #2563EB 0%, #7C3AED 100%)",
              }}
            >
              <Bot size={22} strokeWidth={2.2} />
              <span className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-emerald-500 border-2 border-[var(--panel)] animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-[15px] font-black tracking-tight text-[var(--tinta)]">
                  Agente IA de Cozinha &amp; Estoque
                </h3>
                <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600 border border-amber-500/30">
                  Demonstração
                </span>
              </div>
              <p className="text-[11.5px] font-medium text-[var(--tinta-sub)]">
                Simulação de como o agente vai funcionar -- as respostas são de exemplo
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Seletor de Abas */}
            <div
              className="flex items-center p-0.5 rounded-lg border text-[12px] font-bold"
              style={{
                backgroundColor: "var(--panel)",
                borderColor: "var(--linha)",
              }}
            >
              <button
                onClick={() => setAbaAtiva("chat")}
                className={`px-3 py-1 rounded-md transition-all ${
                  abaAtiva === "chat"
                    ? "bg-[var(--tinta)] text-[var(--panel)] shadow-sm"
                    : "text-[var(--tinta-sub)] hover:text-[var(--tinta)]"
                }`}
              >
                Chat &amp; Mídia
              </button>
              <button
                onClick={() => setAbaAtiva("whatsapp")}
                className={`px-3 py-1 rounded-md transition-all flex items-center gap-1.5 ${
                  abaAtiva === "whatsapp"
                    ? "bg-emerald-600 text-white shadow-sm"
                    : "text-[var(--tinta-sub)] hover:text-emerald-500"
                }`}
              >
                <Smartphone size={13} />
                WhatsApp
              </button>
            </div>

            <button
              onClick={onFechar}
              className="p-1.5 rounded-xl text-[var(--tinta-sub)] hover:text-[var(--tinta)] hover:bg-[var(--panel)] border border-transparent hover:border-[var(--linha)] transition-all"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Conteúdo Aba WhatsApp */}
        {abaAtiva === "whatsapp" ? (
          <div className="flex-1 p-6 overflow-y-auto space-y-6">
            <div
              className="p-5 rounded-2xl border text-center relative overflow-hidden"
              style={{
                backgroundColor: "rgba(16, 185, 129, 0.05)",
                borderColor: "rgba(16, 185, 129, 0.3)",
              }}
            >
              <div className="w-14 h-14 mx-auto mb-3 rounded-2xl bg-emerald-500/10 flex items-center justify-center text-emerald-500 border border-emerald-500/30">
                <Smartphone size={28} />
              </div>
              <h4 className="text-[17px] font-black text-[var(--tinta)] mb-1">
                Conectar WhatsApp da Cozinha
              </h4>
              <p className="text-[13px] text-[var(--tinta-sub)] max-w-md mx-auto mb-5">
                Os cozinheiros e o estoquista podem mandar fotos de notas fiscais, rótulos de insumos e áudios de voz direto pelo WhatsApp. A IA processa e alimenta o SaaS em tempo real.
              </p>

              {/* QR Code de Demonstração */}
              <div className="inline-block p-4 rounded-xl bg-white shadow-md border mb-4">
                <div className="w-44 h-44 flex flex-col items-center justify-center border-2 border-dashed border-slate-300 rounded-lg bg-slate-50 text-slate-700">
                  <QrCode size={110} strokeWidth={1.5} className="text-slate-800" />
                  <span className="text-[10px] font-extrabold mt-2 text-slate-500">
                    Escanear com WhatsApp
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-center gap-2 text-[12px] font-bold" style={{ color: "var(--tinta-sub)" }}>
                <span>QR ilustrativo -- a integração com WhatsApp ainda não está ativa.</span>
              </div>
            </div>

            {/* Teste Rápido de Mensagem Simulada do WhatsApp */}
            <div
              className="p-5 rounded-2xl border"
              style={{
                backgroundColor: "var(--panel-elevated)",
                borderColor: "var(--linha)",
              }}
            >
              <h5 className="text-[13.5px] font-black text-[var(--tinta)] mb-2 flex items-center gap-2">
                <Sparkles size={16} className="text-amber-500" />
                Testar Fluxo Real com Áudios da Cozinha
              </h5>
              <p className="text-[12px] text-[var(--tinta-sub)] mb-3">
                Clique em um exemplo para ver como o Agente de IA processa o áudio enviado da bancada:
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                {EXEMPLOS_AUDIO.filter((ex) => escopo === "completo" || ex.tipo !== "nutricional").map((ex, i) => (
                  <button
                    key={i}
                    onClick={() => {
                      setAbaAtiva("chat");
                      dispararExemploAudio(ex);
                    }}
                    className="p-3 text-left rounded-xl border transition-all hover:border-emerald-500/50 hover:bg-emerald-500/5 group"
                    style={{
                      backgroundColor: "var(--panel)",
                      borderColor: "var(--linha)",
                    }}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <Volume2 size={14} className="text-emerald-500 group-hover:scale-110 transition-transform" />
                      <span className="text-[12px] font-bold text-[var(--tinta)] line-clamp-1">
                        {ex.titulo}
                      </span>
                    </div>
                    <p className="text-[11px] text-[var(--tinta-sub)] line-clamp-2 italic">
                      &quot;{ex.texto}&quot;
                    </p>
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : (
          /* Conteúdo Aba Chat & Mídia */
          <div className="flex-1 flex flex-col min-h-0">
            {/* Lista de Mensagens */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
              {mensagens.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex flex-col ${
                    msg.remetente === "usuario" ? "items-end" : "items-start"
                  }`}
                >
                  <div className="flex items-center gap-1.5 mb-1 px-1">
                    <span className="text-[10.5px] font-extrabold text-[var(--tinta-faint)]">
                      {msg.remetente === "usuario" ? "Você" : "Agente IA"}
                    </span>
                    {msg.origem === "whatsapp" && (
                      <span className="text-[9.5px] font-black px-1.5 py-0.2 rounded-full bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                        via WhatsApp
                      </span>
                    )}
                    <span className="text-[10px] text-[var(--tinta-faint)]">
                      · {msg.timestamp}
                    </span>
                  </div>

                  <div
                    className={`max-w-[85%] sm:max-w-[75%] rounded-2xl p-3.5 text-[13px] leading-relaxed shadow-sm ${
                      msg.remetente === "usuario"
                        ? "bg-[var(--tinta)] text-[var(--panel)] font-medium rounded-tr-none"
                        : "border rounded-tl-none"
                    }`}
                    style={
                      msg.remetente === "ia"
                        ? {
                            backgroundColor: "var(--panel-elevated)",
                            borderColor: "var(--linha)",
                            color: "var(--tinta)",
                          }
                        : {}
                    }
                  >
                    {/* Imagem enviada */}
                    {msg.imagemUrl && (
                      <div className="mb-2.5 rounded-xl overflow-hidden border border-white/10 max-h-48">
                        <img
                          src={msg.imagemUrl}
                          alt="Arquivo enviado"
                          className="w-full h-auto object-cover max-h-48"
                        />
                      </div>
                    )}

                    {/* Áudio reproduzido */}
                    {msg.audioSegundos && (
                      <div className="flex items-center gap-3 p-2.5 rounded-xl bg-black/10 dark:bg-white/10 mb-2">
                        <div className="w-8 h-8 rounded-full bg-emerald-500 text-white flex items-center justify-center shrink-0">
                          <Play size={14} className="ml-0.5" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="h-2 rounded-full bg-emerald-500/30 relative overflow-hidden">
                            <div className="w-2/3 h-full bg-emerald-500 rounded-full" />
                          </div>
                          <div className="flex justify-between text-[10px] mt-1 opacity-75 font-mono">
                            <span>0:0{msg.audioSegundos}</span>
                            <span>Mensagem de voz</span>
                          </div>
                        </div>
                      </div>
                    )}

                    <div className="whitespace-pre-line">{msg.texto}</div>

                    {/* Cartão de Ação Proposta pela IA */}
                    {msg.acaoProposta && (
                      <div
                        className="mt-3 p-3 rounded-xl border transition-all"
                        style={{
                          backgroundColor: msg.acaoProposta.executada
                            ? "rgba(16, 185, 129, 0.08)"
                            : "var(--panel)",
                          borderColor: msg.acaoProposta.executada
                            ? "rgba(16, 185, 129, 0.4)"
                            : "var(--linha-forte)",
                        }}
                      >
                        <div className="flex items-start justify-between gap-2 mb-1.5">
                          <div className="flex items-center gap-1.5">
                            {msg.acaoProposta.executada ? (
                              <CheckCircle2 size={16} className="text-emerald-500 shrink-0" />
                            ) : (
                              <Sparkles size={16} className="text-amber-500 shrink-0" />
                            )}
                            <span className="font-extrabold text-[12.5px] text-[var(--tinta)]">
                              {msg.acaoProposta.titulo}
                            </span>
                          </div>
                          <span
                            className="text-[10px] font-black px-2 py-0.5 rounded-full"
                            style={{
                              backgroundColor: msg.acaoProposta.executada
                                ? "rgba(16, 185, 129, 0.15)"
                                : "rgba(217, 119, 6, 0.15)",
                              color: msg.acaoProposta.executada
                                ? "#059669"
                                : "#D97706",
                            }}
                          >
                            {msg.acaoProposta.executada ? "Executado" : "Pronto para aplicar"}
                          </span>
                        </div>

                        <p className="text-[11.5px] text-[var(--tinta-sub)] mb-2.5">
                          {msg.acaoProposta.descricao}
                        </p>

                        {!msg.acaoProposta.executada ? (
                          <button
                            onClick={() => executarAcaoProposta(msg.id, msg.acaoProposta!)}
                            className="w-full py-2 px-3 rounded-lg text-[12px] font-extrabold text-white flex items-center justify-center gap-2 shadow-sm transition-transform active:scale-[0.98]"
                            style={{
                              background:
                                "linear-gradient(135deg, #059669 0%, #10B981 100%)",
                            }}
                          >
                            <Check size={14} strokeWidth={3} />
                            <span>Confirmar e Salvar no Sistema</span>
                          </button>
                        ) : (
                          <div className="flex items-center gap-1.5 text-[11px] font-bold text-emerald-600">
                            <Check size={13} strokeWidth={2.5} />
                            <span>Dados sincronizados no cadastro e relatórios</span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ))}

              {processando && (
                <div className="flex items-center gap-2.5 p-3 rounded-2xl max-w-xs border" style={{ backgroundColor: "var(--panel-elevated)", borderColor: "var(--linha)" }}>
                  <RefreshCw size={15} className="animate-spin text-purple-500" />
                  <span className="text-[12px] font-bold text-[var(--tinta-sub)]">
                    Agente IA analisando mídia...
                  </span>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Pré-visualização de imagem anexada */}
            {imagemSelecionada && (
              <div className="px-4 py-2 border-t flex items-center justify-between" style={{ backgroundColor: "var(--panel-elevated)", borderColor: "var(--linha)" }}>
                <div className="flex items-center gap-2">
                  <div className="w-10 h-10 rounded-lg overflow-hidden border">
                    <img src={imagemSelecionada} alt="Preview" className="w-full h-full object-cover" />
                  </div>
                  <div>
                    <span className="text-[12px] font-bold text-[var(--tinta)] block">
                      {nomeArquivoImagem || "Imagem anexada"}
                    </span>
                    <span className="text-[11px] text-emerald-500 font-semibold">
                      Pronta para OCR / leitura nutricional
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setImagemSelecionada(null);
                    setNomeArquivoImagem(null);
                  }}
                  className="p-1 rounded-lg hover:bg-[var(--panel)] text-[var(--tinta-sub)]"
                >
                  <X size={16} />
                </button>
              </div>
            )}

            {/* Barra de Ações Rápidas (Chips de Exemplo) */}
            <div className="px-4 py-2 border-t flex items-center gap-2 overflow-x-auto" style={{ borderColor: "var(--linha)", backgroundColor: "var(--panel)" }}>
              <span className="text-[11px] font-bold text-[var(--tinta-faint)] shrink-0">
                Exemplos:
              </span>
              {escopo === "completo" && (
              <button
                onClick={() => {
                  setTextoEntrada("Ler rótulo do fermento biológico seco");
                  processarComIa("Ler rótulo do fermento biológico seco");
                }}
                className="text-[11.5px] font-semibold px-2.5 py-1 rounded-full border shrink-0 hover:border-purple-500/50 hover:bg-purple-500/5"
                style={{ borderColor: "var(--linha)", color: "var(--tinta-sub)" }}
              >
                📷 Rótulo Fermento
              </button>
              )}
              <button
                onClick={() => {
                  setTextoEntrada("Chegaram 15kg de peito de frango a R$ 17,90");
                  processarComIa("Chegaram 15kg de peito de frango a R$ 17,90");
                }}
                className="text-[11.5px] font-semibold px-2.5 py-1 rounded-full border shrink-0 hover:border-emerald-500/50 hover:bg-emerald-500/5"
                style={{ borderColor: "var(--linha)", color: "var(--tinta-sub)" }}
              >
                📄 Nota Fiscal Frango
              </button>
              <button
                onClick={() => setAbaAtiva("whatsapp")}
                className="text-[11.5px] font-semibold px-2.5 py-1 rounded-full border shrink-0 text-emerald-600 border-emerald-500/30 hover:bg-emerald-500/10 flex items-center gap-1"
              >
                <Smartphone size={11} /> WhatsApp
              </button>
            </div>

            {/* Barra de Entrada de Mensagem e Gravação */}
            <div
              className="p-3 sm:p-4 border-t"
              style={{
                backgroundColor: "var(--panel-elevated)",
                borderColor: "var(--linha)",
              }}
            >
              {gravando ? (
                /* Estado Gravando Áudio */
                <div className="flex items-center justify-between p-2 rounded-xl bg-red-500/10 border border-red-500/30">
                  <div className="flex items-center gap-3">
                    <span className="w-3 h-3 rounded-full bg-red-500 animate-ping ml-2" />
                    <div>
                      <span className="text-[12.5px] font-extrabold text-red-500 block">
                        Gravando áudio da cozinha...
                      </span>
                      <span className="text-[11px] font-mono text-[var(--tinta-sub)]" style={nums}>
                        00:0{tempoGravacao}s (Fale o insumo, peso ou tabela)
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => pararGravacao(false)}
                      className="px-3 py-1.5 rounded-lg text-[12px] font-bold text-[var(--tinta-sub)] hover:bg-[var(--panel)]"
                    >
                      Cancelar
                    </button>
                    <button
                      onClick={() => pararGravacao(true)}
                      className="px-3.5 py-1.5 rounded-lg text-[12px] font-extrabold bg-red-600 text-white flex items-center gap-1.5 shadow-sm"
                    >
                      <Square size={13} fill="white" />
                      <span>Enviar Áudio</span>
                    </button>
                  </div>
                </div>
              ) : (
                /* Estado Normal de Digitação */
                <div className="flex items-center gap-2">
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleSelecionarImagem}
                    accept="image/*"
                    className="hidden"
                  />

                  {/* Botão de Anexar Foto / Câmera */}
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    title="Enviar foto de embalagem ou nota fiscal"
                    className="p-2.5 rounded-xl border text-[var(--tinta-sub)] hover:text-purple-600 hover:border-purple-500/50 hover:bg-purple-500/5 transition-all shrink-0"
                    style={{
                      backgroundColor: "var(--panel)",
                      borderColor: "var(--linha)",
                    }}
                  >
                    <Camera size={18} />
                  </button>

                  {/* Botão de Gravar Áudio */}
                  <button
                    onClick={iniciarGravacao}
                    title="Gravar áudio da cozinha"
                    className="p-2.5 rounded-xl border text-[var(--tinta-sub)] hover:text-red-500 hover:border-red-500/50 hover:bg-red-500/5 transition-all shrink-0"
                    style={{
                      backgroundColor: "var(--panel)",
                      borderColor: "var(--linha)",
                    }}
                  >
                    <Mic size={18} />
                  </button>

                  {/* Input de Texto */}
                  <input
                    type="text"
                    value={textoEntrada}
                    onChange={(e) => setTextoEntrada(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && enviarMensagem()}
                    placeholder={
                      insumoFocoNome
                        ? `Dite ou escreva dados do ${insumoFocoNome}...`
                        : "Digite uma instrução, envie foto ou grave áudio..."
                    }
                    className="flex-1 px-3.5 py-2.5 rounded-xl text-[13px] border bg-[var(--panel)] focus:outline-none focus:border-purple-500 transition-all font-sans"
                    style={{
                      borderColor: "var(--linha)",
                      color: "var(--tinta)",
                    }}
                  />

                  {/* Botão Enviar */}
                  <button
                    onClick={enviarMensagem}
                    disabled={!textoEntrada.trim() && !imagemSelecionada}
                    className="p-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 disabled:opacity-40 text-white shadow-sm transition-all shrink-0"
                  >
                    <Send size={16} />
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
