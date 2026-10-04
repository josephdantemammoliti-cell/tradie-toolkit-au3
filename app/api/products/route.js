import { NextResponse } from 'next/server';

const SUPPLIERS = [
  {
    name: 'Bunnings',
    domain: 'bunnings.com.au'
  },
  {
    name: 'Mitre 10',
    domain: 'mitre10.com.au'
  },
  {
    name: 'Bowens',
    domain: 'bowens.com.au'
  },
  {
    name: 'Reece',
    domain: 'reece.com.au'
  }
];

function normaliseUrl(url = '') {
  try {
    const parsed = new URL(url);

    parsed.hash = '';

    // Remove common tracking parameters.
    [
      'utm_source',
      'utm_medium',
      'utm_campaign',
      'utm_term',
      'utm_content',
      'gclid'
    ].forEach(key =>
      parsed.searchParams.delete(key)
    );

    return parsed.toString();
  } catch {
    return '';
  }
}

function decodeHtml(value = '') {
  return String(value)
    .replace(/&quot;/g, '"')
    .replace(/&#34;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ');
}

function stripHtml(value = '') {
  return decodeHtml(
    String(value).replace(/<[^>]*>/g, ' ')
  )
    .replace(/\s+/g, ' ')
    .trim();
}

function isProbablyNonProductPage(
  title = '',
  url = ''
) {
  const text =
    `${title} ${url}`.toLowerCase();

  const badTerms = [
    'how to',
    'how-to',
    'guide',
    'advice',
    'ideas',
    'inspiration',
    'blog',
    '/blog/',
    '/category/',
    '/categories/',
    '/search/',
    '/search?',
    'search results',
    'buying guide',
    'project guide',
    'diy advice',
    'catalogue',
    'catalog/',
    'range of ',
    'shop our range'
  ];

  return badTerms.some(term =>
    text.includes(term)
  );
}

function isLikelyBunningsProduct(url = '') {
  return /_p\d+/i.test(url);
}

function isLikelyProductResult(
  supplier,
  result
) {
  const title =
    String(result?.title || '');

  const link =
    normaliseUrl(result?.link || '');

  if (!title || !link) {
    return false;
  }

  if (
    !link
      .toLowerCase()
      .includes(supplier.domain)
  ) {
    return false;
  }

  if (
    isProbablyNonProductPage(
      title,
      link
    )
  ) {
    return false;
  }

  // Bunnings individual product URLs normally
  // contain an item number such as _p0123456.
  if (
    supplier.name === 'Bunnings'
  ) {
    return isLikelyBunningsProduct(
      link
    );
  }

  return true;
}

async function serperSearch(
  query
) {
  const response = await fetch(
    'https://google.serper.dev/search',
    {
      method: 'POST',

      headers: {
        'X-API-KEY':
          process.env.SERPER_API_KEY,

        'Content-Type':
          'application/json'
      },

      body: JSON.stringify({
        q: query,
        gl: 'au',
        hl: 'en',
        num: 10
      }),

      cache: 'no-store'
    }
  );

  if (!response.ok) {
    const body =
      await response.text();

    console.error(
      'Serper error:',
      response.status,
      body
    );

    throw new Error(
      `Serper returned ${response.status}`
    );
  }

  return response.json();
}

async function discoverProductUrls(
  supplier,
  query
) {
  const searches = [
    `site:${supplier.domain} "${query}" product`,
    `site:${supplier.domain} ${query}`
  ];

  const urls = [];
  const seen = new Set();

  for (const search of searches) {
    let data;

    try {
      data =
        await serperSearch(search);
    } catch (error) {
      console.error(
        `${supplier.name} discovery failed:`,
        error
      );

      continue;
    }

    const organic =
      Array.isArray(data?.organic)
        ? data.organic
        : [];

    for (const result of organic) {
      if (
        !isLikelyProductResult(
          supplier,
          result
        )
      ) {
        continue;
      }

      const url =
        normaliseUrl(
          result.link
        );

      if (
        !url ||
        seen.has(url)
      ) {
        continue;
      }

      seen.add(url);

      urls.push({
        supplier:
          supplier.name,

        url,

        searchTitle:
          String(
            result.title || ''
          ),

        searchSnippet:
          String(
            result.snippet || ''
          )
      });

      // Don't hammer supplier sites.
      // A few candidate pages per supplier
      // is enough for the product picker.
      if (urls.length >= 5) {
        break;
      }
    }

    if (urls.length >= 3) {
      break;
    }
  }

  return urls;
}

function findJsonLdBlocks(
  html = ''
) {
  const blocks = [];

  const regex =
    /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;

  let match;

  while (
    (match = regex.exec(html))
  ) {
    const raw =
      decodeHtml(
        match[1] || ''
      ).trim();

    if (!raw) continue;

    try {
      blocks.push(
        JSON.parse(raw)
      );
    } catch {
      // Some websites output malformed JSON-LD.
      // Ignore it rather than inventing data.
    }
  }

  return blocks;
}

function collectObjects(
  value,
  output = []
) {
  if (!value) {
    return output;
  }

  if (Array.isArray(value)) {
    value.forEach(item =>
      collectObjects(
        item,
        output
      )
    );

    return output;
  }

  if (
    typeof value === 'object'
  ) {
    output.push(value);

    if (
      Array.isArray(value['@graph'])
    ) {
      collectObjects(
        value['@graph'],
        output
      );
    }

    for (
      const child of
      Object.values(value)
    ) {
      if (
        child &&
        typeof child === 'object'
      ) {
        collectObjects(
          child,
          output
        );
      }
    }
  }

  return output;
}

function isProductSchema(
  object
) {
  const type =
    object?.['@type'];

  if (Array.isArray(type)) {
    return type.some(
      x =>
        String(x).toLowerCase() ===
        'product'
    );
  }

  return (
    String(type || '')
      .toLowerCase() ===
    'product'
  );
}

function getOfferObjects(
  offers
) {
  if (!offers) {
    return [];
  }

  if (Array.isArray(offers)) {
    return offers;
  }

  if (
    typeof offers === 'object'
  ) {
    return [offers];
  }

  return [];
}

function getPriceFromOffer(
  offer
) {
  if (!offer) {
    return null;
  }

  const candidates = [
    offer.price,
    offer.lowPrice,
    offer.highPrice,

    offer?.priceSpecification
      ?.price
  ];

  for (const candidate of candidates) {
    const price =
      Number(
        String(
          candidate ?? ''
        )
          .replace(/[^0-9.]/g, '')
      );

    if (
      Number.isFinite(price) &&
      price > 0
    ) {
      return price;
    }
  }

  return null;
}

function getPriceFromProduct(
  product
) {
  const offers =
    getOfferObjects(
      product?.offers
    );

  for (const offer of offers) {
    const price =
      getPriceFromOffer(
        offer
      );

    if (price) {
      return price;
    }
  }

  return null;
}

function getSku(product) {
  return String(
    product?.sku ||
      product?.mpn ||
      product?.productID ||
      'Not listed'
  ).trim();
}

function getDescription(
  product
) {
  return stripHtml(
    product?.description ||
      ''
  ).slice(0, 300);
}

function getUnit(
  product
) {
  const text =
    `${product?.name || ''} ${
      product?.description || ''
    }`.toLowerCase();

  if (
    text.includes(
      'per linear metre'
    ) ||
    text.includes('/lm')
  ) {
    return 'linear metre';
  }

  if (
    text.includes(
      'per metre'
    ) ||
    text.includes('/m')
  ) {
    return 'metre';
  }

  if (
    text.includes(
      'per sheet'
    )
  ) {
    return 'sheet';
  }

  if (
    text.includes(
      'per pack'
    )
  ) {
    return 'pack';
  }

  if (
    text.includes(
      'per box'
    ) ||
    text.includes('/bx')
  ) {
    return 'box';
  }

  return 'each';
}

function makeId(
  supplier,
  sku,
  url
) {
  const safe =
    `${supplier}-${sku}-${url}`
      .replace(
        /[^a-zA-Z0-9]/g,
        ''
      )
      .slice(0, 90);

  return safe ||
    `${supplier}-${Date.now()}`;
}

function productFromJsonLd(
  supplier,
  url,
  html
) {
  const blocks =
    findJsonLdBlocks(html);

  const objects = [];

  blocks.forEach(block =>
    collectObjects(
      block,
      objects
    )
  );

  const products =
    objects.filter(
      isProductSchema
    );

  for (const product of products) {
    const name =
      stripHtml(
        product?.name || ''
      );

    const price =
      getPriceFromProduct(
        product
      );

    if (
      !name ||
      !price
    ) {
      continue;
    }

    const sku =
      getSku(product);

    return {
      id: makeId(
        supplier,
        sku,
        url
      ),

      supplier,

      name,

      sku,

      price,

      unit:
        getUnit(product),

      url,

      description:
        getDescription(product),

      priceType:
        'verified-page',

      checkedAt:
        new Date().toISOString()
    };
  }

  return null;
}

function getMetaContent(
  html,
  property
) {
  const escaped =
    property.replace(
      /[.*+?^${}()|[\]\\]/g,
      '\\$&'
    );

  const patterns = [
    new RegExp(
      `<meta[^>]+property=["']${escaped}["'][^>]+content=["']([^"']+)["'][^>]*>`,
      'i'
    ),

    new RegExp(
      `<meta[^>]+content=["']([^"']+)["'][^>]+property=["']${escaped}["'][^>]*>`,
      'i'
    ),

    new RegExp(
      `<meta[^>]+name=["']${escaped}["'][^>]+content=["']([^"']+)["'][^>]*>`,
      'i'
    ),

    new RegExp(
      `<meta[^>]+content=["']([^"']+)["'][^>]+name=["']${escaped}["'][^>]*>`,
      'i'
    )
  ];

  for (const pattern of patterns) {
    const match =
      html.match(pattern);

    if (match?.[1]) {
      return decodeHtml(
        match[1]
      ).trim();
    }
  }

  return '';
}

function productFromMeta(
  supplier,
  url,
  html
) {
  const name =
    getMetaContent(
      html,
      'og:title'
    );

  const rawPrice =
    getMetaContent(
      html,
      'product:price:amount'
    ) ||
    getMetaContent(
      html,
      'og:price:amount'
    );

  const price =
    Number(
      String(rawPrice)
        .replace(
          /[^0-9.]/g,
          ''
        )
    );

  if (
    !name ||
    !Number.isFinite(price) ||
    price <= 0
  ) {
    return null;
  }

  const description =
    getMetaContent(
      html,
      'description'
    ) ||
    getMetaContent(
      html,
      'og:description'
    );

  return {
    id: makeId(
      supplier,
      'meta',
      url
    ),

    supplier,

    name:
      stripHtml(name),

    sku:
      'Not listed',

    price,

    unit:
      'each',

    url,

    description:
      stripHtml(
        description
      ).slice(0, 300),

    priceType:
      'verified-page',

    checkedAt:
      new Date().toISOString()
  };
}

async function verifyProductPage(
  candidate
) {
  try {
    const response =
      await fetch(
        candidate.url,
        {
          headers: {
            'User-Agent':
              'Mozilla/5.0 (compatible; TradieToolkitAU/1.0)',

            Accept:
              'text/html,application/xhtml+xml'
          },

          cache: 'no-store',

          signal:
            AbortSignal.timeout(
              8000
            )
        }
      );

    if (!response.ok) {
      return null;
    }

    const contentType =
      response.headers.get(
        'content-type'
      ) || '';

    if (
      !contentType.includes(
        'text/html'
      )
    ) {
      return null;
    }

    const html =
      await response.text();

    if (
      !html ||
      html.length < 500
    ) {
      return null;
    }

    // First preference:
    // actual Product structured data.
    const structured =
      productFromJsonLd(
        candidate.supplier,
        candidate.url,
        html
      );

    if (structured) {
      return structured;
    }

    // Second preference:
    // explicit product price meta tags.
    const meta =
      productFromMeta(
        candidate.supplier,
        candidate.url,
        html
      );

    if (meta) {
      return meta;
    }

    // Important:
    // We deliberately DO NOT extract
    // random "$XX" text from the page.
    return null;
  } catch (error) {
    console.error(
      'Product verification failed:',
      candidate.url,
      error?.message
    );

    return null;
  }
}

function dedupeProducts(
  products
) {
  const seen =
    new Set();

  return products.filter(
    product => {
      const key =
        `${product.supplier}|${product.url}`;

      if (
        seen.has(key)
      ) {
        return false;
      }

      seen.add(key);

      return true;
    }
  );
}

export async function POST(
  request
) {
  try {
    if (
      !process.env
        .SERPER_API_KEY
    ) {
      return NextResponse.json(
        {
          error:
            'SERPER_API_KEY is not configured in Railway.'
        },
        {
          status: 500
        }
      );
    }

    const body =
      await request.json();

    const query =
      String(
        body?.query || ''
      ).trim();

    if (!query) {
      return NextResponse.json(
        {
          error:
            'A product search query is required.'
        },
        {
          status: 400
        }
      );
    }

    /*
      STEP 1:
      Use Serper only to discover
      likely individual supplier
      product pages.
    */

    const discovery =
      await Promise.all(
        SUPPLIERS.map(
          supplier =>
            discoverProductUrls(
              supplier,
              query
            )
        )
      );

    const candidates =
      discovery
        .flat()
        .slice(0, 16);

    /*
      STEP 2:
      Visit those pages and verify
      actual product structured data.

      Search snippets are NOT used
      as the price.
    */

    const verified =
      await Promise.all(
        candidates.map(
          candidate =>
            verifyProductPage(
              candidate
            )
        )
      );

    const products =
      dedupeProducts(
        verified.filter(Boolean)
      )
        .sort(
          (a, b) =>
            a.price -
            b.price
        )
        .slice(0, 12);

    return NextResponse.json({
      query,

      products,

      searchedSuppliers:
        SUPPLIERS.map(
          supplier =>
            supplier.name
        ),

      candidatesChecked:
        candidates.length,

      verifiedProducts:
        products.length,

      message:
        products.length > 0
          ? `${products.length} verified product options found.`
          : 'Product pages were searched, but no individual products with a verifiable public price were found.',

      checkedAt:
        new Date().toISOString()
    });
  } catch (error) {
    console.error(
      'Product search error:',
      error
    );

    return NextResponse.json(
      {
        error:
          'Could not search supplier products.'
      },
      {
        status: 500
      }
    );
  }
}
