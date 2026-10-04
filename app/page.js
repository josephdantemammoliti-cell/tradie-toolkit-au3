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

function ProductFinder({
  item,
  suburb,
  selected,
  onSelect
}) {
  const [open, setOpen] = useState(false);
  const [searched, setSearched] = useState(false);
  const [loading, setLoading] = useState(false);
  const [products, setProducts] = useState([]);
  const [error, setError] = useState('');

  const query =
    item.searchQuery ||
    item.product ||
    '';

  async function findProducts() {
    setOpen(true);
    setLoading(true);
    setError('');
    setProducts([]);
    setSearched(true);

    try {
      const response = await fetch(
        '/api/products',
        {
          method: 'POST',

          headers: {
            'content-type':
              'application/json'
          },

          body: JSON.stringify({
            query,
            suburb
          })
        }
      );

      const data =
        await response.json();

      if (!response.ok) {
        throw new Error(
          data.error ||
            'Could not search supplier products.'
        );
      }

      setProducts(
        Array.isArray(data.products)
          ? data.products
          : []
      );
    } catch (err) {
      setError(
        err.message ||
          'Could not search supplier products.'
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ marginTop: 12 }}>
      {!open ? (
        <button
          type="button"
          className="btn"
          style={{ width: '100%' }}
          onClick={findProducts}
        >
          🔎 Find Product Options
        </button>
      ) : (
        <>
          <div
            style={{
              display: 'flex',
              gap: 8
            }}
          >
            <button
              type="button"
              className="btn"
              style={{ flex: 1 }}
              onClick={findProducts}
              disabled={loading}
            >
              {loading
                ? 'Searching suppliers…'
                : 'Search Again'}
            </button>

            <button
              type="button"
              className="btn"
              onClick={() =>
                setOpen(false)
              }
            >
              Hide
            </button>
          </div>

          <div
            className="hint"
            style={{
              marginTop: 10
            }}
          >
            Searching for:{' '}
            <b>{query}</b>

            {suburb && (
              <>
                <br />
                Job location:{' '}
                <b>{suburb}</b>
              </>
            )}
          </div>

          {loading && (
            <div
              className="hint"
              style={{
                marginTop: 10,
                textAlign: 'center',
                padding: 18
              }}
            >
              <b>
                🔎 Searching Bunnings,
                Mitre 10, Bowens and
                Reece…
              </b>

              <br />

              <span
                style={{
                  fontSize: 12
                }}
              >
                Checking current public
                web products and prices.
              </span>
            </div>
          )}

          {error && (
            <div
              className="warning"
              style={{
                marginTop: 10
              }}
            >
              <b>
                Product search failed
              </b>

              <br />

              {error}
            </div>
          )}

          {!loading &&
            !error &&
            searched &&
            products.length === 0 && (
              <div
                className="warning"
                style={{
                  marginTop: 10
                }}
              >
                <b>
                  No confirmed priced
                  products found
                </b>

                <br />

                No suitable products with
                a confirmed public web
                price were returned. Try
                searching again or make
                the material description
                more specific.
              </div>
            )}

          {!loading &&
            products.length > 0 && (
              <div
                style={{
                  marginTop: 12,
                  display: 'grid',
                  gap: 10
                }}
              >
                <div
                  style={{
                    fontWeight: 800
                  }}
                >
                  Product options
                </div>

                {products.map(
                  (product, index) => {
                    const productId =
                      product.id ||
                      `${product.supplier}-${product.sku}-${index}`;

                    const isSelected =
                      selected?.id ===
                      productId;

                    return (
                      <div
                        key={productId}
                        style={{
                          border:
                            isSelected
                              ? '2px solid #f59e0b'
                              : '1px solid #d1d5db',
                          borderRadius: 10,
                          padding: 12,
                          background:
                            isSelected
                              ? '#fff7ed'
                              : '#ffffff',
                          color: '#111827'
                        }}
                      >
                        <div
                          style={{
                            display:
                              'flex',
                            justifyContent:
                              'space-between',
                            gap: 12,
                            alignItems:
                              'flex-start'
                          }}
                        >
                          <div>
                            <div
                              style={{
                                fontSize:
                                  12,
                                fontWeight:
                                  800,
                                color:
                                  '#64748b',
                                textTransform:
                                  'uppercase'
                              }}
                            >
                              {
                                product.supplier
                              }
                            </div>

                            <div
                              style={{
                                fontWeight:
                                  800,
                                marginTop: 3
                              }}
                            >
                              {product.name}
                            </div>

                            {product.sku &&
                              product.sku !==
                                'Not listed' && (
                                <div
                                  style={{
                                    fontSize:
                                      12,
                                    marginTop:
                                      4,
                                    color:
                                      '#64748b'
                                  }}
                                >
                                  SKU / Item:{' '}
                                  {
                                    product.sku
                                  }
                                </div>
                              )}
                          </div>

                          <div
                            style={{
                              textAlign:
                                'right',
                              minWidth: 90
                            }}
                          >
                            <div
                              style={{
                                fontSize:
                                  20,
                                fontWeight:
                                  900
                              }}
                            >
                              {money(
                                product.price
                              )}
                            </div>

                            <div
                              style={{
                                fontSize:
                                  11,
                                color:
                                  '#64748b'
                              }}
                            >
                              per{' '}
                              {product.unit ||
                                'each'}
                            </div>
                          </div>
                        </div>

                        {product.description && (
                          <div
                            style={{
                              fontSize: 13,
                              marginTop: 8,
                              color:
                                '#475569'
                            }}
                          >
                            {
                              product.description
                            }
                          </div>
                        )}

                        <div
                          style={{
                            fontSize: 11,
                            marginTop: 8,
                            color:
                              '#64748b'
                          }}
                        >
                          Web price — checked{' '}
                          {new Date(
                            product.checkedAt ||
                              Date.now()
                          ).toLocaleString(
                            'en-AU'
                          )}
                        </div>

                        <div
                          style={{
                            display:
                              'flex',
                            gap: 8,
                            marginTop: 10,
                            alignItems:
                              'center'
                          }}
                        >
                          <button
                            type="button"
                            className="btn"
                            style={{
                              flex: 1
                            }}
                            onClick={() =>
                              onSelect({
                                ...product,
                                id:
                                  productId
                              })
                            }
                          >
                            {isSelected
                              ? '✓ Selected'
                              : 'Select Product'}
                          </button>

                          {product.url && (
                            <a
                              href={
                                product.url
                              }
                              target="_blank"
                              rel="noopener noreferrer"
                              style={{
                                fontSize:
                                  12,
                                fontWeight:
                                  700
                              }}
                            >
                              View supplier
                            </a>
                          )}
                        </div>

                        {isSelected && (
                          <div
                            style={{
                              marginTop: 10,
                              padding: 10,
                              borderRadius: 8,
                              background:
                                '#f8fafc'
                            }}
                          >
                            <b>
                              {item.qty}{' '}
                              {item.unit ||
                                'each'}{' '}
                              ×{' '}
                              {money(
                                product.price
                              )}
                            </b>

                            <span>
                              {' '}
                              ={' '}
                            </span>

                            <b>
                              {money(
                                Number(
                                  item.qty ||
                                    0
                                ) *
                                  Number(
                                    product.price ||
                                      0
                                  )
                              )}
                            </b>
                          </div>
                        )}
                      </div>
                    );
                  }
                )}
              </div>
            )}
        </>
      )}
    </div>
  );
}

