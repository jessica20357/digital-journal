# 页间 · 数字手账

把照片、文字、贴纸、天气和音乐，拼成属于自己的一页生活。

**[在线体验](https://jessica20357.github.io/digital-journal/)** · **[观看完整案例视频](https://jessica20357.github.io/digital-journal/demo/)** · **[代码结构](docs/architecture.md)**

![发布状态](https://github.com/jessica20357/digital-journal/actions/workflows/deploy.yml/badge.svg)

## 案例视频

[![点击观看数字手账制作案例](public/demo/journal-demo-poster.jpg)](https://jessica20357.github.io/digital-journal/demo/)

点击上方封面，观看用户提供的 **《10月14日》完整演示视频**。视频展示了图片拼贴、抠图、贴纸效果、胶带装饰、文字排版和手账阅读效果。

演示时长约 **2 分 26 秒**。发布版保留完整内容与原音轨，转换为浏览器广泛支持的 H.264 / AAC MP4，并缩小到 1920 像素宽，便于在线播放。

- [打开视频播放页](https://jessica20357.github.io/digital-journal/demo/)
- [直接播放 MP4](https://jessica20357.github.io/digital-journal/demo/journal-demo.mp4)
- [查看仓库中的视频文件](public/demo/journal-demo.mp4)

## 功能

| 功能       | 使用方式                                                         |
| ---------- | ---------------------------------------------------------------- |
| 数字书架   | 创建、打开和删除手账，自定义封面与彩带；多本手账以长廊形式陈列   |
| 自由画布   | 双页书脊、不同页面底色、纸张模板与自定义单页尺寸                 |
| 文字排版   | 添加多个文本框，调整字体、字号、颜色、粗体、斜体和横竖排         |
| 图片与贴纸 | 导入多张独立图片，裁剪、去背景、描边和选择贴纸样式               |
| 组件操作   | 拖动、旋转、缩放、锁定、复制粘贴和调整图层覆盖顺序               |
| 手绘与胶带 | 连续绘制、设置颜色和粗细；橡皮可以局部擦除手绘和胶带             |
| 页面天气   | 晴天、雨天、雪天与顶部白云，支持强度或密度调节                   |
| 页面音乐   | 每页设置不同音乐，音效按钮统一控制音乐、翻书声和风铃的开关及音量 |
| 本地保存   | 自动保存、手动保存、撤销和重做                                   |
| 阅读模式   | 收起编辑工具，浏览自己的手账内容                                 |

缩放图片和素材时默认自由缩放，按住 **Shift** 可以保持比例。

## 快速开始

需要 **Node.js 22.12 或更高版本**及 npm。

```bash
git clone https://github.com/jessica20357/digital-journal.git
cd digital-journal
npm ci
npm run dev
```

打开终端显示的本地地址，默认是 `http://127.0.0.1:5173/`。

| 命令                    | 用途                                                |
| ----------------------- | --------------------------------------------------- |
| `npm run dev`           | 启动本地开发服务器                                  |
| `npm run typecheck`     | 检查 TypeScript 类型                                |
| `npm run format`        | 统一代码和文档格式                                  |
| `npm run format:check`  | 检查代码和文档格式                                  |
| `npm run build`         | 构建部署在根路径的静态网站                          |
| `npm run build:pages`   | 构建部署在 `/digital-journal/` 的 GitHub Pages 网站 |
| `npm run preview:pages` | 本地预览 GitHub Pages 路径的构建                    |
| `npm run preview`       | 本地预览最近一次构建                                |

## 代码结构

```text
digital-journal/
├── .github/workflows/deploy.yml   # 自动构建和发布
├── docs/architecture.md          # 模块与数据流说明
├── public/
│   ├── audio/page-flip.mp3        # 翻书音效
│   ├── demo/                     # 案例播放页、视频和封面
│   └── journal-icon.svg          # 网站图标
├── src/
│   ├── app/                      # 应用启动和书架/编辑器协调
│   ├── assets/                   # 默认风景素材
│   ├── config/                   # 默认页面、颜色和纸张
│   ├── domain/                   # 手账和页面组件类型
│   ├── features/
│   │   ├── audio/                # 声音控制
│   │   ├── books/                # 书本与风铃动画
│   │   ├── canvas/               # 手绘、橡皮、胶带与组件锁定
│   │   ├── images/               # 图片裁剪、去背景和贴纸效果
│   │   ├── text/                 # 富文本与字号设置
│   │   └── weather/              # 天气效果
│   ├── storage/                  # IndexedDB 与旧数据迁移
│   ├── styles/                   # 界面、动画和编辑控件样式
│   └── main.tsx                  # React 入口
├── index.html
├── package.json
├── package-lock.json
├── tsconfig.json
└── vite.config.ts
```

技术栈为 **React、TypeScript、Vite、Three.js、Canvas / WebGL 和 IndexedDB**。详细职责与保存流程见 [架构说明](docs/architecture.md)。

## 数据与媒体

手账内容、图片和页面背景音乐保存在当前浏览器的 IndexedDB 中，天气和音量等偏好保存在 localStorage 中。网站不提供账号或云同步。切换浏览器、换设备、改变网站来源或清除网站数据后，不会自动恢复另一处的文档；本地开发地址的数据也不会自动迁移到在线地址。

AI 贴纸入口目前是演示交互，尚未连接真实生成服务。一键去背景根据边缘背景颜色进行处理，复杂背景可以使用手动裁剪。页面内导入的视频目前使用临时浏览器地址，重新打开网站后可能需要重新导入；README 的案例视频作为静态资源发布，可以持续访问。

## GitHub Pages 发布

推送到 `main` 分支后，`.github/workflows/deploy.yml` 会安装锁定依赖、检查格式、构建项目，并发布 `dist/`。

仓库设置中，进入 **Settings → Pages → Build and deployment**，将 **Source** 设为 **GitHub Actions**。站点地址为：

<https://jessica20357.github.io/digital-journal/>

案例播放页在 `/digital-journal/demo/`。部署到其他仓库时，修改 `vite.config.ts` 的 Pages 基础路径，以及本文件、`package.json` 中的链接。

参考：[GitHub Pages 自定义工作流](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages)。
