export type PostType =
  | "Rent"
  | "Sale"
  | "Sharing"
  | "Rent Paid";

export type GenderPreference = "Male" | "Female" | "Any";

export type BHK = "1" | "2" | "3" | "4" | "5+";
export type Furnishing = "Furnished" | "Unfurnished";
export type GatedSociety = "Gated" | "Not Gated";
export type Occupants = "Family" | "Bachelor";
export type PetsPreference = "Yes" | "No" | "Not sure";

// How long a post stays active before it's excluded from fetchPosts().
export type PostDuration = 7 | 15 | 30;

// A raw lat/lng captured from a map click, before it's attached to a post.
export interface LatLng {
  lat: number;
  lng: number;
}

// Shape of each entry in data/properties.json, plus optional fields that
// only apply to certain post types (set when a post is created via the
// Create Post modal). The flat-detail and expiresAt fields are optional
// here (rather than required) so older Firestore documents and the local
// demo data — neither of which has them — still satisfy the type; new
// posts always populate them (see NewProperty below).
export interface Property {
  id: string;
  type: PostType;
  price: number;
  latitude: number;
  longitude: number;
  title: string;
  genderPreference?: GenderPreference; // "Sharing" posts only
  anonymous?: boolean; // "Rent Paid" posts only
  expiresAt?: number; // epoch ms; posts without one never expire
  bhk?: BHK;
  monthlyRent?: number;
  furnishing?: Furnishing;
  gatedSociety?: GatedSociety;
  maintenanceIncluded?: boolean;
  occupants?: Occupants;
  deposit?: number;
  pets?: PetsPreference;
  parking?: number;
  squareFootage?: number;
  description?: string;
  // Download URLs for photos uploaded to Firebase Storage. A post with at
  // least one photo is treated as "verified" in the UI.
  photoUrls?: string[];
  // Soft-delete flag (see lib/postsService.ts#softDeletePost) — posts are
  // never hard-deleted, just marked "deleted" and filtered out of
  // fetchPosts(). Missing/undefined is treated as "active" for backward
  // compatibility with documents written before this field existed.
  status?: "active" | "deleted";
}

// Fields for a post that hasn't been saved yet — Firestore assigns the id
// when the document is created. expiresAt and the required flat-detail
// fields must always be set on creation (unlike on Property, where they're
// optional to accommodate older/legacy documents). `email` is write-only —
// it's stored in Firestore but deliberately isn't part of Property, so it's
// never read back into the app for other users to see.
export type NewProperty = Omit<
  Property,
  "id" | "expiresAt" | "bhk" | "monthlyRent" | "furnishing" | "gatedSociety" | "parking"
> & {
  expiresAt: number;
  bhk: BHK;
  monthlyRent: number;
  furnishing: Furnishing;
  gatedSociety: GatedSociety;
  parking: number;
  email?: string;
};

export interface PostTypeConfig {
  label: PostType;
  color: string; // hex, drives both the map marker and the legend dot
}

// Single source of truth for post-type colors, used by the map markers,
// the legend, and the filter dropdown so they never fall out of sync.
export const POST_TYPE_CONFIG: PostTypeConfig[] = [
  { label: "Rent", color: "#22c55e" },
  { label: "Sale", color: "#3b82f6" },
  { label: "Sharing", color: "#eab308" },
  { label: "Rent Paid", color: "#a855f7" },
];

export const getPostColor = (type: PostType): string =>
  POST_TYPE_CONFIG.find((c) => c.label === type)?.color ?? "#64748b";

// Hyderabad, India
export const HYDERABAD_CENTER: [number, number] = [78.4867, 17.385];
