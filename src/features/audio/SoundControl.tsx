import { useState } from 'react';
import { Volume2, VolumeX, X } from 'lucide-react';

export function SoundControl({
  enabled,
  volume,
  onEnabledChange,
  onVolumeChange,
}: {
  enabled: boolean;
  volume: number;
  onEnabledChange: (enabled: boolean) => void;
  onVolumeChange: (volume: number) => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="sound-control">
      <button
        className="icon-button"
        title="音效控制"
        aria-label="音效控制"
        aria-expanded={open}
        onClick={() => setOpen(!open)}
      >
        {enabled && volume > 0 ? <Volume2 size={16} /> : <VolumeX size={16} />}
      </button>
      {open && (
        <div
          className="sound-control-panel"
          role="group"
          aria-label="统一音效设置"
          onKeyDown={(event) => {
            if (event.key === 'Escape') setOpen(false);
          }}
        >
          <div className="sound-control-heading">
            <span>声音</span>
            <button
              className="icon-button"
              aria-label="关闭音效设置"
              onClick={() => setOpen(false)}
            >
              <X size={14} />
            </button>
          </div>
          <button
            className={`sound-master-toggle ${enabled ? 'active' : ''}`}
            aria-pressed={enabled}
            onClick={() => onEnabledChange(!enabled)}
          >
            {enabled ? <Volume2 size={15} /> : <VolumeX size={15} />}
            {enabled ? '声音已开启' : '声音已关闭'}
          </button>
          <label className="sound-volume">
            <span>音量</span>
            <input
              aria-label="统一音量"
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={volume}
              onChange={(event) => onVolumeChange(Number(event.target.value))}
            />
            <small>{Math.round(volume * 100)}%</small>
          </label>
          <p>统一控制页面音乐、翻书声和风铃声</p>
        </div>
      )}
    </div>
  );
}
