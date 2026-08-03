"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Loader } from "@googlemaps/js-api-loader";
import { LatLng, Property, getPostColor, HYDERABAD_CENTER, RECURRING_TYPES } from "@/types/post";
import { Comment } from "@/types/comment";
import { addComment, fetchComments, notifyPosterOfComment } from "@/lib/commentsService";
import { useClusters } from "@/lib/useClusters";
import { ClusterPoint, PriceRangePoint } from "@/types/cluster";
import { smoothZoomTo } from "@/lib/smoothZoom";
import { createHtmlMarkerOverlay, HtmlMarkerOverlay } from "@/lib/htmlMarkerOverlay";
import {
  buildClusterBubbleElement,
  buildListingChipElement,
  buildPriceRangeChipElement,
  fadeInChip,
} from "@/lib/markerChips";
import { POST_TYPE_ICON_MARKUP } from "@/components/icons";

// Replace with a real Google Maps API key before deploying (or set
// NEXT_PUBLIC_GOOGLE_MAPS_API_KEY in .env.local — see .env.local.example).
// Get one at https://console.cloud.google.com/google/maps-apis — enable the
// "Maps JavaScript API" for the project, then create a key under
// "Credentials" and restrict it to your domain(s).
const GOOGLE_MAPS_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "YOUR_GOOGLE_MAPS_API_KEY";

interface MapViewProps {
  properties: Property[];
  onMapClick?: (lng: number, lat: number) => void;
  isPickingLocation?: boolean;
  // A location the user has tapped but not yet turned into a post — shown
  // as a distinct pin so it reads differently from real posts.
  pendingLocation?: LatLng | null;
  // Fired once, right after the map instance is created — lets a sibling
  // component (e.g. SearchBar) drive panTo/zoom/markers directly without
  // this component needing to know anything about what uses it for.
  onMapReady?: (map: google.maps.Map) => void;
  // Whether to show a "Delete post" button in each popup. Purely cosmetic
  // gating — the real enforcement is the Firestore security rules (see
  // firestore.rules); this just avoids showing a button that would fail
  // for anyone who isn't the admin.
  isAdmin?: boolean;
  // Called with a property's id when its popup's "Delete post" button is
  // clicked (see the container-click delegation below — popup content is
  // raw HTML, not React, so it can't take a normal onClick prop).
  onDeletePost?: (id: string) => void;
}

const formatPrice = (value: number) => `₹${value.toLocaleString("en-IN")}`;

const escapeHtml = (value: string) =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

function buildDetailRows(property: Property): string {
  const rows: [string, string | undefined][] = [
    ["BHK", property.bhk],
    ["Furnishing", property.furnishing],
    ["Gated society", property.gatedSociety],
    ["Maintenance", property.maintenanceIncluded ? "Included" : undefined],
    ["Occupants", property.occupants],
    ["Pets", property.pets],
    ["Deposit", property.deposit !== undefined ? formatPrice(property.deposit) : undefined],
    ["Parking", property.parking !== undefined ? String(property.parking) : undefined],
    [
      "Square footage",
      property.squareFootage !== undefined ? `${property.squareFootage} sqft` : undefined,
    ],
    property.type === "Sharing"
      ? ["Gender preference", property.genderPreference]
      : ["", undefined],
    property.type === "Rent Paid" && property.anonymous ? ["Posted", "Anonymously"] : ["", undefined],
  ];

  return rows
    .filter(([label, value]) => label && value)
    .map(
      ([label, value]) =>
        `<div class="flex items-center justify-between gap-3"><span class="text-slate-500">${label}</span><span class="font-medium text-slate-800">${escapeHtml(
          value as string
        )}</span></div>`
    )
    .join("");
}

const formatCommentDate = (ms: number) =>
  new Date(ms).toLocaleDateString("en-IN", { day: "numeric", month: "short" });

