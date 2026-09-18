/**
 * Coleta: API do GitHub -> dados/*.json
 *
 * Único ponto do projeto que fala com a rede. Se algo falhar aqui, o processo
 * termina com código != 0 e nada é escrito — os dados anteriores permanecem.
 */
import { writeFileSync } from 'node:fs';
import { config } from './config.mjs';
import { graphql, orcamento, FRAGMENTO_RATE_LIMIT } from './github.mjs';
import { hoje } from './i18n.mjs';

const QUERY_PERFIL = `
  query($login: String!) {
    ${FRAGMENTO_RATE_LIMIT}
    user(login: $login) { createdAt name login avatarUrl }
  }
`;

const QUERY_JANELA = `
  query($login: String!, $de: DateTime!, $ate: DateTime!) {
    ${FRAGMENTO_RATE_LIMIT}
    user(login: $login) {
      contributionsCollection(from: $de, to: $ate) {
        contributionCalendar {
          totalContributions
          weeks { contributionDays { date contributionCount } }
        }
        commitContributionsByRepository(maxRepositories: 50) {
          repository { nameWithOwner stargazerCount isPrivate primaryLanguage { name color } }
          contributions { totalCount }
        }
        pullRequestContributionsByRepository(maxRepositories: 50) {
          repository { nameWithOwner stargazerCount isPrivate primaryLanguage { name color } }
          contributions { totalCount }
        }
      }
    }
  }
`;

const QUERY_LINGUAGENS = `
  query($login: String!, $cursor: String, $privacidade: RepositoryPrivacy) {
    ${FRAGMENTO_RATE_LIMIT}
    user(login: $login) {
      repositories(
        first: 100
        after: $cursor
        privacy: $privacidade
        ownerAffiliations: [OWNER]
        isFork: false
        orderBy: { field: PUSHED_AT, direction: DESC }
      ) {
        totalCount
        pageInfo { hasNextPage endCursor }
        nodes {
          name
          isArchived
          languages(first: 15, orderBy: { field: SIZE, direction: DESC }) {
            edges { size node { name color } }
          }
        }
      }
    }
  }
`;

/**
 * contributionsCollection cobre no máximo 1 ano por chamada, então o histórico
 * é fatiado em janelas de ano-calendário. Os limites carregam o offset de
 * Brasília para o calendário ser fatiado em dias locais, não em dias UTC.
 */
function janelas(criadoEm, ate) {
  const off = config.offsetFuso;
  const anoInicial = Number(criadoEm.slice(0, 4));
  const anoFinal = Number(ate.slice(0, 4));
  const lista = [];

  for (let ano = anoInicial; ano <= anoFinal; ano++) {
    const deData = ano === anoInicial ? criadoEm.slice(0, 10) : `${ano}-01-01`;
    const ateData = ano === anoFinal ? ate : `${ano}-12-31`;
    lista.push({
      ano,
      deData,
      ateData,
      de: `${deData}T00:00:00${off}`,
      ate: `${ateData}T23:59:59${off}`,
    });
  }
  return lista;
}

function somar(mapa, chave, valor) {
  mapa.set(chave, (mapa.get(chave) || 0) + valor);
}

/** Maior corrida de dias consecutivos com pelo menos uma contribuição. */
function maiorSequencia(dias) {
  let melhor = { dias: 0, inicio: null, fim: null };
  let atual = 0;
  let inicio = null;

  for (const d of dias) {
    if (d.total > 0) {
      if (atual === 0) inicio = d.data;
      atual++;
      if (atual > melhor.dias) melhor = { dias: atual, inicio, fim: d.data };
    } else {
      atual = 0;
    }
  }
  return melhor;
}

/**
 * Sequência em curso. Se hoje ainda está zerado, a contagem começa em ontem:
 * sem essa regra o card zeraria toda madrugada, antes do primeiro commit do dia.
 */
function sequenciaAtual(dias) {
  let i = dias.length - 1;
  if (i >= 0 && dias[i].total === 0) i--;

  let total = 0;
  let inicio = null;
  let fim = null;

  while (i >= 0 && dias[i].total > 0) {
    if (fim === null) fim = dias[i].data;
    inicio = dias[i].data;
    total++;
    i--;
  }
  return { dias: total, inicio, fim };
}

