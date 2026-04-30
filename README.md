# GLB Configurator

A SaaS platform for building and embedding interactive 3D product configurators. Users can create configurators with multiple variants (rotation image sequences or GLB 3D models), interior 360° panorama views, order forms, and embed them anywhere via iframe or JS widget.

**Production:** glbconfigurator.com

---

## Stack

| Layer | Technology |
|---|---|
| Frontend | React 19 + Vite 8 |
| 3D rendering | React Three Fiber + Drei + Three.js |
| Backend / DB | Firebase (Auth, Firestore, Storage) |
| Payments | PayPal subscriptions |
| Routing | React Router v7 |

---

## Getting started

### Prerequisites

- Node.js 18+
- A Firebase project with Auth, Firestore, and Storage enabled

### Install

```bash
npm install
```

### Environment variables

Create a `.env.local` file in the project root:

```env
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_STORAGE_BUCKET=
VITE_FIREBASE_MESSAGING_SENDER_ID=
VITE_FIREBASE_APP_ID=
VITE_FIREBASE_MEASUREMENT_ID=

VITE_PAYPAL_PLAN_ID_STARTER=
VITE_PAYPAL_PLAN_ID_PRO=
VITE_PAYPAL_PLAN_ID_BUSINESS=
VITE_PAYPAL_PLAN_ID_ENTERPRISE=
```

### Commands

```bash
npm run dev      # Start dev server at http://localhost:5173
npm run build    # Production build → dist/
npm run preview  # Preview production build locally
```

---

## Project structure

```
src/
  App.jsx                    # Root router
  main.jsx                   # Entry point
  platform.css               # Platform / CMS styles

  config/
    models.js                # Static GLB model paths (B3/B4/B5 frames, lids, panels)
    plans.js                 # Subscription plan definitions and limit helpers
    sauna.js                 # Sauna demo configuration

  firebase/
    config.js                # Firebase app init, exports auth/db/storage
    auth.js                  # Auth helpers (Google sign-in, etc.)
    db.js                    # Firestore CRUD for users, configurators, orders, etc.
    storage.js               # Firebase Storage upload/delete helpers

  hooks/
    useAuth.jsx              # AuthContext + useAuth hook (user, profile)
    useConfigurator.js       # State management for the legacy configurator
    useCmsTheme.jsx          # Applies the user-selected theme/dark mode to CSS vars

  components/
    ConfiguratorRenderer.jsx # Renders a saved configurator config (viewer + panel tabs)
    Viewer3D.jsx             # Three.js viewer for static GLB models (legacy)
    SaunaViewer3D.jsx        # Three.js viewer for sauna demo
    ConfigPanel.jsx          # Config panel for legacy container configurator
    SaunaPanel.jsx           # Config panel for sauna demo
    InteriorViewer.jsx       # 360° panorama viewer (three.js equirectangular)
    CmsSidebar.jsx           # Left navigation sidebar for CMS pages
    MediaPickerModal.jsx     # File picker from the user's media library
    OrderModal.jsx           # Order submission modal
    ProtectedRoute.jsx       # Auth guard wrapper
    HeroBackground.jsx       # Animated hero background
    LandingRenderer.jsx      # Renders a saved landing page
    ImageSpinner.jsx         # Rotation image viewer (drag to spin)
    GoogleIcon.jsx           # Google SVG icon
    CookieBanner.jsx         # GDPR cookie consent banner

  pages/
    Landing.jsx              # Public marketing homepage
    Login.jsx / Signup.jsx   # Auth pages
    Dashboard.jsx            # CMS: list and manage configurators
    Builder.jsx              # CMS: full configurator editor
    Billing.jsx              # CMS: subscription / PayPal
    Media.jsx                # CMS: media library (upload, browse, delete)
    Orders.jsx               # CMS: view order form submissions
    LandingPages.jsx         # CMS: list and manage landing pages
    LandingBuilder.jsx       # CMS: landing page editor
    LandingView.jsx          # Public: renders a published landing page (/lp/:id)
    EmbedView.jsx            # Public: embeddable configurator view (/embed/:id)
    Admin.jsx                # Admin: manage users (protected, admin-only)
    Team.jsx                 # CMS: invite and manage team members
    JoinTeam.jsx             # Public: accept team invite (/join/:code)
    GlbModels.jsx            # Info page about GLB models
    WhatIsGlb.jsx            # Marketing info page
    Contact.jsx              # Contact form page
    PrivacyPolicy.jsx        # Legal
    TermsOfService.jsx       # Legal
    CookiePolicy.jsx         # Legal

  utils/
    glbMaterials.js          # Extracts material list from a GLB file URL

public/
  GLB/
    1. Karkass/              # Frame GLBs (B3, B4, B5 slot counts)
    2. Kaaned Liigiti/       # Lid GLBs (Bio, Glass, Paper, Packaging, General, Clean, Deposit)
    3. Esipaneelid/          # Front panel GLB
```

