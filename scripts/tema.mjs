/**
 * Sistema visual compartilhado pelos três cards: tokens, CSS base e a
 * "casca" do card. Nenhum card define cor ou fonte por conta própria.
 */

export const LARGURA = 480;
export const PADDING = 20;

export const tokens = {
  escuro: {
    fundo: '#0d1117',
    superficie: '#161b22',
    borda: '#30363d',
    texto: '#e6edf3',
    textoFraco: '#8b949e',
    destaque: '#2f81f7',
    chama: '#f0883e',
    sucesso: '#3fb950',
  },
  claro: {
    fundo: '#ffffff',
    superficie: '#f6f8fa',
    borda: '#d1d9e0',
    texto: '#1f2328',
    textoFraco: '#59636e',
    destaque: '#0969da',
    chama: '#bc4c00',
    sucesso: '#1a7f37',
  },
};

const FAMILIA = "'Segoe UI', Ubuntu, -apple-system, BlinkMacSystemFont, Roboto, Helvetica, Arial, sans-serif";

function variaveis(paleta) {
  return Object.entries(paleta)
    .map(([nome, valor]) => `--${nome.toLowerCase()}: ${valor};`)
    .join(' ');
}

const CSS_BASE = `
    svg { ${variaveis(tokens.escuro)} }
    @media (prefers-color-scheme: light) {
      svg { ${variaveis(tokens.claro)} }
    }

    text { font-family: ${FAMILIA}; }
    .titulo      { font-size: 15px; font-weight: 600; fill: var(--texto); }
    .numero      { font-size: 26px; font-weight: 700; fill: var(--texto); }
    .numero-mini { font-size: 13px; font-weight: 600; fill: var(--texto); }
    .rotulo      { font-size: 12px; font-weight: 600; fill: var(--texto); }
    .legenda     { font-size: 11px; font-weight: 400; fill: var(--textofraco); }
    .item        { font-size: 12px; font-weight: 400; fill: var(--texto); }

    @keyframes surgir {
      from { opacity: 0; }
      to   { opacity: 1; }
    }
    @keyframes crescer {
      from { transform: scaleX(0); }
      to   { transform: scaleX(1); }
    }

    /*
     * "backwards" (e nao "forwards") e deliberado: o estado padrao do elemento
     * e visivel, e o fade so e aplicado enquanto a animacao roda. Assim, num
     * renderizador que ignore animacoes, o card aparece montado em vez de vazio.
     * A animacao tambem nao toca em transform, que em SVG sobrescreveria o
     * atributo transform de posicionamento do elemento.
     */
    .anim   { animation: surgir 0.45s ease-out backwards; }
    .cresce { transform-origin: left center; animation: crescer 0.7s cubic-bezier(0.22, 1, 0.36, 1) backwards; }

    /* Quem pediu menos movimento vê o card já montado, sem animação. */
    @media (prefers-reduced-motion: reduce) {
      .anim, .cresce { animation: none; }
    }
`;

/**
 * Tira os comentários do CSS antes de escrever o SVG. Eles explicam decisões
 * para quem mantém o código, e é no código que devem ficar: no arquivo
 * publicado só ocupam bytes.
 *
 * Aplicado apenas ao bloco <style>, nunca ao documento inteiro — o alfabeto
 * base64 de um data URI contém "/", e varrer o SVG todo arriscaria corromper
 * uma imagem embutida.
 */
function semComentarios(css) {
  return css
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/[ \t]+$/gm, '')
    .replace(/\n{3,}/g, '\n\n');
}

/** Escapa texto para inserção segura em conteúdo XML. */
export function esc(valor) {
  return String(valor)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

const LARGURAS = { estreito: 0.28, digito: 0.56, maiuscula: 0.66, largo: 0.92, padrao: 0.53 };

/**
 * Largura aproximada de um texto. SVG estático não mede fonte, então a
 * truncagem precisa de uma estimativa por classe de caractere.
 */
export function larguraEstimada(texto, tamanhoFonte) {
  let unidades = 0;
  for (const c of String(texto)) {
    if ('iIl1.,;:\'"|!ft()[]{}-'.includes(c)) unidades += LARGURAS.estreito;
    else if (c >= '0' && c <= '9') unidades += LARGURAS.digito;
    else if ('MWmw@%'.includes(c)) unidades += LARGURAS.largo;
    else if (c >= 'A' && c <= 'Z') unidades += LARGURAS.maiuscula;
    else unidades += LARGURAS.padrao;
  }
  return unidades * tamanhoFonte;
}

/** Corta o texto com reticências reais até caber em `larguraMax`. */
export function truncar(texto, tamanhoFonte, larguraMax) {
  if (larguraEstimada(texto, tamanhoFonte) <= larguraMax) return texto;
  const reticencias = larguraEstimada('…', tamanhoFonte);
  let corte = '';
  for (const c of String(texto)) {
    if (larguraEstimada(corte + c, tamanhoFonte) + reticencias > larguraMax) break;
    corte += c;
  }
  return `${corte.trimEnd()}…`;
}

/** Atraso escalonado, para os elementos entrarem em cascata. */
export function atraso(indice, base = 0.1, passo = 0.08) {
  return `animation-delay: ${(base + indice * passo).toFixed(2)}s`;
}

/**
 * Monta o SVG completo. Todo card passa por aqui, o que garante mesmas
 * dimensões, mesma borda, mesma acessibilidade e mesmo CSS.
 *
 * `largura` existe para o banner, que é o único a fugir dos 480px dos cards
 * de estatística. `defs` entra antes do fundo, para gradientes e clipPaths.
 */
export function card({
  largura = LARGURA,
  altura,
  raio = 8,
  titulo,
  descricao,
  conteudo,
  cssExtra = '',
  defs = '',
  fundo = 'var(--fundo)',
}) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${largura}" height="${altura}" viewBox="0 0 ${largura} ${altura}" role="img" aria-labelledby="titulo desc">
  <title id="titulo">${esc(titulo)}</title>
  <desc id="desc">${esc(descricao)}</desc>
  <style>${semComentarios(CSS_BASE + cssExtra)}
  </style>
${defs}  <rect x="0.5" y="0.5" width="${largura - 1}" height="${altura - 1}" rx="${raio}" fill="${fundo}" stroke="var(--borda)"/>
${conteudo}
</svg>
`;
}
