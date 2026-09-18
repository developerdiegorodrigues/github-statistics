# Plano v2 — Apresentação do GitHub sem dependências externas

> Status: proposta · Data: 2026-09-17 · Repositório motor: `developerdiegorodrigues/github-statistics`

---

## 1. Diagnóstico

### 1.1 O elemento quebrado

O card no topo do perfil exibe `Failed to retrieve contributions. This is likely a GitHub API issue.`
Esse texto é o **card de erro do próprio serviço** `github-readme-streak-stats.herokuapp.com`.

### 1.2 Por que o fallback deste repositório não protegeu nada

> **Correção.** A primeira versão desta seção afirmava que o README do perfil nunca apontou para este
> repositório. Isso estava errado: foi escrito a partir de um clone local do perfil que estava 8
> commits atrasado. O texto abaixo reflete o estado real.

O README do perfil **já apontava** para as cópias servidas por este repositório via GitHub Pages:

| Seção do perfil | URL usada no README do perfil |
|---|---|
| Streak | `.../github-statistics/github-readme-streak-stats.svg` |
| Linguagens | `.../github-statistics/MostUsedLanguages.svg` |
| Repositórios | `.../github-statistics/contributor-stats.svg` |

Ou seja, a indireção funcionava. O que não funcionava era o conteúdo: o workflow baixava o card de
**erro** do serviço externo, considerava válido, commitava, e o Pages passava a servir o erro. O
perfil exibia fielmente aquilo que este repositório publicou.

Isso torna o problema da seção 1.3 não um detalhe, mas a **causa direta** do card quebrado.

### 1.3 O fallback também está furado

Em [`.github/workflows/update-stats.yml`](../.github/workflows/update-stats.yml) a validação é:

```bash
if grep -q '<svg' arquivo.svg.tmp; then ...
```

O card de erro do serviço **é um SVG válido**. Ele passa na validação, sobrescreve a cópia boa e é
commitado. Confirmado no histórico deste repositório:

```
e32bb93  Total Contributions      <- ok
2b8eeeb  Failed to retrieve       <- card de erro commitado
66c5236  Total Contributions      <- ok
...
4f11f19  Failed to retrieve       <- card de erro commitado
aaf6aa8  Failed to retrieve       <- card de erro commitado
e1668f7  Failed to retrieve       <- card de erro commitado
```

### 1.4 Conclusão do diagnóstico

Três problemas independentes, que o plano resolve de uma vez:

1. O perfil depende de 3 serviços de terceiros como **origem** dos dados (ainda que a exibição já
   passasse por este repositório).
2. A validação de fallback não distingue sucesso de erro — é a causa direta do card quebrado.
3. Os textos estão em inglês, num perfil escrito em pt-BR.

---

## 2. Objetivo e princípios

**Objetivo:** a apresentação do perfil não depende de nenhum serviço fora do GitHub.

Princípios que guiam as decisões abaixo:

- **Só GitHub.** Dados vêm da GraphQL API do GitHub; a execução é GitHub Actions; a hospedagem é GitHub Pages.
- **Zero dependências de runtime.** Scripts em Node.js puro (o runner já tem Node 20, com `fetch` nativo). Sem `npm install`, sem `package.json`, sem supply chain.
- **Determinístico e inspecionável.** Dado bruto salvo em JSON versionado; o SVG é função pura desse JSON.
- **Falha é visível, não silenciosa.** Se a API falhar, o arquivo anterior permanece e o workflow **falha em vermelho** — nunca commita um card de erro.
- **pt-BR nativo.** Rótulos, datas e números formatados em português do Brasil.

---

## 3. Arquitetura alvo

```
┌─────────────────────────────────────────────────────────────┐
│  developerdiegorodrigues/github-statistics   (MOTOR + HOST) │
│                                                             │
│  Actions (cron 2x/dia)                                      │
│      │                                                      │
│      ├─ 1. coleta   scripts/coletar.mjs                     │
│      │      └─► api.github.com/graphql  ← única fonte       │
│      │      └─► dados/*.json  (versionado)                  │
│      │                                                      │
│      ├─ 2. renderiza  scripts/renderizar.mjs                │
│      │      └─► svg/*.svg                                   │
│      │                                                      │
│      ├─ 3. valida     scripts/validar.mjs                   │
│      └─ 4. commit + deploy Pages                            │
└──────────────────────────┬──────────────────────────────────┘
                           │  https://developerdiegorodrigues.github.io/github-statistics/svg/*.svg
                           ▼
┌─────────────────────────────────────────────────────────────┐
│  developerdiegorodrigues/developerdiegorodrigues  (PERFIL)  │
│  README.md  →  3 tags <img> apontando para o Pages acima    │
└─────────────────────────────────────────────────────────────┘
```

