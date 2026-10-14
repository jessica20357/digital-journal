import { PointerEvent, useEffect, useRef } from 'react';

import type { EraserStroke } from '../../domain/journal';

type Props = {
  active: boolean;
  erasing?: boolean;
  color: string;
  width: number;
  data?: string;
  onStrokeStart: () => void;
  onChange: (data: string, erased?: EraserStroke) => void;
  onErasePreview?: (stroke: EraserStroke | null) => void;
};

export function DrawingLayer({
  active,
  erasing = false,
  color,
  width,
  data,
  onStrokeStart,
  onChange,
  onErasePreview,
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const strokeRef = useRef<{
    pointerId: number;
    x: number;
    y: number;
    color: string;
    width: number;
    erased?: EraserStroke;
  } | null>(null);
  const renderedData = useRef<string | undefined>(undefined);
  const readyRef = useRef(!data);
  const callbacks = useRef({ onChange, onStrokeStart, onErasePreview });
  callbacks.current = { onChange, onStrokeStart, onErasePreview };

  useEffect(() => {
    const canvas = canvasRef.current!;
    const resize = () => {
      const bounds = canvas.getBoundingClientRect();
      if (!bounds.width || !bounds.height) return;
      const ratio = window.devicePixelRatio || 1;
      const w = Math.max(1, Math.round(bounds.width * ratio));
      const h = Math.max(1, Math.round(bounds.height * ratio));
      if (canvas.width === w && canvas.height === h) return;
      const copy = document.createElement('canvas');
      copy.width = canvas.width;
      copy.height = canvas.height;
      copy.getContext('2d')?.drawImage(canvas, 0, 0);
      canvas.width = w;
      canvas.height = h;
      const context = canvas.getContext('2d')!;
      context.drawImage(copy, 0, 0, w, h);
    };
    const observer = new ResizeObserver(resize);
    observer.observe(canvas);
    resize();
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    // A completed local stroke is already on the canvas; do not clear and reload it.
    if (data === renderedData.current) return;
    const canvas = canvasRef.current!;
    let cancelled = false;
    strokeRef.current = null;
    callbacks.current.onErasePreview?.(null);
    readyRef.current = false;
    const paint = (image?: HTMLImageElement) => {
      if (cancelled) return;
      const context = canvas.getContext('2d')!;
      context.clearRect(0, 0, canvas.width, canvas.height);
      if (image) context.drawImage(image, 0, 0, canvas.width, canvas.height);
      renderedData.current = data;
      readyRef.current = true;
    };
    if (data) {
      const image = new Image();
      image.onload = () => paint(image);
      image.onerror = () => {
        if (!cancelled) readyRef.current = true;
      };
      image.src = data;
    } else paint();
    return () => {
      cancelled = true;
    };
  }, [data]);

  const finish = (pointerId?: number) => {
    const stroke = strokeRef.current;
    if (!stroke || (pointerId !== undefined && pointerId !== stroke.pointerId)) return;
    strokeRef.current = null;
    const canvas = canvasRef.current!;
    const result = canvas.toDataURL('image/png');
    renderedData.current = result;
    callbacks.current.onChange(result, stroke.erased);
    callbacks.current.onErasePreview?.(null);
    if (canvas.hasPointerCapture(stroke.pointerId)) canvas.releasePointerCapture(stroke.pointerId);
  };
  useEffect(() => {
    if (!active) finish();
  }, [active]);

  const point = (event: { clientX: number; clientY: number }) => {
    const bounds = canvasRef.current!.getBoundingClientRect();
    return {
      x: (event.clientX - bounds.left) / bounds.width,
      y: (event.clientY - bounds.top) / bounds.height,
    };
  };
  const paintSegment = (to: { x: number; y: number }) => {
    const stroke = strokeRef.current!;
    const canvas = canvasRef.current!;
    const context = canvas.getContext('2d')!;
    context.save();
    context.globalCompositeOperation = stroke.erased ? 'destination-out' : 'source-over';
    context.strokeStyle = stroke.color;
    context.fillStyle = stroke.color;
    context.lineWidth = (stroke.width * canvas.width) / canvas.getBoundingClientRect().width;
    context.lineCap = 'round';
    context.lineJoin = 'round';
    context.beginPath();
    context.moveTo(stroke.x * canvas.width, stroke.y * canvas.height);
    context.lineTo(to.x * canvas.width, to.y * canvas.height);
    context.stroke();
    // A click without movement is a dot too.
    if (stroke.x === to.x && stroke.y === to.y) {
      context.beginPath();
      context.arc(to.x * canvas.width, to.y * canvas.height, context.lineWidth / 2, 0, Math.PI * 2);
      context.fill();
    }
    stroke.x = to.x;
    stroke.y = to.y;
    context.restore();
    if (stroke.erased) stroke.erased.points.push(to);
  };
  const start = (event: PointerEvent<HTMLCanvasElement>) => {
    if (!active || !readyRef.current || event.button !== 0 || strokeRef.current) return;
    event.preventDefault();
    event.stopPropagation();
    callbacks.current.onStrokeStart();
    const bounds = event.currentTarget.getBoundingClientRect();
    strokeRef.current = {
      pointerId: event.pointerId,
      ...point(event),
      color,
      width,
      erased: erasing
        ? { points: [], sizeX: width / bounds.width, sizeY: width / bounds.height }
        : undefined,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
    paintSegment(point(event));
    if (strokeRef.current.erased)
      callbacks.current.onErasePreview?.({
        ...strokeRef.current.erased,
        points: [...strokeRef.current.erased.points],
      });
  };
  const move = (event: PointerEvent<HTMLCanvasElement>) => {
    if (strokeRef.current?.pointerId !== event.pointerId) return;
    event.preventDefault();
    event.stopPropagation();
    const samples = event.nativeEvent.getCoalescedEvents?.();
    for (const sample of samples?.length ? samples : [event.nativeEvent])
      paintSegment(point(sample));
    if (strokeRef.current?.erased)
      callbacks.current.onErasePreview?.({
        ...strokeRef.current.erased,
        points: [...strokeRef.current.erased.points],
      });
  };
  const cursorSize = width + 4;
  const eraserCursor = `url("data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="${cursorSize}" height="${cursorSize}"><circle cx="${cursorSize / 2}" cy="${cursorSize / 2}" r="${width / 2}" fill="none" stroke="white" stroke-width="3"/><circle cx="${cursorSize / 2}" cy="${cursorSize / 2}" r="${width / 2}" fill="none" stroke="#556457" stroke-width="1"/></svg>`)}") ${cursorSize / 2} ${cursorSize / 2}, crosshair`;
  return (
    <canvas
      ref={canvasRef}
      className={`draw-layer ${active ? 'drawing' : ''} ${active && erasing ? 'erasing' : ''}`}
      aria-label={erasing ? '橡皮擦画布' : '手绘画布'}
      style={active && erasing ? { cursor: eraserCursor } : undefined}
      onPointerDown={start}
      onPointerMove={move}
      onPointerUp={(event) => {
        if (strokeRef.current?.pointerId === event.pointerId) {
          paintSegment(point(event));
          event.stopPropagation();
          finish(event.pointerId);
        }
      }}
      onPointerCancel={(event) => finish(event.pointerId)}
      onLostPointerCapture={(event) => finish(event.pointerId)}
    />
  );
}
