# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev      # Start dev server (Vite, http://localhost:5173)
npm run build    # Production build → dist/
npm run preview  # Preview production build locally
```

There are no test or lint commands configured.

## Architecture

**Stack:** React 19 + Vite 8 + React Three Fiber + Drei + Firebase (Auth, Firestore, Storage) + React Router v7

This is a SaaS platform where users build and embed interactive 3D product configurators. It has two distinct parts that should not be confused:

1. **The CMS platform** — authenticated pages under `/dashboard`, `/builder/:id`, `/media`, `/orders`, `/billing`, `/team`, `/landing-pages`, `/landing/:id`, `/admin`
2. **The legacy static demo** — the original container configurator (`src/config/models.js`, `src/components/Viewer3D.jsx`, `src/components/ConfigPanel.jsx`). This is standalone and unrelated to the CMS.

## Data flow

**Auth:** `AuthProvider` (in `src/hooks/useAuth.jsx`) wraps the entire app and exposes `{ user, profile, setProfile }` via `useAuth()`. `user` is the Firebase Auth object; `profile` is the Firestore `users/{uid}` document. `user === undefined` means loading; `user === null` means signed out.

**Firebase layer:** All Firestore and Storage calls go through `src/firebase/db.js` and `src/firebase/storage.js`. Never import Firebase SDK packages directly in components — always use these files. `src/firebase/config.js` exports the shared `auth`, `db`, and `storage` instances.

**Builder state:** `src/pages/Builder.jsx` owns all configurator state locally (variants, interiors, background, viewerSettings, orderForm, theme, hotspots, watermark, etc.). Changes auto-save to Firestore after a 1.5 s debounce. Manual Save also creates a revision snapshot. Undo/redo is an in-memory stack (max 50). Before saving to Firestore, all objects are passed through `stripUndefined()` — Firestore rejects `undefined` values.

**Configurator rendering:** `src/components/ConfiguratorRenderer.jsx` takes a saved config object and renders the full viewer + panel UI. It is used both in the Builder preview and in `src/pages/EmbedView.jsx` (the public embed). This is the component to touch when changing how a configurator looks to end users.

**Subscription gating:** Plan limits (embed count, landing page count) are checked via helpers in `src/config/plans.js` (`getEmbedLimit`, `getLandingPageLimit`). Publish actions in the Builder and LandingBuilder check these limits and redirect to `/billing` if exceeded. The `subscriptionStatus` field on the user profile drives access: `trial`, `active`, `cancelled`, `past_due`.

## 3D rendering

- **GLB 3D models:** Rendered in `src/components/SaunaViewer3D.jsx` using React Three Fiber. Each variant has `glbLayers` — an array of GLB files rendered at the same world-space origin so parts stack (body + cushion + legs). Per-material color/texture overrides are stored in `materialOverrides` keyed by material name. `src/utils/glbMaterials.js` scans a GLB URL to extract its material list.
- **Rotation images (spinner):** Rendered in `src/components/ImageSpinner.jsx`. Frames are uploaded sequentially, stored in Firebase Storage, and played back on mouse drag.
- **360° interiors:** Rendered in `src/components/InteriorViewer.jsx` as a Three.js equirectangular sphere.
- **Legacy static viewer:** `src/components/Viewer3D.jsx` renders up to 3 overlapping GLB models (frame + lid + panels). Uses `scene.clone(true)` to isolate scene graphs from the shared GLTF cache. GLB paths in `public/GLB/` are `encodeURI()`-encoded because subdirectory names contain spaces.

## Firestore collections

| Collection | Key fields |
|---|---|
| `users` | `subscriptionStatus`, `planId`, `trialStarted`, `paypalSubscriptionId` |
| `configurators` | `ownerId`, `published`, `variants[]`, `interiors[]`, `viewerSettings`, `orderForm`, `theme`, `hotspots`, `watermark` |
| `revisions` | `configuratorId`, `ownerId`, `savedAt`, `data` (full configurator snapshot) |
| `orders` | `configuratorId`, `ownerId`, `formData`, `variantId` |
| `analytics` | document ID = configurator ID, `views` counter |
| `media` | `ownerId`, `url`, `storagePath`, `contentType` |
| `landingPages` | `ownerId`, `published`, `items[]` |
| `teamInvites` | `ownerUid`, `memberUid`, `inviteeEmail`, `code`, `status` |
| `invoices` | `userId`, `issuedAt` |

## Storage

All user files live at `users/{uid}/{timestamp}_{random}.{ext}`. Original filename is in `customMetadata.originalName`. `uploadFile(uid, file, onProgressCb)` returns `{ url, storagePath }`. Always store both — `url` for display, `storagePath` for deletion.

## Routing

Public routes: `/`, `/login`, `/signup`, `/demo`, `/contact`, `/glb-models`, `/what-is-glb`, `/privacy`, `/terms`, `/cookies`, `/embed/:id`, `/lp/:id`, `/join/:code`

Protected routes (wrapped in `<ProtectedRoute>`): `/dashboard`, `/builder/:id`, `/billing`, `/media`, `/orders`, `/landing-pages`, `/landing/:id`, `/admin`, `/team`
