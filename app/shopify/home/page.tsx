"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";

/* ------------------------------------------------------------------
   Link reali del progetto
------------------------------------------------------------------ */
const INSTALL_URL = "/shopify";
const SAMPLE_URL = "/plan/demo-token-shopify-review-001";

/* ------------------------------------------------------------------ */

type Step = { n: string; d: string; w: string; tag?: "own" | "next" };
type Brand = { name: string; color: string; skin: string; am: Step[]; pm: Step[] };

const BRANDS: Brand[] = [
  {
    name: "Aurelia Botanica",
    color: "#2F6B4F",
    skin: "Combination · dehydrated",
    am: [
      { n: "Calendula Milk Cleanser", d: "Lukewarm water, thirty seconds, morning only.", w: "A non-stripping cleanse protects the barrier you are rebuilding." },
      { n: "Mineral Fluid SPF 40", d: "Two fingers across the face, every morning, indoors included.", w: "Sun exposure undoes most of what the evening step is doing." },
    ],
    pm: [
      { n: "Barrier Repair Essence", d: "Apply to damp skin straight after cleansing, while the face is still slightly wet.", w: "This is the product you ordered. Everything else is built around it, not instead of it.", tag: "own" },
      { n: "Lactic Acid 5% Renewal", d: "Twice a week, after cleansing and before the balm. Skip the balm-only nights.", w: "Introduced now because your barrier has held steady for three weeks.", tag: "next" },
    ],
  },
  {
    name: "Noè Lab",
    color: "#A33D26",
    skin: "Oily · congested",
    am: [
      { n: "Gel Cleanser 02", d: "Once in the morning. No scrubbing, no hot water.", w: "Over-cleansing oily skin makes it produce more oil, not less." },
      { n: "Matte Shield SPF 50", d: "Last step, every morning. Reapply if you are outside past midday.", w: "Sits under everything without the white cast that makes people skip it." },
    ],
    pm: [
      { n: "Niacinamide 10% Fluid", d: "Three drops after cleansing, pressed in rather than rubbed.", w: "This is the product you ordered. The routine is arranged so it can actually work.", tag: "own" },
      { n: "Retinal 0.05% Night", d: "Every third night to start. Stop for a week if you see flaking.", w: "Added now because you reported no stinging across two check-ins.", tag: "next" },
    ],
  },
  {
    name: "Kōsa",
    color: "#1B1B1B",
    skin: "Dry · reactive",
    am: [
      { n: "Rice Water Cleansing Foam", d: "A small amount, pH balanced, low foam. Do not let skin dry fully.", w: "Reactive skin does badly with anything that squeaks after rinsing." },
      { n: "Daily Veil SPF 30", d: "Apply while the skin still holds a little moisture.", w: "Light enough not to trigger the reaction heavier formulas cause." },
    ],
    pm: [
      { n: "Ceramide Concentrate", d: "Four drops on damp skin, then press for ten seconds.", w: "This is the product you ordered. The rest of the week is arranged around it.", tag: "own" },
      { n: "Overnight Repair Cream", d: "A thin layer on top, every night, sealing the concentrate in.", w: "Added now because dryness came back in your last two check-ins.", tag: "next" },
    ],
  },
];

const TIMELINE = [
  { when: "Order paid", title: "Malyte picks up the order", body: "A webhook fires the moment payment clears. Nothing runs on your storefront, so nothing can slow checkout down." },
  { when: "Immediately after", title: "The customer receives an email", body: "One link, sent as soon as the order is paid. It doesn’t sell anything — it offers to build a routine around what they just bought.", moves: "Arrives while the purchase is still fresh" },
  { when: "Day 1", title: "They answer your questions", body: "You decide what the routine is built on. Write your own set of questions, change them whenever you want, and every answer comes back to you.", moves: "First-party customer data — yours, in your dashboard" },
  { when: "Day 1", title: "The routine, with their order already in it", body: "Morning and evening steps, in order, each with a plain reason. The product they just paid for is step one, so the purchase is immediately validated instead of second-guessed.", moves: "Fewer returns, fewer “how do I use this” tickets" },
  { when: "Week 2", title: "First check-in", body: "Is it working? Any stinging, any breakouts, did they skip days? The next version of the plan is generated from those answers.", moves: "You hear about irritation before the refund request" },
  { when: "Week 4", title: "The next product is one of yours", body: "When the routine is ready to add an exfoliant or an SPF, Malyte pulls it from your catalog and links the product page. Never a competitor, never something you don’t stock.", moves: "A reason to come back, from your own shelf" },
  { when: "Second order", title: "The transaction becomes a relationship", body: "The customer returns for a product the routine introduced. The order is checked against your attribution signals, and the weekly routine keeps running.", moves: "Repeat purchase, from a recommendation you own" },
];

