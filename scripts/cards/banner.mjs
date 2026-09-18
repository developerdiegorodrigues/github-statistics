/**
 * Banner do topo do perfil.
 *
 * Diferente dos outros três: não consome dados/*.json — é estático — e foge
 * dos 480px, porque a intenção é ocupar 100% da largura do README.
 *
 * O avatar vai EMBUTIDO como data URI, e isso não é preferência: um SVG
 * carregado via <img> roda em modo estático seguro, e o navegador bloqueia
 * qualquer recurso externo. Um <image href="https://..."> simplesmente não
 * apareceria no perfil. Embutir é o que faz funcionar — e de quebra mantém a
 * regra de zero dependência externa que o projeto inteiro segue.
 */
import { card, esc, atraso } from '../tema.mjs';
import { embutir } from '../imagem.mjs';
import { textos } from '../i18n.mjs';

const LARGURA = 1200;
const ALTURA = 300;

const AVATAR = 'assets/avatar_x300.webp';
const AVATAR_CX = 178;
const AVATAR_CY = ALTURA / 2;
const AVATAR_R = 96;

const TEXTO_X = 330;

/*
 * Animações próprias do banner. As do tema cobrem entrada (fade escalonado);
 * aqui entram as contínuas: o brilho que atravessa o fundo, o anel girando em
 * volta do avatar e o cursor piscando.
 *
 * Nenhuma delas encosta em `transform` de elemento posicionado por atributo —
 * em SVG o transform do CSS sobrescreve o atributo, e o elemento salta para a
 * origem. Por isso cada uma anima um grupo interno dedicado.
 */
const CSS = `
    .b-nome   { font-size: 54px; font-weight: 700; fill: var(--texto); font-family: 'Cascadia Code', 'Fira Code', Consolas, 'Courier New', monospace; }
    .b-sinal  { fill: var(--destaque); }
    .b-papel  { font-size: 27px; font-weight: 600; fill: var(--texto); }
    .b-stacks { font-size: 18px; font-weight: 400; fill: var(--textofraco); letter-spacing: 0.02em; }

    @keyframes brilho  { from { transform: translateX(-${LARGURA}px); } to { transform: translateX(${LARGURA}px); } }
    @keyframes girar   { from { transform: rotate(0deg); }             to { transform: rotate(360deg); } }
    @keyframes piscar  { 0%, 45% { opacity: 1; } 55%, 100% { opacity: 0; } }

    .b-brilho { animation: brilho 7s ease-in-out infinite; }
    .b-anel   { transform-origin: ${AVATAR_CX}px ${AVATAR_CY}px; animation: girar 18s linear infinite; }
    .b-cursor { animation: piscar 1.1s steps(1, end) infinite; }

    @media (prefers-reduced-motion: reduce) {
      .b-brilho { animation: none; opacity: 0; }
      .b-anel   { animation: none; }
      .b-cursor { animation: none; }
    }
`;

const DEFS = `  <defs>
    <linearGradient id="g-fundo" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="var(--fundo)"/>
      <stop offset="55%" stop-color="var(--superficie)"/>
      <stop offset="100%" stop-color="var(--fundo)"/>
    </linearGradient>
    <linearGradient id="g-anel" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="var(--destaque)"/>
      <stop offset="50%" stop-color="var(--chama)"/>
      <stop offset="100%" stop-color="var(--sucesso)"/>
    </linearGradient>
    <linearGradient id="g-brilho" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="var(--destaque)" stop-opacity="0"/>
      <stop offset="50%" stop-color="var(--destaque)" stop-opacity="0.14"/>
      <stop offset="100%" stop-color="var(--destaque)" stop-opacity="0"/>
    </linearGradient>
    <clipPath id="c-avatar">
      <circle cx="${AVATAR_CX}" cy="${AVATAR_CY}" r="${AVATAR_R}"/>
    </clipPath>
    <clipPath id="c-cartao">
      <rect x="0" y="0" width="${LARGURA}" height="${ALTURA}" rx="16"/>
    </clipPath>
  </defs>
`;

export default function renderizar() {
  const t = textos.banner;
  const avatar = embutir(AVATAR);
  const d = AVATAR_R * 2;

  const conteudo = `    <g clip-path="url(#c-cartao)">
      <rect width="${LARGURA}" height="${ALTURA}" fill="url(#g-fundo)"/>
      <g class="b-brilho"><rect x="-260" y="0" width="520" height="${ALTURA}" fill="url(#g-brilho)"/></g>
    </g>

    <g class="b-anel">
      <circle cx="${AVATAR_CX}" cy="${AVATAR_CY}" r="${AVATAR_R + 8}" fill="none" stroke="url(#g-anel)" stroke-width="3" stroke-linecap="round" stroke-dasharray="150 40"/>
    </g>
    <g class="anim" style="${atraso(0)}">
      <image href="${avatar}" x="${AVATAR_CX - AVATAR_R}" y="${AVATAR_CY - AVATAR_R}" width="${d}" height="${d}" clip-path="url(#c-avatar)" preserveAspectRatio="xMidYMid slice"/>
    </g>

    <text class="b-nome anim" style="${atraso(1)}" x="${TEXTO_X}" y="140">
      <tspan class="b-sinal">&lt;</tspan> ${esc(t.nome)} <tspan class="b-sinal">/&gt;</tspan><tspan class="b-sinal b-cursor" dx="6">_</tspan>
    </text>
    <text class="b-papel anim" style="${atraso(2)}" x="${TEXTO_X}" y="187">${esc(t.papel)}</text>
    <text class="b-stacks anim" style="${atraso(3)}" x="${TEXTO_X}" y="223">${esc(t.stacks)}</text>`;

  return card({
    largura: LARGURA,
    altura: ALTURA,
    raio: 16,
    titulo: t.alt(t.nome),
    descricao: `${t.nome} — ${t.papel}. ${t.stacks}.`,
    fundo: 'url(#g-fundo)',
    defs: DEFS,
    cssExtra: CSS,
    conteudo,
  });
}
