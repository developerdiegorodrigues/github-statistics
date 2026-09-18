/**
 * Todas as strings visíveis e todos os formatadores pt-BR.
 * Nenhum texto literal deve aparecer nos renderizadores de card.
 */
import { config } from './config.mjs';

export const textos = {
  contribuicoes: {
    titulo: 'Contribuições no GitHub',
    total: 'Contribuições',
    sequenciaAtual: 'Sequência atual',
    sequenciaRecorde: 'Maior sequência',
    desde: (data) => `desde ${data}`,
    nenhumaSequencia: 'sem sequência ativa',
    dia: (n) => (n === 1 ? '1 dia' : `${formatarNumero(n)} dias`),
  },
  linguagens: {
    titulo: 'Linguagens mais usadas',
    outras: 'Outras',
    vazio: 'Nenhuma linguagem encontrada',
  },
  repositorios: {
    titulo: 'Repositórios em destaque',
    commits: (n) => (n === 1 ? '1 commit' : `${formatarNumero(n)} commits`),
    vazio: 'Nenhum repositório encontrado',
  },
};

const MESES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];

const fmtNumero = new Intl.NumberFormat('pt-BR');
const fmtPercentual = new Intl.NumberFormat('pt-BR', {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});

/** 1743 -> "1.743" */
export function formatarNumero(n) {
  return fmtNumero.format(n);
}

/** 29.17 -> "29,2%" */
export function formatarPercentual(n) {
  return `${fmtPercentual.format(n)}%`;
}

/**
 * Converte "2020-01-05" em partes, sem passar por Date — assim não há
 * chance de o fuso do runner deslocar o dia em relação ao que a API devolveu.
 */
function partes(iso) {
  const [ano, mes, dia] = iso.split('-').map(Number);
  return { ano, mes, dia };
}

/** "2020-01-05" -> "5 jan 2020" */
export function formatarDataCompleta(iso) {
  const { ano, mes, dia } = partes(iso);
  return `${dia} ${MESES[mes - 1]} ${ano}`;
}

/** "2026-09-10" -> "10 set" */
export function formatarDataCurta(iso) {
  const { mes, dia } = partes(iso);
  return `${dia} ${MESES[mes - 1]}`;
}

/**
 * Intervalo entre duas datas. Omite o ano quando ambas caem no mesmo ano,
 * e colapsa para uma data só quando início e fim coincidem.
 */
export function formatarIntervalo(inicioIso, fimIso) {
  if (!inicioIso || !fimIso) return '';
  const inicio = partes(inicioIso);
  const fim = partes(fimIso);
  if (inicioIso === fimIso) return formatarDataCompleta(inicioIso);
  if (inicio.ano === fim.ano) {
    return `${formatarDataCurta(inicioIso)} – ${formatarDataCurta(fimIso)}`;
  }
  return `${formatarDataCompleta(inicioIso)} – ${formatarDataCompleta(fimIso)}`;
}

/** Data de "hoje" no fuso configurado, como "AAAA-MM-DD". */
export function hoje() {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: config.fuso,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
}

/** Carimbo legível para o LAST_UPDATED.txt. */
export function carimbo() {
  const agora = new Intl.DateTimeFormat('pt-BR', {
    timeZone: config.fuso,
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(new Date());
  return `Última atualização: ${agora} (horário de Brasília)`;
}
