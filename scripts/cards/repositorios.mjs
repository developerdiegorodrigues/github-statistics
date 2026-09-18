/**
 * Card de repositórios em destaque: lista com barra proporcional de commits.
 * Substitui o github-contributor-stats.
 */
import { LARGURA, PADDING, card, esc, truncar, atraso } from '../tema.mjs';
import { textos, formatarNumero } from '../i18n.mjs';
import { config } from '../config.mjs';

const Y_TITULO = 34;
const Y_PRIMEIRA = 64;
const PASSO = 32;
const X_NOME = PADDING + 17;
const LARGURA_BARRA = LARGURA - PADDING * 2 - 17;
const LARGURA_NOME = 210;

function linha(repo, indice, maximo) {
  const y = Y_PRIMEIRA + indice * PASSO;
  const proporcao = maximo > 0 ? repo.total / maximo : 0;
  const largura = Math.max(proporcao * LARGURA_BARRA, 3);
  const nome = truncar(repo.nome, 12, LARGURA_NOME);
  const direita = [repo.linguagem, textos.repositorios.commits(repo.total)]
    .filter(Boolean)
    .join(' · ');

  return (
    `    <g class="anim" style="${atraso(indice, 0.25, 0.08)}">\n` +
    `      <circle cx="${PADDING + 4}" cy="${y - 4}" r="4.5" fill="${repo.cor}"/>\n` +
    `      <text class="item" x="${X_NOME}" y="${y}">${esc(nome)}</text>\n` +
    `      <text class="legenda" x="${LARGURA - PADDING}" y="${y}" text-anchor="end">${esc(direita)}</text>\n` +
    `      <g transform="translate(${X_NOME} ${y + 7})">\n` +
    `        <rect x="0" y="0" width="${LARGURA_BARRA}" height="4" rx="2" fill="var(--superficie)"/>\n` +
    `        <g class="cresce" style="${atraso(indice, 0.3, 0.08)}">\n` +
    `          <rect x="0" y="0" width="${largura.toFixed(2)}" height="4" rx="2" fill="${repo.cor}"/>\n` +
    `        </g>\n` +
    `      </g>\n` +
    `    </g>`
  );
}

export default function renderizar(dados) {
  const t = textos.repositorios;

  const destaques = dados.todos
    .filter((r) => !config.ignorarRepositorios.includes(r.nomeCompleto))
    .slice(0, config.topRepositorios);

  if (destaques.length === 0) throw new Error(t.vazio);

  const maximo = Math.max(...destaques.map((r) => r.total));
  const altura = Y_PRIMEIRA + (destaques.length - 1) * PASSO + 30;

  const descricao = destaques
    .map((r) => `${r.nome} com ${formatarNumero(r.total)} contribuições`)
    .join(', ');

  const conteudo = [
    `    <text class="titulo anim" style="${atraso(0)}" x="${PADDING}" y="${Y_TITULO}">${esc(t.titulo)}</text>`,
    ...destaques.map((r, i) => linha(r, i, maximo)),
  ].join('\n');

  return card({
    altura,
    titulo: t.titulo,
    descricao: `${t.titulo}: ${descricao}.`,
    conteudo,
  });
}
