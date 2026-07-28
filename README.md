# Hyderabad Property Map

A full-screen Google Maps–based UI for browsing property posts (Rent, Sale,
Sharing, Requirement, Rent Paid) around Hyderabad, India.

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
  MatchesPanel.tsx          "N matching properties found" panel for Requirement ("Looking for
                             property") posts, listing nearby in-budget Rent matches
lib/
  firebase.ts          Firebase v9 modular SDK setup — initializes the app once, exports `db`
  postsService.ts      Firestore reads/writes for posts: fetchPosts(), addPost()
  filterProperties.ts  Pure filter function (type + price range), reusable/testable
  createPostForm.ts    Create-post form state, defaults, and validation/parsing (kept out of the UI)
  rentInsights.ts      Pure average-rent / rent-paid-range calculations over visible properties
  format.ts            Shared currency formatter (₹, abbreviated to lakhs)
  matching.ts          Finds nearby, in-budget Rent posts for a Requirement post
  geo.ts               Haversine distance calculation (km) between two lat/lng points
types/
  post.ts            PostType, GenderPreference, LatLng, Property, NewProperty, colors, map center
data/
  properties.json    Demo/fallback property records: id, type, price, latitude, longitude, title
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
  icon badge, title, and price. Google's own InfoWindow chrome (padding,
  shadow, border-radius, tail, close button) is overridden in `globals.css`
  so the card reads as the entire popup. Unlike Mapbox's stable, documented
  class names, Google's InfoWindow classes (`.gm-style-iw-*`) aren't
  officially guaranteed — if a future Maps JS API update changes them and
  popups look "boxed in" again, re-inspect the DOM and adjust the selectors.
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
- **Property matching**: "Requirement" posts represent someone "Looking
  for property". `lib/matching.ts`'s `findMatchingRentPosts()` finds
  **Rent** posts that are:
  - **Within budget** — priced at or under the requirement's stated price,
    plus a 15% tolerance (`BUDGET_TOLERANCE` in `lib/matching.ts`) so a
    listing just slightly over budget still shows up, since real searches
    aren't usually that strict.
  - **Nearby** — within 5 km (`MATCH_RADIUS_KM`) of the requirement's
    pinned location, using a haversine great-circle distance
    (`lib/geo.ts`) rather than naive lat/lng differences.
  Matches are sorted nearest-first. Both constants are simple exported
  values in `lib/matching.ts` if you want to tune them.
  - **Triggered automatically**: right after creating a Requirement post,
    `MatchesPanel` appears showing "N matching properties found" (or "1
    matching property found" / a "no matches yet" message), listing each
    match's title, price, and distance.
  - **Also available on demand**: any existing Requirement post's map
    popup has a **"Find matches"** button that re-runs the same search
    against the current post list — handled via event delegation in
    `MapView` since popup content is raw HTML, not React.
  - Clicking a match in the panel flies the map to that listing and opens
    its popup (`MapView`'s `focusRequest` prop), so the result of a match
    is immediately visible rather than just a name in a list.
- **Rent insights**: `lib/rentInsights.ts` derives two figures purely from
  the currently *visible* markers (`filteredProperties` — i.e. whatever
  survives the active type/budget filters):
  - `calculateAverageRent` averages the `price` of visible **Rent** posts.
  - `calculateRentPaidRange` takes the min/max `price` across visible
    **Rent Paid** posts — kept as a separate group from "Rent", since a
    settled rent and an asking rent aren't the same signal.
  `RentInsightsCard` renders "Average rent in this area: ₹X" and/or "People
  are paying between ₹X – ₹Y" in the top stack, right below the filter bar,
  and recomputes live as filters or the map's visible set change. If
  neither group has any visible posts, the card renders nothing at all
  rather than showing an empty box.
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
- **Create Post flow** (now backed by Firestore):
  - The form always has Post Type, Title, Price, Latitude, and Longitude.
  - Choosing **Sharing** reveals a **Gender preference** dropdown (in an
    amber-tinted panel); choosing **Rent Paid** reveals an **anonymous**
    toggle switch (in a purple-tinted panel) — stored as optional
    `Property` fields (`genderPreference`, `anonymous`).
  - **Pick on map** inside the modal hides it, switches the cursor to a
    crosshair, and shows `PickLocationBanner`; the next map click updates
    both the form and the temp pin, then reopens the modal.
  - On submit, `lib/createPostForm.ts` validates the form into a
    `NewProperty` (no id yet), which `lib/postsService.ts`'s `addPost()`
    writes to Firestore via `addDoc`; the returned document id becomes the
    post's `id`. The new post is appended straight to `posts` state (no
    need to re-fetch the whole collection), so the marker appears
    immediately — subject to the currently active filters, exactly like
    any other post. While the write is in flight, the modal's buttons
    disable and the submit button reads "Saving…"; if it fails, the error
    surfaces inline in the form and nothing is added until it succeeds.
- **Firestore integration**:
  - `lib/firebase.ts` initializes the Firebase v9 modular SDK once (guarded
    against Next.js's dev-mode hot reloads) and exports `db`, the Firestore
    instance, plus `isFirebaseConfigured` (true once real env vars are set).
  - `lib/postsService.ts` has exactly two functions: `fetchPosts()` (reads
    the whole `posts` collection with `getDocs`) and `addPost()` (writes one
    document with `addDoc` and returns it with its new id). Both use the
    modular `firebase/firestore` imports (`collection`, `addDoc`, `getDocs`)
    rather than the old namespaced v8 API.
  - `app/page.tsx` calls `fetchPosts()` once in a `useEffect` on load. If
    Firebase isn't configured yet, or the fetch throws, it falls back to
    the bundled `data/properties.json` and shows a small "Showing demo
    data" notice instead of crashing or showing a blank map.