**Decisões tomadas:**

- O motor fica **neste repositório** e o perfil consome via **GitHub Pages** (já no ar — `curl` da URL atual retorna `200`).
- Os três cards serão **redesenhados** com um sistema visual próprio e unificado, em vez de imitar três serviços que nunca combinaram entre si.

---

## 4. Fontes de dados — todas validadas

As três consultas abaixo foram **executadas contra a API real** durante a elaboração deste plano e
retornaram os dados necessários. Nenhum serviço de terceiros é envolvido.

### 4.1 Contribuições / sequência (substitui o streak-stats)

`contributionsCollection` cobre no máximo 1 ano por chamada. A conta foi criada em `2020-01-05`,
então são **7 janelas anuais** (2020…2026), agregadas em memória.

```graphql
query($login:String!, $de:DateTime!, $ate:DateTime!) {
  user(login: $login) {
    createdAt
    contributionsCollection(from: $de, to: $ate) {
      contributionCalendar {
        totalContributions
        weeks { contributionDays { date contributionCount } }
      }
    }
  }
}
```

Validado: `createdAt = 2020-01-05T16:53:15Z`, e a janela de 2026 retornou `totalContributions = 621`.

**Cálculo derivado** (em `scripts/coletar.mjs`, não na API):

- `totalContribuicoes` = soma dos `totalContributions` das 7 janelas.
- `sequenciaAtual` = varre os dias do mais recente para trás enquanto `contributionCount > 0`.
  Regra de borda: se **hoje** ainda tem 0 contribuições, a sequência não é quebrada — começa a
  contagem a partir de ontem (senão o card zera toda madrugada).
- `sequenciaRecorde` = maior corrida de dias consecutivos com `contributionCount > 0` em todo o histórico.
- Datas de início/fim de cada sequência para os rótulos.

### 4.2 Linguagens mais usadas (substitui o top-langs)

```graphql
query($login:String!, $cursor:String) {
  user(login: $login) {
    repositories(first: 100, after: $cursor, ownerAffiliations: [OWNER],
                 isFork: false, orderBy: {field: PUSHED_AT, direction: DESC}) {
      pageInfo { hasNextPage endCursor }
      nodes {
        name
        languages(first: 10, orderBy: {field: SIZE, direction: DESC}) {
          edges { size node { name color } }
        }
      }
    }
  }
}
```

Validado: `totalCount = 33` repositórios; os `edges` trazem `size` em bytes e a **cor oficial** de cada
linguagem (ex.: Java `#b07219`, TypeScript `#3178c6`, Python `#3572A5`) — não é preciso manter uma
tabela de cores própria.

**Cálculo derivado:** soma de bytes por linguagem em todos os repos → percentual → top 6 → o resto
agrupado como "Outras". Com `isFork: false` para não contar código que não é dele.

### 4.3 Repositórios em destaque (substitui o contributor-stats)

```graphql
query($login:String!, $de:DateTime!, $ate:DateTime!) {
  user(login: $login) {
    contributionsCollection(from: $de, to: $ate) {
      commitContributionsByRepository(maxRepositories: 25) {
        repository { nameWithOwner stargazerCount isPrivate primaryLanguage { name color } }
        contributions { totalCount }
      }
      pullRequestContributionsByRepository(maxRepositories: 25) {
        repository { nameWithOwner } contributions { totalCount }
      }
    }
  }
}
```

Validado: retornou repositórios com contagem de commits, estrelas, visibilidade e linguagem principal.

**Cálculo derivado:** agrega commits + PRs por repositório ao longo das 7 janelas anuais, ordena por
total e fica com os 5 primeiros. Repositórios privados são **excluídos** por padrão (evita vazar nome
de repo privado no perfil público) — controlado por uma flag de configuração.

### 4.4 Autenticação

