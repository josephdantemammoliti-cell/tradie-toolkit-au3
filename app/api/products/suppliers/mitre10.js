import { normalizeSupplierResults } from "./normalize";

const MITRE10_BASE = "https://www.mitre10.com.au";

function clean(value = "") {
  return String(value)
    .replace(/<[^>]*>/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

function extractJsonLd(html) {
  const blocks = [];

  const regex =
    /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;

  let match;

  while ((match = regex.exec(html)) !== null) {
    try {
      const parsed = JSON.parse(match[1]);
      blocks.push(parsed);
    } catch {
      // Ignore malformed JSON-LD.
    }
  }

  return blocks.flatMap((block) =>
    Array.isArray(block) ? block : [block]
  );
}

function findProductJsonLd(blocks) {
  for (const block of blocks) {
    if (!block) continue;

    if (block["@type"] === "Product") {
      return block;
    }

    if (Array.isArray(block["@graph"])) {
      const product = block["@graph"].find(
        (item) => item?.["@type"] === "Product"
      );

      if (product) return product;
    }
  }

  return null;
}

function extractPrice(product) {
  const offers = Array.isArray(product?.offers)
    ? product.offers
    : product?.offers
      ? [product.offers]
      : [];

  for (const offer of offers) {
    const price = Number(offer?.price);

    if (
      Number.isFinite(price) &&
      price > 0 &&
      String(offer?.priceCurrency || "AUD").toUpperCase() === "AUD"
    ) {
      return price;
    }
  }

  return null;
}

function extractSku(product) {
  return clean(
    product?.sku ||
    product?.mpn ||
    ""
  );
}

function extractBrand(product) {
  if (typeof product?.brand === "string") {
    return clean(product.brand);
  }

  return clean(product?.brand?.name || "");
}

async function verifyMitre10Product(url) {
  if (
    !url ||
    !url.startsWith(`${MITRE10_BASE}/`)
  ) {
    return null;
  }

  const response = await fetch(url, {
    headers: {
      Accept: "text/html",
      "User-Agent":
        "Mozilla/5.0 TradieToolkitAU/1.0",
    },
    cache: "no-store",
  });

  if (!response.ok) {
    return null;
  }

  const html = await response.text();

  const blocks = extractJsonLd(html);
  const product = findProductJsonLd(blocks);

  if (!product) {
    return null;
  }

  const price = extractPrice(product);
  const sku = extractSku(product);

  return {
    supplier: "Mitre 10",

    product: clean(product?.name || ""),

    sku,

    description: clean(product?.description || ""),

    brand: extractBrand(product),

    unitPrice: price,

    unit: "each",

    url,

    checkedAt: new Date().toISOString(),

    /*
     * IMPORTANT:
     *
     * A price from the actual Mitre 10 product page is
     * substantially safer than a Google/search snippet.
     *
     * However Mitre 10 states pricing can vary by store
     * and online.
     *
     * Until we have reliable location/store selection,
     * we identify the web price but DO NOT automatically
     * make it quoteable.
     */

    priceVerified: false,

    priceSource: price
      ? "Mitre 10 product page — web price"
      : "",

    priceType: price ? "web" : null,

    quoteable: false,

    matchStatus: price
      ? "Product page verified. Web price found but location/store pricing is not yet verified."
      : "Product page verified. No reliable web price found.",
  };
}

export async function searchMitre10({
  query,
  location,
  productUrls = [],
}) {
  if (!query) return [];

  /*
   * NEXT STAGE:
   *
   * Gemini/product discovery will provide genuine
   * mitre10.com.au product URLs here.
   *
   * This function then independently verifies each
   * actual product page.
   *
   * Gemini NEVER supplies the price.
   */

  const urls = Array.isArray(productUrls)
    ? productUrls
        .filter(
          (url) =>
            typeof url === "string" &&
            url.startsWith(`${MITRE10_BASE}/`)
        )
        .slice(0, 10)
    : [];

  if (!urls.length) {
    return [];
  }

  const results = await Promise.allSettled(
    urls.map(verifyMitre10Product)
  );

  const products = results
    .filter(
      (result) =>
        result.status === "fulfilled" &&
        result.value
    )
    .map((result) => result.value);

  console.log("Mitre 10 verified products:", {
    query,
    location,
    products: products.length,
  });

  return normalizeSupplierResults(products);
}
