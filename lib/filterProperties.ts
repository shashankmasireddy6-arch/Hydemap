import { PostType, Property } from "@/types/post";

export interface PriceRange {
  min: number;
  max: number;
}

export interface PropertyFilters {
  type: PostType | "All";
  price: PriceRange;
}

/**
 * Filters a property list by post type and price range.
 * Pure and side-effect free so it can be reused (page, tests, future
 * server-side filtering) and safely memoized with useMemo.
 */
export function filterProperties(
  properties: Property[],
  filters: PropertyFilters
): Property[] {
  const { type, price } = filters;

  return properties.filter((property) => {
    const matchesType = type === "All" || property.type === type;
    const matchesPrice = property.price >= price.min && property.price <= price.max;
    return matchesType && matchesPrice;
  });
}
