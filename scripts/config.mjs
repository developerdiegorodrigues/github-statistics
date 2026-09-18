/**
 * Configuração central do gerador de estatísticas.
 * Alterar valores aqui muda o comportamento da coleta e da renderização
 * sem tocar em nenhum outro arquivo.
 */
export const config = {
  usuario: 'developerdiegorodrigues',

  /**
   * O Brasil aboliu o horário de verão em 2019, então o offset é fixo.
   * Ele é enviado nas datas da query para que o calendário de contribuições
   * do GitHub seja fatiado em dias de Brasília, e não em dias UTC.
   */
  fuso: 'America/Sao_Paulo',
  offsetFuso: '-03:00',

  /*
   * Privacidade dividida em duas decisões, porque o risco é diferente em cada
   * card: o de linguagens publica só uma soma de bytes, enquanto o de
   * destaques publica o NOME do repositório.
   */

  /** Soma os bytes dos repositórios privados. Nenhum nome é exposto. */
  privadosNasLinguagens: true,

  /** Nomes de repositórios privados NUNCA devem aparecer no perfil público. */
  privadosNosDestaques: false,

  /** Quantas linguagens aparecem antes de agrupar o resto em "Outras". */
  topLinguagens: 6,

  /** Quantos repositórios aparecem no card de destaques. */
  topRepositorios: 5,

  /** Linguagens que não representam código autoral e poluem o gráfico. */
  ignorarLinguagens: ['Dockerfile', 'Makefile', 'Batchfile'],

  /**
   * Excluídos do card de destaques: o repositório do próprio perfil (commits
   * de edição de README) e o da automação (commits do bot) dominariam o
   * ranking sem representar trabalho de desenvolvimento.
   */
  ignorarRepositorios: [
    'developerdiegorodrigues/developerdiegorodrigues',
    'developerdiegorodrigues/github-statistics',
  ],
};
