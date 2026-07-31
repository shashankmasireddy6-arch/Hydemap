# Hyderabad Property Map

A full-screen Google Maps–based UI for browsing property posts (Rent, Sale,
Sharing, Rent Paid) around Hyderabad, India.

## Setup

```bash
npm install
```

### Google Maps API key

1. Go to https://console.cloud.google.com/google/maps-apis (create a Google
   Cloud project first if you don't have one — it's free to start).
2. Under **APIs & Services > Library**, enable the **Maps JavaScript API**.
3. Under **APIs & Services > Credentials**, click **Create credentials >
   API key**. Google will generate a key immediately.
4. Copy `.env.local.example` to `.env.local` and paste the key in:
   ```bash
   cp .env.local.example .env.local
   ```
   ```
   NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=AIza...
   ```
5. Restart `npm run dev` so Next.js picks up the new env var.

Google's free tier includes a generous monthly credit that comfortably
covers local development and small projects — no credit card charge for
typical usage, though Google does require billing to be enabled on the
project for the key to work at all. Once you're ready to deploy, restrict
the key under **Application restrictions > HTTP referrers** to your
domain(s) so it can't be used elsewhere if it leaks.

If you skip this step, `components/MapView.tsx` falls back to a placeholder
string (`"YOUR_GOOGLE_MAPS_API_KEY"`), and the map will fail to load with a
console error pointing at the missing/invalid key — the rest of the app
(filters, Firestore, etc.) still runs fine either way.

## Firestore setup (posts storage)

Posts are stored in Firestore instead of local state. The app runs fine
without this — it falls back to local demo data — but to persist real
posts:

1. Go to https://console.firebase.google.com and create a project (or
   reuse one — it can be the same Google Cloud project as your Maps key).
2. In the project, open **Build > Firestore Database** and create a
   database. Choose **test mode** while developing (open to anyone —
   tighten this before shipping to real users).
3. Open **Project settings** (the gear icon) > scroll to "Your apps" > add
   a **Web app**. Firebase will show you a config object with your keys.
4. Add those values to the same `.env.local` from the Maps step above (see
   `.env.local.example` for the exact variable names).
5. Restart `npm run dev` so Next.js picks up the new env vars.
6. Optional: populate Firestore with the sample listings from
   `data/properties.json` by running:
   ```bash
   npm run seed
   ```
   This is safe to run once; running it again adds duplicate sample posts.

If `.env.local` isn't set up yet (or a Firestore request fails for any
reason), the app automatically falls back to the bundled demo data and
shows a small "Showing demo data" notice — new posts you create in that
mode are only kept in memory for the session, not saved anywhere.

### Firebase Storage setup (post photos)

Photos attached to a post are uploaded to Firebase Storage — a separate
product from Firestore, so it needs its own setup step:

1. In the same Firebase project, open **Build > Storage** and click **Get
   started** (test mode while developing, same as Firestore).
2. `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET` in `.env.local` (see
   `.env.local.example`) already points `lib/firebase.ts` at it — no extra
   config needed once Storage is enabled.

If Storage isn't enabled, uploads will fail; the Create Post form will show
an error rather than silently dropping the photos. Free tier is 5GB stored /
1GB downloaded per day, which comfortably covers small/personal use.

### WAQI API token (AQI map control)

