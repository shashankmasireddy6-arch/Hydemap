// A grid cell with more than one listing in it, at low zoom — rendered as
// a circular bubble marker showing just the count.
export interface ClusterPoint {
  type: "cluster";
  lat: number; // centroid (average) of the listings in this cell
  lng: number;
  count: number;
}

// A grid cell with more than one listing in it, at mid zoom — rendered as
// a rounded price-range pill instead of a bare count, since at this zoom
// there's enough screen space to be useful without being individual pins
// yet. minRent/maxRent are the min/max `price` (see Property — `price`
// and `monthlyRent` are always written equal, see createPostForm.ts) among
// the listings in this cell.
export interface PriceRangePoint {
  type: "price-range";
  lat: number;
  lng: number;
  count: number;
  minRent: number;
  maxRent: number;
}

// A grid cell with exactly one listing (at any zoom — see clusterGrid.ts's
// singleton-bucket handling) or any point once zoom is past the
// price-range band, where clustering is bypassed entirely — rendered as a
// detailed preview chip. Only the id and position travel over the wire;
// MapView already has the full Property data client-side (it's loaded
// once via fetchPosts) and looks it up by id for the chip's price/BHK/
// furnishing text, so the rich popup (photos, comments, delete button,
// ...) keeps working unchanged on click.
export interface ListingPoint {
  type: "listing";
  lat: number;
  lng: number;
  id: string;
}

export type ClusterResult = ClusterPoint | PriceRangePoint | ListingPoint;

export interface MapBounds {
  north: number;
  south: number;
  east: number;
  west: number;
}
