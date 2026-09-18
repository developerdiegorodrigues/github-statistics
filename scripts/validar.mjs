/**
 * Portão de qualidade dos SVGs gerados.
 *
 * Existe por causa do bug da v1: a checagem antiga era `grep -q '<svg'`, e o
 * card de erro do serviço externo — que também é um SVG válido — passava por
 * ela e era commitado por cima da versão boa. Aqui, um card só é aceito se
 * provar que está correto.
 */
import { readFileSync } from 'node:fs';
import { LARGURA } from './tema.mjs';
import { textos } from './i18n.mjs';

const TAMANHO_MAXIMO = 100 * 1024;
const ALTURA_MINIMA = 80;
const ALTURA_MAXIMA = 400;

/** Únicas URLs externas toleradas: os namespaces obrigatórios do formato. */
const NAMESPACES = ['http://www.w3.org/2000/svg', 'http://www.w3.org/1999/xlink'];

/** Sinais de que o conteúdo é um card de erro ou um bug de renderização. */
const PADROES_PROIBIDOS = [
  /failed to/i,
  /unavailable/i,
  /\berror\b/i,
  /not found/i,
  /undefined/,
  /NaN/,
  /\[object Object\]/,
];

/*
 * Os marcadores de título são lidos do i18n, não copiados. Antes eram regex
 * fixas: renomear um card passava na renderização e só quebrava aqui, o que
 * derrubaria o workflow por um motivo que não é um defeito real.
 * Strings são comparadas literalmente; regex, por padrão.
 */
const ESPERADO = {
  // O banner é o único que foge dos 480px: ocupa 100% da largura do README.
  'banner.svg': {
    largura: 1200,
    altura: 300,
    marcadores: [textos.banner.nome, textos.banner.papel, 'data:image/webp;base64,'],
  },
  // Sem texto: os marcadores provam o avatar embutido e a estrutura do padrão.
  'banner_2.svg': {
    largura: 600,
    altura: 270,
    marcadores: ['data:image/webp;base64,', 'nl-profile-banner-mesh', 'nl-profile-banner-avatar-clip'],
  },
  'contribuicoes.svg': { marcadores: [textos.contribuicoes.total, /\d/], dados: 'contribuicoes.json' },
  'linguagens.svg': { marcadores: [textos.linguagens.titulo, /%/, /\d/], dados: 'linguagens.json' },
  'repositorios.svg': { marcadores: [textos.repositorios.titulo, /commit/, /\d/], dados: 'repositorios.json' },
};

/**
 * Verificação de boa-formação sem dependência externa: percorre as tags e
 * confere o balanceamento. O conteúdo cru de <style> é pulado de propósito.
 */
