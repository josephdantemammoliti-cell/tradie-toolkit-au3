import { NextResponse } from "next/server";

import { searchBunnings } from "./suppliers/bunnings";
import { searchReece } from "./suppliers/reece";
import { searchMitre10 } from "./suppliers/mitre10";
import { searchBowens } from "./suppliers/bowens";
import { searchRexel } from "./suppliers/rexel";

function clean(value = "") {
  return String(value).replace(/\s+/g, " ").trim();
}

const suppliers = [
  {
    name: "Bunnings",
    search: searchBunnings,
  },
  {
    name: "Reece",
    search: searchReece,
  },
  {
    name: "Mitre 10",
    search: searchMitre10,
  },
  {
    name: "Bowens",
    search: searchBowens,
  },
  {
    name: "Rexel",
    search: searchRexel,
  },
];

export async function POST(request) {
  try {
    const body = await request.json();

    const query = clean(body?.query);
    const suburb = clean(body?.suburb);

    if (!query) {
      return NextResponse.json(
        {
          error: "A product search query is required.",
          products: [],
        },
        { status: 400 }
      );
    }

    const results = await Promise.allSettled(
      suppliers.map(async (supplier) => {
        const products = await supplier.search({
          query,
          location: suburb,
        });

        return {
          supplier: supplier.name,
          products: Array.isArray(products)
            ? products
            : [],
        };
      })
    );

    const products = [];
    const supplierStatus = [];

    results.forEach((result, index) => {
      const supplierName = suppliers[index].name;

      if (result.status === "fulfilled") {
        const supplierProducts =
          result.value?.products || [];

        products.push(...supplierProducts);

        supplierStatus.push({
          supplier: supplierName,
          status: "ok",
          results: supplierProducts.length,
        });
      } else {
        console.error(
          `${supplierName} supplier error:`,
          result.reason
        );

        supplierStatus.push({
          supplier: supplierName,
          status: "error",
          results: 0,
        });
      }
    });

    // Verified/quoteable products always appear first.
    products.sort((a, b) => {
      const aQuoteable = a.quoteable ? 1 : 0;
      const bQuoteable = b.quoteable ? 1 : 0;

      if (aQuoteable !== bQuoteable) {
        return bQuoteable - aQuoteable;
      }

      const aVerified = a.priceVerified ? 1 : 0;
      const bVerified = b.priceVerified ? 1 : 0;

      return bVerified - aVerified;
    });

    return NextResponse.json({
      products,
      query,
      suburb,

      suppliers: supplierStatus,

      checkedAt: new Date().toISOString(),

      pricingPolicy:
        "Only verified supplier prices may be added to a customer quote.",
    });
  } catch (error) {
    console.error("Product API error:", error);

    return NextResponse.json(
      {
        error:
          error?.message ||
          "Unable to search supplier products.",
        products: [],
      },
      { status: 500 }
    );
  }
}
