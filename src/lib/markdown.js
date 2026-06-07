import { marked } from 'marked';

// Markdown -> HTML. Además convierte marcadores "@fecha: ..." (una línea)
// en un separador de fecha sutil dentro del texto.
export function renderMarkdown(md = '') {
  const withMarks = (md || '').replace(
    /^[ \t]*@fecha:[ \t]*(.+?)[ \t]*$/gim,
    '<p class="datemark">— $1 —</p>'
  );
  return marked.parse(withMarks);
}
