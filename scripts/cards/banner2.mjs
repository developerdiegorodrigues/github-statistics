/**
 * Banner alternativo, sem texto: padrão "smart-termite" do app.
 *
 * Reproduz a geometria de `assets/referencia/banner-smart-termite.svg` — capa
 * de 600x150 com cantos inferiores 14.4/9.6 e avatar de 200px com anel de 10px
 * centrado em (300,155), as mesmas medidas em px do app com root de 16px.
 *
 * Duas diferenças em relação ao original:
 *
 * 1. O avatar vai EMBUTIDO. O original aponta para `/assets/avatar/...`, um
 *    caminho relativo que nunca resolve quando o SVG é usado como <img src>,
 *    que é exatamente como o GitHub renderiza imagem de README.
 * 2. Só `href`, sem o `xlink:href` gêmeo. Duplicar o atributo duplicaria o
 *    data URI e somaria ~27 KB ao arquivo sem ganho: todo navegador atual lê
 *    `href` em <image>, e o alvo aqui é o navegador de quem abre o perfil.
 *
 * Ajustes sobre o original: a capa ganhou raio também nos cantos superiores
 * (9.6 à esquerda, 14.4 à direita, espelhando o raio de cada lado) e a entrada
 * do avatar passou a ser o flip-in-ver-right do Animista.
 *
 * Este é o único SVG do projeto que não passa pelo card() do tema: ele carrega
 * o sistema visual do app (tokens nl-*, paleta própria), e convertê-lo para os
 * tokens daqui descaracterizaria o que se pediu para preservar. Por isso também
 * não acompanha o tema claro do GitHub — é escuro nos dois.
 */
import { embutir } from '../imagem.mjs';

const LARGURA = 600;
const ALTURA = 270;

/*
 * Arredonda para 4 casas. As medidas derivam de fatores percentuais
 * encadeados, e sem isso a cauda binária vaza para o SVG publicado
 * (103.27499999999999 em vez de 103.275). 4 casas sobram para coordenadas.
 */
const n = (v) => Number(v.toFixed(4));

/*
 * Altura da capa — o "quadro principal". Era 150 (a medida do app), e vem
 * sendo reduzida por fatores sucessivos sobre o valor corrente:
 * -10%, -10%, -15%, -15%  =>  150 * 0.9 * 0.9 * 0.85 * 0.85 = 87.7838.
 *
 * Três coisas derivam dela e precisam acompanhar, senão o padrão de fundo
 * descola da capa: o ladrilho do brilho (200% x 200% da capa), a vinheta (no
 * tamanho exato da capa) e o path de recorte com os cantos arredondados.
 * Por isso tudo abaixo é calculado, não escrito à mão.
 */
const ALTURA_CAPA = n(150 * 0.9 * 0.9 * 0.85 * 0.85);

const RAIO_ESQ = 9.6;
const RAIO_DIR = 14.4;

/** Capa com os quatro cantos arredondados, no sentido horário a partir do topo. */
const CAPA_PATH = [
  `M${RAIO_ESQ} 0`,
  `H${LARGURA - RAIO_DIR}`,
  `A${RAIO_DIR} ${RAIO_DIR} 0 0 1 ${LARGURA} ${RAIO_DIR}`,
  `V${n(ALTURA_CAPA - RAIO_DIR)}`,
  `A${RAIO_DIR} ${RAIO_DIR} 0 0 1 ${LARGURA - RAIO_DIR} ${ALTURA_CAPA}`,
  `H${RAIO_ESQ}`,
  `A${RAIO_ESQ} ${RAIO_ESQ} 0 0 1 0 ${n(ALTURA_CAPA - RAIO_ESQ)}`,
  `V${RAIO_ESQ}`,
  `A${RAIO_ESQ} ${RAIO_ESQ} 0 0 1 ${RAIO_ESQ} 0`,
  'Z',
].join(' ');

/** Brilho: ladrilho de 200% x 200% da capa; o raio vai até o canto mais distante. */
const BRILHO_W = LARGURA * 2;
const BRILHO_H = n(ALTURA_CAPA * 2);
const BRILHO_R = n(Math.hypot(BRILHO_W / 2, BRILHO_H / 2));

/** Vinheta: no tamanho exato da capa, mesma regra de raio. */
const VINHETA_CY = n(ALTURA_CAPA / 2);
const VINHETA_R = n(Math.hypot(LARGURA / 2, ALTURA_CAPA / 2));

