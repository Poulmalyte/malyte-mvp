import Link from 'next/link'

export default function ShopifyHomePage() {
  return (
    <>
      <style>{`
        @import url('https://api.fontshare.com/v2/css?f[]=satoshi@400,500,700,800&display=swap');

        * { box-sizing: border-box; margin: 0; padding: 0; }

        .root {
          min-height: 100vh;
          background: #F5F7FA;
          color: #0F172A;
          font-family: 'Satoshi', 'Inter', sans-serif;
          overflow-x: hidden;
        }

        .nav {
          position: fixed; top: 0; left: 0; right: 0; z-index: 100;
          display: flex; justify-content: space-between; align-items: center;
          padding: 18px 48px;
          background: rgba(245,247,250,0.92);
          backdrop-filter: blur(16px);
          border-bottom: 1px solid #E8EDF8;
        }
        .logo { font-size: 22px; font-weight: 800; color: #0F172A; text-decoration: none; }
        .logo span { color: #7C5CFC; }
        .nav-links { display: flex; gap: 10px; align-items: center; }
        .nav-signin {
          padding: 9px 20px; border-radius: 100px;
          border: 1px solid #E8EDF8;
          color: #64748B; font-size: 13px; font-weight: 500;
          text-decoration: none; transition: all 0.2s;
        }
        .nav-signin:hover { border-color: #7C5CFC; color: #7C5CFC; }
        .nav-btn {
          padding: 9px 22px; border-radius: 100px;
          background: #7C5CFC; color: #fff;
          font-size: 13px; font-weight: 700;
          text-decoration: none; transition: all 0.2s;
        }
        .nav-btn:hover { background: #6d4ef0; }

        .hero {
          padding: 140px 48px 80px;
          max-width: 1100px; margin: 0 auto;
          display: grid; grid-template-columns: 1fr 1fr;
          gap: 80px; align-items: center;
        }
        .badge {
          display: inline-flex; align-items: center; gap: 8px;
          padding: 6px 14px; border-radius: 100px;
          border: 1px solid rgba(124,92,252,0.2);
          background: #EDE9FE;
          font-size: 12px; font-weight: 700; color: #7C5CFC;
          letter-spacing: 0.3px; margin-bottom: 28px;
        }
        .badge-dot {
          width: 6px; height: 6px; border-radius: 50%;
          background: #7C5CFC; animation: pulse 2s infinite;
        }
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.3} }

        .hero-title {
          font-size: clamp(38px, 4vw, 58px);
          font-weight: 800; line-height: 1.08;
          color: #0F172A; letter-spacing: -1.5px;
          margin-bottom: 24px;
        }
        .hero-title .accent {
          background: linear-gradient(135deg, #7C5CFC, #4DFFD2);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }
        .hero-sub {
          font-size: 17px; line-height: 1.75;
          color: #64748B; font-weight: 400;
          margin-bottom: 40px; max-width: 440px;
        }
        .hero-actions { display: flex; gap: 12px; flex-wrap: wrap; align-items: center; }
        .btn-main {
          padding: 14px 32px; border-radius: 100px;
          background: linear-gradient(135deg, #7C5CFC, #4DFFD2);
          color: #fff; font-size: 15px; font-weight: 700;
          text-decoration: none; transition: all 0.2s;
          display: inline-flex; align-items: center; gap: 8px;
        }
        .btn-main:hover { opacity: 0.9; transform: translateY(-1px); }
        .btn-sec {
          padding: 14px 28px; border-radius: 100px;
          border: 1px solid #E8EDF8; background: #fff;
          color: #64748B; font-size: 15px; font-weight: 500;
          text-decoration: none; transition: all 0.2s;
        }
        .btn-sec:hover { border-color: #7C5CFC; color: #7C5CFC; }

        .mockup {
          background: #fff;
          border: 1px solid #E8EDF8;
          border-radius: 20px; padding: 28px;
          position: relative; overflow: hidden;
          box-shadow: 0 8px 40px rgba(124,92,252,0.08);
        }
        .mockup::before {
          content: '';
          position: absolute; top: 0; left: 0; right: 0; height: 3px;
          background: linear-gradient(90deg, #7C5CFC, #4DFFD2);
        }
        .mockup-head { display: flex; align-items: center; gap: 10px; margin-bottom: 20px; }
        .mockup-av {
          width: 38px; height: 38px; border-radius: 50%;
          background: linear-gradient(135deg, #7C5CFC, #4DFFD2);
          display: flex; align-items: center; justify-content: center;
          font-size: 13px; font-weight: 800; color: #fff;
        }
        .mockup-nm { font-size: 13px; font-weight: 700; color: #0F172A; }
        .mockup-rl { font-size: 11px; color: #94A3B8; }
        .mockup-plan {
          background: #EDE9FE;
          border: 1px solid #C4B5FD;
          border-radius: 12px; padding: 16px; margin-bottom: 14px;
        }
        .mockup-plan-title { font-size: 12px; font-weight: 700; color: #7C5CFC; margin-bottom: 10px; }
        .mockup-row {
          display: flex; justify-content: space-between;
          font-size: 11px; color: #94A3B8; margin-bottom: 5px;
        }
        .mockup-row span:last-child { color: #0F172A; font-weight: 600; }
        .mockup-stats { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
        .mockup-stat {
          background: #F8FAFC;
          border: 1px solid #E8EDF8;
          border-radius: 10px; padding: 14px;
        }
        .mockup-stat-val { font-size: 22px; font-weight: 800; color: #7C5CFC; }
        .mockup-stat-lbl { font-size: 10px; color: #94A3B8; margin-top: 2px; }
        .mockup-badge {
          position: absolute; top: 20px; right: 20px;
          background: #D1FDF3; color: #059669;
          border: 1px solid #6EE7B7;
          font-size: 10px; font-weight: 700; padding: 4px 12px;
          border-radius: 100px;
        }

        .disciplines {
          padding: 0 48px 80px;
          max-width: 1100px; margin: 0 auto;
        }
        .disc-label {
          font-size: 11px; font-weight: 600; color: #94A3B8;
          letter-spacing: 1.5px; text-transform: uppercase; margin-bottom: 16px;
        }
        .disc-pills { display: flex; flex-wrap: wrap; gap: 8px; }
        .pill {
          padding: 8px 18px; border-radius: 100px;
          border: 1px solid #E8EDF8; background: #fff;
          font-size: 13px; color: #64748B;
        }

        .section {
          padding: 80px 48px;
          border-top: 1px solid #E8EDF8;
        }
        .sec-inner { max-width: 1100px; margin: 0 auto; }
        .sec-tag {
          font-size: 11px; font-weight: 700; color: #7C5CFC;
          letter-spacing: 2px; text-transform: uppercase; margin-bottom: 16px;
        }
        .sec-title {
          font-size: clamp(26px, 3vw, 40px); font-weight: 800;
          color: #0F172A; line-height: 1.15;
          letter-spacing: -1px; margin-bottom: 16px;
        }
        .sec-sub {
          font-size: 16px; color: #64748B;
          line-height: 1.75; max-width: 480px;
          margin-bottom: 56px;
        }

        .steps { display: grid; grid-template-columns: repeat(3,1fr); gap: 12px; }
        .step {
          background: #fff;
          border: 1px solid #E8EDF8;
          border-radius: 16px; padding: 32px;
          box-shadow: 0 2px 12px rgba(0,0,0,0.04);
        }
        .step-num { font-size: 11px; font-weight: 700; color: #7C5CFC; letter-spacing: 1px; margin-bottom: 16px; }
        .step-icon { font-size: 28px; margin-bottom: 14px; }
        .step-title { font-size: 16px; font-weight: 700; color: #0F172A; margin-bottom: 8px; }
        .step-desc { font-size: 13px; color: #64748B; line-height: 1.65; }

        .features { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-top: 56px; }
        .feat {
          background: #fff;
          border: 1px solid #E8EDF8;
          border-radius: 16px; padding: 28px;
          box-shadow: 0 2px 12px rgba(0,0,0,0.04);
        }
        .feat-icon { font-size: 26px; margin-bottom: 14px; }
        .feat-title { font-size: 15px; font-weight: 700; color: #0F172A; margin-bottom: 8px; }
        .feat-desc { font-size: 13px; color: #64748B; line-height: 1.65; }

        .cta-section {
          padding: 100px 48px;
          border-top: 1px solid #E8EDF8;
          background: #EDE9FE;
        }
        .cta-inner { max-width: 620px; margin: 0 auto; text-align: center; }
        .cta-title {
          font-size: clamp(28px, 3.5vw, 48px); font-weight: 800;
          color: #0F172A; line-height: 1.1; letter-spacing: -1px;
          margin-bottom: 20px;
        }
        .cta-title .accent {
          background: linear-gradient(135deg, #7C5CFC, #4DFFD2);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }
        .cta-sub { font-size: 16px; color: #64748B; line-height: 1.75; margin-bottom: 40px; }

        .footer {
          padding: 28px 48px;
          border-top: 1px solid #E8EDF8;
          display: flex; justify-content: space-between; align-items: center;
          background: #fff;
        }
        .footer-logo { font-size: 18px; font-weight: 800; color: #0F172A; text-decoration: none; }
        .footer-logo span { color: #7C5CFC; }
        .footer-txt { font-size: 12px; color: #94A3B8; }

        @media (max-width: 768px) {
          .nav { padding: 16px 20px; }
          .hero { grid-template-columns: 1fr; padding: 110px 20px 60px; gap: 48px; }
          .mockup { display: none; }
          .disciplines { padding: 0 20px 60px; }
          .section { padding: 60px 20px; }
          .steps { grid-template-columns: 1fr; }
          .features { grid-template-columns: 1fr; }
          .cta-section { padding: 60px 20px; }
          .footer { padding: 24px 20px; flex-direction: column; gap: 12px; text-align: center; }
        }
      `}</style>

      <div className="root">
        <nav className="nav">
          <Link href="/shopify/home" className="logo">malyte<span>.</span></Link>
          <div className="nav-links">
            <Link href="/shopify" className="nav-signin">Sign in</Link>
            <Link href="/shopify" className="nav-btn">Get started →</Link>
          </div>
        </nav>

        <section className="hero">
          <div>
            <div className="badge">
              <div className="badge-dot" />
              Built for wellness professionals
            </div>
            <h1 className="hero-title">
              Your method.<br />
              <span className="accent">Scaled by AI.</span><br />
              Sold on Shopify.
            </h1>
            <p className="hero-sub">
              Upload your methodology once. Malyte generates fully personalized plans for every client — automatically, at scale, in your voice.
            </p>
            <div className="hero-actions">
              <Link href="/shopify" className="btn-main">Start for free →</Link>
              <Link href="/plan/demo-token-shopify-review-001" className="btn-sec" target="_blank">See a sample plan</Link>
            </div>
          </div>

          <div className="mockup">
            <div className="mockup-badge">✓ Plan generated</div>
            <div className="mockup-head">
              <div className="mockup-av">SJ</div>
              <div>
                <div className="mockup-nm">Sarah Johnson</div>
                <div className="mockup-rl">8-Week Weight Loss Program</div>
              </div>
            </div>
            <div className="mockup-plan">
              <div className="mockup-plan-title">📋 Week 1 — Personalized Plan</div>
              <div className="mockup-row"><span>Calories target</span><span>1,500 kcal/day</span></div>
              <div className="mockup-row"><span>Workout days</span><span>4× per week</span></div>
              <div className="mockup-row"><span>Focus</span><span>Fat loss + habits</span></div>
              <div className="mockup-row"><span>Next check-in</span><span>Day 7</span></div>
            </div>
            <div className="mockup-stats">
              <div className="mockup-stat">
                <div className="mockup-stat-val">12</div>
                <div className="mockup-stat-lbl">Active clients</div>
              </div>
              <div className="mockup-stat">
                <div className="mockup-stat-val">48</div>
                <div className="mockup-stat-lbl">Plans generated</div>
              </div>
            </div>
          </div>
        </section>

        <div className="disciplines">
          <div className="disc-label">Works for every discipline</div>
          <div className="disc-pills">
            {['🥗 Nutrition', '💪 Personal Training', '🧠 Mental Coaching', '🧘 Yoga & Mindfulness', '💆 Skincare & Wellness', '🏃 Running & Endurance', '🍽️ Meal Planning', '💤 Sleep Coaching'].map(c => (
              <div key={c} className="pill">{c}</div>
            ))}
          </div>
        </div>

        <section className="section">
          <div className="sec-inner">
            <div className="sec-tag">How it works</div>
            <h2 className="sec-title">From your expertise<br />to a scalable product</h2>
            <p className="sec-sub">Three steps to turn your methodology into an AI-powered service your clients will love.</p>
            <div className="steps">
              <div className="step">
                <div className="step-num">01</div>
                <div className="step-icon">📄</div>
                <div className="step-title">Upload your methodology</div>
                <div className="step-desc">Upload your existing plans, protocols and frameworks as PDFs. Malyte reads and understands your unique approach.</div>
              </div>
              <div className="step">
                <div className="step-num">02</div>
                <div className="step-icon">🤖</div>
                <div className="step-title">AI learns your method</div>
                <div className="step-desc">Our AI captures the logic behind your methodology — your rules, your priorities, your voice — through a structured interview.</div>
              </div>
              <div className="step">
                <div className="step-num">03</div>
                <div className="step-icon">✨</div>
                <div className="step-title">Clients get personalized plans</div>
                <div className="step-desc">Every buyer answers a few questions. The AI generates a fully personalized plan based on your methodology — instantly.</div>
              </div>
            </div>
          </div>
        </section>

        <section className="section">
          <div className="sec-inner">
            <div className="sec-tag">Features</div>
            <h2 className="sec-title">Everything you need<br />to scale your practice</h2>
            <p className="sec-sub">Built specifically for health and wellness professionals who want to grow without losing quality.</p>
            <div className="features">
              <div className="feat">
                <div className="feat-icon">🔄</div>
                <div className="feat-title">Weekly adaptive plans</div>
                <div className="feat-desc">Plans evolve week by week based on client check-ins. The AI adapts nutrition, training and focus areas to their actual progress.</div>
              </div>
              <div className="feat">
                <div className="feat-icon">🎯</div>
                <div className="feat-title">Your methodology, not generic AI</div>
                <div className="feat-desc">Malyte doesn't generate generic plans. It replicates your specific approach — your rules, your language, your results.</div>
              </div>
              <div className="feat">
                <div className="feat-icon">🛍️</div>
                <div className="feat-title">Sell directly on Shopify</div>
                <div className="feat-desc">Connect your Shopify store in minutes. Your clients buy, answer questions, and receive their personalized plan automatically.</div>
              </div>
              <div className="feat">
                <div className="feat-icon">📊</div>
                <div className="feat-title">Track client progress</div>
                <div className="feat-desc">See all your clients in one dashboard. Track plan generation, check-in completion and engagement — all in real time.</div>
              </div>
            </div>
          </div>
        </section>

        <section className="cta-section">
          <div className="cta-inner">
            <h2 className="cta-title">Ready to scale<br /><span className="accent">your expertise?</span></h2>
            <p className="cta-sub">Join professionals who are already using Malyte to deliver personalized plans at scale — without spending more time.</p>
            <Link href="/shopify" className="btn-main">Get started for free →</Link>
          </div>
        </section>

        <footer className="footer">
          <Link href="/shopify/home" className="footer-logo">malyte<span>.</span></Link>
          <span className="footer-txt">© 2026 Malyte · AI-powered wellness programs</span>
        </footer>
      </div>
    </>
  )
}