const FAQ = [
  { q: "Do I have to touch my theme?", a: "No. Malyte runs off order webhooks and its own hosted routine page. There is no snippet to paste and nothing that renders on your storefront, so your page speed is unaffected." },
  { q: "Does anything change at checkout?", a: "No. Malyte works after payment clears. Your checkout, your payment providers and your order flow stay exactly as they are." },
  { q: "What if my catalog is small?", a: "The routine is built only from what you stock. A ten-product line produces a shorter routine with fewer steps, rather than recommendations you cannot fulfil." },
  { q: "Will this collide with my email platform?", a: "Malyte sends the routine and check-in emails tied to a specific order. It doesn’t manage your campaigns or your list, so it sits alongside your ESP rather than replacing it." },
  { q: "Who owns the customer data?", a: "You do. Quiz and check-in answers sit against your customers in your Malyte dashboard as first-party data." },
  { q: "How long until the first routine goes out?", a: "Install, approve the charge, confirm your catalog sync. The next paid order triggers the first routine email." },
];

const CUR: Record<string, string> = { EUR: "€", USD: "$", GBP: "£" };
const RATES = [0.1, 0.15, 0.2, 0.25, 0.3];

const nf = (n: number) => new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(Math.round(n));

/* ================================================================== */

export default function ShopifyHomePage() {
  return (
    <>
      <Styles />
      <div className="lp">
        <Nav />
        <Hero />
        <Calculator />
        <TwoMoments />
        <Timeline />
        <Catalog />
        <Attribution />
        <Faq />
        <FinalCta />
        <Footer />
      </div>
    </>
  );
}

/* ================================================================== */

function Nav() {
  return (
    <nav className="lp-nav">
      <div className="lp-wrap lp-nav-in">
        <a href="#top" className="lp-mark">malyte<span>.</span></a>
        <div className="lp-nav-links">
          <a href="#how">How it works</a>
          <a href="#catalog">Your catalog</a>
          <a href="#revenue">Attribution</a>
          <a href="#faq">FAQ</a>
        </div>
        <Link href={INSTALL_URL} className="lp-btn lp-btn-solid lp-btn-sm">Get started →</Link>
      </div>
    </nav>
  );
}

/* ================================================================== */

function Hero() {
  return (
    <header className="lp-hero" id="top">
      <div className="lp-wrap lp-hero-grid">
        <div>
          <p className="lp-eyebrow">Shopify app — skincare &amp; wellness brands</p>
          <h1 className="lp-h1">
            Nobody buys a serum.
            <br />
            They buy a <em className="lp-grad-text">routine</em>.
          </h1>
          <p className="lp-lead">
            Turn one order into more purchases throughout the year. Malyte builds a personalized routine from your
            catalog, adapts it week after week, and introduces the products customers need next.
          </p>
          <p className="lp-flow">Order → Personalized routine → Weekly check-ins → Next product → Second order</p>
          <div className="lp-cta-row">
            <Link href={INSTALL_URL} className="lp-btn lp-btn-grad">Install on Shopify →</Link>
            <a href="#how" className="lp-btn lp-btn-ghost">See what the customer gets</a>
          </div>
          <div className="lp-facts">
            <span>Installs in 5 minutes</span>
            <span>No theme edits</span>
            <span>No checkout changes</span>
            <span>Your logo on every routine</span>
          </div>
        </div>
        <RoutineCard />
      </div>
    </header>
  );
}

function RoutineCard() {
  const [active, setActive] = useState(0);
  const [openAm, setOpenAm] = useState(false);
  const [openPm, setOpenPm] = useState(true);
  const b = BRANDS[active];

  return (
    <div>
      <div className="lp-switcher" role="group" aria-label="Preview another brand">
        {BRANDS.map((brand, i) => (
          <button key={brand.name} onClick={() => setActive(i)} aria-pressed={active === i}
            className={active === i ? "is-on" : ""}>
            {brand.name}
          </button>
        ))}
      </div>

      <div className="lp-card">
        <div className="lp-card-top">
          <div className="lp-logo-slot" style={{ color: b.color }}>{b.name}</div>
          <div className="lp-who">Routine for Giulia<br />{b.skin}</div>
        </div>

        <div className="lp-routine">
          <p className="lp-routine-title">This Week&apos;s Routine</p>
          <RoutineGroup label="Morning" icon="☀️" steps={b.am} open={openAm} toggle={() => setOpenAm(!openAm)} color={b.color} />
          <RoutineGroup label="Evening" icon="🌙" steps={b.pm} open={openPm} toggle={() => setOpenPm(!openPm)} color={b.color} />
        </div>

        <div className="lp-card-foot">
          <span>This week</span>
          <span>Check-in Sunday</span>
        </div>
      </div>

      <p className="lp-caption">Sample output. Every routine is assembled only from products that brand actually stocks.</p>
    </div>
  );
}

