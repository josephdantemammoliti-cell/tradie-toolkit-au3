import { normalizeSupplierResults } from "./normalize";

export async function searchReece({ query, location }) {
  if (!query) return [];

  // Waiting for authorised Reece API/integration access.
  // Customer-specific pricing must be verified before quote use.

  console.log("Reece search requested:", {
    query,
    location,
  });

  return normalizeSupplierResults([]);
}