function verificarBoaFormacao(texto) {
  const pilha = [];
  let i = 0;

  while (i < texto.length) {
    const abre = texto.indexOf('<', i);
    if (abre === -1) break;

    if (texto.startsWith('<!--', abre)) {
      const fim = texto.indexOf('-->', abre);
      if (fim === -1) throw new Error('comentário não fechado');
      i = fim + 3;
      continue;
    }
    if (texto.startsWith('<?', abre) || texto.startsWith('<!', abre)) {
      const fim = texto.indexOf('>', abre);
      if (fim === -1) throw new Error('declaração não fechada');
      i = fim + 1;
      continue;
    }

    const fecha = texto.indexOf('>', abre);
    if (fecha === -1) throw new Error('tag sem fechamento');
    const corpo = texto.slice(abre + 1, fecha);

    if ((corpo.match(/"/g) || []).length % 2 !== 0) {
      throw new Error(`aspas desbalanceadas em <${corpo.slice(0, 30)}…>`);
    }

    if (corpo.startsWith('/')) {
      const nome = corpo.slice(1).trim();
      const topo = pilha.pop();
      if (topo !== nome) throw new Error(`</${nome}> não casa com <${topo ?? 'nada'}>`);
    } else if (!corpo.endsWith('/')) {
      const nome = corpo.split(/[\s/]/)[0];
      pilha.push(nome);
      if (nome === 'style') {
        const fimStyle = texto.indexOf('</style>', fecha);
        if (fimStyle === -1) throw new Error('<style> não fechado');
        i = fimStyle;
        continue;
      }
    }

    i = fecha + 1;
  }

  if (pilha.length > 0) throw new Error(`tags não fechadas: ${pilha.join(', ')}`);
}

function validar(arquivo, regras) {
  const erros = [];
  const svg = readFileSync(`svg/${arquivo}`, 'utf8');

  // 1. Estrutura
  try {
    verificarBoaFormacao(svg);
  } catch (e) {
    erros.push(`XML mal formado: ${e.message}`);
  }

  // 2. Dimensões — os cards de estatística compartilham a largura para
  //    alinharem entre si; quem tem dimensão própria declara em ESPERADO.
  const largura = Number(svg.match(/\bwidth="(\d+)"/)?.[1]);
  const altura = Number(svg.match(/\bheight="(\d+)"/)?.[1]);
  const larguraEsperada = regras.largura ?? LARGURA;
  if (largura !== larguraEsperada) {
    erros.push(`largura ${largura} ≠ ${larguraEsperada}`);
  }
  if (regras.altura !== undefined) {
    if (altura !== regras.altura) erros.push(`altura ${altura} ≠ ${regras.altura}`);
  } else if (!(altura >= ALTURA_MINIMA && altura <= ALTURA_MAXIMA)) {
    erros.push(`altura ${altura} fora de [${ALTURA_MINIMA}, ${ALTURA_MAXIMA}]`);
  }

  // 3. Marcadores de conteúdo real
  for (const marcador of regras.marcadores) {
    const presente = typeof marcador === 'string' ? svg.includes(marcador) : marcador.test(svg);
    if (!presente) erros.push(`conteúdo esperado ausente: ${marcador}`);
  }

  // 4. Padrões de erro
  for (const padrao of PADROES_PROIBIDOS) {
    if (padrao.test(svg)) erros.push(`padrão de falha encontrado: ${padrao}`);
  }

  // 5. Tamanho
  const bytes = Buffer.byteLength(svg);
  if (bytes > TAMANHO_MAXIMO) erros.push(`${bytes} bytes acima do limite de ${TAMANHO_MAXIMO}`);

  // 6. Nenhuma dependência externa — este é o teste que protege o objetivo
  //    do projeto. Se alguém reintroduzir um serviço de terceiro, o CI quebra.
  for (const url of svg.match(/https?:\/\/[^\s"'<>)]+/g) || []) {
    if (!NAMESPACES.includes(url)) erros.push(`URL externa proibida: ${url}`);
  }

  // 6b. Imagem referenciada de fora nunca renderiza: SVG carregado via <img>
  //     roda em modo estático seguro e o navegador bloqueia recurso externo.
  //     Toda imagem tem de estar embutida como data URI.
  for (const ref of svg.match(/<image[^>]*\shref="([^"]{0,40})/g) || []) {
    if (!ref.includes('href="data:')) erros.push(`<image> com href não embutido: ${ref.slice(-40)}…`);
  }

  return { erros, bytes, largura, altura };
}

/** Nenhum nome de repositório privado pode chegar a um card público. */
function validarPrivacidade() {
  const erros = [];
  const repos = JSON.parse(readFileSync('dados/repositorios.json', 'utf8')).todos;
  const svg = readFileSync('svg/repositorios.svg', 'utf8');

  for (const r of repos) {
    if (r.privado && svg.includes(r.nome)) {
      erros.push(`repositório privado exposto no card: ${r.nome}`);
    }
  }
  return erros;
}

let falhas = 0;

for (const [arquivo, regras] of Object.entries(ESPERADO)) {
  let resultado;
  try {
    resultado = validar(arquivo, regras);
  } catch (e) {
    console.error(`  ✗ svg/${arquivo}: não foi possível ler (${e.message})`);
    falhas++;
    continue;
  }

  if (resultado.erros.length > 0) {
    console.error(`  ✗ svg/${arquivo}`);
    for (const erro of resultado.erros) console.error(`      · ${erro}`);
    falhas++;
  } else {
    console.log(`  ✓ svg/${arquivo} (${resultado.bytes} bytes, ${resultado.largura}×${resultado.altura})`);
  }
}

const errosPrivacidade = validarPrivacidade();
if (errosPrivacidade.length > 0) {
  console.error('  ✗ privacidade');
  for (const erro of errosPrivacidade) console.error(`      · ${erro}`);
  falhas++;
} else {
  console.log('  ✓ privacidade (nenhum repositório privado exposto)');
}

if (falhas > 0) {
  console.error(`✗ Validação falhou em ${falhas} item(ns). Nada será commitado.`);
  process.exit(1);
}

console.log('▸ Validação concluída — todos os cards aprovados');