function RoutineGroup({ label, icon, steps, open, toggle, color }:
  { label: string; icon: string; steps: Step[]; open: boolean; toggle: () => void; color: string }) {
  return (
    <div className="lp-rgroup">
      <button className="lp-rhead" onClick={toggle} aria-expanded={open}>
        <span><span className="lp-remoji" aria-hidden="true">{icon}</span>{label}</span>
        <span className="lp-rcount">
          {steps.length} {steps.length === 1 ? "step" : "steps"}
          <span className="lp-chev" style={{ transform: open ? "none" : "rotate(-90deg)" }}>▾</span>
        </span>
      </button>
      {open && (
        <div className="lp-rbody">
          {steps.map((st, i) => (
            <div className="lp-rstep" key={st.n}>
              <div className="lp-rthumb" aria-hidden="true">{icon}</div>
              <div className="lp-rmain">
                <div className="lp-chips">
                  <span className="lp-chip">Step {i + 1}</span>
                  <span className="lp-chip">View →</span>
                  {st.tag === "own" && <span className="lp-chip lp-chip-own" style={{ background: color }}>In their order</span>}
                  {st.tag === "next" && <span className="lp-chip lp-chip-next">Next step</span>}
                </div>
                <p className="lp-rname">{st.n}</p>
                <p className="lp-rdesc">{st.d}</p>
                <p className="lp-rwhy">Why: {st.w}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ================================================================== */

function Calculator() {
  const [cur, setCur] = useState("EUR");
  const [revenueInput, setRevenueInput] = useState("500000");
  const [aovInput, setAovInput] = useState("100");
  const revenue = revenueInput === "" ? 0 : Number(revenueInput);
  const aov = aovInput === "" ? 0 : Number(aovInput);
  const [rateIdx, setRateIdx] = useState(0);

  const sym = CUR[cur];
  const money = (n: number) => sym + nf(n);
  const short = (n: number) => sym + (n >= 1000000 ? `${n / 1000000}M` : `${n / 1000}K`);

  const rate = RATES[rateIdx];
  const safeRevenue = Math.max(50000, Math.min(5000000, revenue || 50000));
  const safeAov = Math.max(5, Math.min(1000, aov || 5));
  const orders = safeRevenue / safeAov;
  const extraOrders = orders * rate;
  const extraRevenue = extraOrders * safeAov;

  return (
    <section className="lp-wrap" id="calc">
      <div className="lp-calc">
        <div className="lp-calc-grid">
          <div>
            <p className="lp-eyebrow">Illustrative model</p>
            <h2 className="lp-h2 lp-h2-sm">See what repeat purchases are worth.</h2>
            <p className="lp-calc-sub">
              Adjust the assumptions below to see what a small share of additional second orders would be worth on your
              store over a year.
            </p>

            <div className="lp-cur" role="group" aria-label="Currency">
              {Object.keys(CUR).map((k) => (
                <button key={k} onClick={() => setCur(k)} aria-pressed={cur === k} className={cur === k ? "is-on" : ""}>
                  {CUR[k]}
                </button>
              ))}
            </div>

            <label className="lp-flabel" htmlFor="rev">Annual revenue</label>
            <div className="lp-field">
              <span className="lp-sym">{sym}</span>
              <input id="rev" type="text" inputMode="numeric" value={revenueInput === "" ? "" : nf(revenue)}
                onChange={(e) => setRevenueInput(e.target.value.replace(/\D/g, "").slice(0, 7))}
                onBlur={() => setRevenueInput(String(Math.max(50000, Math.min(5000000, revenue || 50000))))} />
            </div>
            <input type="range" className="lp-range" min={50000} max={5000000} step={25000} value={safeRevenue}
              onChange={(e) => setRevenueInput(e.target.value)} aria-label="Annual revenue slider" />
            <div className="lp-ends"><span>{short(50000)}</span><span>{short(5000000)}</span></div>

            <label className="lp-flabel lp-mt" htmlFor="aov">Average order value</label>
            <div className="lp-field">
              <span className="lp-sym">{sym}</span>
              <input id="aov" type="text" inputMode="numeric" value={aovInput === "" ? "" : nf(aov)}
                onChange={(e) => setAovInput(e.target.value.replace(/\D/g, "").slice(0, 4))}
                onBlur={() => setAovInput(String(Math.max(5, Math.min(1000, aov || 5))))} />
            </div>

            <label className="lp-flabel lp-mt" htmlFor="rate">Additional repeat purchase rate</label>
            <input id="rate" type="range" className="lp-range" min={0} max={4} step={1} value={rateIdx}
              onChange={(e) => setRateIdx(Number(e.target.value))} aria-label="Additional repeat purchase rate" />
            <div className="lp-ends" aria-hidden="true">
              {RATES.map((r) => <span key={r}>{r * 100}%</span>)}
            </div>
          </div>

          <div className="lp-result">
            <p className="lp-result-k">Illustrative additional revenue / year</p>
            <p className="lp-big lp-grad-text">+{money(extraRevenue)}</p>
            <p className="lp-result-sub">on {nf(orders)} annual orders at a {rate * 100}% additional repeat rate</p>
            <div className="lp-result-split">
              <div><b>{nf(extraOrders)}</b><span>additional repeat orders</span></div>
              <div><b>{money(extraRevenue / 12)}</b><span>per month</span></div>
            </div>
            <p className="lp-disclaimer">
              Illustrative model. Adjust the assumptions to see what additional repeat purchases could be worth for your
              store. Actual results depend on customer behaviour, catalog depth, order volume and margin.
            </p>
          </div>
        </div>
        <p className="lp-calc-note">
          Malyte gives customers a reason to buy the next product when their routine is ready for it.
        </p>
      </div>
    </section>
  );
}

/* ================================================================== */

function TwoMoments() {
  return (
    <section className="lp-section" id="why">
      <div className="lp-wrap">
        <div className="lp-shead">
          <p className="lp-eyebrow">Two moments, one system</p>
          <h2 className="lp-h2">One order is a purchase. A routine is a relationship.</h2>
          <p className="lp-lead">
            The first order pays for the acquisition. The second one pays for the business. Malyte works at both moments,
            and they are not the same moment.
          </p>
        </div>

        <div className="lp-split">
          <div className="lp-panel lp-panel-tint">
            <p className="lp-eyebrow">Before purchase</p>
            <h3 className="lp-h3-big">They choose a routine, not a single item</h3>
            <p className="lp-panel-p">
              A short questionnaire helps the customer see which of your products belong together and why each one is
              there — before they reach checkout, without changing your checkout.
            </p>
            <ul className="lp-list">
              <li>You choose the questions your customers are asked</li>
              <li>Shows a complete morning and evening set instead of one hero product</li>
              <li>Every recommendation links to the product page it came from</li>
            </ul>
          </div>
          <div className="lp-panel">
            <p className="lp-eyebrow">After purchase</p>
            <h3 className="lp-h3-big">Then Malyte holds the weeks that follow</h3>
            <p className="lp-panel-p">
              The order becomes a weekly routine the customer actually follows. Check-ins record what is working, the
              plan adapts, and the next product appears when the routine is ready for it — not on day three.
            </p>
            <ul className="lp-list">
              <li>Weekly check-in on results, adherence and irritation</li>
              <li>The plan is rebuilt from their answers, not from a fixed flowchart</li>
              <li>The next step is a product they don’t own yet — and it is yours</li>
              <li>Every answer stays with you as first-party customer data</li>
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ================================================================== */

function Timeline() {
  const railRef = useRef<HTMLDivElement>(null);
  const [fill, setFill] = useState(0);
  const [seen, setSeen] = useState<number[]>([]);

  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) {
      setSeen(TIMELINE.map((_, i) => i));
      return;
    }
    const nodes = railRef.current?.querySelectorAll(".lp-stop") ?? [];
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            const i = Number((e.target as HTMLElement).dataset.i);
            setSeen((prev) => (prev.includes(i) ? prev : [...prev, i]));
            io.unobserve(e.target);
          }
        });
      },
      { threshold: 0.3, rootMargin: "0px 0px -8% 0px" }
    );
    nodes.forEach((n) => io.observe(n));

    const onScroll = () => {
      const r = railRef.current?.getBoundingClientRect();
      if (!r) return;
      const pct = (window.innerHeight * 0.6 - r.top) / r.height;
      setFill(Math.max(0, Math.min(1, pct)) * (r.height - 12));
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    onScroll();
    return () => {
      io.disconnect();
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, []);

  return (
    <section className="lp-section" id="how">
      <div className="lp-wrap">
        <div className="lp-shead">
          <p className="lp-eyebrow">What actually happens</p>
          <h2 className="lp-h2">From a paid order to the second one.</h2>
          <p className="lp-lead">
            No theme code, no popup, nothing rendered on your storefront and nothing added to checkout. Malyte listens
            for the order and takes it from there.
          </p>
        </div>

        <div className="lp-rail" ref={railRef}>
          <div className="lp-rail-line" />
          <div className="lp-rail-fill" style={{ height: fill }} />
          {TIMELINE.map((t, i) => (
            <div className={`lp-stop${seen.includes(i) ? " is-in" : ""}`} data-i={i} key={t.title}>
              <span className="lp-dot" />
              <div className="lp-when">{t.when}</div>
              <div>
                <h3 className="lp-h3">{t.title}</h3>
                <p className="lp-stop-p">{t.body}</p>
                {t.moves && <span className="lp-moves">{t.moves}</span>}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ================================================================== */

function Catalog() {
  const cols = [
    { t: "Never a competitor", b: "Routines are drawn from your Shopify catalog and nothing else. Your products are imported and classified by step, skin type and concern on install — nothing to tag by hand." },
    { t: "Never something you can’t fulfil", b: "Archive or unpublish a product and it leaves the recommendation set on the next sync. No customer is ever sent to a dead product page." },
    { t: "Always one click from the product page", b: "Each step links to the product it came from, in your product titles and your brand voice. The customer never sees Malyte — the page carries your logo." },
  ];
  return (
    <section className="lp-section" id="catalog">
      <div className="lp-wrap">
        <div className="lp-shead">
          <p className="lp-eyebrow">Built on your catalog</p>
          <h2 className="lp-h2">Your catalog is the boundary.</h2>
          <p className="lp-lead">
            Malyte can only recommend products you actually sell. That is a limit in the system, not a setting you have
            to police.
          </p>
        </div>
        <div className="lp-cols">
          {cols.map((c) => (
            <div key={c.t}>
              <div className="lp-col-rule" />
              <h3 className="lp-h3">{c.t}</h3>
              <p className="lp-col-p">{c.b}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ================================================================== */

function Attribution() {
  const signals: [string, string, string][] = [
    ["01", "Customer match", "The buyer already completed a Malyte routine."],
    ["02", "Product match", "The order contains a product the routine recommended."],
    ["03", "Attribution window", "The order lands inside the window after a routine or check-in."],
  ];
  return (
    <section className="lp-section" id="revenue">
      <div className="lp-wrap lp-attr">
        <div>
          <p className="lp-eyebrow">Attribution</p>
          <h2 className="lp-h2">You can see which orders came back.</h2>
          <p className="lp-lead">
            Every returning order is checked against three signals. One match is enough, and you always see which one it
            was.
          </p>
        </div>
        <div className="lp-signals">
          {signals.map(([k, t, d]) => (
            <div className="lp-signal" key={k}>
              <span className="lp-signal-k">{k}</span>
              <span>
                <b>{t}</b>
                <span>{d}</span>
              </span>
            </div>
          ))}
          <div className="lp-signal-note">One signal is enough. Each attributed order shows you which.</div>
        </div>
      </div>
    </section>
  );
}

/* ================================================================== */

function Faq() {
  return (
    <section className="lp-section" id="faq">
      <div className="lp-wrap">
        <div className="lp-shead">
          <p className="lp-eyebrow">Before you install</p>
          <h2 className="lp-h2">The questions merchants ask first.</h2>
        </div>
        <div className="lp-faq">
          {FAQ.map((f, i) => (
            <details key={f.q} open={i === 0}>
              <summary>{f.q}</summary>
              <p>{f.a}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ================================================================== */

function FinalCta() {
  return (
    <section className="lp-wrap" id="install">
      <div className="lp-final">
        <h2 className="lp-h2">Give every customer a reason to come back.</h2>
        <p>Connect Shopify, let your catalog sync, and the first routine goes out with your next paid order.</p>
        <div className="lp-cta-row lp-center">
          <Link href={INSTALL_URL} className="lp-btn lp-btn-grad">Install on Shopify →</Link>
          <Link href={SAMPLE_URL} className="lp-btn lp-btn-ghost" target="_blank">See a sample plan</Link>
        </div>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="lp-footer">
      <div className="lp-wrap lp-foot-in">
        <span className="lp-mark">malyte<span>.</span></span>
        <span>Post-purchase routines for skincare and wellness brands on Shopify.</span>
        <span className="lp-eyebrow">© 2026 Malyte</span>
      </div>
    </footer>
  );
}

/* ================================================================== */

function Styles() {
  return (
    <style>{`
.lp {
  --ink:#0F172A; --muted:#64748B; --line:#E2E8F0; --subtle:#F0F3F8;
  --tint:#EDE9FE; --brand:#7C5CFC; --brand-ink:#6D28D9;
  --grad:linear-gradient(100deg,#7572F6 0%,#62B5E5 52%,#53E8D8 100%);
  background:#fff; color:var(--ink); min-height:100vh;
  font-family:'Satoshi','Inter',-apple-system,sans-serif;
  font-size:17px; line-height:1.62; -webkit-font-smoothing:antialiased;
}
.lp *{box-sizing:border-box; margin:0; padding:0}
.lp a{color:inherit; text-decoration:none}
.lp-wrap{max-width:1200px; margin:0 auto; padding-inline:clamp(20px,5vw,64px)}

.lp h1,.lp h2,.lp h3{font-weight:800; letter-spacing:-.035em; line-height:1.05}
.lp-h1{font-size:clamp(2.4rem,5.6vw,4.4rem); line-height:1.02; margin:1.1rem 0 1.3rem}
.lp-h2{font-size:clamp(1.9rem,4.2vw,3.1rem); margin:.8rem 0 1rem}
.lp-h2-sm{font-size:clamp(1.6rem,3.2vw,2.4rem)}
.lp-h3{font-size:1.2rem; font-weight:700; letter-spacing:-.02em; line-height:1.3}
.lp-h3-big{font-size:clamp(1.4rem,2.4vw,1.85rem); margin:.9rem 0 .75rem}
.lp-grad-text{font-style:normal; background:var(--grad); -webkit-background-clip:text; background-clip:text; color:transparent}

.lp-eyebrow{font-family:ui-monospace,'SF Mono',Menlo,monospace; font-size:.78rem;
  letter-spacing:.1em; text-transform:uppercase; color:var(--brand-ink); font-weight:500}
.lp-lead{font-size:clamp(1.05rem,1.7vw,1.26rem); line-height:1.6; color:var(--muted); max-width:48ch}

.lp-btn{display:inline-flex; align-items:center; gap:.5rem; border-radius:100px;
  padding:.85rem 1.45rem; font-size:.98rem; font-weight:700; border:1.5px solid transparent;
  cursor:pointer; transition:all .2s}
.lp-btn-solid{background:var(--brand); color:#fff}
.lp-btn-solid:hover{background:#6A45F5}
.lp-btn-grad{background:var(--grad); color:#fff}
.lp-btn-grad:hover{filter:brightness(1.08); transform:translateY(-1px)}
.lp-btn-ghost{border-color:var(--line); background:#fff; color:var(--ink)}
.lp-btn-ghost:hover{border-color:var(--brand); color:var(--brand-ink)}
.lp-btn-sm{padding:.55rem 1.1rem; font-size:.9rem}
.lp button:focus-visible,.lp a:focus-visible{outline:3px solid var(--brand); outline-offset:3px}

.lp-nav{position:sticky; top:0; z-index:100; background:rgba(255,255,255,.92);
  backdrop-filter:blur(16px); border-bottom:1px solid var(--line)}
.lp-nav-in{display:flex; align-items:center; justify-content:space-between; height:68px}
.lp-mark{font-size:1.35rem; font-weight:800; letter-spacing:-.04em; color:var(--ink)}
.lp-mark span{color:var(--brand)}
.lp-nav-links{display:flex; gap:1.9rem}
.lp-nav-links a{font-size:.95rem; font-weight:500; color:var(--muted)}
.lp-nav-links a:hover{color:var(--brand)}
@media(max-width:880px){.lp-nav-links{display:none}}

.lp-hero{padding:clamp(44px,7vw,96px) 0 clamp(52px,7vw,88px)}
.lp-hero-grid{display:grid; grid-template-columns:1.05fr .95fr; gap:clamp(32px,5vw,64px); align-items:start}
@media(max-width:940px){.lp-hero-grid{grid-template-columns:1fr}}
.lp-flow{font-family:ui-monospace,'SF Mono',Menlo,monospace; font-size:.82rem;
  color:var(--brand-ink); margin-top:1.1rem; line-height:1.7; max-width:44ch}
.lp-cta-row{display:flex; gap:.7rem; flex-wrap:wrap; margin-top:2rem}
.lp-center{justify-content:center}
.lp-facts{margin-top:2.2rem; padding-top:1.2rem; border-top:1px solid var(--line);
  display:flex; flex-wrap:wrap; gap:.5rem 1.6rem;
  font-family:ui-monospace,'SF Mono',Menlo,monospace; font-size:.82rem; color:var(--muted)}

.lp-switcher{display:flex; gap:.4rem; flex-wrap:wrap; margin-bottom:.9rem}
.lp-switcher button{font-family:ui-monospace,'SF Mono',Menlo,monospace; font-size:.76rem;
  text-transform:uppercase; letter-spacing:.05em; padding:.42rem .78rem; border-radius:100px;
  border:1.5px solid var(--line); background:#fff; color:var(--muted); cursor:pointer; transition:.2s}
.lp-switcher button:hover{border-color:var(--brand); color:var(--brand-ink)}
.lp-switcher button.is-on{background:var(--brand); border-color:var(--brand); color:#fff}

.lp-card{border:1px solid var(--line); border-radius:20px; overflow:hidden; background:#fff;
  box-shadow:0 26px 50px -32px rgba(15,23,42,.45)}
.lp-card-top{display:flex; align-items:center; justify-content:space-between; gap:1rem;
  padding:1rem 1.25rem; border-bottom:1px solid var(--line)}
.lp-logo-slot{font-size:1.02rem; font-weight:700; text-transform:uppercase; letter-spacing:.1em; transition:color .3s}
.lp-who{font-family:ui-monospace,'SF Mono',Menlo,monospace; font-size:.76rem;
  color:var(--muted); text-align:right; line-height:1.45}
.lp-routine{background:var(--subtle); padding:1rem .9rem 1.25rem}
.lp-routine-title{font-size:1.15rem; font-weight:800; letter-spacing:-.03em; margin-bottom:.75rem; padding-inline:.3rem}
.lp-rgroup{background:#fff; border:1px solid var(--line); border-radius:16px; overflow:hidden}
.lp-rgroup + .lp-rgroup{margin-top:.65rem}
.lp-rhead{width:100%; display:flex; justify-content:space-between; align-items:center; gap:1rem;
  padding:.9rem 1rem; background:#fff; border:0; cursor:pointer; text-align:left;
  font-family:inherit; font-size:1.02rem; font-weight:700; letter-spacing:-.02em; color:var(--ink)}
.lp-remoji{font-size:1.15rem; margin-right:.55rem}
.lp-rcount{display:inline-flex; align-items:center; gap:.45rem; white-space:nowrap;
  font-size:.85rem; font-weight:400; color:var(--muted)}
.lp-chev{font-size:.7rem; transition:transform .2s; display:inline-block}
.lp-rbody{padding:0 .6rem .6rem}
.lp-rstep{display:flex; gap:.75rem; background:var(--subtle); border-radius:14px; padding:.8rem}
.lp-rstep + .lp-rstep{margin-top:.55rem}
.lp-rthumb{flex:0 0 50px; height:50px; border-radius:12px; background:#fff; border:1px solid var(--line);
  display:flex; align-items:center; justify-content:center; font-size:1.4rem}
.lp-rmain{min-width:0}
.lp-chips{display:flex; gap:.35rem; flex-wrap:wrap; margin-bottom:.45rem}
.lp-chip{font-size:.72rem; font-weight:600; padding:.22rem .55rem; border-radius:8px;
  background:var(--tint); color:var(--brand-ink); white-space:nowrap}
.lp-chip-own{color:#fff}
.lp-chip-next{background:#FEF3C7; color:#92400E}
.lp-rname{font-size:1rem; font-weight:700; letter-spacing:-.02em; line-height:1.3}
.lp-rdesc{font-size:.87rem; color:var(--muted); line-height:1.5; margin-top:.3rem}
.lp-rwhy{font-size:.81rem; color:#94A3B8; font-style:italic; line-height:1.5; margin-top:.5rem}
.lp-card-foot{display:flex; justify-content:space-between; gap:1rem; padding:.85rem 1.25rem;
  border-top:1px solid var(--line); background:#fff;
  font-family:ui-monospace,'SF Mono',Menlo,monospace; font-size:.78rem; color:var(--muted)}
.lp-caption{font-family:ui-monospace,'SF Mono',Menlo,monospace; font-size:.76rem;
  color:var(--muted); margin-top:.8rem; line-height:1.55}

.lp-calc{background:var(--tint); border-radius:24px; padding:clamp(24px,4vw,52px); margin-bottom:clamp(40px,6vw,72px)}
.lp-calc-grid{display:grid; grid-template-columns:1.1fr .9fr; gap:clamp(24px,4vw,56px); align-items:center}
@media(max-width:860px){.lp-calc-grid{grid-template-columns:1fr}}
.lp-calc-sub{color:var(--muted); font-size:1rem; max-width:44ch}
.lp-cur{display:flex; gap:.3rem; margin:1.5rem 0 .9rem}
.lp-cur button{width:2.3rem; height:2.3rem; border-radius:8px; border:1.5px solid #D6CEFB;
  background:#fff; color:var(--muted); cursor:pointer; font-family:inherit; font-size:.9rem; transition:.2s}
.lp-cur button.is-on{background:var(--brand); border-color:var(--brand); color:#fff}
.lp-flabel{display:block; font-family:ui-monospace,'SF Mono',Menlo,monospace; font-size:.78rem;
  text-transform:uppercase; letter-spacing:.1em; color:var(--brand-ink); margin-bottom:.5rem}
.lp-mt{margin-top:1.6rem}
.lp-field{display:flex; align-items:center; gap:.6rem; background:#fff;
  border:1.5px solid #D6CEFB; border-radius:14px; padding:.7rem 1rem}
.lp-sym{font-size:1.4rem; font-weight:700; color:var(--muted)}
.lp-field input{border:0; outline:0; background:transparent; width:100%; font-family:inherit;
  font-size:clamp(1.5rem,3vw,2rem); font-weight:800; letter-spacing:-.03em; color:var(--ink)}
.lp-range{-webkit-appearance:none; appearance:none; width:100%; height:6px; border-radius:99px;
  background:#D6CEFB; margin-top:1.2rem; cursor:pointer}
.lp-range::-webkit-slider-thumb{-webkit-appearance:none; width:26px; height:26px; border-radius:50%;
  background:var(--brand); border:4px solid #fff; box-shadow:0 2px 8px rgba(15,23,42,.22)}
.lp-range::-moz-range-thumb{width:26px; height:26px; border-radius:50%; background:var(--brand); border:4px solid #fff}
.lp-ends{display:flex; justify-content:space-between; margin-top:.5rem;
  font-family:ui-monospace,'SF Mono',Menlo,monospace; font-size:.74rem; color:var(--muted)}
.lp-result{background:#fff; border-radius:20px; padding:clamp(24px,3vw,36px); text-align:center;
  box-shadow:0 20px 44px -30px rgba(15,23,42,.3)}
.lp-result-k{font-family:ui-monospace,'SF Mono',Menlo,monospace; font-size:.78rem;
  text-transform:uppercase; letter-spacing:.1em; color:var(--muted)}
.lp-big{font-size:clamp(2.5rem,6.5vw,3.9rem); font-weight:800; letter-spacing:-.045em;
  line-height:1; margin:.6rem 0 .3rem}
.lp-result-sub{color:var(--muted); font-size:.95rem}
.lp-result-split{display:flex; gap:1rem; margin-top:1.5rem; padding-top:1.3rem; border-top:1px solid var(--line)}
.lp-result-split div{flex:1}
.lp-result-split b{display:block; font-size:1.35rem; font-weight:800; letter-spacing:-.03em}
.lp-result-split span{font-family:ui-monospace,'SF Mono',Menlo,monospace; font-size:.72rem;
  text-transform:uppercase; letter-spacing:.08em; color:var(--muted)}
.lp-disclaimer{font-family:ui-monospace,'SF Mono',Menlo,monospace; font-size:.72rem;
  color:var(--muted); margin-top:1.1rem; line-height:1.5}
.lp-calc-note{margin:clamp(20px,3vw,32px) auto 0; padding-top:1.3rem; border-top:1px solid #D6CEFB;
  font-size:1rem; color:var(--brand-ink); text-align:center; max-width:52ch}

.lp-section{padding:clamp(52px,7vw,104px) 0; border-top:1px solid var(--line)}
.lp-shead{max-width:62ch; margin-bottom:clamp(30px,5vw,56px)}
.lp-split{display:grid; grid-template-columns:1fr 1fr; gap:1px; background:var(--line);
  border:1px solid var(--line); border-radius:18px; overflow:hidden}
@media(max-width:820px){.lp-split{grid-template-columns:1fr}}
.lp-panel{background:#fff; padding:clamp(24px,3.4vw,40px)}
.lp-panel-tint{background:var(--tint)}
.lp-panel-p{color:var(--muted); font-size:1rem}
.lp-list{list-style:none; margin-top:1.4rem}
.lp-list li{padding:.72rem 0; border-top:1px solid var(--line); font-size:.96rem;
  display:flex; gap:.7rem; align-items:baseline}
.lp-list li::before{content:"→"; color:var(--brand); font-weight:600}

.lp-rail{position:relative; margin-top:clamp(24px,4vw,44px)}
.lp-rail-line{position:absolute; left:0; top:6px; bottom:6px; width:2px; background:var(--line)}
.lp-rail-fill{position:absolute; left:0; top:6px; width:2px; background:var(--grad); transition:height .12s linear}
.lp-stop{position:relative; display:grid; grid-template-columns:150px 1fr;
  gap:clamp(12px,3vw,40px); padding:0 0 clamp(28px,4vw,44px) clamp(28px,4vw,52px);
  opacity:0; transform:translateY(14px); transition:opacity .55s ease, transform .55s ease}
.lp-stop.is-in{opacity:1; transform:none}
.lp-stop:last-child{padding-bottom:0}
@media(max-width:760px){.lp-stop{grid-template-columns:1fr; gap:.35rem}}
.lp-dot{position:absolute; left:-5px; top:8px; width:12px; height:12px; border-radius:50%;
  background:#fff; border:2px solid var(--line); transition:.4s}
.lp-stop.is-in .lp-dot{background:var(--brand); border-color:var(--brand)}
.lp-when{font-family:ui-monospace,'SF Mono',Menlo,monospace; font-size:.82rem; font-weight:500;
  text-transform:uppercase; letter-spacing:.08em; color:var(--brand-ink); padding-top:.1rem}
.lp-stop-p{color:var(--muted); font-size:1rem; max-width:54ch; margin-top:.45rem}
.lp-moves{display:inline-block; margin-top:.8rem; padding:.3rem .8rem; border-radius:100px;
  background:var(--tint); color:var(--brand-ink);
  font-family:ui-monospace,'SF Mono',Menlo,monospace; font-size:.74rem}

.lp-cols{display:grid; grid-template-columns:repeat(3,1fr); gap:clamp(20px,3vw,40px)}
@media(max-width:860px){.lp-cols{grid-template-columns:1fr}}
.lp-col-rule{height:3px; width:38px; border-radius:2px; background:var(--grad); margin-bottom:.9rem}
.lp-col-p{color:var(--muted); font-size:.98rem; margin-top:.55rem}

.lp-attr{display:grid; grid-template-columns:1fr 1fr; gap:clamp(28px,5vw,72px); align-items:center}
@media(max-width:900px){.lp-attr{grid-template-columns:1fr}}
.lp-signals{border:1px solid var(--line); border-radius:18px; background:#fff; overflow:hidden}
.lp-signal{display:flex; gap:1rem; align-items:flex-start; padding:1.1rem 1.35rem}
.lp-signal + .lp-signal{border-top:1px solid var(--line)}
.lp-signal-k{font-family:ui-monospace,'SF Mono',Menlo,monospace; font-size:.8rem;
  font-weight:500; color:var(--brand); padding-top:.15rem}
.lp-signal b{display:block; font-size:1rem; font-weight:700}
.lp-signal span span{font-size:.94rem; color:var(--muted)}
.lp-signal-note{padding:1rem 1.35rem; background:var(--tint); color:var(--brand-ink);
  font-family:ui-monospace,'SF Mono',Menlo,monospace; font-size:.8rem; line-height:1.55}

.lp-faq{max-width:840px; border-top:1px solid var(--line)}
.lp-faq details{border-bottom:1px solid var(--line)}
.lp-faq summary{padding:1.2rem 0; cursor:pointer; list-style:none; display:flex;
  justify-content:space-between; gap:1rem; font-size:1.15rem; font-weight:700; letter-spacing:-.015em}
.lp-faq summary::-webkit-details-marker{display:none}
.lp-faq summary::after{content:"+"; color:var(--brand); font-weight:500}
.lp-faq details[open] summary::after{content:"–"}
.lp-faq details p{padding-bottom:1.2rem; color:var(--muted); font-size:1rem; max-width:62ch}

.lp-final{background:var(--tint); border-radius:24px; padding:clamp(40px,6vw,80px);
  text-align:center; margin-bottom:clamp(40px,6vw,80px)}
.lp-final p{color:var(--muted); max-width:48ch; margin:0 auto 2rem}

.lp-footer{border-top:1px solid var(--line); padding:2.2rem 0 3rem; font-size:.92rem; color:var(--muted)}
.lp-foot-in{display:flex; justify-content:space-between; gap:1.5rem; flex-wrap:wrap; align-items:center}

@media(prefers-reduced-motion:reduce){
  .lp *{animation:none !important; transition:none !important}
  .lp-stop{opacity:1 !important; transform:none !important}
}
    `}</style>
  );
}