export default function Home() {
  const [trade, setTrade] =
    useState('Carpentry');

  const [desc, setDesc] =
    useState('');

  const [qty, setQty] =
    useState(5);

  const [suburb, setSuburb] =
    useState('Campbelltown NSW');

  const [labType, setLabType] =
    useState('hourly');

  const [rate, setRate] =
    useState(85);

  const [hours, setHours] =
    useState(12);

  const [fixed, setFixed] =
    useState(1000);

  const [matMarkup, setMatMarkup] =
    useState(15);

  const [labMarkup, setLabMarkup] =
    useState(0);

  const [other, setOther] =
    useState(0);

  const [gst, setGst] =
    useState(10);

  const [result, setResult] =
    useState(null);

  const [loading, setLoading] =
    useState(false);

  const [error, setError] =
    useState('');

  const [
    selectedProducts,
    setSelectedProducts
  ] = useState({});

  const labour =
    labType === 'hourly'
      ? Number(rate || 0) *
        Number(hours || 0)
      : Number(fixed || 0);

  const materialsTotal =
    useMemo(() => {
      if (!result?.items) {
        return 0;
      }

      return result.items.reduce(
        (total, item, index) => {
          const selected =
            selectedProducts[index];

          if (!selected) {
            return total;
          }

          const unitPrice =
            Number(
              selected.price || 0
            );

          const quantity =
            Number(item.qty || 0);

          return (
            total +
            unitPrice * quantity
          );
        },
        0
      );
    }, [
      result,
      selectedProducts
    ]);

  const selectedCount =
    useMemo(() => {
      return Object.values(
        selectedProducts
      ).filter(Boolean).length;
    }, [selectedProducts]);

  const materialCount =
    result?.items?.length || 0;

  const totals = useMemo(() => {
    const materials =
      materialsTotal;

    const mm =
      (materials *
        Number(matMarkup || 0)) /
      100;

    const lm =
      (labour *
        Number(labMarkup || 0)) /
      100;

    const sub =
      materials +
      mm +
      labour +
      lm +
      Number(other || 0);

    const g =
      (sub *
        Number(gst || 0)) /
      100;

    return {
      materials,
      mm,
      lm,
      sub,
      g,
      total: sub + g
    };
  }, [
    materialsTotal,
    matMarkup,
    labour,
    labMarkup,
    other,
    gst
  ]);

  function selectProduct(
    index,
    product
  ) {
    setSelectedProducts(
      previous => ({
        ...previous,
        [index]: product
      })
    );
  }

  async function quote(e) {
    e.preventDefault();

    setLoading(true);
    setError('');

    // A new take-off means old
    // product selections no longer apply.
    setSelectedProducts({});

    try {
      const r = await fetch(
        '/api/quote',
        {
          method: 'POST',

          headers: {
            'content-type':
              'application/json'
          },

          body: JSON.stringify({
            trade,
            description: desc,
            quantity: qty,
            suburb
          })
        }
      );

      const data =
        await r.json();

      if (!r.ok) {
        throw new Error(
          data.error ||
            'Could not analyse the job.'
        );
      }

      setResult(data);
    } catch (err) {
      setResult(null);

      setError(
        err.message ||
          'Could not analyse the job.'
      );
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
                .querySelector(
                  '#builder'
                )
                .scrollIntoView({
                  behavior:
                    'smooth'
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
            Describe the job, let AI
            build the material take-off,
            choose suitable products from
            Australian suppliers, then
            add labour, markup and GST.
          </p>
        </div>
      </section>

      <main
        id="builder"
        className="wrap section"
      >
        <h2
          style={{
            fontSize: 34
          }}
        >
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
                    setTrade(
                      e.target.value
                    )
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
                  💡 Describe the job
                  naturally
                </b>

                <br />

                You don't need to choose
                a brand or model unless
                you already know exactly
                what you want. Include
                measurements, quantities
                and important
                specifications where
                known. The AI will create
                the material take-off and
                product search terms.
              </div>

              <label>
                Describe the job

                <textarea
                  className="field"
                  rows="5"
                  value={desc}
                  onChange={e =>
                    setDesc(
                      e.target.value
                    )
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
                    Could not build
                    material list
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
                  &nbsp; AI Material
                  Take-Off
                </h3>

                {result.summary && (
                  <p>
                    {result.summary}
                  </p>
                )}

                <div
                  className="hint"
                  style={{
                    marginBottom: 12
                  }}
                >
                  <b>
                    Select a product for
                    each material
                  </b>

                  <br />

                  {selectedCount} of{' '}
                  {materialCount}{' '}
                  materials currently
                  priced.
                </div>

                {result.items?.map(
                  (x, i) => {
                    const selected =
                      selectedProducts[i];

                    const lineTotal =
                      selected
                        ? Number(
                            selected.price ||
                              0
                          ) *
                          Number(
                            x.qty || 0
                          )
                        : 0;

                    return (
                      <div
                        className="supplier"
                        key={`${x.product}-${i}`}
                        style={{
                          display:
                            'block'
                        }}
                      >
                        <div
                          style={{
                            display:
                              'flex',
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
                              {
                                x.matchStatus
                              }
                            </div>
                          </div>

                          <div
                            style={{
                              textAlign:
                                'right'
                            }}
                          >
                            <b>
                              {money(
                                lineTotal
                              )}
                            </b>

                            {selected && (
                              <div
                                className="status"
                              >
                                {money(
                                  selected.price
                                )}{' '}
                                each
                              </div>
                            )}
                          </div>
                        </div>

                        {selected && (
                          <div
                            className="hint"
                            style={{
                              marginTop:
                                10
                            }}
                          >
                            <b>
                              ✓{' '}
                              {
                                selected.supplier
                              }
                            </b>

                            <br />

                            {selected.name}

                            <br />

                            {x.qty} ×{' '}
                            {money(
                              selected.price
                            )}{' '}
                            ={' '}

                            <b>
                              {money(
                                lineTotal
                              )}
                            </b>
                          </div>
                        )}

                        <ProductFinder
                          item={x}
                          suburb={
                            suburb
                          }
                          selected={
                            selected
                          }
                          onSelect={product =>
                            selectProduct(
                              i,
                              product
                            )
                          }
                        />
                      </div>
                    );
                  }
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
                      Additional
                      information that
                      may help product
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
                  {result
                    ? '3'
                    : '2'}
                </span>
                &nbsp; Labour &amp;
                Profit
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

                {labType ===
                'hourly' ? (
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
                          +e.target
                            .value
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

              {result && (
                <div
                  style={{
                    marginBottom: 14
                  }}
                >
                  <div className="muted">
                    MATERIALS PRICED
                  </div>

                  <b>
                    {selectedCount} /{' '}
                    {materialCount}
                  </b>
                </div>
              )}

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

              {result &&
              materialCount > 0 &&
              selectedCount <
                materialCount ? (
                <div className="warning">
                  <b>
                    QUOTE STILL BEING
                    PRICED
                  </b>

                  <br />

                  Select products for all
                  materials before using
                  this as the final
                  customer quote.

                  <br />
                  <br />

                  {selectedCount} of{' '}
                  {materialCount}{' '}
                  materials have been
                  priced.
                </div>
              ) : result &&
                materialCount > 0 ? (
                <div className="hint">
                  <b>
                    ✓ MATERIALS PRICED
                  </b>

                  <br />

                  All AI material items
                  currently have a
                  selected supplier
                  product.

                  <br />
                  <br />

                  Prices shown are public
                  web prices, not
                  guaranteed trade-account
                  pricing.
                </div>
              ) : (
                <div className="warning">
                  <b>
                    MATERIALS NOT PRICED
                  </b>

                  <br />

                  Build the material
                  take-off, find supplier
                  products and select the
                  products you want to
                  use.
                </div>
              )}
            </div>
          </aside>
        </div>
      </main>
    </>
  );
}
