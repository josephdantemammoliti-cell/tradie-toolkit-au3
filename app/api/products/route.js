import { NextResponse } from 'next/server';

const MODEL = process.env.GEMINI_MODEL || 'gemini-3.8-flash';

function cleanJson(text = '') {
  return text
    .replace(/```json/gi, '')
    .replace(/```/g, '')
    .trim();
}

function validSupplier(name = '') {
  const value = name.toLowerCase();

  if (value.includes('bunnings')) return 'Bunnings';
  if (value.includes('mitre 10') || value.includes('mitre10')) return 'Mitre 10';
  if (value.includes('bowens')) return 'Bowens';
  if (value.includes('reece')) return 'Reece';

  return null;
}

function cleanProduct(product) {
  const supplier = validSupplier(product?.supplier);

  if (!supplier) return null;

  const price = Number(product?.price);

  if (!Number.isFinite(price) || price <= 0) {
    return null;
  }

  return {
    id: String(
      product?.id ||
        `${supplier}-${product?.sku || product?.name || Math.random()}`
    ),

    supplier,

    name: String(product?.name || 'Product'),

    sku: String(
      product?.sku ||
        product?.itemNumber ||
        'Not listed'
    ),

    price,

    unit: String(
      product?.unit || 'each'
    ),

    url: String(
      product?.url || ''
    ),

    description: String(
      product?.description || ''
    ),

    priceType: 'web',

    checkedAt: new Date().toISOString()
  };
}

export async function POST(request) {
  try {
    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json(
        {
          error:
            'GEMINI_API_KEY is not configured.'
        },
        {
          status: 500
        }
      );
    }

    const body = await request.json();

    const query = String(
      body?.query || ''
    ).trim();

    const suburb = String(
      body?.suburb || ''
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

    const prompt = `
You are finding real building and trade products for an Australian tradie.

PRODUCT NEEDED:
${query}

JOB LOCATION:
${suburb || 'Australia'}

Search the current public websites/catalogues of ONLY these suppliers:

- Bunnings Australia
- Mitre 10 Australia
- Bowens
- Reece Australia

Find suitable products that genuinely match the requested material.

IMPORTANT RULES:

1. Search the web. Do not answer only from memory.

2. Return actual products you found from the allowed suppliers.

3. Do NOT invent:
- product names
- prices
- SKUs
- item numbers
- URLs
- specifications

4. A product must have a visible public web price to be included.

5. If a price cannot be confirmed, do not include that product.

6. Prefer Australian product pages.

7. Match the requested dimensions, material, type, rating and specification as closely as possible.

8. If the request is generic, such as:
"internal door"
"passage handle"
"double power point"
then return several suitable varieties where possible.

9. If the request contains an exact size or specification, prioritise products matching it.

10. Do not substitute a materially different size or product.

11. Prices must be numbers only.
Example:
87.50
not:
"$87.50"

12. unit should describe how the displayed price is sold, for example:
"each"
"length"
"sheet"
"pack"

13. Include the real supplier product URL when it is available from the search result.

14. Return a maximum of 12 useful products total.

15. Only use these supplier names exactly:
"Bunnings"
"Mitre 10"
"Bowens"
"Reece"

Return ONLY valid JSON in this exact shape:

{
  "products": [
    {
      "supplier": "Bunnings",
      "name": "Product name",
      "sku": "supplier item number if confirmed",
      "price": 87.50,
      "unit": "each",
      "url": "https://...",
      "description": "Short description of why this product matches"
    }
  ]
}

If no products with confirmed public prices can be found, return:

{
  "products": []
}
`;

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(
        MODEL
      )}:generateContent`,
      {
        method: 'POST',

        headers: {
          'Content-Type':
            'application/json',

          'x-goog-api-key':
            process.env.GEMINI_API_KEY
        },

        body: JSON.stringify({
          contents: [
            {
              role: 'user',

              parts: [
                {
                  text: prompt
                }
              ]
            }
          ],

          tools: [
            {
              google_search: {}
            }
          ],

          generationConfig: {
            temperature: 0.1,
            maxOutputTokens: 4096
          }
        })
      }
    );

    const data =
      await response.json();

    if (!response.ok) {
      console.error(
        'Gemini product search error:',
        data
      );

      return NextResponse.json(
        {
          error:
            data?.error?.message ||
            'Product search failed.'
        },
        {
          status: response.status
        }
      );
    }

    const text =
      data?.candidates?.[0]
        ?.content?.parts
        ?.map(part => part?.text || '')
        .join('') || '';

    if (!text) {
      return NextResponse.json({
        query,
        products: [],
        message:
          'No confirmed supplier products were returned.'
      });
    }

    let parsed;

    try {
      parsed = JSON.parse(
        cleanJson(text)
      );
    } catch (error) {
      console.error(
        'Could not parse product JSON:',
        text
      );

      return NextResponse.json(
        {
          error:
            'The supplier search returned an invalid response. Please try again.'
        },
        {
          status: 502
        }
      );
    }

    const products =
      Array.isArray(parsed?.products)
        ? parsed.products
            .map(cleanProduct)
            .filter(Boolean)
        : [];

    return NextResponse.json({
      query,

      products,

      message:
        products.length > 0
          ? `${products.length} product option${
              products.length === 1
                ? ''
                : 's'
            } found.`
          : 'No products with a confirmed public web price were found.',

      searchedSuppliers: [
        'Bunnings',
        'Mitre 10',
        'Bowens',
        'Reece'
      ],

      priceType: 'web',

      checkedAt:
        new Date().toISOString()
    });
  } catch (error) {
    console.error(
      'Product route error:',
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