The "AQI" map control fetches real air-quality readings from
[WAQI](https://waqi.info) (World Air Quality Index) — free, no credit card:

1. Get a token at https://aqicn.org/data-platform/token/ (just an email).
2. Set `NEXT_PUBLIC_WAQI_TOKEN` in `.env.local` (see `.env.local.example`).
3. Restart `npm run dev`.

Without a token, toggling AQI on shows an inline error explaining that
`NEXT_PUBLIC_WAQI_TOKEN` is missing, rather than failing silently.

### Admin delete (Firebase Auth + security rules)

Deleting a post (soft delete — see Notes below) is restricted to one
hardcoded admin account via real Firebase Authentication, not just a
client-side check — a client-side-only "is this the admin" check can't
actually stop anyone from calling Firestore directly. Setup:

1. In the Firebase console, open **Build > Authentication > Sign-in
   method**, enable **Google** as a provider.
2. Under **Authentication > Settings > Authorized domains**, add your
   deployed domain (e.g. `your-app.vercel.app`) — `localhost` is already
   authorized by default for local dev. Sign-in fails with
   `auth/unauthorized-domain` until this is done.
3. Open `firestore.rules` in this repo, copy its contents into **Firestore
   Database > Rules** in the console, and click **Publish**. This project
   doesn't use the Firebase CLI, so rules aren't deployed automatically —
   this is a manual copy-paste step, same as Storage/Firestore setup above.
4. The admin email is hardcoded in two places that must be kept in sync by
   hand (rules are a static file and can't import from the app's
   TypeScript): `ADMIN_EMAIL` in `lib/useAuth.ts` and the `request.auth.token.email`
   check in `firestore.rules`. Currently set to `operations@vectorsol.in`.

Once set up, click "Admin sign in" (top-left) and sign in with the admin
Google account — every post's map popup then shows a "Delete post" button.

### Comment notifications (Resend + Firebase Admin SDK)

Anyone can comment on a post without logging in — that part needs no setup,
it's a plain Firestore write (`allow create: if true` in `firestore.rules`,
same as posts). Emailing the post's *owner* about a new comment is the part
that needs setup, since it requires reading their private `email` field
(never exposed to any client-side query) from a trusted server context:

1. **Resend** (email): sign up at resend.com (free, no credit card) →
   **API Keys** → **Create API Key**. Set `RESEND_API_KEY` in `.env.local`
   (see `.env.local.example`) — **not** `NEXT_PUBLIC_`-prefixed, this must
   stay server-only.