---

## Core concepts

### Configurator

A configurator is a Firestore document under `configurators/` owned by a user. It contains:

- **Variants** — selectable product options, each either:
  - *Rotation images* — a sequence of frames played back when the user drags (ImageSpinner)
  - *3D model (GLB)* — one or more layered GLB files rendered with React Three Fiber
- **Interiors** — 360° panorama images shown in a separate tab
- **Viewer settings** — lighting, camera FOV, environment, auto-rotate, etc.
- **Order form** — optional contact/order submission form with configurable fields
- **Theme / style** — preset themes (Minimal, Slate, Warm, Forest, Bold) with optional color overrides
- **Hotspots** — clickable pins on the viewer image with labels/descriptions
- **Watermark** — optional logo overlay on the viewer
- **Variant groups** — logical sections to organise variants (e.g. "Color", "Size"), with optional conditional visibility

### GLB layers

Each variant of type `glb` holds an array of `glbLayers`. Layers are rendered at the same world-space origin so parts can be stacked (e.g. body + cushion + legs). Each layer supports per-material color and texture overrides, detected by scanning the GLB's material names.

### Embedding

A published configurator is accessible at `/embed/:id` and can be embedded with:

```html
<!-- iframe -->
<iframe src="https://glbconfigurator.com/embed/CONFIGURATOR_ID"
        width="100%" height="600" frameborder="0" allowfullscreen></iframe>

<!-- JS widget (auto-resize, avoids cross-origin issues) -->
<div data-configurator="CONFIGURATOR_ID" data-height="600px"></div>
<script src="https://glbconfigurator.com/widget.js" async></script>
```

### Subscription plans

Defined in `src/config/plans.js`. Plans gate how many configurators a user can publish and how many landing pages they can create.

| Plan | Price/mo | Published embeds | Landing pages |
|---|---|---|---|
| Trial | free | 3 | 1 |
| Starter | €60 | 3 | 1 |
| Pro | €120 | 9 | 3 |
| Business | €180 | 18 | 5 |
| Enterprise | €680 | 50 | 10 |

Trial expires after 3 days (`TRIAL_DAYS` in `plans.js`).

---

## Firestore collections

| Collection | Description |
|---|---|
| `users` | User profiles (subscriptionStatus, planId, trialStarted, …) |
| `configurators` | Configurator documents (owned by ownerId) |
| `configurators/:id/revisions` | Manual save history (max 30 per configurator) |
| `orders` | Order form submissions |
| `analytics` | View/interaction counts per configurator |
| `landingPages` | Landing page documents |
| `teamInvites` | Team member invites (ownerUid, memberUid, status) |

---

## Firebase Storage structure

Files are stored per user under `users/{uid}/`:

```
users/{uid}/media/        # User-uploaded images and GLB files (media library)
```

Storage security rules must allow authenticated users to read/write their own folder. If uploads fail with `storage/unauthorized`, check the rules in the Firebase Console.

---

## Auto-save and revision history

The Builder auto-saves 1.5 s after the last change. Clicking **Save** triggers an immediate save and also creates a revision snapshot (stored in `configurators/:id/revisions`). Up to 30 revisions are kept. Undo/redo (`Ctrl+Z` / `Ctrl+Y`) operates on an in-memory stack of up to 50 snapshots.

