import type { Page, TextComponent, TextStyle } from '../../domain/journal';

export const defaultTextStyle: TextStyle = {
  fontFamily: "'Noto Serif SC', Georgia, serif",
  color: '#676657',
  backgroundColor: 'transparent',
  bold: false,
  italic: false,
  underline: false,
  textAlign: 'left',
};
export const textStyleFor = (page: Page, component: TextComponent): TextStyle => ({
  ...defaultTextStyle,
  ...(component === 'title'
    ? { color: '#454a3f', bold: true, textAlign: 'left' as const }
    : component === 'date' || component === 'footer'
      ? { color: '#a19b8b', textAlign: 'left' as const }
      : {}),
  ...page.textStyles?.[component],
});
export const plainTextHtml = (text: string) =>
  text
    .split('\n')
    .map((line) => line.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'))
    .join('<br>');
export const sanitizeRichText = (html: string) => {
  const doc = new DOMParser().parseFromString(html, 'text/html');
  const allowed = new Set(['DIV', 'P', 'BR', 'B', 'STRONG', 'I', 'EM', 'U', 'S', 'SPAN', 'FONT']);
  const clean = (parent: ParentNode) =>
    Array.from(parent.childNodes).forEach((node) => {
      if (node.nodeType === Node.TEXT_NODE) return;
      if (!(node instanceof HTMLElement)) {
        node.parentNode?.removeChild(node);
        return;
      }
      if (['SCRIPT', 'STYLE', 'IFRAME', 'OBJECT', 'SVG', 'VIDEO', 'IMG'].includes(node.tagName)) {
        node.remove();
        return;
      }
      clean(node);
      if (!allowed.has(node.tagName)) {
        node.replaceWith(...Array.from(node.childNodes));
        return;
      }
      const style = node.getAttribute('style') || '';
      const safeStyles = new Map<string, string>();
      style.split(';').forEach((declaration) => {
        const [rawKey, ...rawValue] = declaration.split(':');
        const key = rawKey?.trim().toLowerCase();
        const value = rawValue.join(':').trim();
        if (
          [
            'color',
            'background-color',
            'font-family',
            'font-size',
            'font-weight',
            'font-style',
            'text-decoration',
          ].includes(key) &&
          value &&
          !/[{}]|url\s*\(/i.test(value)
        )
          safeStyles.set(key, value);
      });
      const face = node.tagName === 'FONT' ? node.getAttribute('face') : null;
      if (face && /^[\w\s,'"-]{1,80}$/.test(face)) safeStyles.set('font-family', face);
      Array.from(node.attributes).forEach((attribute) => node.removeAttribute(attribute.name));
      if (safeStyles.size)
        node.setAttribute(
          'style',
          Array.from(safeStyles)
            .map(([key, value]) => `${key}:${value}`)
            .join(';'),
        );
    });
  clean(doc.body);
  return doc.body.innerHTML;
};