async function coletar() {
  const login = config.usuario;
  const hojeIso = hoje();

  console.log(`▸ Coletando estatísticas de ${login} (referência: ${hojeIso})`);

  const perfil = (await graphql(QUERY_PERFIL, { login })).user;
  if (!perfil) throw new Error(`Usuário "${login}" não encontrado.`);
  const criadoEm = perfil.createdAt.slice(0, 10);
  console.log(`  conta criada em ${criadoEm}`);

  // --- Contribuições e repositórios, na mesma varredura de janelas ---------
  const porDia = new Map();
  const commitsPorRepo = new Map();
  const prsPorRepo = new Map();
  const metaRepo = new Map();
  let totalContribuicoes = 0;

  const listaJanelas = janelas(criadoEm, hojeIso);

  for (const j of listaJanelas) {
    const dados = await graphql(QUERY_JANELA, { login, de: j.de, ate: j.ate });
    const c = dados.user.contributionsCollection;

    totalContribuicoes += c.contributionCalendar.totalContributions;

    for (const semana of c.contributionCalendar.weeks) {
      for (const dia of semana.contributionDays) {
        // O calendário completa semanas inteiras, então vêm dias de fora da
        // janela. Ignorá-los evita que o preenchimento de uma janela sobrescreva
        // com zero um dia já contabilizado pela janela vizinha.
        if (dia.date < j.deData || dia.date > j.ateData) continue;
        if (dia.date > hojeIso) continue;
        porDia.set(dia.date, dia.contributionCount);
      }
    }

    const registrar = (lista, acumulador) => {
      for (const item of lista) {
        const r = item.repository;
        if (!config.privadosNosDestaques && r.isPrivate) continue;
        if (config.ignorarRepositorios.includes(r.nameWithOwner)) continue;
        somar(acumulador, r.nameWithOwner, item.contributions.totalCount);
        metaRepo.set(r.nameWithOwner, {
          estrelas: r.stargazerCount,
          privado: r.isPrivate,
          linguagem: r.primaryLanguage?.name ?? null,
          cor: r.primaryLanguage?.color ?? null,
        });
      }
    };

    registrar(c.commitContributionsByRepository, commitsPorRepo);
    registrar(c.pullRequestContributionsByRepository, prsPorRepo);

    console.log(`  ${j.ano}: ${c.contributionCalendar.totalContributions} contribuições`);
  }

  const dias = [...porDia.entries()]
    .map(([data, total]) => ({ data, total }))
    .sort((a, b) => a.data.localeCompare(b.data));

  if (dias.length === 0) throw new Error('Nenhum dia de contribuição retornado — coleta inválida.');

  const contribuicoes = {
    geradoEm: new Date().toISOString(),
    referencia: hojeIso,
    desde: criadoEm,
    total: totalContribuicoes,
    atual: sequenciaAtual(dias),
    recorde: maiorSequencia(dias),
    diasAnalisados: dias.length,
    // Janela recente guardada para eventuais visualizações de série temporal,
    // evitando uma nova varredura completa só para isso.
    ultimosDias: dias.slice(-91),
  };

  // --- Linguagens ---------------------------------------------------------
  const bytesPorLinguagem = new Map();
  const corPorLinguagem = new Map();
  let cursor = null;
  let repositoriosLidos = 0;

  do {
    const dados = await graphql(QUERY_LINGUAGENS, {
      login,
      cursor,
      privacidade: config.privadosNasLinguagens ? null : 'PUBLIC',
    });
    const pagina = dados.user.repositories;

    for (const repo of pagina.nodes) {
      repositoriosLidos++;
      for (const edge of repo.languages.edges) {
        const nome = edge.node.name;
        if (config.ignorarLinguagens.includes(nome)) continue;
        somar(bytesPorLinguagem, nome, edge.size);
        corPorLinguagem.set(nome, edge.node.color);
      }
    }

    cursor = pagina.pageInfo.hasNextPage ? pagina.pageInfo.endCursor : null;
  } while (cursor);

  const totalBytes = [...bytesPorLinguagem.values()].reduce((a, b) => a + b, 0);
  if (totalBytes === 0) throw new Error('Nenhum byte de linguagem retornado — coleta inválida.');

  const ordenadas = [...bytesPorLinguagem.entries()]
    .map(([nome, bytes]) => ({
      nome,
      bytes,
      percentual: (bytes / totalBytes) * 100,
      cor: corPorLinguagem.get(nome) || '#8b949e',
    }))
    .sort((a, b) => b.bytes - a.bytes);

  const linguagens = {
    geradoEm: new Date().toISOString(),
    repositoriosAnalisados: repositoriosLidos,
    totalBytes,
    // Lista completa: o corte top-N é decisão de apresentação, não de coleta.
    todas: ordenadas,
  };

  // --- Repositórios em destaque -------------------------------------------
  const nomes = new Set([...commitsPorRepo.keys(), ...prsPorRepo.keys()]);
  const todosRepos = [...nomes]
    .map((nome) => {
      const commits = commitsPorRepo.get(nome) || 0;
      const prs = prsPorRepo.get(nome) || 0;
      const meta = metaRepo.get(nome);
      return {
        nome: nome.split('/')[1],
        nomeCompleto: nome,
        commits,
        prs,
        total: commits + prs,
        estrelas: meta.estrelas,
        // Mantido para a validação conseguir provar que nenhum repositório
        // privado escapou para um card público.
        privado: meta.privado,
        linguagem: meta.linguagem,
        cor: meta.cor || '#8b949e',
      };
    })
    .sort((a, b) => b.total - a.total || b.estrelas - a.estrelas);

  if (todosRepos.length === 0) throw new Error('Nenhum repositório retornado — coleta inválida.');

  const repositorios = {
    geradoEm: new Date().toISOString(),
    todos: todosRepos,
  };

  // --- Gravação -----------------------------------------------------------
  const escrever = (arquivo, obj) => {
    writeFileSync(`dados/${arquivo}`, `${JSON.stringify(obj, null, 2)}\n`);
    console.log(`  ✓ dados/${arquivo}`);
  };

  escrever('contribuicoes.json', contribuicoes);
  escrever('linguagens.json', linguagens);
  escrever('repositorios.json', repositorios);

  const rl = orcamento();
  console.log(
    `▸ Coleta concluída — ${listaJanelas.length + 2} chamadas` +
      (rl ? `, ${rl.remaining} pontos de rate limit restantes` : ''),
  );
}

coletar().catch((erro) => {
  console.error(`✗ Coleta falhou: ${erro.message}`);
  console.error('  Nenhum arquivo foi alterado.');
  process.exit(1);
});
