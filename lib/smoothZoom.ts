const ZOOM_STEP_MS = 120;

// The Maps JS API has no built-in tween for setZoom (it jumps instantly),
// so this steps one level at a time on a short interval — the standard
// workaround for a "smooth" zoom transition. Shared by SearchBar (zoom to
// a searched location) and MapView (zoom into a clicked cluster).
export function smoothZoomTo(map: google.maps.Map, targetZoom: number) {
  const currentZoom = map.getZoom();
  if (currentZoom === undefined || currentZoom === targetZoom) return;

  const nextZoom = currentZoom + (currentZoom < targetZoom ? 1 : -1);
  map.setZoom(nextZoom);
  if (nextZoom !== targetZoom) {
    window.setTimeout(() => smoothZoomTo(map, targetZoom), ZOOM_STEP_MS);
  }
}
