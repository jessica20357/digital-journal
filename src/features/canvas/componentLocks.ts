import type { Page, PageComponent, TextComponent } from '../../domain/journal';

const lockedComponentFields: Partial<Record<PageComponent, (keyof Page)[]>> = {
  date: ['date'],
  title: ['title', 'titleScale'],
  footer: ['footerText'],
  text: ['text', 'textHtml', 'textPos', 'canvasTextBoxes'],
  shape: ['canvasShapes'],
  sticker: ['sticker', 'stickerScale', 'stickerScaleY'],
  weather: ['weather', 'intensity', 'sunIntensity', 'cloudDensity'],
  media: [
    'photo',
    'photoCutout',
    'backgroundCutout',
    'cutoutMode',
    'useCutout',
    'video',
    'stickerStyle',
    'stickerVariant',
    'stickerOutline',
    'stickerOutlineColor',
    'stickerOutlineWidth',
    'stickerDimensional',
    'mediaRotation',
    'mediaWidth',
    'mediaHeight',
    'mediaAspectRatio',
    'mediaPos',
    'mediaScale',
    'mediaScaleY',
    'crop',
  ],
};
export function preserveLockedComponents(previous: Page, next: Page): Page {
  if (previous === next || !previous.lockedLayers?.length) return next;
  const result = { ...next };
  for (const key of previous.lockedLayers) {
    if (key.startsWith('canvas-image:')) {
      const image = previous.canvasImages?.find((item) => item.id === key.slice(13));
      if (!image) continue;
      const images = result.canvasImages || [];
      result.canvasImages = images.some((item) => item.id === image.id)
        ? images.map((item) => (item.id === image.id ? image : item))
        : [...images, image];
      continue;
    }
    const component = key as PageComponent;
    for (const field of lockedComponentFields[component] || [])
      Object.assign(result, { [field]: previous[field] });
    result.componentPositions = {
      ...result.componentPositions,
      [component]: previous.componentPositions?.[component],
    };
    if (['date', 'title', 'text', 'footer'].includes(component)) {
      const textComponent = component as TextComponent;
      result.textStyles = {
        ...result.textStyles,
        [textComponent]: previous.textStyles?.[textComponent],
      };
    }
    for (const field of ['hiddenComponents', 'removedComponents'] as const) {
      result[field] = (result[field] || []).filter((item) => item !== component);
      if (previous[field]?.includes(component)) result[field]!.push(component);
    }
  }
  return result;
}
