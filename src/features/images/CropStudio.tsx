import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
} from 'react';

type CropTool = 'straight' | 'curve' | 'brush';
type CropAnchor = { x: number; y: number };

export function CropStudio({
  photo,
  onCancel,
  onApply,
}: {
  photo: string;
  onCancel: () => void;
  onApply: (photo: string) => void;
}) {
  const stageRef = useRef<HTMLDivElement>(null);
  const [tool, setTool] = useState<CropTool>('straight');
  const [anchors, setAnchors] = useState<CropAnchor[]>([]);
  const [closed, setClosed] = useState(false);
  const [drawing, setDrawing] = useState(false);
  const [draggingAnchor, setDraggingAnchor] = useState<number | null>(null);
  const [cutting, setCutting] = useState(false);
  const [imageSize, setImageSize] = useState({ width: 1000, height: 750 });
  const viewHeight = (1000 * imageSize.height) / imageSize.width;
  const path = anchors.length
    ? tool === 'curve' && anchors.length > 2
      ? `M ${anchors[0].x} ${anchors[0].y} ${anchors
          .slice(1, -1)
          .map((point, index) => {
            const next = anchors[index + 2];
            return `Q ${point.x} ${point.y} ${(point.x + next.x) / 2} ${(point.y + next.y) / 2}`;
          })
          .join(' ')} L ${anchors.at(-1)?.x} ${anchors.at(-1)?.y}${closed ? ' Z' : ''}`
      : `M ${anchors.map((point) => `${point.x} ${point.y}`).join(' L ')}${closed ? ' Z' : ''}`
    : '';
  const pointFromEvent = (event: ReactPointerEvent<SVGSVGElement>) => {
    const rect = stageRef.current!.getBoundingClientRect();
    return {
      x: Math.max(0, Math.min(1000, ((event.clientX - rect.left) / rect.width) * 1000)),
      y: Math.max(0, Math.min(viewHeight, ((event.clientY - rect.top) / rect.height) * viewHeight)),
    };
  };
  const handlePointerDown = (event: ReactPointerEvent<SVGSVGElement>) => {
    if (cutting) return;
    const anchorIndex = (event.target as SVGElement).getAttribute('data-anchor');
    if (anchorIndex !== null && tool === 'curve') {
      event.preventDefault();
      event.stopPropagation();
      setDraggingAnchor(Number(anchorIndex));
      event.currentTarget.setPointerCapture(event.pointerId);
      return;
    }
    if (closed) return;
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    const point = pointFromEvent(event);
    if (tool === 'brush') {
      setAnchors((points) => [...points, point]);
      setDrawing(true);
    } else setAnchors((points) => [...points, point]);
  };
  const handlePointerMove = (event: ReactPointerEvent<SVGSVGElement>) => {
    if (draggingAnchor !== null) {
      const point = pointFromEvent(event);
      setAnchors((points) =>
        points.map((item, index) => (index === draggingAnchor ? point : item)),
      );
      return;
    }
    if (tool === 'brush' && drawing) {
      const point = pointFromEvent(event);
      setAnchors((points) => {
        const last = points.at(-1);
        if (last && Math.hypot(point.x - last.x, point.y - last.y) < 5) return points;
        return [...points, point];
      });
    }
  };
  const handlePointerUp = () => {
    setDrawing(false);
    setDraggingAnchor(null);
  };
  const applyCrop = async () => {
    if (anchors.length < 3) return;
    setClosed(true);
    setCutting(true);
    await new Promise((resolve) => window.setTimeout(resolve, 950));
    const source = new Image();
    source.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = source.naturalWidth;
      canvas.height = source.naturalHeight;
      const context = canvas.getContext('2d');
      if (!context) {
        setCutting(false);
        return;
      }
      const scale = source.naturalWidth / 1000;
      context.scale(scale, scale);
      context.clip(new Path2D(`${path} Z`));
      context.drawImage(source, 0, 0, 1000, viewHeight);
      try {
        const { data } = context.getImageData(0, 0, canvas.width, canvas.height);
        let left = canvas.width,
          top = canvas.height,
          right = -1,
          bottom = -1;
        for (let y = 0; y < canvas.height; y += 1)
          for (let x = 0; x < canvas.width; x += 1) {
            if (data[(y * canvas.width + x) * 4 + 3] > 2) {
              left = Math.min(left, x);
              top = Math.min(top, y);
              right = Math.max(right, x);
              bottom = Math.max(bottom, y);
            }
          }
        if (right >= left && bottom >= top) {
          const trimmed = document.createElement('canvas');
          trimmed.width = right - left + 1;
          trimmed.height = bottom - top + 1;
          trimmed
            .getContext('2d')
            ?.drawImage(
              canvas,
              left,
              top,
              trimmed.width,
              trimmed.height,
              0,
              0,
              trimmed.width,
              trimmed.height,
            );
          onApply(trimmed.toDataURL('image/png'));
          return;
        }
      } catch {
        /* Retain the full image if pixel access is unavailable. */
      }
      onApply(canvas.toDataURL('image/png'));
    };
    source.onerror = () => setCutting(false);
    source.src = photo;
  };
  return (
    <div className="crop-studio-backdrop" role="dialog" aria-modal="true" aria-label="手账素材裁剪">
      <section className="crop-studio">
        <header className="crop-studio-header">
          <div>
            <span className="eyebrow">PAPER CRAFT · CUTTING TABLE</span>
            <h2>裁成一枚贴纸</h2>
            <p>沿着素材描出轮廓，剪刀会跟随路径完成裁切。</p>
          </div>
          <button className="crop-close" onClick={onCancel} aria-label="取消裁切">
            ×
          </button>
        </header>
        <div className="crop-studio-tools">
          <div className="crop-tool-group">
            <button
              className={tool === 'straight' ? 'active' : ''}
              onClick={() => {
                setTool('straight');
                setClosed(false);
              }}
            >
              直线锚点
            </button>
            <button
              className={tool === 'curve' ? 'active' : ''}
              onClick={() => {
                setTool('curve');
                setClosed(false);
              }}
            >
              曲线锚点
            </button>
            <button
              className={tool === 'brush' ? 'active' : ''}
              onClick={() => {
                setTool('brush');
                setClosed(false);
              }}
            >
              画笔描边
            </button>
          </div>
          <span>
            {tool === 'brush'
              ? '按住并沿素材边缘描画'
              : tool === 'curve'
                ? '逐点放置锚点，拖动锚点微调曲线'
                : '逐点点击，围出素材边缘'}
          </span>
        </div>
        <div
          ref={stageRef}
          className="crop-artboard"
          style={{ aspectRatio: `${imageSize.width} / ${imageSize.height}` }}
        >
          <img
            src={photo}
            alt="待裁切素材"
            onLoad={(event) =>
              setImageSize({
                width: event.currentTarget.naturalWidth,
                height: event.currentTarget.naturalHeight,
              })
            }
            draggable={false}
          />
          <svg
            className="crop-trace"
            viewBox={`0 0 1000 ${viewHeight}`}
            preserveAspectRatio="none"
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerUp}
          >
            {closed && <path d={path} className="crop-fill" />}
            {path && <path d={path} className="crop-stroke" />}
            {anchors.map((point, index) => (
              <circle
                key={index}
                data-anchor={index}
                cx={point.x}
                cy={point.y}
                r={tool === 'curve' ? 12 : 5}
                className={`crop-anchor ${tool === 'curve' ? 'can-drag' : ''}`}
              />
            ))}
            {cutting && (
              <text className="crop-scissors" fontSize="40" textAnchor="middle">
                ✂<animateMotion dur=".9s" repeatCount="1" rotate="auto" path={`${path} Z`} />
              </text>
            )}
          </svg>
        </div>
        <footer className="crop-studio-footer">
          <div className="crop-step-actions">
            <button
              onClick={() => {
                setAnchors((points) => points.slice(0, -1));
                setClosed(false);
              }}
              disabled={!anchors.length || cutting}
            >
              撤销锚点
            </button>
            <button
              onClick={() => {
                setAnchors([]);
                setClosed(false);
              }}
              disabled={!anchors.length || cutting}
            >
              清空重画
            </button>
            <button onClick={() => setClosed(true)} disabled={anchors.length < 3 || cutting}>
              闭合裁切线
            </button>
          </div>
          <div>
            <button className="crop-cancel" onClick={onCancel} disabled={cutting}>
              取消
            </button>
            <button
              className="crop-apply"
              onClick={applyCrop}
              disabled={anchors.length < 3 || cutting}
            >
              {cutting ? '剪刀裁切中…' : '✂ 生成透明贴纸'}
            </button>
          </div>
        </footer>
      </section>
    </div>
  );
}
