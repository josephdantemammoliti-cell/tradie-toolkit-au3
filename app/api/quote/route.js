import {NextResponse} from 'next/server';

const MODEL = process.env.GEMINI_MODEL || 'gemini-3.8-flash';

function cleanItem(item, index) {
  const qty = Math.max(0, Number(item?.quantity) || 0);
  return {
    product: String(item?.material || item?.product || `Material ${index + 1}`),
    supplier: 'Supplier pricing not connected yet',
    sku: 'AI TAKE-OFF',
    unitPrice: 0,
    qty,
    total: 0,
    matchStatus: String(item?.specification || item?.notes || 'Material identified by AI — product/SKU still needs supplier matching'),
    category: String(item?.category || ''),
    unit: String(item?.unit || 'each'),
    needsConfirmation: Boolean(item?.needsConfirmation),
  };
}

export async function POST(req) {
  try {
    const body = await req.json();
    const description = String(body?.description || '').trim();
    if (!description) {
      return NextResponse.json({error:'Please describe the job first.'},{status:400});
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({error:'Gemini is not configured on the server. Add GEMINI_API_KEY in Railway Variables.'},{status:500});
    }

    const prompt = `You are the material take-off assistant for Tradie Toolkit AU, used by Australian tradespeople.

Trade: ${body.trade || 'General'}
Job description: ${description}
User quantity/area: ${body.quantity || ''}
Job suburb: ${body.suburb || ''}

Create a practical material take-off for this job. Use Australian trade terminology and metric measurements. Extract exact brands, sizes, colours, finishes and product types when the user supplies them. Do not invent brands, supplier SKUs, supplier prices or exact product models. If an important specification is missing, keep the material generic and set needsConfirmation=true. Include normal consumables only when they are reasonably required by the described work. Do not include labour.

Return JSON only, matching the supplied schema.`;
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function callGemini() {
  let lastResponse;

  for (let attempt = 1; attempt <= 3; attempt++) {
    lastResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(MODEL)}:generateContent`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': apiKey,
        },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.2,
            responseMimeType: 'application/json',
            responseJsonSchema: {
              type: 'object',
              properties: {
                summary: { type: 'string' },
                materials: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      material: { type: 'string' },
                      category: { type: 'string' },
                      quantity: { type: 'number' },
                      unit: { type: 'string' },
                      specification: { type: 'string' },
                      needsConfirmation: { type: 'boolean' }
                    },
                    required: [
                      'material',
                      'quantity',
                      'unit',
                      'specification',
                      'needsConfirmation'
                    ]
                  }
                },
                questions: {
                  type: 'array',
                  items: { type: 'string' }
                }
              },
              required: ['summary', 'materials', 'questions']
            }
          }
        })
      }
    );

    if (lastResponse.status !== 503 && lastResponse.status !== 429) {
      return lastResponse;
    }

    console.log(`Gemini busy - retry ${attempt}/3`);

    if (attempt < 3) {
      await sleep(attempt * 1500);
    }
  }

  return lastResponse;
}

const response = await callGemini();
   

    const data = await response.json();
    if (!response.ok) {
      console.error('Gemini API error', response.status, data);
      return NextResponse.json({error:'Gemini could not analyse this job right now. Check the Railway GEMINI_API_KEY and try again.'},{status:502});
    }

    const text = data?.candidates?.[0]?.content?.parts?.map(p=>p.text || '').join('') || '';
    let parsed;
    try { parsed = JSON.parse(text); }
    catch {
      console.error('Gemini returned invalid JSON', text);
      return NextResponse.json({error:'The AI response could not be read. Please try again.'},{status:502});
    }

    const items = Array.isArray(parsed.materials) ? parsed.materials.map(cleanItem) : [];
    return NextResponse.json({
      mode:'ai_takeoff',
      items,
      materialsTotal:0,
      summary: parsed.summary || '',
      questions: Array.isArray(parsed.questions) ? parsed.questions : [],
      message:'AI material take-off complete. Supplier pricing is not connected yet, so no material prices have been added to the customer quote.'
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json({error:'Something went wrong while building the material take-off.'},{status:500});
  }
}