// Comments + an anonymous add-comment form, embedded directly in the
// popup (not a separate modal — a small InfoWindow is a cramped home for
// a dynamic list + form, but that's what was asked for, so this leans on
// the same raw-HTML + event-delegation approach as the rest of the popup
// rather than trying to fit React in here). `comments` is undefined until
// the first fetch resolves (see loadComments in the component below) —
// distinct from an empty array, which means "loaded, zero comments".
// Wrapped with data-property-id so the delegated click handler can scope
// its input lookup to *this* popup specifically, even if more than one
// InfoWindow happens to be open at once.
function buildCommentsSectionHtml(
  postId: string,
  comments: Comment[] | undefined,
  isLoadingComments: boolean
): string {
  let listMarkup: string;
  if (isLoadingComments) {
    listMarkup = `<p class="text-xs text-slate-400">Loading comments…</p>`;
  } else if (!comments || comments.length === 0) {
    listMarkup = `<p class="text-xs text-slate-400">No comments yet — be the first.</p>`;
  } else {
    listMarkup = `
      <ul class="flex max-h-28 flex-col gap-1.5 overflow-y-auto">
        ${comments
          .map(
            (comment) => `
              <li class="rounded-lg bg-slate-50 p-2">
                <div class="mb-0.5 flex items-center justify-between gap-2">
                  <span class="truncate text-[11px] font-semibold text-slate-900">${escapeHtml(
                    comment.commenterName
                  )}</span>
                  <span class="shrink-0 text-[10px] text-slate-400">${formatCommentDate(
                    comment.createdAt
                  )}</span>
                </div>
                <p class="text-xs text-slate-700">${escapeHtml(comment.commentText)}</p>
              </li>
            `
          )
          .join("")}
      </ul>
    `;
  }

  return `
    <div class="comments-section mt-3 border-t border-slate-100 pt-3" data-property-id="${postId}">
      <p class="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-slate-500">Comments</p>
      ${listMarkup}
      <div class="mt-2 flex flex-col gap-1.5">
        <input
          type="text"
          class="comment-name-input w-full rounded-lg border border-slate-200 px-2 py-1.5 text-xs text-slate-800 placeholder:text-slate-400 focus:border-indigo-400 focus:outline-none"
          placeholder="Your name"
        />
        <textarea
          class="comment-text-input w-full resize-none rounded-lg border border-slate-200 px-2 py-1.5 text-xs text-slate-800 placeholder:text-slate-400 focus:border-indigo-400 focus:outline-none"
          placeholder="Add a comment…"
          rows="2"
        ></textarea>
        <button
          type="button"
          class="submit-comment-btn rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-indigo-500"
          data-property-id="${postId}"
        >Post comment</button>
      </div>
    </div>
  `;
}

// Modern card-style popup: colored top accent, icon + type label (+
// verified badge), title, price, an at-a-glance grid of every filled-in
// detail, description, photo thumbnails, and the comments section above.
// Google's own InfoWindow chrome (padding/shadow/tail/close button) is
// overridden in globals.css so this card reads as the whole popup.
function buildPopupHtml(
  property: Property,
  isAdmin: boolean,
  comments: Comment[] | undefined,
  isLoadingComments: boolean
): string {
  const color = getPostColor(property.type);
  const title = escapeHtml(property.title);
  const priceLabel = RECURRING_TYPES.includes(property.type)
    ? `${formatPrice(property.price)}/mo`
    : formatPrice(property.price);

  // Admin-only, cosmetic gating — see the isAdmin prop doc on MapViewProps
  // for why this isn't the real security boundary. Clicks are caught via
  // delegation on the map container (see handleContainerClick below),
  // since InfoWindow content is raw HTML rather than React.
  const deleteButton = isAdmin
    ? `<button type="button" class="delete-post-btn mt-3 w-full rounded-lg bg-red-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-red-500" data-property-id="${property.id}">Delete post</button>`
    : "";

  const commentsSection = buildCommentsSectionHtml(property.id, comments, isLoadingComments);

  // A post with at least one uploaded photo is treated as the app's
  // lightweight "legit" signal — no verification infra needed.
  const isVerified = !!property.photoUrls?.length;
  const verifiedBadge = isVerified
    ? `<span class="ml-1 inline-flex items-center gap-0.5 rounded-full bg-emerald-50 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-700">✓ Verified</span>`
    : "";

  const detailRows = buildDetailRows(property);
  const detailsMarkup = detailRows
    ? `<div class="mt-2.5 flex flex-col gap-1 border-t border-slate-100 pt-2.5 text-xs">${detailRows}</div>`
    : "";

  const descriptionMarkup = property.description
    ? `<p class="mt-2.5 text-xs leading-snug text-slate-600">${escapeHtml(property.description)}</p>`
    : "";

  const photosMarkup = property.photoUrls?.length
    ? `<div class="mt-2.5 flex gap-1.5 overflow-x-auto">${property.photoUrls
        .map(
          (url) =>
            `<img src="${escapeHtml(url)}" class="h-16 w-16 shrink-0 rounded-lg border border-slate-100 object-cover" />`
        )
        .join("")}</div>`
    : "";

  return `
    <div class="w-64 font-sans">
      <div class="h-1.5 w-full" style="background-color: ${color}"></div>
      <div class="p-4">
        <div class="mb-2 flex items-center gap-1.5">
          <span class="flex h-5 w-5 items-center justify-center rounded-full" style="background-color: ${color}1a">
            <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="stroke: ${color}">
              ${POST_TYPE_ICON_MARKUP[property.type]}
            </svg>
          </span>
          <span class="text-[11px] font-semibold uppercase tracking-wide text-slate-500">${property.type}</span>
          ${verifiedBadge}
        </div>
        <h3 class="mb-1 text-sm font-semibold leading-snug text-slate-900">${title}</h3>
        <p class="text-base font-bold text-slate-900">${priceLabel}</p>
        ${detailsMarkup}
        ${descriptionMarkup}
        ${photosMarkup}
        ${commentsSection}
        ${deleteButton}
      </div>
    </div>
  `;
}

