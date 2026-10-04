'use client';

import './globals.css';
import { useMemo, useState } from 'react';

const trades = [
  'Carpentry',
  'Plastering',
  'Decking',
  'Painting',
  'Tiling',
  'Flooring',
  'Fencing',
  'Roofing',
  'Bricklaying & Masonry',
  'Concreting',
  'Landscaping',
  'Plumbing',
  'Electrical',
  'Cabinetry & Joinery',
  'Windows & Doors',
  'Demolition',
  'General Handyman',
  'Other / General materials'
];

const money = n =>
  new Intl.NumberFormat('en-AU', {
    style: 'currency',
    currency: 'AUD'
  }).format(Number(n) || 0);

const tradeHelp = {
  Carpentry:
    'Describe the carpentry work. Include quantities, dimensions, door or window sizes, timber sizes and lengths, sheet materials, hardware and any materials you already know are required.',

  Plastering:
    'Describe the plastering work. Include wall or ceiling dimensions, sheet type or thickness, number of rooms or areas, cornice and any other materials you know are required.',

  Decking:
    'Describe the deck work. Include length and width, height, decking material if known, board sizes, stairs, handrails and any framing details you know.',

  Painting:
    'Describe what needs painting. Include room or area dimensions, walls, ceilings or exterior areas, surface type, number of coats and paint type if known.',

  Tiling:
    'Describe the tiling work. Include floor or wall dimensions, tile size and type if known, waterproofing, grout, adhesive and trims where required.',

  Flooring:
    'Describe the flooring work. Include room or floor dimensions, flooring type, board or plank size if known, underlay, trims and any floor preparation required.',

  Fencing:
    'Describe the fencing work. Include total length, fence height, material or fence type, gates, sleepers and any other requirements.',

  Roofing:
    'Describe the roofing work. Include roof dimensions or area, roofing material, sheets or tiles, flashings, gutters, downpipes and insulation where required.',

  'Bricklaying & Masonry':
    'Describe the brick or masonry work. Include wall length and height, brick or block type and size if known, openings, piers, lintels and reinforcement.',

  Concreting:
    'Describe the concreting work. Include length, width and thickness, concrete type or strength if known, reinforcement, formwork and required finish.',

  Landscaping:
    'Describe the landscaping work. Include area dimensions, soil or mulch depths, turf, plants, edging, retaining walls, drainage and paving where required.',

  Plumbing:
    'Describe the plumbing work. Include pipe type and size, approximate lengths, fittings, fixtures, connection sizes, valves, wastes and quantities where known.',

  Electrical:
    'Describe the electrical work. Include quantities of power points, switches, lights or circuits, cable requirements, sizes or ratings and any specific products where known.',

  'Cabinetry & Joinery':
    'Describe the cabinetry or joinery work. Include cabinet dimensions and quantities, sheet material, doors, drawers, benchtops, hinges, handles and hardware.',

  'Windows & Doors':
    'Describe the window or door work. Include quantities, dimensions, internal or external use, handles, locks, hinges, stops and any materials you know are required.',

  Demolition:
    'Describe what needs to be removed. Include dimensions or quantities, material types, fixtures being removed and any disposal requirements.',

  'General Handyman':
    'Describe the work being completed. Include quantities, dimensions, materials, replacement parts, fixings and anything else you know is required.',

  'Other / General materials':
    'Describe the work in detail. Include quantities, measurements, sizes, material types, fittings, fixings and any products you already know are required.'
};

function supplierSearches(searchQuery) {
  const q = encodeURIComponent(searchQuery || '');

  return [
    {
      name: 'Bunnings',
      url: `https://www.bunnings.com.au/search/products?q=${q}`
    },
    {
      name: 'Mitre 10',
      url: `https://www.mitre10.com.au/?q=${q}`
    },
    {
      name: 'Bowens',
      url: `https://www.bowens.com.au/search/?page=1&query=${q}`
    },
    {
      name: 'Reece',
      url: `https://www.reece.com.au/search/index.html?q=${q}`
    }
  ];
}

