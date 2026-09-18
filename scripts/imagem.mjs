/**
 * Embutir imagens nos SVGs.
 *
 * Um SVG carregado via <img> — que é como o GitHub renderiza imagem de README —
 * roda em modo estático seguro: o navegador bloqueia todo recurso externo.
 * Um <image href="https://..."> ou href relativo simplesmente não aparece.
 * A única forma de a imagem existir no perfil é ir embutida como data URI.
 */
import { readFileSync } from 'node:fs';

const TIPOS = {
  webp: 'image/webp',
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  gif: 'image/gif',
  svg: 'image/svg+xml',
};

/** Lê o arquivo do disco e devolve um data URI pronto para o atributo href. */
export function embutir(caminho) {
  const extensao = caminho.split('.').pop().toLowerCase();
  const tipo = TIPOS[extensao];
  if (!tipo) throw new Error(`Tipo de imagem não suportado: .${extensao} (${caminho})`);

  let bytes;
  try {
    bytes = readFileSync(caminho);
  } catch (e) {
    throw new Error(
      `Imagem não encontrada em ${caminho}. Ela precisa existir em disco: o SVG ` +
        `embute o arquivo, não o referencia. (${e.message})`,
    );
  }

  return `data:${tipo};base64,${bytes.toString('base64')}`;
}
