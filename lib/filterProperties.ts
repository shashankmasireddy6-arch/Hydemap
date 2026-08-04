import { PostType, Property } from "@/types/post";
import { isNearAnyMetroStation } from "@/lib/nearMetro";

export interface PriceRange {
  min: number;
  max: number;
}

export interface PropertyFilters {
  type: PostType | "All";
  price: PriceRange;
  // Distance in km to filter to properties near any metro station;
  // null/undefined means the filter is off entirely (not "0km").
  nearMetroKm?: number | null;
}

/**
 * Filters a property list by post type, price range, and (optionally)
 * proximity to any metro station. Pure and side-effect free so it can be
 * reused (page, tests, future server-side filtering) and safely memoized
 * with useMemo.
 */
export function filterProperties(
  properties: Property[],
  filters: PropertyFilters
): Property[] {
  const { type, price, nearMetroKm } = filters;

  return properties.filter((property) => {
    const matchesType = type === "All" || property.type === type;
    const matchesPrice = property.price >= price.min && property.price <= price.max;
    const matchesMetro =
      nearMetroKm == null ||
      isNearAnyMetroStation({ lat: property.latitude, lng: property.longitude }, nearMetroKm);
    return matchesType && matchesPrice && matchesMetro;
  });
}
