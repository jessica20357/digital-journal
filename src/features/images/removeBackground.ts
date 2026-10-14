export const autoRemoveBackground = async (sourceUrl: string) => {
  const image = await new Promise<HTMLImageElement>((resolve, reject) => {
    const loaded = new Image();
    loaded.onload = () => resolve(loaded);
    loaded.onerror = () => reject(new Error('图片读取失败'));
    loaded.src = sourceUrl;
  });
  const scale = Math.min(1, 2400 / Math.max(image.naturalWidth, image.naturalHeight));
  const width = Math.max(1, Math.round(image.naturalWidth * scale));
  const height = Math.max(1, Math.round(image.naturalHeight * scale));
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d', { willReadFrequently: true });
  if (!context) throw new Error('无法处理这张图片');
  context.drawImage(image, 0, 0, width, height);
  const frame = context.getImageData(0, 0, width, height);
  const pixels = frame.data;
  const count = width * height;
  const samples: [number, number, number][] = [];
  const sampleCorner = (left: number, top: number) => {
    let r = 0,
      g = 0,
      b = 0,
      n = 0;
    for (let y = 0; y < 5; y++)
      for (let x = 0; x < 5; x++) {
        const px = Math.max(0, Math.min(width - 1, left ? width - 1 - x : x));
        const py = Math.max(0, Math.min(height - 1, top ? height - 1 - y : y));
        const at = (py * width + px) * 4;
        r += pixels[at];
        g += pixels[at + 1];
        b += pixels[at + 2];
        n++;
      }
    return [r / n, g / n, b / n] as [number, number, number];
  };
  samples.push(sampleCorner(0, 0), sampleCorner(1, 0), sampleCorner(0, 1), sampleCorner(1, 1));
  const dist = (a: number[], b: number[]) =>
    (a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2 + (a[2] - b[2]) ** 2;
  let bestGroup: number[] = [];
  samples.forEach((sample, i) => {
    const group = samples
      .map((other, j) => ({ other, j }))
      .filter(({ other }) => dist(sample, other) < 70 ** 2)
      .map(({ j }) => j);
    if (group.length > bestGroup.length) bestGroup = group;
  });
  const background = [0, 1, 2].map(
    (channel) =>
      bestGroup.reduce((sum, i) => sum + samples[i][channel], 0) / Math.max(1, bestGroup.length),
  );
  const threshold = 58 ** 2 * 3;
  const feather = 40;
  const removed = new Uint8Array(count);
  const queue = new Int32Array(count);
  let head = 0,
    tail = 0;
  const enqueue = (index: number) => {
    if (removed[index]) return;
    const at = index * 4;
    if (dist([pixels[at], pixels[at + 1], pixels[at + 2]], background) <= threshold) {
      removed[index] = 1;
      queue[tail++] = index;
    }
  };
  for (let x = 0; x < width; x++) {
    enqueue(x);
    enqueue((height - 1) * width + x);
  }
  for (let y = 1; y < height - 1; y++) {
    enqueue(y * width);
    enqueue(y * width + width - 1);
  }
  while (head < tail) {
    const index = queue[head++];
    pixels[index * 4 + 3] = 0;
    const x = index % width;
    const y = (index / width) | 0;
    if (x > 0) enqueue(index - 1);
    if (x + 1 < width) enqueue(index + 1);
    if (y > 0) enqueue(index - width);
    if (y + 1 < height) enqueue(index + width);
  }
  for (let y = 1; y < height - 1; y++)
    for (let x = 1; x < width - 1; x++) {
      const index = y * width + x;
      if (removed[index]) continue;
      if (
        !removed[index - 1] &&
        !removed[index + 1] &&
        !removed[index - width] &&
        !removed[index + width]
      )
        continue;
      const at = index * 4;
      const distance = Math.sqrt(dist([pixels[at], pixels[at + 1], pixels[at + 2]], background));
      if (distance < 58 * Math.sqrt(3) + feather)
        pixels[at + 3] = Math.round(
          pixels[at + 3] * Math.max(0, Math.min(1, (distance - 58 * Math.sqrt(3)) / feather)),
        );
    }
  context.putImageData(frame, 0, 0);
  return canvas.toDataURL('image/png');
};
