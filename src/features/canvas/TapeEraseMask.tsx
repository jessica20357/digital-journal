import type { EraserStroke } from '../../domain/journal';

export function TapeEraseMask({ id, strokes }: { id: string; strokes: EraserStroke[] }) {
  return (
    <mask
      id={id}
      maskUnits="userSpaceOnUse"
      maskContentUnits="userSpaceOnUse"
      x="0"
      y="0"
      width="100"
      height="100"
      style={{ maskType: 'luminance' }}
    >
      <rect width="100" height="100" fill="white" />
      {strokes.map((stroke, index) => {
        if (!stroke.points.length) return null;
        // Compensate for the spread's aspect ratio so the eraser stays circular.
        const ratio = stroke.sizeY / stroke.sizeX;
        const first = stroke.points[0];
        const path = stroke.points
          .map((point, i) => `${i ? 'L' : 'M'} ${point.x * 100} ${(point.y * 100) / ratio}`)
          .join(' ');
        return (
          <g key={index} transform={`scale(1 ${ratio})`} fill="black" stroke="black">
            <circle
              cx={first.x * 100}
              cy={(first.y * 100) / ratio}
              r={stroke.sizeX * 50}
              stroke="none"
            />
            <path
              d={path}
              fill="none"
              strokeWidth={stroke.sizeX * 100}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </g>
        );
      })}
    </mask>
  );
}