---

## Team collaboration

An account owner can invite members via `/team`. Invites are sent by email and accepted via `/join/:code`. Accepted members see the owner's configurators in their dashboard (marked "Shared") but cannot delete or duplicate them.

---

## Legacy container configurator

`src/config/models.js`, `src/components/Viewer3D.jsx`, and `src/components/ConfigPanel.jsx` are the original static container configurator (B3/B4/B5 frames with interchangeable lids). This is separate from the CMS builder and is used as a standalone demo. GLB assets live in `public/GLB/` with URL-encoded paths (subdirectory names contain spaces).

---

## Adding Firebase logic

All Firebase code lives in `src/firebase/`. The three files map cleanly to Firebase services:

| File | Service | Exports |
|---|---|---|
| `config.js` | App init | `auth`, `db`, `storage` |
| `auth.js` | Authentication | `signUp`, `signIn`, `signInWithGoogle`, `logOut` |
| `db.js` | Firestore | All CRUD functions grouped by collection |
| `storage.js` | Storage | `uploadFile`, `listUserFiles`, `deleteFile` |

Never import `firebase/*` SDK packages directly in components or pages. Always go through these files so the Firebase instances are shared and logic stays testable.

---

### Adding a Firestore query

All Firestore functions follow the same pattern. Add new ones at the bottom of the relevant section in `src/firebase/db.js`:

```js
// 1. Import what you need at the top of db.js (already imported in most cases)
import { collection, doc, addDoc, getDoc, getDocs, updateDoc, deleteDoc,
         query, where, orderBy, serverTimestamp } from 'firebase/firestore'
import { db } from './config.js'

// 2. Write the function
export async function getItemsByOwner(uid) {
  const q = query(
    collection(db, 'items'),          // collection name
    where('ownerId', '==', uid),      // filter
    orderBy('createdAt', 'desc'),     // sort
  )
  const snaps = await getDocs(q)
  return snaps.docs.map((d) => ({ id: d.id, ...d.data() }))
}
```

Common patterns used in this codebase:

```js
// Read a single document
const snap = await getDoc(doc(db, 'collectionName', id))
return snap.exists() ? { id: snap.id, ...snap.data() } : null

// Create a document with an auto-generated ID
const ref = await addDoc(collection(db, 'collectionName'), {
  ownerId: uid,
  createdAt: serverTimestamp(),
  updatedAt: serverTimestamp(),
})
return ref.id   // the generated document ID

// Create/overwrite a document with a known ID
await setDoc(doc(db, 'collectionName', knownId), { ...data })

// Partial update (merge fields, not overwrite)
await updateDoc(doc(db, 'collectionName', id), {
  fieldToChange: newValue,
  updatedAt: serverTimestamp(),
})

// Delete
await deleteDoc(doc(db, 'collectionName', id))

// Atomic counter increment (no read-modify-write race)
import { increment } from 'firebase/firestore'
await updateDoc(ref, { viewCount: increment(1) })
```

**Firestore `undefined` values** — Firestore rejects documents that contain `undefined`. Before saving any object that comes from React state, strip it first using the `stripUndefined` helper that already exists in `src/pages/Builder.jsx`. If you need it in a new file, copy the function or extract it to a shared util.

---

### Adding a new Firestore collection

1. Choose a name (e.g. `notifications`).
2. Add CRUD functions to `src/firebase/db.js` in a clearly labelled section:

```js
// ── Notifications ───────────────────────────────────────────────────

export async function createNotification(uid, message) {
  const ref = await addDoc(collection(db, 'notifications'), {
    ownerId: uid,
    message,
    read: false,
    createdAt: serverTimestamp(),
  })
  return ref.id
}

export async function getUserNotifications(uid) {
  const q = query(
    collection(db, 'notifications'),
    where('ownerId', '==', uid),
    orderBy('createdAt', 'desc'),
  )
  const snaps = await getDocs(q)
  return snaps.docs.map((d) => ({ id: d.id, ...d.data() }))
}
```