const AVATAR = 'assets/avatar2_x300.webp';

/*
 * Geometria do avatar. O original do app usava anel de raio 100 e foto de 180px;
 * ESCALA reduz o conjunto mantendo o centro, que continua straddling a borda
 * inferior da capa.
 */
const ESCALA = 0.6;
/** Cor do anel do avatar. */
const COR_ANEL = '#0d1117';
/*
 * Tom escuro do padrão de fundo (brilho, vinheta e malha). No app era #202020;
 * aqui usa o fundo escuro do GitHub, para o banner se fundir com a página.
 */
const COR_PADRAO = '#0d1117';
const AVATAR_CX = LARGURA / 2;
/** O centro fica 5 abaixo da borda da capa, como no original (150 -> 155). */
const AVATAR_CY = n(ALTURA_CAPA + 5);
const ANEL_R = 100 * ESCALA;
const FOTO_R = 90 * ESCALA;
const FOTO_D = FOTO_R * 2;

/*
 * Escala da malha hexagonal do fundo.
 *
 * No app o ladrilho de 12px fica sobre uma capa de ~1250px, o que dá ~100 anéis
 * na largura. Aqui a capa tem 600 unidades, então o mesmo ladrilho de 12 rende
 * ~50 anéis — metade da densidade da referência.
 *
 * Reduzir só o raio dos círculos (tentativa anterior) deixa os anéis menores e
 * MAIS espaçados, porque o ladrilho não muda: é o oposto do efeito desejado.
 * Para aproximar a densidade do app, o ladrilho inteiro precisa encolher —
 * posições, raio e traço juntos.
 */
const MALHA_ESCALA = n(0.5 * 1.1 * 1.2);
const MALHA_W = n(12 * MALHA_ESCALA);
const MALHA_H = n(20.7846097 * MALHA_ESCALA);
const MALHA_R = n(5.5 * MALHA_ESCALA);
const MALHA_TRACO = n(1 * MALHA_ESCALA);

const CSS = `
      .nl-profile-banner {
        --nl-profile-banner-accent: #B14914;
        --nl-profile-banner-avatar-ring: ${COR_ANEL};
        --nl-smart-termite-shift-duration: 80s;
        --nl-smart-termite-filter-duration: 12s;
        --nl-profile-banner-avatar-duration: 500ms;
      }

      .nl-profile-banner__accent-stop { stop-color: var(--nl-profile-banner-accent); }
      .nl-profile-banner__ring { fill: var(--nl-profile-banner-avatar-ring); }

      .nl-profile-banner__glow-x {
        animation: nl-profile-banner-glow-x linear infinite;
        animation-duration: calc(var(--nl-smart-termite-shift-duration) / 5);
      }

      .nl-profile-banner__glow-y {
        animation: nl-profile-banner-glow-y linear infinite;
        animation-duration: calc(var(--nl-smart-termite-shift-duration) / 2);
      }

      .nl-profile-banner__glow-hue {
        animation: nl-profile-banner-hue linear infinite;
        animation-duration: var(--nl-smart-termite-filter-duration);
      }

      .nl-profile-banner__avatar {
        transform-box: view-box;
        transform-origin: ${AVATAR_CX}px ${AVATAR_CY}px;
        animation: nl-profile-banner-avatar-in var(--nl-profile-banner-avatar-duration)
          cubic-bezier(0.250, 0.460, 0.450, 0.940) both;
      }

      @keyframes nl-profile-banner-glow-x {
        from { transform: translateX(0); }
        to   { transform: translateX(${BRILHO_W}px); }
      }

      @keyframes nl-profile-banner-glow-y {
        from { transform: translateY(0); }
        to   { transform: translateY(-${BRILHO_H}px); }
      }

      @keyframes nl-profile-banner-hue {
        from { filter: hue-rotate(0deg); }
        to   { filter: hue-rotate(360deg); }
      }

      @keyframes nl-profile-banner-avatar-in {
        from { opacity: 0; transform: perspective(400px) rotateY(-80deg); }
        to   { opacity: 1; transform: perspective(400px) rotateY(0deg); }
      }

      @media (prefers-reduced-motion: reduce) {
        .nl-profile-banner__glow-x,
        .nl-profile-banner__glow-y,
        .nl-profile-banner__glow-hue,
        .nl-profile-banner__avatar {
          animation: none;
        }
      }
`;

