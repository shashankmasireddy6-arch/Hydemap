// A small google.maps.OverlayView wrapper for rendering a real DOM/CSS
// element as a map marker, instead of classic google.maps.Marker — needed
// because cluster bubbles, price-range pills, and listing chips are all
// genuine HTML (rounded corners, gradients, two differently-sized lines
// of text, hover transitions), which a classic Marker can't render at
// all — it only ever displays a single flat icon image.
//
// Defined as a factory rather than a top-level `class ... extends
// google.maps.OverlayView` because `google` doesn't exist yet at module
// import time — this file is imported before the Google Maps JS script
// has finished loading (see MapView.tsx's Loader usage). The class body
// is only evaluated the first time createHtmlMarkerOverlay runs, which is
// always from inside an effect that fires after the map (and therefore
// `google.maps`) is ready.
export type HtmlMarkerOverlay = google.maps.OverlayView & { element: HTMLElement };

type OverlayCtor = new (
  map: google.maps.Map,
  position: google.maps.LatLngLiteral,
  element: HTMLElement
) => HtmlMarkerOverlay;

let OverlayClass: OverlayCtor | undefined;

function getOverlayClass(): OverlayCtor {
  if (!OverlayClass) {
    OverlayClass = class extends google.maps.OverlayView {
      element: HTMLElement;
      private position: google.maps.LatLngLiteral;

      constructor(map: google.maps.Map, position: google.maps.LatLngLiteral, element: HTMLElement) {
        super();
        this.position = position;
        this.element = element;
        this.element.style.position = "absolute";
        this.setMap(map);
      }

      onAdd() {
        // overlayMouseTarget (not floatPane) so the element actually
        // receives click/hover events — floatPane sits visually above
        // overlayMouseTarget and would otherwise swallow them.
        this.getPanes()?.overlayMouseTarget.appendChild(this.element);
      }

      draw() {
        const projection = this.getProjection();
        if (!projection) return;
        const point = projection.fromLatLngToDivPixel(
          new google.maps.LatLng(this.position.lat, this.position.lng)
        );
        if (!point) return;
        // Positions the element's own top-left at the map point; callers
        // center/anchor it via their own CSS transform (translate(-50%,
        // -50%) or similar) rather than this class computing an offset
        // from element size, since each marker type anchors differently
        // (a cluster bubble centers on its point, a listing chip's little
        // pointer-tail anchors from the bottom).
        this.element.style.left = `${point.x}px`;
        this.element.style.top = `${point.y}px`;
      }

      onRemove() {
        this.element.parentNode?.removeChild(this.element);
      }
    } as OverlayCtor;
  }
  return OverlayClass;
}

export function createHtmlMarkerOverlay(
  map: google.maps.Map,
  position: google.maps.LatLngLiteral,
  element: HTMLElement
): HtmlMarkerOverlay {
  const Ctor = getOverlayClass();
  return new Ctor(map, position, element);
}