2. **Firebase Admin SDK** (to read the owner's email server-side): Firebase
   console → **Project Settings** → **Service Accounts** → **Generate new
   private key** — downloads a JSON file. Paste its entire contents as one
   line into `FIREBASE_SERVICE_ACCOUNT_KEY` in `.env.local`. This is a real
   secret (full admin access to your Firestore data), unlike the
   `NEXT_PUBLIC_` keys used everywhere else in this app — never commit it,
   never prefix it `NEXT_PUBLIC_`.
3. Add both of the above to **Vercel → Project → Settings → Environment
   Variables** too (same as every other key in this app) and redeploy.

**Important caveat**: the notify route sends from `onboarding@resend.dev`,
Resend's no-setup-required sender address — but Resend restricts that
address to only deliver to *your own* Resend account email, as an
anti-abuse measure. Real posters (any other address) won't actually
receive anything until you verify your own sending domain under **Resend →
Domains** (adds a few DNS records) and swap the `from` address in
`app/api/comments/notify/route.ts` accordingly. Until then, notifications
will appear to "send" successfully (no error) but silently not arrive for
anyone but you — this is a Resend account-level restriction, not a bug in
the code.

A missing/invalid `RESEND_API_KEY` doesn't block comments from being
posted — the notify request just fails silently in the background (logged
server-side, not shown to the commenter), since a failed notification
shouldn't stop someone's comment from saving.

## Run

```bash
npm run dev
```

Open http://localhost:3000.

## Structure

```
app/
  layout.tsx        Root layout
  page.tsx           Main screen: fetches/adds posts via Firestore, filtering, click-to-pin + modal flow
  globals.css        Tailwind + range slider styling + Google Maps InfoWindow card overrides
  api/comments/notify/route.ts  Server route: emails a post's owner about a new comment
                                 (Admin SDK + Resend) — see "Comment notifications" setup above
components/
  icons.tsx            Small hand-drawn icon set (no icon-library dependency), shared
                        across markers, popups, legend, filter bar, and modal
  MapView.tsx          Full-screen Google Maps view; card-style info windows; icon markers;
                        temp pending pin; emits clicks for location capture
  FilterBar.tsx        Post-type dropdown (icon + colored swatch) + price range slider
  Legend.tsx           Bottom-right legend with icon badges; icon-only on mobile
  ResultsCount.tsx     "Showing X of Y posts" pill, top of screen
  AddPostButton.tsx    Floating "Add Post" button — icon-only FAB on mobile, full pill on desktop
  CreatePostModal.tsx  Create-post form with animated enter/exit, sticky header/footer
  PickLocationBanner.tsx    "Tap the map to set the pin" banner shown while re-picking
  SelectedLocationBadge.tsx "📍 lat, lng · Add post here · ✕" shortcut shown after a map click
  RentInsightsCard.tsx      Small floating card: average rent + rent-paid range for visible markers
  SearchBar.tsx             Location search (OpenStreetMap Nominatim) — pans/zooms the map and
                             drops a marker on a selected result
  MapControls.tsx           Floating top-right panel: Metro lines (Google TransitLayer), Satellite
                             toggle, and the AQI indicator
  AdminAuth.tsx              Top-left "Admin sign in" / signed-in-email pill (Google Sign-In)
  Toast.tsx                  Bottom-center self-dismissing notification (e.g. "Post deleted.")
  CommentsModal.tsx           Per-post comment thread + anonymous add-comment form (animated
                               modal, same pattern as CreatePostModal)
lib/
  firebase.ts          Firebase v9 modular SDK setup — initializes the app once, exports `db`,
                        `storage`, `auth`
  firebaseAdmin.ts      Server-only Firebase Admin SDK setup (never import from a "use client"
                         file) — backs app/api/comments/notify
  postsService.ts      Firestore reads/writes for posts: fetchPosts(), addPost(), softDeletePost();
                        uploadPostPhotos() for Storage uploads
  commentsService.ts    Firestore reads/writes for comments: fetchComments(), addComment(),
                        notifyPosterOfComment() (calls the API route above)
  useAuth.ts            Google Sign-In state + ADMIN_EMAIL check (see the Admin delete setup above)
  filterProperties.ts  Pure filter function (type + price range), reusable/testable
  createPostForm.ts    Create-post form state, defaults, and validation/parsing (kept out of the UI)
  rentInsights.ts      Nearby (3km) average-rent + rent-paid-range calculations
  format.ts            Shared currency formatter (₹, abbreviated to lakhs)
  geo.ts                haversineDistanceKm() — great-circle distance between two lat/lngs
  useMapCenter.ts        Debounced map-center tracking hook (backs the nearby average-rent radius)
  aqi.ts                WAQI fetch + the Good/Moderate/Poor categorization for the AQI control
  useAqi.ts             Debounced fetch-on-pan hook backing the AQI control (see MapControls.tsx)
types/
  post.ts            PostType, GenderPreference, LatLng, Property, NewProperty, colors, map center
  comment.ts         Comment, NewComment
data/
  properties.json    Demo/fallback property records: id, type, price, latitude, longitude, title
firestore.rules      Firestore security rules (manual copy-paste into the console — see "Admin
                      delete" setup above; this project doesn't use the Firebase CLI)
scripts/
  seedFirestore.mjs  One-time script to upload data/properties.json into Firestore (`npm run seed`)
```

## Notes

- **Design language**: indigo-600 as the single accent for actions (buttons,
  slider thumb, focus rings, links), slate for neutral text/surfaces, and
  the five semantic post-type colors (green/blue/yellow/red/purple) reserved
  for markers, the legend, and type badges so they stay unambiguous.
- **Card-style popups**: `MapView`'s info window HTML uses Tailwind utility
  classes directly in the template string (Tailwind's content scanner picks
  these up as plain text, no React needed) — a colored top accent bar, an
  icon badge (+ a "✓ Verified" badge when the post has photos), title,
  price, every filled-in flat-detail field, description, and photo
  thumbnails. Google's own InfoWindow chrome (padding, shadow,
  border-radius, tail, close button) is overridden in `globals.css` so the
  card reads as the entire popup. Unlike Mapbox's stable, documented class
  names, Google's InfoWindow classes (`.gm-style-iw-*`) aren't officially
  guaranteed — if a future Maps JS API update changes them and popups look
  "boxed in" again, re-inspect the DOM and adjust the selectors.
- **Icon markers**: each marker is a colored circular badge with a white
  type icon inside, built as an inline SVG data URI
  (`buildMarkerIconUrl` in `MapView.tsx`) from the same icon path data as
  everywhere else in `components/icons.tsx`. One trade-off from switching
  off Mapbox: classic Google `Marker` icons are static images rather than
  live DOM elements, so the previous CSS hover-scale and `animate-ping`
  pulse aren't possible here without moving to `AdvancedMarkerElement`
  (which needs a Map ID set up in Google Cloud) — the pending-location pin
  is a plain solid indigo dot instead of a pulsing one for the same reason.
