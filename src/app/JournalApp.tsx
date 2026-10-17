import {
  ChangeEvent,
  CSSProperties,
  PointerEvent as ReactPointerEvent,
  useEffect,
  useRef,
  useState,
} from 'react';
import { createPortal } from 'react-dom';
import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  ArrowDownToLine,
  ArrowLeft,
  ArrowRight,
  Bold,
  Check,
  ChevronDown,
  Cloud,
  CloudRain,
  CloudSnow,
  Copy,
  Crop,
  Eye,
  EyeOff,
  GripVertical,
  Eraser,
  Highlighter,
  ImagePlus,
  Italic,
  Layers2,
  Lock,
  Minus,
  MoreHorizontal,
  Move,
  Music2,
  Palette,
  Pause,
  Play,
  Plus,
  Redo2,
  RotateCcw,
  RotateCw,
  Save,
  Sparkles,
  Sun,
  Type,
  Underline,
  Undo2,
  Unlock,
  Upload,
  WandSparkles,
  X,
  Ribbon,
  Volume2,
  VolumeX,
  Trash2,
} from 'lucide-react';
import type {
  BackgroundTemplate,
  CanvasImage,
  CanvasShape,
  CanvasTextBox,
  DragTarget,
  EraserStroke,
  LibrarySeed,
  Page,
  PageComponent,
  ShelfBook,
  ShelfWeather,
  StickerStyle,
  StickerVariant,
  TapeMaterial,
  TapeStroke,
  TapeTexture,
  TextComponent,
  TextStyle,
  Weather,
} from '../domain/journal';
import {
  shapeHandles,
  defaultComponentOrder,
  componentLabels,
  initialPages,
  paperStyleNames,
  paperColors,
  getPagePaperStyle,
  getPagePaperColor,
  getPageLeftPaperColor,
  getPagePaperColorValue,
  getPageLeftPaperColorValue,
  pagePaperClass,
} from '../config/journal';
import { ImageEffectsPanel } from '../features/images/ImageEffectsPanel';
import { CropStudio } from '../features/images/CropStudio';
import { fittedImageBox } from '../features/images/imageBounds';
import { autoRemoveBackground } from '../features/images/removeBackground';
import { DrawingLayer } from '../features/canvas/DrawingLayer';
import { TapeEraseMask } from '../features/canvas/TapeEraseMask';
import { preserveLockedComponents } from '../features/canvas/componentLocks';
import { SoundControl } from '../features/audio/SoundControl';
import { FontSizeInput } from '../features/text/FontSizeInput';
import {
  defaultTextStyle,
  textStyleFor,
  plainTextHtml,
  sanitizeRichText,
} from '../features/text/richText';
import type { JournalTheme } from '../domain/journal';
import { migratePageToSpread } from '../storage/legacy';
import { PageWeatherFx, WorkbenchWeatherFx } from '../features/weather/WeatherEffects';
import { OpeningBook3D } from '../features/books/OpeningBook3D';
import { BookCover3D } from '../features/books/BookCover3D';
import { BookmarkChimes } from '../features/books/BookmarkChimes';
import { writeLibrary } from '../storage/library';
import { loadWallpaper, loadBackgroundTemplates } from '../storage/preferences';
import {
  saveJournalMusic,
  loadJournalMusic,
  deleteJournalMusic,
  saveJournalImage,
  loadJournalImage,
} from '../storage/assets';
import { scenic } from '../assets/scenery';

