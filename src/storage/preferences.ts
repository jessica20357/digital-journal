import type { BackgroundTemplate } from '../domain/journal';

export const loadWallpaper = () => {
  try {
    const saved = localStorage.getItem('yepaper-wallpaper');
    // Guard against oversized values written by earlier demo versions.
    if (saved?.startsWith('data:') && saved.length > 2_000_000) {
      localStorage.removeItem('yepaper-wallpaper');
      return 'mist';
    }
    return saved || 'mist';
  } catch {
    return 'mist';
  }
};
export const loadBackgroundTemplates = (): BackgroundTemplate[] => {
  try {
    const saved = localStorage.getItem('yepaper-background-templates');
    if (saved) return JSON.parse(saved) as BackgroundTemplate[];
    const active = localStorage.getItem('yepaper-wallpaper');
    return active?.startsWith('data:') ? [{ id: 'saved-background', image: active }] : [];
  } catch {
    return [];
  }
};
