/**
 * Card de contribuições: total histórico, sequência em curso e recorde.
 * Substitui o github-readme-streak-stats.
 */
import { LARGURA, card, esc, atraso } from '../tema.mjs';
import { textos, formatarNumero, formatarDataCompleta, formatarDataCurta, formatarIntervalo } from '../i18n.mjs';

const ALTURA = 150;
const COLUNAS = 3;
const LARGURA_COLUNA = LARGURA / COLUNAS;

const Y_ICONE = 34;
const Y_NUMERO = 86;
const Y_ROTULO = 108;
const Y_LEGENDA = 127;

/** Ícones em grade 24×24, desenhados aqui para não depender de fonte com emoji. */
const ICONES = {
  // Malha de contribuições
  grade: [2, 9, 16]
    .flatMap((y) => [2, 9, 16].map((x) => `<rect x="${x}" y="${y}" width="6" height="6" rx="1.5"/>`))
    .join(''),
  chama:
    '<path d="M12 2.2c.6 2.9 2.4 4.3 3.9 6.1 1.5 1.8 2.1 3.5 2.1 5.4a6 6 0 1 1-12 0c0-1.1.3-2.2.9-3.1.3 1.2 1.1 2 2.1 2 1.3 0 2.1-1 2.1-2.5 0-1.9-1.2-2.9-1.2-4.8 0-1.2.7-2.4 2.1-3.1z"/>',
  estrela:
    '<path d="M12 2.5l2.9 5.9 6.6.9-4.8 4.6 1.1 6.5-5.8-3-5.8 3 1.1-6.5L2.5 9.3l6.6-.9z"/>',
};

function icone(nome, centroX, cor, indice) {
  const escala = 18 / 24;
  const x = centroX - 9;
  // O `transform` de posicionamento fica no grupo externo e a animação no
  // interno: em SVG, um `transform` vindo do CSS sobrescreveria o atributo.
  return `    <g transform="translate(${x} ${Y_ICONE - 9}) scale(${escala})" fill="${cor}"><g class="anim" style="${atraso(indice)}">${ICONES[nome]}</g></g>`;
}

function coluna({ indice, numero, rotulo, legenda, nomeIcone, corIcone }) {
  const centro = LARGURA_COLUNA * indice + LARGURA_COLUNA / 2;
  const base = indice * 3;
  return [
    icone(nomeIcone, centro, corIcone, base),
    `    <text class="numero anim" style="${atraso(base + 1)}" x="${centro}" y="${Y_NUMERO}" text-anchor="middle">${esc(numero)}</text>`,
    `    <text class="rotulo anim" style="${atraso(base + 1)}" x="${centro}" y="${Y_ROTULO}" text-anchor="middle">${esc(rotulo)}</text>`,
    `    <text class="legenda anim" style="${atraso(base + 2)}" x="${centro}" y="${Y_LEGENDA}" text-anchor="middle">${esc(legenda)}</text>`,
  ].join('\n');
}

export default function renderizar(dados) {
  const t = textos.contribuicoes;

  const legendaAtual = dados.atual.dias > 0 ? formatarDataCurta(dados.atual.inicio) : t.nenhumaSequencia;
  const legendaRecorde = dados.recorde.dias > 0 ? formatarIntervalo(dados.recorde.inicio, dados.recorde.fim) : '—';

  const colunas = [
    {
      indice: 0,
      numero: formatarNumero(dados.total),
      rotulo: t.total,
      legenda: t.desde(formatarDataCompleta(dados.desde)),
      nomeIcone: 'grade',
      corIcone: 'var(--destaque)',
    },
    {
      indice: 1,
      numero: formatarNumero(dados.atual.dias),
      rotulo: t.sequenciaAtual,
      legenda: legendaAtual,
      nomeIcone: 'chama',
      corIcone: 'var(--chama)',
    },
    {
      indice: 2,
      numero: formatarNumero(dados.recorde.dias),
      rotulo: t.sequenciaRecorde,
      legenda: legendaRecorde,
      nomeIcone: 'estrela',
      corIcone: 'var(--sucesso)',
    },
  ].map(coluna);

  const divisorias = [1, 2]
    .map(
      (i) =>
        `    <line x1="${LARGURA_COLUNA * i}" y1="26" x2="${LARGURA_COLUNA * i}" y2="${ALTURA - 26}" stroke="var(--borda)" stroke-width="1"/>`,
    )
    .join('\n');

  const descricao =
    `${formatarNumero(dados.total)} contribuições desde ${formatarDataCompleta(dados.desde)}. ` +
    `Sequência atual de ${t.dia(dados.atual.dias)}. Maior sequência de ${t.dia(dados.recorde.dias)}.`;

  return card({
    altura: ALTURA,
    titulo: t.titulo,
    descricao,
    conteudo: `${divisorias}\n${colunas.join('\n')}`,
  });
}
