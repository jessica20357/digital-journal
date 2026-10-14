import type { Page, PageComponent } from '../domain/journal';

export const shapeHandles = [
  { name: 'nw', label: '左上角', x: -1, y: -1 },
  { name: 'n', label: '上边', x: 0, y: -1 },
  { name: 'ne', label: '右上角', x: 1, y: -1 },
  { name: 'e', label: '右边', x: 1, y: 0 },
  { name: 'se', label: '右下角', x: 1, y: 1 },
  { name: 's', label: '下边', x: 0, y: 1 },
  { name: 'sw', label: '左下角', x: -1, y: 1 },
  { name: 'w', label: '左边', x: -1, y: 0 },
] as const;
export const defaultComponentOrder: PageComponent[] = [
  'sticker',
  'shape',
  'text',
  'media',
  'footer',
  'weather',
  'title',
  'date',
];
export const componentLabels: Record<PageComponent, string> = {
  date: '日期',
  title: '标题',
  weather: '天气标记',
  media: '图片 / 视频',
  text: '正文',
  sticker: '贴纸',
  shape: '图形',
  footer: '页脚',
};
export const initialPages: Page[] = [
  {
    id: 'p1',
    title: '雨落在京都',
    date: '2026年 09月 14日',
    weather: 'rain',
    intensity: 2,
    paper: 'paper-ivory',
    photo: '',
    sticker: '☔',
    text: '在细雨里慢慢走，\n好像整座城市都安静了。',
    textPos: { x: 12, y: 56 },
    mediaPos: { x: 46, y: 14 },
    mediaScale: 1,
    crop: 0,
  },
  {
    id: 'p2',
    title: '雪天来信',
    date: '2026年 09月 15日',
    weather: 'snow',
    intensity: 1,
    paper: 'paper-blue',
    photo: '',
    sticker: '❄',
    text: '雪落下来的时候，\n时间也变得很轻。',
    textPos: { x: 49, y: 55 },
    mediaPos: { x: 9, y: 16 },
    mediaScale: 1,
    crop: 0,
  },
  {
    id: 'p3',
    title: '晴日散步',
    date: '2026年 09月 16日',
    weather: 'sun',
    intensity: 1,
    paper: 'paper-pink',
    photo: '',
    sticker: '✿',
    text: '阳光经过窗边，\n留下一个暖暖的午后。',
    textPos: { x: 13, y: 57 },
    mediaPos: { x: 48, y: 17 },
    mediaScale: 1,
    crop: 0,
  },
];
export const paperStyleNames: Record<string, string> = {
  lined: '横线纸',
  grid: '方格纸',
  wavyGrid: '扭曲方格',
  dotted: '点阵纸',
  blank: '空白纸',
  cornell: '康奈尔纸',
};
export const paperColors = [
  { id: 'ivory', label: '奶油白', value: '#fbf8f1' },
  { id: 'white', label: '纯白', value: '#fffefb' },
  { id: 'blue', label: '雾蓝', value: '#edf1ed' },
  { id: 'pink', label: '樱花粉', value: '#f7eee8' },
  { id: 'sage', label: '鼠尾草', value: '#eef0e8' },
  { id: 'kraft', label: '牛皮纸', value: '#e7d8bd' },
];
export const getPagePaperStyle = (page: Page) =>
  page.paperStyle ||
  (page.paper === 'paper-grid' ? 'grid' : page.paper === 'paper-blank' ? 'blank' : 'lined');
export const getDefaultPagePaperColor = (page: Page) =>
  page.paperColor ||
  (page.paper === 'paper-blue'
    ? 'blue'
    : page.paper === 'paper-pink'
      ? 'pink'
      : page.paper === 'paper-blank'
        ? 'white'
        : 'ivory');
export const getPagePaperColor = (page: Page) =>
  page.rightPaperColor || getDefaultPagePaperColor(page);
export const getPageLeftPaperColor = (page: Page) =>
  page.leftPaperColor || getDefaultPagePaperColor(page);
export const paperColorValue = (color: string) =>
  paperColors.find((item) => item.id === color)?.value ||
  (/^#[\da-f]{6}$/i.test(color) ? color : '#fbf8f1');
export const getPagePaperColorValue = (page: Page) => {
  const color = getPagePaperColor(page);
  return paperColorValue(color);
};
export const getPageLeftPaperColorValue = (page: Page) =>
  paperColorValue(getPageLeftPaperColor(page));
export const pagePaperClass = (page: Page) =>
  `${page.paper} paper-style-${getPagePaperStyle(page)} paper-tone-${paperColors.some((item) => item.id === getPagePaperColor(page)) ? getPagePaperColor(page) : 'custom'}`;
