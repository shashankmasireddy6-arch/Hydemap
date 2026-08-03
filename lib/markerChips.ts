import { Property } from "@/types/post";
import { formatCurrency } from "@/lib/format";

// Density-based color/size bands for the cluster bubble — carried over
// from the original two-tier clustering feature's "color by density"
// touch: bigger, redder clusters draw the eye toward denser areas.
function clusterSizing(count: number): { color: string; size: number; fontSize: string } {
  if (count <= 5) return { color: "#818cf8", size: 34, fontSize: "12px" }; // indigo-300
  if (count <= 20) return { color: "#4f46e5", size: 40, fontSize: "13px" }; // indigo-600
  return { color: "#e11d48", size: 46, fontSize: "14px" }; // rose-600
}

// Wraps a chip's visible content in a positioning layer. Two elements,
// not one, because CSS only honors a single `transform` declaration per
// element — the outer wrapper's inline `transform` anchors the chip to
// its map point (set once here, never touched again; htmlMarkerOverlay
// only ever sets left/top, not transform) so it has to live separately
// from hover scaling, which has to live on the *inner* element's own
// `transform` (via the hover:scale-* Tailwind class below), or the two
// would fight over the same property and the inline one would always
// win, silently no-op-ing the hover effect. Fade-in (opacity) has no such
// conflict, so it lives on the outer wrapper as a single, simple toggle
// point (see fadeInChip) that doesn't care which inner content it wraps.
function wrapPositioned(inner: HTMLElement, anchorTransform: string): HTMLDivElement {
  const wrapper = document.createElement("div");
  wrapper.className = "opacity-0 transition-opacity duration-200 ease-out";
  wrapper.style.position = "absolute";
  wrapper.style.transform = anchorTransform;
  wrapper.appendChild(inner);
  return wrapper;
}

const CHIP_INNER_BASE =
  "chip-marker cursor-pointer select-none shadow-panel transition-transform duration-150 ease-out";

/** Zoomed out: a plain circular bubble with just the count. */
export function buildClusterBubbleElement(count: number): HTMLDivElement {
  const { color, size, fontSize } = clusterSizing(count);
  const inner = document.createElement("div");
  inner.className = `${CHIP_INNER_BASE} hover:scale-110 flex items-center justify-center rounded-full border-2 border-white font-bold text-white`;
  inner.style.width = `${size}px`;
  inner.style.height = `${size}px`;
  inner.style.fontSize = fontSize;
  inner.style.backgroundColor = color;
  inner.title = `${count} flat${count === 1 ? "" : "s"}`;
  inner.textContent = String(count);
  return wrapPositioned(inner, "translate(-50%, -50%)");
}

/** Mid zoom: a rounded pill showing the rent range instead of a bare count. */
export function buildPriceRangeChipElement(
  minRent: number,
  maxRent: number,
  count: number
): HTMLDivElement {
  const inner = document.createElement("div");
  inner.className = `${CHIP_INNER_BASE} hover:scale-105 flex flex-col items-center rounded-full border border-slate-200 bg-gradient-to-b from-white to-indigo-50 px-3 py-1.5 leading-tight`;
  inner.title = `${count} flat${count === 1 ? "" : "s"}`;
  inner.innerHTML = `
    <span class="whitespace-nowrap text-xs font-bold text-indigo-700">${formatCurrency(minRent)} – ${formatCurrency(maxRent)}</span>
    <span class="whitespace-nowrap text-[10px] font-medium text-slate-500">${count} flat${count === 1 ? "" : "s"}</span>
  `;
  return wrapPositioned(inner, "translate(-50%, -50%)");
}

/**
 * Zoomed in: a detailed preview chip for a single listing — price most
 * prominent, BHK/furnishing smaller below, per the spec. No rating line:
 * `Property` has no `rating` field and nothing in this app writes one (a
 * self-reported star rating on your own listing wouldn't mean anything
 * without a reviewer/tenant identity system), so this intentionally
 * doesn't fabricate one rather than inventing fake data.
 *
 * Clicking the chip is wired up by the caller (MapView), not here — it
 * opens the existing rich InfoWindow popup (photos, comments, delete),
 * unchanged from before this marker system existed.
 */
export function buildListingChipElement(property: Property): HTMLDivElement {
  const details = [property.bhk ? `${property.bhk} BHK` : null, property.furnishing]
    .filter(Boolean)
    .join(" • ");

  const inner = document.createElement("div");
  inner.className = `${CHIP_INNER_BASE} hover:scale-105 flex flex-col items-center gap-0.5 rounded-2xl border border-slate-100 bg-white px-3 py-1.5 leading-tight`;
  inner.title = property.title;
  inner.innerHTML = `
    <span class="whitespace-nowrap text-sm font-bold text-slate-900">${formatCurrency(property.price)}</span>
    ${details ? `<span class="whitespace-nowrap text-[11px] text-slate-500">${details}</span>` : ""}
  `;

  const caret = document.createElement("div");
  caret.className = "mx-auto h-2 w-2 rotate-45 border-b border-r border-slate-100 bg-white";
  caret.style.marginTop = "-5px";
  inner.appendChild(caret);

  // Anchored above its map point (like a pin's tip), not centered on it —
  // the caret above points down at the actual location.
  return wrapPositioned(inner, "translate(-50%, calc(-100% - 8px))");
}

/** Flips a freshly-created chip from opacity-0 to visible a frame after
 * it's attached to the map, so the fade-in transition has something to
 * animate from instead of just appearing instantly. */
export function fadeInChip(el: HTMLElement): void {
  requestAnimationFrame(() => {
    el.classList.remove("opacity-0");
  });
}
