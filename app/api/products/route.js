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

function extractPrice(text = '') {
  const cleaned = String(text)
    .replace(/,/g, '')
    .replace(/\s+/g, ' ');

  const patterns = [
    /\$\s*([0-9]+(?:\.[0-9]{1,2})?)/,
    /(?:price|from)\s*:?\s*\$?\s*([0-9]+(?:\.[0-9]{1,2})?)/i
  ];

  for (const pattern of patterns) {
    const match = cleaned.match(pattern);

    if (match) {
      const price = Number(match[1]);

      if (
        Number.isFinite(price) &&
        price > 0
      ) {
        return price;
      }
    }
  }

  return null;
}

function cleanTitle(title = '') {
  return String(title)
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

function makeId(
  supplier,
  link,
  index
) {
  return `${supplier}-${index}-${Buffer.from(
    link || String(index)
  )
    .toString('base64')
    .replace(/[^a-zA-Z0-9]/g, '')
    .slice(0, 18)}`;
}

async function searchSupplier(
  supplier,
  query
) {
  const searchQuery =
    `site:${supplier.domain} ${query}`;

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
        q: searchQuery,
        gl: 'au',
        hl: 'en',
        num: 10
      }),

      cache: 'no-store'
    }
  );

  if (!response.ok) {
    const message =
      await response.text();

    console.error(
      `Serper ${supplier.name} error:`,
      response.status,
      message
    );

    return [];
  }

  const data =
    await response.json();

  const organic =
    Array.isArray(data?.organic)
      ? data.organic
      : [];

  return organic
    .map((result, index) => {
      const title =
        cleanTitle(result?.title);

      const link =
        String(
          result?.link || ''
        );

      const snippet =
        String(
          result?.snippet || ''
        );

      const price =
        extractPrice(
          `${result?.title || ''} ${snippet}`
        );

      if (
        !title ||
        !link ||
        !price
      ) {
        return null;
      }

      if (
        !link
          .toLowerCase()
          .includes(
            supplier.domain
          )
      ) {
        return null;
      }

      return {
        id: makeId(
          supplier.name,
          link,
          index
        ),

        supplier:
          supplier.name,

        name: title,

        sku: 'Not listed',

        price,

        unit: 'each',

        url: link,

        description:
          snippet ||
          `Search result from ${supplier.name}.`,

        priceType: 'web',

        checkedAt:
          new Date().toISOString()
      };
    })
    .filter(Boolean);
}

export async function POST(request) {
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
      searches
        .flat()
        .sort(
          (a, b) =>
            a.price - b.price
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
          ? `${products.length} priced product options found.`
          : 'No supplier search results with a visible public web price were found.',

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