`GITHUB_TOKEN` padrão do Actions é um token de instalação com escopo de repositório e **não é
confiável para consultas de escopo de usuário** (`contributionsCollection`), muito menos para
contribuições privadas.

**Decisão:** criar um PAT clássico com escopos `read:user` + `repo`, guardado como secret
`STATS_TOKEN` neste repositório. Isso também é o que habilita contar contribuições em repositórios
privados, se desejado.

> Ponto de atenção: PAT clássico expira. Vale criar com validade longa e anotar a data de renovação,
> ou aceitar a perda das contribuições privadas e usar apenas `read:user` público.

---

## 5. Sistema visual dos cards

Como os três cards passam a ser desenhados aqui, eles compartilham tokens únicos. Definidos uma vez
em `scripts/tema.mjs` e injetados como variáveis CSS dentro de cada SVG.

### 5.1 Tokens

| Token | Valor | Uso |
|---|---|---|
| `--fundo` | `#0d1117` | fundo do card (mesmo tom do dark do GitHub) |
| `--superficie` | `#161b22` | blocos internos, trilhas de barra |
| `--borda` | `#30363d` | contorno do card, divisórias |
| `--texto` | `#e6edf3` | números e títulos |
| `--texto-fraco` | `#8b949e` | rótulos e legendas |
| `--destaque` | `#2f81f7` | acento primário |
| `--chama` | `#f0883e` | sequência ativa |
| `--sucesso` | `#3fb950` | estrelas, ênfase positiva |

Tipografia: `'Segoe UI', Ubuntu, -apple-system, sans-serif` (sem webfont externa — fonte remota seria
outra dependência de terceiro).

### 5.2 Regras comuns

- Largura fixa **480px** nos três, para alinharem entre si no README.
- Cantos `rx=8`, borda de 1px, padding interno de 20px.
- `prefers-color-scheme`: bloco `@media` com paleta clara, para quem lê o GitHub em tema claro.
- Animações apenas de `fadeIn`/crescimento de barra, escalonadas em 80ms, envoltas em
  `@media (prefers-reduced-motion: reduce)` que as desliga.
- Acessibilidade: `role="img"` + `<title>` e `<desc>` descritivos em pt-BR (hoje os SVGs de terceiros
  vêm com `<title>` e `<desc>` **vazios**).
- Sem `<a xlink:href>` para fora (o `contributor-stats.svg` atual embute um link para o repositório do
  autor do serviço — sai).

### 5.3 Os três cards

**`contribuicoes.svg`** — 480×180, três colunas divididas por linha vertical:

```
┌──────────────────────────────────────────────────────────┐
│    1.743        │      13 🔥      │        13            │
│  Contribuições  │    Sequência    │      Recorde         │
│ desde 5 jan 2020│  desde 10 set   │  15 ago – 27 ago     │
└──────────────────────────────────────────────────────────┘
```

**`linguagens.svg`** — 480×200, barra empilhada + legenda em duas colunas:

```
┌──────────────────────────────────────────────────────────┐
│ Linguagens mais usadas                                   │
│ ████████████▓▓▓▓▓▓▓▓▒▒▒▒▒▒░░░░░░░░░░                     │
│ ● Java        29,2%      ● TypeScript   12,4%            │
│ ● Python      24,4%      ● JavaScript   12,0%            │
│ ● C++         17,2%      ● HTML          4,9%            │
└──────────────────────────────────────────────────────────┘
```

**`repositorios.svg`** — 480×230, lista de 5 com barra proporcional:

```
┌──────────────────────────────────────────────────────────┐
│ Repositórios em destaque                                 │
│ ● noctisshop_backend    ████████████████  142 commits ★1 │
│ ● transcriber           ██████████         87 commits    │
│ ● troo-x-video-...      ███████            61 commits    │
└──────────────────────────────────────────────────────────┘
```

Truncagem de nome com reticências reais (`…`) calculada por largura estimada em caracteres, já que
SVG estático não mede texto.

---

## 6. Localização pt-BR

Centralizada em `scripts/i18n.mjs` — nenhuma string literal espalhada pelos renderizadores.

| Hoje (inglês) | Passa a ser |
|---|---|
| `Total Contributions` | `Contribuições` |
| `Current Streak` | `Sequência atual` |
| `Longest Streak` | `Maior sequência` |
| `Jan 5, 2020 - Present` | `desde 5 jan 2020` |
| `Aug 15 - Aug 27` | `15 ago – 27 ago` |
| `Most Used Languages` | `Linguagens mais usadas` |
| `Diego Rodrigues' GitHub Contributor Stats` | `Repositórios em destaque` |

