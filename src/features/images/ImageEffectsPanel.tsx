import { useState } from 'react';
import { ChevronDown, ImagePlus } from 'lucide-react';

export type ImageEffects = {
  stickerStyle?: 'photo' | 'outline' | 'dimensional' | 'sticker';
  stickerVariant?: 'soft' | 'label' | 'stamp' | 'pastel';
  stickerOutline?: boolean;
  stickerOutlineColor?: string;
  stickerOutlineWidth?: number;
  stickerDimensional?: boolean;
  useCutout?: boolean;
  cutoutMode?: 'manual' | 'background';
};

type Props = {
  locked?: boolean;
  images: { id: string; name: string }[];
  targetId: string | null;
  effects: ImageEffects;
  hasManualCutout: boolean;
  processing: boolean;
  onSelect: (id: string) => void;
  onChange: (patch: ImageEffects) => void;
  onRemoveBackground: () => void;
  onUpload: () => void;
};

const variants = [
  { id: 'soft', name: '柔边贴纸' },
  { id: 'label', name: '标签卡片' },
  { id: 'stamp', name: '邮票边框' },
  { id: 'pastel', name: '粉彩底纸' },
] as const;

export function ImageEffectsPanel({
  images,
  targetId,
  effects,
  hasManualCutout,
  processing,
  locked = false,
  onSelect,
  onChange,
  onRemoveBackground,
  onUpload,
}: Props) {
  const [outlineOpen, setOutlineOpen] = useState(false);
  const outlined = Boolean(effects.stickerOutline || effects.stickerStyle === 'outline');
  const dimensional = Boolean(effects.stickerDimensional || effects.stickerStyle === 'dimensional');
  const sticker = effects.stickerStyle === 'sticker';
  const active = Boolean(targetId);
  return (
    <section className="inspector-section image-effects-section" aria-label="图片效果与贴纸样式">
      <div className="section-label">
        <span>图片效果</span>
        <button className="text-link" onClick={onUpload}>
          <ImagePlus size={13} />
          添加图片
        </button>
      </div>
      {active ? (
        <label className="image-effect-target">
          <span>应用到</span>
          <select
            aria-label="应用效果的图片"
            value={targetId!}
            onChange={(event) => onSelect(event.target.value)}
          >
            {images.map((image) => (
              <option key={image.id} value={image.id}>
                {image.name}
              </option>
            ))}
          </select>
        </label>
      ) : (
        <p className="image-effects-hint">添加图片后，即可使用抠图、描边和贴纸样式。</p>
      )}
      {active && locked && (
        <p className="image-effects-hint">此素材已锁定，请在页面组件中解锁后编辑。</p>
      )}
      <fieldset className="sticker-effect-picker" disabled={!active || processing || locked}>
        <legend className="sr-only">图片效果设置</legend>
        <div className="sticker-effect-toggles">
          <button
            className={!effects.useCutout && !outlined && !dimensional && !sticker ? 'active' : ''}
            aria-pressed={active && !effects.useCutout && !outlined && !dimensional && !sticker}
            onClick={() =>
              onChange({
                stickerStyle: 'photo',
                stickerOutline: false,
                stickerDimensional: false,
                useCutout: false,
              })
            }
          >
            原图
          </button>
          <button
            className={effects.useCutout && effects.cutoutMode === 'background' ? 'active' : ''}
            aria-pressed={Boolean(effects.useCutout && effects.cutoutMode === 'background')}
            onClick={onRemoveBackground}
          >
            {processing ? '抠图中…' : '一键去背景'}
          </button>
          {hasManualCutout && (
            <button
              className={effects.useCutout && effects.cutoutMode === 'manual' ? 'active' : ''}
              onClick={() =>
                onChange({
                  useCutout: !(effects.useCutout && effects.cutoutMode === 'manual'),
                  cutoutMode: 'manual',
                })
              }
            >
              手动抠图
            </button>
          )}
          <div className="outline-dropdown">
            <button
              className={outlined ? 'active' : ''}
              aria-expanded={outlineOpen}
              onClick={() => setOutlineOpen(!outlineOpen)}
            >
              描边
              <ChevronDown size={12} />
            </button>
            {outlineOpen && (
              <div className="outline-dropdown-menu">
                <button
                  className={`outline-enable ${outlined ? 'active' : ''}`}
                  aria-pressed={outlined}
                  onClick={() =>
                    onChange({
                      stickerOutline: !outlined,
                      stickerDimensional: dimensional,
                      stickerStyle: sticker ? 'sticker' : 'photo',
                    })
                  }
                >
                  <span className="outline-check">{outlined ? '✓' : ''}</span>启用描边
                </button>
                <label className="outline-color-control">
                  <span>描边颜色</span>
                  <input
                    type="color"
                    aria-label="描边颜色"
                    value={effects.stickerOutlineColor || '#fffdf7'}
                    onChange={(event) => onChange({ stickerOutlineColor: event.target.value })}
                  />
                </label>
                <label className="outline-width-control">
                  <span>描边粗细</span>
                  <input
                    type="range"
                    min="0.5"
                    max="6"
                    step="0.5"
                    aria-label="描边粗细"
                    value={effects.stickerOutlineWidth ?? 1}
                    onChange={(event) =>
                      onChange({ stickerOutlineWidth: Number(event.target.value) })
                    }
                  />
                  <small>{effects.stickerOutlineWidth ?? 1}px</small>
                </label>
              </div>
            )}
          </div>
          <button
            className={dimensional ? 'active' : ''}
            aria-pressed={dimensional}
            onClick={() =>
              onChange({
                stickerDimensional: !dimensional,
                stickerOutline: outlined,
                stickerStyle: sticker ? 'sticker' : 'photo',
              })
            }
          >
            立体
          </button>
          <button
            className={sticker ? 'active' : ''}
            aria-pressed={sticker}
            onClick={() =>
              onChange({
                stickerStyle: sticker ? 'photo' : 'sticker',
                stickerVariant: effects.stickerVariant || 'soft',
                stickerOutline: outlined,
                stickerDimensional: dimensional,
              })
            }
          >
            贴纸样式
          </button>
        </div>
        <span className="image-effects-subtitle">贴纸样式</span>
        <div className="sticker-variant-picker">
          {variants.map((variant) => (
            <button
              key={variant.id}
              aria-label={variant.name}
              className={
                sticker && (effects.stickerVariant || 'soft') === variant.id ? 'active' : ''
              }
              aria-pressed={sticker && (effects.stickerVariant || 'soft') === variant.id}
              onClick={() =>
                onChange({
                  stickerStyle: 'sticker',
                  stickerVariant: variant.id,
                  stickerOutline: outlined,
                  stickerDimensional: dimensional,
                })
              }
            >
              {variant.name}
            </button>
          ))}
        </div>
      </fieldset>
    </section>
  );
}
