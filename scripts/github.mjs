/**
 * Cliente GraphQL da API do GitHub.
 * Sem dependências: usa o fetch nativo do Node 20.
 */
import { config } from './config.mjs';

const ENDPOINT = 'https://api.github.com/graphql';
const TENTATIVAS = 3;
const ESPERAS_MS = [1000, 4000, 16000];

function token() {
  const t = process.env.STATS_TOKEN || process.env.GITHUB_TOKEN;
  if (!t) {
    throw new Error(
      'Token ausente. Defina STATS_TOKEN (local: export STATS_TOKEN=$(gh auth token)).',
    );
  }
  return t;
}

const dormir = (ms) => new Promise((r) => setTimeout(r, ms));

/** Erros que valem uma nova tentativa: instabilidade, não dado inválido. */
function ehTransitorio(status, erros) {
  if (status >= 500) return true;
  if (status === 403 || status === 429) return true;
  return (erros || []).some((e) => e.type === 'RATE_LIMITED');
}

let orcamentoRestante = null;

export function orcamento() {
  return orcamentoRestante;
}

export async function graphql(query, variables = {}) {
  let ultimoErro;

  for (let tentativa = 0; tentativa < TENTATIVAS; tentativa++) {
    if (tentativa > 0) {
      const espera = ESPERAS_MS[tentativa - 1];
      console.warn(`  ↻ tentativa ${tentativa + 1}/${TENTATIVAS} em ${espera / 1000}s — ${ultimoErro}`);
      await dormir(espera);
    }

    let resposta;
    try {
      resposta = await fetch(ENDPOINT, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token()}`,
          'Content-Type': 'application/json',
          'User-Agent': `${config.usuario}-github-statistics`,
        },
        body: JSON.stringify({ query, variables }),
      });
    } catch (e) {
      ultimoErro = `falha de rede: ${e.message}`;
      continue;
    }

    let corpo;
    try {
      corpo = await resposta.json();
    } catch {
      ultimoErro = `resposta não-JSON (HTTP ${resposta.status})`;
      if (!ehTransitorio(resposta.status, null)) throw new Error(ultimoErro);
      continue;
    }

    if (!resposta.ok || corpo.errors) {
      const msg = (corpo.errors || []).map((e) => e.message).join('; ') || `HTTP ${resposta.status}`;
      ultimoErro = msg;
      if (ehTransitorio(resposta.status, corpo.errors)) continue;
      throw new Error(`Erro da API do GitHub: ${msg}`);
    }

    if (corpo.data?.rateLimit) {
      orcamentoRestante = corpo.data.rateLimit;
      if (orcamentoRestante.remaining < 50) {
        throw new Error(
          `Orçamento de rate limit quase esgotado (${orcamentoRestante.remaining} restantes, ` +
            `reseta em ${orcamentoRestante.resetAt}). Abortando para não coletar dados parciais.`,
        );
      }
    }

    return corpo.data;
  }

  throw new Error(`Falhou após ${TENTATIVAS} tentativas — ${ultimoErro}`);
}

/** Bloco a ser incluído em toda query para monitorar o orçamento. */
export const FRAGMENTO_RATE_LIMIT = 'rateLimit { remaining cost resetAt }';