**Formatação numérica:** `Intl.NumberFormat('pt-BR')` → `1.743` (ponto como separador de milhar) e
`29,2%` (vírgula decimal). Meses abreviados: jan, fev, mar, abr, mai, jun, jul, ago, set, out, nov, dez.

**Fuso:** os cálculos de "hoje" e de sequência usam `America/Sao_Paulo`, não UTC. Sem isso, entre
21h e 00h (BRT) o card mostraria o dia seguinte e poderia zerar a sequência indevidamente.

---

## 7. Estrutura de arquivos resultante

```
github-statistics/
├── .github/workflows/
│   ├── atualizar-stats.yml      # substitui update-stats.yml
│   └── deploy-pages.yml         # mantido, ajustado para publicar só svg/
├── scripts/
│   ├── config.mjs               # usuário, limites, flags (privados sim/não)
│   ├── github.mjs               # cliente GraphQL: fetch, retry, rate limit
│   ├── coletar.mjs              # API  -> dados/*.json
│   ├── renderizar.mjs           # dados/*.json -> svg/*.svg
│   ├── validar.mjs              # portão de qualidade dos SVGs
│   ├── tema.mjs                 # tokens visuais
│   ├── i18n.mjs                 # strings e formatadores pt-BR
│   └── cards/
│       ├── contribuicoes.mjs
│       ├── linguagens.mjs
│       └── repositorios.mjs
├── dados/
│   ├── contribuicoes.json
│   ├── linguagens.json
│   └── repositorios.json
├── svg/
│   ├── contribuicoes.svg
│   ├── linguagens.svg
│   └── repositorios.svg
├── LAST_UPDATED.txt
├── README.md                    # reescrito: documenta o gerador, não o proxy
└── reference/Plan_v2.md
```

**Arquivos removidos** ao final da migração: `github-readme-streak-stats.svg`,
`MostUsedLanguages.svg`, `contributor-stats.svg` (raiz), `update-stats.yml`.

> Os SVGs antigos só saem na **Fase 5**, depois que o README do perfil já aponta para os novos —
> assim o perfil nunca fica com imagem quebrada durante a migração.

---

## 8. Workflow novo

Substitui `update-stats.yml`. Diferenças que importam:

```yaml
name: Atualizar estatísticas
on:
  schedule: [{ cron: '0 6,18 * * *' }]
  workflow_dispatch:

jobs:
  atualizar:
    runs-on: ubuntu-latest
    permissions: { contents: write }
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: '20' }

      - name: Coletar dados da API do GitHub
        env:
          STATS_TOKEN: ${{ secrets.STATS_TOKEN }}
        run: node scripts/coletar.mjs          # FALHA o job se a API falhar

      - name: Renderizar SVGs
        run: node scripts/renderizar.mjs

      - name: Validar SVGs
        run: node scripts/validar.mjs          # FALHA o job se algo estiver errado

      - name: Commitar se houver mudança
        run: |
          git config user.name  "github-actions[bot]"
          git config user.email "github-actions[bot]@users.noreply.github.com"
          git add dados svg LAST_UPDATED.txt
          git diff --cached --quiet || git commit -m "📊 Estatísticas atualizadas — $(date -u +%F)"
          git push
```

### 8.1 Portão de validação (`validar.mjs`)

É aqui que o bug da v1 morre. O arquivo só é aceito se **todas** as condições passarem:

1. Faz parse como XML bem formado (não é `grep '<svg'`).
2. Tem as dimensões esperadas para aquele card.
3. Contém os marcadores de dado esperados — ex.: `contribuicoes.svg` precisa ter pelo menos um
   número > 0 no campo de total.
4. **Não** contém nenhum padrão de erro conhecido (`Failed to`, `error`, `unavailable`).
5. Tem menos de 100 KB.
6. Nenhuma URL externa: nenhum `href`/`src`/`url(` apontando para fora do próprio documento.
   *Este é o teste que garante o objetivo do plano.* Se alguém reintroduzir uma dependência
   externa por descuido, o CI quebra.

