# 页间 · 数字手账

## 案例视频

**banana fish**

https://github.com/user-attachments/assets/8bc47dca-747f-4f95-b0be-644eb57b9549

- [查看或下载案例视频](public/demo/journal-demo.mp4)
- 在本地启动项目后，打开[本地视频播放页](http://127.0.0.1:5173/demo/)。

## 功能

| 功能       | 说明                                                               |
| ---------- | ------------------------------------------------------------------ |
| 数字书架   | 创建、打开和删除手账，自定义封面与彩带；多本手账以长廊形式陈列     |
| 自由画布   | 双页书脊、左右页独立底色、纸张模板和自定义页面尺寸                 |
| 文字排版   | 添加多个文本框，调整字体、字号、颜色、粗体、斜体和横竖排           |
| 图片与贴纸 | 导入多张独立图片，裁剪、去背景、添加描边和选择贴纸样式             |
| 组件操作   | 移动、旋转、缩放、锁定、复制粘贴，以及调整图层覆盖顺序             |
| 手绘与胶带 | 连续绘制、调节画笔颜色与粗细；使用可调大小的橡皮局部擦除手绘和胶带 |
| 页面天气   | 晴天、雨天、雪天与白云效果，可调节强度或云层密度                   |
| 页面音乐   | 每页设置不同背景音乐，通过统一音效控件控制音乐、翻书声和风铃       |
| 本地保存   | 自动保存、手动保存、撤销和重做                                     |
| 阅读模式   | 隐藏编辑工具，浏览手账内容                                         |

图片和素材默认自由缩放，按住 **Shift** 拖动缩放手柄可保持比例。

## 快速开始

需要 **Node.js 22.12 或更高版本**及 npm。

```bash
git clone https://github.com/jessica20357/digital-journal.git
cd digital-journal
npm ci
npm run dev
```

打开终端显示的本地地址，默认是 `http://127.0.0.1:5173/`。

手账在自己的电脑上编辑，文档和媒体保存在浏览器本地。请保持使用同一浏览器和本地地址，以便继续访问已有内容。

也可以从[发布版本](https://github.com/jessica20357/digital-journal/releases/latest)下载**本地运行包**。安装 Node.js，解压后在 `digital-journal` 文件夹中打开终端，运行：

```bash
node scripts/start-local.mjs
```

然后打开 `http://127.0.0.1:5173/`，使用期间保持终端开启。本地运行包已包含构建后的应用和案例视频，无需执行 `npm ci`。请通过本地服务打开应用，不要直接双击 `index.html`。

| 命令                   | 用途                             |
| ---------------------- | -------------------------------- |
| `npm run dev`          | 启动本地开发服务器               |
| `npm run typecheck`    | 检查 TypeScript 类型             |
| `npm run format`       | 格式化源码和文档                 |
| `npm run format:check` | 检查源码和文档格式               |
| `npm run build`        | 构建本地运行版本                 |
| `npm start`            | 在本机 5173 端口运行构建后的应用 |
| `npm run preview`      | 在本机 4173 端口预览构建结果     |

## 代码结构

```text
digital-journal/
├── .github/workflows/check.yml    # 代码检查与构建验证
├── docs/architecture.md          # 模块职责与数据流说明
├── public/
│   ├── audio/page-flip.mp3        # 翻书音效
│   ├── demo/                     # 案例播放页、视频和封面
│   └── journal-icon.svg          # 网站图标
├── scripts/start-local.mjs       # 构建后应用的本地服务器
├── src/
│   ├── app/                      # 应用启动和书架/编辑器协调
│   ├── assets/                   # 默认风景素材
│   ├── config/                   # 默认页面、颜色和纸张模板
│   ├── domain/                   # 手账与页面组件类型
│   ├── features/
│   │   ├── audio/                # 声音控制
│   │   ├── books/                # 书本动画与交互风铃
│   │   ├── canvas/               # 手绘、橡皮、胶带与组件锁定
│   │   ├── images/               # 裁剪、去背景和贴纸效果
│   │   ├── text/                 # 富文本与字号设置
│   │   └── weather/              # 天气效果
│   ├── storage/                  # IndexedDB 存储与旧数据迁移
│   ├── styles/                   # 界面、动画和编辑控件样式
│   └── main.tsx                  # React 入口
├── index.html
├── package.json
├── package-lock.json
├── tsconfig.json
└── vite.config.ts
```

使用 **React、TypeScript、Vite、Three.js、Canvas / WebGL 和 IndexedDB** 构建。模块职责和保存流程见[架构说明](docs/architecture.md)。
