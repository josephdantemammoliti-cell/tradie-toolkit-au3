import { normalizeSupplierResults } from "./normalize";

export async function searchBowens({ query, location }) {
  if (!query) return [];

  // Waiting for authorised Bowens catalogue/pricing integration.

  console.log("Bowens search requested:", {
    query,
    location,
  });

  return normalizeSupplierResults([]);
}