Se qualquer card falhar: o job falha, nada é commitado, os SVGs anteriores continuam servidos pelo
Pages, e chega notificação de Actions falhando. Degradação visível, não silenciosa.

### 8.2 Resiliência de rede

`scripts/github.mjs` implementa retry com backoff exponencial (3 tentativas: 1s, 4s, 16s) para erros
5xx e `RATE_LIMITED`, e lê o campo `rateLimit` da resposta para abortar cedo se o orçamento acabar.
Falha de rede transitória não vira card de erro nem job vermelho no primeiro soluço.

---

## 9. Migração do README do perfil

Última fase, num repositório diferente (`developerdiegorodrigues/developerdiegorodrigues`).

```diff
- ![streak status](https://github-readme-streak-stats.herokuapp.com/?user=developerdiegorodrigues&theme=dark&hide_border=false&chage=1)
+ <img alt="Contribuições no GitHub" src="https://developerdiegorodrigues.github.io/github-statistics/svg/contribuicoes.svg" width="480">

- ![most used languages](https://github-readme-stats.vercel.app/api/top-langs/?username=...)
+ <img alt="Linguagens mais usadas" src="https://developerdiegorodrigues.github.io/github-statistics/svg/linguagens.svg" width="480">

- ![repository](https://github-contributor-stats.vercel.app/api?username=...)
+ <img alt="Repositórios em destaque" src="https://developerdiegorodrigues.github.io/github-statistics/svg/repositorios.svg" width="480">
```

Ajustes de texto pt-BR no mesmo passo:

- `<sup>Full Stack Web Developer</sup>` → `<sup>Desenvolvedor Full Stack</sup>`
- `🌐 Alguns Repositórios públicos` → `🌐 Repositórios em destaque` (alinha com o título do card)

**Sobre o cache do Camo:** o GitHub serve imagens de README através do proxy Camo. Quando o conteúdo
do SVG muda na mesma URL, a atualização no perfil pode levar de minutos a algumas horas. Isso não é
um problema novo nem introduzido aqui — vale só saber que a mudança não é instantânea, e não
confundir cache com falha.

---

## 10. Como validar

**Local, antes de qualquer push:**

```bash
export STATS_TOKEN=$(gh auth token)
node scripts/coletar.mjs && node scripts/renderizar.mjs && node scripts/validar.mjs
xdg-open svg/contribuicoes.svg    # conferir no navegador
```

**Checklist de aceitação — o plano só está cumprido quando todos passam:**

- [ ] `grep -rE 'herokuapp|vercel\.app|shields\.io' svg/ scripts/` não retorna nada.
- [ ] Os três SVGs renderizam corretamente em tema claro e escuro do GitHub.
- [ ] Nenhum texto em inglês visível nos três cards.
- [ ] Números em formato pt-BR (`1.743`, `29,2%`) e datas em pt-BR (`15 ago`).
- [ ] Rodar o workflow com `STATS_TOKEN` inválido **falha o job** e **não commita** nada.
- [ ] Os SVGs anteriores continuam íntegros após uma execução que falhou.
- [ ] README do perfil não contém mais nenhum domínio de terceiros nos três cards.
- [ ] Total de contribuições bate com o que o perfil do GitHub mostra (conferência manual).

> Observação sobre os badges de stack (`shields.io`): o README do perfil tem ~30 badges do
> shields.io, que também são terceiros. **Estão fora do escopo desta refatoração** — o pedido é
> sobre as três seções de estatísticas. Fica registrado como candidato a um v3, já que a mesma
> infraestrutura criada aqui poderia gerar um único SVG de stacks e eliminar as 30 requisições.

---

## 11. Riscos

| Risco | Impacto | Mitigação |
|---|---|---|
| PAT clássico expira | Workflow começa a falhar em vermelho | Validade longa + data de renovação anotada; a falha é visível, os SVGs antigos continuam servidos |
| Cálculo de sequência diverge do que o GitHub mostra | Card com número "errado" aos olhos de quem confere | Fuso `America/Sao_Paulo` + regra de borda para o dia corrente; conferência manual no checklist |
| Rate limit da GraphQL (7 janelas × 3 queries) | Coleta incompleta | ~21 chamadas por execução, 2x/dia — muito abaixo do limite de 5.000 pontos/hora; `rateLimit` monitorado mesmo assim |
| Camo cacheia o SVG antigo | Perfil parece desatualizado | Comportamento conhecido do GitHub; só documentar |
| Redesenho não agrada | Retrabalho visual | Fase 2 entrega um card só (`contribuicoes`) para aprovação antes de aplicar o mesmo sistema aos outros dois |

