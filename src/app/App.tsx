import { useEffect, useState } from 'react';
import type { LibrarySeed } from '../domain/journal';
import { readLibrary } from '../storage/library';
import { loadLibrarySeed } from '../storage/legacy';
import { JournalApp } from './JournalApp';

function App() {
  const [seed, setSeed] = useState<LibrarySeed | null>(null);
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let cancelled = false;
    setFailed(false);
    readLibrary<LibrarySeed>()
      .then((saved) => {
        if (!cancelled) {
          const library = saved ?? loadLibrarySeed();
          // Preserve former notebook soundtracks on existing pages during migration.
          const migratedPages = { ...library.pages };
          const migratedBooks = library.books.map((book) => {
            if (book.backgroundMusicName) {
              migratedPages[book.id] = (migratedPages[book.id] || []).map((page) =>
                page.backgroundMusic === undefined
                  ? { ...page, backgroundMusic: { id: book.id, name: book.backgroundMusicName! } }
                  : page,
              );
            }
            return { ...book, backgroundMusicName: undefined, backgroundMusicEnabled: undefined };
          });
          setSeed({ books: migratedBooks, pages: migratedPages });
        }
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      });
    return () => {
      cancelled = true;
    };
  }, [attempt]);
  if (!seed)
    return (
      <main className="library-loading" role="status">
        <p>{failed ? '手账读取失败，请重试。已有内容未被覆盖。' : '正在打开手账…'}</p>
        {failed && <button onClick={() => setAttempt((value) => value + 1)}>重新读取</button>}
      </main>
    );
  return <JournalApp librarySeed={seed} />;
}

export default App;
