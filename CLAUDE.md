# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev      # Start dev server (Vite, usually http://localhost:5173)
npm run build    # Production build → dist/
npm run preview  # Preview production build locally
```

## Architecture

**Stack:** React 18 + Vite + React Three Fiber (`@react-three/fiber`) + Drei (`@react-three/drei`)

**Layout:** Two-column grid — 3D viewer (left, `1fr`) and config panel (right, `400px fixed`). Stacks vertically on mobile.

**Data flow:** All configuration state lives in `App.jsx` (`frameId`, `lidId`, `showPanels`). State is derived to model URLs via `useMemo` and passed as props to `Viewer3D` and `ConfigPanel`.

**3D viewer (`src/components/Viewer3D.jsx`):**
- Renders up to 3 simultaneous GLB models at the same world-space origin (frame + lid + panels are designed to overlap correctly by the 3D artist)
- Uses `<Stage>` from drei for auto-centering, camera fit, and lighting
- `scene.clone(true)` via `useMemo` isolates each model's scene graph from the shared GLTF cache
- All GLB paths are preloaded via `useGLTF.preload` at module level so switching is instant

**Model data (`src/config/models.js`):**
- `FRAMES` — B3/B4/B5 frame variants (different slot counts)
- `LIDS` — 7 waste-type lid variants (Bio, Klaas, Paber, Pakend, Prugi, Puhas, Taara)
- `FRONT_PANELS` — single optional front-panel model
- All paths are URL-encoded with `encodeURI()` because the `public/GLB/` subdirectories contain spaces

**GLB assets in `public/GLB/`:**
- `1. Karkass/` — frame bodies (B3/B4/B5)
- `2. Kaaned Liigiti/` — lid variants, one GLB per waste type covering all 5 positions
- `3. Esipaneelid/` — front panel set (positions 1–5)
