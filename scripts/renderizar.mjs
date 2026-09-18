/**
 * Renderização: dados/*.json -> svg/*.svg
 *
 * Função pura, sem rede. Pode ser executada quantas vezes for preciso para
 * ajustar o visual sem gastar uma única chamada de API.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { carimbo } from './i18n.mjs';

import banner from './cards/banner.mjs';
import banner2 from './cards/banner2.mjs';
import contribuicoes from './cards/contribuicoes.mjs';
import linguagens from './cards/linguagens.mjs';
import repositorios from './cards/repositorios.mjs';

const CARDS = [
  // O banner é estático: não tem arquivo de dados, por isso `dados: null`.
  { dados: null, svg: 'banner.svg', renderizar: banner },
  { dados: null, svg: 'Banner_2.svg', renderizar: banner2 },
  { dados: 'contribuicoes.json', svg: 'contribuicoes.svg', renderizar: contribuicoes },
  { dados: 'linguagens.json', svg: 'linguagens.svg', renderizar: linguagens },
  { dados: 'repositorios.json', svg: 'repositorios.svg', renderizar: repositorios },
];

function ler(arquivo) {
  try {
    return JSON.parse(readFileSync(`dados/${arquivo}`, 'utf8'));
  } catch (e) {
    throw new Error(`Não foi possível ler dados/${arquivo} — rode scripts/coletar.mjs antes. (${e.message})`);
  }
}

let falhas = 0;

for (const c of CARDS) {
  try {
    const svg = c.renderizar(c.dados ? ler(c.dados) : undefined);
    writeFileSync(`svg/${c.svg}`, svg);
    console.log(`  ✓ svg/${c.svg} (${svg.length} bytes)`);
  } catch (e) {
    console.error(`  ✗ svg/${c.svg}: ${e.message}`);
    falhas++;
  }
}

if (falhas > 0) {
  console.error(`✗ Renderização falhou em ${falhas} card(s).`);
  process.exit(1);
}

writeFileSync('LAST_UPDATED.txt', `${carimbo()}\n`);
console.log('▸ Renderização concluída');
