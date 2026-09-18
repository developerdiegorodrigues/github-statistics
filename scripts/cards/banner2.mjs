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

const AVATAR = 'assets/avatar_x300.webp';

const CSS = `
      .nl-profile-banner {
        --nl-profile-banner-accent: #B14914;
        --nl-profile-banner-avatar-ring: #3d3d3d;
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
        transform-origin: 300px 155px;
        animation: nl-profile-banner-avatar-in var(--nl-profile-banner-avatar-duration)
          cubic-bezier(0.250, 0.460, 0.450, 0.940) both;
      }

      @keyframes nl-profile-banner-glow-x {
        from { transform: translateX(0); }
        to   { transform: translateX(1200px); }
      }

      @keyframes nl-profile-banner-glow-y {
        from { transform: translateY(0); }
        to   { transform: translateY(-300px); }
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
      <path d="M9.6 0 H585.6 A14.4 14.4 0 0 1 600 14.4 V135.6 A14.4 14.4 0 0 1 585.6 150 H9.6 A9.6 9.6 0 0 1 0 140.4 V9.6 A9.6 9.6 0 0 1 9.6 0 Z"/>
    </clipPath>

    <clipPath id="nl-profile-banner-avatar-clip">
      <circle cx="300" cy="155" r="90"/>
    </clipPath>

    <radialGradient id="nl-profile-banner-glow-gradient" gradientUnits="userSpaceOnUse" cx="600" cy="150" r="618.4658">
      <stop offset="0" class="nl-profile-banner__accent-stop" stop-color="#B14914"/>
      <stop offset="0.6" stop-color="#202020"/>
      <stop offset="1" stop-color="#202020"/>
    </radialGradient>

    <pattern id="nl-profile-banner-glow" patternUnits="userSpaceOnUse" width="1200" height="300">
      <rect width="1200" height="300" fill="url(#nl-profile-banner-glow-gradient)"/>
    </pattern>

    <radialGradient id="nl-profile-banner-vignette" gradientUnits="userSpaceOnUse" cx="300" cy="75" r="309.2329">
      <stop offset="0" stop-color="#202020" stop-opacity="0"/>
      <stop offset="0.3" stop-color="#202020" stop-opacity="0"/>
      <stop offset="0.9" stop-color="#202020" stop-opacity="1"/>
      <stop offset="1" stop-color="#202020" stop-opacity="1"/>
    </radialGradient>

    <pattern id="nl-profile-banner-mesh" patternUnits="userSpaceOnUse" width="12" height="20.7846097">
      <g fill="none" stroke="#202020" stroke-width="1">
        <circle cx="6" cy="10.3923049" r="5.5"/>
        <circle cx="0" cy="0" r="5.5"/>
        <circle cx="12" cy="0" r="5.5"/>
        <circle cx="0" cy="20.7846097" r="5.5"/>
        <circle cx="12" cy="20.7846097" r="5.5"/>
      </g>
    </pattern>
  </defs>

  <g clip-path="url(#nl-profile-banner-cover-clip)">
    <rect width="600" height="150" fill="#101010"/>

    <g class="nl-profile-banner__glow-hue">
      <g class="nl-profile-banner__glow-x">
        <g class="nl-profile-banner__glow-y">
          <rect x="-1200" y="-300" width="2400" height="900" fill="url(#nl-profile-banner-glow)"/>
        </g>
      </g>
    </g>

    <rect width="600" height="150" fill="url(#nl-profile-banner-vignette)"/>
    <rect width="600" height="150" fill="url(#nl-profile-banner-mesh)"/>
  </g>

  <g class="nl-profile-banner__avatar">
    <circle class="nl-profile-banner__ring" cx="300" cy="155" r="100" fill="#3d3d3d"/>
    <image x="210" y="65" width="180" height="180" preserveAspectRatio="xMidYMid slice" clip-path="url(#nl-profile-banner-avatar-clip)" href="${avatar}"/>
  </g>
</svg>
`;
}