export function JournalApp({ librarySeed }: { librarySeed: LibrarySeed }) {
  const [screen, setScreen] = useState<'shelf' | 'editor'>('shelf');
  const [hideTools, setHideTools] = useState(false);
  const [wallpaper, setWallpaper] = useState(loadWallpaper);
  const [shelfWeather, setShelfWeather] = useState<ShelfWeather>(() => {
    try {
      const saved = localStorage.getItem('yepaper-shelf-weather');
      return saved === 'normal' || saved === 'rain' || saved === 'snow' ? saved : 'rain';
    } catch {
      return 'rain';
    }
  });
  const [shelfWeatherIntensity, setShelfWeatherIntensity] = useState(2);
  const [weatherIntensityOpen, setWeatherIntensityOpen] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(() => {
    try {
      return localStorage.getItem('yepaper-sound-enabled') !== 'false';
    } catch {
      return true;
    }
  });
  const [backgroundTemplates, setBackgroundTemplates] =
    useState<BackgroundTemplate[]>(loadBackgroundTemplates);
  const [shelfBooks, setShelfBooks] = useState<ShelfBook[]>(librarySeed.books);
  const [bookTitle, setBookTitle] = useState('夏日收集册');
  const [notebookPages, setNotebookPages] = useState<Record<string, Page[]>>(librarySeed.pages);
  const [activeBookId, setActiveBookId] = useState(librarySeed.books[0]?.id || '');
  const [pages, setPages] = useState<Page[]>(
    () => librarySeed.pages[librarySeed.books[0]?.id] || initialPages.map(migratePageToSpread),
  );
  const [imageAssetUrls, setImageAssetUrls] = useState<Record<string, string>>({});
  const loadedImageAssetsRef = useRef(new Set<string>());
  const imageObjectUrlsRef = useRef<string[]>([]);
  const [activeId, setActiveId] = useState(pages[0]?.id ?? 'p1');
  const latestEditorRef = useRef({ pages, activeBookId, activeId });
  latestEditorRef.current = { pages, activeBookId, activeId };
  const [mode, setMode] = useState<'edit' | 'read'>('edit');
  const [panel, setPanel] = useState<'paper' | 'sticker' | 'shapes' | 'ai' | 'upload' | null>(null);
  const [shapesOpen, setShapesOpen] = useState(false);
  const [paperPanelPosition, setPaperPanelPosition] = useState<{
    left: number;
    bottom: number;
  } | null>(null);
  const [paperColorSide, setPaperColorSide] = useState<'left' | 'right'>('right');
  const [musicPanelOpen, setMusicPanelOpen] = useState(false);
  const [musicSource, setMusicSource] = useState<string | null>(null);
  const [musicPlaying, setMusicPlaying] = useState(false);
  const [soundVolume, setSoundVolume] = useState(() => {
    try {
      const saved = localStorage.getItem('yepaper-sound-volume');
      const value = saved === null ? 0.5 : Number(saved);
      return Number.isFinite(value) ? Math.max(0, Math.min(1, value)) : 0.5;
    } catch {
      return 0.5;
    }
  });
  const [musicPaused, setMusicPaused] = useState(false);
  const [status, setStatus] = useState('已保存');
  const [selected, setSelected] = useState<PageComponent | null>(null);
  const [selectedCanvasTextId, setSelectedCanvasTextId] = useState<string | null>(null);
  const [selectedCanvasImageId, setSelectedCanvasImageId] = useState<string | null>(null);
  const [selectedCanvasShapeId, setSelectedCanvasShapeId] = useState<string | null>(null);
  const [aiPrompt, setAiPrompt] = useState('一朵透明质感的蓝色小花，手绘水彩风');
  const [generating, setGenerating] = useState(false);
  const [cutoutProcessing, setCutoutProcessing] = useState(false);
  const [imageEffectSelection, setImageEffectSelection] = useState<{
    pageId: string;
    imageId: string;
  } | null>(null);
  const [toast, setToast] = useState('');
  const [size, setSize] = useState('竖版手账');
  const [customPageWidth, setCustomPageWidth] = useState(148);
  const [customPageHeight, setCustomPageHeight] = useState(210);
  const [sizeMenu, setSizeMenu] = useState(false);
  const [editingTitle, setEditingTitle] = useState(false);
  const [wallpaperPicker, setWallpaperPicker] = useState(false);
  const [coverEditorIndex, setCoverEditorIndex] = useState<number | null>(null);
  const [deleteBookId, setDeleteBookId] = useState<string | null>(null);
  const corridorRef = useRef<HTMLDivElement>(null);
  const [coverDraftColor, setCoverDraftColor] = useState('#b5b39e');
  const [ribbonDraftColor, setRibbonDraftColor] = useState('#ece3cc');
  const [coverDraftImage, setCoverDraftImage] = useState<string | undefined>();
  const [openingBook, setOpeningBook] = useState<{ book: ShelfBook } | null>(null);
  const [pageTurn, setPageTurn] = useState<{ direction: 'next' | 'previous'; page: Page } | null>(
    null,
  );
  const [draggedLayer, setDraggedLayer] = useState<PageComponent | null>(null);
  const [dropTargetLayer, setDropTargetLayer] = useState<string | null>(null);
  const [draggedCanvasImageId, setDraggedCanvasImageId] = useState<string | null>(null);
  const [history, setHistory] = useState<Page[][]>([]);
  const [future, setFuture] = useState<Page[][]>([]);
  const flipAudioRef = useRef<HTMLAudioElement | null>(null);
  const bookMusicRef = useRef<HTMLAudioElement | null>(null);
  const bookMusicUrlRef = useRef<string | null>(null);
  const bookMusicFileRef = useRef<HTMLInputElement>(null);
  const togglePaperPanel = (button: HTMLButtonElement) => {
    const rect = (button.closest('.paper-tools') || button).getBoundingClientRect();
    const width = Math.min(430, window.innerWidth - 32);
    const left = Math.max(16, Math.min(rect.right - width, window.innerWidth - width - 16));
    setPaperPanelPosition({ left, bottom: Math.max(16, window.innerHeight - rect.top + 10) });
    setPanel((current) => (current === 'paper' ? null : 'paper'));
  };
  const setSpreadPaperColor = (color: string, side = paperColorSide) =>
    snapshot(
      pages.map((item) =>
        item.id === activeId
          ? { ...item, [side === 'left' ? 'leftPaperColor' : 'rightPaperColor']: color }
          : item,
      ),
    );
  const togglePageControlsLock = () => {
    const shouldLock = !page.controlsLocked;
    snapshot(
      pages.map((item) => (item.id === activeId ? { ...item, controlsLocked: shouldLock } : item)),
    );
    if (shouldLock) {
      setSelected(null);
      setSelectedCanvasTextId(null);
      setSelectedCanvasImageId(null);
      setSelectedCanvasShapeId(null);
    }
    setToast(shouldLock ? '页面控件已锁定，可在图片上绘制纸胶带' : '页面控件已解锁');
  };
  const [cropMode, setCropMode] = useState(false);
  const [brush, setBrush] = useState(false);
  const [eraser, setEraser] = useState(false);
  const [eraserWidth, setEraserWidth] = useState(32);
  const [erasePreview, setErasePreview] = useState<{ pageId: string; stroke: EraserStroke } | null>(
    null,
  );
  const [brushColor, setBrushColor] = useState('#725958');
  const [brushWidth, setBrushWidth] = useState(3);
  const [tapeMode, setTapeMode] = useState(false);
  const [tapeMaterial, setTapeMaterial] = useState<TapeMaterial>('washi');
  const [tapeTexture, setTapeTexture] = useState<TapeTexture>('floral');
  const [tapeTextureId, setTapeTextureId] = useState<string | undefined>();
  const [tapeWidth, setTapeWidth] = useState(24);
  const [tapeDraft, setTapeDraft] = useState<TapeStroke | null>(null);
  const tapeDraftRef = useRef<TapeStroke | null>(null);
  const componentClipboardRef = useRef<
    | { kind: 'text'; text: string; style?: Partial<TextStyle> }
    | {
        kind: 'image';
        src: string;
        rotation?: number;
        stickerStyle?: StickerStyle;
        stickerVariant?: StickerVariant;
        stickerOutline?: boolean;
        stickerOutlineColor?: string;
        stickerOutlineWidth?: number;
        stickerDimensional?: boolean;
      }
    | null
  >(null);
  const canvasRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLInputElement>(null);
  const coverFileRef = useRef<HTMLInputElement>(null);
  const tapeTextureFileRef = useRef<HTMLInputElement>(null);

  const dragRef = useRef<{
    target: DragTarget;
    id?: string;
    x: number;
    y: number;
    originX: number;
    originY: number;
    canvasWidth: number;
    canvasHeight: number;
    cssScaleX: number;
    cssScaleY: number;
    maxX: number;
    maxY: number;
    element: HTMLElement;
    nextX: number;
    nextY: number;
  } | null>(null);
  const pointerFrameRef = useRef(0);
  const pendingPointerRef = useRef<{ clientX: number; clientY: number; shiftKey: boolean } | null>(
    null,
  );
  const textResizeRef = useRef<{
    id: string;
    x: number;
    y: number;
    width: number;
    height: number;
    canvasWidth: number;
    canvasHeight: number;
    element: HTMLElement;
    nextWidth: number;
    nextHeight: number;
  } | null>(null);
  const resizeRef = useRef<{
    target: 'media' | 'sticker' | 'canvasImage' | 'title';
    id?: string;
    x: number;
    y: number;
    scale: number;
    scaleY: number;
    width: number;
    height: number;
    rotation: number;
    canvasWidth: number;
    canvasHeight: number;
    position: { x: number; y: number };
    nextPosition: { x: number; y: number };
    size: number;
    element: HTMLElement;
    nextScale: number;
    nextScaleY: number;
  } | null>(null);
  const rotateRef = useRef<{
    target: 'media' | 'canvasImage' | 'canvasShape';
    id?: string;
    centerX: number;
    centerY: number;
    startAngle: number;
    rotation: number;
    nextRotation: number;
    scale: number;
    scaleY: number;
    element: HTMLElement;
  } | null>(null);
  const shapeResizeRef = useRef<{
    id: string;
    startX: number;
    startY: number;
    x: number;
    y: number;
    width: number;
    height: number;
    canvasWidth: number;
    canvasHeight: number;
    rotation: number;
    handleX: number;
    handleY: number;
    element: HTMLElement;
    next: Pick<CanvasShape, 'x' | 'y' | 'width' | 'height'>;
  } | null>(null);
  useEffect(
    () => () => {
      if (pointerFrameRef.current) cancelAnimationFrame(pointerFrameRef.current);
      pointerFrameRef.current = 0;
      pendingPointerRef.current = null;
      const drag = dragRef.current;
      if (drag) {
        Object.assign(drag.element.style, {
          left: `${(drag.originX / drag.canvasWidth) * 100}%`,
          top: `${(drag.originY / drag.canvasHeight) * 100}%`,
          translate: '',
        });
        drag.element.classList.remove('is-dragging');
      }
      rotateRef.current?.element.classList.remove('is-rotating');
      dragRef.current = null;
      resizeRef.current = null;
      rotateRef.current = null;
      textResizeRef.current = null;
      shapeResizeRef.current = null;
      canvasRef.current?.classList.remove('component-transforming');
    },
    [activeId, screen],
  );
  const richTextRef = useRef<HTMLDivElement>(null);
  const textSelectionRef = useRef<Range | null>(null);
  const preserveRichTextDomRef = useRef(false);
  const turnTimerRef = useRef<number[]>([]);
  const swipeStartRef = useRef<{ x: number; y: number } | null>(null);
  const page = pages.find((p) => p.id === activeId) ?? pages[0];
  const resolveImageSrc = (source?: string) => {
    if (!source?.startsWith('asset:')) return source || '';
    return imageAssetUrls[source.slice(6)] || '';
  };
  const activeBook = shelfBooks.find((book) => book.id === activeBookId);
  const selectedCanvasImage = page.canvasImages?.find(
    (image) => image.id === selectedCanvasImageId,
  );
  const imageElementsRef = useRef(new Map<string, HTMLDivElement>());
  const imageControlsRef = useRef<HTMLDivElement>(null);
  const imageControlId = selected === 'media' ? selectedCanvasImageId || 'primary' : null;
  const imageControlData =
    imageControlId === 'primary'
      ? {
          x: page.mediaPos.x,
          y: page.mediaPos.y,
          width: page.mediaWidth ?? 22.5,
          height: page.mediaHeight ?? 30,
          rotation: page.mediaRotation ?? 0,
          scale: page.mediaScale,
          scaleY: page.mediaScaleY ?? page.mediaScale,
        }
      : selectedCanvasImage;
  const imageControlsVisible =
    imageControlId &&
    imageControlData &&
    mode === 'edit' &&
    !hideTools &&
    !page.controlsLocked &&
    !brush &&
    !eraser &&
    !tapeMode &&
    !cropMode &&
    (imageControlId === 'primary'
      ? Boolean(page.photo) &&
        !(page.hiddenComponents || []).includes('media') &&
        !(page.removedComponents || []).includes('media')
      : !selectedCanvasImage?.hidden) &&
    !(page.lockedLayers || []).includes(
      imageControlId === 'primary' ? 'media' : `canvas-image:${imageControlId}`,
    );
  const transformElement = (handle: HTMLElement) =>
    handle.parentElement?.classList.contains('image-transform-controls')
      ? imageElementsRef.current.get(handle.parentElement.dataset.imageId!) || null
      : handle.parentElement;
  const controlScaleStyle = (scaleX: number, scaleY = scaleX): CSSProperties =>
    ({
      '--control-inverse-scale-x': 1 / Math.max(0.1, scaleX),
      '--control-inverse-scale-y': 1 / Math.max(0.1, scaleY),
    }) as CSSProperties;
  const syncControlScale = (element: HTMLElement, scaleX: number, scaleY = scaleX) => {
    element.style.setProperty('--control-inverse-scale-x', String(1 / Math.max(0.1, scaleX)));
    element.style.setProperty('--control-inverse-scale-y', String(1 / Math.max(0.1, scaleY)));
  };
  const syncImageControls = (element: HTMLElement) => {
    const controls = imageControlsRef.current;
    if (!controls || imageElementsRef.current.get(controls.dataset.imageId!) !== element) return;
    Object.assign(controls.style, {
      left: element.style.left,
      top: element.style.top,
      transform: element.style.transform,
      translate: element.style.translate,
    });
    for (const property of ['--control-inverse-scale-x', '--control-inverse-scale-y']) {
      controls.style.setProperty(property, element.style.getPropertyValue(property));
    }
  };
  const effectImages = [
    ...(page.photo ? [{ id: 'primary', name: '图片 1' }] : []),
    ...(page.canvasImages || []).map((image, index) => ({
      id: image.id,
      name: image.name || `图片 ${index + (page.photo ? 2 : 1)}`,
    })),
  ];
  const focusedImageId =
    selected === 'media' ? selectedCanvasImage?.id || (page.photo ? 'primary' : null) : null;
  const rememberedImageId =
    imageEffectSelection?.pageId === page.id ? imageEffectSelection.imageId : null;
  const effectImageId =
    [focusedImageId, rememberedImageId, effectImages[0]?.id].find((id) =>
      effectImages.some((image) => image.id === id),
    ) || null;
  const effectCanvasImage = page.canvasImages?.find((image) => image.id === effectImageId);
  const imageEffectTarget = effectCanvasImage || page;
  useEffect(() => {
    if (focusedImageId) setImageEffectSelection({ pageId: page.id, imageId: focusedImageId });
  }, [focusedImageId, page.id]);
  const selectedPhotoForCrop = resolveImageSrc(selectedCanvasImage?.src || page.photo);
  const spreadRatio =
    size === '竖版手账'
      ? 296 / 210
      : size === '方形手账'
        ? 2
        : size === '横版手账'
          ? 420 / 148
          : (customPageWidth * 2) / customPageHeight;
  useEffect(() => {
    try {
      localStorage.setItem('yepaper-shelf-weather', shelfWeather);
    } catch {
      /* weather choice remains usable if storage is unavailable */
    }
  }, [shelfWeather]);
  useEffect(() => {
    try {
      localStorage.setItem('yepaper-sound-enabled', String(soundEnabled));
    } catch {
      /* sound toggle remains usable if storage is unavailable */
    }
  }, [soundEnabled]);
  useEffect(() => {
    try {
      localStorage.setItem('yepaper-sound-volume', String(soundVolume));
    } catch {
      /* keep session volume */
    }
    if (bookMusicRef.current) {
      bookMusicRef.current.volume = soundVolume;
      bookMusicRef.current.muted = !soundEnabled;
    }
    if (flipAudioRef.current) {
      flipAudioRef.current.volume = soundVolume;
      flipAudioRef.current.muted = !soundEnabled;
    }
  }, [soundEnabled, soundVolume]);
  useEffect(() => {
    const audio = bookMusicRef.current;
    let cancelled = false;
    let url: string | null = null;
    audio?.pause();
    if (audio) {
      audio.removeAttribute('src');
      audio.load();
    }
    setMusicPlaying(false);
    setMusicSource(null);
    setMusicPaused(false);
    const track = page.backgroundMusic;
    if (screen === 'editor' && track)
      loadJournalMusic(track.id)
        .then((file) => {
          if (cancelled) return;
          if (!file) {
            setToast('此页音乐文件未找到，请重新上传');
            return;
          }
          url = URL.createObjectURL(file);
          bookMusicUrlRef.current = url;
          if (audio) {
            audio.src = url;
            audio.load();
          }
          setMusicSource(url);
        })
        .catch(() => {
          if (!cancelled) setToast('读取此页背景音乐失败');
        });
    return () => {
      cancelled = true;
      audio?.pause();
      if (url) URL.revokeObjectURL(url);
      bookMusicUrlRef.current = null;
    };
  }, [activeBookId, screen, page.id, page.backgroundMusic?.id]);
  useEffect(() => {
    const audio = bookMusicRef.current;
    let cancelled = false;
    if (
      !audio ||
      !musicSource ||
      audio.getAttribute('src') !== musicSource ||
      !soundEnabled ||
      musicPaused ||
      screen !== 'editor'
    ) {
      audio?.pause();
      setMusicPlaying(false);
      return;
    }
    audio.muted = false;
    audio.volume = soundVolume;
    void audio
      .play()
      .then(() => {
        if (
          !cancelled &&
          audio.getAttribute('src') === musicSource &&
          !audio.paused &&
          !audio.muted
        )
          setMusicPlaying(true);
      })
      .catch(() => {
        if (!cancelled && audio.getAttribute('src') === musicSource) {
          setMusicPlaying(false);
          setToast('点击页面音乐中的播放按钮，即可开始播放');
        }
      });
    return () => {
      cancelled = true;
    };
  }, [musicSource, soundEnabled, musicPaused, screen]);
  useEffect(() => {
    const sources = pages.flatMap((item) => [
      item.photo,
      item.photoCutout,
      item.backgroundCutout,
      ...(item.canvasImages || []).flatMap((image) => [
        image.src,
        image.cutoutSrc,
        image.backgroundCutout,
      ]),
    ]);
    const ids = new Set(
      sources
        .filter((source): source is string => Boolean(source?.startsWith('asset:')))
        .map((source) => source.slice(6)),
    );
    ids.forEach((id) => {
      if (loadedImageAssetsRef.current.has(id)) return;
      loadedImageAssetsRef.current.add(id);
      loadJournalImage(id)
        .then((blob) => {
          if (!blob) return;
          const url = URL.createObjectURL(blob);
          imageObjectUrlsRef.current.push(url);
          setImageAssetUrls((current) => ({ ...current, [id]: url }));
        })
        .catch(() => setToast('读取已保存图片失败，请重新导入图片'));
    });
  }, [pages]);
  useEffect(
    () => () => {
      imageObjectUrlsRef.current.forEach((url) => URL.revokeObjectURL(url));
    },
    [],
  );

  const hidden = (component: PageComponent) =>
    (page.hiddenComponents?.includes(component) ?? false) ||
    (page.removedComponents?.includes(component) ?? false);
  const componentPosition = (component: PageComponent, fallback: { x: number; y: number }) =>
    page.componentPositions?.[component] ?? fallback;
  const componentStyle = (
    component: PageComponent,
    fallback: { x: number; y: number },
  ): CSSProperties => {
    const position = componentPosition(component, fallback);
    return { left: `${position.x}%`, top: `${position.y}%` };
  };
  const componentOrderFor = (target: Page) => {
    const savedOrder = target.componentOrder || [];
    const removed = new Set(target.removedComponents || []);
    return [
      ...savedOrder.filter(
        (item, index) =>
          defaultComponentOrder.includes(item) &&
          !removed.has(item) &&
          savedOrder.indexOf(item) === index,
      ),
      ...defaultComponentOrder.filter((item) => !removed.has(item) && !savedOrder.includes(item)),
    ];
  };
  const mediaOrderFor = (target: Page) => {
    const available = ['primary', ...(target.canvasImages || []).map((image) => image.id)];
    const saved =
      target.layerOrder
        ?.filter((key) => key === 'media' || key.startsWith('canvas-image:'))
        .map((key) => (key === 'media' ? 'primary' : key.slice('canvas-image:'.length))) ||
      target.mediaOrder ||
      [];
    return [
      ...saved.filter((id, index) => available.includes(id) && saved.indexOf(id) === index),
      ...available.filter((id) => !saved.includes(id)),
    ];
  };
  const layerOrderFor = (target: Page): string[] => {
    const components = componentOrderFor(target);
    const mediaLayers = mediaOrderFor(target)
      .filter((id) => id !== 'primary')
      .map((id) => `canvas-image:${id}`);
    const expanded = components.flatMap((component) =>
      component === 'media' ? ['media', ...mediaLayers] : [component],
    );
    if (!components.includes('media')) expanded.push(...mediaLayers);
    const available = new Set(expanded);
    const saved = target.layerOrder || [];
    return [
      ...saved.filter((key, index) => available.has(key) && saved.indexOf(key) === index),
      ...expanded.filter((key) => !saved.includes(key)),
    ];
  };
  const layerZIndex = (target: Page, key: string) =>
    (layerOrderFor(target).length + 1 - layerOrderFor(target).indexOf(key)) * 10_000;
  const componentLayerZIndex = (target: Page, component: PageComponent) =>
    layerZIndex(target, component);
  const mediaItemZIndex = (target: Page, id: string) =>
    layerZIndex(target, id === 'primary' ? 'media' : `canvas-image:${id}`);
  const componentLayerVariables = (target: Page): CSSProperties => {
    const tapeLayer = Math.max(
      2_000_002,
      (layerOrderFor(target).length + 2) * 10_000 + (target.canvasShapes?.length || 0),
    );
    return Object.fromEntries([
      ...defaultComponentOrder.map((component) => [
        `--layer-${component}`,
        String(componentLayerZIndex(target, component)),
      ]),
      ['--layer-tape', String(tapeLayer)],
    ]) as CSSProperties;
  };
  const styledText = (component: TextComponent): CSSProperties => {
    const style = textStyleFor(page, component);
    return {
      fontFamily: style.fontFamily,
      fontSize: style.fontSize,
      color: style.color,
      backgroundColor: style.backgroundColor,
      fontWeight: style.bold ? 700 : 400,
      fontStyle: style.italic ? 'italic' : 'normal',
      textDecoration:
        [style.underline && 'underline', style.strikethrough && 'line-through']
          .filter(Boolean)
          .join(' ') || 'none',
      textAlign: style.textAlign,
    };
  };

  const pendingSaveRef = useRef(false);
  const saveVersionRef = useRef(0);
  const currentLibrary = (): LibrarySeed => ({
    books: shelfBooks,
    pages: shelfBooks.some((book) => book.id === activeBookId)
      ? { ...notebookPages, [activeBookId]: pages }
      : notebookPages,
  });
  const persistLibrary = async (notify = false) => {
    const version = ++saveVersionRef.current;
    pendingSaveRef.current = true;
    setStatus('保存中…');
    try {
      await writeLibrary(currentLibrary());
      const stillCurrent =
        latestEditorRef.current.pages === pages &&
        latestEditorRef.current.activeBookId === activeBookId;
      if (version === saveVersionRef.current && stillCurrent) {
        pendingSaveRef.current = false;
        setStatus('已保存');
      }
      if (notify && stillCurrent) setToast('这本手账已保存');
      return stillCurrent;
    } catch {
      if (version === saveVersionRef.current) setStatus('保存失败');
      setToast('保存失败，当前编辑仍保留在页面中，请勿关闭页面，稍后重试保存');
      return false;
    }
  };
  // Update the shelf copy immediately; never wait for a storage write to update it.
  useEffect(() => {
    if (activeBookId)
      setNotebookPages((all) =>
        all[activeBookId] === pages ? all : { ...all, [activeBookId]: pages },
      );
  }, [pages, activeBookId]);
  useEffect(() => {
    ++saveVersionRef.current;
    pendingSaveRef.current = true;
    setStatus('保存中…');
    const saveWhenIdle = () => {
      // Large image documents should not be cloned while the pointer is moving.
      if (
        dragRef.current ||
        resizeRef.current ||
        rotateRef.current ||
        textResizeRef.current ||
        shapeResizeRef.current
      ) {
        timer = window.setTimeout(saveWhenIdle, 450);
        return;
      }
      void persistLibrary();
    };
    let timer = window.setTimeout(saveWhenIdle, 450);
    const flush = () => {
      if (document.visibilityState === 'hidden' && pendingSaveRef.current) void persistLibrary();
    };
    document.addEventListener('visibilitychange', flush);
    return () => {
      window.clearTimeout(timer);
      document.removeEventListener('visibilitychange', flush);
    };
  }, [pages, notebookPages, shelfBooks, activeBookId]);
  useEffect(() => {
    const warnBeforeExit = (event: BeforeUnloadEvent) => {
      if (pendingSaveRef.current) {
        event.preventDefault();
        event.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', warnBeforeExit);
    return () => window.removeEventListener('beforeunload', warnBeforeExit);
  }, []);

  useEffect(() => {
    const corridor = corridorRef.current;
    if (
      !corridor ||
      screen !== 'shelf' ||
      shelfBooks.length < 2 ||
      window.matchMedia('(pointer: coarse)').matches
    )
      return;
    let frame = 0;
    let previous = 0;
    let direction = 1;
    const animate = (time: number) => {
      if (previous) {
        const delta = Math.min(48, time - previous);
        if (!corridor.matches(':hover') && !corridor.matches(':active')) {
          corridor.scrollLeft += direction * delta * 0.012;
          const max = corridor.scrollWidth - corridor.clientWidth;
          if (corridor.scrollLeft >= max - 1) direction = -1;
          else if (corridor.scrollLeft <= 1) direction = 1;
        }
      }
      previous = time;
      frame = requestAnimationFrame(animate);
    };
    frame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frame);
  }, [screen, shelfBooks.length]);
  useEffect(() => {
    try {
      localStorage.setItem('yepaper-background-templates', JSON.stringify(backgroundTemplates));
    } catch {
      setToast('工作台模板空间不足，请删除旧背景图后再上传');
    }
  }, [backgroundTemplates]);
  useEffect(() => {
    try {
      localStorage.setItem('yepaper-wallpaper', wallpaper);
    } catch {
      // Keep the editor available even when the browser storage quota is reached.
      try {
        localStorage.removeItem('yepaper-wallpaper');
      } catch {
        /* storage may be disabled */
      }
      if (wallpaper.startsWith('data:')) setWallpaper('mist');
    }
  }, [wallpaper]);

  useEffect(() => {
    if (!openingBook) return;
    const timer = window.setTimeout(() => {
      setScreen('editor');
      setMode('edit');
      setOpeningBook(null);
    }, 2150);
    return () => window.clearTimeout(timer);
  }, [openingBook]);

  useEffect(
    () => () => {
      turnTimerRef.current.forEach((timer) => window.clearTimeout(timer));
      flipAudioRef.current?.pause();
    },
    [],
  );

  useEffect(() => {
    const editor = richTextRef.current;
    if (preserveRichTextDomRef.current) {
      preserveRichTextDomRef.current = false;
      return;
    }
    if (!editor || document.activeElement === editor) return;
    editor.innerHTML = page.textHtml || plainTextHtml(page.text);
  }, [page.id, page.textHtml, page.text, screen, mode]);

  useEffect(() => {
    if (!toast) return;
    const id = window.setTimeout(() => setToast(''), 2200);
    return () => clearTimeout(id);
  }, [toast]);

  const recordHistory = () => {
    setHistory((items) => [...items.slice(-19), pages]);
    setFuture([]);
  };
  const editPages = (update: Page[] | ((all: Page[]) => Page[])) =>
    setPages((all) => {
      const next = typeof update === 'function' ? update(all) : update;
      return next.map((item) => {
        const previous = all.find((entry) => entry.id === item.id);
        return previous ? preserveLockedComponents(previous, item) : item;
      });
    });
  const snapshot = (next: Page[]) => {
    recordHistory();
    editPages(next);
  };
  const updatePage = (patch: Partial<Page>) =>
    editPages((all) => all.map((p) => (p.id === activeId ? { ...p, ...patch } : p)));
  const isLayerLocked = (key: string) => Boolean(page.lockedLayers?.includes(key));
  const targetLayerKey = (target: DragTarget, id?: string) =>
    target === 'canvasImage'
      ? `canvas-image:${id}`
      : target === 'canvasText'
        ? 'text'
        : target === 'canvasShape'
          ? 'shape'
          : target;
  const selectedLayerKey =
    selectedCanvasImageId && selected === 'media'
      ? `canvas-image:${selectedCanvasImageId}`
      : selected;
  const effectLayerLocked = isLayerLocked(
    effectImageId === 'primary' ? 'media' : `canvas-image:${effectImageId}`,
  );
  const toggleLayerLock = (key: string) => {
    const locked = isLayerLocked(key);
    snapshot(
      pages.map((item) =>
        item.id === activeId
          ? {
              ...item,
              lockedLayers: locked
                ? (item.lockedLayers || []).filter((entry) => entry !== key)
                : [...(item.lockedLayers || []), key],
            }
          : item,
      ),
    );
    if (!locked) {
      setSelected(null);
      setSelectedCanvasImageId(null);
      setSelectedCanvasTextId(null);
      setSelectedCanvasShapeId(null);
      setCropMode(false);
    }
  };
  const layerLockButton = (key: string, label: string) => (
    <button
      type="button"
      className={`component-action layer-lock ${isLayerLocked(key) ? 'active' : ''}`}
      aria-label={`${isLayerLocked(key) ? '解锁' : '锁定'}${label}`}
      title={isLayerLocked(key) ? '解锁后可编辑和移动' : '锁定素材'}
      aria-pressed={isLayerLocked(key)}
      onClick={() => toggleLayerLock(key)}
    >
      {isLayerLocked(key) ? <Lock size={13} /> : <Unlock size={13} />}
    </button>
  );
  const updateImageEffect = (patch: Partial<CanvasImage>) => {
    if (!effectImageId || effectLayerLocked) return;
    recordHistory();
    editPages((all) =>
      all.map((item) =>
        item.id !== activeId
          ? item
          : effectImageId === 'primary'
            ? { ...item, ...patch }
            : {
                ...item,
                canvasImages: (item.canvasImages || []).map((image) =>
                  image.id === effectImageId ? { ...image, ...patch } : image,
                ),
              },
      ),
    );
  };
  const applyOfficialTheme = (theme: JournalTheme) => {
    const presets: Record<
      JournalTheme,
      {
        paperColor: string;
        paperStyle: string;
        textStyles?: Page['textStyles'];
        textPos: Page['textPos'];
        mediaPos: Page['mediaPos'];
        componentPositions?: Page['componentPositions'];
      }
    > = {
      classic: {
        paperColor: 'ivory',
        paperStyle: 'lined',
        textStyles: undefined,
        textPos: { x: 55, y: 54 },
        mediaPos: { x: 77, y: 27 },
        componentPositions: undefined,
      },
      vangogh: {
        paperColor: '#e9e1c8',
        paperStyle: 'lined',
        textPos: { x: 55, y: 53 },
        mediaPos: { x: 77, y: 28 },
        componentPositions: {
          date: { x: 55, y: 5.5 },
          title: { x: 54.5, y: 10.5 },
          weather: { x: 55, y: 22 },
          footer: { x: 55, y: 91 },
        },
        textStyles: {
          date: { color: '#697858', fontFamily: "'Noto Serif SC', Georgia, serif" },
          title: {
            color: '#223b59',
            fontFamily: "KaiTi, STKaiti, 'Noto Serif SC', serif",
            bold: true,
          },
          text: { color: '#304966', fontFamily: "KaiTi, STKaiti, 'Noto Serif SC', serif" },
          footer: { color: '#a77b38', fontFamily: "'Noto Serif SC', Georgia, serif" },
        },
      },
      eva: {
        paperColor: '#faf8f3',
        paperStyle: 'blank',
        textPos: { x: 54.5, y: 49 },
        mediaPos: { x: 77, y: 28 },
        componentPositions: {
          date: { x: 55, y: 5 },
          title: { x: 54.5, y: 10 },
          weather: { x: 55, y: 23 },
          footer: { x: 55, y: 91 },
        },
        textStyles: {
          date: { color: '#151515', fontFamily: "Arial, 'Noto Serif SC', sans-serif", bold: true },
          title: {
            color: '#090909',
            fontFamily: "Impact, 'Arial Black', 'Noto Serif SC', serif",
            bold: true,
          },
          text: { color: '#191919', fontFamily: "Arial, 'Noto Serif SC', sans-serif", bold: true },
          footer: {
            color: '#c84c3d',
            fontFamily: "Arial, 'Noto Serif SC', sans-serif",
            bold: true,
          },
        },
      },
    };
    const preset = presets[theme];
    snapshot(pages.map((item) => (item.id === activeId ? { ...item, theme, ...preset } : item)));
    setToast(
      theme === 'classic'
        ? '已应用常规主题'
        : theme === 'vangogh'
          ? '已应用梵高风主题'
          : '已应用 EVA 风主题',
    );
  };
  const reorderLayerItems = (source: string, target: string) => {
    if (isLayerLocked(source)) return;
    if (source === target) return;
    const order = layerOrderFor(page);
    const from = order.indexOf(source);
    const to = order.indexOf(target);
    if (from < 0 || to < 0) return;
    order.splice(from, 1);
    order.splice(to, 0, source);
    snapshot(pages.map((item) => (item.id === activeId ? { ...item, layerOrder: order } : item)));
  };
  const reorderComponents = (source: PageComponent, target: PageComponent) => {
    reorderLayerItems(source, target);
  };
  const reorderCanvasImages = (sourceId: string, targetId: string) => {
    if (sourceId === targetId) return;
    const ordered = [...(page.canvasImages || [])];
    const from = ordered.findIndex((image) => image.id === sourceId);
    const to = ordered.findIndex((image) => image.id === targetId);
    if (from < 0 || to < 0) return;
    const [moved] = ordered.splice(from, 1);
    ordered.splice(to, 0, moved);
    snapshot(
      pages.map((item) => (item.id === activeId ? { ...item, canvasImages: ordered } : item)),
    );
  };
  const reorderMediaItems = (sourceId: string, targetId: string) => {
    reorderLayerItems(
      sourceId === 'primary' ? 'media' : `canvas-image:${sourceId}`,
      targetId === 'primary' ? 'media' : `canvas-image:${targetId}`,
    );
  };
  const syncCanvasImageBounds = (id: string, imageElement: HTMLImageElement) => {
    const canvas = canvasRef.current?.getBoundingClientRect();
    const naturalAspectRatio = imageElement.naturalWidth / imageElement.naturalHeight;
    if (!canvas || !naturalAspectRatio || !Number.isFinite(naturalAspectRatio)) return;
    const existing = page.canvasImages?.find((image) => image.id === id);
    if (!existing) return;
    const { width, height } = fittedImageBox(
      existing.width,
      naturalAspectRatio,
      canvas.width / canvas.height,
    );
    if (
      existing.displayAspectRatio &&
      Math.abs(existing.displayAspectRatio - naturalAspectRatio) < 0.002 &&
      Math.abs((existing.height || 0) - height) < 0.1 &&
      Math.abs((existing.width || 0) - width) < 0.1
    )
      return;
    updatePage({
      canvasImages: (page.canvasImages || []).map((image) =>
        image.id === id
          ? { ...image, width, height, displayAspectRatio: naturalAspectRatio }
          : image,
      ),
    });
  };
  const syncPrimaryMediaBounds = (mediaElement: HTMLImageElement | HTMLVideoElement) => {
    const canvas = canvasRef.current?.getBoundingClientRect();
    const naturalAspectRatio =
      mediaElement instanceof HTMLVideoElement
        ? mediaElement.videoWidth / mediaElement.videoHeight
        : mediaElement.naturalWidth / mediaElement.naturalHeight;
    if (!canvas || !naturalAspectRatio || !Number.isFinite(naturalAspectRatio)) return;
    const { width, height } = fittedImageBox(
      page.mediaWidth,
      naturalAspectRatio,
      canvas.width / canvas.height,
    );
    if (
      page.mediaAspectRatio &&
      Math.abs(page.mediaAspectRatio - naturalAspectRatio) < 0.002 &&
      Math.abs((page.mediaHeight || 0) - height) < 0.1 &&
      Math.abs((page.mediaWidth || 0) - width) < 0.1
    )
      return;
    updatePage({ mediaWidth: width, mediaHeight: height, mediaAspectRatio: naturalAspectRatio });
  };
  const updateTextStyle = (patch: Partial<TextStyle>) => {
    if (selectedLayerKey && isLayerLocked(selectedLayerKey)) return;
    if (selected === 'text' && selectedCanvasTextId) {
      updatePage({
        canvasTextBoxes: (page.canvasTextBoxes || []).map((box) =>
          box.id === selectedCanvasTextId ? { ...box, style: { ...box.style, ...patch } } : box,
        ),
      });
      return;
    }
    if (!selected || !['date', 'title', 'text', 'footer'].includes(selected)) return;
    const component = selected as TextComponent;
    updatePage({
      textStyles: {
        ...page.textStyles,
        [component]: { ...textStyleFor(page, component), ...patch },
      },
    });
  };
  const activeTextComponent =
    selected && ['date', 'title', 'text', 'footer'].includes(selected)
      ? (selected as TextComponent)
      : null;
  const activeTextStyle =
    selected === 'text' && selectedCanvasTextId
      ? {
          ...defaultTextStyle,
          ...page.canvasTextBoxes?.find((box) => box.id === selectedCanvasTextId)?.style,
        }
      : activeTextComponent
        ? textStyleFor(page, activeTextComponent)
        : defaultTextStyle;
  const saveTextSelection = () => {
    const selection = window.getSelection();
    if (selection?.rangeCount && richTextRef.current?.contains(selection.anchorNode))
      textSelectionRef.current = selection.getRangeAt(0).cloneRange();
  };
  const syncRichText = (preserveDom = false) => {
    const editor = richTextRef.current;
    if (!editor) return;
    const html = sanitizeRichText(editor.innerHTML);
    preserveRichTextDomRef.current = preserveDom;
    updatePage({ textHtml: html, text: editor.innerText.replace(/\r/g, '').replace(/\n$/, '') });
    saveTextSelection();
  };
  const applyInlineTextStyle = (
    command:
      | 'bold'
      | 'italic'
      | 'underline'
      | 'strikeThrough'
      | 'foreColor'
      | 'hiliteColor'
      | 'fontName'
      | 'fontSize',
    value?: string,
    fallback?: Partial<TextStyle>,
  ) => {
    if (selected === 'text' && selectedCanvasTextId) {
      if (fallback) updateTextStyle(fallback);
      return;
    }
    if (selectedLayerKey && isLayerLocked(selectedLayerKey)) return;
    const editor = richTextRef.current;
    const selection = window.getSelection();
    if (selected !== 'text' || !editor || !selection) {
      if (fallback) updateTextStyle(fallback);
      return;
    }
    if (
      textSelectionRef.current &&
      editor.contains(textSelectionRef.current.commonAncestorContainer)
    ) {
      selection.removeAllRanges();
      selection.addRange(textSelectionRef.current);
    }
    if (!selection.rangeCount || !editor.contains(selection.anchorNode)) {
      if (fallback) updateTextStyle(fallback);
      return;
    }
    const activeRange = selection.getRangeAt(0);
    if (!activeRange || activeRange.collapsed) {
      if (fallback) updateTextStyle(fallback);
      return;
    }
    editor.focus();
    selection.removeAllRanges();
    selection.addRange(activeRange);
    document.execCommand('styleWithCSS', false, command === 'fontSize' ? 'false' : 'true');
    document.execCommand(command, false, command === 'fontSize' ? '7' : value);
    if (command === 'fontSize')
      editor.querySelectorAll('font[size="7"]').forEach((node) => {
        const span = document.createElement('span');
        span.style.fontSize = `${Number(value)}px`;
        span.append(...node.childNodes);
        node.replaceWith(span);
      });
    syncRichText(true);
  };
  const toggleInlineStyle = (
    command: 'bold' | 'italic' | 'underline' | 'strikeThrough',
    key: 'bold' | 'italic' | 'underline' | 'strikethrough',
  ) => {
    if (selected === 'text' && selectedCanvasTextId) {
      updateTextStyle({ [key]: !activeTextStyle[key] });
      return;
    }
    if (selected === 'text')
      applyInlineTextStyle(command, undefined, { [key]: !activeTextStyle[key] });
    else updateTextStyle({ [key]: !activeTextStyle[key] });
  };
  const dragHandle = (component: PageComponent, label: string) =>
    selected === component &&
    mode === 'edit' &&
    !hideTools &&
    !isLayerLocked(component) &&
    !(component === 'text' && selectedCanvasTextId) &&
    !(component === 'media' && selectedCanvasImageId) ? (
      <button
        className="component-move-handle"
        aria-label={`拖动${label}`}
        title={`拖动${label}`}
        onPointerDown={(event) => pointerDown(event, component)}
      >
        <Move size={11} />
      </button>
    ) : null;
  const undo = () => {
    const previous = history.at(-1);
    if (!previous) return;
    setFuture((items) => [pages, ...items]);
    setPages(previous);
    setHistory((items) => items.slice(0, -1));
  };
  const redo = () => {
    const next = future[0];
    if (!next) return;
    setHistory((items) => [...items, pages]);
    setPages(next);
    setFuture((items) => items.slice(1));
  };
  const playFlipSound = () => {
    if (!soundEnabled) return;
    try {
      const audio =
        flipAudioRef.current ||
        (flipAudioRef.current = new Audio(`${import.meta.env.BASE_URL}audio/page-flip.mp3`));
      audio.preload = 'auto';
      audio.volume = soundVolume;
      audio.muted = !soundEnabled;
      audio.currentTime = 0;
      void audio.play().catch(() => setToast('翻页音效未能播放，请检查浏览器音量设置'));
    } catch {
      /* Web Audio may be unavailable; the page turn still works */
    }
  };
  const setWeather = (weather: Weather) => {
    snapshot(
      pages.map((p) =>
        p.id === activeId
          ? {
              ...p,
              weather,
              screenBrightness:
                weather === 'rain' || weather === 'snow' ? 0.28 : weather === 'cloud' ? 0.16 : 0.08,
            }
          : p,
      ),
    );
    setToast(
      weather === 'rain'
        ? '这页记录为雨天'
        : weather === 'snow'
          ? '这页记录为雪天'
          : weather === 'cloud'
            ? '这页记录为阴天'
            : '这页记录为晴天',
    );
  };
  const addPage = () => {
    const previous = page;
    const created: Page = {
      ...previous,
      id: crypto.randomUUID(),
      backgroundMusic: null,
      title: '新的日记页',
      date: '2026年 09月 17日',
      weather: 'sun',
      photo: '',
      video: '',
      sticker: '',
      text: '写下今天的小小发现…',
      textPos: { x: 56.5, y: 56 },
      mediaPos: { x: 73.5, y: 16 },
      mediaScale: 1,
      componentPositions: undefined,
      hiddenComponents: [],
    };
    snapshot([...pages, created]);
    setActiveId(created.id);
    setSelected(null);
  };
  const deletePage = (pageId: string) => {
    if (pages.length <= 1) {
      setToast('至少保留一页手账');
      return;
    }
    const index = pages.findIndex((item) => item.id === pageId);
    if (index < 0) return;
    const remaining = pages.filter((item) => item.id !== pageId);
    snapshot(remaining);
    if (activeId === pageId) {
      turnTimerRef.current.forEach((timer) => window.clearTimeout(timer));
      setPageTurn(null);
      setActiveId(remaining[Math.min(index, remaining.length - 1)].id);
    }
    setSelected(null);
    setSelectedCanvasTextId(null);
    setSelectedCanvasImageId(null);
    setToast('页面已删除');
  };
  const turnToPage = (next: Page, direction: 'next' | 'previous') => {
    if (!page || page.id === next.id || pageTurn) return;
    if (mode !== 'edit') playFlipSound();
    turnTimerRef.current.forEach((timer) => window.clearTimeout(timer));
    setPageTurn({ direction, page: direction === 'previous' ? next : page });
    setSelected(null);
    turnTimerRef.current = [
      window.setTimeout(() => setActiveId(next.id), 340),
      window.setTimeout(() => setPageTurn(null), 860),
    ];
  };
  const changePage = (delta: number) => {
    const index = pages.findIndex((p) => p.id === activeId);
    const next = pages[(index + delta + pages.length) % pages.length];
    if (next) turnToPage(next, delta > 0 ? 'next' : 'previous');
  };
  const swipeStart = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (mode === 'read') swipeStartRef.current = { x: event.clientX, y: event.clientY };
  };
  const swipeEnd = (event: ReactPointerEvent<HTMLDivElement>) => {
    const start = swipeStartRef.current;
    swipeStartRef.current = null;
    if (!start || mode !== 'read') return;
    const dx = event.clientX - start.x;
    const dy = event.clientY - start.y;
    if (Math.abs(dx) > 56 && Math.abs(dx) > Math.abs(dy) * 1.2) changePage(dx < 0 ? 1 : -1);
  };

  const onFile = async (event: ChangeEvent<HTMLInputElement>, kind: 'image' | 'video') => {
    const input = event.currentTarget;
    const file = input.files?.[0];
    if (!file) return;
    input.value = '';
    const targetPageId = activeId;
    const targetBookId = activeBookId;
    let url = '';
    if (kind === 'image') {
      const assetId = crypto.randomUUID();
      try {
        await saveJournalImage(assetId, file);
        url = `asset:${assetId}`;
        const objectUrl = URL.createObjectURL(file);
        imageObjectUrlsRef.current.push(objectUrl);
        loadedImageAssetsRef.current.add(assetId);
        setImageAssetUrls((current) => ({ ...current, [assetId]: objectUrl }));
      } catch {
        setToast('图片未能保存，请重试');
        return;
      }
    } else url = URL.createObjectURL(file);
    if (latestEditorRef.current.activeBookId !== targetBookId) return;
    const targetPage = latestEditorRef.current.pages.find((item) => item.id === targetPageId);
    if (!targetPage) return;
    const existingImages = targetPage.canvasImages || [];
    if (
      kind === 'image' &&
      (targetPage.photo || existingImages.length > 0 || targetPage.lockedLayers?.includes('media'))
    ) {
      const id = crypto.randomUUID();
      const offset = existingImages.length % 4;
      const image: CanvasImage = {
        id,
        src: url,
        name: file.name,
        x: 54 + offset * 4,
        y: 40 + offset * 3,
        scale: 0.8,
        rotation: 0,
        stickerStyle: 'photo',
      };
      recordHistory();
      editPages((all) =>
        all.map((p) =>
          p.id === targetPageId ? { ...p, canvasImages: [...(p.canvasImages || []), image] } : p,
        ),
      );
      setPanel(null);
      setCropMode(false);
      setSelected('media');
      setSelectedCanvasTextId(null);
      setSelectedCanvasImageId(id);
      setToast('图片已作为新图层添加，可继续插入多张并分别调整');
      return;
    }
    recordHistory();
    editPages((all) =>
      all.map((p) =>
        p.id === targetPageId
          ? {
              ...p,
              ...(kind === 'image'
                ? {
                    photo: url,
                    photoCutout: undefined,
                    useCutout: false,
                    mediaRotation: 0,
                    stickerStyle: 'photo',
                    stickerOutline: false,
                    stickerDimensional: false,
                    video: '',
                  }
                : {
                    video: url,
                    photo: '',
                    mediaWidth: undefined,
                    mediaHeight: undefined,
                    mediaAspectRatio: undefined,
                    mediaScale: 1,
                    mediaScaleY: 1,
                    mediaRotation: 0,
                  }),
              hiddenComponents: (p.hiddenComponents || []).filter((item) => item !== 'media'),
              removedComponents: (p.removedComponents || []).filter((item) => item !== 'media'),
            }
          : p,
      ),
    );
    setPanel(null);
    setSelected('media');
    setSelectedCanvasTextId(null);
    setSelectedCanvasImageId(null);
    setCropMode(kind === 'image');
    setToast(
      kind === 'image' ? '沿着图片主体描边，生成透明贴纸；取消可直接使用原图' : '视频贴纸已添加',
    );
  };
  const applyCroppedImage = (photo: string) => {
    if (isLayerLocked(selectedCanvasImageId ? `canvas-image:${selectedCanvasImageId}` : 'media'))
      return;
    const targetBookId = activeBookId;
    const cropped = new Image();
    cropped.onload = () => {
      if (latestEditorRef.current.activeBookId !== targetBookId) return;
      const aspectRatio = cropped.naturalWidth / cropped.naturalHeight;
      const rect = canvasRef.current?.getBoundingClientRect();
      const canvasAspect = rect && rect.height > 0 ? rect.width / rect.height : 1;
      const targetPage = pages.find((item) => item.id === activeId);
      if (!targetPage || !aspectRatio || !Number.isFinite(aspectRatio)) return;
      if (selectedCanvasImage) {
        const { width, height } = fittedImageBox(
          selectedCanvasImage.width,
          aspectRatio,
          canvasAspect,
        );
        recordHistory();
        editPages((all) =>
          all.map((item) =>
            item.id === activeId
              ? {
                  ...item,
                  canvasImages: (item.canvasImages || []).map((image) =>
                    image.id === selectedCanvasImage.id
                      ? {
                          ...image,
                          cutoutSrc: photo,
                          useCutout: true,
                          cutoutMode: 'manual',
                          width,
                          height,
                          scale: 1,
                          scaleY: 1,
                          displayAspectRatio: aspectRatio,
                        }
                      : image,
                  ),
                }
              : item,
          ),
        );
      } else {
        const { width, height } = fittedImageBox(targetPage.mediaWidth, aspectRatio, canvasAspect);
        recordHistory();
        editPages((all) =>
          all.map((item) =>
            item.id === activeId
              ? {
                  ...item,
                  photoCutout: photo,
                  useCutout: true,
                  video: '',
                  stickerStyle: 'photo',
                  stickerOutline: false,
                  stickerDimensional: false,
                  cutoutMode: 'manual',
                  mediaWidth: width,
                  mediaHeight: height,
                  mediaScale: 1,
                  mediaScaleY: 1,
                  mediaAspectRatio: aspectRatio,
                }
              : item,
          ),
        );
      }
      setCropMode(false);
      setSelected('media');
      setToast('裁切贴纸已生成，图片框已适配裁切后的轮廓');
    };
    cropped.onerror = () => setToast('裁切结果读取失败，请重新裁切');
    cropped.src = photo;
  };
  const toggleBackgroundCutout = async () => {
    if (effectLayerLocked) return;
    const image = imageEffectTarget;
    if (image.useCutout && image.cutoutMode === 'background') {
      updateImageEffect({ useCutout: false });
      return;
    }
    if (image.backgroundCutout) {
      updateImageEffect({ useCutout: true, cutoutMode: 'background' });
      return;
    }
    const targetPageId = activeId;
    const targetImageId = effectCanvasImage?.id;
    const photo = resolveImageSrc(effectCanvasImage?.src || page.photo);
    if (!photo || cutoutProcessing) return;
    setCutoutProcessing(true);
    setToast('正在识别背景色…');
    try {
      const backgroundCutout = await autoRemoveBackground(photo);
      recordHistory();
      editPages((all) =>
        all.map((item) =>
          item.id === targetPageId
            ? targetImageId
              ? {
                  ...item,
                  canvasImages: (item.canvasImages || []).map((entry) =>
                    entry.id === targetImageId
                      ? { ...entry, backgroundCutout, cutoutMode: 'background', useCutout: true }
                      : entry,
                  ),
                }
              : {
                  ...item,
                  backgroundCutout,
                  cutoutMode: 'background',
                  useCutout: true,
                  stickerStyle: 'photo',
                  stickerOutline: false,
                  stickerDimensional: false,
                }
            : item,
        ),
      );
      setToast('背景已移除，可切回原图');
    } catch (error) {
      setToast(error instanceof Error ? error.message : '抠图失败，请重试');
    } finally {
      setCutoutProcessing(false);
    }
  };
  const uploadTapeTexture = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      const bitmap = await createImageBitmap(file);
      const scale = Math.min(1, 320 / bitmap.width, 320 / bitmap.height);
      const canvas = document.createElement('canvas');
      canvas.width = Math.max(1, Math.round(bitmap.width * scale));
      canvas.height = Math.max(1, Math.round(bitmap.height * scale));
      const context = canvas.getContext('2d');
      if (!context) throw new Error('图片无法处理');
      context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
      bitmap.close();
      const image = canvas.toDataURL('image/webp', 0.76);
      if (image.length > 180_000) throw new Error('图案过大');
      const id = crypto.randomUUID();
      snapshot(
        pages.map((item) =>
          item.id === activeId
            ? { ...item, tapeTextures: { ...item.tapeTextures, [id]: image } }
            : item,
        ),
      );
      setTapeTexture('custom');
      setTapeTextureId(id);
      setToast('自定义胶带纹理已加入当前手账');
    } catch {
      setToast('图案无法保存，请换一张较小的图片');
    } finally {
      event.target.value = '';
    }
  };
  const generateSticker = () => {
    if (!aiPrompt.trim()) return;
    setGenerating(true);
    window.setTimeout(() => {
      updatePage({
        sticker: '✿',
        hiddenComponents: (page.hiddenComponents || []).filter((item) => item !== 'sticker'),
        removedComponents: (page.removedComponents || []).filter((item) => item !== 'sticker'),
      });
      setGenerating(false);
      setPanel(null);
      setSelected('sticker');
      setToast('AI 贴纸预览已添加（演示效果）');
    }, 1500);
  };

  const addTextBox = (text = '在这里输入文字', style?: Partial<TextStyle>) => {
    const id = crypto.randomUUID();
    const box: CanvasTextBox = {
      id,
      text,
      x: 57,
      y: 45,
      style: style || { ...textStyleFor(page, 'text') },
    };
    snapshot(
      pages.map((item) =>
        item.id === activeId
          ? {
              ...item,
              canvasTextBoxes: [...(item.canvasTextBoxes || []), box],
              hiddenComponents: (item.hiddenComponents || []).filter((entry) => entry !== 'text'),
              removedComponents: (item.removedComponents || []).filter((entry) => entry !== 'text'),
            }
          : item,
      ),
    );
    setSelected('text');
    setSelectedCanvasTextId(id);
    setSelectedCanvasImageId(null);
    window.setTimeout(
      () => document.querySelector<HTMLTextAreaElement>(`[data-canvas-text="${id}"]`)?.focus(),
      0,
    );
    setToast('已添加文字框，可直接输入；拖动文字框空白处或移动图标可移动位置');
  };
  const addCanvasShape = (type: CanvasShape['type']) => {
    const id = crypto.randomUUID();
    const shape: CanvasShape = {
      id,
      type,
      x: 56,
      y: 40,
      width: 13,
      height: 17,
      fill: '#dce7dc',
      stroke: '#718775',
      strokeWidth: 2,
      radius: 8,
    };
    snapshot(
      pages.map((item) =>
        item.id === activeId
          ? {
              ...item,
              canvasShapes: [...(item.canvasShapes || []), shape],
              hiddenComponents: (item.hiddenComponents || []).filter((entry) => entry !== 'shape'),
              removedComponents: (item.removedComponents || []).filter(
                (entry) => entry !== 'shape',
              ),
            }
          : item,
      ),
    );
    setSelected('shape');
    setSelectedCanvasShapeId(id);
    setSelectedCanvasTextId(null);
    setSelectedCanvasImageId(null);
    setShapesOpen(false);
    setToast('图形已添加，可在画布上拖动并调整样式');
  };
  const updateSelectedShape = (changes: Partial<CanvasShape>) => {
    if (!selectedCanvasShapeId) return;
    updatePage({
      canvasShapes: (page.canvasShapes || []).map((shape) =>
        shape.id === selectedCanvasShapeId ? { ...shape, ...changes } : shape,
      ),
    });
  };

  const pointerDown = (event: ReactPointerEvent<HTMLElement>, target: DragTarget, id?: string) => {
    if (isLayerLocked(targetLayerKey(target, id))) return;
    if (
      mode !== 'edit' ||
      hideTools ||
      cropMode ||
      brush ||
      eraser ||
      tapeMode ||
      page.controlsLocked ||
      event.button !== 0
    )
      return;
    if (target === 'canvasText') {
      setSelected('text');
      setSelectedCanvasTextId(id || null);
      setSelectedCanvasImageId(null);
    } else if (target === 'canvasImage') {
      setSelected('media');
      setSelectedCanvasImageId(id || null);
      setSelectedCanvasTextId(null);
    } else if (target === 'canvasShape') {
      setSelected('shape');
      setSelectedCanvasShapeId(id || null);
      setSelectedCanvasImageId(null);
      setSelectedCanvasTextId(null);
    } else {
      setSelected(target);
      setSelectedCanvasShapeId(null);
      if (target === 'text') {
        setSelectedCanvasTextId(null);
        setSelectedCanvasImageId(null);
      }
      if (target === 'media') {
        setSelectedCanvasImageId(null);
        setSelectedCanvasTextId(null);
      }
    }
    const targetElement = event.target as HTMLElement;
    if (
      targetElement.closest('input,textarea,[contenteditable="true"]') &&
      !targetElement.closest('.component-move-handle')
    )
      return;
    event.stopPropagation();
    (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
    const rect = canvasRef.current!.getBoundingClientRect();
    const draggableElement = (
      event.currentTarget.matches('.component-move-handle')
        ? transformElement(event.currentTarget)
        : event.currentTarget
    ) as HTMLElement;
    if (!draggableElement) return;
    const elementRect = draggableElement.getBoundingClientRect();
    recordHistory();
    const position =
      target === 'text'
        ? page.textPos
        : target === 'media'
          ? page.mediaPos
          : target === 'canvasText'
            ? page.canvasTextBoxes?.find((item) => item.id === id)
            : target === 'canvasImage'
              ? page.canvasImages?.find((item) => item.id === id)
              : target === 'canvasShape'
                ? page.canvasShapes?.find((item) => item.id === id)
                : componentPosition(
                    target,
                    target === 'date'
                      ? { x: 54.5, y: 5.5 }
                      : target === 'title'
                        ? { x: 54.5, y: 10.5 }
                        : target === 'weather'
                          ? { x: 54.5, y: 22 }
                          : target === 'sticker'
                            ? { x: Math.min(92, page.mediaPos.x + 14), y: page.mediaPos.y + 29 }
                            : { x: 54.5, y: 91 },
                  );
    if (!position) return;
    dragRef.current = {
      target,
      id,
      x: event.clientX,
      y: event.clientY,
      originX: (position.x * rect.width) / 100,
      originY: (position.y * rect.height) / 100,
      canvasWidth: rect.width,
      canvasHeight: rect.height,
      cssScaleX: canvasRef.current!.offsetWidth / rect.width,
      cssScaleY: canvasRef.current!.offsetHeight / rect.height,
      maxX: Math.max(1, 100 - (elementRect.width / rect.width) * 100),
      maxY: Math.max(2, 100 - (elementRect.height / rect.height) * 100),
      element: draggableElement,
      nextX: position.x,
      nextY: position.y,
    };
    draggableElement.classList.add('is-dragging');
    canvasRef.current?.classList.add('component-transforming');
  };
  const resizeStart = (
    event: ReactPointerEvent<HTMLButtonElement>,
    target: 'media' | 'sticker' | 'canvasImage' | 'title',
    id?: string,
  ) => {
    if (isLayerLocked(targetLayerKey(target, id))) return;
    if (
      event.button !== 0 ||
      mode !== 'edit' ||
      hideTools ||
      page.controlsLocked ||
      cropMode ||
      brush ||
      eraser ||
      tapeMode
    )
      return;
    event.preventDefault();
    event.stopPropagation();
    event.currentTarget.setPointerCapture(event.pointerId);
    const element = transformElement(event.currentTarget);
    const rect = element?.getBoundingClientRect();
    const canvas = canvasRef.current?.getBoundingClientRect();
    if (!element || !rect || !canvas) return;
    recordHistory();
    const scale =
      target === 'media'
        ? page.mediaScale
        : target === 'canvasImage'
          ? page.canvasImages?.find((image) => image.id === id)?.scale || 1
          : target === 'title'
            ? (page.titleScale ?? 1)
            : (page.stickerScale ?? 1);
    const image = page.canvasImages?.find((item) => item.id === id);
    const scaleY =
      target === 'media'
        ? (page.mediaScaleY ?? scale)
        : target === 'canvasImage'
          ? (image?.scaleY ?? scale)
          : target === 'sticker'
            ? (page.stickerScaleY ?? scale)
            : scale;
    const rotation =
      target === 'media'
        ? !page.photo && !page.video
          ? -3
          : (page.mediaRotation ?? 0)
        : target === 'canvasImage'
          ? (image?.rotation ?? 0)
          : 0;
    const position =
      target === 'media'
        ? page.mediaPos
        : target === 'canvasImage' && image
          ? { x: image.x, y: image.y }
          : componentPosition('sticker', {
              x: Math.min(92, page.mediaPos.x + 14),
              y: page.mediaPos.y + 29,
            });
    const displayRatio = canvas.width / (canvasRef.current?.offsetWidth || canvas.width);
    resizeRef.current = {
      target,
      id,
      x: event.clientX,
      y: event.clientY,
      scale,
      scaleY,
      rotation,
      width: Math.max(1, element.offsetWidth * displayRatio),
      height: Math.max(1, element.offsetHeight * displayRatio),
      canvasWidth: canvas.width,
      canvasHeight: canvas.height,
      position,
      nextPosition: position,
      size: Math.max(36, Math.max(rect.width, rect.height)),
      element,
      nextScale: scale,
      nextScaleY: scaleY,
    };
    if (target === 'canvasImage') {
      setSelected('media');
      setSelectedCanvasImageId(id || null);
      setSelectedCanvasTextId(null);
    } else setSelected(target === 'title' ? 'title' : target === 'media' ? 'media' : 'sticker');
  };
  const rotateStart = (
    event: ReactPointerEvent<HTMLButtonElement>,
    target: 'media' | 'canvasImage' | 'canvasShape',
    id?: string,
  ) => {
    if (isLayerLocked(targetLayerKey(target, id))) return;
    if (
      event.button !== 0 ||
      mode !== 'edit' ||
      cropMode ||
      brush ||
      eraser ||
      tapeMode ||
      hideTools ||
      page.controlsLocked
    )
      return;
    event.preventDefault();
    event.stopPropagation();
    event.currentTarget.setPointerCapture(event.pointerId);
    const element = transformElement(event.currentTarget);
    const rect = element?.getBoundingClientRect();
    if (!element || !rect) return;
    const rotation =
      target === 'canvasShape'
        ? (page.canvasShapes?.find((shape) => shape.id === id)?.rotation ?? 0)
        : target === 'media'
          ? (page.mediaRotation ?? 0)
          : (page.canvasImages?.find((image) => image.id === id)?.rotation ?? 0);
    const scale =
      target === 'canvasShape'
        ? 1
        : target === 'media'
          ? page.mediaScale
          : (page.canvasImages?.find((image) => image.id === id)?.scale ?? 1);
    const scaleY =
      target === 'canvasShape'
        ? 1
        : target === 'media'
          ? (page.mediaScaleY ?? scale)
          : (page.canvasImages?.find((image) => image.id === id)?.scaleY ?? scale);
    const centerX = rect.left + rect.width / 2,
      centerY = rect.top + rect.height / 2;
    recordHistory();
    rotateRef.current = {
      target,
      id,
      centerX,
      centerY,
      startAngle: (Math.atan2(event.clientY - centerY, event.clientX - centerX) * 180) / Math.PI,
      rotation,
      nextRotation: rotation,
      scale,
      scaleY,
      element,
    };
    element.classList.add('is-rotating');
    if (target === 'canvasShape') {
      setSelected('shape');
      setSelectedCanvasShapeId(id || null);
      setSelectedCanvasImageId(null);
      setSelectedCanvasTextId(null);
    } else if (target === 'canvasImage') {
      setSelected('media');
      setSelectedCanvasImageId(id || null);
      setSelectedCanvasTextId(null);
    } else {
      setSelected('media');
      setSelectedCanvasImageId(null);
      setSelectedCanvasTextId(null);
    }
  };
  const shapeResizeStart = (
    event: ReactPointerEvent<HTMLButtonElement>,
    shape: CanvasShape,
    handle: (typeof shapeHandles)[number],
  ) => {
    if (isLayerLocked('shape')) return;
    if (
      event.button !== 0 ||
      mode !== 'edit' ||
      hideTools ||
      cropMode ||
      brush ||
      page.controlsLocked
    )
      return;
    event.preventDefault();
    event.stopPropagation();
    const element = event.currentTarget.parentElement;
    const canvas = canvasRef.current?.getBoundingClientRect();
    if (!element || !canvas) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    recordHistory();
    shapeResizeRef.current = {
      id: shape.id,
      startX: event.clientX,
      startY: event.clientY,
      x: shape.x,
      y: shape.y,
      width: (shape.width * canvas.width) / 100,
      height: (shape.height * canvas.height) / 100,
      canvasWidth: canvas.width,
      canvasHeight: canvas.height,
      rotation: ((shape.rotation ?? 0) * Math.PI) / 180,
      handleX: handle.x,
      handleY: handle.y,
      element,
      next: { x: shape.x, y: shape.y, width: shape.width, height: shape.height },
    };
  };
  const applyPointerMove = (event: { clientX: number; clientY: number; shiftKey: boolean }) => {
    if (shapeResizeRef.current) {
      const resize = shapeResizeRef.current;
      const cos = Math.cos(resize.rotation),
        sin = Math.sin(resize.rotation);
      const dx = event.clientX - resize.startX,
        dy = event.clientY - resize.startY;
      // Measure in the rotated shape's axes, keeping the opposite handle fixed.
      let width = Math.max(
        24,
        Math.min(resize.canvasWidth * 2, resize.width + resize.handleX * (dx * cos + dy * sin)),
      );
      let height = Math.max(
        24,
        Math.min(resize.canvasHeight * 2, resize.height + resize.handleY * (-dx * sin + dy * cos)),
      );
      if (event.shiftKey && resize.handleX && resize.handleY) {
        const widthScale = width / resize.width,
          heightScale = height / resize.height;
        const dominantScale =
          Math.abs(widthScale - 1) > Math.abs(heightScale - 1) ? widthScale : heightScale;
        const scale = Math.max(
          24 / resize.width,
          24 / resize.height,
          Math.min(
            dominantScale,
            (resize.canvasWidth * 2) / resize.width,
            (resize.canvasHeight * 2) / resize.height,
          ),
        );
        width = resize.width * scale;
        height = resize.height * scale;
      }
      const moveX = (resize.handleX * (width - resize.width)) / 2;
      const moveY = (resize.handleY * (height - resize.height)) / 2;
      const x =
        resize.x +
        ((moveX * cos - moveY * sin - (width - resize.width) / 2) / resize.canvasWidth) * 100;
      const y =
        resize.y +
        ((moveX * sin + moveY * cos - (height - resize.height) / 2) / resize.canvasHeight) * 100;
      resize.next = {
        x,
        y,
        width: (width / resize.canvasWidth) * 100,
        height: (height / resize.canvasHeight) * 100,
      };
      Object.assign(resize.element.style, {
        left: `${x}%`,
        top: `${y}%`,
        width: `${resize.next.width}%`,
        height: `${resize.next.height}%`,
      });
      return;
    }
    if (textResizeRef.current) {
      const resize = textResizeRef.current;
      resize.nextWidth = Math.max(
        8,
        Math.min(100, resize.width + ((event.clientX - resize.x) / resize.canvasWidth) * 100),
      );
      resize.nextHeight = Math.max(
        4,
        Math.min(100, resize.height + ((event.clientY - resize.y) / resize.canvasHeight) * 100),
      );
      resize.element.style.width = `${resize.nextWidth}%`;
      resize.element.style.height = `${resize.nextHeight}%`;
      return;
    }
    if (rotateRef.current) {
      const rotate = rotateRef.current;
      const angle =
        (Math.atan2(event.clientY - rotate.centerY, event.clientX - rotate.centerX) * 180) /
        Math.PI;
      let delta = angle - rotate.startAngle;
      while (delta > 180) delta -= 360;
      while (delta < -180) delta += 360;
      rotate.nextRotation = event.shiftKey
        ? Math.round((rotate.rotation + delta) / 15) * 15
        : rotate.rotation + delta;
      rotate.element.style.transform = `rotate(${rotate.nextRotation}deg) scale(${rotate.scale}, ${rotate.scaleY})`;
      syncImageControls(rotate.element);
      if (rotate.target === 'canvasShape')
        rotate.element.style.setProperty('--shape-rotation', `${rotate.nextRotation}deg`);
      return;
    }
    if (resizeRef.current) {
      const resize = resizeRef.current;
      if (resize.target !== 'title') {
        const angle = (resize.rotation * Math.PI) / 180,
          cos = Math.cos(angle),
          sin = Math.sin(angle);
        const dx = event.clientX - resize.x,
          dy = event.clientY - resize.y;
        let scaleX = Math.max(
          0.1,
          Math.min(8, resize.scale + (dx * cos + dy * sin) / resize.width),
        );
        let scaleY = Math.max(
          0.1,
          Math.min(8, resize.scaleY + (-dx * sin + dy * cos) / resize.height),
        );
        if (event.shiftKey) {
          const rx = scaleX / resize.scale,
            ry = scaleY / resize.scaleY;
          const ratio = Math.max(
            0.1 / resize.scale,
            0.1 / resize.scaleY,
            Math.min(
              8 / resize.scale,
              8 / resize.scaleY,
              Math.abs(rx - 1) > Math.abs(ry - 1) ? rx : ry,
            ),
          );
          scaleX = resize.scale * ratio;
          scaleY = resize.scaleY * ratio;
        }
        // Keep the opposite corner fixed, including for rotated images.
        const offsetX = (resize.width * (scaleX - resize.scale)) / 2;
        const offsetY = (resize.height * (scaleY - resize.scaleY)) / 2;
        resize.nextPosition = {
          x: resize.position.x + ((offsetX * cos - offsetY * sin) / resize.canvasWidth) * 100,
          y: resize.position.y + ((offsetX * sin + offsetY * cos) / resize.canvasHeight) * 100,
        };
        resize.nextScale = scaleX;
        resize.nextScaleY = scaleY;
        Object.assign(resize.element.style, {
          left: `${resize.nextPosition.x}%`,
          top: `${resize.nextPosition.y}%`,
          transform: `rotate(${resize.rotation}deg) scale(${scaleX}, ${scaleY})`,
        });
        syncControlScale(resize.element, scaleX, scaleY);
        syncImageControls(resize.element);
        return;
      }
      const delta = (event.clientX - resize.x + (event.clientY - resize.y)) / 2 / resize.size;
      const scale = Math.max(0.35, Math.min(3.5, resize.scale + delta));
      resize.nextScale = scale;
      resize.element.style.transform = `scale(${scale})`;
      syncControlScale(resize.element, scale);
      return;
    }
    if (!dragRef.current) return;
    const drag = dragRef.current;
    const x = Math.max(
      1,
      Math.min(drag.maxX, ((drag.originX + event.clientX - drag.x) / drag.canvasWidth) * 100),
    );
    const y = Math.max(
      2,
      Math.min(drag.maxY, ((drag.originY + event.clientY - drag.y) / drag.canvasHeight) * 100),
    );
    drag.nextX = x;
    drag.nextY = y;
    // Move the composited layer; layout coordinates are committed once on release.
    const dx = ((x * drag.canvasWidth) / 100 - drag.originX) * drag.cssScaleX;
    const dy = ((y * drag.canvasHeight) / 100 - drag.originY) * drag.cssScaleY;
    drag.element.style.translate = `${dx}px ${dy}px 0px`;
    syncImageControls(drag.element);
  };
  const pointerMove = (event: ReactPointerEvent<HTMLElement>) => {
    if (
      !dragRef.current &&
      !resizeRef.current &&
      !rotateRef.current &&
      !textResizeRef.current &&
      !shapeResizeRef.current
    )
      return;
    pendingPointerRef.current = {
      clientX: event.clientX,
      clientY: event.clientY,
      shiftKey: event.shiftKey,
    };
    if (!pointerFrameRef.current)
      pointerFrameRef.current = requestAnimationFrame(() => {
        pointerFrameRef.current = 0;
        const latest = pendingPointerRef.current;
        pendingPointerRef.current = null;
        if (latest) applyPointerMove(latest);
      });
  };
  const pointerEnd = (event?: ReactPointerEvent<HTMLElement>) => {
    if (pointerFrameRef.current) cancelAnimationFrame(pointerFrameRef.current);
    pointerFrameRef.current = 0;
    const latest = event?.type === 'pointerup' ? event : pendingPointerRef.current;
    pendingPointerRef.current = null;
    if (latest) applyPointerMove(latest);
    const shapeResize = shapeResizeRef.current;
    if (shapeResize)
      updatePage({
        canvasShapes: (page.canvasShapes || []).map((shape) =>
          shape.id === shapeResize.id ? { ...shape, ...shapeResize.next } : shape,
        ),
      });
    const textResize = textResizeRef.current;
    if (textResize)
      updatePage({
        canvasTextBoxes: (page.canvasTextBoxes || []).map((box) =>
          box.id === textResize.id
            ? { ...box, width: textResize.nextWidth, height: textResize.nextHeight }
            : box,
        ),
      });
    const rotate = rotateRef.current;
    if (rotate) {
      rotate.element.classList.remove('is-rotating');
      if (rotate.target === 'media') updatePage({ mediaRotation: rotate.nextRotation });
      else if (rotate.target === 'canvasShape')
        updatePage({
          canvasShapes: (page.canvasShapes || []).map((shape) =>
            shape.id === rotate.id ? { ...shape, rotation: rotate.nextRotation } : shape,
          ),
        });
      else
        updatePage({
          canvasImages: (page.canvasImages || []).map((image) =>
            image.id === rotate.id ? { ...image, rotation: rotate.nextRotation } : image,
          ),
        });
    }
    const resize = resizeRef.current;
    if (resize) {
      if (resize.target === 'media')
        updatePage({
          mediaScale: resize.nextScale,
          mediaScaleY: resize.nextScaleY,
          mediaPos: resize.nextPosition,
        });
      else if (resize.target === 'canvasImage')
        updatePage({
          canvasImages: (page.canvasImages || []).map((image) =>
            image.id === resize.id
              ? {
                  ...image,
                  scale: resize.nextScale,
                  scaleY: resize.nextScaleY,
                  ...resize.nextPosition,
                }
              : image,
          ),
        });
      else if (resize.target === 'title') updatePage({ titleScale: resize.nextScale });
      else
        updatePage({
          stickerScale: resize.nextScale,
          stickerScaleY: resize.nextScaleY,
          componentPositions: { ...page.componentPositions, sticker: resize.nextPosition },
        });
    }
    const drag = dragRef.current;
    if (drag) {
      Object.assign(drag.element.style, {
        left: `${drag.nextX}%`,
        top: `${drag.nextY}%`,
        translate: '',
      });
      syncImageControls(drag.element);
      drag.element.classList.remove('is-dragging');
      if (drag.target === 'canvasText')
        updatePage({
          canvasTextBoxes: (page.canvasTextBoxes || []).map((box) =>
            box.id === drag.id ? { ...box, x: drag.nextX, y: drag.nextY } : box,
          ),
        });
      else if (drag.target === 'canvasImage')
        updatePage({
          canvasImages: (page.canvasImages || []).map((image) =>
            image.id === drag.id ? { ...image, x: drag.nextX, y: drag.nextY } : image,
          ),
        });
      else if (drag.target === 'canvasShape')
        updatePage({
          canvasShapes: (page.canvasShapes || []).map((shape) =>
            shape.id === drag.id ? { ...shape, x: drag.nextX, y: drag.nextY } : shape,
          ),
        });
      else if (drag.target === 'text') updatePage({ textPos: { x: drag.nextX, y: drag.nextY } });
      else if (drag.target === 'media') updatePage({ mediaPos: { x: drag.nextX, y: drag.nextY } });
      else
        updatePage({
          componentPositions: {
            ...page.componentPositions,
            [drag.target]: { x: drag.nextX, y: drag.nextY },
          },
        });
    }
    dragRef.current = null;
    resizeRef.current = null;
    rotateRef.current = null;
    textResizeRef.current = null;
    shapeResizeRef.current = null;
    canvasRef.current?.classList.remove('component-transforming');
  };
  const textBoxResizeStart = (event: ReactPointerEvent<HTMLButtonElement>, box: CanvasTextBox) => {
    if (isLayerLocked('text')) return;
    if (mode !== 'edit' || hideTools) return;
    event.preventDefault();
    event.stopPropagation();
    event.currentTarget.setPointerCapture(event.pointerId);
    const element = event.currentTarget.parentElement;
    const canvas = canvasRef.current?.getBoundingClientRect();
    const rect = element?.getBoundingClientRect();
    if (!element || !canvas || !rect) return;
    recordHistory();
    const width = box.width ?? (rect.width / canvas.width) * 100;
    const height = box.height ?? (rect.height / canvas.height) * 100;
    textResizeRef.current = {
      id: box.id,
      x: event.clientX,
      y: event.clientY,
      width,
      height,
      canvasWidth: canvas.width,
      canvasHeight: canvas.height,
      element,
      nextWidth: width,
      nextHeight: height,
    };
    setSelected('text');
    setSelectedCanvasTextId(box.id);
    setSelectedCanvasImageId(null);
  };
  const tapePoint = (event: ReactPointerEvent<SVGSVGElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    return {
      x: Math.max(0, Math.min(100, ((event.clientX - rect.left) / rect.width) * 100)),
      y: Math.max(0, Math.min(100, ((event.clientY - rect.top) / rect.height) * 100)),
    };
  };
  const startTapeStroke = (event: ReactPointerEvent<SVGSVGElement>) => {
    if (!tapeMode || mode !== 'edit') return;
    event.preventDefault();
    event.stopPropagation();
    event.currentTarget.setPointerCapture(event.pointerId);
    const stroke: TapeStroke = {
      id: crypto.randomUUID(),
      material: tapeMaterial,
      texture: tapeTexture,
      textureId: tapeTexture === 'custom' ? tapeTextureId : undefined,
      width: tapeWidth,
      points: [tapePoint(event)],
    };
    tapeDraftRef.current = stroke;
    setTapeDraft(stroke);
  };
  const moveTapeStroke = (event: ReactPointerEvent<SVGSVGElement>) => {
    const draft = tapeDraftRef.current;
    if (!draft || event.buttons === 0) return;
    const point = tapePoint(event);
    const previous = draft.points[draft.points.length - 1];
    if (Math.hypot((point.x - previous.x) * 10, (point.y - previous.y) * 10) < 1.3) return;
    const next = { ...draft, points: [...draft.points, point] };
    tapeDraftRef.current = next;
    setTapeDraft(next);
  };
  const finishTapeStroke = () => {
    const finished = tapeDraftRef.current;
    tapeDraftRef.current = null;
    setTapeDraft(null);
    if (!finished) return;
    const completed =
      finished.points.length < 2
        ? {
            ...finished,
            points: [
              ...finished.points,
              { x: Math.min(100, finished.points[0].x + 0.1), y: finished.points[0].y },
            ],
          }
        : finished;
    snapshot(
      pages.map((item) =>
        item.id === activeId ? { ...item, tapes: [...(item.tapes || []), completed] } : item,
      ),
    );
    setToast('胶带已贴到画布');
  };
  const tapePath = (points: TapeStroke['points']) => {
    if (!points.length) return '';
    if (points.length === 1)
      return `M ${points[0].x} ${points[0].y} L ${points[0].x + 0.05} ${points[0].y}`;
    let path = `M ${points[0].x} ${points[0].y}`;
    for (let index = 1; index < points.length - 1; index++) {
      const current = points[index];
      const next = points[index + 1];
      path += ` Q ${current.x} ${current.y} ${(current.x + next.x) / 2} ${(current.y + next.y) / 2}`;
    }
    const last = points[points.length - 1];
    path += ` L ${last.x} ${last.y}`;
    return path;
  };
  const removeComponent = (component: PageComponent) => {
    if (isLayerLocked(component)) return;
    const removedComponents = [...new Set([...(page.removedComponents || []), component])];
    const hiddenComponents = (page.hiddenComponents || []).filter((item) => item !== component);
    const emptyFields: Partial<Page> =
      component === 'media'
        ? {
            photo: '',
            photoCutout: undefined,
            backgroundCutout: undefined,
            video: '',
            useCutout: false,
          }
        : component === 'sticker'
          ? { sticker: '' }
          : component === 'text'
            ? { text: '', textHtml: undefined, canvasTextBoxes: [] }
            : component === 'shape'
              ? { canvasShapes: [] }
              : component === 'footer'
                ? { footerText: '' }
                : component === 'title'
                  ? { title: '' }
                  : component === 'date'
                    ? { date: '' }
                    : {};
    snapshot(
      pages.map((item) =>
        item.id === activeId
          ? { ...item, ...emptyFields, hiddenComponents, removedComponents }
          : item,
      ),
    );
    if (component === 'media') {
      setSelectedCanvasImageId(null);
      setSelectedCanvasTextId(null);
    }
    if (component === 'text') setSelectedCanvasTextId(null);
    if (component === 'shape') setSelectedCanvasShapeId(null);
    setSelected(null);
    setToast('页面组件及其内容已彻底删除');
  };
  const restoreComponent = (component: PageComponent) =>
    snapshot(
      pages.map((item) =>
        item.id === activeId
          ? {
              ...item,
              hiddenComponents: (item.hiddenComponents || []).filter(
                (hiddenItem) => hiddenItem !== component,
              ),
              removedComponents: (item.removedComponents || []).filter(
                (removedItem) => removedItem !== component,
              ),
            }
          : item,
      ),
    );
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (screen !== 'editor' || mode !== 'edit') return;
      const eventTarget = event.target as HTMLInputElement | HTMLTextAreaElement;
      const editingText =
        eventTarget?.matches?.('input,textarea,[contenteditable="true"]') ?? false;
      const selection = window.getSelection();
      const hasSelectedText =
        eventTarget instanceof HTMLInputElement || eventTarget instanceof HTMLTextAreaElement
          ? eventTarget.selectionStart !== eventTarget.selectionEnd
          : Boolean(selection?.toString());
      if (
        !editingText &&
        !panel &&
        !cropMode &&
        (event.key === 'ArrowLeft' || event.key === 'ArrowRight')
      ) {
        event.preventDefault();
        changePage(event.key === 'ArrowRight' ? 1 : -1);
        return;
      }
      const command = event.ctrlKey || event.metaKey;
      if (command && (!editingText || !hasSelectedText) && event.key.toLowerCase() === 'c') {
        if (selected === 'text' && selectedCanvasTextId) {
          const box = page.canvasTextBoxes?.find((item) => item.id === selectedCanvasTextId);
          if (box)
            componentClipboardRef.current = { kind: 'text', text: box.text, style: box.style };
        } else if (selected === 'media' && selectedCanvasImageId) {
          const image = page.canvasImages?.find((item) => item.id === selectedCanvasImageId);
          if (image)
            componentClipboardRef.current = {
              kind: 'image',
              src: image.src,
              rotation: image.rotation,
              stickerStyle: image.stickerStyle,
              stickerVariant: image.stickerVariant,
              stickerOutline: image.stickerOutline,
              stickerOutlineColor: image.stickerOutlineColor,
              stickerOutlineWidth: image.stickerOutlineWidth,
              stickerDimensional: image.stickerDimensional,
            };
        } else if (selected === 'text')
          componentClipboardRef.current = {
            kind: 'text',
            text: page.text,
            style: { ...textStyleFor(page, 'text') },
          };
        else if (selected === 'title' || selected === 'date' || selected === 'footer') {
          const component = selected as TextComponent;
          const text =
            component === 'title'
              ? page.title
              : component === 'date'
                ? page.date
                : (page.footerText ?? '慢慢生活，慢慢记录。');
          componentClipboardRef.current = {
            kind: 'text',
            text,
            style: { ...textStyleFor(page, component) },
          };
        } else if (selected === 'sticker')
          componentClipboardRef.current = {
            kind: 'text',
            text: page.sticker || '✿',
            style: { ...defaultTextStyle, fontFamily: 'serif' },
          };
        else if (selected === 'media')
          componentClipboardRef.current = {
            kind: 'image',
            src:
              (page.useCutout
                ? page.cutoutMode === 'background' && page.backgroundCutout
                  ? page.backgroundCutout
                  : page.photoCutout || page.photo
                : page.photo) ||
              (page.weather === 'rain'
                ? scenic.rain
                : page.weather === 'snow'
                  ? scenic.snow
                  : page.weather === 'cloud'
                    ? scenic.cloud
                    : scenic.sun),
            rotation: page.mediaRotation,
            stickerStyle: page.stickerStyle,
            stickerVariant: page.stickerVariant,
            stickerOutline: page.stickerOutline,
            stickerOutlineColor: page.stickerOutlineColor,
            stickerOutlineWidth: page.stickerOutlineWidth,
            stickerDimensional: page.stickerDimensional,
          };
        if (componentClipboardRef.current) {
          event.preventDefault();
          setToast('组件已复制，按 Ctrl+V 粘贴');
          return;
        }
      }
      if (
        command &&
        !editingText &&
        event.key.toLowerCase() === 'v' &&
        componentClipboardRef.current
      ) {
        event.preventDefault();
        const clip = componentClipboardRef.current;
        if (clip.kind === 'text') addTextBox(clip.text, clip.style);
        else {
          const image: CanvasImage = {
            id: crypto.randomUUID(),
            src: clip.src,
            x: 55,
            y: 43,
            scale: 0.8,
            rotation: clip.rotation,
            stickerStyle: clip.stickerStyle,
            stickerVariant: clip.stickerVariant,
            stickerOutline: clip.stickerOutline,
            stickerOutlineColor: clip.stickerOutlineColor,
            stickerOutlineWidth: clip.stickerOutlineWidth,
            stickerDimensional: clip.stickerDimensional,
          };
          snapshot(
            pages.map((item) =>
              item.id === activeId
                ? { ...item, canvasImages: [...(item.canvasImages || []), image] }
                : item,
            ),
          );
          setSelected('media');
          setSelectedCanvasTextId(null);
          setSelectedCanvasImageId(image.id);
          setToast('图片组件已粘贴，可拖动调整位置');
        }
        return;
      }
      if (command && !editingText && event.key.toLowerCase() === 'z') {
        event.preventDefault();
        event.shiftKey ? redo() : undo();
        return;
      }
      if (command && !editingText && event.key.toLowerCase() === 'y') {
        event.preventDefault();
        redo();
        return;
      }
      if (command && event.key.toLowerCase() === 's') {
        event.preventDefault();
        void persistLibrary(true);
        return;
      }
      if (
        editingText ||
        !selected ||
        (selectedLayerKey && isLayerLocked(selectedLayerKey)) ||
        !['Delete', 'Backspace'].includes(event.key)
      )
        return;
      event.preventDefault();
      if (selected === 'text' && selectedCanvasTextId) {
        const id = selectedCanvasTextId;
        snapshot(
          pages.map((item) =>
            item.id === activeId
              ? {
                  ...item,
                  canvasTextBoxes: (item.canvasTextBoxes || []).filter((box) => box.id !== id),
                }
              : item,
          ),
        );
        setSelectedCanvasTextId(null);
        setSelected(null);
        return;
      }
      if (selected === 'media' && selectedCanvasImageId) {
        const id = selectedCanvasImageId;
        snapshot(
          pages.map((item) =>
            item.id === activeId
              ? {
                  ...item,
                  canvasImages: (item.canvasImages || []).filter((image) => image.id !== id),
                }
              : item,
          ),
        );
        setSelectedCanvasImageId(null);
        setSelected(null);
        return;
      }
      if (selected === 'shape' && selectedCanvasShapeId) {
        const id = selectedCanvasShapeId;
        snapshot(
          pages.map((item) =>
            item.id === activeId
              ? {
                  ...item,
                  canvasShapes: (item.canvasShapes || []).filter((shape) => shape.id !== id),
                }
              : item,
          ),
        );
        setSelectedCanvasShapeId(null);
        setSelected(null);
        return;
      }
      removeComponent(selected);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [
    selected,
    mode,
    screen,
    panel,
    cropMode,
    page,
    pages,
    history,
    future,
    activeBookId,
    notebookPages,
    shelfBooks,
    pageTurn,
  ]);

  const createNotebook = () => {
    const title = `未命名手账 ${shelfBooks.length + 1}`;
    const id = `journal-${crypto.randomUUID()}`;
    const spreadFresh = initialPages.map((p, i) => ({
      ...migratePageToSpread(p),
      id: crypto.randomUUID(),
      title: i === 0 ? '新的开始' : p.title,
      photo: '',
      video: '',
      sticker: '',
    }));
    setNotebookPages((all) => ({ ...all, [id]: spreadFresh }));
    setPages(spreadFresh);
    setHistory([]);
    setFuture([]);
    setActiveId(spreadFresh[0].id);
    setBookTitle(title);
    setActiveBookId(id);
    setShelfBooks((items) => [
      { id, title, pages: spreadFresh.length, updated: '刚刚创建' },
      ...items,
    ]);
    setScreen('editor');
    setMode('edit');
    setToast('新手账已创建，开始记录吧');
  };
  const beginCoverEdit = (index: number) => {
    const book = shelfBooks[index];
    setCoverDraftColor(book.coverColor || ['#b5b39e', '#93a69f', '#c7a98e'][index % 3]);
    setRibbonDraftColor(book.ribbonColor || '#ece3cc');
    setCoverDraftImage(book.coverImage);
    setCoverEditorIndex(index);
  };
  const saveCoverEdit = () => {
    if (coverEditorIndex === null) return;
    const updated = shelfBooks.map((book, index) =>
      index === coverEditorIndex
        ? {
            ...book,
            coverColor: coverDraftColor,
            ribbonColor: ribbonDraftColor,
            coverImage: coverDraftImage,
          }
        : book,
    );
    try {
      localStorage.setItem('yepaper-books', JSON.stringify(updated));
    } catch {
      setToast('存储空间不足，封面未能保存');
      return;
    }
    setShelfBooks(updated);
    setCoverEditorIndex(null);
    setToast('手账封面已更新');
  };
  const uploadCover = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || coverEditorIndex === null) return;
    try {
      const bitmap = await createImageBitmap(file);
      const scale = Math.min(1, 1200 / bitmap.width, 1600 / bitmap.height);
      const canvas = document.createElement('canvas');
      canvas.width = Math.max(1, Math.round(bitmap.width * scale));
      canvas.height = Math.max(1, Math.round(bitmap.height * scale));
      const context = canvas.getContext('2d');
      if (!context) throw new Error('图片无法处理');
      context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
      bitmap.close();
      const coverImage = canvas.toDataURL('image/jpeg', 0.72);
      if (coverImage.length > 1_100_000) throw new Error('封面图片过大');
      setCoverDraftImage(coverImage);
      setToast('封面图片已上传');
    } catch {
      setToast('封面图片无法读取，请换一张 JPG 或 PNG');
    } finally {
      event.target.value = '';
    }
  };
  const selectNotebook = (selectedBook: ShelfBook, coverElement: HTMLButtonElement) => {
    const selectedPages = notebookPages[selectedBook.id] || initialPages.map(migratePageToSpread);
    setBookTitle(selectedBook.title);
    setActiveBookId(selectedBook.id);
    setPages(selectedPages);
    setHistory([]);
    setFuture([]);
    setActiveId(selectedPages[0]?.id);
    setMode('edit');
    void coverElement;
    playFlipSound();
    setOpeningBook({ book: selectedBook });
  };
  const togglePageMusic = async () => {
    const audio = bookMusicRef.current;
    if (musicPlaying) {
      audio?.pause();
      setMusicPlaying(false);
      setMusicPaused(true);
      return;
    }
    if (!page.backgroundMusic) {
      bookMusicFileRef.current?.click();
      return;
    }
    if (!soundEnabled) {
      setToast('请先在音效控制中开启声音');
      return;
    }
    if (!audio || !musicSource) {
      setToast('背景音乐正在载入，请稍候');
      return;
    }
    setMusicPaused(false);
    try {
      await audio.play();
      if (
        audio === bookMusicRef.current &&
        audio.getAttribute('src') === musicSource &&
        !audio.paused &&
        !audio.muted
      )
        setMusicPlaying(true);
    } catch {
      if (audio === bookMusicRef.current && audio.getAttribute('src') === musicSource)
        setToast('无法播放此音频，请尝试其他文件');
    }
  };
  const uploadPageMusic = async (event: ChangeEvent<HTMLInputElement>) => {
    const input = event.currentTarget;
    const file = input.files?.[0];
    input.value = '';
    if (!file || !activeBookId) return;
    const targetPageId = page.id,
      targetBookId = activeBookId;
    const id = `page-music:${crypto.randomUUID()}`;
    try {
      await saveJournalMusic(id, file);
      if (latestEditorRef.current.activeBookId !== targetBookId) {
        setNotebookPages((all) => ({
          ...all,
          [targetBookId]: (all[targetBookId] || []).map((item) =>
            item.id === targetPageId ? { ...item, backgroundMusic: { id, name: file.name } } : item,
          ),
        }));
      } else {
        recordHistory();
        editPages((all) =>
          all.map((item) =>
            item.id === targetPageId ? { ...item, backgroundMusic: { id, name: file.name } } : item,
          ),
        );
      }
      setToast('已为此页设置背景音乐');
    } catch {
      setToast('音乐保存失败，请重试');
    }
  };
  const removePageMusic = () => {
    // Keep the asset for undo and for duplicated pages sharing this track.
    snapshot(
      pages.map((item) => (item.id === page.id ? { ...item, backgroundMusic: null } : item)),
    );
    setToast('已移除此页的背景音乐');
  };
  const deleteNotebook = () => {
    if (!deleteBookId) return;
    const removed = shelfBooks.find((book) => book.id === deleteBookId);
    const remaining = shelfBooks.filter((book) => book.id !== deleteBookId);
    const nextPages = { ...notebookPages };
    delete nextPages[deleteBookId];
    void deleteJournalMusic(deleteBookId).catch(() => undefined);
    setShelfBooks(remaining);
    setNotebookPages(nextPages);
    if (activeBookId === deleteBookId) {
      setActiveBookId(remaining[0]?.id || '');
      setPages(
        remaining[0]
          ? nextPages[remaining[0].id] || initialPages.map(migratePageToSpread)
          : initialPages.map(migratePageToSpread),
      );
      setBookTitle(remaining[0]?.title || '');
    }
    if (removed) setToast(`已删除「${removed.title}」`);
    setDeleteBookId(null);
  };
  const uploadWallpaper = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      const bitmap = await createImageBitmap(file);
      const scale = Math.min(1, 1500 / bitmap.width, 1100 / bitmap.height);
      const canvas = document.createElement('canvas');
      canvas.width = Math.max(1, Math.round(bitmap.width * scale));
      canvas.height = Math.max(1, Math.round(bitmap.height * scale));
      const context = canvas.getContext('2d');
      if (!context) throw new Error('无法处理此图片');
      context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
      bitmap.close();
      const compactImage = canvas.toDataURL('image/jpeg', 0.65);
      const usedBytes = backgroundTemplates.reduce(
        (sum, template) => sum + template.image.length,
        0,
      );
      if (compactImage.length > 750_000 || usedBytes + compactImage.length > 1_800_000)
        throw new Error('图片仍然太大，请删除一些旧背景或选择尺寸较小的图片');
      const template = { id: crypto.randomUUID(), image: compactImage };
      setBackgroundTemplates((all) => [template, ...all]);
      setWallpaper(compactImage);
      setWallpaperPicker(false);
      setToast('工作台背景已更换');
    } catch (error) {
      setToast(
        error instanceof Error && error.message.includes('太大')
          ? error.message
          : '背景图片无法读取，请尝试 JPG 或 PNG 图片',
      );
    } finally {
      event.target.value = '';
    }
  };
  const removeBackgroundTemplate = (template: BackgroundTemplate) => {
    const remaining = backgroundTemplates.filter((item) => item.id !== template.id);
    setBackgroundTemplates(remaining);
    if (wallpaper === template.image) setWallpaper(remaining[0]?.image || 'mist');
  };

  if (screen === 'shelf')
    return (
      <main
        className={`shelf-screen tone-dark wallpaper-${wallpaper.startsWith('data:') ? 'custom' : wallpaper} ${shelfWeather === 'snow' ? 'shelf-weather-snow' : ''}`}
      >
        {wallpaper.startsWith('data:') && (
          <div
            className="shelf-wallpaper-blur"
            style={{ backgroundImage: `url("${wallpaper}")` }}
          />
        )}
        <div className="shelf-atmosphere" />
        <WorkbenchWeatherFx
          weather={shelfWeather}
          intensity={shelfWeatherIntensity}
          wallpaper={wallpaper}
        />
        <BookmarkChimes
          snow={shelfWeather === 'snow'}
          soundEnabled={soundEnabled}
          volume={soundVolume}
        />
        <header className="shelf-header">
          <div className="shelf-brand">
            <span className="shelf-brand-mark">頁</span>
            <span>页间</span>
          </div>
          <div className="shelf-header-actions">
            <div className="shelf-weather-switch" role="group" aria-label="主界面天气">
              {(
                [
                  { id: 'normal', label: '正常', Icon: Eye },
                  { id: 'rain', label: '雨天', Icon: CloudRain },
                  { id: 'snow', label: '雪天', Icon: CloudSnow },
                ] as const
              ).map(({ id, label, Icon }) => (
                <div className="shelf-weather-option" key={id}>
                  <button
                    className={shelfWeather === id ? 'active' : ''}
                    onClick={() => {
                      if (id === 'normal') {
                        setShelfWeather(id);
                        setWeatherIntensityOpen(false);
                        return;
                      }
                      const sameWeather = shelfWeather === id;
                      setShelfWeather(id);
                      setWeatherIntensityOpen(sameWeather ? !weatherIntensityOpen : true);
                    }}
                    aria-label={label}
                    title={label}
                    aria-pressed={shelfWeather === id}
                    aria-expanded={shelfWeather === id && weatherIntensityOpen}
                  >
                    <Icon size={16} />
                  </button>
                  {shelfWeather === id &&
                    weatherIntensityOpen &&
                    (id === 'rain' || id === 'snow') && (
                      <label className="shelf-weather-intensity">
                        <span>{id === 'rain' ? '雨势' : '雪量'}</span>
                        <input
                          aria-label={id === 'rain' ? '雨势强度' : '雪量强度'}
                          type="range"
                          min="1"
                          max="4"
                          step="1"
                          value={shelfWeatherIntensity}
                          onChange={(event) => setShelfWeatherIntensity(Number(event.target.value))}
                        />
                      </label>
                    )}
                </div>
              ))}
            </div>
            <SoundControl
              enabled={soundEnabled}
              volume={soundVolume}
              onEnabledChange={setSoundEnabled}
              onVolumeChange={setSoundVolume}
            />
            <button
              className="wallpaper-trigger"
              onClick={() => setWallpaperPicker(!wallpaperPicker)}
            >
              <span className="wallpaper-orb" />
              更换氛围背景
              <ChevronDown size={14} />
            </button>
          </div>
        </header>
        {wallpaperPicker && (
          <div className="wallpaper-menu">
            <p>工作台模板 · 选择后会记住</p>
            <div className="wallpaper-presets">
              <button
                className={`wallpaper-thumb mist ${wallpaper === 'mist' ? 'selected' : ''}`}
                onClick={() => {
                  setWallpaper('mist');
                  setWallpaperPicker(false);
                }}
              >
                <span>晨雾</span>
              </button>
              <button
                className={`wallpaper-thumb dusk ${wallpaper === 'dusk' ? 'selected' : ''}`}
                onClick={() => {
                  setWallpaper('dusk');
                  setWallpaperPicker(false);
                }}
              >
                <span>暮色</span>
              </button>
              <button
                className={`wallpaper-thumb garden ${wallpaper === 'garden' ? 'selected' : ''}`}
                onClick={() => {
                  setWallpaper('garden');
                  setWallpaperPicker(false);
                }}
              >
                <span>苔庭</span>
              </button>
            </div>
            {backgroundTemplates.length > 0 && (
              <>
                <p className="custom-template-heading">我的背景图片</p>
                <div className="custom-background-grid">
                  {backgroundTemplates.map((template) => (
                    <div
                      className={`custom-background-item ${wallpaper === template.image ? 'active' : ''}`}
                      key={template.id}
                    >
                      <button
                        style={{ backgroundImage: `url("${template.image}")` }}
                        onClick={() => {
                          setWallpaper(template.image);
                          setWallpaperPicker(false);
                        }}
                        title="使用这张背景图"
                      />
                      <button
                        className="delete-background"
                        onClick={() => removeBackgroundTemplate(template)}
                        aria-label="删除背景模板"
                      >
                        <X size={11} />
                      </button>
                    </div>
                  ))}
                </div>
              </>
            )}
            <button
              className="wallpaper-upload"
              onClick={() => document.getElementById('wallpaper-file')?.click()}
            >
              <Upload size={14} />
              添加背景图片
            </button>
          </div>
        )}
        <input
          id="wallpaper-file"
          className="visually-hidden"
          type="file"
          accept="image/*"
          onChange={uploadWallpaper}
        />
        <input
          ref={coverFileRef}
          className="visually-hidden"
          type="file"
          accept="image/*"
          onChange={uploadCover}
        />
        <section className="shelf-content">
          <div className="book-corridor" ref={corridorRef} aria-label="手账长廊">
            <div className="book-shelf-grid">
              {shelfBooks.map((book, i) => (
                <article className="shelf-book-card" key={book.id}>
                  <button
                    className="book-card-open"
                    onClick={(event) => selectNotebook(book, event.currentTarget)}
                  >
                    <BookCover3D
                      title={book.title}
                      coverColor={book.coverColor || ['#b5b39e', '#93a69f', '#c7a98e'][i % 3]}
                      ribbonColor={book.ribbonColor || '#ece3cc'}
                      image={book.coverImage}
                      snow={shelfWeather === 'snow'}
                    />
                    <span className="book-card-meta">
                      <strong>{book.title}</strong>
                      <span>
                        {book.pages} 页 <i>·</i> {book.updated}
                      </span>
                    </span>
                  </button>
                  <button
                    className="cover-edit-button"
                    title="自定义封面"
                    aria-label={`自定义 ${book.title} 封面`}
                    onClick={() => beginCoverEdit(i)}
                  >
                    <Palette size={14} />
                    <span>封面</span>
                  </button>
                  <button
                    className="book-delete-button"
                    title={`删除 ${book.title}`}
                    aria-label={`删除 ${book.title}`}
                    onClick={() => setDeleteBookId(book.id)}
                  >
                    <Trash2 size={14} />
                  </button>
                </article>
              ))}
            </div>
          </div>
          <button className="add-book-tile" onClick={createNotebook}>
            <span>
              <Plus size={22} />
            </span>
            <strong>开始一本新的手账</strong>
            <small>选择纸张，把今天写下来</small>
          </button>
        </section>
        {deleteBookId && (
          <div
            className="cover-modal-backdrop"
            onMouseDown={(event) => {
              if (event.target === event.currentTarget) setDeleteBookId(null);
            }}
          >
            <section
              className="cover-modal delete-book-dialog"
              role="alertdialog"
              aria-modal="true"
              aria-labelledby="delete-book-title"
            >
              <header>
                <div>
                  <span className="eyebrow">REMOVE NOTEBOOK</span>
                  <h2 id="delete-book-title">删除这本手账？</h2>
                </div>
                <button
                  className="icon-button"
                  onClick={() => setDeleteBookId(null)}
                  aria-label="关闭删除确认"
                >
                  <X size={17} />
                </button>
              </header>
              <p className="cover-modal-note">
                「{shelfBooks.find((book) => book.id === deleteBookId)?.title}
                」及其中的页面内容将从书架移除，此操作无法撤销。
              </p>
              <footer>
                <button className="cover-cancel" onClick={() => setDeleteBookId(null)}>
                  取消
                </button>
                <button className="delete-book-confirm" onClick={deleteNotebook}>
                  <Trash2 size={14} />
                  删除手账
                </button>
              </footer>
            </section>
          </div>
        )}
        {coverEditorIndex !== null && (
          <div
            className="cover-modal-backdrop"
            onMouseDown={(event) => {
              if (event.target === event.currentTarget) setCoverEditorIndex(null);
            }}
          >
            <section
              className="cover-modal"
              role="dialog"
              aria-modal="true"
              aria-labelledby="cover-modal-title"
            >
              <header>
                <div>
                  <span className="eyebrow">COVER DESIGN</span>
                  <h2 id="cover-modal-title">设计手账封面</h2>
                </div>
                <button
                  className="icon-button"
                  onClick={() => setCoverEditorIndex(null)}
                  aria-label="关闭封面设置"
                >
                  <X size={17} />
                </button>
              </header>
              <div
                className="cover-preview"
                style={{
                  backgroundColor: coverDraftColor,
                  ...(coverDraftImage ? { backgroundImage: `url(\"${coverDraftImage}\")` } : {}),
                }}
              >
                <span
                  className="cover-preview-ribbon"
                  style={{ backgroundColor: ribbonDraftColor }}
                />
              </div>
              <label className="cover-color-row">
                <span>
                  <i className="color-dot cover-dot" />
                  封面底色
                </span>
                <input
                  type="color"
                  value={coverDraftColor}
                  onChange={(e) => setCoverDraftColor(e.target.value)}
                />
              </label>
              <label className="cover-color-row">
                <span>
                  <i className="color-dot ribbon-dot" />
                  彩带颜色
                </span>
                <input
                  type="color"
                  value={ribbonDraftColor}
                  onChange={(e) => setRibbonDraftColor(e.target.value)}
                />
              </label>
              <button className="cover-image-upload" onClick={() => coverFileRef.current?.click()}>
                <ImagePlus size={16} />
                上传封面图片
              </button>
              <p className="cover-modal-note">封面仅显示纯色或上传图片，以及可自定义颜色的彩带。</p>
              <footer>
                <button className="cover-cancel" onClick={() => setCoverEditorIndex(null)}>
                  取消
                </button>
                <button className="cover-save" onClick={saveCoverEdit}>
                  <Check size={15} />
                  保存封面
                </button>
              </footer>
            </section>
          </div>
        )}
        {openingBook &&
          createPortal(
            <div className="book-opening-overlay" aria-hidden="true">
              <div className="book-opening-spread">
                <OpeningBook3D book={openingBook.book} />
              </div>
            </div>,
            document.body,
          )}
        <footer className="shelf-footer" />
      </main>
    );

  return (
    <main
      className={`app-shell wallpaper-${wallpaper.startsWith('data:') ? 'custom' : wallpaper} ${mode === 'read' ? 'reading-mode' : ''} ${hideTools ? 'tools-hidden' : ''} ambience-${page.weather}`}
      style={
        {
          ...(wallpaper.startsWith('data:')
            ? {
                backgroundImage: `linear-gradient(120deg, #18233199, #3d403c66), url(${wallpaper})`,
              }
            : {}),
          '--weather-dim-screen':
            page.screenBrightness ??
            (page.weather === 'rain' || page.weather === 'snow'
              ? 0.28
              : page.weather === 'cloud'
                ? 0.16
                : 0.08),
        } as CSSProperties
      }
    >
      <header className="topbar">
        <button
          className="brand editor-brand"
          onClick={async () => {
            if (!(await persistLibrary())) return;
            setNotebookPages((all) => ({ ...all, [activeBookId]: pages }));
            setShelfBooks((items) =>
              items.map((item) =>
                item.id === activeBookId
                  ? { ...item, pages: pages.length, updated: '刚刚编辑' }
                  : item,
              ),
            );
            setScreen('shelf');
            setMode('edit');
          }}
          title="返回手账书架"
        >
          <span className="brand-back-wrap">
            <ArrowLeft className="brand-back" size={15} />
            <span>书架</span>
          </span>
          <div className="brand-mark">頁</div>
          <div>
            <strong>页间</strong>
            <span>PAPER MOMENTS</span>
          </div>
        </button>
        <div className="book-heading">
          {editingTitle ? (
            <input
              autoFocus
              value={bookTitle}
              onChange={(e) => setBookTitle(e.target.value)}
              onBlur={() => {
                setShelfBooks((items) =>
                  items.map((item) =>
                    item.id === activeBookId ? { ...item, title: bookTitle } : item,
                  ),
                );
                setEditingTitle(false);
              }}
              onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
            />
          ) : (
            <button className="book-title" onClick={() => setEditingTitle(true)}>
              {bookTitle}
              <ChevronDown size={15} />
            </button>
          )}
          <span className="save-state">
            <span className="save-dot" />
            {status}
          </span>
        </div>
        <div className="top-actions">
          <SoundControl
            enabled={soundEnabled}
            volume={soundVolume}
            onEnabledChange={setSoundEnabled}
            onVolumeChange={setSoundVolume}
          />
          <div className="book-music-wrap">
            <button
              className={`icon-button ${musicPlaying ? 'music-playing' : ''}`}
              title="设置此页背景音乐"
              aria-label="设置此页背景音乐"
              aria-expanded={musicPanelOpen}
              onClick={() => setMusicPanelOpen((open) => !open)}
            >
              <Music2 size={16} />
            </button>
            {musicPanelOpen && (
              <div className="book-music-panel">
                <div className="book-music-panel-head">
                  <div>
                    <span className="eyebrow">PAGE SOUNDTRACK</span>
                    <strong>{page.backgroundMusic?.name || '尚未添加背景音乐'}</strong>
                  </div>
                  <button
                    className="icon-button"
                    onClick={() => setMusicPanelOpen(false)}
                    aria-label="关闭音乐设置"
                  >
                    <X size={14} />
                  </button>
                </div>
                <div className="book-music-actions">
                  <button onClick={() => bookMusicFileRef.current?.click()}>
                    <Upload size={14} />
                    {page.backgroundMusic?.name ? '更换音乐' : '上传音乐'}
                  </button>
                  {page.backgroundMusic?.name && (
                    <>
                      <button className="music-play-button" onClick={() => void togglePageMusic()}>
                        {musicPlaying ? <Pause size={14} /> : <Play size={14} />}
                        {musicPlaying ? '暂停' : '播放'}
                      </button>
                      <button
                        className="music-remove-button"
                        onClick={() => void removePageMusic()}
                        aria-label="移除背景音乐"
                        title="移除背景音乐"
                      >
                        <Trash2 size={14} />
                      </button>
                    </>
                  )}
                </div>
                <small>音乐仅应用于此页，翻页自动切换；音量和开关由音效控制统一设置</small>
              </div>
            )}
            <input
              ref={bookMusicFileRef}
              className="visually-hidden"
              type="file"
              accept="audio/*,.mp3,.wav,.ogg,.m4a,.aac"
              onChange={uploadPageMusic}
            />
          </div>
          <button
            className="icon-button hide-tools-button"
            title={hideTools ? '显示工作工具' : '隐藏工作工具'}
            onClick={() => setHideTools(!hideTools)}
          >
            {hideTools ? <Eye size={16} /> : <EyeOff size={16} />}
          </button>
          <button
            className="icon-button history-button"
            title="撤销"
            onClick={undo}
            disabled={!history.length}
          >
            <Undo2 size={17} />
          </button>
          <button
            className="icon-button history-button"
            title="重做"
            onClick={redo}
            disabled={!future.length}
          >
            <Redo2 size={17} />
          </button>
          <span className="top-divider" />
          <button
            className={`mode-switch ${mode === 'read' ? 'active' : ''}`}
            onClick={() => {
              setMode(mode === 'edit' ? 'read' : 'edit');
              setPanel(null);
              setSelected(null);
              setBrush(false);
              setEraser(false);
            }}
          >
            <span className="mode-icon">
              {mode === 'edit' ? <Move size={15} /> : <Layers2 size={15} />}
            </span>
            {mode === 'edit' ? '编辑中' : '阅读中'}
          </button>
          <button
            className="primary-save"
            onClick={() => {
              void persistLibrary(true);
            }}
          >
            <Save size={15} />
            <span>保存</span>
          </button>
          <button className="mobile-more" onClick={() => setPanel(panel ? null : 'sticker')}>
            <MoreHorizontal />
          </button>
        </div>
      </header>
      <audio ref={bookMusicRef} loop preload="none" />

      <div className="workspace">
        {mode === 'edit' && !hideTools && (
          <aside className="page-rail">
            <div className="rail-title">
              <span>页面</span>
              <span>{String(pages.length).padStart(2, '0')}</span>
            </div>
            <div className="page-list">
              {pages.map((p, i) => (
                <div
                  key={p.id}
                  role="button"
                  tabIndex={0}
                  className={`page-thumb ${activeId === p.id ? 'active' : ''}`}
                  onClick={() => {
                    if (p.id !== activeId)
                      turnToPage(
                        p,
                        pages.indexOf(p) > pages.findIndex((item) => item.id === activeId)
                          ? 'next'
                          : 'previous',
                      );
                  }}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault();
                      if (p.id !== activeId)
                        turnToPage(
                          p,
                          pages.indexOf(p) > pages.findIndex((item) => item.id === activeId)
                            ? 'next'
                            : 'previous',
                        );
                    }
                  }}
                >
                  <span
                    className={`mini-paper ${pagePaperClass(p)}`}
                    style={{ '--page-paper-color': getPagePaperColorValue(p) } as CSSProperties}
                  >
                    <span className="mini-sun">
                      {p.weather === 'rain'
                        ? '〰'
                        : p.weather === 'snow'
                          ? '✳'
                          : p.weather === 'cloud'
                            ? '☁'
                            : '☼'}
                    </span>
                    <span className="mini-lines" />
                    <span className="mini-picture" />
                  </span>
                  <span className="page-number">{String(i + 1).padStart(2, '0')}</span>
                  <button
                    className="page-thumb-delete"
                    type="button"
                    aria-label={`删除第${i + 1}页`}
                    title="删除页面"
                    onClick={(event) => {
                      event.stopPropagation();
                      deletePage(p.id);
                    }}
                  >
                    <X size={12} />
                  </button>
                </div>
              ))}
              <button className="add-page" onClick={addPage}>
                <Plus size={17} />
                <span>新建页面</span>
              </button>
            </div>
            <div className="rail-bottom">
              <button
                title="更多页面选项"
                onClick={() => setToast('页面管理：拖动缩略图即可调整顺序')}
              >
                <MoreHorizontal size={19} />
              </button>
              <span>草稿已自动保存</span>
            </div>
          </aside>
        )}

        <section className="editor-stage">
          <div className="stage-topline">
            <div className="crumbs">
              <span>我的手账</span>
              <span className="crumb-slash">/</span>
              <strong>{bookTitle}</strong>
            </div>
            <div className="stage-tools">
              <div className="size-menu-wrap">
                <button className="size-button" onClick={() => setSizeMenu(!sizeMenu)}>
                  {size}
                  <ChevronDown size={14} />
                </button>
                {sizeMenu && (
                  <div className="size-menu">
                    {['竖版手账', '方形手账', '横版手账'].map((item) => (
                      <button
                        key={item}
                        onClick={() => {
                          setSize(item);
                          setSizeMenu(false);
                        }}
                      >
                        {item}
                        {size === item && <Check size={13} />}
                      </button>
                    ))}
                    <div className="custom-size-fields">
                      <span>自定义单页尺寸（毫米）</span>
                      <label>
                        宽
                        <input
                          type="number"
                          min="80"
                          max="420"
                          value={customPageWidth}
                          onChange={(event) =>
                            setCustomPageWidth(
                              Math.max(80, Math.min(420, Number(event.target.value) || 80)),
                            )
                          }
                        />
                      </label>
                      <label>
                        高
                        <input
                          type="number"
                          min="80"
                          max="420"
                          value={customPageHeight}
                          onChange={(event) =>
                            setCustomPageHeight(
                              Math.max(80, Math.min(420, Number(event.target.value) || 80)),
                            )
                          }
                        />
                      </label>
                      <button
                        className="custom-size-apply"
                        onClick={() => {
                          setSize('自定义手账');
                          setSizeMenu(false);
                        }}
                      >
                        应用尺寸
                      </button>
                    </div>
                  </div>
                )}
              </div>
              <button
                className="icon-button"
                title="重置画布"
                onClick={() => {
                  updatePage({ mediaScale: 1, mediaRotation: 0, mediaPos: { x: 73, y: 14 } });
                  setToast('画布视图已重置');
                }}
              >
                <RotateCcw size={16} />
              </button>
              <button className="icon-button" title="下载作品" onClick={() => window.print()}>
                <ArrowDownToLine size={17} />
              </button>
            </div>
          </div>

          <div className="canvas-area">
            {mode === 'edit' && !hideTools && (
              <div className="floating-toolbar">
                <button
                  className={selected === 'media' ? 'tool-active' : ''}
                  title="选择与移动"
                  onClick={() => {
                    setBrush(false);
                    setEraser(false);
                    setTapeMode(false);
                    setCropMode(false);
                    setSelected('media');
                  }}
                >
                  <Move size={17} />
                </button>
                <button
                  className={page.controlsLocked ? 'tool-active' : ''}
                  title={page.controlsLocked ? '解锁页面控件' : '锁定页面控件'}
                  aria-label={page.controlsLocked ? '解锁页面控件' : '锁定页面控件'}
                  aria-pressed={Boolean(page.controlsLocked)}
                  onClick={togglePageControlsLock}
                >
                  {page.controlsLocked ? <Unlock size={16} /> : <Lock size={16} />}
                </button>
                <span />
                <button title="添加文字" onClick={() => addTextBox()}>
                  <Type size={18} />
                </button>
                <button
                  title="添加图形"
                  className={shapesOpen ? 'tool-active' : ''}
                  onClick={() => setShapesOpen((open) => !open)}
                >
                  <Plus size={18} />
                </button>
                <button title="添加图片" onClick={() => inputRef.current?.click()}>
                  <ImagePlus size={18} />
                </button>
                <button
                  title="素材贴纸"
                  onClick={() => setPanel(panel === 'sticker' ? null : 'sticker')}
                >
                  <Sparkles size={17} />
                </button>
                <button
                  title="手绘"
                  className={brush ? 'tool-active' : ''}
                  onClick={() => {
                    setBrush(!brush);
                    setEraser(false);
                    setSelected(null);
                    setSelectedCanvasTextId(null);
                    setSelectedCanvasImageId(null);
                    setSelectedCanvasShapeId(null);
                    setShapesOpen(false);
                    setTapeMode(false);
                    setCropMode(false);
                    setPanel(null);
                    setToast(brush ? '手绘已关闭' : '在纸张上自由绘制');
                  }}
                >
                  <span className="brush-icon">✎</span>
                </button>
                <button
                  title="橡皮擦"
                  aria-label="橡皮擦"
                  aria-pressed={eraser}
                  className={eraser ? 'tool-active' : ''}
                  onClick={() => {
                    setEraser(!eraser);
                    setBrush(false);
                    setTapeMode(false);
                    setCropMode(false);
                    setSelected(null);
                    setSelectedCanvasTextId(null);
                    setSelectedCanvasImageId(null);
                    setSelectedCanvasShapeId(null);
                    setShapesOpen(false);
                    setPanel(null);
                  }}
                >
                  <Eraser size={17} />
                </button>
                <button
                  title="胶带笔刷"
                  aria-label="胶带笔刷"
                  className={tapeMode ? 'tool-active' : ''}
                  onClick={() => {
                    setTapeMode((active) => !active);
                    setBrush(false);
                    setEraser(false);
                    setCropMode(false);
                    setSelected(null);
                    setToast(tapeMode ? '胶带笔刷已关闭' : '按住并拖动，在纸上贴出连续胶带');
                  }}
                >
                  <Ribbon size={17} />
                </button>
              </div>
            )}
            {eraser && mode === 'edit' && !hideTools && (
              <div className="brush-settings" role="group" aria-label="橡皮擦设置">
                <span>橡皮擦</span>
                <label className="brush-width-setting">
                  <span>大小</span>
                  <input
                    type="range"
                    aria-label="橡皮大小"
                    min="8"
                    max="120"
                    step="1"
                    value={eraserWidth}
                    onChange={(event) => setEraserWidth(Number(event.target.value))}
                  />
                  <small>{eraserWidth}px</small>
                </label>
                <span>擦除手绘和胶带</span>
              </div>
            )}
            {brush && mode === 'edit' && !hideTools && (
              <div className="brush-settings" role="group" aria-label="手绘笔设置">
                <span>手绘笔</span>
                <label title="画笔颜色">
                  <Palette size={13} />
                  <input
                    type="color"
                    aria-label="画笔颜色"
                    value={brushColor}
                    onChange={(event) => setBrushColor(event.target.value)}
                  />
                </label>
                <label className="brush-width-setting">
                  <span>粗细</span>
                  <input
                    type="range"
                    aria-label="画笔粗细"
                    min="1"
                    max="24"
                    step="1"
                    value={brushWidth}
                    onChange={(event) => setBrushWidth(Number(event.target.value))}
                  />
                  <small>{brushWidth}px</small>
                </label>
              </div>
            )}
            {shapesOpen && mode === 'edit' && !hideTools && (
              <div className="shape-insert-menu" role="group" aria-label="插入图形">
                <span>添加图形</span>
                <button onClick={() => addCanvasShape('rectangle')}>矩形</button>
                <button onClick={() => addCanvasShape('circle')}>圆形</button>
                <button onClick={() => addCanvasShape('triangle')}>三角形</button>
              </div>
            )}
            {activeTextComponent &&
              !isLayerLocked(activeTextComponent) &&
              mode === 'edit' &&
              !hideTools && (
                <div
                  className="text-format-toolbar"
                  aria-label="文字样式工具"
                  onPointerDown={(event) => event.stopPropagation()}
                >
                  <select
                    aria-label="字体样式"
                    value={activeTextStyle.fontFamily}
                    onChange={(event) =>
                      applyInlineTextStyle('fontName', event.target.value, {
                        fontFamily: event.target.value,
                      })
                    }
                  >
                    <option value="'Noto Serif SC', Georgia, serif">宋体</option>
                    <option value="KaiTi, STKaiti, serif">楷体</option>
                    <option value="serif">衬线体</option>
                    <option value="Arial, sans-serif">无衬线体</option>
                    <option value="cursive">手写风</option>
                  </select>
                  <FontSizeInput
                    key={selectedCanvasTextId || activeTextComponent}
                    value={
                      activeTextStyle.fontSize ??
                      (activeTextComponent === 'title'
                        ? 30
                        : activeTextComponent === 'date' || activeTextComponent === 'footer'
                          ? 12
                          : 16)
                    }
                    onChange={(fontSize) =>
                      applyInlineTextStyle('fontSize', String(fontSize), { fontSize })
                    }
                  />
                  {selectedCanvasTextId && (
                    <div
                      className="text-orientation-control"
                      role="group"
                      aria-label="文字排版方向"
                    >
                      <button
                        type="button"
                        className={
                          (activeTextStyle.writingMode || 'horizontal-tb') === 'horizontal-tb'
                            ? 'active'
                            : ''
                        }
                        onClick={() => updateTextStyle({ writingMode: 'horizontal-tb' })}
                      >
                        横排
                      </button>
                      <button
                        type="button"
                        className={activeTextStyle.writingMode === 'vertical-rl' ? 'active' : ''}
                        onClick={() => updateTextStyle({ writingMode: 'vertical-rl' })}
                      >
                        竖排
                      </button>
                    </div>
                  )}
                  <label className="format-color-control" title="文字颜色">
                    <Palette size={14} />
                    <input
                      type="color"
                      aria-label="文字颜色"
                      value={activeTextStyle.color}
                      onChange={(event) =>
                        applyInlineTextStyle('foreColor', event.target.value, {
                          color: event.target.value,
                        })
                      }
                    />
                  </label>
                  <button
                    title="加粗"
                    aria-label="加粗"
                    className={activeTextStyle.bold ? 'active' : ''}
                    onPointerDown={(event) => {
                      event.preventDefault();
                      saveTextSelection();
                    }}
                    onClick={() => toggleInlineStyle('bold', 'bold')}
                  >
                    <Bold size={15} />
                  </button>
                  <button
                    title="斜体"
                    aria-label="斜体"
                    className={activeTextStyle.italic ? 'active' : ''}
                    onPointerDown={(event) => {
                      event.preventDefault();
                      saveTextSelection();
                    }}
                    onClick={() => toggleInlineStyle('italic', 'italic')}
                  >
                    <Italic size={15} />
                  </button>
                  <button
                    title="下划线"
                    aria-label="下划线"
                    className={activeTextStyle.underline ? 'active' : ''}
                    onPointerDown={(event) => {
                      event.preventDefault();
                      saveTextSelection();
                    }}
                    onClick={() => toggleInlineStyle('underline', 'underline')}
                  >
                    <Underline size={15} />
                  </button>
                  <label className="format-color-control" title="文字底色">
                    <Highlighter size={14} />
                    <input
                      type="color"
                      aria-label="文字底色"
                      value={
                        activeTextStyle.backgroundColor === 'transparent'
                          ? '#f5e6a8'
                          : activeTextStyle.backgroundColor
                      }
                      onChange={(event) =>
                        applyInlineTextStyle('hiliteColor', event.target.value, {
                          backgroundColor: event.target.value,
                        })
                      }
                    />
                  </label>
                  <button
                    title="无底色"
                    aria-label="移除文字底色"
                    onPointerDown={(event) => {
                      event.preventDefault();
                      saveTextSelection();
                    }}
                    onClick={() => {
                      if (selected === 'text')
                        applyInlineTextStyle('hiliteColor', 'transparent', {
                          backgroundColor: 'transparent',
                        });
                      else updateTextStyle({ backgroundColor: 'transparent' });
                    }}
                  >
                    <span className="format-clear">A</span>
                  </button>
                  <button
                    title="删除线"
                    aria-label="删除线"
                    className={activeTextStyle.strikethrough ? 'active' : ''}
                    onPointerDown={(event) => {
                      event.preventDefault();
                      saveTextSelection();
                    }}
                    onClick={() => toggleInlineStyle('strikeThrough', 'strikethrough')}
                  >
                    <span className="format-strike">S</span>
                  </button>
                  <span className="format-divider" />
                  <button
                    title="左对齐"
                    aria-label="左对齐"
                    className={activeTextStyle.textAlign === 'left' ? 'active' : ''}
                    onClick={() => updateTextStyle({ textAlign: 'left' })}
                  >
                    <AlignLeft size={15} />
                  </button>
                  <button
                    title="居中"
                    aria-label="居中"
                    className={activeTextStyle.textAlign === 'center' ? 'active' : ''}
                    onClick={() => updateTextStyle({ textAlign: 'center' })}
                  >
                    <AlignCenter size={15} />
                  </button>
                  <button
                    title="右对齐"
                    aria-label="右对齐"
                    className={activeTextStyle.textAlign === 'right' ? 'active' : ''}
                    onClick={() => updateTextStyle({ textAlign: 'right' })}
                  >
                    <AlignRight size={15} />
                  </button>
                </div>
              )}
            <div
              className={`page-shadow book-spread spread-${size.replace('手账', '')} ${mode === 'read' ? 'reader-page' : ''} ${pageTurn ? `turning-${pageTurn.direction}` : ''}`}
              style={
                {
                  width: `min(94%, calc((100dvh - 220px) * ${spreadRatio}))`,
                  height: 'auto',
                  maxHeight: 'none',
                  aspectRatio: `${spreadRatio}`,
                } as CSSProperties
              }
              onPointerDown={swipeStart}
              onPointerUp={swipeEnd}
              onPointerCancel={swipeEnd}
            >
              <article
                ref={canvasRef}
                className={`journal-page book-right-leaf ${pagePaperClass(page)} theme-${page.theme || 'classic'} size-${size.replace('手账', '')} ${page.controlsLocked ? 'controls-locked' : ''} ${mode === 'read' ? 'is-reading' : ''}`}
                style={
                  {
                    '--page-paper-color': getPagePaperColorValue(page),
                    '--left-page-paper-color': getPageLeftPaperColorValue(page),
                    '--right-page-paper-color': getPagePaperColorValue(page),
                    backgroundImage: `linear-gradient(90deg, ${getPageLeftPaperColorValue(page)} 0 50%, ${getPagePaperColorValue(page)} 50% 100%)`,
                    '--weather-dim':
                      page.screenBrightness ??
                      (page.weather === 'rain' || page.weather === 'snow' ? 0.28 : 0.08),
                    '--cloud-density': page.cloudDensity ?? 2,
                    ...componentLayerVariables(page),
                  } as CSSProperties
                }
                onPointerDown={(event) => {
                  const target = event.target as HTMLElement;
                  if (
                    mode === 'edit' &&
                    (target === event.currentTarget ||
                      target.classList.contains('page-weather-tone'))
                  ) {
                    setSelected(null);
                    setSelectedCanvasTextId(null);
                    setSelectedCanvasImageId(null);
                    setSelectedCanvasShapeId(null);
                  }
                }}
                onPointerMove={pointerMove}
                onPointerUp={pointerEnd}
                onPointerCancel={pointerEnd}
              >
                <div className="page-grain" />
                <div className={`page-weather-tone tone-${page.weather}`} />
                <PageWeatherFx
                  weather={page.weather}
                  intensity={page.intensity}
                  sunIntensity={page.sunIntensity}
                  cloudDensity={page.cloudDensity}
                />
                {!hidden('shape') &&
                  (page.canvasShapes || []).map((shape, index) => (
                    <div
                      key={shape.id}
                      inert={isLayerLocked('shape')}
                      data-layer-locked={isLayerLocked('shape')}
                      className={`canvas-shape ${selected === 'shape' && selectedCanvasShapeId === shape.id && mode === 'edit' && !hideTools && !page.controlsLocked ? 'selected' : ''}`}
                      style={
                        {
                          left: `${shape.x}%`,
                          top: `${shape.y}%`,
                          width: `${shape.width}%`,
                          height: `${shape.height}%`,
                          zIndex: componentLayerZIndex(page, 'shape') + index,
                          transform: `rotate(${shape.rotation ?? 0}deg)`,
                          '--shape-rotation': `${shape.rotation ?? 0}deg`,
                        } as CSSProperties
                      }
                      onPointerDown={(event) => pointerDown(event, 'canvasShape', shape.id)}
                    >
                      <svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
                        {shape.type === 'rectangle' ? (
                          <rect
                            x="2"
                            y="2"
                            width="96"
                            height="96"
                            rx={shape.radius}
                            fill={shape.fill}
                            stroke={shape.stroke}
                            strokeWidth={shape.strokeWidth * 2}
                            vectorEffect="non-scaling-stroke"
                          />
                        ) : shape.type === 'circle' ? (
                          <ellipse
                            cx="50"
                            cy="50"
                            rx="47"
                            ry="47"
                            fill={shape.fill}
                            stroke={shape.stroke}
                            strokeWidth={shape.strokeWidth * 2}
                            vectorEffect="non-scaling-stroke"
                          />
                        ) : (
                          <polygon
                            points="50,3 97,96 3,96"
                            fill={shape.fill}
                            stroke={shape.stroke}
                            strokeWidth={shape.strokeWidth * 2}
                            strokeLinejoin="round"
                            vectorEffect="non-scaling-stroke"
                          />
                        )}
                      </svg>
                      {selected === 'shape' &&
                        selectedCanvasShapeId === shape.id &&
                        mode === 'edit' &&
                        !hideTools &&
                        !page.controlsLocked && (
                          <>
                            {shapeHandles.map((handle) => (
                              <button
                                key={handle.name}
                                type="button"
                                className={`shape-resize-handle shape-handle-${handle.name}`}
                                aria-label={`缩放图形${handle.label}`}
                                title={`拖动${handle.label}缩放图形，按住 Shift 等比例缩放`}
                                onPointerDown={(event) => shapeResizeStart(event, shape, handle)}
                              />
                            ))}
                            <span className="shape-rotation-stem" aria-hidden="true" />
                            <button
                              type="button"
                              className="shape-rotate-handle"
                              aria-label="旋转图形"
                              title="拖动旋转图形，按住 Shift 按 15° 旋转"
                              onPointerDown={(event) => rotateStart(event, 'canvasShape', shape.id)}
                            >
                              <RotateCw size={13} />
                            </button>
                            <div
                              className="canvas-shape-controls"
                              onPointerDown={(event) => {
                                event.stopPropagation();
                                recordHistory();
                              }}
                            >
                              <div className="shape-control-row">
                                <span>填充</span>
                                <input
                                  type="color"
                                  aria-label="图形填充颜色"
                                  value={shape.fill}
                                  onChange={(event) =>
                                    updateSelectedShape({ fill: event.target.value })
                                  }
                                />
                              </div>
                              <div className="shape-control-row">
                                <span>描边</span>
                                <input
                                  type="color"
                                  aria-label="图形描边颜色"
                                  value={shape.stroke}
                                  onChange={(event) =>
                                    updateSelectedShape({ stroke: event.target.value })
                                  }
                                />
                                <input
                                  type="range"
                                  aria-label="描边粗细"
                                  min="0"
                                  max="12"
                                  step="0.5"
                                  value={shape.strokeWidth}
                                  onChange={(event) =>
                                    updateSelectedShape({ strokeWidth: Number(event.target.value) })
                                  }
                                />
                              </div>
                              {shape.type === 'rectangle' && (
                                <label className="shape-control-row">
                                  <span>圆角</span>
                                  <input
                                    type="range"
                                    aria-label="圆角大小"
                                    min="0"
                                    max="35"
                                    value={shape.radius}
                                    onChange={(event) =>
                                      updateSelectedShape({ radius: Number(event.target.value) })
                                    }
                                  />
                                </label>
                              )}
                              <p className="shape-transform-hint">
                                拖动边框缩放 · 顶部手柄旋转
                                <br />
                                按住 Shift 等比例缩放 / 吸附角度
                              </p>
                              <button
                                className="canvas-item-delete"
                                title="删除图形"
                                aria-label="删除图形"
                                onPointerDown={(event) => event.stopPropagation()}
                                onClick={() => {
                                  snapshot(
                                    pages.map((item) =>
                                      item.id === activeId
                                        ? {
                                            ...item,
                                            canvasShapes: (item.canvasShapes || []).filter(
                                              (entry) => entry.id !== shape.id,
                                            ),
                                          }
                                        : item,
                                    ),
                                  );
                                  setSelectedCanvasShapeId(null);
                                  setSelected(null);
                                }}
                              >
                                ×
                              </button>
                            </div>
                          </>
                        )}
                    </div>
                  ))}
                {!hidden('date') && (
                  <div
                    inert={isLayerLocked('date')}
                    data-layer-locked={isLayerLocked('date')}
                    className={`page-meta ${selected === 'date' ? 'selected' : ''}`}
                    style={componentStyle('date', { x: 54.5, y: 5.5 })}
                    onPointerDown={(e) => {
                      if ((e.target as HTMLElement).tagName === 'INPUT') {
                        setSelected('date');
                        return;
                      }
                      pointerDown(e, 'date');
                    }}
                  >
                    <input
                      aria-label="页面日期"
                      style={styledText('date')}
                      value={page.date}
                      readOnly={mode === 'read'}
                      onFocus={() => {
                        recordHistory();
                        setSelected('date');
                      }}
                      onChange={(e) => updatePage({ date: e.target.value })}
                    />
                    {dragHandle('date', '日期')}
                    <span className="page-category">
                      DAILY NOTES&nbsp;&nbsp;·&nbsp;&nbsp;
                      {String(pages.indexOf(page) + 1).padStart(2, '0')}
                    </span>
                  </div>
                )}
                {!hidden('title') && (
                  <div
                    inert={isLayerLocked('title')}
                    data-layer-locked={isLayerLocked('title')}
                    className={`page-heading ${selected === 'title' && mode === 'edit' && !hideTools ? 'selected' : ''}`}
                    style={{
                      ...componentStyle('title', { x: 54.5, y: 10.5 }),
                      ...controlScaleStyle(page.titleScale ?? 1),
                      transform: `scale(${page.titleScale ?? 1})`,
                      transformOrigin: 'left top',
                    }}
                    onPointerDown={(e) => {
                      if ((e.target as HTMLElement).tagName === 'INPUT') {
                        setSelected('title');
                        return;
                      }
                      pointerDown(e, 'title');
                    }}
                  >
                    <span className="tiny-flower">✳</span>
                    <input
                      aria-label="页面标题"
                      size={Math.max(
                        1,
                        [...page.title].reduce(
                          (length, character) => length + (character.charCodeAt(0) > 255 ? 2 : 1),
                          0,
                        ),
                      )}
                      style={styledText('title')}
                      value={page.title}
                      readOnly={mode === 'read'}
                      onFocus={() => {
                        recordHistory();
                        setSelected('title');
                      }}
                      onChange={(e) => updatePage({ title: e.target.value })}
                    />
                    {dragHandle('title', '标题')}
                    {selected === 'title' && mode === 'edit' && !hideTools && (
                      <button
                        className="sticker-resize-handle title-resize-handle"
                        aria-label="缩放标题文本框"
                        title="拖动调整标题大小"
                        onPointerDown={(e) => resizeStart(e, 'title')}
                      />
                    )}
                  </div>
                )}
                <div className="paper-rule" />
                {!hidden('weather') && (
                  <div
                    inert={isLayerLocked('weather')}
                    data-layer-locked={isLayerLocked('weather')}
                    className={`weather-badge weather-${page.weather} ${selected === 'weather' ? 'selected' : ''}`}
                    style={componentStyle('weather', { x: 54.5, y: 22 })}
                    onPointerDown={(e) => pointerDown(e, 'weather')}
                  >
                    <span className="weather-icon">
                      {page.weather === 'rain' ? (
                        <CloudRain size={17} />
                      ) : page.weather === 'snow' ? (
                        <CloudSnow size={17} />
                      ) : page.weather === 'cloud' ? (
                        <Cloud size={17} />
                      ) : (
                        <Sun size={17} />
                      )}
                    </span>
                    <span>
                      {page.weather === 'rain'
                        ? page.intensity === 1
                          ? '小雨'
                          : page.intensity === 2
                            ? '中雨'
                            : '大雨'
                        : page.weather === 'snow'
                          ? '飘雪'
                          : page.weather === 'cloud'
                            ? '阴天'
                            : '晴天'}
                    </span>
                    <span className="weather-place">京都 · 日本</span>
                    {dragHandle('weather', '天气标记')}
                  </div>
                )}
                {!hidden('media') && page.video && (
                  <div
                    inert={isLayerLocked('media')}
                    data-layer-locked={isLayerLocked('media')}
                    className={`video-sticker-wrap ${selected === 'media' && !selectedCanvasImageId && mode === 'edit' && !hideTools ? 'selected' : ''}`}
                    style={{
                      left: `${page.mediaPos.x}%`,
                      top: `${page.mediaPos.y}%`,
                      width: `${page.mediaWidth ?? 22.5}%`,
                      ...controlScaleStyle(page.mediaScale, page.mediaScaleY ?? page.mediaScale),
                      zIndex: mediaItemZIndex(page, 'primary'),
                      transform: `rotate(${page.mediaRotation ?? 0}deg) scale(${page.mediaScale}, ${page.mediaScaleY ?? page.mediaScale})`,
                    }}
                    onPointerDown={(e) => pointerDown(e, 'media')}
                  >
                    <video
                      src={page.video}
                      className="video-sticker"
                      aria-label="视频贴纸"
                      onLoadedMetadata={(event) => syncPrimaryMediaBounds(event.currentTarget)}
                      muted
                      loop
                      autoPlay
                      playsInline
                    />
                    {dragHandle('media', '视频贴纸')}
                    {selected === 'media' &&
                      !selectedCanvasImageId &&
                      mode === 'edit' &&
                      !hideTools && (
                        <button
                          className="sticker-resize-handle"
                          aria-label="缩放视频贴纸"
                          onPointerDown={(e) => resizeStart(e, 'media')}
                        />
                      )}
                  </div>
                )}
                {!hidden('media') && page.photo && (
                  <div
                    ref={(element) => {
                      if (element) imageElementsRef.current.set('primary', element);
                      else imageElementsRef.current.delete('primary');
                    }}
                    inert={isLayerLocked('media')}
                    data-layer-locked={isLayerLocked('media')}
                    className={`photo-sticker ${page.stickerStyle === 'sticker' ? `sticker-style-sticker sticker-variant-${page.stickerVariant || 'soft'}` : ''} ${page.stickerOutline || page.stickerStyle === 'outline' ? 'has-white-outline' : ''} ${page.stickerDimensional || page.stickerStyle === 'dimensional' ? 'has-dimensional-effect' : ''} ${selected === 'media' && !selectedCanvasImageId && mode === 'edit' && !hideTools ? 'selected' : ''} ${cropMode && !selectedCanvasImageId ? 'crop-active' : ''}`}
                    style={
                      {
                        left: `${page.mediaPos.x}%`,
                        top: `${page.mediaPos.y}%`,
                        width: `${page.mediaWidth ?? 22.5}%`,
                        height: `${page.mediaHeight ?? 30}%`,
                        '--canvas-image-width': `${page.mediaWidth ?? 22.5}%`,
                        '--canvas-image-height': `${page.mediaHeight ?? 30}%`,
                        ...controlScaleStyle(page.mediaScale, page.mediaScaleY ?? page.mediaScale),
                        zIndex: mediaItemZIndex(page, 'primary'),
                        transform: `rotate(${page.mediaRotation ?? 0}deg) scale(${page.mediaScale}, ${page.mediaScaleY ?? page.mediaScale})`,
                        '--sticker-outline-color': page.stickerOutlineColor || '#fffdf7',
                        '--sticker-outline-width': String(page.stickerOutlineWidth ?? 1) + 'px',
                      } as CSSProperties
                    }
                    onPointerDown={(e) => pointerDown(e, 'media')}
                  >
                    <img
                      src={resolveImageSrc(
                        page.useCutout
                          ? page.cutoutMode === 'background' && page.backgroundCutout
                            ? page.backgroundCutout
                            : page.photoCutout || page.photo
                          : page.photo,
                      )}
                      alt="手账图片贴纸"
                      draggable={false}
                      onLoad={(event) => syncPrimaryMediaBounds(event.currentTarget)}
                      onError={() => setToast('图片文件已失效，请重新导入该图片')}
                    />
                    <span className="photo-tape" />
                  </div>
                )}
                {!hidden('media') && !page.photo && !page.video && (
                  <div
                    inert={isLayerLocked('media')}
                    data-layer-locked={isLayerLocked('media')}
                    className={`memory-photo ${selected === 'media' && !selectedCanvasImageId && mode === 'edit' && !hideTools ? 'selected' : ''}`}
                    style={{
                      ...controlScaleStyle(page.mediaScale, page.mediaScaleY ?? page.mediaScale),
                      left: `${page.mediaPos.x}%`,
                      top: `${page.mediaPos.y}%`,
                      zIndex: mediaItemZIndex(page, 'primary'),
                      transform: `rotate(-3deg) scale(${page.mediaScale}, ${page.mediaScaleY ?? page.mediaScale})`,
                    }}
                    onPointerDown={(e) => pointerDown(e, 'media')}
                  >
                    <img
                      src={
                        page.weather === 'rain'
                          ? scenic.rain
                          : page.weather === 'snow'
                            ? scenic.snow
                            : page.weather === 'cloud'
                              ? scenic.cloud
                              : scenic.sun
                      }
                      alt="风景照片"
                      draggable={false}
                    />
                    <span className="photo-tape" />
                    <span className="photo-caption">
                      {page.weather === 'rain'
                        ? '雨の日、京都'
                        : page.weather === 'snow'
                          ? '冬の手紙'
                          : page.weather === 'cloud'
                            ? '曇りの日'
                            : '午後の光'}
                    </span>
                    {dragHandle('media', '风景贴纸')}
                    {selected === 'media' &&
                      !selectedCanvasImageId &&
                      mode === 'edit' &&
                      !hideTools && (
                        <button
                          className="sticker-resize-handle"
                          aria-label="缩放风景贴纸"
                          onPointerDown={(e) => resizeStart(e, 'media')}
                        />
                      )}
                  </div>
                )}
                {!hidden('text') && (
                  <div
                    inert={isLayerLocked('text')}
                    data-layer-locked={isLayerLocked('text')}
                    className={`journal-copy ${selected === 'text' && !selectedCanvasTextId && mode === 'edit' ? 'selected' : ''}`}
                    style={{ left: `${page.textPos.x}%`, top: `${page.textPos.y}%` }}
                    onPointerDown={(e) => pointerDown(e, 'text')}
                  >
                    {dragHandle('text', '正文')}
                    <div
                      ref={richTextRef}
                      className="rich-text-editor"
                      style={styledText('text')}
                      contentEditable={mode === 'edit'}
                      suppressContentEditableWarning
                      onFocus={() => {
                        recordHistory();
                        setSelected('text');
                        setSelectedCanvasTextId(null);
                        setSelectedCanvasImageId(null);
                        saveTextSelection();
                      }}
                      onInput={() => syncRichText()}
                      onMouseUp={saveTextSelection}
                      onKeyUp={saveTextSelection}
                      role="textbox"
                      aria-label="手账正文"
                      aria-multiline="true"
                    />{' '}
                    <span className="copy-date">— &nbsp;记于 {page.date.slice(-3)}</span>
                  </div>
                )}
                {(page.canvasTextBoxes || []).map((box) => (
                  <div
                    key={box.id}
                    inert={isLayerLocked('text')}
                    data-layer-locked={isLayerLocked('text')}
                    className={`canvas-text-box ${selectedCanvasTextId === box.id && mode === 'edit' && !hideTools ? 'selected' : ''} ${box.style?.writingMode === 'vertical-rl' ? 'vertical' : ''}`}
                    style={{
                      left: `${box.x}%`,
                      top: `${box.y}%`,
                      zIndex: componentLayerZIndex(page, 'text'),
                      ...(box.width ? { width: `${box.width}%` } : {}),
                      ...(box.height ? { height: `${box.height}%` } : {}),
                    }}
                    onPointerDown={(event) => pointerDown(event, 'canvasText', box.id)}
                  >
                    {mode === 'edit' && !hideTools && selectedCanvasTextId === box.id && (
                      <button
                        className="component-move-handle"
                        aria-label="拖动文字框"
                        title="拖动文字框"
                        onPointerDown={(event) => pointerDown(event, 'canvasText', box.id)}
                      >
                        <Move size={11} />
                      </button>
                    )}
                    <textarea
                      data-canvas-text={box.id}
                      aria-label="手账文字框"
                      value={box.text}
                      readOnly={mode === 'read'}
                      style={{
                        fontFamily: box.style?.fontFamily || defaultTextStyle.fontFamily,
                        fontSize: box.style?.fontSize || 16,
                        color: box.style?.color || defaultTextStyle.color,
                        backgroundColor: box.style?.backgroundColor || 'transparent',
                        fontWeight: box.style?.bold ? 700 : 400,
                        fontStyle: box.style?.italic ? 'italic' : 'normal',
                        textDecoration:
                          [
                            box.style?.underline && 'underline',
                            box.style?.strikethrough && 'line-through',
                          ]
                            .filter(Boolean)
                            .join(' ') || 'none',
                        textAlign: box.style?.textAlign || 'left',
                        writingMode: box.style?.writingMode || 'horizontal-tb',
                        textOrientation:
                          box.style?.writingMode === 'vertical-rl' ? 'upright' : 'mixed',
                      }}
                      onFocus={() => {
                        setSelected('text');
                        setSelectedCanvasTextId(box.id);
                        setSelectedCanvasImageId(null);
                      }}
                      onChange={(event) =>
                        updatePage({
                          canvasTextBoxes: (page.canvasTextBoxes || []).map((item) =>
                            item.id === box.id ? { ...item, text: event.target.value } : item,
                          ),
                        })
                      }
                    />
                    {mode === 'edit' && !hideTools && selectedCanvasTextId === box.id && (
                      <>
                        <button
                          className="canvas-item-delete"
                          title="删除文字框"
                          aria-label="删除文字框"
                          onPointerDown={(event) => event.stopPropagation()}
                          onClick={() => {
                            snapshot(
                              pages.map((item) =>
                                item.id === activeId
                                  ? {
                                      ...item,
                                      canvasTextBoxes: (item.canvasTextBoxes || []).filter(
                                        (entry) => entry.id !== box.id,
                                      ),
                                    }
                                  : item,
                              ),
                            );
                            if (selectedCanvasTextId === box.id) {
                              setSelectedCanvasTextId(null);
                              setSelected(null);
                            }
                          }}
                        >
                          ×
                        </button>
                        <button
                          className="canvas-text-resize-handle"
                          aria-label="调整文字框大小"
                          title="拖动调整文字框大小"
                          onPointerDown={(event) => textBoxResizeStart(event, box)}
                        />
                      </>
                    )}
                  </div>
                ))}
                {(page.canvasImages || []).map(
                  (image) =>
                    !image.hidden && (
                      <div
                        key={image.id}
                        ref={(element) => {
                          if (element) imageElementsRef.current.set(image.id, element);
                          else imageElementsRef.current.delete(image.id);
                        }}
                        inert={isLayerLocked(`canvas-image:${image.id}`)}
                        data-layer-locked={isLayerLocked(`canvas-image:${image.id}`)}
                        className={`canvas-image-item photo-sticker ${image.stickerStyle === 'sticker' ? `sticker-style-sticker sticker-variant-${image.stickerVariant || 'soft'}` : ''} ${image.stickerOutline || image.stickerStyle === 'outline' ? 'has-white-outline' : ''} ${image.stickerDimensional || image.stickerStyle === 'dimensional' ? 'has-dimensional-effect' : ''} ${selected === 'media' && selectedCanvasImageId === image.id && mode === 'edit' && !hideTools ? 'selected' : ''} ${cropMode && selectedCanvasImageId === image.id ? 'crop-active' : ''}`}
                        style={
                          {
                            left: `${image.x}%`,
                            top: `${image.y}%`,
                            width: `${image.width ?? 22.5}%`,
                            height: `${image.height ?? 30}%`,
                            '--canvas-image-width': `${image.width ?? 22.5}%`,
                            '--canvas-image-height': `${image.height ?? 30}%`,
                            ...controlScaleStyle(image.scale, image.scaleY ?? image.scale),
                            zIndex: mediaItemZIndex(page, image.id),
                            transform: `rotate(${image.rotation ?? 0}deg) scale(${image.scale}, ${image.scaleY ?? image.scale})`,
                            '--sticker-outline-color': image.stickerOutlineColor || '#fffdf7',
                            '--sticker-outline-width':
                              String(image.stickerOutlineWidth ?? 1) + 'px',
                          } as CSSProperties
                        }
                        onPointerDown={(event) => pointerDown(event, 'canvasImage', image.id)}
                      >
                        <img
                          src={resolveImageSrc(
                            image.useCutout
                              ? image.cutoutMode === 'background' && image.backgroundCutout
                                ? image.backgroundCutout
                                : image.cutoutSrc || image.src
                              : image.src,
                          )}
                          alt={image.name || '图片贴纸'}
                          draggable={false}
                          onLoad={(event) => syncCanvasImageBounds(image.id, event.currentTarget)}
                          onError={() => setToast(`${image.name || '图片'}文件已失效，请重新导入`)}
                        />
                      </div>
                    ),
                )}
                {!hidden('sticker') && (
                  <div
                    inert={isLayerLocked('sticker')}
                    data-layer-locked={isLayerLocked('sticker')}
                    className={`sticker-flower ${selected === 'sticker' && mode === 'edit' ? 'selected' : ''}`}
                    style={{
                      ...componentStyle('sticker', {
                        x: Math.min(92, page.mediaPos.x + 14),
                        y: page.mediaPos.y + 29,
                      }),
                      ...controlScaleStyle(
                        page.stickerScale ?? 1,
                        page.stickerScaleY ?? page.stickerScale ?? 1,
                      ),
                      zIndex: componentLayerZIndex(page, 'sticker'),
                      transform: `scale(${page.stickerScale ?? 1}, ${page.stickerScaleY ?? page.stickerScale ?? 1})`,
                      pointerEvents: mode === 'edit' ? 'auto' : 'none',
                    }}
                    onPointerDown={(e) => pointerDown(e, 'sticker')}
                    onDoubleClick={() => setPanel('sticker')}
                  >
                    {page.sticker || '✿'}
                    {dragHandle('sticker', '贴纸')}
                    {selected === 'sticker' && mode === 'edit' && (
                      <button
                        className="sticker-resize-handle"
                        aria-label="缩放贴纸"
                        title="拖动自由缩放，按住 Shift 等比缩放"
                        onPointerDown={(e) => resizeStart(e, 'sticker')}
                      />
                    )}
                  </div>
                )}
                {!hidden('footer') && (
                  <div
                    inert={isLayerLocked('footer')}
                    data-layer-locked={isLayerLocked('footer')}
                    className={`page-footer ${selected === 'footer' ? 'selected' : ''}`}
                    style={componentStyle('footer', { x: 54.5, y: 91 })}
                    onPointerDown={(e) => pointerDown(e, 'footer')}
                  >
                    <input
                      aria-label="页脚文字"
                      style={styledText('footer')}
                      value={page.footerText ?? '慢慢生活，慢慢记录。'}
                      readOnly={mode === 'read'}
                      onFocus={() => {
                        recordHistory();
                        setSelected('footer');
                      }}
                      onChange={(e) => updatePage({ footerText: e.target.value })}
                    />
                    {dragHandle('footer', '页脚')}
                    <span>✽</span>
                  </div>
                )}
                <svg
                  className={`tape-layer ${tapeMode ? 'painting' : ''}`}
                  viewBox="0 0 100 100"
                  preserveAspectRatio="none"
                  aria-label="纸胶带画布"
                  style={{ pointerEvents: tapeMode ? 'auto' : 'none' }}
                  onPointerDown={startTapeStroke}
                  onPointerMove={moveTapeStroke}
                  onPointerUp={finishTapeStroke}
                  onPointerCancel={finishTapeStroke}
                >
                  <defs>
                    {(page.tapes || []).map((tape) => (
                      <TapeEraseMask
                        key={tape.id}
                        id={`tape-erase-${tape.id}`}
                        strokes={[
                          ...(tape.erased || []),
                          ...(erasePreview?.pageId === page.id ? [erasePreview.stroke] : []),
                        ]}
                      />
                    ))}
                    <pattern
                      id="tape-pattern-floral"
                      width="5"
                      height="5"
                      patternUnits="userSpaceOnUse"
                    >
                      <circle cx="1.2" cy="1.2" r=".65" fill="#fff5e8" opacity=".9" />
                      <circle cx="2.1" cy="1.2" r=".65" fill="#fff5e8" opacity=".75" />
                      <circle cx="1.65" cy=".55" r=".65" fill="#fff5e8" opacity=".8" />
                      <circle cx="1.65" cy="1.85" r=".65" fill="#fff5e8" opacity=".8" />
                      <circle cx="1.65" cy="1.2" r=".24" fill="#d6aa74" />
                    </pattern>
                    <pattern
                      id="tape-pattern-dots"
                      width="4"
                      height="4"
                      patternUnits="userSpaceOnUse"
                    >
                      <circle cx="1" cy="1" r=".45" fill="#fffaf0" opacity=".9" />
                      <circle cx="3" cy="3" r=".35" fill="#fffaf0" opacity=".7" />
                    </pattern>
                    <pattern
                      id="tape-pattern-linen"
                      width="3"
                      height="3"
                      patternUnits="userSpaceOnUse"
                    >
                      <path
                        d="M0 0L3 3M3 0L0 3"
                        stroke="#fffaf0"
                        strokeOpacity=".48"
                        strokeWidth=".28"
                      />
                    </pattern>
                    {(page.tapes || [])
                      .filter(
                        (tape) =>
                          tape.texture === 'custom' &&
                          tape.textureId &&
                          page.tapeTextures?.[tape.textureId],
                      )
                      .map((tape) => (
                        <pattern
                          key={tape.textureId}
                          id={`custom-tape-${tape.textureId}`}
                          width="5"
                          height="5"
                          patternUnits="userSpaceOnUse"
                        >
                          <image
                            href={page.tapeTextures?.[tape.textureId!]}
                            x="0"
                            y="0"
                            width="5"
                            height="5"
                            preserveAspectRatio="xMidYMid slice"
                          />
                        </pattern>
                      ))}
                    {tapeDraft?.texture === 'custom' &&
                      tapeDraft.textureId &&
                      page.tapeTextures?.[tapeDraft.textureId] && (
                        <pattern
                          id={`custom-tape-${tapeDraft.textureId}`}
                          width="5"
                          height="5"
                          patternUnits="userSpaceOnUse"
                        >
                          <image
                            href={page.tapeTextures[tapeDraft.textureId]}
                            x="0"
                            y="0"
                            width="5"
                            height="5"
                            preserveAspectRatio="xMidYMid slice"
                          />
                        </pattern>
                      )}
                  </defs>
                  {[...(page.tapes || []), ...(tapeDraft ? [tapeDraft] : [])].map((tape) => {
                    const path = tapePath(tape.points);
                    const color =
                      tape.material === 'washi'
                        ? '#d58f89'
                        : tape.material === 'kraft'
                          ? '#bd9b68'
                          : '#fff8e8';
                    const detail =
                      tape.material === 'washi'
                        ? '#fff4e6'
                        : tape.material === 'kraft'
                          ? '#765f3f'
                          : '#d7cbb6';
                    const pattern =
                      tape.texture === 'custom' && tape.textureId
                        ? `url(#custom-tape-${tape.textureId})`
                        : `url(#tape-pattern-${tape.texture})`;
                    return (
                      <g
                        key={tape.id}
                        className={`tape-stroke tape-${tape.material}`}
                        mask={tape.id !== tapeDraft?.id ? `url(#tape-erase-${tape.id})` : undefined}
                      >
                        <path
                          d={path}
                          fill="none"
                          stroke="#554b3c"
                          strokeOpacity=".16"
                          strokeWidth={tape.width + 2}
                          vectorEffect="non-scaling-stroke"
                        />
                        <path
                          d={path}
                          fill="none"
                          stroke={color}
                          strokeOpacity={
                            tape.material === 'washi'
                              ? '.66'
                              : tape.material === 'kraft'
                                ? '.9'
                                : '.78'
                          }
                          strokeWidth={tape.width}
                          vectorEffect="non-scaling-stroke"
                        />
                        <path
                          d={path}
                          fill="none"
                          stroke={pattern}
                          strokeOpacity={tape.texture === 'custom' ? '.92' : '.8'}
                          strokeWidth={tape.width - 1}
                          vectorEffect="non-scaling-stroke"
                        />
                        <path
                          d={path}
                          fill="none"
                          stroke={detail}
                          strokeOpacity={tape.material === 'lace' ? '.9' : '.55'}
                          strokeWidth={tape.material === 'lace' ? 1.8 : 1.2}
                          strokeDasharray={tape.material === 'lace' ? '0.2 2.5' : '1 3'}
                          strokeLinecap="round"
                          vectorEffect="non-scaling-stroke"
                        />
                      </g>
                    );
                  })}
                </svg>
                {imageControlsVisible && imageControlData && (
                  <div
                    ref={imageControlsRef}
                    className="image-transform-controls"
                    data-image-id={imageControlId}
                    style={{
                      left: `${imageControlData.x}%`,
                      top: `${imageControlData.y}%`,
                      width: `${imageControlData.width ?? 22.5}%`,
                      height: `${imageControlData.height ?? 30}%`,
                      ...controlScaleStyle(
                        imageControlData.scale,
                        imageControlData.scaleY ?? imageControlData.scale,
                      ),
                      transform: `rotate(${imageControlData.rotation ?? 0}deg) scale(${imageControlData.scale}, ${imageControlData.scaleY ?? imageControlData.scale})`,
                    }}
                  >
                    <button
                      type="button"
                      className="component-move-handle"
                      aria-label="拖动选中的图片"
                      title="拖动选中的图片"
                      onPointerDown={(event) =>
                        pointerDown(
                          event,
                          imageControlId === 'primary' ? 'media' : 'canvasImage',
                          imageControlId === 'primary' ? undefined : imageControlId,
                        )
                      }
                    >
                      <Move size={11} />
                    </button>
                    <button
                      type="button"
                      className="sticker-resize-handle"
                      aria-label="缩放选中的图片"
                      title="拖动自由缩放，按住 Shift 等比缩放"
                      onPointerDown={(event) =>
                        resizeStart(
                          event,
                          imageControlId === 'primary' ? 'media' : 'canvasImage',
                          imageControlId === 'primary' ? undefined : imageControlId,
                        )
                      }
                    />
                    <button
                      type="button"
                      className="sticker-rotate-handle"
                      aria-label="旋转选中的图片"
                      title="拖动旋转选中的图片"
                      onPointerDown={(event) =>
                        rotateStart(
                          event,
                          imageControlId === 'primary' ? 'media' : 'canvasImage',
                          imageControlId === 'primary' ? undefined : imageControlId,
                        )
                      }
                    >
                      <RotateCw size={11} />
                    </button>
                  </div>
                )}
                <DrawingLayer
                  key={page.id}
                  active={(brush || eraser) && mode === 'edit' && !hideTools && !cropMode}
                  erasing={eraser}
                  color={brushColor}
                  width={eraser ? eraserWidth : brushWidth}
                  data={page.drawingData}
                  onStrokeStart={recordHistory}
                  onErasePreview={(stroke) =>
                    setErasePreview(stroke ? { pageId: page.id, stroke } : null)
                  }
                  onChange={(drawingData, erased) =>
                    setPages((all) =>
                      all.map((item) =>
                        item.id === page.id
                          ? {
                              ...item,
                              drawingData,
                              tapes: erased
                                ? (item.tapes || []).map((tape) => ({
                                    ...tape,
                                    erased: [...(tape.erased || []), erased],
                                  }))
                                : item.tapes,
                            }
                          : item,
                      ),
                    )
                  }
                />
              </article>
              {pageTurn && (
                <div
                  key={`${pageTurn.page.id}-${pageTurn.direction}`}
                  className={`page-turn-sheet ${pageTurn.direction} ${pagePaperClass(pageTurn.page)}`}
                  aria-hidden="true"
                >
                  <div className="turn-sheet-front">
                    <span className="turn-sheet-meta">{pageTurn.page.date}</span>
                    <span className="turn-sheet-title">{pageTurn.page.title}</span>
                    <span className="turn-sheet-rule" />
                    <div
                      className="turn-sheet-photo"
                      style={{
                        left: `${pageTurn.page.mediaPos.x}%`,
                        top: `${pageTurn.page.mediaPos.y}%`,
                      }}
                    >
                      <img
                        src={
                          pageTurn.page.photo ||
                          (pageTurn.page.weather === 'rain'
                            ? scenic.rain
                            : pageTurn.page.weather === 'snow'
                              ? scenic.snow
                              : pageTurn.page.weather === 'cloud'
                                ? scenic.cloud
                                : scenic.sun)
                        }
                        alt=""
                      />
                    </div>
                    <span className="turn-sheet-weather">
                      {pageTurn.page.weather === 'rain'
                        ? '☂ 雨天'
                        : pageTurn.page.weather === 'snow'
                          ? '❄ 飘雪'
                          : pageTurn.page.weather === 'cloud'
                            ? '☁ 阴天'
                            : '☼ 晴天'}
                    </span>
                    <span className="turn-sheet-copy">{pageTurn.page.text}</span>
                    <span className="turn-sheet-mark">{pageTurn.page.sticker || '✿'}</span>
                    <span className="turn-sheet-footer">慢慢生活，慢慢记录。</span>
                  </div>
                  <div className="turn-sheet-back" />
                </div>
              )}
            </div>
            <div className="canvas-caption">
              <span>
                <Move size={13} /> 拖动页面组件，自由排版
              </span>
              <span className="canvas-size-label">
                {size === '竖版手账'
                  ? '148 × 210 mm'
                  : size === '方形手账'
                    ? '180 × 180 mm'
                    : size === '横版手账'
                      ? '210 × 148 mm'
                      : `${customPageWidth} × ${customPageHeight} mm（单页）`}
              </span>
            </div>
            {mode === 'read' && (
              <div className="reader-controls">
                <button onClick={() => changePage(-1)} aria-label="上一页">
                  <ArrowLeft size={18} />
                </button>
                <span>
                  {String(pages.findIndex((p) => p.id === activeId) + 1).padStart(2, '0')} <i>/</i>{' '}
                  {String(pages.length).padStart(2, '0')}
                </span>
                <button onClick={() => changePage(1)} aria-label="下一页">
                  <ArrowRight size={18} />
                </button>
              </div>
            )}
          </div>
          {mode === 'edit' && !hideTools && (
            <footer className="bottom-toolbar">
              <div className="tool-group">
                <span className="tool-section-label">添加内容</span>
                <button onClick={() => inputRef.current?.click()}>
                  <ImagePlus size={16} />
                  照片
                </button>
                <button onClick={() => videoRef.current?.click()}>
                  <span className="tool-emoji">▷</span>视频贴纸
                </button>
                <button onClick={() => setPanel(panel === 'ai' ? null : 'ai')}>
                  <WandSparkles size={16} />
                  AI 贴纸
                </button>
              </div>
              <div className="tool-group tape-tools">
                <span className="tool-section-label">纸胶带</span>
                <button
                  className={tapeMode ? 'weather-active' : ''}
                  onClick={() => {
                    setTapeMode(!tapeMode);
                    setBrush(false);
                    setEraser(false);
                    setSelected(null);
                  }}
                >
                  <Ribbon size={15} />
                  {tapeMode ? '绘制中' : '胶带笔刷'}
                </button>
                <select
                  aria-label="胶带材质"
                  value={tapeMaterial}
                  onChange={(event) => setTapeMaterial(event.target.value as TapeMaterial)}
                >
                  <option value="washi">和纸</option>
                  <option value="kraft">牛皮纸</option>
                  <option value="lace">蕾丝纸</option>
                </select>
                <select
                  aria-label="胶带纹理"
                  value={tapeTexture}
                  onChange={(event) => {
                    setTapeTexture(event.target.value as TapeTexture);
                    if (event.target.value !== 'custom') setTapeTextureId(undefined);
                  }}
                >
                  <option value="floral">花纹</option>
                  <option value="dots">波点</option>
                  <option value="linen">织纹</option>
                  <option value="custom">自定义</option>
                </select>
                <button
                  className="tape-upload-button"
                  title="上传图片作为胶带纹理"
                  aria-label="上传胶带纹理"
                  onClick={() => tapeTextureFileRef.current?.click()}
                >
                  <ImagePlus size={14} />
                  图案
                </button>
                <label className="tape-width-control">
                  <span>宽度 {tapeWidth}</span>
                  <input
                    aria-label="胶带宽度"
                    type="range"
                    min="8"
                    max="42"
                    step="2"
                    value={tapeWidth}
                    onChange={(event) => setTapeWidth(Number(event.target.value))}
                  />
                </label>
              </div>
              <div className="tool-group weather-tools">
                <span className="tool-section-label">这一页的天气</span>
                <button
                  className={page.weather === 'sun' ? 'weather-active' : ''}
                  onClick={() => setWeather('sun')}
                >
                  <Sun size={16} />
                  晴天
                </button>
                <button
                  className={page.weather === 'rain' ? 'weather-active' : ''}
                  onClick={() => setWeather('rain')}
                >
                  <CloudRain size={16} />
                  雨天
                </button>
                <button
                  className={page.weather === 'snow' ? 'weather-active' : ''}
                  onClick={() => setWeather('snow')}
                >
                  <CloudSnow size={16} />
                  下雪
                </button>
                <button
                  className={page.weather === 'cloud' ? 'weather-active' : ''}
                  onClick={() => setWeather('cloud')}
                >
                  <Cloud size={16} />
                  阴天
                </button>
              </div>
              <div className="tool-group paper-tools">
                <span className="tool-section-label">页面样式</span>
                <button
                  className="page-paper-style-button"
                  onClick={(event) => togglePaperPanel(event.currentTarget)}
                >
                  <span className={`paper-chip paper-chip-${getPagePaperStyle(page)}`} />
                  {paperStyleNames[getPagePaperStyle(page)]}
                  <ChevronDown size={13} />
                </button>
                <div className="paper-color-picker" aria-label="纸张颜色">
                  {paperColors.map((color) => (
                    <button
                      key={color.id}
                      className={
                        (paperColorSide === 'left'
                          ? getPageLeftPaperColor(page)
                          : getPagePaperColor(page)) === color.id
                          ? 'selected'
                          : ''
                      }
                      title={color.label}
                      aria-label={color.label}
                      style={{ '--paper-swatch-color': color.value } as CSSProperties}
                      onClick={() =>
                        snapshot(
                          pages.map((p) =>
                            p.id === activeId
                              ? {
                                  ...p,
                                  [paperColorSide === 'left'
                                    ? 'leftPaperColor'
                                    : 'rightPaperColor']: color.id,
                                }
                              : p,
                          ),
                        )
                      }
                    />
                  ))}
                </div>
              </div>
            </footer>
          )}
        </section>

        {mode === 'edit' && !hideTools && (
          <aside className="inspector">
            <div className="inspector-head">
              <div>
                <span className="eyebrow">PAGE SETTINGS</span>
                <h2>页面设置</h2>
              </div>
              <button className="icon-button" onClick={() => setToast('页面设置已展开')}>
                <MoreHorizontal size={19} />
              </button>
            </div>
            <ImageEffectsPanel
              locked={effectLayerLocked || Boolean(page.controlsLocked)}
              key={`${page.id}-${effectImageId}`}
              images={effectImages}
              targetId={effectImageId}
              effects={imageEffectTarget}
              hasManualCutout={Boolean(
                effectCanvasImage ? effectCanvasImage.cutoutSrc : page.photoCutout,
              )}
              processing={cutoutProcessing}
              onSelect={(id) => {
                setImageEffectSelection({ pageId: page.id, imageId: id });
                setSelected('media');
                setSelectedCanvasImageId(id === 'primary' ? null : id);
                setSelectedCanvasTextId(null);
                setSelectedCanvasShapeId(null);
              }}
              onChange={updateImageEffect}
              onRemoveBackground={toggleBackgroundCutout}
              onUpload={() => inputRef.current?.click()}
            />
            <section className="inspector-section">
              <div className="section-label">
                <span>当天记录</span>
                <span className="section-note">随页面保存</span>
              </div>
              <label className="field-label">天气情况</label>
              <div className="weather-picker">
                <button
                  className={page.weather === 'sun' ? 'active' : ''}
                  onClick={() => setWeather('sun')}
                >
                  <Sun size={17} />
                  <span>晴天</span>
                </button>
                <button
                  className={page.weather === 'rain' ? 'active' : ''}
                  onClick={() => setWeather('rain')}
                >
                  <CloudRain size={17} />
                  <span>雨天</span>
                </button>
                <button
                  className={page.weather === 'snow' ? 'active' : ''}
                  onClick={() => setWeather('snow')}
                >
                  <CloudSnow size={17} />
                  <span>下雪</span>
                </button>
                <button
                  className={page.weather === 'cloud' ? 'active' : ''}
                  onClick={() => setWeather('cloud')}
                >
                  <Cloud size={17} />
                  <span>阴天</span>
                </button>
              </div>
              <p className="weather-help">
                <Cloud size={14} />
                每一页都有自己的天气记录
              </p>
              {(page.weather === 'rain' || page.weather === 'snow') && (
                <div className="intensity">
                  <div>
                    <span>{page.weather === 'rain' ? '降雨量' : '降雪量'}</span>
                    <span>{page.intensity === 1 ? '小' : page.intensity === 2 ? '中' : '大'}</span>
                  </div>
                  <input
                    type="range"
                    min="1"
                    max="3"
                    step="1"
                    value={page.intensity}
                    onChange={(e) => updatePage({ intensity: Number(e.target.value) })}
                  />
                </div>
              )}
              {page.weather === 'sun' && (
                <div className="intensity">
                  <div>
                    <span>阳光强度</span>
                    <span>{page.sunIntensity ?? 2}/3</span>
                  </div>
                  <input
                    type="range"
                    min="1"
                    max="3"
                    step="1"
                    value={page.sunIntensity ?? 2}
                    onChange={(e) => updatePage({ sunIntensity: Number(e.target.value) })}
                  />
                </div>
              )}
              {page.weather === 'cloud' && (
                <div className="intensity">
                  <div>
                    <span>云层密度</span>
                    <span>{page.cloudDensity ?? 2}/3</span>
                  </div>
                  <input
                    type="range"
                    min="1"
                    max="3"
                    step="1"
                    value={page.cloudDensity ?? 2}
                    onChange={(e) => updatePage({ cloudDensity: Number(e.target.value) })}
                  />
                </div>
              )}
              <div className="intensity">
                <div>
                  <span>页面亮度</span>
                  <span>
                    {Math.round(
                      (1 -
                        (page.screenBrightness ??
                          (page.weather === 'rain' || page.weather === 'snow' ? 0.28 : 0.08))) *
                        100,
                    )}
                    %
                  </span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="0.55"
                  step="0.01"
                  value={
                    page.screenBrightness ??
                    (page.weather === 'rain' || page.weather === 'snow' ? 0.28 : 0.08)
                  }
                  onChange={(e) => updatePage({ screenBrightness: Number(e.target.value) })}
                />
              </div>
            </section>
            <section className="inspector-section object-section">
              <div className="section-label">
                <span>当前页面</span>
                <button
                  className="text-link"
                  onClick={() => setToast('页面标题可直接在纸张上编辑')}
                >
                  编辑
                </button>
              </div>
              <div className="property-line">
                <span className="property-icon">
                  <Type size={14} />
                </span>
                <span>标题</span>
                <input
                  disabled={isLayerLocked('title')}
                  value={page.title}
                  onChange={(e) => updatePage({ title: e.target.value })}
                />
              </div>
              <div className="property-line">
                <span className="property-icon">
                  <Crop size={14} />
                </span>
                <span>照片裁剪</span>
                <button
                  disabled={isLayerLocked(
                    selectedCanvasImageId ? `canvas-image:${selectedCanvasImageId}` : 'media',
                  )}
                  className="property-value"
                  onClick={() => {
                    if (!selectedCanvasImage && !page.photo) {
                      setToast('请先导入一张图片素材');
                      inputRef.current?.click();
                      return;
                    }
                    setCropMode(true);
                    setPanel(null);
                    setSelected('media');
                  }}
                >
                  {cropMode
                    ? '正在裁切'
                    : selectedCanvasImage
                      ? `裁剪 ${selectedCanvasImage.name || '当前图片'}`
                      : '开始裁切'}
                  <ChevronDown size={13} />
                </button>
              </div>
            </section>
            <section className="inspector-section component-manager">
              <div className="section-label">
                <span>页面组件</span>
                <span className="section-note">拖动排序 · 上层置顶</span>
              </div>
              {componentOrderFor(page).map((key) => (
                <div
                  style={{ order: layerOrderFor(page).indexOf(key) }}
                  className={
                    'component-row ' +
                    (draggedLayer === key ? 'is-dragging ' : '') +
                    (dropTargetLayer === key ? 'drop-target' : '')
                  }
                  key={key}
                  onDragStart={(event) => {
                    if (
                      isLayerLocked(key) ||
                      !(event.target as HTMLElement).closest('.layer-grip')
                    ) {
                      event.preventDefault();
                      return;
                    }
                    event.dataTransfer.effectAllowed = 'move';
                    event.dataTransfer.setData('text/plain', key);
                    if (key === 'media') event.dataTransfer.setData('text/media-item', 'primary');
                    setDraggedLayer(key);
                  }}
                  onDragOver={(event) => {
                    event.preventDefault();
                    event.dataTransfer.dropEffect = 'move';
                    setDropTargetLayer(key);
                  }}
                  onDrop={(event) => {
                    event.preventDefault();
                    const source = event.dataTransfer.getData('text/plain');
                    reorderLayerItems(source, key);
                    setDraggedCanvasImageId(null);
                    setDraggedLayer(null);
                    setDropTargetLayer(null);
                  }}
                  onDragEnd={() => {
                    setDraggedLayer(null);
                    setDropTargetLayer(null);
                  }}
                >
                  <span
                    draggable={!isLayerLocked(key)}
                    className="layer-grip"
                    title={isLayerLocked(key) ? '请先解锁素材' : '拖动调整图层顺序'}
                  >
                    <GripVertical size={13} />
                  </span>
                  <button
                    className={
                      selected === key && !(key === 'media' && selectedCanvasImageId)
                        ? 'active'
                        : ''
                    }
                    onClick={() => {
                      setSelected(key);
                      if (key === 'media') {
                        setSelectedCanvasImageId(null);
                        setSelectedCanvasTextId(null);
                      }
                    }}
                  >
                    {key === 'media'
                      ? page.photo
                        ? '图片 1'
                        : page.video
                          ? '视频'
                          : '风景图片'
                      : componentLabels[key]}
                    {hidden(key) && <small>已隐藏</small>}
                  </button>
                  {layerLockButton(key, componentLabels[key])}
                  {hidden(key) ? (
                    <button
                      disabled={isLayerLocked(key)}
                      className="component-action"
                      onClick={() => restoreComponent(key)}
                    >
                      恢复
                    </button>
                  ) : (
                    <button
                      disabled={isLayerLocked(key)}
                      className="component-action"
                      onClick={() => removeComponent(key)}
                      aria-label={`删除${componentLabels[key]}`}
                    >
                      <X size={13} />
                    </button>
                  )}
                </div>
              ))}
              {(page.canvasImages || []).map((image, index) => (
                <div
                  key={image.id}
                  style={{ order: layerOrderFor(page).indexOf('canvas-image:' + image.id) }}
                  className={
                    'component-row ' +
                    (draggedCanvasImageId === image.id ? 'is-dragging ' : '') +
                    (dropTargetLayer === 'canvas-image:' + image.id ? 'drop-target' : '')
                  }
                  onDragStart={(event) => {
                    if (
                      isLayerLocked(`canvas-image:${image.id}`) ||
                      !(event.target as HTMLElement).closest('.layer-grip')
                    ) {
                      event.preventDefault();
                      return;
                    }
                    event.dataTransfer.effectAllowed = 'move';
                    event.dataTransfer.setData('text/canvas-image', image.id);
                    event.dataTransfer.setData('text/media-item', image.id);
                    event.dataTransfer.setData('text/plain', `canvas-image:${image.id}`);
                    setDraggedCanvasImageId(image.id);
                  }}
                  onDragOver={(event) => {
                    event.preventDefault();
                    event.dataTransfer.dropEffect = 'move';
                    setDropTargetLayer('canvas-image:' + image.id);
                  }}
                  onDrop={(event) => {
                    event.preventDefault();
                    const source = event.dataTransfer.getData('text/plain');
                    reorderLayerItems(source, 'canvas-image:' + image.id);
                    setDraggedCanvasImageId(null);
                    setDraggedLayer(null);
                    setDropTargetLayer(null);
                  }}
                  onDragEnd={() => {
                    setDraggedCanvasImageId(null);
                    setDropTargetLayer(null);
                  }}
                >
                  <span
                    draggable={!isLayerLocked(`canvas-image:${image.id}`)}
                    className="layer-grip"
                    title={
                      isLayerLocked(`canvas-image:${image.id}`)
                        ? '请先解锁素材'
                        : '拖动图片图层排序'
                    }
                  >
                    <GripVertical size={13} />
                  </span>
                  <button
                    className={selectedCanvasImageId === image.id ? 'active' : ''}
                    onClick={() => {
                      setSelected('media');
                      setSelectedCanvasImageId(image.id);
                      setSelectedCanvasTextId(null);
                    }}
                  >
                    {image.name || `图片 ${index + (page.photo ? 2 : 1)}`}
                    {image.hidden && <small>已隐藏</small>}
                  </button>
                  {layerLockButton(`canvas-image:${image.id}`, image.name || '图片')}
                  <button
                    disabled={isLayerLocked(`canvas-image:${image.id}`)}
                    className="component-action"
                    onClick={() => {
                      const nextHidden = !image.hidden;
                      snapshot(
                        pages.map((item) =>
                          item.id === activeId
                            ? {
                                ...item,
                                canvasImages: (item.canvasImages || []).map((entry) =>
                                  entry.id === image.id ? { ...entry, hidden: nextHidden } : entry,
                                ),
                              }
                            : item,
                        ),
                      );
                      if (nextHidden && selectedCanvasImageId === image.id) {
                        setSelectedCanvasImageId(null);
                        setSelected(null);
                      }
                    }}
                    aria-label={image.hidden ? '显示图片' : '隐藏图片'}
                  >
                    {image.hidden ? '恢复' : <EyeOff size={13} />}
                  </button>
                  <button
                    disabled={isLayerLocked(`canvas-image:${image.id}`)}
                    className="component-action"
                    onClick={() => {
                      snapshot(
                        pages.map((item) =>
                          item.id === activeId
                            ? {
                                ...item,
                                canvasImages: (item.canvasImages || []).filter(
                                  (entry) => entry.id !== image.id,
                                ),
                              }
                            : item,
                        ),
                      );
                      if (selectedCanvasImageId === image.id) {
                        setSelectedCanvasImageId(null);
                        setSelected(null);
                      }
                    }}
                    aria-label={`删除${image.name || `图片 ${index + (page.photo ? 2 : 1)}`}`}
                  >
                    <X size={13} />
                  </button>
                </div>
              ))}
            </section>
            <div className="inspector-bottom">
              <button
                onClick={() => {
                  const copyPage = {
                    ...page,
                    id: crypto.randomUUID(),
                    title: `${page.title}（副本）`,
                  };
                  snapshot([...pages, copyPage]);
                  setActiveId(copyPage.id);
                }}
              >
                <Copy size={15} />
                复制这一页
              </button>
              <button onClick={() => deletePage(activeId)}>
                <Minus size={15} />
                删除页面
              </button>
            </div>
          </aside>
        )}
      </div>

      {panel && (
        <>
          <button className="panel-scrim" onClick={() => setPanel(null)} aria-label="关闭面板" />
          <aside
            className={`utility-panel ${panel === 'paper' ? 'paper-panel' : ''} ${panel === 'ai' || panel === 'upload' ? 'panel-wide' : ''}`}
            style={
              panel === 'paper' && paperPanelPosition
                ? { left: paperPanelPosition.left, bottom: paperPanelPosition.bottom }
                : undefined
            }
          >
            <div className="panel-header">
              <div>
                <span className="eyebrow">
                  {panel === 'paper'
                    ? 'PAPER LIBRARY'
                    : panel === 'sticker'
                      ? 'STICKER TRAY'
                      : panel === 'ai'
                        ? 'AI STICKER STUDIO'
                        : 'IMPORT MEDIA'}
                </span>
                <h3>
                  {panel === 'paper'
                    ? '页面样式'
                    : panel === 'sticker'
                      ? '贴纸素材'
                      : panel === 'ai'
                        ? '生成一枚贴纸'
                        : '添加素材'}
                </h3>
              </div>
              <button className="icon-button" onClick={() => setPanel(null)} aria-label="关闭">
                <X size={17} />
              </button>
            </div>
            {panel === 'paper' ? (
              <div className="paper-options">
                <section className="paper-option-group">
                  <h4>纸张样式</h4>
                  <div className="paper-style-grid">
                    {Object.entries(paperStyleNames).map(([id, name]) => (
                      <button
                        key={id}
                        className={getPagePaperStyle(page) === id ? 'selected' : ''}
                        onClick={() =>
                          snapshot(
                            pages.map((item) =>
                              item.id === activeId ? { ...item, paperStyle: id } : item,
                            ),
                          )
                        }
                      >
                        <span className={`paper-preview paper-preview-${id}`}>
                          <i />
                          <i />
                          <i />
                        </span>
                        <span>{name}</span>
                        {getPagePaperStyle(page) === id && <Check size={14} />}
                      </button>
                    ))}
                  </div>
                </section>
                <section className="paper-option-group">
                  <h4>纸张颜色</h4>
                  <div className="paper-side-tabs" role="tablist" aria-label="选择纸张页">
                    <button
                      type="button"
                      role="tab"
                      aria-selected={paperColorSide === 'left'}
                      className={paperColorSide === 'left' ? 'active' : ''}
                      onClick={() => setPaperColorSide('left')}
                    >
                      左页
                    </button>
                    <button
                      type="button"
                      role="tab"
                      aria-selected={paperColorSide === 'right'}
                      className={paperColorSide === 'right' ? 'active' : ''}
                      onClick={() => setPaperColorSide('right')}
                    >
                      右页
                    </button>
                  </div>
                  <div className="paper-color-options">
                    {paperColors.map((color) => (
                      <button
                        key={color.id}
                        className={
                          (paperColorSide === 'left'
                            ? getPageLeftPaperColor(page)
                            : getPagePaperColor(page)) === color.id
                            ? 'selected'
                            : ''
                        }
                        onClick={() => setSpreadPaperColor(color.id)}
                      >
                        <i style={{ '--paper-swatch-color': color.value } as CSSProperties} />
                        <span>{color.label}</span>
                        {(paperColorSide === 'left'
                          ? getPageLeftPaperColor(page)
                          : getPagePaperColor(page)) === color.id && <Check size={14} />}
                      </button>
                    ))}
                  </div>
                  <label className="paper-custom-color">
                    <span
                      className="paper-custom-preview"
                      style={{
                        backgroundColor:
                          paperColorSide === 'left'
                            ? getPageLeftPaperColorValue(page)
                            : getPagePaperColorValue(page),
                      }}
                    />
                    <span>
                      <strong>自定义颜色</strong>
                      <small>
                        {(paperColorSide === 'left'
                          ? getPageLeftPaperColorValue(page)
                          : getPagePaperColorValue(page)
                        ).toUpperCase()}
                      </small>
                    </span>
                    <input
                      type="color"
                      aria-label="选择任意纸张颜色"
                      value={
                        paperColorSide === 'left'
                          ? getPageLeftPaperColorValue(page)
                          : getPagePaperColorValue(page)
                      }
                      onChange={(event) => setSpreadPaperColor(event.target.value)}
                    />
                  </label>
                </section>
              </div>
            ) : panel === 'sticker' ? (
              <div className="sticker-grid">
                {['✿', '✳', '☁', '♡', '☂', '☾', '✦', '♧', '☕', '❀', '〰', '♫'].map((symbol) => (
                  <button
                    key={symbol}
                    onClick={() => {
                      snapshot(
                        pages.map((item) =>
                          item.id === activeId
                            ? {
                                ...item,
                                sticker: symbol,
                                hiddenComponents: (item.hiddenComponents || []).filter(
                                  (entry) => entry !== 'sticker',
                                ),
                                removedComponents: (item.removedComponents || []).filter(
                                  (entry) => entry !== 'sticker',
                                ),
                              }
                            : item,
                        ),
                      );
                      setPanel(null);
                      setSelected('sticker');
                      setToast('贴纸已添加到页面');
                    }}
                  >
                    {symbol}
                  </button>
                ))}
              </div>
            ) : panel === 'ai' ? (
              <div className="ai-panel-content">
                <div className="ai-note">
                  <Sparkles size={17} />
                  <span>描述一个小物件，生成适合贴进手账的风格化贴纸。</span>
                </div>
                <label className="field-label">贴纸描述</label>
                <textarea
                  value={aiPrompt}
                  onChange={(event) => setAiPrompt(event.target.value)}
                  rows={4}
                />
                <button className="generate-button" onClick={generateSticker} disabled={generating}>
                  {generating ? (
                    '正在生成预览…'
                  ) : (
                    <>
                      <WandSparkles size={16} />
                      生成贴纸预览
                    </>
                  )}
                </button>
              </div>
            ) : (
              <div className="upload-options">
                <button onClick={() => inputRef.current?.click()}>
                  <ImagePlus size={20} />
                  选择一张图片<small>JPG、PNG、WebP</small>
                </button>
                <button onClick={() => videoRef.current?.click()}>
                  <Upload size={20} />
                  制作视频贴纸<small>选择片段并加入当前页面</small>
                </button>
              </div>
            )}
          </aside>
        </>
      )}
      <input
        ref={inputRef}
        className="visually-hidden"
        type="file"
        accept="image/*"
        onChange={(e) => onFile(e, 'image')}
      />
      <input
        ref={videoRef}
        className="visually-hidden"
        type="file"
        accept="video/*"
        onChange={(e) => onFile(e, 'video')}
      />
      <input
        ref={tapeTextureFileRef}
        className="visually-hidden"
        type="file"
        accept="image/*"
        onChange={uploadTapeTexture}
      />
      {cropMode && selectedPhotoForCrop && (
        <CropStudio
          photo={selectedPhotoForCrop}
          onCancel={() => setCropMode(false)}
          onApply={applyCroppedImage}
        />
      )}
      {toast && (
        <div className="toast">
          <Check size={15} />
          {toast}
        </div>
      )}
      <footer className="app-footnote">
        <span>为每一个日子，留一张纸。</span>
        <span>
          页间 · 电子手账 <i>✳</i>
        </span>
      </footer>
    </main>
  );
}
