# Yejian · Digital Journal

## Demo Video

[![Watch the banana fish journal demo](public/demo/journal-demo-poster.jpg)](public/demo/journal-demo.mp4)

- [View or download the MP4](public/demo/journal-demo.mp4)
- After starting the app locally, open the [local video player](http://127.0.0.1:5173/demo/).

## Features

| Feature                | Description                                                                                                      |
| ---------------------- | ---------------------------------------------------------------------------------------------------------------- |
| Digital bookshelf      | Create, open, and delete journals; customize covers and ribbons; browse multiple journals in a scrolling gallery |
| Freeform canvas        | Two-page spreads with a spine, separate page colors, paper templates, and custom page dimensions                 |
| Text layouts           | Add multiple text boxes and adjust fonts, sizes, colors, bold, italic, and horizontal or vertical writing        |
| Images and stickers    | Import independent images, crop them, remove backgrounds, add outlines, and apply sticker styles                 |
| Component controls     | Move, rotate, resize, lock, copy and paste, and reorder components in the layer panel                            |
| Drawing and washi tape | Draw continuously, adjust pen color and width, and erase parts of drawings or tape with an adjustable eraser     |
| Page weather           | Sunny, rainy, snowy, and cloudy effects with adjustable intensity or cloud density                               |
| Page music             | Assign a different soundtrack to each page; use one sound control for music, page-turn sounds, and chimes        |
| Local storage          | Automatic and manual saving, undo, and redo                                                                      |
| Reading mode           | Hide editing tools and browse your journal                                                                       |

Images and decorative elements resize freely by default. Hold **Shift** while resizing to preserve their proportions.

## Quick Start

Requires **Node.js 22.12 or later** and npm.

```bash
git clone https://github.com/jessica20357/digital-journal.git
cd digital-journal
npm ci
npm run dev
```

Open the local URL shown in your terminal, usually `http://127.0.0.1:5173/`.

Journal editing runs on your computer. Your documents and media are saved in your browser's local storage; use the same browser and local address to keep accessing them.

You can also download the **local app package** from [Releases](https://github.com/jessica20357/digital-journal/releases/latest). Extract it, install Node.js, and run:

```bash
node scripts/start-local.mjs
```

Then open `http://127.0.0.1:5173/`. Keep the terminal open while using the app. The local package already includes the built app and demo video, so it does not need `npm ci`. Open the app through the local server rather than double-clicking `index.html`.

| Command                | Purpose                                        |
| ---------------------- | ---------------------------------------------- |
| `npm run dev`          | Start the local development server             |
| `npm run typecheck`    | Check TypeScript types                         |
| `npm run format`       | Format source code and documentation           |
| `npm run format:check` | Check source code and documentation formatting |
| `npm run build`        | Build the app for local use                    |
| `npm start`            | Serve the built app locally on port 5173       |
| `npm run preview`      | Preview a build locally on port 4173           |

## Code Structure

```text
digital-journal/
├── .github/workflows/check.yml    # Code checks and build validation
├── docs/architecture.md          # Module responsibilities and data flow
├── public/
│   ├── audio/page-flip.mp3        # Page-turn sound
│   ├── demo/                     # Video player, demo video, and poster
│   └── journal-icon.svg          # Site icon
├── scripts/start-local.mjs       # Local server for the built app
├── src/
│   ├── app/                      # App startup and bookshelf/editor coordination
│   ├── assets/                   # Default scenery artwork
│   ├── config/                   # Default pages, colors, and paper presets
│   ├── domain/                   # Journal and page component types
│   ├── features/
│   │   ├── audio/                # Sound controls
│   │   ├── books/                # Book animations and interactive chimes
│   │   ├── canvas/               # Drawing, erasing, tape, and component locking
│   │   ├── images/               # Cropping, background removal, and sticker effects
│   │   ├── text/                 # Rich text and font size controls
│   │   └── weather/              # Weather effects
│   ├── storage/                  # IndexedDB storage and legacy data migration
│   ├── styles/                   # Interface, animation, and editor styles
│   └── main.tsx                  # React entry point
├── index.html
├── package.json
├── package-lock.json
├── tsconfig.json
└── vite.config.ts
```

Built with **React, TypeScript, Vite, Three.js, Canvas / WebGL, and IndexedDB**. See the [architecture guide](docs/architecture.md) for module responsibilities and the saving workflow.
