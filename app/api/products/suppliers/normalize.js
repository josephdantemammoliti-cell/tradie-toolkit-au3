export function normalizeSupplierProduct(product = {}) {
  const price = Number(product.unitPrice ?? product.price ?? 0);
  const verified = Boolean(product.priceVerified);

  return {
    supplier: String(product.supplier || "Unknown Supplier"),
    product: String(product.product || product.name || "Unknown Product"),
    sku: String(product.sku || product.itemNumber || ""),
    description: String(product.description || ""),

    unitPrice: Number.isFinite(price) ? price : 0,
    unit: String(product.unit || "each"),

    priceVerified: verified,
    priceSource: String(product.priceSource || ""),
    checkedAt: product.checkedAt || null,

    stock: product.stock ?? null,
    location: product.location ?? null,

    url: product.url || null,
    image: product.image || null,

    // Only verified supplier prices are allowed into quote calculations.
    quoteable: verified && Number.isFinite(price) && price > 0,
  };
}

export function normalizeSupplierResults(products = []) {
  if (!Array.isArray(products)) return [];

  return products
    .map(normalizeSupplierProduct)
    .filter((product) => product.product !== "Unknown Product");
}
