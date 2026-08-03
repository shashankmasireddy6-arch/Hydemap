// A grid cell with more than one listing in it — rendered as a circular
// marker showing the count, not individual pins.
export interface ClusterPoint {
  type: "cluster";
  lat: number; // centroid (average) of the listings in this cell
  lng: number;
  count: number;
}

// A grid cell with exactly one listing (or any point once zoom > 16, where
// clustering is bypassed entirely) — rendered as a normal pin. Only the id
// and position travel over the wire; MapView already has the full
// Property data client-side (it's loaded once via fetchPosts) and looks
// it up by id, so the rich popup (photos, comments, delete button, ...)
// keeps working unchanged.
export interface ListingPoint {
  type: "listing";
  lat: number;
  lng: number;
  id: string;
}

export type ClusterResult = ClusterPoint | ListingPoint;

export interface MapBounds {
  north: number;
  south: number;
  east: number;
  west: number;
}
