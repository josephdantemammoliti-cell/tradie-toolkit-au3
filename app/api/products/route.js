import { NextResponse } from 'next/server';

const TOKEN_URL =
  'https://connect.sandbox.api.bunnings.com.au/connect/token';

const ITEM_BASE_URL =
  'https://item.sandbox.api.bunnings.com.au/item';

const PRICING_BASE_URL =
  'https://pricing.sandbox.api.bunnings.com.au/pricing';

// Sandbox location used while developing.
// Later we will replace this with the actual Bunnings location selected
// from the customer's suburb/store.
const DEFAULT_LOCATION = '7040';

function clean(value = '') {
  return String(value).replace(/\s+/g, ' ').trim();
}

async function getBunningsToken() {
  const consumerKey = process.env.BUNNINGS_CONSUMER_KEY;
  const consumerSecret = process.env.BUNNINGS_CONSUMER_SECRET;

  if (!consumerKey || !consumerSecret) {
    throw new Error(
      'Bunnings credentials are missing from Railway environment variables.'
    );
  }

  const basicAuth = Buffer.from(
    `${consumerKey}:${consumerSecret}`
  ).toString('base64');

  const body = new URLSearchParams({
    grant_type: 'client_credentials',
    scope: 'itm:details pri:pub',
  });

  const response = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${basicAuth}`,
      'Content-Type': 'application/x-www-form-urlencoded',
      Accept: 'application/json',
    },
    body: body.toString(),
    cache: 'no-store',
  });

  const text = await response.text();

  if (!response.ok) {
    console.error('Bunnings OAuth error:', response.status, text);

    throw new Error(
      `Bunnings authentication failed (${response.status}).`
    );
  }

  let data;

  try {
    data = JSON.parse(text);
  } catch {
    throw new Error('Bunnings authentication returned invalid JSON.');
  }

  if (!data.access_token) {
    throw new Error('Bunnings authentication did not return an access token.');
  }

  return data.access_token;
}

async function searchBunnings(query, token) {
  const response = await fetch(`${ITEM_BASE_URL}/search/AU`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
      'x-version-api': '1.3',
    },
    body: JSON.stringify({
      query,
      filters: {
        locationCode: DEFAULT_LOCATION,
        availableInStoreAllProducts: {
          allProducts: false,
          inStoreToday: false,
        },
      },
      sortBy: 'relevancy',
    }),
    cache: 'no-store',
  });

  const text = await response.text();

  if (!response.ok) {
    console.error('Bunnings Item Query error:', response.status, text);

    throw new Error(
      `Bunnings product search failed (${response.status}).`
    );
  }

  try {
    return JSON.parse(text);
  } catch {
    throw new Error('Bunnings product search returned invalid JSON.');
  }
}

async function getBunningsPrices(itemNumbers, token) {
  if (!itemNumbers.length) {
    return new Map();
  }

  const response = await fetch(
    `${PRICING_BASE_URL}/catalog/prices`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        Accept: 'application/json',
        'x-version-api': '1.0',
      },
      body: JSON.stringify({
        context: {
          country: 'AU',
          location: DEFAULT_LOCATION,
        },
        items: itemNumbers.map((itemNumber) => ({
          itemNumber,
        })),
      }),
      cache: 'no-store',
    }
  );

  const text = await response.text();

  if (!response.ok) {
    console.error('Bunnings Pricing error:', response.status, text);

    throw new Error(
      `Bunnings pricing request failed (${response.status}).`
    );
  }

  let data;

  try {
    data = JSON.parse(text);
  } catch {
    throw new Error('Bunnings pricing returned invalid JSON.');
  }

  const priceMap = new Map();

  for (const price of data?.prices || []) {
    if (!price?.itemNumber) continue;

    const unitPrice = Number(price.unitPrice);

    if (!Number.isFinite(unitPrice)) continue;

    priceMap.set(String(price.itemNumber), {
      unitPrice,
      lineUnitPrice: Number(price.lineUnitPrice),
      priceId: price.priceId || null,
    });
  }

  return priceMap;
}

function normaliseSearchResults(data) {
  const results = Array.isArray(data?.results)
    ? data.results
    : [];

  return results
    .map((item) => {
      const itemNumber =
        item?.itemNumber ||
        item?._meta?.itemNumber ||
        '';

      return {
        itemNumber: clean(itemNumber),
        title: clean(
          item?.title ||
          item?.description ||
          ''
        ),
      };
    })
    .filter(
      (item) =>
        /^\d{7}$/.test(item.itemNumber) &&
        item.title
    );
}

function buildBunningsUrl(item) {
  // We do not invent a Bunnings product URL.
  // A proper product URL can be added later if the Item API supplies one.
  return null;
}

export async function POST(request) {
  try {
    const body = await request.json();

    const query = clean(body?.query);
    const suburb = clean(body?.suburb);

    if (!query) {
      return NextResponse.json(
        {
          error: 'A product search query is required.',
          products: [],
        },
        { status: 400 }
      );
    }

    const token = await getBunningsToken();

    const searchData = await searchBunnings(
      query,
      token
    );

    const searchResults =
      normaliseSearchResults(searchData).slice(0, 10);

    if (!searchResults.length) {
      return NextResponse.json({
        products: [],
        source: 'Bunnings official API',
        environment: 'sandbox',
        query,
        suburb,
        message:
          'Bunnings returned no matching products for this search.',
      });
    }

    const itemNumbers = searchResults.map(
      (item) => item.itemNumber
    );

    const prices = await getBunningsPrices(
      itemNumbers,
      token
    );

    const checkedAt = new Date().toISOString();

    const products = searchResults.map((item) => {
      const pricing = prices.get(item.itemNumber);

      const verified =
        pricing &&
        Number.isFinite(pricing.unitPrice);

      return {
        supplier: 'Bunnings',
        name: item.title,
        sku: item.itemNumber,

        // Only an official Pricing API response becomes a price.
        price: verified
          ? pricing.unitPrice
          : null,

        unit: 'each',

        description: verified
          ? `Official Bunnings sandbox price for item ${item.itemNumber}.`
          : 'Price not verified — cannot add to quote.',

        url: buildBunningsUrl(item),

        checkedAt,

        priceVerified: Boolean(verified),

        priceSource: verified
          ? 'Bunnings Pricing API'
          : null,

        priceId: verified
          ? pricing.priceId
          : null,

        environment: 'sandbox',

        matchStatus:
          'Matched through Bunnings Item Query API',
      };
    });

    // Products with a verified official price first.
    products.sort((a, b) => {
      return Number(b.priceVerified) -
        Number(a.priceVerified);
    });

    return NextResponse.json({
      products,
      source: 'Bunnings official API',
      environment: 'sandbox',
      query,
      suburb,
      locationCode: DEFAULT_LOCATION,
      checkedAt,
    });
  } catch (error) {
    console.error('Product API error:', error);

    return NextResponse.json(
      {
        error:
          error?.message ||
          'Unable to search Bunnings products.',
        products: [],
      },
      { status: 500 }
    );
  }
}
