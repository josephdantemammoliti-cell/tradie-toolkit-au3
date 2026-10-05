import { normalizeSupplierResults } from "./normalize";

export async function searchMitre10({ query, location }) {
  if (!query) return [];

  // Waiting for authorised Mitre 10 catalogue/API/price-feed access.
  // Do not use search-engine snippet prices.

  console.log("Mitre 10 search requested:", {
    query,
    location,
  });

  return normalizeSupplierResults([]);
}
