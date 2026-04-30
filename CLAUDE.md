# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
yarn dev          # Start dev server (Vite, http://localhost:5173)
yarn build        # Production build → dist/
yarn preview      # Preview production build locally
yarn lint         # ESLint — checks src/ (eslint.config.js, flat config)
yarn test         # Vitest in watch mode
yarn test:run     # Vitest single run (CI)
```

To run a single test file:
```bash
yarn vitest run src/path/to/file.test.jsx
```

## Writing tests

**Framework:** Vitest + React Testing Library + jsdom. Test files live next to the source file they test: `src/components/Foo.test.jsx`, `src/firebase/db.test.js`, etc. The global setup at `src/test/setup.js` imports `@testing-library/jest-dom` so matchers like `toBeInTheDocument()` are available everywhere.

**What to mock:** Firebase is the main external dependency. Mock the entire firebase modules rather than individual functions:

```js
import { vi } from 'vitest'

vi.mock('../firebase/db.js', () => ({
  getConfigurator: vi.fn(),
  saveConfigurator: vi.fn(),
}))

vi.mock('../firebase/config.js', () => ({
  auth: {},
  db: {},
  storage: {},
}))
```

**Mocking `useAuth`:** Many components call `useAuth()`. Mock the hook module:

```js
vi.mock('../hooks/useAuth.jsx', () => ({
  useAuth: vi.fn(() => ({
    user: { uid: 'test-uid' },
    profile: { subscriptionStatus: 'active', planId: 'pro' },
    setProfile: vi.fn(),
  })),
}))
```

**Mocking React Router:** Components that use `useParams`, `useNavigate`, or `Link` need the router. Wrap with `MemoryRouter` or mock the module:

```js
import { MemoryRouter } from 'react-router-dom'
render(<MemoryRouter initialEntries={['/builder/abc']}><MyComponent /></MemoryRouter>)
```

**Mocking Three.js / R3F:** Three.js and React Three Fiber do not work in jsdom. Mock entire modules for any component that imports from `three`, `@react-three/fiber`, or `@react-three/drei`:

```js
vi.mock('@react-three/fiber', () => ({ Canvas: ({ children }) => children, useFrame: vi.fn() }))
vi.mock('@react-three/drei', () => ({ useGLTF: vi.fn(() => ({ scene: { clone: vi.fn(() => ({})) } })) }))
```

**Focus areas for tests:**
- `src/firebase/db.js` — unit test each function by mocking the Firestore SDK calls
- `src/config/plans.js` — pure functions (`getEmbedLimit`, `getLandingPageLimit`, `isTrialExpired`), test with no mocks needed
- `src/utils/glbMaterials.js` — unit test material extraction logic
- UI components: prefer testing behaviour (button clicks, form submission) over snapshot tests

---

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
