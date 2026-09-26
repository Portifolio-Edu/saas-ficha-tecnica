"use client";

// TOQUE (2026-09-25): arrastar cards entre colunas do quadro de produção com o
// dedo, a caneta ou o mouse (Pointer Events). O arrastar nativo do HTML
// (draggable/onDragStart) não funciona com toque na maioria dos tablets, por
// isso o quadro do gestor só arrastava no computador.
//
// Como funciona:
//  - Mouse: aperta e move 6px → começa a arrastar.
//  - Toque/caneta: segura parado ~200ms → o card "levanta" (vibra no Android)
//    e segue o dedo. Se o dedo andar antes disso, é rolagem normal da tela.
//  - Enquanto arrasta, a rolagem da página fica travada e o quadro rola
//    sozinho de lado (ou a página, com colunas empilhadas) quando o dedo
//    encosta na borda.
//  - A coluna embaixo do dedo é achada por `data-coluna` (elementFromPoint).
// Botões e campos dentro do card continuam funcionando: tocar neles não
// inicia arrasto.
// Usado em src/components/cozinha/QuadroProducaoCozinha.tsx e
// src/app/producoes/ProducoesClient.tsx. Reverter: git revert do commit
// "Kanban de produção no modo cozinha".

import { useCallback, useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";

export interface EstadoArrasto<T, C extends string> {
  item: T;
  origem: C;
  /** Posição do dedo/mouse. */
  x: number;
  y: number;
  /** Onde o dedo pegou o card, pra ele não pular. */
  dx: number;
  dy: number;
  largura: number;
  alvo: C | null;
}

const ESPERA_TOQUE_MS = 200;
const TOLERANCIA_TOQUE_PX = 8;
const LIMIAR_MOUSE_PX = 6;
const BORDA_AUTOROLAGEM_PX = 56;

function vibrar(ms: number) {
  try {
    navigator.vibrate?.(ms);
  } catch {}
}

export function useArrastoToque<T, C extends string>({
  podeSoltar,
  aoSoltar,
}: {
  podeSoltar: (origem: C, destino: C, item: T) => boolean;
  aoSoltar: (item: T, origem: C, destino: C) => void;
}) {
  const [arrasto, setArrasto] = useState<EstadoArrasto<T, C> | null>(null);
  const refQuadro = useRef<HTMLDivElement | null>(null);
  const refArrasto = useRef<EstadoArrasto<T, C> | null>(null);
  const refCallbacks = useRef({ podeSoltar, aoSoltar });
  refCallbacks.current = { podeSoltar, aoSoltar };
  const refLimpar = useRef<(() => void) | null>(null);

  const atualizar = useCallback((novo: EstadoArrasto<T, C> | null) => {
    refArrasto.current = novo;
    setArrasto(novo);
  }, []);

  useEffect(() => () => refLimpar.current?.(), []);

  const iniciar = useCallback(
    (e: ReactPointerEvent<HTMLElement>, item: T, origem: C) => {
      if (e.button !== 0 && e.pointerType === "mouse") return;
      // Tocar em botão, link ou campo dentro do card não arrasta.
      if ((e.target as HTMLElement).closest("button, a, input, select, textarea, [data-sem-arrasto]")) return;
      refLimpar.current?.();

      const el = e.currentTarget;
      const inicioX = e.clientX;
      const inicioY = e.clientY;
      const ponteiro = e.pointerId;
      const toque = e.pointerType !== "mouse";
      let ativo = false;
      let timer: number | null = null;
      let raf: number | null = null;
      let ultimoX = inicioX;
      let ultimoY = inicioY;

      const alvoEm = (x: number, y: number): C | null => {
        const sob = document.elementFromPoint(x, y) as HTMLElement | null;
        return (sob?.closest("[data-coluna]")?.getAttribute("data-coluna") as C | null) ?? null;
      };

      // Velocidade cresce quanto mais perto da borda (máx. ~9px por quadro):
      // dá tempo de soltar na coluna vizinha sem passar dela.
      const velocidade = (distancia: number) => Math.ceil(9 * Math.min(1, Math.max(0, 1 - distancia / BORDA_AUTOROLAGEM_PX)));
      const autorolar = () => {
        const quadro = refQuadro.current;
        if (ativo) {
          // Colunas empilhadas (celular): rola a página quando o dedo chega na beirada.
          const topo = velocidade(ultimoY - 40);
          const base = velocidade(window.innerHeight - ultimoY);
          if (topo) window.scrollBy(0, -topo);
          else if (base) window.scrollBy(0, base);
        }
        if (ativo && quadro && quadro.scrollWidth > quadro.clientWidth) {
          const r = quadro.getBoundingClientRect();
          const esq = velocidade(ultimoX - r.left);
          const dir = velocidade(r.right - ultimoX);
          if (esq) quadro.scrollLeft -= esq;
          else if (dir) quadro.scrollLeft += dir;
          // O quadro andou embaixo do dedo parado: atualiza a coluna marcada.
          const atual = refArrasto.current;
          if ((esq || dir) && atual) {
            const alvo = alvoEm(ultimoX, ultimoY);
            if (alvo !== atual.alvo) atualizar({ ...atual, alvo });
          }
        }
        if (ativo) raf = requestAnimationFrame(autorolar);
      };

      const comecar = () => {
        const r = el.getBoundingClientRect();
        ativo = true;
        vibrar(12);
        atualizar({ item, origem, x: ultimoX, y: ultimoY, dx: inicioX - r.left, dy: inicioY - r.top, largura: r.width, alvo: null });
        raf = requestAnimationFrame(autorolar);
      };

      const mover = (ev: PointerEvent) => {
        if (ev.pointerId !== ponteiro) return;
        ultimoX = ev.clientX;
        ultimoY = ev.clientY;
        const andou = Math.hypot(ev.clientX - inicioX, ev.clientY - inicioY);
        if (!ativo) {
          if (toque) {
            // Dedo andou antes do tempo: é rolagem, não arrasto.
            if (andou > TOLERANCIA_TOQUE_PX) limpar();
            return;
          }
          if (andou < LIMIAR_MOUSE_PX) return;
          comecar();
        }
        const atual = refArrasto.current;
        if (!atual) return;
        const alvo = alvoEm(ev.clientX, ev.clientY);
        if (alvo !== atual.alvo && alvo && alvo !== atual.origem && refCallbacks.current.podeSoltar(atual.origem, alvo, atual.item)) vibrar(6);
        atualizar({ ...atual, x: ev.clientX, y: ev.clientY, alvo });
      };

      const soltar = (ev: PointerEvent) => {
        if (ev.pointerId !== ponteiro) return;
        const atual = refArrasto.current;
        limpar();
        if (!atual) return;
        const destino = alvoEm(ev.clientX, ev.clientY);
        if (destino && refCallbacks.current.podeSoltar(atual.origem, destino, atual.item)) {
          vibrar(18);
          refCallbacks.current.aoSoltar(atual.item, atual.origem, destino);
        }
      };

      const cancelar = (ev: PointerEvent) => {
        if (ev.pointerId === ponteiro) limpar();
      };

      // Trava a rolagem só depois que o arrasto começou.
      const travarRolagem = (ev: TouchEvent) => {
        if (ativo) ev.preventDefault();
      };
      // Segurar no Android abre o menu do navegador; no iOS, a lupa/seleção.
      const semMenu = (ev: Event) => ev.preventDefault();

      function limpar() {
        if (timer !== null) window.clearTimeout(timer);
        if (raf !== null) cancelAnimationFrame(raf);
        ativo = false;
        window.removeEventListener("pointermove", mover);
        window.removeEventListener("pointerup", soltar);
        window.removeEventListener("pointercancel", cancelar);
        document.removeEventListener("touchmove", travarRolagem);
        el.removeEventListener("contextmenu", semMenu);
        refLimpar.current = null;
        atualizar(null);
      }

      window.addEventListener("pointermove", mover);
      window.addEventListener("pointerup", soltar);
      window.addEventListener("pointercancel", cancelar);
      document.addEventListener("touchmove", travarRolagem, { passive: false });
      el.addEventListener("contextmenu", semMenu);
      refLimpar.current = limpar;
      if (toque) timer = window.setTimeout(comecar, ESPERA_TOQUE_MS);
    },
    [atualizar],
  );

  const alvoValido = arrasto?.alvo != null && arrasto.alvo !== arrasto.origem && podeSoltar(arrasto.origem, arrasto.alvo, arrasto.item);

  return { arrasto, iniciar, refQuadro, alvoValido };
}