- **Icons, no new dependency**: `components/icons.tsx` hand-draws a small
  line-icon set (home, tag, users, search, check-circle, chevron, close,
  map pin, sliders, wallet, plus, layers) as plain SVG — used by the legend,
  filter bar, modal, and (as raw markup) the map markers/info windows,
  without adding an icon library.
- **Animated modal**: `CreatePostModal` uses a two-state pattern
  (`shouldRender` + `isVisible`) so it stays mounted through a fade + scale
  exit transition instead of vanishing instantly; the backdrop fades and the
  panel scales/translates in on open. Built with Tailwind's `transition`,
  `duration`, and `ease` utilities only — no animation library.
- **Responsive / mobile-friendly**:
  - The modal caps at `max-h-[85vh]` with a scrollable form body and sticky
    header/footer, so it stays usable on short viewports with an on-screen
    keyboard open.
  - `AddPostButton` collapses to an icon-only circular FAB on small screens
    and expands to a labeled pill from `sm:` up.
  - `Legend` hides text labels below `sm:` and relies on the colored icon
    badges alone, wrapping into a row instead of a column so it stays
    compact on narrow screens.
  - `ResultsCount`, `PickLocationBanner`, and `SelectedLocationBadge` all
    swap to shorter copy or truncate on mobile so nothing overflows the
    viewport width.
- **Rent insights**: `lib/rentInsights.ts` derives two figures, both scoped
  by the active type/budget filters (`filteredProperties`) first:
  - `calculateNearbyAverageRent(center, properties, radiusKm = 3)` further
    filters to **Rent** posts within a 3km Haversine great-circle distance
    (`lib/geo.ts#haversineDistanceKm`) of `center`, then
    `avg = total_rent / number_of_listings`. `center` is the map's current
    center, tracked (debounced 500ms on pan/zoom) by `lib/useMapCenter.ts`
    — a plain synchronous `map.getCenter()` read, no network fetch, so no
    coalescing/abort logic needed there, just the debounce. Distance
    filtering happens client-side over the already-fetched `posts` array
    rather than as a Firestore geo-query, since Firestore has no native
    radius query without extra geohashing infra (e.g. `geofirestore`) —
    not worth it at this app's scale, where the whole collection is
    already loaded into memory anyway.
  - `calculateRentPaidRange` takes the min/max `price` across (filtered,
    but not distance-limited) **Rent Paid** posts — kept as a separate
    group from "Rent", since a settled rent and an asking rent aren't the
    same signal.
  `RentInsightsCard` renders "Average rent in this area: ₹X" and/or "People
  are paying between ₹X – ₹Y" in the top stack, right below the filter bar,
  recomputing live as the map pans or filters change. If neither group has
  any qualifying posts, the card renders nothing at all rather than
  showing an empty box.
  (Currency is shown as ₹ to stay consistent with the rest of the app,
  since it's Hyderabad-based — swap `lib/format.ts` if you need a different
  currency symbol.)
- **Filtering**: `lib/filterProperties.ts` holds the filter logic as a pure
  function, kept separate from the UI. `app/page.tsx` recomputes the
  filtered list with `useMemo`, so it only re-runs when the type, budget,
  or the underlying post list actually change.
- **Real-time markers**: `MapView` keeps a `Map<id, Marker>` instead of
  clearing and rebuilding every marker on each filter change, so it only
  adds/removes the markers that actually entered or left the result set.
