// Teste de interação em DOM simulado. Não usa banco, rede ou navegador.
// Dependência de QA opcional: FICHA_QA_MODULES=/tmp/ficha-qa/node_modules.
import assert from 'node:assert/strict';
import path from 'node:path';
import fs from 'node:fs';
import os from 'node:os';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const doProjeto = createRequire(path.join(raiz, 'package.json'));
const deQa = process.env.FICHA_QA_MODULES ? createRequire(path.join(process.env.FICHA_QA_MODULES, 'package.json')) : doProjeto;
const { JSDOM } = deQa('jsdom');
const esbuild = doProjeto('esbuild');

async function executar() {
  const temporario = fs.mkdtempSync(path.join(os.tmpdir(), 'ficha-interacoes-'));
  const saida = path.join(temporario, 'componentes.cjs');
  try {
    await esbuild.build({
      stdin: { contents: `export { ReceitaForm } from './src/components/receitas/ReceitaForm'; export { ReceitasClient } from './src/app/receitas/ReceitasClient'; export { ProducoesClient } from './src/app/producoes/ProducoesClient'; export { FichaProducaoModal } from './src/components/receitas/FichaProducaoModal'; export { ShellPremium } from './src/components/ficha/ShellPremium'; export * as dados from './src/app/preview/fixtures';`, resolveDir: raiz, loader: 'tsx' },
      outfile: saida, bundle: true, platform: 'node', format: 'cjs', jsx: 'automatic', alias: { '@': path.join(raiz, 'src') }, logLevel: 'silent',
      plugins: [{ name: 'acoes-controladas', setup(build) {
        build.onResolve({ filter: /^react(?:-dom)?(?:\/.*)?$/ }, (args) => ({ path: doProjeto.resolve(args.path), external: true }));
        build.onResolve({ filter: /^next\/link$/ }, () => ({ path: 'link', namespace: 'teste' }));
        build.onResolve({ filter: /^next\/navigation$/ }, () => ({ path: 'navigation', namespace: 'teste' }));
        build.onResolve({ filter: /^(?:@\/app\/(receitas|producoes)\/actions|\.\/actions)$/ }, () => ({ path: 'actions', namespace: 'teste' }));
        build.onResolve({ filter: /^@\/lib\/pdf\// }, (args) => ({ path: args.path, external: true }));
        build.onLoad({ filter: /.*/, namespace: 'teste' }, (args) => ({ loader: 'js', contents: args.path === 'link' ? `import {createElement} from 'react'; export const useLinkStatus=()=>({pending:false}); export default function Link({href,onClick,children,...props}) { return createElement('a',{...props,href,onClick:(e)=>{e.preventDefault();globalThis.__fichaDestino=href;onClick?.(e)}},children); }` : args.path === 'navigation' ? `export const usePathname = () => '/preview/producoes';` : `const registrar = async (...args) => { globalThis.__fichaChamadas.push(args); return { ok: true }; }; export const acaoCriarReceita=registrar, acaoAtualizarReceita=registrar, acaoExcluirReceita=registrar, acaoIniciarProducao=registrar, acaoAtualizarStatusProducao=registrar, acaoRegistrarProducao=registrar, acaoNovoFechamento=registrar; export const acaoUploadFotoReceita = async () => ({ok:false,erro:'Upload não é exercitado neste teste.'});` }));
      } }],
    });
    const dom = new JSDOM('<!doctype html><body><button id="origem">Abrir ficha</button><div id="teste"></div></body>', { url: 'https://teste.invalid/preview/producoes', pretendToBeVisual: true });
    for (const nome of ['window', 'document', 'HTMLElement', 'HTMLInputElement', 'HTMLSelectElement', 'HTMLTextAreaElement', 'Event', 'MouseEvent', 'KeyboardEvent', 'StorageEvent']) global[nome] = dom.window[nome];
    Object.defineProperty(global, 'navigator', { configurable: true, value: dom.window.navigator });
    global.localStorage = dom.window.localStorage;
    global.requestAnimationFrame = dom.window.requestAnimationFrame.bind(dom.window);
    global.cancelAnimationFrame = dom.window.cancelAnimationFrame.bind(dom.window);
    global.IS_REACT_ACT_ENVIRONMENT = true;
    global.__fichaChamadas = [];
    const React = doProjeto('react');
    const { act } = React;
    const { createRoot } = doProjeto('react-dom/client');
    const { ReceitaForm, ReceitasClient, ProducoesClient, FichaProducaoModal, ShellPremium, dados } = doProjeto(saida);
    const host = document.getElementById('teste');
    const root = createRoot(host);
    const render = async (componente, props) => {
      await act(async () => root.render(null));
      await act(async () => root.render(React.createElement(componente, props)));
    };
    const rotulo = (el) => el.getAttribute('aria-label') || [...(el.labels ?? [])].map((l) => {
      const proprio = [...l.childNodes].filter((n) => n.nodeType === 3).map((n) => n.textContent).join('').trim();
      return proprio || l.firstElementChild?.textContent?.trim();
    }).join(' ');
    const campo = (nome) => {
      const el = [...host.querySelectorAll('input,select,textarea')].find((e) => rotulo(e) === nome);
      assert(el, `Campo não encontrado: ${nome}`); return el;
    };
    const preencher = async (el, valor) => act(async () => {
      const proto = el.tagName === 'SELECT' ? HTMLSelectElement.prototype : el.tagName === 'TEXTAREA' ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
      Object.getOwnPropertyDescriptor(proto, 'value').set.call(el, valor);
      el.dispatchEvent(new Event(el.tagName === 'SELECT' ? 'change' : 'input', { bubbles: true }));
    });
    const botao = (nome, dentro = host) => {
      const el = [...dentro.querySelectorAll('button')].find((b) => b.textContent.trim() === nome || b.getAttribute('aria-label') === nome);
      assert(el, `Botão não encontrado: ${nome}`); return el;
    };
    const clicar = async (el) => act(async () => { el.focus(); el.click(); });
    const enviar = async () => act(async () => host.querySelector('form').dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })));

    // Cadastro incompleto não salva, mas informa os problemas.
    await render(ReceitaForm, { insumos: dados.insumos, preparos: dados.preparos, onCancel() {}, onSaved() {} });
    await enviar();
    assert.equal(global.__fichaChamadas.length, 0);
    assert(host.textContent.includes('Informe o nome do prato.'));
    assert(host.textContent.includes('Adicione pelo menos um ingrediente'));
    assert.equal(campo('Nome do prato').getAttribute('aria-invalid'), 'true');
    await preencher(campo('Nome do prato'), 'Prato de teste');
    await preencher(campo('Preço de venda (R$)'), '25,90');
    await preencher(campo('Peso líquido'), '1,5');
    await clicar(botao('+ Ingrediente'));
    await enviar();
    assert.equal(global.__fichaChamadas[0][0].precoVenda, 25.9);
    assert.equal(global.__fichaChamadas[0][0].ficha[0].pesoLiquido, 1.5);
    console.log('OK cadastro: validação e decimal com vírgula');

    // Edição de quantidade preserva fotos, etapas e meta individual.
    const receita = { ...dados.receitas[0], fotoUrl: 'https://teste.invalid/prato.jpg', etapas: [{ id: 'etapa-teste', ordem: 1, titulo: 'Montar', texto: 'Conferir o padrão', fotoUrl: 'https://teste.invalid/etapa.jpg' }], modoPreparo: 'Texto geral do preparo.' };
    global.__fichaChamadas = [];
    await render(ReceitaForm, { insumos: dados.insumos, preparos: dados.preparos, receita, onCancel() {}, onSaved() {} });
    const primeiro = receita.ficha[0];
    const nomeItem = primeiro.insumoId ? dados.insumos.find((i) => i.id === primeiro.insumoId).nome : dados.preparos.find((p) => p.id === primeiro.subReceitaId).nomePrato;
    await preencher(campo(`Quantidade de ${nomeItem}`), '');
    await enviar();
    assert.equal(global.__fichaChamadas.length, 0);
    await preencher(campo(`Quantidade de ${nomeItem}`), '2,5');
    await preencher(campo(`Unidade de ${nomeItem}`), 'g');
    await enviar();
    const payload = global.__fichaChamadas[0][1];
    assert.equal(payload.ficha[0].pesoLiquido, 2.5);
    assert.equal(payload.ficha[0].unidade, 'g');
    assert.equal(payload.margemAlvo, receita.margemAlvo);
    assert.equal(payload.fotoUrl, receita.fotoUrl);
    assert.equal(payload.etapas[0].fotoUrl, receita.etapas[0].fotoUrl);
    assert.equal(payload.ficha.length, receita.ficha.length);
    console.log('OK edição: linha editável e preservação de fotos/etapas/meta');

    // Busca/filtros não substituem ficha completa ou PDFs.
    await render(ReceitasClient, { receitas: [receita, ...dados.receitas.slice(1)], insumos: dados.insumos, preparos: dados.preparos, margemAlvoCliente: dados.margemAlvoCliente, processamentos: dados.processamentos, nomeRestaurante: dados.NOME_RESTAURANTE });
    assert.equal(host.querySelectorAll('button[aria-expanded]').length, dados.receitas.length);
    assert(botao('PDF de custos')); assert(botao('PDF operacional')); assert(botao('Ver ficha de produção'));
    await preencher(campo('Buscar prato ou categoria'), 'camarao');
    assert.equal(host.querySelectorAll('button[aria-expanded]').length, 1);
    assert(host.textContent.includes('Risoto de Camarão'));
    await preencher(campo('Buscar prato ou categoria'), '');
    await clicar(campo('Abaixo da meta'));
    assert.equal(host.querySelectorAll('button[aria-expanded]').length, 1);
    await preencher(campo('Categoria'), 'Pizzas');
    assert(host.textContent.includes('Nenhum prato corresponde aos filtros.'));
    await clicar(botao('Limpar filtros'));
    assert.equal(host.querySelectorAll('button[aria-expanded]').length, dados.receitas.length);
    await clicar(botao('Editar'));
    assert.equal(campo('Buscar prato ou categoria').disabled, true);
    console.log('OK receitas: busca, filtros combinados, limpeza e rascunho protegido');

    // Kanban: filtro não muda o turno de registro nem apaga lotes.
    localStorage.clear();
    await render(ProducoesClient, { insumos: dados.insumos, receitas: dados.todasReceitas, producoes: dados.producoes, turnos: dados.turnos, processamentos: dados.processamentos, isDemo: true });
    assert.equal(host.querySelectorAll('[data-coluna]').length, 4);
    const turnoRegistro = dados.turnos.at(-1).id;
    await preencher(campo('Turno do registro'), turnoRegistro);
    await preencher(campo('Filtrar por responsável'), dados.producoes[0].responsavel);
    assert.equal(campo('Turno do registro').value, turnoRegistro);
    await preencher(campo('Filtrar por turno'), 'sem-turno');
    assert(host.textContent.includes('Nenhum resultado com estes filtros'));
    await clicar(botao('Limpar filtros'));
    await clicar(botao('Iniciar produção'));
    let producoes = JSON.parse(localStorage.getItem('demo_producoes'));
    assert.equal(producoes.length, dados.producoes.length + 1);
    const novo = producoes.find((p) => p.id.startsWith('demo-'));
    assert.equal(novo.turnoId, turnoRegistro);
    const estoqueAposInicio = localStorage.getItem('demo_estoque');
    assert(estoqueAposInicio);
    await preencher(campo('Buscar no quadro'), novo.nomeReceita);
    const card = (coluna) => [...host.querySelector(`[data-coluna="${coluna}"]`).lastElementChild.children].find((e) => e.textContent.includes(novo.lote));
    await clicar(botao('Concluir', card('em_producao')));
    assert.equal(JSON.parse(localStorage.getItem('demo_producoes')).find((p) => p.id === novo.id).status, 'produzido');
    assert.equal(localStorage.getItem('demo_estoque'), estoqueAposInicio, 'Concluir não pode baixar estoque duas vezes');
    await clicar(botao('Registrar perda', card('produzido')));
    const perda = host.querySelector('[role="dialog"]');
    await preencher(perda.querySelector('textarea'), 'Queimou no teste');
    await clicar(botao('Registrar perda', perda));
    const perdido = JSON.parse(localStorage.getItem('demo_producoes')).find((p) => p.id === novo.id);
    assert.equal(perdido.status, 'perda'); assert.equal(perdido.motivoPerda, 'Queimou no teste');
    assert.equal(localStorage.getItem('demo_estoque'), estoqueAposInicio);
    console.log('OK kanban: quatro etapas, filtros, turno, início/conclusão/perda e baixa única');

    // Hub: preferência reversível, busca por seção e permissões reais do menu.
    const shellProps = { prefixoRotas: '/preview', papel: 'dono', nomeRestaurante: 'Teste', tituloPagina: 'Receitas e fichas', acaoRodape: { rotulo: 'Sair do teste', icone: null, onClick() {} }, children: React.createElement('p', null, 'Conteúdo da seção') };
    await render(ShellPremium, shellProps);
    await clicar(botao('Recolher menu lateral'));
    assert.equal(localStorage.getItem('ft:hub-lateral:v1:/preview'), '1');
    assert.equal(botao('Expandir menu lateral').getAttribute('aria-expanded'), 'false');
    await render(ShellPremium, shellProps);
    assert.equal(botao('Expandir menu lateral').getAttribute('aria-expanded'), 'false', 'Preferência mantida ao remontar');
    await clicar(botao('Expandir menu lateral'));
    assert.equal(localStorage.getItem('ft:hub-lateral:v1:/preview'), '0');
    const abrirBusca = botao('Buscar seção');
    await clicar(abrirBusca);
    let dialogoBusca = document.querySelector('[role="dialog"]');
    const inputBusca = dialogoBusca.querySelector('input');
    assert(document.activeElement === inputBusca, 'Busca recebe foco inicial');
    assert.equal(host.inert, true, 'Fundo fica inerte');
    await preencher(inputBusca, 'producoes');
    assert.equal(dialogoBusca.querySelectorAll('a').length, 1);
    assert.equal(dialogoBusca.querySelector('a').getAttribute('href'), '/preview/producoes');
    const fecharBusca = botao('Fechar busca', dialogoBusca);
    fecharBusca.focus();
    await act(async () => fecharBusca.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', shiftKey: true, bubbles: true, cancelable: true })));
    assert(document.activeElement === dialogoBusca.querySelector('a'), 'Shift+Tab fica dentro da busca');
    await act(async () => document.activeElement.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', bubbles: true, cancelable: true })));
    assert(document.activeElement === fecharBusca, 'Tab volta ao primeiro controle');
    inputBusca.focus();
    await act(async () => inputBusca.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true, cancelable: true })));
    assert(document.activeElement === dialogoBusca.querySelector('a'), 'Seta seleciona o resultado');
    inputBusca.focus();
    await act(async () => inputBusca.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true })));
    assert.equal(global.__fichaDestino, '/preview/producoes');
    assert.equal(document.querySelector('[role="dialog"]'), null);
    assert.equal(host.inert, undefined); // jsdom: restaurado ao valor anterior, sem simular layout.
    assert(document.activeElement === abrirBusca, 'Retorno ao botão de busca');
    await act(async () => window.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', ctrlKey: true, bubbles: true, cancelable: true })));
    dialogoBusca = document.querySelector('[role="dialog"]');
    await preencher(dialogoBusca.querySelector('input'), 'zzzzzz');
    assert(dialogoBusca.textContent.includes('Nenhuma seção encontrada'));
    await act(async () => dialogoBusca.querySelector('input').dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true })));
    assert.equal(document.querySelector('[role="dialog"]'), null);
    assert.equal(document.body.style.overflow, '');
    await render(ShellPremium, { ...shellProps, papel: 'estoquista' });
    await clicar(botao('Buscar seção'));
    dialogoBusca = document.querySelector('[role="dialog"]');
    assert.equal(dialogoBusca.querySelectorAll('a').length, 5);
    assert(!dialogoBusca.textContent.includes('Equipe e acessos'));
    assert(!dialogoBusca.textContent.includes('Receitas e fichas'));
    await clicar(botao('Fechar busca', dialogoBusca));
    await render(ShellPremium, { ...shellProps, prefixoRotas: '' });
    await clicar(botao('Buscar seção'));
    dialogoBusca = document.querySelector('[role="dialog"]');
    assert(dialogoBusca.querySelector('a[href="/receitas"]'), 'App não usa prefixo de demo');
    await clicar(botao('Fechar busca', dialogoBusca));
    console.log('OK hub: persistência, busca, atalhos, foco, rotas e permissões');

    // Modal sob o conteúdo animado: portal na janela, fotos, Escape e foco.
    await act(async () => root.render(null));
    const origem = document.getElementById('origem'); origem.focus();
    let fechou = 0;
    host.style.transform = 'translateY(0)';
    await act(async () => root.render(React.createElement(ShellPremium, { ...shellProps, children: React.createElement(FichaProducaoModal, { receita, insumos: dados.insumos, todasReceitas: dados.todasReceitas, onClose: () => { fechou++; root.render(null); } }) })));
    const ficha = document.querySelector('[aria-label="Fechar ficha de produção"]').closest('[role="dialog"]');
    assert.equal(ficha.parentElement.parentElement, document.body, 'Modal fora do ancestral transformado');
    assert.equal(host.contains(ficha), false);
    assert.equal(ficha.querySelectorAll('img').length, 2);
    assert(ficha.textContent.includes('Texto geral do preparo.'));
    assert(ficha.textContent.includes('Ingredientes'));
    assert(document.activeElement === botao('Fechar ficha de produção', ficha), 'Foco inicial no fechar');
    assert.equal(document.body.style.overflow, 'hidden');
    assert(!ficha.textContent.includes('R$'), 'Ficha operacional não apresenta custos');
    await act(async () => window.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', ctrlKey: true, bubbles: true, cancelable: true })));
    assert.equal(document.querySelectorAll('[role="dialog"]').length, 1, 'Busca não abre sobre a ficha');
    await act(async () => window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', shiftKey: true, bubbles: true, cancelable: true })));
    assert(document.activeElement === botao('Ampliar foto', ficha), 'Shift+Tab fica dentro da ficha');
    await act(async () => window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', bubbles: true, cancelable: true })));
    assert(document.activeElement === botao('Fechar ficha de produção', ficha), 'Tab fica dentro da ficha');
    await clicar(botao('Ampliar foto', ficha));
    const foto = document.querySelector('[aria-label="Fechar visualização ampliada"]').closest('[role="dialog"]');
    assert.equal(foto.parentElement, document.body, 'Foto ampliada também fora da página');
    assert(document.activeElement === botao('Fechar visualização ampliada', foto), 'Foco no fechar da foto');
    await act(async () => window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })));
    assert.equal(fechou, 0);
    assert(document.activeElement === botao('Ampliar foto', ficha), 'Retorno ao botão que ampliou');
    await act(async () => window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })));
    assert.equal(fechou, 1); assert(document.activeElement === origem, 'Retorno ao botão que abriu a ficha'); assert.equal(document.body.style.overflow, '');
    await act(async () => root.unmount());
    dom.window.close();
    console.log('OK ficha de produção: fotos, texto, foco, Escape e rolagem');
  } finally { fs.rmSync(temporario, { recursive: true, force: true }); }
}
executar().catch((erro) => { console.error(erro); process.exitCode = 1; });
