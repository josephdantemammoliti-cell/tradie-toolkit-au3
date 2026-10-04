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

function cleanText(value = '') {
  return String(value)
    .replace(/\s+/g, ' ')
    .trim();
}

function cleanTitle(title = '') {
  return cleanText(title)
    .replace(/\s*\|\s*Bunnings.*$/i, '')
    .replace(/\s*\|\s*Mitre\s*10.*$/i, '')
    .replace(/\s*\|\s*Bowens.*$/i, '')
    .replace(/\s*\|\s*Reece.*$/i, '')
    .replace(/\s*-\s*Bunnings.*$/i, '')
    .replace(/\s*-\s*Mitre\s*10.*$/i, '')
    .replace(/\s*-\s*Bowens.*$/i, '')
    .replace(/\s*-\s*Reece.*$/i, '')
    .trim();
}

function normaliseUrl(url = '') {
  try {
    const parsed = new URL(url);

    parsed.hash = '';

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

function isBadPage(title = '', url = '', snippet = '') {
  const text =
    `${title} ${url} ${snippet}`.toLowerCase();

  const badPhrases = [
    'how to',
    'how-to',
    'buying guide',
    'project guide',
    'diy advice',
    'ideas & advice',
    'ideas and advice',
    'inspiration',
    'shop our range',
    'browse our range',
    'view our range',
    'range of ',
    'search results',
    'catalogue',
    'catalog ',
    'all products',
    'products |',
    'products -'
  ];

  const badUrlParts = [
    '/search',
    '/category',
    '/categories',
    '/blog',
    '/advice',
    '/ideas',
    '/inspiration',
    '/how-to',
    '/howto'
  ];

  if (
    badPhrases.some(phrase =>
      text.includes(phrase)
    )
  ) {
    return true;
  }

  if (
    badUrlParts.some(part =>
      url.toLowerCase().includes(part)
    )
  ) {
    return true;
  }

  return false;
}

function looksLikeBunningsProduct(url = '') {
  // Individual Bunnings product URLs commonly
  // end with an item code such as _p0123456.
  return /_p\d+/i.test(url);
}

function looksLikeIndividualProduct(
  supplier,
  result
) {
  const title =
    cleanTitle(result?.title || '');

  const url =
    normaliseUrl(result?.link || '');

  const snippet =
    cleanText(result?.snippet || '');

  if (!title || !url) {
    return false;
  }

  if (
    !url
      .toLowerCase()
      .includes(
        supplier.domain
      )
  ) {
    return false;
  }

  if (
    isBadPage(
      title,
      url,
      snippet
    )
  ) {
    return false;
  }

  if (
    supplier.name === 'Bunnings'
  ) {
    return looksLikeBunningsProduct(
      url
    );
  }

  return true;
}

function getPrices(text = '') {
  const cleaned =
    cleanText(text)
      .replace(/,/g, '');

  const matches = [
    ...cleaned.matchAll(
      /\$\s*([0-9]+(?:\.[0-9]{1,2})?)/g
    )
  ];

  return matches
    .map(match =>
      Number(match[1])
    )
    .filter(
      price =>
        Number.isFinite(price) &&
        price > 0 &&
        price < 100000
    );
}

function choosePrice(result) {
  /*
    Prefer a price appearing in the title.

    If the title has no price, only use the
    snippet when there is exactly ONE dollar
    amount.

    This prevents the old problem where a
    category page containing "$17.98,
    $19.98, $29.98..." accidentally became
    a $17 product.
  */

  const titlePrices =
    getPrices(
      result?.title || ''
    );

  if (
    titlePrices.length === 1
  ) {
    return titlePrices[0];
  }

  const snippetPrices =
    getPrices(
      result?.snippet || ''
    );

  if (
    snippetPrices.length === 1
  ) {
    return snippetPrices[0];
  }

  return null;
}

function getSkuFromBunningsUrl(
  url = ''
) {
  const match =
    url.match(
      /_p(\d+)/i
    );

  if (!match) {
    return 'Not listed';
  }

  return `P${match[1]}`;
}

function getSku(
  supplier,
  url
) {
  if (
    supplier === 'Bunnings'
  ) {
    return getSkuFromBunningsUrl(
      url
    );
  }

  return 'Not listed';
}

function makeId(
  supplier,
  url
) {
  return `${supplier}-${url}`
    .replace(
      /[^a-zA-Z0-9]/g,
      ''
    )
    .slice(0, 100);
}

async function searchSerper(
  q
) {
  const response =
    await fetch(
      'https://google.serper.dev/search',
      {
        method: 'POST',

        headers: {
          'X-API-KEY':
            process.env
              .SERPER_API_KEY,

          'Content-Type':
            'application/json'
        },

        body: JSON.stringify({
          q,
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

    return null;
  }

  return response.json();
}

async function searchSupplier(
  supplier,
  query
) {
  /*
    These search phrases deliberately push
    Google toward individual product pages.
  */

  const searches =
    supplier.name === 'Bunnings'
      ? [
          `site:bunnings.com.au "${query}" _p`,
          `site:bunnings.com.au ${query} price`
        ]
      : [
          `site:${supplier.domain} "${query}" price`,
          `site:${supplier.domain} ${query} product`
        ];

  const results = [];
  const seen = new Set();

  for (const searchQuery of searches) {
    const data =
      await searchSerper(
        searchQuery
      );

    if (!data) {
      continue;
    }

    const organic =
      Array.isArray(data.organic)
        ? data.organic
        : [];

    for (const result of organic) {
      if (
        !looksLikeIndividualProduct(
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

      const price =
        choosePrice(result);

      /*
        Don't show a selectable product unless
        Serper gave us one unambiguous price.
      */
      if (!price) {
        continue;
      }

      const name =
        cleanTitle(
          result.title
        );

      if (!name) {
        continue;
      }

      seen.add(url);

      results.push({
        id: makeId(
          supplier.name,
          url
        ),

        supplier:
          supplier.name,

        name,

        sku: getSku(
          supplier.name,
          url
        ),

        price,

        unit: 'each',

        url,

        description:
          cleanText(
            result.snippet || ''
          ).slice(0, 300),

        priceType:
          'search-result',

        checkedAt:
          new Date().toISOString()
      });

      if (
        results.length >= 5
      ) {
        break;
      }
    }

    if (
      results.length >= 3
    ) {
      break;
    }
  }

  return results;
}

function dedupeProducts(
  products
) {
  const seen =
    new Set();

  return products.filter(
    product => {
      const key =
        product.url;

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
      cleanText(
        body?.query || ''
      );

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

    const searches =
      await Promise.all(
        SUPPLIERS.map(
          supplier =>
            searchSupplier(
              supplier,
              query
            )
        )
      );

    const products =
      dedupeProducts(
        searches.flat()
      )
        .sort(
          (a, b) =>
            a.price -
            b.price
        )
        .slice(0, 16);

    return NextResponse.json({
      query,

      products,

      searchedSuppliers:
        SUPPLIERS.map(
          supplier =>
            supplier.name
        ),

      message:
        products.length > 0
          ? `${products.length} individual product options found.`
          : 'No individual supplier products with an unambiguous public price were found.',

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
