/**
 * Card de contribuições: total histórico, sequência em curso e recorde.
 * Substitui o github-readme-streak-stats.
 */
import { LARGURA, card, esc, atraso } from '../tema.mjs';
import { textos, formatarNumero, formatarDataCompleta, formatarDataCurta, formatarIntervalo } from '../i18n.mjs';

const ALTURA = 168;
const COLUNAS = 3;
const LARGURA_COLUNA = LARGURA / COLUNAS;

/*
 * Tamanho por ícone, para a chama (sequência atual) dominar o centro do card.
 *
 * Os números parecem arbitrários porque são normalizados pela TINTA do glifo,
 * não pela caixa de 960. Cada símbolo do Material preenche a caixa de um jeito:
 * add_box cobre 75%, local_fire_department só 67% e kid_star 83%. Igualar os
 * valores nominais faria a estrela parecer a maior das três.
 *
 * Tamanho visual resultante: 31,5px / 38,0px / 31,7px.
 * Ao trocar um ícone, remeça a tinta com getBBox() em vez de reaproveitar o número.
 */
const TAMANHO_ICONE_PADRAO = 48;
const TAMANHOS_ICONE = { caixa: 42, chama: 55, estrela: 39 };
const Y_ICONE_TOPO = 20;
const Y_ICONE_BASE = Y_ICONE_TOPO + TAMANHO_ICONE_PADRAO; // base comum: ícones menores ficam alinhados pelo pé, não pelo topo
const Y_NUMERO = 102;
const Y_ROTULO = 124;
const Y_LEGENDA = 143;

/*
 * Ícones do Material Symbols Rounded (FILL 1, wght 400, opsz 24), sob licença
 * Apache 2.0, com a geometria embutida aqui.
 *
 * Deliberadamente NÃO se carrega a folha de estilo do Google Fonts: ela seria
 * uma dependência externa em tempo de exibição — exatamente o que este projeto
 * existe para eliminar — e o validar.mjs reprovaria o card por URL externa.
 *
 * O Material Symbols desenha num sistema de coordenadas 0 -960 960 960, com o
 * eixo Y crescendo para cima a partir da linha de base. Por isso o
 * posicionamento abaixo translada para a BASE do ícone, não para o topo.
 */
const VIEWBOX_MATERIAL = 960;

const ICONES = {
  caixa:
    'M440-440v120q0 17 11.5 28.5T480-280q17 0 28.5-11.5T520-320v-120h120q17 0 28.5-11.5T680-480q0-17-11.5-28.5T640-520H520v-120q0-17-11.5-28.5T480-680q-17 0-28.5 11.5T440-640v120H320q-17 0-28.5 11.5T280-480q0 17 11.5 28.5T320-440h120ZM200-120q-33 0-56.5-23.5T120-200v-560q0-33 23.5-56.5T200-840h560q33 0 56.5 23.5T840-760v560q0 33-23.5 56.5T760-120H200Z',
  chama:
    'M160-400q0-113 67-217t184-182q22-15 45.5-1.5T480-760v52q0 34 23.5 57t57.5 23q17 0 32.5-7.5T621-657q8-10 20.5-12.5T665-664q63 45 99 115t36 149q0 88-43 160.5T644-125q17-24 26.5-52.5T680-238q0-40-15-75.5T622-377L480-516 339-377q-29 29-44 64t-15 75q0 32 9.5 60.5T316-125q-70-42-113-114.5T160-400Zm320-4 85 83q17 17 26 38t9 45q0 49-35 83.5T480-120q-50 0-85-34.5T360-238q0-23 9-44.5t26-38.5l85-83Z',
  estrela:
    'm305-704 112-145q12-16 28.5-23.5T480-880q18 0 34.5 7.5T543-849l112 145 170 57q26 8 41 29.5t15 47.5q0 12-3.5 24T866-523L756-367l4 164q1 35-23 59t-56 24q-2 0-22-3l-179-50-179 50q-5 2-11 2.5t-11 .5q-32 0-56-24t-23-59l4-165L95-523q-8-11-11.5-23T80-570q0-25 14.5-46.5T135-647l170-57Z',
};

function icone(nome, centroX, cor, indice) {
  const tamanho = TAMANHOS_ICONE[nome] ?? TAMANHO_ICONE_PADRAO;
  const escala = tamanho / VIEWBOX_MATERIAL;
  const x = centroX - tamanho / 2;
  // O transform de posicionamento fica no grupo externo e a animação no
  // interno: em SVG, um transform vindo do CSS sobrescreveria o atributo.
  return (
    `    <g transform="translate(${x} ${Y_ICONE_BASE}) scale(${escala})" fill="${cor}">` +
    `<g class="anim" style="${atraso(indice)}"><path d="${ICONES[nome]}"/></g></g>`
  );
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
      nomeIcone: 'caixa',
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
        `    <line x1="${LARGURA_COLUNA * i}" y1="24" x2="${LARGURA_COLUNA * i}" y2="${ALTURA - 24}" stroke="var(--borda)" stroke-width="1"/>`,
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
