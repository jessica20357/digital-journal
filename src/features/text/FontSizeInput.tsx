import { useEffect, useState } from 'react';

export function FontSizeInput({
  value,
  onChange,
}: {
  value: number;
  onChange: (value: number) => void;
}) {
  const [draft, setDraft] = useState(String(value));
  useEffect(() => setDraft(String(value)), [value]);
  return (
    <label className="font-size-control">
      字号
      <input
        aria-label="字体大小"
        type="number"
        min="8"
        max="160"
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === 'Enter') event.currentTarget.blur();
        }}
        onBlur={() => {
          const size = Math.round(Number(draft));
          if (draft && Number.isFinite(size)) {
            const clamped = Math.max(8, Math.min(160, size));
            onChange(clamped);
            setDraft(String(clamped));
          } else setDraft(String(value));
        }}
      />
    </label>
  );
}
