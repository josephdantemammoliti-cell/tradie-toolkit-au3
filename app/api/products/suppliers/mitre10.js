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
  if (!url) return null;

  let parsedUrl;

  try {
    parsedUrl = new URL(url);
  } catch {
    console.log("Mitre 10 rejected invalid URL:", url);
    return null;
  }

  const hostname = parsedUrl.hostname
    .toLowerCase()
    .replace(/^www\./, "");

  if (hostname !== "mitre10.com.au") {
    console.log("Mitre 10 rejected hostname:", {
      url,
      hostname,
    });
    return null;
  }

  console.log("Mitre 10 fetching product page:", url);

  const response = await fetch(url, {{
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
console.log("Mitre 10 page fetch:", {
  url,
  status: response.status,
  htmlLength: html.length,
  hasJsonLd: html.includes("application/ld+json"),
  hasProductText: html.includes('"Product"'),
  title:
    html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1]
      ?.replace(/\s+/g, " ")
      .trim() || null,
});
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
async function discoverMitre10Urls(query) {
  const apiKey = process.env.SERPER_API_KEY;

  if (!apiKey) {
    console.error("SERPER_API_KEY is missing.");
    return [];
  }

  const response = await fetch(
    "https://google.serper.dev/search",
    {
      method: "POST",
      headers: {
        "X-API-KEY": apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        q: `site:mitre10.com.au ${query}`,
        gl: "au",
        hl: "en",
        num: 10,
      }),
      cache: "no-store",
    }
  );

  if (!response.ok) {
    console.error(
      "Mitre 10 discovery failed:",
      response.status
    );
    return [];
  }

  const data = await response.json();

  const urls = (data?.organic || [])
    .map((result) => result?.link)
    .filter((url) => {
  if (typeof url !== "string") return false;

  try {
    const hostname = new URL(url).hostname
      .toLowerCase()
      .replace(/^www\./, "");

    return hostname === "mitre10.com.au";
  } catch {
    return false;
  }
});

  return [...new Set(urls)].slice(0, 10);
}
export async function searchMitre10({
  query,
  location,
}) {
  if (!query) return [];

  /*
   * Serper is used ONLY to discover genuine
   * mitre10.com.au product URLs.
   *
   * Search snippets and Google prices are NEVER
   * accepted as supplier pricing.
   */

  const urls = await discoverMitre10Urls(query);

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
        result.value &&
        result.value.product &&
        result.value.sku
    )
    .map((result) => result.value);

  console.log("Mitre 10 verified products:", {
    query,
    location,
    discoveredUrls: urls.length,
    verifiedProducts: products.length,
  });

  return normalizeSupplierResults(products);
}