function ProductFinder({ item }) {
  const [open, setOpen] = useState(false);

  const query = item.searchQuery || item.product || '';

  return (
    <div style={{ marginTop: 12 }}>
      <button
        type="button"
        className="btn"
        style={{ width: '100%' }}
        onClick={() => setOpen(v => !v)}
      >
        {open ? 'Hide Product Options' : 'Find Product Options'}
      </button>

      {open && (
        <div className="hint" style={{ marginTop: 10 }}>
          <b>Search supplier catalogues</b>

          <div style={{ marginTop: 5 }}>
            Search term: <b>{query}</b>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
              gap: 8,
              marginTop: 10
            }}
          >
            {supplierSearches(query).map(supplier => (
              <a
                key={supplier.name}
                href={supplier.url}
                target="_blank"
                rel="noopener noreferrer"
                className="btn"
                style={{
                  textAlign: 'center',
                  textDecoration: 'none',
                  display: 'block'
                }}
              >
                Search {supplier.name}
              </a>
            ))}
          </div>

          <div style={{ marginTop: 10, fontSize: 12 }}>
            Supplier pages open directly so you can check the matching product,
            current web price and availability. Website prices are not treated
            as live trade-account pricing.
          </div>
        </div>
      )}
    </div>
  );
}

export default function Home() {
  const [trade, setTrade] = useState('Carpentry');
  const [desc, setDesc] = useState('');
  const [qty, setQty] = useState(5);
  const [suburb, setSuburb] = useState('Campbelltown NSW');

  const [labType, setLabType] = useState('hourly');
  const [rate, setRate] = useState(85);
  const [hours, setHours] = useState(12);
  const [fixed, setFixed] = useState(1000);

  const [matMarkup, setMatMarkup] = useState(15);
  const [labMarkup, setLabMarkup] = useState(0);
  const [other, setOther] = useState(0);
  const [gst, setGst] = useState(10);

  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const labour =
    labType === 'hourly'
      ? rate * hours
      : fixed;

  const totals = useMemo(() => {
    const materials = result?.materialsTotal || 0;

    const mm =
      (materials * matMarkup) / 100;

    const lm =
      (labour * labMarkup) / 100;

    const sub =
      materials +
      mm +
      labour +
      lm +
      Number(other || 0);

    const g =
      (sub * gst) / 100;

    return {
      materials,
      mm,
      lm,
      sub,
      g,
      total: sub + g
    };
  }, [
    result,
    matMarkup,
    labour,
    labMarkup,
    other,
    gst
  ]);

  async function quote(e) {
    e.preventDefault();

    setLoading(true);
    setError('');

    try {
      const r = await fetch('/api/quote', {
        method: 'POST',

        headers: {
          'content-type': 'application/json'
        },

        body: JSON.stringify({
          trade,
          description: desc,
          quantity: qty,
          suburb
        })
      });

      const data = await r.json();

      if (!r.ok) {
        throw new Error(
          data.error ||
            'Could not analyse the job.'
        );
      }

      setResult(data);
    } catch (err) {
      setResult(null);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <header className="nav">
        <div className="wrap navin">
          <div>
            <div className="logo">
              🛠️ Tradie Toolkit AU
            </div>

            <div className="tag">
              QUOTE SMARTER. WIN MORE WORK.
            </div>
          </div>

          <button
            className="btn"
            onClick={() =>
              document
                .querySelector('#builder')
                .scrollIntoView({
                  behavior: 'smooth'
                })
            }
          >
            Build a Quote
          </button>
        </div>
      </header>

      <section className="hero">
        <div className="wrap">
          <div
            style={{
              fontWeight: 800,
              color: '#fbbf24',
              fontSize: 13
            }}
          >
            BUILT FOR AUSTRALIAN TRADIES
          </div>

          <h1>
            Quote jobs faster.
            <br />

            <span>
              Know your numbers.
            </span>
          </h1>

          <p>
            Describe the job, let AI build
            the material take-off, find
            suitable products from Australian
            suppliers, then add labour,
            markup and GST.
          </p>
        </div>
      </section>

      <main
        id="builder"
        className="wrap section"
      >
        <h2 style={{ fontSize: 34 }}>
          Price your next job.
        </h2>

        <div className="grid">
          <form onSubmit={quote}>

            {/* JOB DETAILS */}

            <div className="card">
              <h3>
                <span className="step">
                  1
                </span>
                &nbsp; Job details
              </h3>

              <label>
                Trade

                <select
                  className="field"
                  value={trade}
                  onChange={e =>
                    setTrade(e.target.value)
                  }
                >
                  {trades.map(x => (
                    <option key={x}>
                      {x}
                    </option>
                  ))}
                </select>
              </label>

              <div className="hint">
                <b>
                  💡 Describe the job naturally
                </b>

                <br />

                You don't need to choose a
                brand or model unless you
                already know exactly what you
                want. Include measurements,
                quantities and important
                specifications where known.
                The AI will create the
                material take-off and product
                search terms.
              </div>

              <label>
                Describe the job

                <textarea
                  className="field"
                  rows="5"
                  value={desc}
                  onChange={e =>
                    setDesc(e.target.value)
                  }
                  placeholder={
                    tradeHelp[trade]
                  }
                />
              </label>

              <div
                className="two"
                style={{
                  marginTop: 12
                }}
              >
                <label>
                  Quantity / area

                  <input
                    className="field"
                    type="number"
                    value={qty}
                    onChange={e =>
                      setQty(
                        e.target.value
                      )
                    }
                  />
                </label>

                <label>
                  Job suburb

                  <input
                    className="field"
                    value={suburb}
                    onChange={e =>
                      setSuburb(
                        e.target.value
                      )
                    }
                  />
                </label>
              </div>

              <button
                className="btn"
                style={{
                  marginTop: 16,
                  width: '100%'
                }}
                disabled={loading}
              >
                {loading
                  ? 'Building material take-off…'
                  : 'Build Material Take-Off'}
              </button>

              {error && (
                <div
                  className="warning"
                  style={{
                    marginTop: 12
                  }}
                >
                  <b>
                    Could not build material
                    list
                  </b>

                  <br />

                  {error}
                </div>
              )}
            </div>

            {/* AI MATERIAL TAKE-OFF */}

            {result && (
              <div className="card">
                <h3>
                  <span className="step">
                    2
                  </span>
                  &nbsp;

                  {result.mode ===
                  'ai_takeoff'
                    ? 'AI Material Take-Off'
                    : 'Matched Products'}
                </h3>

                {result.summary && (
                  <p>
                    {result.summary}
                  </p>
                )}

                {result.items?.map(
                  (x, i) => (
                    <div
                      className="supplier"
                      key={`${x.product}-${i}`}
                      style={{
                        display: 'block'
                      }}
                    >
                      <div
                        style={{
                          display: 'flex',
                          justifyContent:
                            'space-between',
                          gap: 12,
                          alignItems:
                            'flex-start'
                        }}
                      >
                        <div>
                          <b>
                            {x.product}
                          </b>

                          <div className="status">
                            Qty {x.qty}{' '}
                            {x.unit ||
                              'each'}

                            {x.category
                              ? ` • ${x.category}`
                              : ''}
                          </div>

                          <div className="status">
                            {x.matchStatus}
                          </div>
                        </div>

                        <b>
                          {money(
                            x.total
                          )}
                        </b>
                      </div>

                      <ProductFinder
                        item={x}
                      />
                    </div>
                  )
                )}

                {result.questions
                  ?.length > 0 && (
                  <div
                    className="hint"
                    style={{
                      marginTop: 12
                    }}
                  >
                    <b>
                      Additional information
                      that may help product
                      matching
                    </b>

                    <br />

                    {result.questions.map(
                      (q, i) => (
                        <div key={i}>
                          • {q}
                        </div>
                      )
                    )}
                  </div>
                )}
              </div>
            )}

            {/* LABOUR */}

            <div className="card">
              <h3>
                <span className="step">
                  {result ? '3' : '2'}
                </span>
                &nbsp; Labour &amp; Profit
              </h3>

              <div className="two">
                <label>
                  Labour type

                  <select
                    className="field"
                    value={labType}
                    onChange={e =>
                      setLabType(
                        e.target.value
                      )
                    }
                  >
                    <option value="hourly">
                      Hourly
                    </option>

                    <option value="fixed">
                      Fixed cost
                    </option>
                  </select>
                </label>

                {labType === 'hourly' ? (
                  <>
                    <label>
                      Hourly rate ($)

                      <input
                        className="field"
                        type="number"
                        value={rate}
                        onChange={e =>
                          setRate(
                            +e.target
                              .value
                          )
                        }
                      />
                    </label>

                    <label>
                      Hours

                      <input
                        className="field"
                        type="number"
                        value={hours}
                        onChange={e =>
                          setHours(
                            +e.target
                              .value
                          )
                        }
                      />
                    </label>
                  </>
                ) : (
                  <label>
                    Fixed labour ($)

                    <input
                      className="field"
                      type="number"
                      value={fixed}
                      onChange={e =>
                        setFixed(
                          +e.target.value
                        )
                      }
                    />
                  </label>
                )}

                <label>
                  Materials markup (%)

                  <input
                    className="field"
                    type="number"
                    value={matMarkup}
                    onChange={e =>
                      setMatMarkup(
                        +e.target.value
                      )
                    }
                  />
                </label>

                <label>
                  Labour markup (%)

                  <input
                    className="field"
                    type="number"
                    value={labMarkup}
                    onChange={e =>
                      setLabMarkup(
                        +e.target.value
                      )
                    }
                  />
                </label>

                <label>
                  Call-out / other ($)

                  <input
                    className="field"
                    type="number"
                    value={other}
                    onChange={e =>
                      setOther(
                        +e.target.value
                      )
                    }
                  />
                </label>

                <label>
                  GST

                  <select
                    className="field"
                    value={gst}
                    onChange={e =>
                      setGst(
                        +e.target.value
                      )
                    }
                  >
                    <option value="10">
                      10%
                    </option>

                    <option value="0">
                      No GST
                    </option>
                  </select>
                </label>
              </div>
            </div>
          </form>

          {/* CUSTOMER QUOTE */}

          <aside>
            <div className="quote">
              <div className="muted">
                CUSTOMER QUOTE
              </div>

              <h2>{trade}</h2>

              <div className="row">
                <span>
                  Materials
                </span>

                <b>
                  {money(
                    totals.materials
                  )}
                </b>
              </div>

              <div className="row">
                <span>
                  Materials markup
                </span>

                <b>
                  {money(totals.mm)}
                </b>
              </div>

              <div className="row">
                <span>
                  Labour
                </span>

                <b>
                  {money(labour)}
                </b>
              </div>

              <div className="row">
                <span>
                  Labour markup
                </span>

                <b>
                  {money(totals.lm)}
                </b>
              </div>

              <div className="row">
                <span>
                  Other
                </span>

                <b>
                  {money(other)}
                </b>
              </div>

              <div className="row">
                <span>
                  Subtotal
                </span>

                <b>
                  {money(totals.sub)}
                </b>
              </div>

              <div className="row">
                <span>
                  GST
                </span>

                <b>
                  {money(totals.g)}
                </b>
              </div>

              <div className="total">
                <div className="muted">
                  TOTAL CUSTOMER PRICE
                </div>

                <strong>
                  {money(
                    totals.total
                  )}
                </strong>
              </div>

              <div className="warning">
                <b>
                  {result?.mode ===
                  'live'
                    ? 'LIVE PRICING'
                    : result?.mode ===
                      'ai_takeoff'
                    ? 'AI MATERIAL TAKE-OFF — PRICING NOT CONNECTED'
                    : 'PRICING NOT CONNECTED'}
                </b>

                <br />

                {result?.message ||
                  'Build the material take-off, then use Find Product Options to check supplier catalogues. Website prices must be verified before being treated as current.'}
              </div>
            </div>
          </aside>
        </div>
      </main>
    </>
  );
}