3. Add Firestore security rules for the new collection (see the Security rules section below).
4. If the collection requires a composite index (e.g. filtering by `ownerId` and ordering by `createdAt`), Firestore will throw an error with a direct link to create the index — click it.

---

### Adding a Storage upload

`uploadFile` in `src/firebase/storage.js` handles the general case. Call it from a component:

```js
import { uploadFile } from '../firebase/storage.js'

// Inside an async handler:
const { url, storagePath } = await uploadFile(
  user.uid,     // used to build the storage path: users/{uid}/{timestamp}_{random}.ext
  file,         // File object from an <input type="file">
  (pct) => setProgress(pct),   // optional progress callback (0–100)
)
// url         — public download URL, safe to store in Firestore and render in <img>
// storagePath — the internal path, store it so you can call deleteFile() later
```

To delete a file:

```js
import { deleteFile } from '../firebase/storage.js'

await deleteFile(storagePath)  // silently ignores "file not found" errors
```

Files are stored at `users/{uid}/{timestamp}_{randomId}.{ext}`. The original filename is preserved in `customMetadata.originalName` so it can be shown to the user without being part of the path.

---

### Adding an auth method

Authentication helpers are in `src/firebase/auth.js`. The file uses the Firebase Auth SDK directly and also creates a matching Firestore user profile on first sign-up.

To add a new sign-in method (e.g. GitHub):

```js
import { GithubAuthProvider, signInWithPopup } from 'firebase/auth'
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore'
import { auth, db } from './config.js'

export async function signInWithGithub() {
  const provider = new GithubAuthProvider()
  const { user } = await signInWithPopup(auth, provider)
  // Create a Firestore profile if this is a new user
  const ref = doc(db, 'users', user.uid)
  const snap = await getDoc(ref)
  if (!snap.exists()) {
    await setDoc(ref, {
      name: user.displayName || '',
      email: user.email,
      subscriptionStatus: 'trial',
      trialStarted: serverTimestamp(),
      paypalSubscriptionId: null,
      createdAt: serverTimestamp(),
    })
  }
  return user
}
```

Enable the provider in the Firebase Console under **Authentication → Sign-in method** before using it.

---

### Reading auth state in components

Use the `useAuth` hook. It is available anywhere inside `<AuthProvider>` (which wraps the entire app in `App.jsx`):

```js
import { useAuth } from '../hooks/useAuth.jsx'

export default function MyPage() {
  const { user, profile, setProfile } = useAuth()
  // user    — Firebase Auth user object (or null if signed out, undefined while loading)
  // profile — Firestore user document from the `users` collection
  // setProfile — call this after updating the user's profile to keep the context fresh
}
```

`user === undefined` means auth state is still being determined (show a spinner). `user === null` means signed out.

To update the profile and reflect the change immediately without a page reload:

```js
import { updateUser } from '../firebase/db.js'

await updateUser(user.uid, { displayName: 'New Name' })
setProfile((p) => ({ ...p, displayName: 'New Name' }))
```

---

### Security rules

Firestore and Storage rules are managed in the Firebase Console (or via `firestore.rules` / `storage.rules` files if you set up the Firebase CLI).

The general rule of thumb used in this project:

- A user can read and write their own documents (`request.auth.uid == resource.data.ownerId`).
- Public embed reads (`/embed/:id`) are allowed without auth because `getPublishedConfigurator` in `db.js` performs subscription checks in application code.
- Admin-only operations should be gated by a custom claim or an `isAdmin` field on the user document.

Minimal starting rules for a new collection:

```
match /notifications/{docId} {
  allow read, write: if request.auth != null
                     && request.auth.uid == resource.data.ownerId;
  allow create: if request.auth != null
                && request.auth.uid == request.resource.data.ownerId;
}
```

For Storage, all user files live under `users/{uid}/` and are protected by:

```
match /users/{uid}/{allPaths=**} {
  allow read, write: if request.auth != null && request.auth.uid == uid;
}
```