- **Click-to-pin location capture**:
  - Clicking anywhere on the map (when the modal isn't open) stores that
    lat/lng in `selectedLocation` state and drops the pulsing indigo pin.
  - `SelectedLocationBadge` appears at the top with an **"Add post here"**
    shortcut and a **✕** to clear the pin without opening the form.
  - Opening "Add Post" — via the floating button or the badge's shortcut —
    pre-fills Latitude/Longitude from `selectedLocation` automatically.
  - The pin persists across a cancelled form; it only clears once the post
    is actually created (or you tap ✕).
- **Price vs. Monthly rent**: the form shows exactly one amount field,
  depending on Post Type — **Sale** shows "Price" (a one-time amount);
  **Rent**, **Sharing**, and **Rent Paid** show "Monthly rent" (a recurring
  amount) instead. Whichever one is shown, `buildPropertyFromForm` in
  `lib/createPostForm.ts` writes that value into both `price` and
  `monthlyRent` on the resulting post, so the map popup and the budget
  filter (which both key off `price`) work the same regardless of type.
- **Photos & "Verified" badge**: the Create Post form lets you attach up to
  5 photos, uploaded to Firebase Storage on submit
  (`uploadPostPhotos` in `lib/postsService.ts`) with the resulting URLs
  saved on the post as `photoUrls`. There's no separate identity/phone
  verification step — a post with at least one photo simply renders a "✓
  Verified" badge on its map card, treating "the poster bothered to attach
  photos" as the trust signal. If Firebase isn't configured (demo mode),
  photos still preview via local blob URLs but aren't persisted anywhere.
- **Create Post flow** (now backed by Firestore):
  - The form always has Post Type, Title, the Price/Monthly rent field
    (see above), Latitude, and Longitude.
  - Choosing **Sharing** reveals a **Gender preference** dropdown (in an
    amber-tinted panel); choosing **Rent Paid** reveals an **anonymous**
    toggle switch (in a purple-tinted panel) — stored as optional
    `Property` fields (`genderPreference`, `anonymous`).
  - **Pick on map** inside the modal hides it, switches the cursor to a
    crosshair, and shows `PickLocationBanner`; the next map click updates
    both the form and the temp pin, then reopens the modal.
  - On submit, `lib/createPostForm.ts` validates the form into a
    `NewProperty` (no id yet); any picked photos are uploaded first (see
    above), then `lib/postsService.ts`'s `addPost()` writes the post,
    photo URLs included, to Firestore via `addDoc`; the returned document
    id becomes the post's `id`. The new post is appended straight to
    `posts` state (no need to re-fetch the whole collection), so the
    marker appears immediately — subject to the currently active filters,
    exactly like any other post. While the write is in flight, the modal's
    buttons disable and the submit button reads "Saving…"; if it fails,
    the error surfaces inline in the form and nothing is added until it
    succeeds.
- **Firestore integration**:
  - `lib/firebase.ts` initializes the Firebase v9 modular SDK once (guarded
    against Next.js's dev-mode hot reloads) and exports `db` (Firestore),
    `storage` (Storage, for photo uploads), plus `isFirebaseConfigured`
    (true once real env vars are set).
  - `lib/postsService.ts` has `fetchPosts()` (reads
    the whole `posts` collection with `getDocs`), `addPost()` (writes one
    document with `addDoc` and returns it with its new id), and
    `uploadPostPhotos()` (uploads files to Storage via `uploadBytes` and
    resolves their `getDownloadURL()`s). The Firestore functions use the
    modular `firebase/firestore` imports (`collection`, `addDoc`, `getDocs`)
    rather than the old namespaced v8 API.
  - `app/page.tsx` calls `fetchPosts()` once in a `useEffect` on load. If
    Firebase isn't configured yet, or the fetch throws, it falls back to
    the bundled `data/properties.json` and shows a small "Showing demo
    data" notice instead of crashing or showing a blank map.
- **AQI control**: `lib/useAqi.ts` fetches WAQI's AQI reading for the
  current map *center* (not the visible bounds — a single point, unlike
  the removed train/bus controls which queried an area) while the toggle
  is on, refetching (debounced 800ms) as the map is panned. AQI is
  collapsed from the standard 6-tier scale into three buckets per the
  original ask: 0–50 Good (green), 51–100 Moderate (yellow), 101+ Poor
  (red) — see `categorize()` in `lib/aqi.ts` if finer-grained tiers are
  wanted later. Uses the same coalesce-in-flight-requests pattern as
  `lib/useOverpassMarkers.ts` (finish the current fetch, then run once
  more with the latest center) rather than aborting and restarting on
  every pan — that pattern was found, on the train/bus controls, to be
  able to prevent any request from ever completing under rapid pan/zoom.
  A heatmap overlay (mentioned as optional in the original ask) isn't
  implemented — WAQI's free tier only returns one point reading per
  request, so a smooth heatmap would mean tens of calls across a grid on
  every pan, which isn't a good fit for the free tier's rate limits.
- **Admin delete (soft delete)**: posts are never hard-deleted —
  `lib/postsService.ts#softDeletePost` only ever calls Firestore's
  `updateDoc` to set `status: "deleted"`, never `deleteDoc` (the rules even
  disallow `delete` outright, admin included, as a backstop). `fetchPosts()`
  filters out `status === "deleted"` client-side rather than via a
  `where("status", "==", "active")` query — documents written before this
  field existed have no value for it at all, and that query would silently
  exclude every one of them.
  - **Client-side gating is cosmetic only.** `MapView`'s `isAdmin` prop
    just decides whether a "Delete post" button renders in a popup —
    it has zero enforcement power on its own. The actual boundary is
    `firestore.rules`: `allow update` requires
    `request.auth.token.email == 'operations@vectorsol.in'`, which only
    exists because of real Firebase Authentication (Google Sign-In, see
    `lib/useAuth.ts`) added specifically to give the rules something to
    check. Without real sign-in, a hardcoded-email check is unenforceable
    — anyone can call Firestore directly from the browser console
    regardless of what the UI shows.
  - **Popup delete button uses event delegation**, not a normal React
    `onClick` — `MapView`'s InfoWindow content is a raw HTML string (see
    `buildPopupHtml`), not React, so clicks on `.delete-post-btn` are
    caught via a single listener on the map's container `div` (same
    pattern the old, since-removed "Find matches" button used). Because
    each InfoWindow's content is only set once, at marker-creation time,
    a second effect in `MapView` (keyed on `isAdmin`) calls
    `infoWindow.setContent(...)` on every currently-tracked popup when
    the admin signs in/out, so already-open or previously-rendered popups
    pick up the button appearing/disappearing without a full marker
    rebuild.
  - Deleting shows a native `window.confirm()` ("Are you sure you want to
    delete this post?"), then removes the post from local `posts` state
    on success (its marker disappears via `MapView`'s existing
    filtered-list sync, no special-case cleanup needed) and shows a
    bottom-center toast (`components/Toast.tsx`, auto-dismisses after 3s)
    reporting success or failure.
- **Comment system**: a top-level `comments` Firestore collection (not a
  `posts/{id}/comments` subcollection — kept flat, matching how the rest of
  this app's Firestore usage is a single top-level `posts` collection with
  no subcollections anywhere), with `postId`, `commenterName`,
  `commentText`, `createdAt`. Anonymous — no login, matching the "without
  login" requirement — same open `allow create: if true` as posts.
  - **A popup isn't a good place for a full comment thread + form** — the
    map's InfoWindow is a small, raw-HTML card (see the Admin delete note
    above for why it's raw HTML at all). So the popup only gets a
    "💬 Comments" button (delegated click, same `.delete-post-btn`
    mechanism), which opens `CommentsModal` — a proper animated React
    modal (same pattern as `CreatePostModal`) — rather than trying to
    cram a dynamic list + input form into the InfoWindow itself.
  - **Chronological order is sorted client-side** in
    `lib/commentsService.ts#fetchComments`, not via a Firestore `orderBy`
    — combining the `where("postId", "==", ...)` equality filter with an
    `orderBy` on a different field needs a composite index, and per-post
    comment counts are small enough that sorting already-fetched docs in
    JS is simpler than one more required Firestore index setup step.
  - **Notifying the poster is a separate, best-effort step**
    (`notifyPosterOfComment`, called right after `addComment` succeeds but
    not awaited by the UI) rather than something the comment-write itself
    depends on — a comment always saves even if the notification email
    fails or `RESEND_API_KEY` isn't configured at all. The notify call
    goes through `app/api/comments/notify` (a real server route, this
    app's first) rather than a client-side email send, specifically
    because it needs to read the post's `email` field, which is private
    by design (`postsService.ts#toProperty` deliberately never reads it
    into any client-visible `Property`) — only the Admin SDK, running
    server-side with `FIREBASE_SERVICE_ACCOUNT_KEY`, can see it. See the
    "Comment notifications" setup section above for the Resend sandbox
    domain caveat (emails silently won't reach real posters until a
    sending domain is verified).
