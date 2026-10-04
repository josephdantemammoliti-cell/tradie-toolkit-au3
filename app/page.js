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

  const labour = labType === 'hourly' ? rate * hours : fixed;

  const totals = useMemo(() => {
    const materials = result?.materialsTotal || 0;
    const mm = materials * matMarkup / 100;
    const lm = labour * labMarkup / 100;
    const sub =
      materials +
      mm +
      labour +
      lm +
      Number(other || 0);

    const g = sub * gst / 100;

    return {
      materials,
      mm,
      lm,
      sub,
      g,
      total: sub + g
    };
  }, [result, matMarkup, labour, labMarkup, other, gst]);

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
        throw new Error(data.error || 'Could not analyse the job.');
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
            <div className="logo">🛠️ Tradie Toolkit AU</div>
            <div className="tag">QUOTE SMARTER. WIN MORE WORK.</div>
          </div>

          <button
            className="btn"
            onClick={() =>
              document
                .querySelector('#builder')
                .scrollIntoView({ behavior: 'smooth' })
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
            <span>Know your numbers.</span>
          </h1>

          <p>
            Describe the job, identify the exact materials, compare connected
            supplier prices, then add labour, markup and GST to build the
            customer quote.
          </p>
        </div>
      </section>

      <main id="builder" className="wrap section">
        <h2 style={{ fontSize: 34 }}>Price your next job.</h2>

        <div className="grid">
          <form onSubmit={quote}>

            {/* JOB DETAILS */}
            <div className="card">
              <h3>
                <span className="step">1</span>
                &nbsp; Job details
              </h3>

              <label>
                Trade

                <select
                  className="field"
                  value={trade}
                  onChange={e => setTrade(e.target.value)}
                >
                  {trades.map(x => (
                    <option key={x}>{x}</option>
                  ))}
                </select>
              </label>

              <div className="hint">
                <b>💡 Help the AI find the right materials</b>
                <br />
                Describe what you need and include sizes, quantities, brands or
                other specifications when you know them. If you don't specify a
                brand or style, the system can later show suitable product
                varieties for you to choose from.
              </div>

              <label>
                Describe the job

                <textarea
                  className="field"
                  rows="5"
                  value={desc}
                  onChange={e => setDesc(e.target.value)}
                  placeholder="Example: Install 5 internal doors with 5 new passage handles and 3 hinges per door."
                />
              </label>

              <div
                className="two"
                style={{ marginTop: 12 }}
              >
                <label>
                  Quantity / area

                  <input
                    className="field"
                    type="number"
                    value={qty}
                    onChange={e => setQty(e.target.value)}
                  />
                </label>

                <label>
                  Job suburb

                  <input
                    className="field"
                    value={suburb}
                    onChange={e => setSuburb(e.target.value)}
                  />
                </label>
              </div>

              <button
                className="btn"
                style={{
                  marginTop: 16,
                  width: '100%'
                }}
              >
                {loading
                  ? 'Finding materials…'
                  : 'Find Materials & Compare Suppliers'}
              </button>

              {error && (
                <div
                  className="warning"
                  style={{ marginTop: 12 }}
                >
                  <b>Could not build material list</b>
                  <br />
                  {error}
                </div>
              )}
            </div>

            {/* AI MATERIAL TAKE-OFF */}
            {result && (
              <div className="card">
                <h3>
                  <span className="step">2</span>
                  &nbsp;
                  {result.mode === 'ai_takeoff'
                    ? 'AI Material Take-Off'
                    : 'Matched Products'}
                </h3>

                {result.summary && (
                  <p>{result.summary}</p>
                )}

                {result.items.map((x, i) => (
                  <div
                    className={
                      'supplier ' + (i === 0 ? 'best' : '')
                    }
                    key={i}
                  >
                    <div>
                      <b>{x.product}</b>

                      <div className="status">
                        {x.supplier} • {x.sku} • {x.matchStatus}
                      </div>
                    </div>

                    <b>{money(x.total)}</b>
                  </div>
                ))}

                {result.questions?.length > 0 && (
                  <div
                    className="hint"
                    style={{ marginTop: 12 }}
                  >
                    <b>
                      Additional information that may help product matching
                    </b>

                    <br />

                    {result.questions.map((q, i) => (
                      <div key={i}>• {q}</div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* LABOUR & PROFIT */}
            <div className="card">
              <h3>
                <span className="step">
                  {result ? '3' : '2'}
                </span>
                &nbsp; Labour & Profit
              </h3>

              <div className="two">
                <label>
                  Labour type

                  <select
                    className="field"
                    value={labType}
                    onChange={e => setLabType(e.target.value)}
                  >
                    <option value="hourly">Hourly</option>
                    <option value="fixed">Fixed cost</option>
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
                          setRate(+e.target.value)
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
                          setHours(+e.target.value)
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
                        setFixed(+e.target.value)
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
                      setMatMarkup(+e.target.value)
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
                      setLabMarkup(+e.target.value)
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
                      setOther(+e.target.value)
                    }
                  />
                </label>

                <label>
                  GST

                  <select
                    className="field"
                    value={gst}
                    onChange={e =>
                      setGst(+e.target.value)
                    }
                  >
                    <option value="10">10%</option>
                    <option value="0">No GST</option>
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
                <span>Materials</span>
                <b>{money(totals.materials)}</b>
              </div>

              <div className="row">
                <span>Materials markup</span>
                <b>{money(totals.mm)}</b>
              </div>

              <div className="row">
                <span>Labour</span>
                <b>{money(labour)}</b>
              </div>

              <div className="row">
                <span>Labour markup</span>
                <b>{money(totals.lm)}</b>
              </div>

              <div className="row">
                <span>Other</span>
                <b>{money(other)}</b>
              </div>

              <div className="row">
                <span>Subtotal</span>
                <b>{money(totals.sub)}</b>
              </div>

              <div className="row">
                <span>GST</span>
                <b>{money(totals.g)}</b>
              </div>

              <div className="total">
                <div className="muted">
                  TOTAL CUSTOMER PRICE
                </div>

                <strong>
                  {money(totals.total)}
                </strong>
              </div>

              <div className="warning">
                <b>
                  {result?.mode === 'live'
                    ? 'LIVE PRICING'
                    : result?.mode === 'ai_takeoff'
                    ? 'AI MATERIAL TAKE-OFF — PRICING NOT CONNECTED'
                    : 'DEMO / UNVERIFIED PRICING'}
                </b>

                <br />

                {result?.message ||
                  'Run product matching to build the materials cost. Only authorised supplier responses should be treated as live/exact.'}
              </div>
            </div>
          </aside>
        </div>
      </main>
    </>
  );
}
