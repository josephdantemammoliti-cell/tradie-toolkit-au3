import { normalizeSupplierResults } from "./normalize";

export async function searchBunnings({ query, location }) {
  if (!query) return [];

  // SAFE MODE:
  // Do not use Serper/Google snippets, AI-generated prices,
  // scraped prices, or sandbox/mock prices for customer quotes.
  //
  // This connector will be activated when Bunnings LIVE
  // Item, Pricing, Inventory and Location APIs are approved.

  console.log("Bunnings search requested:", {
    query,
    location,
  });

  return normalizeSupplierResults([]);
}