export default function MapView({
  properties,
  onMapClick,
  isPickingLocation,
  pendingLocation,
  onMapReady,
  isAdmin = false,
  onDeletePost,
}: MapViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<google.maps.Map | null>(null);
  // Flips true once the Maps JS API has loaded and the map instance
  // exists, so the other effects (which all depend on mapRef.current)
  // know to (re)run instead of silently no-oping on first mount.
  const [isMapReady, setIsMapReady] = useState(false);
  // Same map instance as mapRef, but as state — needed so useClusters
  // (a hook, which can't read a ref reactively) knows once it exists.
  const [mapInstance, setMapInstance] = useState<google.maps.Map | null>(null);

  // Keyed by property id so filter changes only add/remove the markers
  // that actually entered or left the result set, instead of rebuilding
  // all of them on every keystroke/slider tick. HtmlMarkerOverlay (not
  // classic Marker) — see lib/htmlMarkerOverlay.ts for why: these render
  // real, styled "detailed listing chip" HTML per the marker-design spec,
  // not a flat icon image.
  const markersRef = useRef<Map<string, HtmlMarkerOverlay>>(new Map());
  const infoWindowsRef = useRef<Map<string, google.maps.InfoWindow>>(new Map());
  const pendingMarkerRef = useRef<google.maps.Marker | null>(null);
  // Cluster-bubble / price-range-pill chips are ephemeral and rebuilt
  // wholesale on every cluster-result change (see the clustering effect
  // below) rather than diffed like property markers — there's no
  // per-marker state (like an open popup) worth preserving across a
  // rebuild the way there is for a property's InfoWindow.
  const clusterMarkersRef = useRef<HtmlMarkerOverlay[]>([]);

  // Clustering: fetches /api/clusters, debounced on bounds/zoom changes
  // (see lib/useClusters.ts). `results` mixes ClusterPoints (grouped
  // areas) and ListingPoints (individual posts that should render
  // normally at the current view) — see types/cluster.ts.
  const { results: clusterResults, error: clustersError } = useClusters(
    mapInstance,
    properties.length
  );

  // Which property ids should render as their normal rich marker right
  // now — everything else is either grouped into a cluster circle or
  // outside the current viewport/bounds. `null` means "show every
  // property, unclustered": clustering is a display nicety layered on top
  // of the map, not the source of truth for which posts exist, so a
  // failed /api/clusters call (missing env var, cold start, network blip)
  // must fail open, not hide every listing on the map. Empty (not null)
  // until the first successful fetch resolves, which briefly hides
  // property markers on first load — same trade-off as any other
  // data-dependent overlay in this app (e.g. AQI).
  const listingIdsToShow = useMemo(() => {
    if (clustersError) return null;
    return new Set(clusterResults.filter((r) => r.type === "listing").map((r) => r.id));
  }, [clusterResults, clustersError]);

  // Per-post comments cache + in-flight tracking. Comments load lazily —
  // the first time a post's popup opens (see loadComments below), not
  // eagerly for every marker — and stay cached for the rest of the
  // session once loaded. `Map.has()` distinguishes "never fetched" from
  // "fetched, zero comments".
  const commentsCacheRef = useRef<Map<string, Comment[]>>(new Map());
  const loadingCommentsRef = useRef<Set<string>>(new Set());

  // Holds the latest callbacks/data without forcing the map-init effect
  // (which only runs once, see below) to re-run or its listeners to be
  // re-attached every render.
  const onMapClickRef = useRef(onMapClick);
  onMapClickRef.current = onMapClick;
  const onMapReadyRef = useRef(onMapReady);
  onMapReadyRef.current = onMapReady;
  const onDeletePostRef = useRef(onDeletePost);
  onDeletePostRef.current = onDeletePost;
  const isAdminRef = useRef(isAdmin);
  isAdminRef.current = isAdmin;
  const propertiesRef = useRef(properties);
  propertiesRef.current = properties;
  // Holds the teardown for the delegated "Delete post"/"Post comment"
  // click listener, set once the map (and its container div) exist.
  const containerClickCleanupRef = useRef<(() => void) | null>(null);

  // Re-renders a single popup's content from current state (property +
  // isAdmin + cached comments) without touching any other marker/popup.
  const refreshPopupContent = (property: Property) => {
    const infoWindow = infoWindowsRef.current.get(property.id);
    if (!infoWindow) return;
    infoWindow.setContent(
      buildPopupHtml(
        property,
        isAdminRef.current,
        commentsCacheRef.current.get(property.id),
        loadingCommentsRef.current.has(property.id)
      )
    );
  };

  // Fetches a post's comments the first time its popup opens; a no-op on
  // later opens (cached) or while already in flight. Only reads from
  // refs, so it stays correct even called from a listener attached back
  // when this function had a different identity (see the marker click
  // listener below).
  const loadComments = async (property: Property) => {
    if (
      commentsCacheRef.current.has(property.id) ||
      loadingCommentsRef.current.has(property.id)
    ) {
      return;
    }
    loadingCommentsRef.current.add(property.id);
    refreshPopupContent(property);
    try {
      const comments = await fetchComments(property.id);
      commentsCacheRef.current.set(property.id, comments);
    } catch (err) {
      console.error("Failed to fetch comments:", err);
      commentsCacheRef.current.set(property.id, []);
    } finally {
      loadingCommentsRef.current.delete(property.id);
      refreshPopupContent(property);
    }
  };

  // Posts a new comment (called from the delegated click handler below),
  // updates the cache + that popup's content immediately on success, and
  // best-effort notifies the poster — a failed notification shouldn't
  // undo or block the comment, which has already saved by that point.
  const submitComment = async (property: Property, commenterName: string, commentText: string) => {
    try {
      const newComment = await addComment({
        postId: property.id,
        commenterName,
        commentText,
        createdAt: Date.now(),
      });
      const existing = commentsCacheRef.current.get(property.id) ?? [];
      commentsCacheRef.current.set(property.id, [...existing, newComment]);
      refreshPopupContent(property);
      notifyPosterOfComment(property.id, commenterName, commentText);
    } catch (err) {
      console.error("Failed to post comment:", err);
      window.alert("Couldn't post your comment. Try again.");
      refreshPopupContent(property); // restore the button from its "Posting…" state
    }
  };
  const submitCommentRef = useRef(submitComment);
  submitCommentRef.current = submitComment;

  // Load the Maps JS API and initialize the map once on mount.
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    let cancelled = false;

    const loader = new Loader({ apiKey: GOOGLE_MAPS_API_KEY, version: "weekly" });

    loader
      .load()
      .then(() => {
        if (cancelled || !containerRef.current || mapRef.current) return;

        // HYDERABAD_CENTER is [lng, lat]; Google's API wants { lat, lng }.
        const map = new google.maps.Map(containerRef.current, {
          center: { lat: HYDERABAD_CENTER[1], lng: HYDERABAD_CENTER[0] },
          zoom: 11,
          disableDefaultUI: true,
          zoomControl: true,
          clickableIcons: false,
        });
        mapRef.current = map;
        setMapInstance(map);
        onMapReadyRef.current?.(map);

        map.addListener("click", (e: google.maps.MapMouseEvent) => {
          if (!e.latLng) return;
          onMapClickRef.current?.(e.latLng.lng(), e.latLng.lat());
        });

        // Popup/info-window content is raw HTML (not React), so "Delete
        // post"/"Post comment" clicks are caught via delegation on the
        // map's container rather than a per-window listener.
        const container = map.getDiv();
        const handleContainerClick = (e: MouseEvent) => {
          const target = e.target as HTMLElement;

          const deleteButton = target.closest<HTMLButtonElement>(".delete-post-btn");
          if (deleteButton) {
            const propertyId = deleteButton.dataset.propertyId;
            if (propertyId) onDeletePostRef.current?.(propertyId);
            return;
          }

          const commentButton = target.closest<HTMLButtonElement>(".submit-comment-btn");
          if (commentButton) {
            const propertyId = commentButton.dataset.propertyId;
            if (!propertyId) return;

            // Scoped to *this* popup's inputs specifically (via the
            // comments-section wrapper's matching data-property-id), in
            // case more than one InfoWindow happens to be open at once.
            const section = commentButton.closest<HTMLElement>(".comments-section");
            const nameInput = section?.querySelector<HTMLInputElement>(".comment-name-input");
            const textInput = section?.querySelector<HTMLTextAreaElement>(".comment-text-input");
            const commenterName = nameInput?.value.trim();
            const commentText = textInput?.value.trim();

            if (!commenterName || !commentText) {
              window.alert("Enter your name and a comment.");
              return;
            }

            const property = propertiesRef.current.find((p) => p.id === propertyId);
            if (!property) return;

            // Immediate feedback while the write is in flight; the full
            // popup re-render (via submitComment -> refreshPopupContent)
            // replaces this content entirely once it resolves either way.
            commentButton.disabled = true;
            commentButton.textContent = "Posting…";
            submitCommentRef.current(property, commenterName, commentText);
          }
        };
        container.addEventListener("click", handleContainerClick);
        containerClickCleanupRef.current = () =>
          container.removeEventListener("click", handleContainerClick);

        setIsMapReady(true);
      })
      .catch((err) => {
        console.error("Failed to load Google Maps:", err);
      });

    return () => {
      cancelled = true;
      containerClickCleanupRef.current?.();
      markersRef.current.forEach((marker) => marker.setMap(null));
      markersRef.current.clear();
      infoWindowsRef.current.forEach((infoWindow) => infoWindow.close());
      infoWindowsRef.current.clear();
      pendingMarkerRef.current?.setMap(null);
      pendingMarkerRef.current = null;
      clusterMarkersRef.current.forEach((marker) => marker.setMap(null));
      clusterMarkersRef.current = [];
      if (mapRef.current) {
        google.maps.event.clearInstanceListeners(mapRef.current);
      }
      mapRef.current = null;
      setIsMapReady(false);
      setMapInstance(null);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Swap the cursor to a crosshair while the parent is waiting for a
  // location pick, so it's clear the next click sets the pin.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !isMapReady) return;
    map.setOptions({ draggableCursor: isPickingLocation ? "crosshair" : null });
  }, [isPickingLocation, isMapReady]);

  // Sync markers with the current (already filtered) property list —
  // further narrowed to only the ids the cluster API says should render
  // individually right now (listingIdsToShow); anything else is grouped
  // into a cluster circle or outside the current viewport (see the
  // clustering effect further below). listingIdsToShow === null means the
  // cluster API is unavailable — fall back to every property so listings
  // never silently vanish just because clustering failed.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !isMapReady) return;

    const markers = markersRef.current;
    const infoWindows = infoWindowsRef.current;
    const visibleProperties = listingIdsToShow
      ? properties.filter((p) => listingIdsToShow.has(p.id))
      : properties;
    const nextIds = new Set(visibleProperties.map((p) => p.id));

    // Remove markers that are no longer in the filtered set.
    markers.forEach((marker, id) => {
      if (!nextIds.has(id)) {
        marker.setMap(null);
        markers.delete(id);
        infoWindows.get(id)?.close();
        infoWindows.delete(id);
      }
    });

    // Add markers for newly visible properties. Existing markers are left
    // untouched so the map doesn't flicker on every filter change.
    visibleProperties.forEach((property) => {
      if (markers.has(property.id)) return;

      const position = { lat: property.latitude, lng: property.longitude };
      const element = buildListingChipElement(property);
      const overlay = createHtmlMarkerOverlay(map, position, element);
      fadeInChip(element);

      // `position` (not an `anchor`) since there's no classic Marker to
      // anchor to anymore — an HtmlMarkerOverlay isn't an MVCObject with
      // its own getPosition().
      const infoWindow = new google.maps.InfoWindow({
        position,
        content: buildPopupHtml(
          property,
          isAdminRef.current,
          commentsCacheRef.current.get(property.id),
          loadingCommentsRef.current.has(property.id)
        ),
      });

      element.addEventListener("click", () => {
        infoWindow.open({ map });
        loadComments(property);
      });

      markers.set(property.id, overlay);
      infoWindows.set(property.id, infoWindow);
    });
  }, [properties, listingIdsToShow, isMapReady]);

  // Render cluster-bubble (zoomed out) and price-range-pill (mid zoom)
  // chips from the latest cluster fetch. Unlike property markers (diffed
  // incrementally above, to preserve open popups etc.), these are
  // wholesale-cleared and rebuilt every time — per the "clear old markers
  // before rendering new ones" requirement, and because there's no
  // per-marker state worth preserving across a rebuild (neither chip has
  // a popup; nothing is keyed to one besides its own position/count/
  // range, all of which are exactly what's changing).
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !isMapReady) return;

    clusterMarkersRef.current.forEach((marker) => marker.setMap(null));
    // On error, listingIdsToShow's fallback already renders every property
    // individually (see above) — skip these entirely here rather than
    // drawing stale groups (results isn't reset on a failed fetch) on top
    // of/instead of those now-visible chips.
    clusterMarkersRef.current = (clustersError ? [] : clusterResults)
      .filter(
        (result): result is ClusterPoint | PriceRangePoint =>
          result.type === "cluster" || result.type === "price-range"
      )
      .map((result) => {
        const element =
          result.type === "cluster"
            ? buildClusterBubbleElement(result.count)
            : buildPriceRangeChipElement(result.minRent, result.maxRent, result.count);

        const overlay = createHtmlMarkerOverlay(map, { lat: result.lat, lng: result.lng }, element);
        fadeInChip(element);

        // Click a cluster or price-range chip: zoom in on it (smoothly —
        // bonus) and re-center; useClusters' bounds_changed/zoom_changed
        // listeners pick up the new viewport automatically and re-fetch,
        // breaking this group into smaller groups or individual listing
        // chips without any special-case code here.
        element.addEventListener("click", () => {
          const currentZoom = map.getZoom() ?? 11;
          map.panTo({ lat: result.lat, lng: result.lng });
          smoothZoomTo(map, Math.min(currentZoom + 2, 18));
        });

        return overlay;
      });
  }, [clusterResults, clustersError, isMapReady]);

  // Existing InfoWindows' content is only set once, at marker-creation
  // time (above) or when comments load/change (loadComments/submitComment
  // above), so it doesn't pick up admin sign-in/out on its own — this
  // refreshes every currently-tracked popup's content when isAdmin
  // changes, without touching marker positions/icons or rebuilding
  // anything.
  useEffect(() => {
    infoWindowsRef.current.forEach((infoWindow, id) => {
      const property = propertiesRef.current.find((p) => p.id === id);
      if (property) refreshPopupContent(property);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAdmin]);

  // Keep the single pending-location pin in sync: move it if the selection
  // changes, create it on first selection, remove it once cleared.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !isMapReady) return;

    if (!pendingLocation) {
      pendingMarkerRef.current?.setMap(null);
      pendingMarkerRef.current = null;
      return;
    }

    const position = { lat: pendingLocation.lat, lng: pendingLocation.lng };

    if (pendingMarkerRef.current) {
      pendingMarkerRef.current.setPosition(position);
    } else {
      // Indigo is used here specifically because it doesn't collide with
      // any of the semantic post-type colors, signaling "in progress"
      // rather than a committed post.
      pendingMarkerRef.current = new google.maps.Marker({
        position,
        map,
        icon: {
          path: google.maps.SymbolPath.CIRCLE,
          scale: 9,
          fillColor: "#4f46e5",
          fillOpacity: 1,
          strokeColor: "#ffffff",
          strokeWeight: 2,
        },
        zIndex: 999,
      });
    }
  }, [pendingLocation, isMapReady]);

  return <div ref={containerRef} className="absolute inset-0" />;
}
