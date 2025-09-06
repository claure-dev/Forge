# Forge Desktop Development Setup

## Prerequisites

1. **Node.js 18+** with npm
2. **Electron dependencies** installed in the desktop package

## Development Workflow

### Starting the Application

The Electron app requires both a renderer (UI) server and the main process:

#### Option 1: Manual Process (Recommended for debugging)

1. **Start the Vite renderer server** (from `/packages/desktop/`):
   ```bash
   npm run dev:renderer
   ```
   This starts Vite on `http://localhost:5173`

2. **Build the main process** (from `/packages/desktop/`):
   ```bash
   npm run build:main
   ```

3. **Launch Electron** with development environment (from `/packages/desktop/`):
   ```bash
   NODE_ENV=development npx electron dist/main/main/main.js
   ```

#### Option 2: Automated (from project root)
```bash
npm run dev
```

**Note**: The automated approach may have workspace path issues. Use manual process if issues occur.

## Architecture

- **Main Process**: `src/main/main.ts` - Electron main thread, handles window creation and IPC
- **Renderer Process**: `src/renderer/` - React UI running in Vite dev server
- **Preload**: `src/main/preload.ts` - Secure bridge between main and renderer

## Key Configuration

### Development vs Production Loading

The main process automatically detects environment:
- **Development** (`NODE_ENV=development`): Loads from `http://localhost:5173` (Vite dev server)
- **Production**: Loads from `dist/renderer/index.html` (built files)

### File Structure
```
packages/desktop/
├── src/
│   ├── main/          # Electron main process
│   └── renderer/      # React UI components
├── dist/              # Built files
│   ├── main/main/     # Compiled main process
│   └── renderer/      # Built renderer (production)
└── package.json       # Desktop package scripts
```

## Common Issues

### White Screen
- Ensure Vite dev server is running on `http://localhost:5173`
- Verify `NODE_ENV=development` is set when launching Electron
- Check browser dev tools for errors (automatically opened in dev mode)

### Build Errors
- Ensure TypeScript builds succeed: `npm run build:main`
- Check that all dependencies are installed in the desktop package

## Available Scripts (in packages/desktop/)

- `npm run dev:renderer` - Start Vite dev server
- `npm run build:main` - Build main process TypeScript
- `npm run build:renderer` - Build renderer for production
- `npm run build` - Build both main and renderer
- `npm run dist` - Create distributable packages