export default function renderizar() {
  const avatar = embutir(AVATAR);

  return `<svg xmlns="http://www.w3.org/2000/svg" class="nl-profile-banner" width="${LARGURA}" height="${ALTURA}" viewBox="0 0 ${LARGURA} ${ALTURA}" role="img" aria-labelledby="titulo desc">
  <title id="titulo">Banner de perfil</title>
  <desc id="desc">Foto de perfil de Diego Rodrigues sobre uma capa com padrão animado.</desc>
  <defs>
    <style>${CSS}    </style>

    <clipPath id="nl-profile-banner-cover-clip">
      <path d="${CAPA_PATH}"/>
    </clipPath>

    <clipPath id="nl-profile-banner-avatar-clip">
      <circle cx="${AVATAR_CX}" cy="${AVATAR_CY}" r="${FOTO_R}"/>
    </clipPath>

    <radialGradient id="nl-profile-banner-glow-gradient" gradientUnits="userSpaceOnUse" cx="${n(BRILHO_W / 2)}" cy="${n(BRILHO_H / 2)}" r="${BRILHO_R}">
      <stop offset="0" class="nl-profile-banner__accent-stop" stop-color="#B14914"/>
      <stop offset="0.6" stop-color="${COR_PADRAO}"/>
      <stop offset="1" stop-color="${COR_PADRAO}"/>
    </radialGradient>

    <pattern id="nl-profile-banner-glow" patternUnits="userSpaceOnUse" width="${BRILHO_W}" height="${BRILHO_H}">
      <rect width="${BRILHO_W}" height="${BRILHO_H}" fill="url(#nl-profile-banner-glow-gradient)"/>
    </pattern>

    <radialGradient id="nl-profile-banner-vignette" gradientUnits="userSpaceOnUse" cx="${LARGURA / 2}" cy="${VINHETA_CY}" r="${VINHETA_R}">
      <stop offset="0" stop-color="${COR_PADRAO}" stop-opacity="0"/>
      <stop offset="0.3" stop-color="${COR_PADRAO}" stop-opacity="0"/>
      <stop offset="0.9" stop-color="${COR_PADRAO}" stop-opacity="1"/>
      <stop offset="1" stop-color="${COR_PADRAO}" stop-opacity="1"/>
    </radialGradient>

    <pattern id="nl-profile-banner-mesh" patternUnits="userSpaceOnUse" width="${MALHA_W}" height="${MALHA_H}">
      <g fill="none" stroke="${COR_PADRAO}" stroke-width="${MALHA_TRACO}">
        <circle cx="${n(MALHA_W / 2)}" cy="${n(MALHA_H / 2)}" r="${MALHA_R}"/>
        <circle cx="0" cy="0" r="${MALHA_R}"/>
        <circle cx="${MALHA_W}" cy="0" r="${MALHA_R}"/>
        <circle cx="0" cy="${MALHA_H}" r="${MALHA_R}"/>
        <circle cx="${MALHA_W}" cy="${MALHA_H}" r="${MALHA_R}"/>
      </g>
    </pattern>
  </defs>

  <g clip-path="url(#nl-profile-banner-cover-clip)">
    <rect width="${LARGURA}" height="${ALTURA_CAPA}" fill="#101010"/>

    <g class="nl-profile-banner__glow-hue">
      <g class="nl-profile-banner__glow-x">
        <g class="nl-profile-banner__glow-y">
          <rect x="${-BRILHO_W}" y="${n(-BRILHO_H)}" width="${BRILHO_W * 2}" height="${n(BRILHO_H * 3)}" fill="url(#nl-profile-banner-glow)"/>
        </g>
      </g>
    </g>

    <rect width="${LARGURA}" height="${ALTURA_CAPA}" fill="url(#nl-profile-banner-vignette)"/>
    <rect width="${LARGURA}" height="${ALTURA_CAPA}" fill="url(#nl-profile-banner-mesh)"/>
  </g>

  <g class="nl-profile-banner__avatar">
    <circle class="nl-profile-banner__ring" cx="${AVATAR_CX}" cy="${AVATAR_CY}" r="${ANEL_R}" fill="${COR_ANEL}"/>
    <image x="${n(AVATAR_CX - FOTO_R)}" y="${n(AVATAR_CY - FOTO_R)}" width="${FOTO_D}" height="${FOTO_D}" preserveAspectRatio="xMidYMid slice" clip-path="url(#nl-profile-banner-avatar-clip)" href="${avatar}"/>
  </g>
</svg>
`;
}
