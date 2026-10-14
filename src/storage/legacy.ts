import type { Page, ShelfBook, LibrarySeed } from '../domain/journal';
import { initialPages } from '../config/journal';

const STORAGE = 'yepaper-demo-v1';

const shiftToSpread = (x: number) => Math.max(1, Math.min(98, 50 + x / 2));
export const migratePageToSpread = (page: Page): Page => ({
  ...page,
  textPos: { ...page.textPos, x: shiftToSpread(page.textPos.x) },
  mediaPos: { ...page.mediaPos, x: shiftToSpread(page.mediaPos.x) },
  componentPositions: page.componentPositions
    ? (Object.fromEntries(
        Object.entries(page.componentPositions).map(([key, position]) => [
          key,
          position ? { ...position, x: shiftToSpread(position.x) } : position,
        ]),
      ) as Page['componentPositions'])
    : undefined,
});

export function loadLibrarySeed(): LibrarySeed {
  let books: ShelfBook[];
  try {
    const saved = localStorage.getItem('yepaper-books');
    const parsed = saved
      ? (JSON.parse(saved) as Partial<ShelfBook>[])
      : [{ title: '夏日收集册', pages: 3, updated: '刚刚编辑' }];
    books = parsed.map((book, index) => ({
      ...book,
      id: book.id || `journal-${crypto.randomUUID()}-${index}`,
      title: book.title || `未命名手账 ${index + 1}`,
      pages: book.pages || 0,
      updated: book.updated || '刚刚编辑',
    }));
  } catch {
    books = [
      { id: `journal-${crypto.randomUUID()}`, title: '夏日收集册', pages: 3, updated: '刚刚编辑' },
    ];
  }
  let storedPages: Record<string, Page[]> = {};
  try {
    storedPages = JSON.parse(localStorage.getItem('yepaper-notebook-pages') || '{}') as Record<
      string,
      Page[]
    >;
  } catch {
    /* migrate the legacy first book below */
  }
  const isSpreadLayout = localStorage.getItem('yepaper-spread-layout-v1') === 'true';
  const legacyPages = loadPages();
  const pages = Object.fromEntries(
    books.map((book, index) => {
      const saved =
        storedPages[book.id] ||
        storedPages[book.title] ||
        (index === 0 ? legacyPages : initialPages);
      return [book.id, saved.map((page) => (isSpreadLayout ? page : migratePageToSpread(page)))];
    }),
  );
  return { books, pages };
}

function loadPages(): Page[] {
  try {
    const saved = localStorage.getItem(STORAGE);
    if (!saved) return initialPages;
    const parsed = JSON.parse(saved) as Page[];
    return parsed.length ? parsed : initialPages;
  } catch {
    return initialPages;
  }
}
