export const fittedImageBox = (
  preferredWidth: number | undefined,
  aspectRatio: number,
  canvasAspectRatio: number,
) => {
  let width = Number.isFinite(preferredWidth)
    ? Math.max(8, Math.min(45, preferredWidth as number))
    : 22.5;
  let height = (width * canvasAspectRatio) / aspectRatio;
  if (height > 78) {
    width *= 78 / height;
    height = 78;
  }
  return { width, height };
};
