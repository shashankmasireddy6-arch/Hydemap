"use client";

import { useEffect, useRef, useState } from "react";
import { Loader } from "@googlemaps/js-api-loader";
import { LatLng, Property, getPostColor, HYDERABAD_CENTER } from "@/types/post";
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

// Classic Markers render their icon as a static image, outside the page's
// live DOM/CSS — so unlike the popup HTML below, this can't rely on
// Tailwind classes. It reuses the same icon path data as everywhere else,
// just wrapped in a plain `stroke="white"` attribute (SVG's own attribute
// inheritance still applies inside a standalone SVG image).
function buildMarkerIconUrl(property: Property): string {
  const color = getPostColor(property.type);
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="30" height="30" viewBox="0 0 30 30">
      <circle cx="15" cy="15" r="13" fill="${color}" stroke="white" stroke-width="2.2" />
      <g transform="translate(7.5,7.5) scale(0.625)" fill="none" stroke="white" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round">
        ${POST_TYPE_ICON_MARKUP[property.type]}
      </g>
    </svg>
  `.trim();
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}

// Types that carry a recurring monthly amount (see buildPropertyFromForm,
// which folds the user's input into `price` either way) vs. a one-time
// amount, purely to label the price line correctly.
const RECURRING_TYPES: Property["type"][] = ["Rent", "Sharing", "Rent Paid"];

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

// Modern card-style popup: colored top accent, icon + type label (+
// verified badge), title, price, an at-a-glance grid of every filled-in
// detail, description, and photo thumbnails. Google's own InfoWindow
// chrome (padding/shadow/tail/close button) is overridden in globals.css
// so this card reads as the whole popup.
function buildPopupHtml(property: Property, isAdmin: boolean): string {
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

  // Keyed by property id so filter changes only add/remove the markers
  // that actually entered or left the result set, instead of rebuilding
  // all of them on every keystroke/slider tick.
  const markersRef = useRef<Map<string, google.maps.Marker>>(new Map());
  const infoWindowsRef = useRef<Map<string, google.maps.InfoWindow>>(new Map());
  const pendingMarkerRef = useRef<google.maps.Marker | null>(null);

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
  // Holds the teardown for the delegated "Delete post" click listener, set
  // once the map (and its container div) exist.
  const containerClickCleanupRef = useRef<(() => void) | null>(null);

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
        onMapReadyRef.current?.(map);

        map.addListener("click", (e: google.maps.MapMouseEvent) => {
          if (!e.latLng) return;
          onMapClickRef.current?.(e.latLng.lng(), e.latLng.lat());
        });

        // Popup/info-window content is raw HTML (not React), so "Delete
        // post" clicks are caught via delegation on the map's container
        // rather than a per-window listener.
        const container = map.getDiv();
        const handleContainerClick = (e: MouseEvent) => {
          const button = (e.target as HTMLElement).closest<HTMLButtonElement>(".delete-post-btn");
          if (!button) return;
          const propertyId = button.dataset.propertyId;
          if (propertyId) onDeletePostRef.current?.(propertyId);
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
      if (mapRef.current) {
        google.maps.event.clearInstanceListeners(mapRef.current);
      }
      mapRef.current = null;
      setIsMapReady(false);
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

  // Sync markers with the current (already filtered) property list.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !isMapReady) return;

    const markers = markersRef.current;
    const infoWindows = infoWindowsRef.current;
    const nextIds = new Set(properties.map((p) => p.id));

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
    properties.forEach((property) => {
      if (markers.has(property.id)) return;

      const marker = new google.maps.Marker({
        position: { lat: property.latitude, lng: property.longitude },
        map,
        icon: {
          url: buildMarkerIconUrl(property),
          scaledSize: new google.maps.Size(30, 30),
          anchor: new google.maps.Point(15, 15),
        },
        title: property.title,
      });

      const infoWindow = new google.maps.InfoWindow({
        content: buildPopupHtml(property, isAdminRef.current),
      });

      marker.addListener("click", () => {
        infoWindow.open({ map, anchor: marker });
      });

      markers.set(property.id, marker);
      infoWindows.set(property.id, infoWindow);
    });
  }, [properties, isMapReady]);

  // Existing InfoWindows' content is only set once, at marker-creation
  // time (above), so it doesn't pick up admin sign-in/out on its own —
  // this refreshes every currently-tracked popup's content when isAdmin
  // changes, without touching marker positions/icons or rebuilding
  // anything.
  useEffect(() => {
    infoWindowsRef.current.forEach((infoWindow, id) => {
      const property = propertiesRef.current.find((p) => p.id === id);
      if (property) infoWindow.setContent(buildPopupHtml(property, isAdmin));
    });
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
