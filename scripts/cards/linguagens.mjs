/**
 * Card de linguagens: barra empilhada + legenda em duas colunas.
 * Substitui o github-readme-stats/top-langs.
 */
import { LARGURA, PADDING, card, esc, truncar, atraso } from '../tema.mjs';
import { textos, formatarPercentual } from '../i18n.mjs';
import { config } from '../config.mjs';

const LARGURA_BARRA = LARGURA - PADDING * 2;
const Y_TITULO = 34;
const Y_BARRA = 48;
const ALTURA_BARRA = 12;
const Y_LEGENDA = 88;
const PASSO_LINHA = 24;
const COL_X = [PADDING, 252];
const LARGURA_COL = 196;

/** Agrupa a cauda longa em "Outras" para a legenda não virar uma lista. */
function agrupar(todas) {
  const principais = todas.slice(0, config.topLinguagens);
  const resto = todas.slice(config.topLinguagens);
  if (resto.length === 0) return principais;

  return [
    ...principais,
    {
      nome: textos.linguagens.outras,
      percentual: resto.reduce((a, l) => a + l.percentual, 0),
      cor: 'var(--textofraco)',
    },
  ];
}

/**
 * Segmentos da barra. A largura é acumulada em ponto flutuante e só
 * arredondada na hora de desenhar, senão os erros somam e sobra uma fresta
 * no fim da barra.
 */
function segmentos(itens) {
  let x = 0;
  return itens
    .map((item, i) => {
      const inicio = x;
      x += (item.percentual / 100) * LARGURA_BARRA;
      const largura = (i === itens.length - 1 ? LARGURA_BARRA : x) - inicio;
      return `      <rect x="${inicio.toFixed(2)}" y="0" width="${Math.max(largura, 0).toFixed(2)}" height="${ALTURA_BARRA}" fill="${item.cor}"/>`;
    })
    .join('\n');
}

function legenda(itens) {
  const linhas = Math.ceil(itens.length / COL_X.length);

  return itens
    .map((item, i) => {
      // Preenchimento por coluna: a ordem de leitura acompanha o ranking.
      const coluna = Math.floor(i / linhas);
      const linha = i % linhas;
      const x = COL_X[coluna];
      const y = Y_LEGENDA + linha * PASSO_LINHA;
      const nome = truncar(item.nome, 12, LARGURA_COL - 70);

      return (
        `    <g class="anim" style="${atraso(i, 0.35, 0.06)}">\n` +
        `      <circle cx="${x + 4}" cy="${y - 4}" r="4.5" fill="${item.cor}"/>\n` +
        `      <text class="item" x="${x + 17}" y="${y}">${esc(nome)}</text>\n` +
        `      <text class="legenda" x="${x + LARGURA_COL}" y="${y}" text-anchor="end">${esc(formatarPercentual(item.percentual))}</text>\n` +
        `    </g>`
      );
    })
    .join('\n');
}

export default function renderizar(dados) {
  const t = textos.linguagens;
  const itens = agrupar(dados.todas);

  if (itens.length === 0) throw new Error(t.vazio);

  const linhas = Math.ceil(itens.length / COL_X.length);
  const altura = Y_LEGENDA + (linhas - 1) * PASSO_LINHA + 22;

  const descricao = itens
    .map((l) => `${l.nome} ${formatarPercentual(l.percentual)}`)
    .join(', ');

  const conteudo = [
    `    <text class="titulo anim" style="${atraso(0)}" x="${PADDING}" y="${Y_TITULO}">${esc(t.titulo)}</text>`,
    `    <g transform="translate(${PADDING} ${Y_BARRA})" clip-path="url(#recorte-barra)">`,
    `      <g class="cresce" style="${atraso(1, 0.15, 0)}">`,
    segmentos(itens),
    '      </g>',
    '    </g>',
    legenda(itens),
  ].join('\n');

  return card({
    altura,
    titulo: t.titulo,
    descricao: `Linguagens mais usadas: ${descricao}.`,
    cssExtra: '',
    conteudo:
      `    <defs><clipPath id="recorte-barra">` +
      `<rect x="0" y="0" width="${LARGURA_BARRA}" height="${ALTURA_BARRA}" rx="${ALTURA_BARRA / 2}"/>` +
      `</clipPath></defs>\n${conteudo}`,
  });
}
