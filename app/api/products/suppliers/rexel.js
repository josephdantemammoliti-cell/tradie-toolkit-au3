import { normalizeSupplierResults } from "./normalize";

export async function searchRexel({ query, location }) {
  if (!query) return [];

  // SAFE MODE:
  // Only return pricing once an authorised Rexel
  // catalogue / account pricing source is connected.
  //
  // Never use AI-generated or search-engine snippet
  // prices for customer quotes.

  console.log("Rexel search requested:", {
    query,
    location,
  });

  return normalizeSupplierResults([]);
}