---

## 12. Fases de execução

Cada fase é commitável e deixa o perfil funcionando.

| Fase | Entrega | Como saber que terminou |
|---|---|---|
| **1. Fundação** | `scripts/config.mjs`, `github.mjs`, `tema.mjs`, `i18n.mjs`, `coletar.mjs` | `node scripts/coletar.mjs` popula `dados/*.json` com dados reais |
| **2. Primeiro card** | `cards/contribuicoes.mjs` + `renderizar.mjs` | `svg/contribuicoes.svg` abre no navegador e está correto — **ponto de aprovação do visual** |
| **3. Demais cards** | `cards/linguagens.mjs`, `cards/repositorios.mjs` | Os três SVGs renderizam com o mesmo sistema visual |
| **4. Automação** | `validar.mjs`, `atualizar-stats.yml`, secret `STATS_TOKEN`, ajuste do `deploy-pages.yml` | Execução manual do workflow passa; teste de token inválido falha sem commitar |
| **5. Corte** | README do perfil migrado; SVGs e workflow antigos removidos; README deste repo reescrito | Checklist da seção 10 todo marcado |

A Fase 5 é a única que toca o repositório do perfil, e só acontece depois que as URLs novas estão
comprovadamente servindo pelo Pages.


---

## 13. Execução — o que foi feito

Todas as cinco fases foram executadas em 2026-09-17.

| Fase | Situação | Observações |
|---|---|---|
| 1. Fundação | ✅ | `config`, `github`, `tema`, `i18n`, `coletar`. 9 chamadas por execução |
| 2. Primeiro card | ✅ | Layout de 3 colunas aprovado sem o mini-heatmap |
| 3. Demais cards | ✅ | `linguagens` (480×182) e `repositorios` (480×222) |
| 4. Automação | ✅ | `validar.mjs` + `atualizar-stats.yml`. Falta só cadastrar o secret |
| 5. Corte | ✅ | README do perfil migrado; SVGs e workflow da v1 removidos |

### Decisões tomadas durante a execução

- **Privacidade dividida em duas flags.** A coleta enxergava só 11 repositórios públicos (168 KB),
  porque a maior parte do código está em repositórios privados. O card de linguagens passou a somar
  os bytes dos privados (33 repositórios, 14,71 MB), já que publica apenas um agregado. O card de
  destaques continua **só público**, porque publica o nome do repositório.
- **Repositórios de infraestrutura fora do ranking.** `developerdiegorodrigues` (38 commits de
  edição de README) e `github-statistics` (commits do bot) dominavam o card sem representar
  trabalho de desenvolvimento.

### Bugs encontrados e corrigidos durante a implementação

- **`transform` de CSS sobrescreve o atributo `transform` do SVG.** A animação de entrada jogava
  todos os ícones para o canto superior esquerdo. A animação deixou de tocar em `transform`.
- **`opacity: 0` + `animation-fill-mode: forwards` produz card em branco** em qualquer renderizador
  que não execute animações. Trocado por `backwards`: o estado padrão passou a ser visível. Era a
  mesma classe de fragilidade que o projeto se propôs a eliminar.

### Evidência de que o portão de validação funciona

O `validar.mjs` foi testado contra o card de erro real que a v1 commitou (commit `2b8eeeb`), contra
um SVG com dependência externa reintroduzida e contra XML mal formado. Reprovou os três.

Na hora do push, o remoto tinha 14 commits novos do bot da v1. Verificação do histórico: **3 deles
haviam gravado o card de erro**, e o `origin/main` estava exatamente nesse estado — era o que a
captura de tela mostrava.

### Pendência — passo manual

O secret `STATS_TOKEN` ainda **não está cadastrado**. Enquanto isso:

- O perfil funciona normalmente, servindo os SVGs commitados nesta refatoração.
- O workflow agendado falha em vermelho na etapa "Conferir o token", sem commitar nada.

Para resolver: criar um PAT clássico com `read:user` e `repo` e cadastrar em
*Settings → Secrets and variables → Actions* do repositório `github-statistics`.
