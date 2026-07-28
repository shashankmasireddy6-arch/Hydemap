import {
  BHK,
  Furnishing,
  GatedSociety,
  GenderPreference,
  NewProperty,
  Occupants,
  PetsPreference,
  PostDuration,
  PostType,
} from "@/types/post";

const MS_PER_DAY = 24 * 60 * 60 * 1000;

export interface CreatePostFormState {
  type: PostType;
  title: string;
  price: string; // kept as string while editing, parsed on submit
  latitude: string;
  longitude: string;
  genderPreference: GenderPreference; // used when type === "Sharing"
  anonymous: boolean; // used when type === "Rent Paid"

  // How long the post stays active before it's excluded from listings.
  duration: PostDuration;

  // Flat details — required.
  bhk: BHK;
  monthlyRent: string;
  furnishing: Furnishing;
  gatedSociety: GatedSociety;

  // Flat details — optional.
  maintenanceIncluded: boolean;
  occupants: Occupants | "";
  deposit: string;
  pets: PetsPreference | "";
  parking: string;
  squareFootage: string;
  email: string; // never shown to other users, see NewProperty
  description: string;
}

export const DEFAULT_CREATE_POST_FORM: CreatePostFormState = {
  type: "Rent",
  title: "",
  price: "",
  latitude: "",
  longitude: "",
  genderPreference: "Any",
  anonymous: false,

  duration: 30,

  bhk: "1",
  monthlyRent: "",
  furnishing: "Furnished",
  gatedSociety: "Gated",

  maintenanceIncluded: false,
  occupants: "",
  deposit: "",
  pets: "",
  parking: "0",
  squareFootage: "",
  email: "",
  description: "",
};

export interface CreatePostResult {
  data?: NewProperty;
  error?: string;
}

/**
 * Parses an optional numeric field. Returns undefined for a blank input
 * (field left empty), a number for valid input, or NaN to signal an
 * invalid (non-blank, unparseable, or negative) value.
 */
function parseOptionalNonNegative(value: string): number | undefined {
  if (!value.trim()) return undefined;
  const parsed = Number(value);
  return Number.isNaN(parsed) || parsed < 0 ? NaN : parsed;
}

/**
 * Validates the raw (string-based) form state and converts it into the
 * fields Firestore needs to create a post (no `id` — Firestore assigns
 * that when the document is written). Kept out of the component so the
 * modal stays a thin view layer and the parsing rules are easy to reuse
 * or test.
 */
export function buildPropertyFromForm(form: CreatePostFormState): CreatePostResult {
  const title = form.title.trim();
  if (!title) {
    return { error: "Title is required." };
  }

  const price = Number(form.price);
  if (!form.price.trim() || Number.isNaN(price) || price < 0) {
    return { error: "Enter a valid price." };
  }

  const latitude = Number(form.latitude);
  const longitude = Number(form.longitude);
  const hasValidCoords =
    form.latitude.trim() !== "" &&
    form.longitude.trim() !== "" &&
    !Number.isNaN(latitude) &&
    !Number.isNaN(longitude) &&
    latitude >= -90 &&
    latitude <= 90 &&
    longitude >= -180 &&
    longitude <= 180;

  if (!hasValidCoords) {
    return { error: "Pick a location on the map or enter valid coordinates." };
  }

  const monthlyRent = Number(form.monthlyRent);
  if (!form.monthlyRent.trim() || Number.isNaN(monthlyRent) || monthlyRent < 0) {
    return { error: "Enter a valid monthly rent." };
  }

  const deposit = parseOptionalNonNegative(form.deposit);
  if (Number.isNaN(deposit)) {
    return { error: "Enter a valid deposit amount." };
  }

  const parking = parseOptionalNonNegative(form.parking) ?? 0;
  if (Number.isNaN(parking)) {
    return { error: "Enter a valid parking count." };
  }

  const squareFootage = parseOptionalNonNegative(form.squareFootage);
  if (Number.isNaN(squareFootage)) {
    return { error: "Enter a valid square footage." };
  }

  const email = form.email.trim();
  if (email && !email.includes("@")) {
    return { error: "Enter a valid email address." };
  }

  const description = form.description.trim();

  const data: NewProperty = {
    type: form.type,
    title,
    price,
    latitude,
    longitude,
    expiresAt: Date.now() + form.duration * MS_PER_DAY,
    bhk: form.bhk,
    monthlyRent,
    furnishing: form.furnishing,
    gatedSociety: form.gatedSociety,
    parking,
  };

  if (form.type === "Sharing") {
    data.genderPreference = form.genderPreference;
  }

  if (form.type === "Rent Paid") {
    data.anonymous = form.anonymous;
  }

  if (form.maintenanceIncluded) {
    data.maintenanceIncluded = true;
  }

  if (form.occupants) {
    data.occupants = form.occupants;
  }

  if (deposit !== undefined) {
    data.deposit = deposit;
  }

  if (form.pets) {
    data.pets = form.pets;
  }

  if (squareFootage !== undefined) {
    data.squareFootage = squareFootage;
  }

  if (email) {
    data.email = email;
  }

  if (description) {
    data.description = description;
  }

  return { data };
}
